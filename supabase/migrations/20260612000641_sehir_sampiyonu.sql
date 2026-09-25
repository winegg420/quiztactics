-- 641: Şehir Şampiyonu — arka plan (brif tasarim/BRIEF_SEHIR_SAMPIYONU.md)
--
-- * Kapanan haftayı şehrinde 1. bitiren, sonraki hafta boyunca o şehrin Şehir Şampiyonu'dur.
--   TEK DOĞRU KAYNAK: lig_arsiv.sehir_sampiyonu. Aktif unvan = hafta = hafta_basi() - 7 ve işaretli satır
--   (profile kalıcı alan yazılmaz; unvan bir sonraki kapanışta kendiliğinden geçer).
-- * Şehir sırası canlı listeyle (lig_siralama) BİREBİR aynı: puan_hafta DESC → puan DESC →
--   gorunen_ad ASC → id ASC, aynı görünürlük ölçütü. Gizli botlar canlı listede göründüğü için
--   arşive de girer ve gerekirse şampiyon olur (listede 1. görünen = şampiyon; bot ele verilmez).
-- * Asgari şart (oyun_ayarlari): şehirde o hafta puanı > 0 en az `sehir_sampiyonu_min_oyuncu` (3)
--   görünür oyuncu (bot dahil) ve 1.'nin o hafta en az `sehir_sampiyonu_min_galibiyet` (1) galibiyeti.
--   Sağlanmazsa arşiv sırası yine yazılır, şampiyon işaretlenmez.
-- * Kalıcı rozet `lig_sehir_sampiyonu` (lig · altın · crown · olay · coin 0). Eski `sehir_krali`
--   (badges/user_badges — istemcide hiç gösterilmeyen eski sistem) ARTIK VERİLMEZ; eski kayıtlar durur.
-- * Konum kilidi: şehri olan oyuncu o hafta puan kazandıysa yeni hafta başlayana kadar şehir/ülke
--   değiştiremez; ilk şehir seçimi bu kilide takılmaz; 24 saat kuralı ve doğrulamalar aynen.
-- * Görünüm yok (Görsel Paket 2): yalnız veri — oyuncu_kartlari.sehir_sampiyonu, sehir_sampiyonu() RPC.
-- Yetki: yeni RPC `sehir_sampiyonu()` yalnız authenticated; iç yardımcılar yalnız service_role
-- (mevcut iç yardımcılarla aynı). oyuncu_kartlari dönüş tipi değiştiği için yeniden kurulur ve
-- ESKİ yetkisi birebir geri verilir (authenticated + service_role). RLS değişikliği YOK.

-- ---------------------------------------------------------------------------
-- 1) Rozet, arşiv kolonu, ayarlar, bildirim metni
-- ---------------------------------------------------------------------------
insert into public.rozet_tanimlari
  (anahtar, grup, kademe, esik, olcut, coin, gizli, sira, ikon, cerceve, aktif, ad_tr, ad_en, aciklama_tr, aciklama_en, elmas)
values
  ('lig_sehir_sampiyonu', 'lig', 'altin', 1, 'olay', 0, false, 706, 'crown', null, true,
   'Şehir Şampiyonu', 'City Champion', 'Bir haftayı şehrinde 1. bitir', 'Finish a week ranked #1 in your city', 0)
on conflict (anahtar) do nothing;

alter table public.lig_arsiv add column if not exists sehir_sampiyonu boolean not null default false;
comment on column public.lig_arsiv.sehir_sampiyonu is
  '641: o haftanın şehir şampiyonu (asgari şart dahil). Aktif unvanın TEK kaynağı; sira_sehir = 1 tek başına yetmez.';
