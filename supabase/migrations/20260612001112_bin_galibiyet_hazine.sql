-- 1112 · "Bin Galibiyet" Ortak Hazine'yi de sayar (Ida, 15 Eki 2026: "Hazine de sayılsın").
--   * toplam_galibiyet: 644 gövdesi + kasa_maclari (durum = 'bitti' and kazanan = oyuncu). Beraberlikte kasa_bitir
--     kazanan'ı NULL yazar → sayılmaz. Rakibi açık bot (acik_bot_mu) olan maç Klasik/Düello'daki gibi HARİÇ.
--   * Saf Bilgi Klasik ile aynı tabloda (matches.jokersiz) ve zaten sayılıyordu → açıklamaya yazıldı.
--   * Kontrolün çağrıldığı yerler DEĞİŞMEDİ: hiçbir modun maç bitirme fonksiyonu unvan_galibiyet_kontrol çağırmaz;
--     kontrol unvanlarim() ve haftalık lig kapanışında (unvan_lig_kapanis) — Hazine de aynı kalıba girer.
--   * Yetki değişikliği YOK: create or replace mevcut GRANT'ları korur (yalnız service_role); aşağıdaki revoke/grant
--     644'teki ile birebir aynıdır.
-- Geri alma: docs/bin-galibiyet-1112-geri-al.sql
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
  + (select count(*) from public.kasa_maclari k
      where k.durum = 'bitti' and k.kazanan = p_user
        and not exists (select 1 from public.profiles o
                         where o.id = case when k.oyuncu1 = p_user then k.oyuncu2 else k.oyuncu1 end
                           and public.acik_bot_mu(o.is_bot, o.bot_turu)))
  + (select count(*) from public.group_matches g where g.durum = 'bitti' and g.kazanan = p_user)
  + (select count(*) from public.tournaments t where t.durum = 'bitti' and t.kazanan = p_user);
$$;
revoke all on function public.toplam_galibiyet(uuid) from public, anon, authenticated;
grant execute on function public.toplam_galibiyet(uuid) to service_role;

update public.oyun_ayarlari
   set aciklama = '644/1112: "Bin Galibiyet" unvanı için toplam galibiyet (açık bot hariç; Klasik/Saf Bilgi + Düello + Grup + Turnuva + Hazine)'
 where anahtar = 'unvan_galibiyet_esik';

update public.unvan_tanimlari
   set aciklama_tr = '1.000 maç kazan (Klasik, Saf Bilgi, Düello, Grup, Turnuva, Hazine)',
       aciklama_en = 'Win 1,000 matches (Classic, Pure Knowledge, Duel, Group, Tournament, Treasure)'
 where anahtar = 'bin_galibiyet';

-- Geriye dönük (idempotent: unvanı olan atlanır, insert on conflict do nothing)
select public.unvan_galibiyet_kontrol(p.id) from public.profiles p where not coalesce(p.is_bot, false);
