-- Paket 2 · Şerit B · B1 — Skill kullanım hakkı fiyatları (TEST değerleri) ve 10'lu paket
--
-- İlke: skill kullanmak için envanterde hak olmalı; her kullanım envanterden bir hak düşer
-- (joker_kullan / skill_hazirla / duello2_skill → joker_hareket(-1) → 'Yetersiz joker').
-- Pay-to-win değil: herkes aynı skill'i aynı sürümüyle kullanır; maç içi sınırlar herkese eşit.
--
-- Mevcut sistemin ÜZERİNE kurulur (paralel sistem yok):
--   tek hak   → joker_tek_al(p_tur)       fiyat: joker_fiyati() → oyun_ayarlari.coin_joker_<tur>
--   10'lu     → joker_coin_ile_al(urun)   yeni joker_paketleri satırları 'skill_<tur>_10'
--                                         fiyat: oyun_ayarlari.coin_joker_<tur>_10 (fiyat_anahtari kolonu)
-- Maç içi "al ve kullan" (joker_al_ve_kullan / skill_al_ve_hazirla) değişmedi; fiyatı
-- joker_fiyati()'ndan okuduğu için yeni tek fiyatlara kendiliğinden bağlanır.
-- jokerler_ucretsiz bayrağına ve 10.000 coin test bakiyesine dokunulmaz.

-- ---------------------------------------------------------------- fiyatlar (TEST)
-- Eski değerler: elli 40 · sure 60 · soru_degistir 80 · zaman_baskisi 60.
-- ikinci_sans / sigorta / cifte_puan'ın kendi anahtarı yoktu (joker_fiyati başka skill'in
-- ayarını ödünç alıyordu: ikinci_sans→soru_degistir 80, sigorta→sure 60, cifte_puan→zaman_baskisi 60).
-- Sigorta ve 2X için yeni fiyat verilmedi: bugünkü etkin değerleri (60) KENDİ anahtarlarına
-- yazılır ki sure/zaman_baskisi fiyatı değişince sessizce değişmesinler.
insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('coin_joker_elli',             '20'::jsonb,  'Skill hakkı fiyatı — 50:50, 1 hak (coin). TEST değeri.'),
  ('coin_joker_sure',             '20'::jsonb,  'Skill hakkı fiyatı — Ek Süre, 1 hak (coin). TEST değeri.'),
  ('coin_joker_soru_degistir',    '30'::jsonb,  'Skill hakkı fiyatı — Soru Değiştir, 1 hak (coin). TEST değeri.'),
  ('coin_joker_zaman_baskisi',    '30'::jsonb,  'Skill hakkı fiyatı — Zaman Baskısı, 1 hak (coin). TEST değeri.'),
  ('coin_joker_ikinci_sans',      '30'::jsonb,  'Skill hakkı fiyatı — İkinci Şans, 1 hak (coin). TEST değeri.'),
  ('coin_joker_sigorta',          '60'::jsonb,  'Skill hakkı fiyatı — Sigorta, 1 hak (coin). Eski etkin değer korundu (önce Ek Süre fiyatını ödünç alıyordu); yeni fiyat verilmedi.'),
  ('coin_joker_cifte_puan',       '60'::jsonb,  'Skill hakkı fiyatı — 2X, 1 hak (coin). Eski etkin değer korundu (önce Zaman Baskısı fiyatını ödünç alıyordu); yeni fiyat verilmedi.'),
  ('coin_joker_elli_10',          '170'::jsonb, '10''lu skill paketi fiyatı — 50:50 × 10 hak (coin). TEST değeri. Paket: joker_paketleri.skill_elli_10'),
  ('coin_joker_sure_10',          '170'::jsonb, '10''lu skill paketi fiyatı — Ek Süre × 10 hak (coin). TEST değeri. Paket: joker_paketleri.skill_sure_10'),
  ('coin_joker_soru_degistir_10', '255'::jsonb, '10''lu skill paketi fiyatı — Soru Değiştir × 10 hak (coin). TEST değeri. Paket: joker_paketleri.skill_soru_degistir_10'),
  ('coin_joker_zaman_baskisi_10', '255'::jsonb, '10''lu skill paketi fiyatı — Zaman Baskısı × 10 hak (coin). TEST değeri. Paket: joker_paketleri.skill_zaman_baskisi_10'),
  ('coin_joker_ikinci_sans_10',   '255'::jsonb, '10''lu skill paketi fiyatı — İkinci Şans × 10 hak (coin). TEST değeri. Paket: joker_paketleri.skill_ikinci_sans_10')
on conflict (anahtar) do update set deger = excluded.deger, aciklama = excluded.aciklama;

-- ---------------------------------------------------------------- tek fiyat
create or replace function public.joker_fiyati(p_tur text)
returns bigint language sql stable security definer set search_path to 'public'
as $$
  select case when public.skill_aktif(p_tur)
    then public.ayar_sayi('coin_joker_' || p_tur, null)
    else null end;
$$;

create or replace function public.joker_fiyatlari()
returns jsonb language sql stable security definer set search_path to 'public'
as $$
  select coalesce(jsonb_object_agg(k.tur, public.joker_fiyati(k.tur) order by k.sira), '{}'::jsonb)
    from public.skill_katalogu k where k.aktif;