-- Aktif şampiyon okuması (şehir → şampiyon) için dar indeks; kişi → unvan okuması PK (user_id, hafta) ile.
create index if not exists idx_lig_arsiv_sehir_sampiyonu
  on public.lig_arsiv (hafta, ulke, sehir) where sehir_sampiyonu;

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('sehir_sampiyonu_min_oyuncu', to_jsonb(3), '641: şampiyonluk için şehirde o hafta puanı > 0 en az bu kadar görünür oyuncu (bot dahil)'),
  ('sehir_sampiyonu_min_galibiyet', to_jsonb(1), '641: şehrin 1.''i o hafta en az bu kadar maç kazanmış olmalı'),
  ('sehir_sampiyonu_bildirim_acik', to_jsonb(0), '641: 1 = şampiyona "Şehir Şampiyonu oldun" bildirimi. Unvan görünümü (Görsel Paket 2) gelene dek 0')
on conflict (anahtar) do nothing;

insert into public.push_metinleri (anahtar, dil, baslik, govde) values
  ('sehir_sampiyonu_oldun', 'tr', '🏆 Şehir Şampiyonu',
   '🏆 %1 Şampiyonu oldun! Unvanın bu hafta profilinde ve maçlarda görünecek.'),
  ('sehir_sampiyonu_oldun', 'en', '🏆 City Champion',
   '🏆 You are the Champion of %1! Your title will appear on your profile and in matches this week.')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 2) İç yardımcılar
-- ---------------------------------------------------------------------------
-- Haftalık galibiyet: hazır alan yok; kapanışta yalnız şehir 1.'leri için hesaplanır (ucuz).
-- Klasik/Saf Bilgi/Antrenman (matches), Düello, Grup ve Turnuva kazananı; hafta sınırı TSİ
-- (lig_aktif_mac_sayisi ile aynı). Botların galibiyetleri de sayılır.
create or replace function public.haftalik_galibiyet_sayisi(p_user uuid, p_hafta date)
returns integer
language sql
stable
security definer
set search_path to 'public'
as $$
  with sinir as (
    select (p_hafta::timestamp at time zone 'Europe/Istanbul') as bas,
           ((p_hafta + 7)::timestamp at time zone 'Europe/Istanbul') as son
  )
  select (
    (select count(*) from public.matches m, sinir s
      where m.durum = 'bitti' and m.kazanan = p_user
        and coalesce(m.bitis, m.created_at) >= s.bas and coalesce(m.bitis, m.created_at) < s.son)
  + (select count(*) from public.duellolar d, sinir s
      where d.durum = 'bitti' and d.kazanan = p_user and d.bitis >= s.bas and d.bitis < s.son)
  + (select count(*) from public.group_matches g, sinir s
      where g.durum = 'bitti' and g.kazanan = p_user and g.bitis >= s.bas and g.bitis < s.son)
  + (select count(*) from public.tournaments t, sinir s
      where t.durum = 'bitti' and t.kazanan = p_user and t.bitis >= s.bas and t.bitis < s.son)
  )::int;
$$;
revoke all on function public.haftalik_galibiyet_sayisi(uuid, date) from public, anon, authenticated;
grant execute on function public.haftalik_galibiyet_sayisi(uuid, date) to service_role;

-- Haftalık kapanış havuzu: arşive girecek oyuncular (puan_hafta > 0) + canlı listede herkese
-- görünür mü (lig_siralama ile aynı ölçüt; "kendi satırını görür" istisnası hariç).
create or replace function public.lig_kapanis_havuzu()
returns table (id uuid, puan_hafta integer, puan integer, gorunen_ad text, sehir text, ulke text, gorunur boolean)
language sql
stable
security definer
set search_path to 'public'
as $$
  select p.id, p.puan_hafta, coalesce(p.puan, 0), p.gorunen_ad, p.sehir, p.ulke,
         (public.lig_gorunur_mu(p.is_bot, p.takma_ad_secildi, p.avatar_onayli, p.lig_gizli)
          and (coalesce(p.is_bot, false) or not public.lig_misafir_eksik_mi(p.id, p.toplam_mac)))
    from public.profiles p
   where coalesce(p.toplam_mac, 0) >= 1
     and p.puan_hafta > 0
     and not public.acik_bot_mu(p.is_bot, p.bot_turu)                       -- açık bot listede yok
     and not (coalesce(p.is_bot, false) and not coalesce(p.bot_aktif, true)); -- pasif bot listede yok
