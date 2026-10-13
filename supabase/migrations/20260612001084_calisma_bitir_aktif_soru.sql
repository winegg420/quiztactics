-- 1084 — calisma_bitir.bankada_kalan, yanlis_bankam ile aynı tanımı kullanır (GPT denetimi 13 Eki, madde 2).
-- Sorun: sonuç ekranında "854 bankada" ile "0/827 öğrenildi" çelişiyordu. yanlis_bankam bekleyeni
-- yalnız AKTİF sorulardan sayar (calisma_baslat'ın verebileceği sorular); calisma_bitir pasife alınmış
-- soruları da sayıyordu (fark = bankadaki pasif soru sayısı). Öğrenilen sayacı ikisinde de aynı kalır.
-- İmza, GRANT, RLS değişmez.
create or replace function public.calisma_bitir(p_oturum_id uuid)
 returns table(dogru integer, yanlis integer, ogrenilen integer, bankada_kalan integer, toplam_ogrenilen integer)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  o public.calisma_oturumlari%rowtype;
  v_kalan int;
  v_ogr int;
begin
  select * into o from public.calisma_oturumlari where id = p_oturum_id for update;
  if not found then raise exception 'Oturum bulunamadı'; end if;
  if o.user_id <> auth.uid() then raise exception 'Bu oturum senin değil'; end if;
  if o.durum = 'aktif' then
    update public.calisma_oturumlari
       set durum = 'bitti', bitis = now()
     where id = p_oturum_id
    returning * into o;
  end if;
  select count(*)::int into v_kalan
  from public.yanlis_sorular ys
  join public.questions q on q.id = ys.question_id
  where ys.user_id = o.user_id and ys.ogrenildi_at is null and q.aktif;
  select count(*)::int into v_ogr
  from public.yanlis_sorular ys
  where ys.user_id = o.user_id and ys.ogrenildi_at is not null;
  return query select o.dogru, o.yanlis, o.ogrenilen,
                      coalesce(v_kalan, 0), coalesce(v_ogr, 0);
end;
$function$;
