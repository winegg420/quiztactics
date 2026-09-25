-- 643: Unvan sistemi (görsel revizyon, Ida seçimi 25 Eyl 2026 — tasarim/SECIMLER_GORSEL_REVIZYON.md › 5 ve B7)
--
-- Unvan = isim altında duran, kazanılan yazı (Kurdele görünümü istemcide). Dört tür: sehir · lig · sezon · basari.
-- Kazanım (onaya sunulan 21 unvanlık listeden KURALI NET olanlar bağlandı; belirsizler bağlanmadı, raporda):
--   * kural 'rozet' : ilgili rozete sahip olan unvana da sahiptir (türetilir, ayrı kayıt yok; botlar dahil tutarlı).
--   * kural 'olay'  : haftalık lig kapanışında verilir → oyuncu_unvanlari (ileriye dönük; geçmiş hafta verisi yok).
--   * Şehir Şampiyonu: tanım tablosunda değil; lig_arsiv.sehir_sampiyonu (641) aktifken OTOMATİK görünür (haftalık).
-- Takılı unvan: profiles.takili_unvan (null = yok). Aktif şehir şampiyonluğu takılı unvanın önüne geçer.
-- Görünen unvan oyuncu_kartlari.unvan'da (tek kaynak; N+1 yok). Gizli bot, kazandığı unvanlardan kimliğinden sabit
-- birini taşır (ya da hiç) — is_bot sızmaz.
-- Yetki: yeni tablolar RLS açık; tanım tablosu herkese okunur; oyuncu_unvanlari istemciye kapalı (RPC). Yeni RPC'ler
-- yalnız authenticated; iç yardımcılar yalnız service_role. oyuncu_kartlari dönüş tipi değişti → DROP/CREATE, eski
-- yetkisi birebir geri. Ayrıca: şampiyonluk bildirimi açıldı (sehir_sampiyonu_bildirim_acik = 1, Ida isteği).

-- ---------------------------------------------------------------------------
-- 1) Tablolar
-- ---------------------------------------------------------------------------
create table if not exists public.unvan_tanimlari (
  anahtar text primary key,
  tur text not null check (tur in ('sehir', 'lig', 'sezon', 'basari')),
  kural text not null check (kural in ('rozet', 'olay')),
  rozet text references public.rozet_tanimlari(anahtar),
  sira integer not null default 0,
  aktif boolean not null default true,
  ad_tr text not null, ad_en text not null,
  aciklama_tr text not null, aciklama_en text not null,
  check ((kural = 'rozet') = (rozet is not null))
);
alter table public.unvan_tanimlari enable row level security;
drop policy if exists unvan_tanimlari_oku on public.unvan_tanimlari;
create policy unvan_tanimlari_oku on public.unvan_tanimlari for select using (true);

create table if not exists public.oyuncu_unvanlari (
  user_id uuid not null references public.profiles(id) on delete cascade,
  unvan text not null references public.unvan_tanimlari(anahtar),
  kazanildi_at timestamptz not null default now(),
  primary key (user_id, unvan)
);
alter table public.oyuncu_unvanlari enable row level security;   -- politika yok: yalnız RPC

create table if not exists public.unvan_sayaclari (
  user_id uuid not null references public.profiles(id) on delete cascade,
  anahtar text not null,
  deger integer not null default 0,
  primary key (user_id, anahtar)
);
alter table public.unvan_sayaclari enable row level security;    -- politika yok: yalnız sunucu

alter table public.profiles add column if not exists takili_unvan text references public.unvan_tanimlari(anahtar) on delete set null;