$$;
revoke all on function public.lig_kapanis_havuzu() from public, anon, authenticated;
grant execute on function public.lig_kapanis_havuzu() to service_role;

-- ---------------------------------------------------------------------------
-- 3) Haftalık kapanış (canlı gövde + 641 değişiklikleri)
-- ---------------------------------------------------------------------------
create or replace function public.haftayi_kapat(p_hafta date default null::date)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_hafta date;
  v_min_oyuncu int := public.ayar_sayi('sehir_sampiyonu_min_oyuncu', 3)::int;
  v_min_galibiyet int := public.ayar_sayi('sehir_sampiyonu_min_galibiyet', 1)::int;
  v_sampiyon_bildirim boolean := public.ayar_sayi('sehir_sampiyonu_bildirim_acik', 0) > 0;
  r record;
begin
  v_hafta := coalesce(p_hafta, (date_trunc('week', (now() at time zone 'Europe/Istanbul') - interval '1 day'))::date);

  if exists (select 1 from public.lig_arsiv where hafta = v_hafta) then
    return;
  end if;

  -- 641: gizli botlar da arşive girer (canlı listede görünüyorlar). sira_sehir = canlı şehir
  -- listesindeki yer: önünde duran GÖRÜNÜR şehir oyuncusu sayısı + 1 (görünür oyuncuda bu,
  -- lig_siralama'nın row_number'ıyla aynıdır; listede görünmeyen oyuncu kendi ekranındaki yeri alır).
  -- sira_ulke / sira_global eski anlamında rank(); havuz artık gizli botları da içerir.
  insert into public.lig_arsiv (user_id, hafta, puan, sehir, ulke, sira_sehir, sira_ulke, sira_global)
  select k.id, v_hafta, k.puan_hafta, k.sehir, k.ulke,
         case when k.sehir is not null and k.ulke is not null then
           1 + (select count(*) from public.lig_kapanis_havuzu() k2
                 where k2.gorunur and k2.id <> k.id and k2.ulke = k.ulke and k2.sehir = k.sehir
                   and (k2.puan_hafta > k.puan_hafta
                        or (k2.puan_hafta = k.puan_hafta and k2.puan > k.puan)
                        or (k2.puan_hafta = k.puan_hafta and k2.puan = k.puan
                            and ((k2.gorunen_ad < k.gorunen_ad)
                                 or (k2.gorunen_ad is not null and k.gorunen_ad is null)))
                        or (k2.puan_hafta = k.puan_hafta and k2.puan = k.puan
                            and k2.gorunen_ad is not distinct from k.gorunen_ad and k2.id < k.id)))
         end,
         case when k.ulke is not null
              then rank() over (partition by k.ulke order by k.puan_hafta desc) end,
         rank() over (order by k.puan_hafta desc)
    from public.lig_kapanis_havuzu() k
  on conflict (user_id, hafta) do nothing;

  -- 641: şehir şampiyonu — canlı listenin 1.'si (görünür, aynı sıralama) + asgari şart.
  update public.lig_arsiv a
     set sehir_sampiyonu = true
    from (
      select h.id, h.ulke, h.sehir,
             row_number() over (partition by h.ulke, h.sehir
                                order by h.puan_hafta desc, h.puan desc, h.gorunen_ad asc, h.id asc) as rn,
             count(*) over (partition by h.ulke, h.sehir) as n
        from public.lig_kapanis_havuzu() h
       where h.gorunur and h.sehir is not null and h.ulke is not null
    ) s
   where s.rn = 1 and s.n >= v_min_oyuncu
     and a.user_id = s.id and a.hafta = v_hafta
     and public.haftalik_galibiyet_sayisi(s.id, v_hafta) >= v_min_galibiyet;

  -- Eski haftalık rozetler (badges sistemi) — değişmedi.
  for r in
    select a.user_id, a.sira_global
    from public.lig_arsiv a
    where a.hafta = v_hafta and a.sira_global <= 3
  loop
    perform public.award_badge(
      r.user_id,
      case r.sira_global when 1 then 'hafta_1' when 2 then 'hafta_2' else 'hafta_3' end
    );
  end loop;

  -- 641: eski 'sehir_krali' (award_badge) yerine tek kaynak yeni rozet. Coin yok, ikinci kez verilmez
  -- (rozet_ver PK ile), botlara verilmez (rozet_ver). Hata kapanışı bozmaz.
  for r in
    select a.user_id, a.sehir from public.lig_arsiv a
    where a.hafta = v_hafta and a.sehir_sampiyonu
  loop
    begin
      perform public.rozet_ver(r.user_id, 'lig_sehir_sampiyonu', false, false);
      if v_sampiyon_bildirim then
        perform public.bildirim_anahtarla(r.user_id, 'sehir_sampiyonu', 'sehir_sampiyonu_oldun',
                                          jsonb_build_array(r.sehir), '/bildim/siralama');
      end if;
    exception when others then
      raise warning 'sehir sampiyonu odulu verilemedi (%): %', r.user_id, sqlerrm;
    end;
  end loop;

  -- Uygulama içi haftalık sonuç bildirimi (push'tan bağımsız, herkese; botlara bildirim_anahtarla gitmez)
  for r in
    select a.user_id, a.sira_sehir, a.sira_global, a.sehir, a.puan
    from public.lig_arsiv a
    where a.hafta = v_hafta
  loop
    perform public.bildirim_anahtarla(
      r.user_id, 'hafta_sonuc', case when r.sira_sehir is not null then 'hafta_sonuc_sehir' else 'hafta_sonuc_dunya' end,
      case when r.sira_sehir is not null
        then jsonb_build_array(coalesce(r.sehir, 'şehrinde'), r.sira_sehir, r.puan)
        else jsonb_build_array(r.sira_global, r.puan) end,
      '/bildim/siralama'
    );
  end loop;

  update public.profiles set puan_hafta = 0 where puan_hafta <> 0;
end;
$function$;

-- ---------------------------------------------------------------------------
-- 4) Canlı sıralama: şampiyonla aynı sıra için son eşitlik bozucu `id` eklendi (canlı gövde + 1 satır)
-- ---------------------------------------------------------------------------
create or replace function public.lig_siralama(p_kapsam text default 'global'::text, p_donem text default 'hafta'::text)
returns table(sira bigint, user_id uuid, gorunen_ad text, gorunen_avatar text, puan integer, sehir text, ulke text, ben boolean, bot boolean, gorunum jsonb)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_me uuid := auth.uid();
  v_ulke text;
  v_sehir text;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  if p_kapsam not in ('sehir', 'ulke', 'global') then raise exception 'Geçersiz kapsam'; end if;
  if p_donem not in ('hafta', 'tum_zamanlar') then raise exception 'Geçersiz dönem'; end if;

  select p.ulke, p.sehir into v_ulke, v_sehir from public.profiles p where p.id = v_me;

  if p_kapsam in ('sehir', 'ulke') and v_ulke is null then
    raise exception 'Önce ülkeni ve şehrini seçmelisin';
  end if;
  if p_kapsam = 'sehir' and v_sehir is null then
    raise exception 'Önce şehrini seçmelisin';
  end if;

  return query
  with sirali as (
    select p.id,
           p.gorunen_ad as p_ad,
           p.gorunen_avatar as p_avatar,
           (case when p_donem = 'hafta' then p.puan_hafta else p.puan end) as p_puan,
           p.sehir, p.ulke, p.gorunum as p_gorunum,
           public.acik_bot_mu(p.is_bot, p.bot_turu) as p_bot,
           row_number() over (
             order by (case when p_donem = 'hafta' then p.puan_hafta else p.puan end) desc,
                      p.puan desc, p.gorunen_ad asc, p.id asc) as p_sira   -- 641: id (haftalık kapanışla aynı)
    from public.profiles p
    where coalesce(p.toplam_mac, 0) >= 1
      and not (coalesce(p.is_bot, false) and not coalesce(p.bot_aktif, true))
      and not public.acik_bot_mu(p.is_bot, p.bot_turu)
      and ((public.lig_gorunur_mu(p.is_bot, p.takma_ad_secildi, p.avatar_onayli, p.lig_gizli)
            -- 275 B: az oynamış misafir (deneme) hesabı satır tutmasın.
            and (coalesce(p.is_bot, false)
                 or not public.lig_misafir_eksik_mi(p.id, p.toplam_mac)))
           or p.id = v_me)
      and (
        p_kapsam = 'global'
        or (p_kapsam = 'ulke'  and p.ulke = v_ulke)
        or (p_kapsam = 'sehir' and p.ulke = v_ulke and p.sehir = v_sehir)
      )
  )
  select s.p_sira, s.id, s.p_ad, s.p_avatar, s.p_puan, s.sehir, s.ulke,
         (s.id = v_me), s.p_bot, s.p_gorunum
  from sirali s
  where s.p_sira <= 100 or s.id = v_me
  order by s.p_sira;