$$;

-- ---------------------------------------------------------------- 10'lu paket
-- Paket fiyatı da oyun_ayarlari'nda durur: fiyat_anahtari doluysa fiyat oradan okunur,
-- coin_fiyat yalnız görüntü/geri uyum kopyasıdır (eski istemci null olmayanı listeler).
alter table public.joker_paketleri add column if not exists fiyat_anahtari text;
comment on column public.joker_paketleri.fiyat_anahtari is
  'Doluysa paketin coin fiyatı oyun_ayarlari''ndaki bu anahtardan okunur (joker_coin_ile_al). coin_fiyat yalnız görüntü kopyası.';

insert into public.joker_paketleri (urun_id, ad, aciklama, icerik, sira, aktif, coin_fiyat, fiyat_anahtari) values
  ('skill_elli_10',          '10 × 50:50',          '10 hak',  '{"elli": 10}'::jsonb,          11, true, 170, 'coin_joker_elli_10'),
  ('skill_sure_10',          '10 × Ek Süre',        '10 hak',  '{"sure": 10}'::jsonb,          12, true, 170, 'coin_joker_sure_10'),
  ('skill_soru_degistir_10', '10 × Soru Değiştir',  '10 hak',  '{"soru_degistir": 10}'::jsonb, 13, true, 255, 'coin_joker_soru_degistir_10'),
  ('skill_zaman_baskisi_10', '10 × Zaman Baskısı',  '10 hak',  '{"zaman_baskisi": 10}'::jsonb, 14, true, 255, 'coin_joker_zaman_baskisi_10'),
  ('skill_ikinci_sans_10',   '10 × İkinci Şans',    '10 hak',  '{"ikinci_sans": 10}'::jsonb,   15, true, 255, 'coin_joker_ikinci_sans_10')
on conflict (urun_id) do update set
  ad = excluded.ad, aciklama = excluded.aciklama, icerik = excluded.icerik, sira = excluded.sira,
  aktif = excluded.aktif, coin_fiyat = excluded.coin_fiyat, fiyat_anahtari = excluded.fiyat_anahtari;

create or replace function public.joker_paket_fiyati(p_urun_id text)
returns bigint language sql stable security definer set search_path to 'public'
as $$
  select case when p.fiyat_anahtari is not null
              then public.ayar_sayi(p.fiyat_anahtari, p.coin_fiyat)
              else p.coin_fiyat end
    from public.joker_paketleri p where p.urun_id = p_urun_id;
$$;
revoke all on function public.joker_paket_fiyati(text) from public, anon;
grant execute on function public.joker_paket_fiyati(text) to authenticated;

-- Paket satın alma: fiyat ayardan; kilitli skill içeren paket satılmaz (hak işe yaramaz).
create or replace function public.joker_coin_ile_al(p_urun_id text)
returns table(bakiye bigint, icerik jsonb)
language plpgsql security definer set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  v_paket public.joker_paketleri%rowtype;
  v_fiyat bigint;
  v_bakiye bigint;
  v_tip text;
  v_adet int;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('joker_coin_ile_al', 20, interval '60 seconds');

  select * into v_paket from public.joker_paketleri where urun_id = p_urun_id and aktif;
  if not found then raise exception 'Paket bulunamadı'; end if;
  v_fiyat := public.joker_paket_fiyati(p_urun_id);
  if v_fiyat is null or v_fiyat <= 0 then raise exception 'Bu paket coin ile satılmıyor'; end if;

  if exists (select 1 from jsonb_object_keys(v_paket.icerik) t
              where t <> 'seri_koruma' and not public.skill_kilidi_acik(v_me, t)) then
    raise exception 'Bu paketteki bir skill kilitli';
  end if;

  v_bakiye := public.coin_harca(v_fiyat, 'joker', p_urun_id);

  -- kaynak 'satin_alma': joker_islemleri_kaynak_check yalnız bilinen kaynakları kabul eder.
  for v_tip, v_adet in select key, (value #>> '{}')::int from jsonb_each(v_paket.icerik) loop
    perform public.joker_hareket(v_me, v_tip, v_adet, 'satin_alma', p_urun_id);
  end loop;

  return query select v_bakiye, v_paket.icerik;
end;
$$;

create or replace function public.joker_tek_al(p_tur text)
returns table(bakiye bigint, adet integer)
language plpgsql security definer set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  v_fiyat bigint;
  v_bakiye bigint;
  v_adet int;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('joker_tek_al', 20, interval '60 seconds');

  v_fiyat := public.joker_fiyati(p_tur);        -- tek kaynak
  if v_fiyat is null or v_fiyat <= 0 then raise exception 'Bu joker tek tek satılmıyor'; end if;
  if not public.skill_kilidi_acik(v_me, p_tur) then raise exception 'Bu skill kilitli'; end if;

  v_bakiye := public.coin_harca(v_fiyat, 'joker', 'tek:' || p_tur);
  v_adet := public.joker_hareket(v_me, p_tur, 1, 'satin_alma', 'tek:' || p_tur);

  return query select v_bakiye, v_adet;
end;
$$;