insert into public.unvan_tanimlari (anahtar, tur, kural, rozet, sira, ad_tr, ad_en, aciklama_tr, aciklama_en) values
  ('efsane_lig_sampiyonu', 'lig', 'rozet', 'lig_efsane_bir', 10, 'Efsane Lig Şampiyonu', 'Legend League Champion', 'Efsane Lig''de bir haftayı grubunun 1.''si bitir', 'Finish a week 1st in your Legend League group'),
  ('elmas_lig_birincisi', 'lig', 'olay', null, 11, 'Elmas Lig Birincisi', 'Diamond League Winner', 'Elmas Lig''de bir haftayı grubunun 1.''si bitir', 'Finish a week 1st in your Diamond League group'),
  ('altin_lig_fatihi', 'lig', 'olay', null, 12, 'Altın Lig Fatihi', 'Gold League Conqueror', 'Altın Lig''den 3 kez yüksel', 'Get promoted from the Gold League 3 times'),
  ('bes_kez_lig_birincisi', 'lig', 'olay', null, 13, '5 Kez Lig Birincisi', '5-Time League Winner', 'Herhangi bir ligde 5 hafta grubunun 1.''si ol', 'Finish 1st in your league group in 5 weeks'),
  ('tarih_ustasi', 'basari', 'rozet', 'ustalik_tarih_750', 30, 'Tarih Ustası', 'History Master', 'Tarih ustalık rozetini elmasa çıkar', 'Reach the diamond History mastery badge'),
  ('cografya_kasifi', 'basari', 'rozet', 'ustalik_cografya_300', 31, 'Coğrafya Kâşifi', 'Geography Explorer', 'Coğrafya ustalık rozetini altına çıkar', 'Reach the gold Geography mastery badge'),
  ('bilim_dehasi', 'basari', 'rozet', 'ustalik_bilim_750', 32, 'Bilim Dehası', 'Science Genius', 'Bilim ustalık rozetini elmasa çıkar', 'Reach the diamond Science mastery badge'),
  ('duello_ustasi', 'basari', 'rozet', 'duello_100', 33, 'Düello Ustası', 'Duel Master', '100 Düello kazan', 'Win 100 Duels'),
  ('turnuva_sampiyonu', 'basari', 'rozet', 'turnuva_sampiyon', 34, 'Turnuva Şampiyonu', 'Tournament Champion', 'Bir turnuvayı 1. bitir', 'Win a tournament'),
  ('seri_canavari', 'basari', 'rozet', 'seri_30', 35, 'Seri Canavarı', 'Streak Monster', '30 gün üst üste oyna', 'Play 30 days in a row'),
  ('kusursuz', 'basari', 'rozet', 'ozel_kusursuz', 36, 'Kusursuz', 'Flawless', 'Bir maçta bütün soruları doğru bil', 'Answer every question correctly in a match'),
  ('dahi', 'basari', 'rozet', 'level_100', 37, 'Dâhi', 'Genius', 'Level 100''e ulaş', 'Reach Level 100')
on conflict (anahtar) do nothing;

-- ---------------------------------------------------------------------------
-- 2) Yardımcılar
-- ---------------------------------------------------------------------------
-- Oyuncunun kazandığı unvanlar (rozet kuralı türetilir + olay kayıtları).
create or replace function public.oyuncu_unvan_listesi(p_user uuid)
returns table (anahtar text)
language sql
stable
security definer
set search_path to 'public'
as $$
  select t.anahtar from public.unvan_tanimlari t
   where t.aktif and (
     (t.kural = 'rozet' and exists (select 1 from public.oyuncu_rozetleri r where r.user_id = p_user and r.rozet = t.rozet))
     or (t.kural = 'olay' and exists (select 1 from public.oyuncu_unvanlari u where u.user_id = p_user and u.unvan = t.anahtar))
   );
$$;
revoke all on function public.oyuncu_unvan_listesi(uuid) from public, anon, authenticated;
grant execute on function public.oyuncu_unvan_listesi(uuid) to service_role;

-- Haftalık lig kapanışından çağrılır (yalnız insan; botlar lig değiştirmez). Hata kapanışı bozmaz (çağıran yakalar).
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
end;
$$;
revoke all on function public.unvan_lig_kapanis(uuid, text, boolean, boolean) from public, anon, authenticated;
grant execute on function public.unvan_lig_kapanis(uuid, text, boolean, boolean) to service_role;

