-- 1112 geri alma: toplam_galibiyet 644 gövdesine (Hazine yok), açıklama metinleri 1110 hâline döner.
-- Not: 1112 sonrası Hazine sayımıyla verilmiş "bin_galibiyet" unvanı (varsa) geri alınmaz — elle bakılır:
--   select user_id from oyuncu_unvanlari where unvan = 'bin_galibiyet' and kazanildi_at >= '<1112 uygulama anı>';
create or replace function public.toplam_galibiyet(p_user uuid)
returns bigint
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    (select count(*) from public.matches m
      where m.durum = 'bitti' and m.kazanan = p_user
        and not exists (select 1 from public.profiles o
                         where o.id = case when m.oyuncu1 = p_user then m.oyuncu2 else m.oyuncu1 end
                           and public.acik_bot_mu(o.is_bot, o.bot_turu)))
  + (select count(*) from public.duellolar d
      where d.durum = 'bitti' and d.kazanan = p_user
        and not exists (select 1 from public.profiles o
                         where o.id = case when d.oyuncu1 = p_user then d.oyuncu2 else d.oyuncu1 end
                           and public.acik_bot_mu(o.is_bot, o.bot_turu)))
  + (select count(*) from public.group_matches g where g.durum = 'bitti' and g.kazanan = p_user)
  + (select count(*) from public.tournaments t where t.durum = 'bitti' and t.kazanan = p_user);
$$;
revoke all on function public.toplam_galibiyet(uuid) from public, anon, authenticated;
grant execute on function public.toplam_galibiyet(uuid) to service_role;

update public.oyun_ayarlari
   set aciklama = '644: "Bin Galibiyet" unvanı için toplam galibiyet (Antrenman hariç; Klasik + Düello + Grup + Turnuva)'
 where anahtar = 'unvan_galibiyet_esik';

update public.unvan_tanimlari
   set aciklama_tr = '1.000 maç kazan (Klasik, Düello, Grup, Turnuva)',
       aciklama_en = 'Win 1,000 matches (Classic, Duel, Group, Tournament)'
 where anahtar = 'bin_galibiyet';
