-- ============================================================
-- 323 — Günde 5 turnuva (Ida kararı, 23 Eyl 2026)
--
-- Saatler (TSİ): 10:00, 14:00, 18:00, 20:00, 24:00.
-- "24:00" o TARİHİN gece yarısıdır (ertesi gün 00:00); listede "00:00"
-- olmadığı için aynı an iki seans olarak açılamaz.
--
-- Zamanlayıcı (turnuva_zamanlayici_tik), lobi botları ve katılım
-- (join_tournament_lobby) sıradaki seansı zaten
-- sonraki_turnuva_bilgi() → turnuva_saatleri_listesi() → bu ayardan
-- okur; yalnız ayar ve koddaki yedek liste değişir.
--
-- LOBİ AÇILIŞI: lobi botları başlangıçtan 120 dk önce dolmaya başlar
-- (turnuva_lobi_botlari'ndaki gömülü 120). Rakam ayara taşınır
-- (turnuva_lobi_acilis_dk), değeri AYNI kalır; ana sayfadaki turnuva
-- şeridi "lobi açık" hâlini aynı ayardan çizer.
--
-- HATIRLATMA: 12:30 ve 22:00 seansı kalktı → öğle hatırlatması 14:00
-- (13:15 TSİ = 10:15 UTC), akşam hatırlatması 20:00 (19:15 TSİ = 16:15
-- UTC) seansına. Günde en çok 2 push kuralı aynı.
-- ============================================================

insert into public.oyun_ayarlari (anahtar, deger, aciklama)
values ('turnuva_saatleri', '["10:00","14:00","18:00","20:00","24:00"]'::jsonb,
        'Günlük turnuva saatleri (TSİ, HH:MM; 24:00 = o günün gece yarısı)')
on conflict (anahtar) do update set deger = excluded.deger, aciklama = excluded.aciklama;

insert into public.oyun_ayarlari (anahtar, deger, aciklama)
values ('turnuva_lobi_acilis_dk', '120'::jsonb,
        'Turnuva lobisinin başlangıçtan kaç dk önce "açık" sayıldığı (bot doluşu + ana sayfa şeridi)')
on conflict (anahtar) do nothing;

-- ---------- Günün saat listesi: yedek liste de yeni saatler ----------
create or replace function public.turnuva_saatleri_listesi()
returns text[]
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(
    (select array_agg(distinct s order by s)
       from (select s from public.oyun_ayarlari o, jsonb_array_elements_text(o.deger) s
              where o.anahtar = 'turnuva_saatleri' and jsonb_typeof(o.deger) = 'array'
                and (s ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or s = '24:00')) x),
    array['10:00','14:00','18:00','20:00','24:00']);
$$;
revoke all on function public.turnuva_saatleri_listesi() from public, anon;

-- ---------- Lobi botları: açılış dakikası ayardan ----------
create or replace function public.turnuva_lobi_botlari()
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_seans text;
  v_tarih date;
  v_id uuid;
  v_baslangic timestamptz;
  v_kalan_dk numeric;
  v_acilis_dk numeric;
  v_hedef int;
  v_mevcut int;
  v_havuz int;
  v_bot uuid;
begin
  select o_tarih, o_seans into v_tarih, v_seans from public.sonraki_turnuva_bilgi();

  insert into public.tournaments (tarih, seans)
  values (v_tarih, v_seans)
  on conflict (tarih, seans) do nothing;

  select id into v_id from public.tournaments
  where tarih = v_tarih and seans = v_seans and durum = 'lobi';
  if not found then return; end if;

  -- ESKİDEN: gömülü 120.
  select coalesce((select (deger #>> '{}')::numeric from public.oyun_ayarlari
                    where anahtar = 'turnuva_lobi_acilis_dk'), 120)
    into v_acilis_dk;

  v_baslangic := public.turnuva_an(v_id);
  v_kalan_dk := extract(epoch from (v_baslangic - now())) / 60.0;
  if v_kalan_dk > v_acilis_dk then return; end if;

  select count(*)::int into v_havuz from public.turnuva_bot_havuzu(v_id);

  v_hedef := floor((v_acilis_dk - greatest(v_kalan_dk, 0)) / 15.0)::int + 1;
  v_hedef := greatest(0, least(v_hedef, v_havuz));

  select count(*)::int into v_mevcut
  from public.tournament_players tp
  join public.profiles p on p.id = tp.user_id
  where tp.tournament_id = v_id and coalesce(p.is_bot, false);

  if v_mevcut >= v_hedef then return; end if;

  for v_bot in
    select b.bot_id from public.turnuva_bot_havuzu(v_id) b
    where not exists (
      select 1 from public.tournament_players tp
      where tp.tournament_id = v_id and tp.user_id = b.bot_id
    )
    order by public.bot_rasgele(v_id::text || b.bot_id::text)
    limit (v_hedef - v_mevcut)
  loop
    insert into public.tournament_players (tournament_id, user_id)
    values (v_id, v_bot)
    on conflict do nothing;
  end loop;
end;
$$;

-- ---------- Hatırlatma metinleri ----------
update public.push_metinleri set govde = replace(replace(govde, '12:30''da', '14:00''te'), '12:30', '14:00')
 where anahtar = 'turnuva_ogle';
update public.push_metinleri
   set govde = replace(govde, '22:00', '20:00'),
       baslik = case dil when 'tr' then '🌙 Akşam turnuvası yaklaşıyor!'
                         when 'en' then '🌙 Evening Tournament coming up!'
                         else baslik end
 where anahtar = 'turnuva_gece';

-- ---------- Hatırlatma zamanları ----------
do $$
declare
  v_job bigint;
begin
  select jobid into v_job from cron.job where jobname = 'bildim-turnuva-hatirlat-sabah';
  if v_job is not null then perform cron.alter_job(v_job, schedule := '15 10 * * *'); end if;
  select jobid into v_job from cron.job where jobname = 'bildim-turnuva-hatirlat';
  if v_job is not null then perform cron.alter_job(v_job, schedule := '15 16 * * *'); end if;
end;
$$;
