-- 644: Görev B kararları (Ida, 25 Eyl 2026)
--   * "Bin Galibiyet" unvanı: Antrenman (açık botla maç) hariç bütün modlarda (Klasik, Düello, Grup, Turnuva) toplam
--     galibiyet ≥ 1.000. Sayı yalnız kontrol anında hesaplanır (kart okumasında değil): unvanlarim() ve haftalık lig
--     kapanışı (unvan_lig_kapanis) çağırır; bu migration mevcut oyuncular için geriye dönük hesaplar. Eşik ayarda
--     (`unvan_galibiyet_esik`, 1000).
--   * Bronz Lig çerçevesi (lig_bronz) kataloğa: bütün insan oyuncular kazanır (herkes Bronz'da başlar), yeni insan
--     hesap açılınca kendiliğinden gelir. Coin yok, popup yok (oyuncu_cerceveleri'ne doğrudan yazılır; takılı çerçeve
--     DEĞİŞMEZ — oyuncu Koleksiyon'dan takar).
--   * Dört sezon unvanı ve "Kahramanmaraş İkincisi" veritabanında hiç yoktu (önizleme listesinde duruyordu); değişiklik yok.
-- Yetki/RLS değişikliği YOK: yeni yardımcılar yalnız service_role, unvanlarim() imza ve yetkisi aynı (yalnız kontrol çağırır).

-- ---------------------------------------------------------------------------
-- 1) Bin Galibiyet
-- ---------------------------------------------------------------------------
insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('unvan_galibiyet_esik', to_jsonb(1000), '644: "Bin Galibiyet" unvanı için toplam galibiyet (Antrenman hariç; Klasik + Düello + Grup + Turnuva)')
on conflict (anahtar) do nothing;

insert into public.unvan_tanimlari (anahtar, tur, kural, rozet, sira, ad_tr, ad_en, aciklama_tr, aciklama_en) values
  ('bin_galibiyet', 'basari', 'olay', null, 38, 'Bin Galibiyet', 'Thousand Wins',
   '1.000 maç kazan (Antrenman hariç; Klasik, Düello, Grup, Turnuva)', 'Win 1,000 matches (excluding Practice; Classic, Duel, Group, Tournament)')
on conflict (anahtar) do nothing;

-- Toplam galibiyet: Antrenman (rakibi açık bot olan Klasik/Düello maçı) hariç.
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

-- Eşiği aşmışsa unvanı verir (bir kez). Dönüş: bu çağrıda yeni verildi mi.
create or replace function public.unvan_galibiyet_kontrol(p_user uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_yeni boolean;
begin
  if p_user is null then return false; end if;
  if exists (select 1 from public.oyuncu_unvanlari where user_id = p_user and unvan = 'bin_galibiyet') then return false; end if;
  if exists (select 1 from public.profiles where id = p_user and coalesce(is_bot, false)) then return false; end if;
  if public.toplam_galibiyet(p_user) < public.ayar_sayi('unvan_galibiyet_esik', 1000) then return false; end if;
  insert into public.oyuncu_unvanlari (user_id, unvan) values (p_user, 'bin_galibiyet')
  on conflict do nothing returning true into v_yeni;
  return coalesce(v_yeni, false);
end;
$$;
revoke all on function public.unvan_galibiyet_kontrol(uuid) from public, anon, authenticated;
grant execute on function public.unvan_galibiyet_kontrol(uuid) to service_role;

-- Haftalık lig kapanışı kancası (canlı gövde + galibiyet kontrolü)
create or replace function public.unvan_lig_kapanis(p_user uuid, p_lig text, p_birinci boolean, p_yukseldi boolean)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare v int;
begin
  if p_birinci then
    insert into public.unvan_sayaclari (user_id, anahtar, deger) values (p_user, 'lig_birincilik', 1)
    on conflict (user_id, anahtar) do update set deger = unvan_sayaclari.deger + 1 returning deger into v;
    if p_lig = 'elmas' then
      insert into public.oyuncu_unvanlari (user_id, unvan) values (p_user, 'elmas_lig_birincisi') on conflict do nothing;
    end if;
    if v >= 5 then
      insert into public.oyuncu_unvanlari (user_id, unvan) values (p_user, 'bes_kez_lig_birincisi') on conflict do nothing;
    end if;
  end if;
  if p_yukseldi and p_lig = 'altin' then
    insert into public.unvan_sayaclari (user_id, anahtar, deger) values (p_user, 'altin_yukselme', 1)
    on conflict (user_id, anahtar) do update set deger = unvan_sayaclari.deger + 1 returning deger into v;
    if v >= 3 then
      insert into public.oyuncu_unvanlari (user_id, unvan) values (p_user, 'altin_lig_fatihi') on conflict do nothing;
    end if;
  end if;
  perform public.unvan_galibiyet_kontrol(p_user);   -- 644: Bin Galibiyet
end;
$$;

-- unvanlarim(): listeyi vermeden önce galibiyet unvanını kontrol eder → artık yazan fonksiyon (STABLE kalktı).
create or replace function public.unvanlarim()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  v_takili text;
  v_sonuc jsonb;
  v_sehir jsonb;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.unvan_galibiyet_kontrol(v_me);
  select takili_unvan into v_takili from public.profiles where id = v_me;
  select jsonb_build_object('sehir', a.sehir, 'ulke', a.ulke, 'hafta', a.hafta) into v_sehir
    from public.lig_arsiv a where a.user_id = v_me and a.hafta = public.hafta_basi() - 7 and a.sehir_sampiyonu;
  select coalesce(jsonb_agg(jsonb_build_object(
           'anahtar', t.anahtar, 'tur', t.tur, 'ad_tr', t.ad_tr, 'ad_en', t.ad_en,
           'aciklama_tr', t.aciklama_tr, 'aciklama_en', t.aciklama_en,
           'kazanildi', k.anahtar is not null, 'takili', t.anahtar = v_takili) order by t.sira), '[]'::jsonb)
    into v_sonuc
    from public.unvan_tanimlari t
    left join public.oyuncu_unvan_listesi(v_me) k on k.anahtar = t.anahtar
   where t.aktif;
  return jsonb_build_object('unvanlar', v_sonuc, 'takili', v_takili, 'sehir_sampiyonu', v_sehir);
end;
$$;
revoke all on function public.unvanlarim() from public, anon;
grant execute on function public.unvanlarim() to authenticated, service_role;

-- Geriye dönük: bütün insan oyuncular
select public.unvan_galibiyet_kontrol(p.id) from public.profiles p where not coalesce(p.is_bot, false);

-- ---------------------------------------------------------------------------
-- 2) Bronz Lig çerçevesi
-- ---------------------------------------------------------------------------
insert into public.cerceveler (anahtar, nadirlik, kaynak, fiyat, kosul, aktif, sira, ad_tr, ad_en) values
  ('lig_bronz', 'siradan', 'lig', null, 'lig:bronz', true, 100, 'Bronz Lig', 'Bronze League')
on conflict (anahtar) do nothing;

-- Mevcut insan oyuncular (herkes Bronz'da başlar; Bronz'da olanlar ve geçmişte Bronz'da olanlar = hepsi)
insert into public.oyuncu_cerceveleri (user_id, cerceve, kaynak)
select p.id, 'lig_bronz', 'lig_yukselme' from public.profiles p where not coalesce(p.is_bot, false)
on conflict do nothing;

-- Yeni insan hesaplar (coin/popup yok; takılı çerçeve değişmez)
create or replace function public.trg_bronz_cerceve()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.oyuncu_cerceveleri (user_id, cerceve, kaynak) values (new.id, 'lig_bronz', 'lig_yukselme')
  on conflict do nothing;
  return new;
end;
$$;
revoke all on function public.trg_bronz_cerceve() from public, anon, authenticated;
drop trigger if exists trg_profiles_bronz_cerceve on public.profiles;
create trigger trg_profiles_bronz_cerceve after insert on public.profiles
  for each row when (not coalesce(new.is_bot, false)) execute function public.trg_bronz_cerceve();
