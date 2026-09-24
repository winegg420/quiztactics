-- ============================================================
-- 552 · AURALAR + ETKİNLİK KOZMETİKLERİ PASİF (Ida, 24 Eyl 2026)
--
-- Dükkândaki bütün auralar ve bütün etkinlik çerçeveleri/auraları (Yılbaşı, Ramazan Bayramı …) pasif:
-- dükkânda, koleksiyonda, oyunda (oyuncu_kartlari / lig tablosu) ve botlarda görünmez; satın alınamaz,
-- takılamaz. SİLİNMEZ: satırlar, oyuncu_auralari / oyuncu_cerceveleri sahiplikleri ve profiles.takili_*
-- aynen durur — yeniden açmak için aktif = true yeter.
--
-- Mevcut fonksiyonlar zaten `aktif`e bakıyor:
--   çerçeve: cerceve_katalogu, cercevelerim, cerceve_tak, oyuncu_kartlari (c.aktif) · botlar etkinlik
--            çerçevesi takamaz (trg_bot_cerceve_kurali)
--   aura   : aura_aktif_mi (550) → aura_tak + oyuncu_kartlari; aura_satin_al; bot_kozmetik (a.aktif)
-- Tek eksik: 550'deki aura_katalogu sahip olunan PASİF aurayı koleksiyonda gösteriyordu → artık
-- yalnız aktif auralar (dönüş tipi aynı, yetkiler değişmez).
-- Tekrar çalıştırılabilir. Yıkıcı değişiklik yok.
-- ============================================================

update public.auralar
   set aktif = false
 where kaynak in ('dukkan', 'etkinlik')
   and aktif;

update public.cerceveler
   set aktif = false
 where kaynak = 'etkinlik'
   and aktif;

create or replace function public.aura_katalogu()
returns table(anahtar text, ad text, ad_tr text, ad_en text, nadirlik text, kaynak text, fiyat integer,
              kosul text, sira integer, satilik boolean, sahip boolean, takili boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_en boolean;
  v_takili text;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  v_en := public.rozet_dil_en(v_me);
  select p.takili_aura into v_takili from public.profiles p where p.id = v_me;
  return query
  select a.anahtar, case when v_en then a.ad_en else a.ad_tr end, a.ad_tr, a.ad_en, a.nadirlik, a.kaynak,
         case when a.kaynak = 'dukkan' then public.aura_fiyati(a.nadirlik) end,
         a.kosul, a.sira,
         (a.kaynak = 'dukkan' and a.onay = 'girsin' and public.aura_fiyati(a.nadirlik) is not null),
         exists (select 1 from public.oyuncu_auralari o where o.user_id = v_me and o.aura = a.anahtar),
         (a.anahtar = v_takili)
    from public.auralar a
   where a.aktif                                            -- 552: pasif aura sahibine de görünmez
     and (a.kaynak <> 'dukkan' or a.onay = 'girsin')
   order by a.sira;
end;
$$;

do $$
declare v_a int; v_c text;
begin
  select count(*) into v_a from public.auralar where aktif;
  select string_agg(anahtar, ', ' order by sira) into v_c from public.cerceveler where aktif;
  raise notice '552 aktif aura sayısı: %', v_a;
  raise notice '552 aktif çerçeveler: %', coalesce(v_c, '(yok)');
end $$;