-- ---------------------------------------------------------------------------
-- 3) Lig kapanışı (canlı gövde + unvan kancası; başka değişiklik yok)
-- ---------------------------------------------------------------------------
create or replace function public.lig_haftayi_kapat(p_hafta date default null::date)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_hafta date := coalesce(p_hafta, public.hafta_basi());   -- 217: haftalik_kapanis kapanan haftayı açıkça verir (Pazartesi 00:00'dan sonra çalışır)
  v_yuk int := public.ayar_sayi('lig_yukselen', 5)::int;
  v_dus int := public.ayar_sayi('lig_dusen', 5)::int;
  v_pasif_esik int := public.ayar_sayi('lig_pasif_dusme_hafta', 2)::int;
  v_islenen int := 0;
  r record;
begin
  -- Aynı hafta iki kez kapanmasın (cron birden çok kez deneniyor).
  if (select deger #>> '{}' from public.oyun_ayarlari where anahtar = 'lig_son_kapanis')
     = v_hafta::text then
    return 0;
  end if;

  -- Haftalık maç sayısı: pasiflik buna bakar. 217: BÜTÜN modlar (Normal Maç · Düello · Hızlı Mod · Grup · Turnuva),
  -- hafta sınırı TSİ (eskiden yalnız matches ve UTC gece yarısı).
  update public.lig_uyelik u
     set mac_sayisi = public.lig_aktif_mac_sayisi(u.user_id, v_hafta)
   where u.hafta = v_hafta;

  for r in
    select u.user_id, u.lig, u.grup_no, u.mac_sayisi, u.pasif_hafta,
           coalesce(p.is_bot, false) as bot,
           row_number() over (partition by u.lig, u.grup_no
                              order by p.puan_hafta desc, p.puan desc, p.gorunen_ad asc) as sira,
           count(*) over (partition by u.lig, u.grup_no) as grup_boyu,
           p.puan_hafta
      from public.lig_uyelik u
      join public.profiles p on p.id = u.user_id
     where u.hafta = v_hafta
       -- Açık bot tabloda görünmediği için sıraya da girmez.
       and not public.acik_bot_mu(p.is_bot, p.bot_turu)
  loop
    v_islenen := v_islenen + 1;

    -- Grup içi ödül (ilk üç) — botlara coin_ekle zaten vermiyor.
    if r.sira <= 3 then
      perform public.coin_ekle(
        r.user_id,
        public.ayar_sayi('lig_odul_' || r.lig || '_' || r.sira::text, 0),
        'lig', v_hafta::text || ':' || r.lig || ':' || r.grup_no::text);
      -- 480: elmas (yalnız puan kazanmış oyuncuya; bot almaz; hata kapanışı bozmaz)
      if not r.bot and coalesce(r.puan_hafta, 0) > 0 then
        begin
          perform public.elmas_ekle(r.user_id, public.ayar_sayi('elmas_lig_' || r.sira::text, 0)::int,
                                    'lig', v_hafta::text || ':' || r.lig || ':' || r.grup_no::text);
        exception when others then
          raise warning 'lig elmasi verilemedi (%): %', r.user_id, sqlerrm;
        end;
      end if;
    end if;

    if r.bot then
      continue;                      -- BOTLAR LİG DEĞİŞTİRMEZ
    end if;

    -- 333: Efsane Lig'de haftayı grubunun 1.'si bitiren (puanla) rozeti alır; hata kapanışı bozmaz.
    if r.lig = 'efsane' and r.sira = 1 and coalesce(r.puan_hafta, 0) > 0 then
      begin
        perform public.rozet_ver(r.user_id, 'lig_efsane_bir', true, false);
      exception when others then
        raise warning 'lig_efsane_bir rozeti verilemedi (%): %', r.user_id, sqlerrm;
      end;
    end if;

    -- 643: unvan kancası (grup 1.'liği · Altın'dan yükselme); hata kapanışı bozmaz.
    begin
      perform public.unvan_lig_kapanis(r.user_id, r.lig,
        r.sira = 1 and coalesce(r.puan_hafta, 0) > 0,
        coalesce(r.mac_sayisi, 0) > 0 and r.sira <= v_yuk and coalesce(r.puan_hafta, 0) > 0 and r.lig <> 'efsane');
    exception when others then
      raise warning 'unvan kancasi calismadi (%): %', r.user_id, sqlerrm;
    end;

    -- Pasiflik takibi
    if coalesce(r.mac_sayisi, 0) = 0 then
      update public.lig_uyelik set pasif_hafta = coalesce(pasif_hafta, 0) + 1
       where user_id = r.user_id and hafta = v_hafta;
    else
      update public.lig_uyelik set pasif_hafta = 0
       where user_id = r.user_id and hafta = v_hafta;
    end if;

    if coalesce(r.mac_sayisi, 0) = 0 then
      -- 1 hafta pasif: düşmez, yerinde kalır. Üst üste 2. haftada bir lig düşer.
      if coalesce(r.pasif_hafta, 0) + 1 >= v_pasif_esik then
        update public.profiles
           set lig = public.lig_adi(greatest(1, public.lig_sirasi(r.lig) - 1))
         where id = r.user_id;
        -- 217: düşünce sayaç sıfırlanır → pasiflik sürerse her v_pasif_esik haftada bir düşer (her hafta değil)
        update public.lig_uyelik set pasif_hafta = 0 where user_id = r.user_id and hafta = v_hafta;
      end if;
      continue;
    end if;

    if r.sira <= v_yuk and coalesce(r.puan_hafta, 0) > 0 then   -- 217: 0 puanla yükselme yok (sıra ada göre kalıyordu)
      if r.lig = 'efsane' then
        perform public.award_badge(r.user_id, 'efsane_zirve');   -- üstü yok
      else
        update public.profiles
           set lig = public.lig_adi(least(5, public.lig_sirasi(r.lig) + 1))
         where id = r.user_id;
        -- 213: lig atlayınca o ligin KALICI çerçevesi (düşse de kalır)
        perform public.lig_cerceve_ver(r.user_id, public.lig_adi(least(5, public.lig_sirasi(r.lig) + 1)), 'lig_yukselme');
      end if;
    elsif r.sira > r.grup_boyu - v_dus then
      update public.profiles
         set lig = public.lig_adi(greatest(1, public.lig_sirasi(r.lig) - 1))
       where id = r.user_id;
    end if;
  end loop;

  -- Kapanış damgası (tekrar çalıştırmaya karşı)
  insert into public.oyun_ayarlari (anahtar, deger)
  values ('lig_son_kapanis', to_jsonb(v_hafta::text))
  on conflict (anahtar) do update set deger = excluded.deger;

  -- Yeni haftanın grupları: gruplar HER HAFTA yeniden karılır.
  perform public.lig_gruplarini_kur(v_hafta + 7);

  return v_islenen;
end;
$function$;

-- ---------------------------------------------------------------------------
-- 4) İstemci RPC'leri
-- ---------------------------------------------------------------------------
create or replace function public.unvanlarim()
returns jsonb
language plpgsql
stable
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

create or replace function public.unvan_tak(p_anahtar text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  if p_anahtar is not null and not exists (select 1 from public.oyuncu_unvan_listesi(v_me) k where k.anahtar = p_anahtar) then
    raise exception 'Bu unvan sende yok';
  end if;
  update public.profiles set takili_unvan = p_anahtar where id = v_me;
  return jsonb_build_object('takili', p_anahtar);
end;
$$;
revoke all on function public.unvan_tak(text) from public, anon;
grant execute on function public.unvan_tak(text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5) Oyuncu kartı: + unvan jsonb — {tur:'sehir', sehir, ulke} | {tur, anahtar, tr, en} | null.
--    Gövde 641'dekiyle aynı; yalnız son kolon eklendi.
-- ---------------------------------------------------------------------------
drop function if exists public.oyuncu_kartlari(uuid[]);
create function public.oyuncu_kartlari(p_idler uuid[])
returns table(id uuid, ad text, avatar text, level integer, lig text, cerceve text, cerceve_nadirlik text, vitrin jsonb, aura text, vs_karti text, isim_efekti text, zafer_efekti text, premium_cerceve text, premium_aura text, sehir_sampiyonu jsonb, unvan jsonb)
language sql
stable security definer
set search_path to 'public'
as $function$
  select p.id, p.gorunen_ad, p.gorunen_avatar, coalesce(p.level, 1), coalesce(p.lig, 'bronz'),
         case when c.aktif then p.takili_cerceve end, case when c.aktif then c.nadirlik end,
         coalesce((
           select jsonb_agg(jsonb_build_object('anahtar', t.anahtar, 'grup', t.grup, 'kademe', t.kademe, 'ikon', t.ikon)
                            order by v.ord)
             from unnest(p.vitrin_rozetleri) with ordinality as v(anahtar, ord)
             join public.rozet_tanimlari t on t.anahtar = v.anahtar
             join public.oyuncu_rozetleri r on r.user_id = p.id and r.rozet = v.anahtar
         ), '[]'::jsonb),
         case when gb.gizli then public.bot_kozmetik(p.id, p.level, 'aura')
              when public.aura_aktif_mi(p.takili_aura) then p.takili_aura end,
         case when gb.gizli then public.bot_kozmetik(p.id, p.level, 'vs_karti')
              else (select k.anahtar from public.kozmetikler k
                     where k.anahtar = p.takili_vs_karti and k.aktif and k.onay = 'girsin') end,
         case when gb.gizli then public.bot_kozmetik(p.id, p.level, 'isim_efekti')
              else (select k.anahtar from public.kozmetikler k
                     where k.anahtar = p.takili_isim_efekti and k.aktif and k.onay = 'girsin') end,
         case when gb.gizli then public.bot_kozmetik(p.id, p.level, 'zafer_efekti')
              else (select k.anahtar from public.kozmetikler k
                     where k.anahtar = p.takili_zafer_efekti and k.aktif and k.onay = 'girsin') end,
         -- 560: premium — gizli botta her zaman null; insanda yalnız aktif ('girsin') kalem
         case when gb.gizli then null
              else (select k.anahtar from public.kozmetikler k
                     where k.anahtar = p.takili_premium_cerceve and k.tur = 'premium_cerceve'
                       and k.aktif and k.onay = 'girsin') end,
         case when gb.gizli then null
              else (select k.anahtar from public.kozmetikler k
                     where k.anahtar = p.takili_premium_aura and k.tur = 'premium_aura'
                       and k.aktif and k.onay = 'girsin') end,
         -- 641: geçen haftanın şehir şampiyonu ise bu hafta boyunca unvan (kaynak lig_arsiv)
         ss.j,
         -- 643: görünen unvan — aktif şehir şampiyonluğu önce; yoksa takılı unvan (kazanılmışsa);
         --      gizli bot kazandığı unvanlardan kimliğinden sabit birini (ya da hiçbirini) taşır.
         coalesce(
           case when ss.j is not null then jsonb_build_object('tur', 'sehir', 'sehir', ss.j ->> 'sehir', 'ulke', ss.j ->> 'ulke') end,
           (select jsonb_build_object('tur', t.tur, 'anahtar', t.anahtar, 'tr', t.ad_tr, 'en', t.ad_en)
              from public.unvan_tanimlari t
             where t.aktif and t.anahtar = case
                     when gb.gizli then (select l.anahtar from public.oyuncu_unvan_listesi(p.id) l
                                          where abs(hashtext(p.id::text || ':unvan')) % 3 <> 0
                                          order by md5(p.id::text || l.anahtar) limit 1)
                     else p.takili_unvan end
               and exists (select 1 from public.oyuncu_unvan_listesi(p.id) l where l.anahtar = t.anahtar)))
    from public.profiles p
    left join public.cerceveler c on c.anahtar = p.takili_cerceve
    cross join lateral (select coalesce(p.is_bot, false) and not public.acik_bot_mu(p.is_bot, p.bot_turu)
                               and not coalesce(p.acik_bot, false) as gizli) gb
    left join lateral (select jsonb_build_object('sehir', a.sehir, 'ulke', a.ulke, 'hafta', a.hafta) as j
                         from public.lig_arsiv a
                        where a.user_id = p.id and a.hafta = public.hafta_basi() - 7 and a.sehir_sampiyonu) ss on true
   where auth.uid() is not null
     and p.id = any(p_idler[1:200]);
$function$;
-- Eski yetkinin birebir aynısı (önce: postgres, authenticated, service_role).
revoke all on function public.oyuncu_kartlari(uuid[]) from public, anon;
grant execute on function public.oyuncu_kartlari(uuid[]) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6) Ayarlar ve adlar
-- ---------------------------------------------------------------------------
-- Şehir şampiyonluğu bildirimi açık (görünüm bu pakette geldi — Ida, 25 Eyl).
update public.oyun_ayarlari set deger = to_jsonb(1) where anahtar = 'sehir_sampiyonu_bildirim_acik';

-- Level çerçevelerinin yeni çizimi metal değil renk (turkuaz · safir · ametist · yakut): adlar metal adı taşımasın.
update public.cerceveler set ad_tr = 'Level 25 Madalyası', ad_en = 'Level 25 Medal' where anahtar = 'level_25';
update public.cerceveler set ad_tr = 'Level 50 Madalyası', ad_en = 'Level 50 Medal' where anahtar = 'level_50';
update public.cerceveler set ad_tr = 'Level 75 Madalyası', ad_en = 'Level 75 Medal' where anahtar = 'level_75';
update public.cerceveler set ad_tr = 'Level 100 Madalyası', ad_en = 'Level 100 Medal' where anahtar = 'level_100';
