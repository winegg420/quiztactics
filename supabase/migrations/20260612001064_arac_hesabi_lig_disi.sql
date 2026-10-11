-- 1064: ARAÇ HESABI LİG DIŞI — denetim/ekran araçlarının açtığı misafir hesaplar lige ve bildirimlere girmez (11 Eki 2026)
--
-- Kök sebep (canlı ölçüm): araclar/arayuz-denetim.mjs ve benzeri Playwright araçları canlıda "Misafir olarak dene"
-- ile hesap açıyordu. Bu hesaplar sıradan misafir gibi lige alınıyor; trg_gecilme_bildir (214) ise lig görünürlüğüne
-- hiç bakmadığından "ArayuzDenetim934 haftalık ligde seni geçti" bildirimi gerçek oyunculara gidiyordu.
--
-- Değişiklik:
--   1) profiles.arac_hesabi (varsayılan false): hesabın bir araç tarafından açıldığını gösterir (temizlik/ölçüm için).
--   2) handle_new_user: kayıt verisinde raw_user_meta_data.arac = true ise profil arac_hesabi = true VE lig_gizli = true
--      doğar. lig_gizli mevcut tek işarettir (195/750): lig_gorunur_mu false → grup 0 (bekleme), sıra/terfi/haftalık
--      ödül yok, lig_siralama / koleksiyon_siralama / lig_kapanis_havuzu (şehir-ülke-dünya şampiyonluğu) dışı.
--      İstemci işareti yalnız otomasyon tarayıcısında gönderir (Login.jsx › navigator.webdriver).
--   3) trg_gecilme_bildir: lig_gizli hesap kimseyi "geçmez" ve "geçildin" bildirimi almaz.
-- Gerçek misafirler değişmez: işaretsiz kayıt aynı yoldan doğar, lig_misafir_min_mac (5) kuralı aynen işler.
-- Yetki/RLS/GRANT değişmez (create or replace yetkileri korur; yeni kolon için yeni yetki verilmez).
-- Geri alma: handle_new_user için 20260612000610, trg_gecilme_bildir için 20260612000214 tanımı; kolon kalabilir.

alter table public.profiles add column if not exists arac_hesabi boolean not null default false;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_dil text := lower(btrim(coalesce(new.raw_user_meta_data->>'dil', '')));
  -- 1064: otomasyon aracının açtığı hesap (Login.jsx yalnız navigator.webdriver iken gönderir)
  v_arac boolean := lower(coalesce(new.raw_user_meta_data->>'arac', '')) = 'true';
begin
  insert into public.profiles (id, username, avatar_url, provider, davet_kodu, dil, arac_hesabi, lig_gizli)
  values (
    new.id,
    'oyuncu_' || substr(md5(new.id::text || random()::text), 1, 8),
    null,                                    -- Google fotoğrafı ALINMAZ
    new.raw_app_meta_data->>'provider',
    public.yeni_davet_kodu(),
    case when v_dil in ('tr', 'en') then v_dil else 'tr' end,  -- 610 (D-203): giriş ekranındaki dil
    v_arac,
    v_arac                                   -- 1064: araç hesabı lig/bildirim dışı
  );

  -- Her ödül AYRI blokta. Tek blok olsaydı birinin hatası ötekileri de geri alırdı
  -- (plpgsql'de exception bloğu örtük alt-işlemdir) — Paket 27'de tam bu oldu.
  -- Paket 35: başlangıç coin'i baslangic_coin ayarından (test dönemi 10.000)
  begin perform public.coin_ekle(new.id, public.ayar_sayi('baslangic_coin', 10000), 'baslangic', null);
  exception when others then null; end;

  -- 610: başlangıç elması baslangic_elmas ayarından (bot hesabı almaz)
  if coalesce(new.raw_app_meta_data->>'provider', '') <> 'bot' then
    begin perform public.elmas_ekle(new.id, public.ayar_sayi('baslangic_elmas', 0)::int, 'baslangic', 'baslangic');
    exception when others then null; end;
  end if;

  begin perform public.ucretsiz_esyalari_ver(new.id);
  exception when others then null; end;

  begin perform public.ucretsiz_karakter_ve_parca_ver(new.id);
  exception when others then null; end;

  begin perform public.baslangic_jokerleri_ver(new.id);   -- Paket 27 A
  exception when others then null; end;

  return new;
end;
$function$

;

CREATE OR REPLACE FUNCTION public.trg_gecilme_bildir()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r record;
begin
  if new.puan_hafta <= old.puan_hafta then return new; end if;
  if coalesce(new.is_bot, false) then return new; end if;
  if coalesce(new.toplam_mac, 0) < 1 then return new; end if;
  if coalesce(new.lig_gizli, false) then return new; end if;   -- 1064: lig dışı hesap kimseyi geçmez

  -- Yalnız bu güncellemeyle geçilen, en yakın birkaç oyuncu
  for r in
    select p.id
    from public.profiles p
    where coalesce(p.is_bot, false) = false
      and p.id <> new.id
      and coalesce(p.toplam_mac, 0) >= 1
      and not coalesce(p.lig_gizli, false)                    -- 1064: lig dışı hesaba bildirim yok
      and p.ulke is not distinct from new.ulke
      and p.puan_hafta > old.puan_hafta
      and p.puan_hafta <= new.puan_hafta
    order by p.puan_hafta desc
    limit 3
  loop
    if not exists (
      select 1 from public.bildirimler b
      where b.user_id = r.id and b.tip = 'gecildin'
        and b.created_at > now() - interval '1 hour'
    ) then
      perform public.bildirim_anahtarla(
      r.id, 'gecildin', 'gecildin',
      jsonb_build_array(new.gorunen_ad),
      '/bildim/siralama'
    );
    end if;
  end loop;
  return new;
end;
$function$

;