end;
$function$;

-- ---------------------------------------------------------------------------
-- 5) Konum kaydı (canlı gövde + 641 kuralları)
-- ---------------------------------------------------------------------------
create or replace function public.profil_konum_kaydet(p_ulke text, p_sehir text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_ulke text;
  v_sehir text;
  v_son timestamptz;
  v_mevcut_ulke text;
  v_mevcut_sehir text;
  v_puan_hafta int;
  v_kalan interval;
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;

  v_ulke := upper(nullif(btrim(coalesce(p_ulke, '')), ''));
  v_sehir := nullif(btrim(coalesce(p_sehir, '')), '');

  if v_ulke is null then raise exception 'Ülke seçmelisin'; end if;
  if not exists (select 1 from public.ulkeler u where u.kod = v_ulke) then
    raise exception 'Geçersiz ülke kodu';
  end if;

  -- 641: her ülkede şehir listeden seçilir (serbest metin yok; liste 640 ile her ülke için dolu).
  if v_sehir is null
     or not exists (select 1 from public.sehirler s where s.ulke = v_ulke and s.ad = v_sehir)
  then
    raise exception 'Geçersiz şehir';
  end if;

  -- FOR UPDATE: aynı anda biten maçın puan_hafta yazımıyla yarışmasın.
  select p.konum_degisti_at, p.ulke, p.sehir, coalesce(p.puan_hafta, 0)
    into v_son, v_mevcut_ulke, v_mevcut_sehir, v_puan_hafta
  from public.profiles p where p.id = auth.uid()
  for update;

  -- Aynı değerler tekrar gönderildiyse sessizce geç (kilidi harcama)
  if v_mevcut_ulke is not null and v_mevcut_ulke = v_ulke and v_mevcut_sehir is not distinct from v_sehir then
    return;
  end if;

  -- 641 haftalık kilit: şehri olan oyuncu bu hafta puan kazandıysa yeni haftayı bekler.
  -- İlk şehir seçimi (şehir boş) bu kilide takılmaz; puanı seçtiği şehre sayılır.
  if v_mevcut_sehir is not null and v_puan_hafta > 0 then
    raise exception 'Bu hafta puan kazandığın için şehrini yeni hafta başlayana kadar değiştiremezsin.';
  end if;

  -- KİLİT: 7 gün -> 24 saat
  if v_son is not null and v_son > now() - interval '24 hours' then
    v_kalan := (v_son + interval '24 hours') - now();
    raise exception 'Konumunu günde bir kez değiştirebilirsin. Kalan: % saat % dakika',
      extract(hour from v_kalan)::int, extract(minute from v_kalan)::int;
  end if;

  update public.profiles
     set ulke = v_ulke,
         sehir = v_sehir,
         konum_degisti_at = now()
   where id = auth.uid();
end;
$function$;

-- ---------------------------------------------------------------------------
-- 6) Oyuncu kartı: + sehir_sampiyonu jsonb (null | {"sehir","ulke","hafta"}). Dönüş tipi değiştiği
--    için DROP + CREATE; gövde canlıdakiyle aynı, yalnız son kolon eklendi. Kişi başına PK araması
--    (user_id, hafta) — tek sorguda, N+1 yok. Gizli bot şampiyonsa onda da görünür (ele vermemek için).
-- ---------------------------------------------------------------------------
drop function if exists public.oyuncu_kartlari(uuid[]);
create function public.oyuncu_kartlari(p_idler uuid[])
returns table(id uuid, ad text, avatar text, level integer, lig text, cerceve text, cerceve_nadirlik text, vitrin jsonb, aura text, vs_karti text, isim_efekti text, zafer_efekti text, premium_cerceve text, premium_aura text, sehir_sampiyonu jsonb)
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
         (select jsonb_build_object('sehir', a.sehir, 'ulke', a.ulke, 'hafta', a.hafta)
            from public.lig_arsiv a
           where a.user_id = p.id and a.hafta = public.hafta_basi() - 7 and a.sehir_sampiyonu)
    from public.profiles p
    left join public.cerceveler c on c.anahtar = p.takili_cerceve
    cross join lateral (select coalesce(p.is_bot, false) and not public.acik_bot_mu(p.is_bot, p.bot_turu)
                               and not coalesce(p.acik_bot, false) as gizli) gb
   where auth.uid() is not null
     and p.id = any(p_idler[1:200]);
