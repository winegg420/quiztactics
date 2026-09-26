-- 655: get_categories hızlandırma (652 düzeltmesi).
-- 652'deki sürüm oyuncunun dilini ve kapsam kuralını HER SORU SATIRINDA yeniden hesaplıyordu
-- (security definer fonksiyon satır başına çağrılır): ölçüm ~200 ms, eski sürüm ~30–90 ms.
-- Artık dil + kapsam bir kez hesaplanır; Türkçe oyuncuda çeviri tablosuna hiç bakılmaz.
-- Davranış 652 ile aynı: oyuncunun dilinde okunabilen soru sayılır; Türkiye dışı oyuncuya
-- yalnız global sorular sayılır ve asgari havuzun altındaki kategori listeden düşer.
create or replace function public.get_categories()
returns table(kategori text, soru_sayisi bigint, gorulen_sayisi bigint)
language plpgsql
stable security definer
set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  v_dil text;
  v_evrensel boolean := public.soru_kapsam_evrensel_mi(array[auth.uid()]);
  v_min int := case when public.soru_kapsam_evrensel_mi(array[auth.uid()])
                    then greatest(15, public.ayar_sayi('soru_kapsam_min_havuz', 60)::int) else 15 end;
begin
  select coalesce(nullif(btrim(pr.dil), ''), 'tr') into v_dil from public.profiles pr where pr.id = v_me;
  v_dil := coalesce(v_dil, 'tr');
  return query
  select q.kategori,
         count(*) as soru_sayisi,
         count(*) filter (where g.user_id is not null) as gorulen_sayisi
  from public.questions q
  left join public.gorulen_sorular g
    on g.question_id = q.id and g.user_id = v_me
  where q.aktif
    -- 'genel' ve 'karisik' birleştirildi; "Karışık" artık kategori SEÇMEMEK demek
    and q.kategori not in ('genel', 'karisik')
    and (q.dil = v_dil
         or exists (select 1 from public.question_translations t
                     where t.question_id = q.id and t.dil = v_dil and not t.eskidi))
    and (not v_evrensel or q.kapsam = 'global')
  group by q.kategori
  having count(*) >= v_min
  order by (q.kategori = 'genel_kultur') desc, count(*) desc;
end $$;
