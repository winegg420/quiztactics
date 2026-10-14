-- 1101 — soru sayacı kuyruğa (Paket B/9, 15 Eki 2026, Ida onaylı).
--
-- Eskiden HER cevap (bütün modlar: Klasik, Grup, Turnuva, Düello, Hazine, Çalışma…) `questions` satırını UPDATE ediyordu:
-- aynı soruyu cevaplayanlar (grup maçı, turnuva, bot) aynı satırın kilidinde sıraya giriyor, her UPDATE tam satır
-- (uzun metin) yeni sürümü + WAL yazıyor ve BEFORE UPDATE tetikleyicisini (trg_questions_dil_senkron) çalıştırıyordu.
-- Şimdi `soru_sayac` yalnız küçük bir UNLOGGED kuyruğa ekler (kilit/çakışma yok, WAL yok); `soru_sayac_bosalt()` 5 dk'da
-- bir (cron `bildim-soru-sayac`) soru başına TEK UPDATE ile sayaçlara yazar. İmza, yetki ve çağıranlar aynı.
-- Bilinen bedel: sayaçlar en çok ~5 dk geç güncellenir; DB çökerse kuyruktaki son ≤5 dk'lık sayım kaybolur (zorluk
-- kalibrasyonu için önemsiz — günlük soru_zorluk_kalibre binlerce cevaba bakar).
-- Geri alma: docs/soru-sayac-1101-geri-al.sql

create unlogged table if not exists public.soru_sayac_kuyruk (
  question_id uuid not null,
  dogru boolean not null,
  at timestamptz not null default now()
);
alter table public.soru_sayac_kuyruk enable row level security;
revoke all on public.soru_sayac_kuyruk from public, anon, authenticated;

create or replace function public.soru_sayac(p_question uuid, p_dogru boolean)
 returns void
 language sql
 security definer
 set search_path to 'public'
as $function$
  insert into public.soru_sayac_kuyruk (question_id, dogru)
  select p_question, coalesce(p_dogru, false) where p_question is not null;
$function$;

create or replace function public.soru_sayac_bosalt()
 returns integer
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_n int;
begin
  with d as (
    delete from public.soru_sayac_kuyruk returning question_id, dogru
  ), s as (
    select question_id, count(*)::int n, (count(*) filter (where dogru))::int dg from d group by 1
  )
  update public.questions q
     set cevap_sayisi = q.cevap_sayisi + s.n,
         dogru_sayisi = q.dogru_sayisi + s.dg
    from s
   where q.id = s.question_id;
  get diagnostics v_n = row_count;
  return v_n;
end $function$;
revoke all on function public.soru_sayac_bosalt() from public, anon, authenticated;

select cron.schedule('bildim-soru-sayac', '*/5 * * * *', 'select public.soru_sayac_bosalt()');