$function$;
-- Eski yetkinin birebir aynısı (önce: postgres, authenticated, service_role).
revoke all on function public.oyuncu_kartlari(uuid[]) from public, anon;
grant execute on function public.oyuncu_kartlari(uuid[]) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7) sehir_sampiyonu(): çağıranın şehrinin geçen hafta şampiyonu ya da null. Bot bilgisi DÖNMEZ.
-- ---------------------------------------------------------------------------
create or replace function public.sehir_sampiyonu()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_sonuc jsonb;
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  select jsonb_build_object('user_id', a.user_id, 'sehir', a.sehir, 'ulke', a.ulke, 'hafta', a.hafta, 'puan', a.puan)
    into v_sonuc
    from public.profiles me
    join public.lig_arsiv a
      on a.hafta = public.hafta_basi() - 7 and a.sehir_sampiyonu
     and a.ulke = me.ulke and a.sehir = me.sehir
   where me.id = auth.uid()
   limit 1;
  return v_sonuc;
end;
$function$;
revoke all on function public.sehir_sampiyonu() from public, anon;
grant execute on function public.sehir_sampiyonu() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 8) Geriye dönük: arşivdeki geçmiş haftalar. O haftalarda botlar arşivlenmediği için
--    asgari şart arşivdeki (insan) kayıtlarla hesaplanır: şehirde puanı > 0 en az 3 kayıt +
--    1.'nin o hafta en az 1 galibiyeti (maç verisinden). Sıra: haftalık puan → toplam puan →
--    ad → id. Rozet coin'siz, görülmüş (popup yok). Eski sira_sehir değerlerine dokunulmaz.
-- ---------------------------------------------------------------------------
update public.lig_arsiv a
   set sehir_sampiyonu = true
  from (
    select x.user_id, x.hafta,
           row_number() over (partition by x.hafta, x.ulke, x.sehir
                              order by x.puan desc, coalesce(p.puan, 0) desc, p.gorunen_ad asc, x.user_id asc) as rn,
           count(*) over (partition by x.hafta, x.ulke, x.sehir) as n
      from public.lig_arsiv x
      join public.profiles p on p.id = x.user_id
     where x.sehir is not null and x.ulke is not null and x.puan > 0
  ) s
 where s.rn = 1 and s.n >= public.ayar_sayi('sehir_sampiyonu_min_oyuncu', 3)
   and a.user_id = s.user_id and a.hafta = s.hafta
   and public.haftalik_galibiyet_sayisi(s.user_id, s.hafta) >= public.ayar_sayi('sehir_sampiyonu_min_galibiyet', 1);

select public.rozet_ver(a.user_id, 'lig_sehir_sampiyonu', false, true)
  from (select distinct user_id from public.lig_arsiv where sehir_sampiyonu) a;
