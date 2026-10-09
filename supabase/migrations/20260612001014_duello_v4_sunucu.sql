-- 1014 · DÜELLO v4 — sunucu mantığı (yalnız YENİ fonksiyonlar; mevcutlara dokunmaz — bağlantı 1015).
-- Kural kararlarının hepsi burada: kontrol, seri, kategori havuzu, kart süresi + otomatik seçim, soru atama
-- (aynı zorluk), sonuç, Son Düello, kazanan. İstemci yalnız gösterir; eylemler MEVCUT RPC'lerden gelir
-- (duello_durum · duello_cevap · duello_kategori_sec · duello_saldiri_jokeri / duello_savunma_jokeri) → yeni GRANT yok,
-- bütün yeni fonksiyonlar iç fonksiyondur (public/anon/authenticated'dan geri alınır).
--
-- Fazlar (surum 4): notr (aynı soru) → sonuc → [kontrol yoksa notr | kart] · kart (7 sn) → cevap (iki farklı soru)
-- → sonuc → [seri hedefte: bitti | tur sınırı: son | kart] · son (aynı soru, jokersiz) → sonuc → [tek bilen: bitti | son].

-- ------------------------------------------------------------------ bayrak
create or replace function public.duello4_acik_mi(p_a uuid, p_b uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select case coalesce((select a.deger #>> '{}' from public.oyun_ayarlari a where a.anahtar = 'duello_v4_acik'), 'kapali')
           when 'acik' then true
           -- "test": maçtaki her GERÇEK oyuncu test listesinde (bot rakip serbest)
           when 'test' then not exists (
             select 1 from public.profiles p
              where p.id in (p_a, p_b) and not coalesce(p.is_bot, false)
                and not public.duello_v2_test_kullanicisi_mi(p.id))
           else false end;
$$;

-- ------------------------------------------------------------------ yardımcılar
-- Kart oranı: maç başında sabitlenen profil oranı (duello_oran_min_cevap altında null = "?").
create or replace function public.duello4_oran(p_profil jsonb, p_kat text)
returns integer language sql immutable as $$
  select nullif(p_profil -> 'oranlar' ->> p_kat, '')::int;
$$;

-- Bu maçta seçilebilecek kategoriler (yabancı oyunculu maçta evrensel havuzu dar olan düşer — 652).
create or replace function public.duello4_kategoriler(p_id uuid)
returns text[] language sql stable security definer set search_path to 'public' as $$
  select coalesce(array_agg(k order by k), '{}') from unnest(public.duello_kategorileri()) k
   where public.duello_kategori_kapsam_uygun(p_id, k);
$$;

-- İki kategoriden AYNI ZORLUKTA iki soru. soru_sec (ağırlıklar, görülmemiş önce, dil/kapsam) aynen kullanılır;
-- adaylardan zorluğu eşit olan en öndeki çift seçilir, eşit yoksa en yakın zorluk. Sonuç: array[a, b].
create or replace function public.duello4_soru_cifti(p_id uuid, p_kat_a text, p_kat_b text)
returns uuid[] language plpgsql security definer set search_path to 'public' as $$
declare
  d public.duellolar%rowtype;
  v_oyn uuid[];
  v_r uuid[];
  v_a uuid;
  v_b uuid;
begin
  select * into d from public.duellolar where id = p_id;
  v_oyn := array[d.oyuncu1, d.oyuncu2];
  with a as (select x.id, x.n, q.zorluk z
               from unnest(coalesce(public.soru_sec(p_kat_a, 8, v_oyn), '{}')) with ordinality x(id, n)
               join public.questions q on q.id = x.id
              where not (x.id = any(coalesce(d.kullanilan_sorular, '{}')))),
       b as (select x.id, x.n, q.zorluk z
               from unnest(coalesce(public.soru_sec(p_kat_b, 8, v_oyn), '{}')) with ordinality x(id, n)
               join public.questions q on q.id = x.id
              where not (x.id = any(coalesce(d.kullanilan_sorular, '{}'))))
  select array[a.id, b.id] into v_r
    from a cross join b
   where a.id <> b.id
   order by (a.z is not distinct from b.z) desc, abs(coalesce(a.z, 0) - coalesce(b.z, 0)), a.n + b.n
   limit 1;
  if v_r is not null then return v_r; end if;
  -- Son çare (adaylar tükendi): kategorinin herhangi bir kullanılmamış sorusu.
  v_a := public.duello_soru_bul(p_id, p_kat_a, v_oyn, d.kullanilan_sorular);
  v_b := public.duello_soru_bul(p_id, p_kat_b, v_oyn, coalesce(d.kullanilan_sorular, '{}') || v_a);
  return array[v_a, v_b];
end $$;

-- Aynı kategoriden, verilen zorluğa en yakın yeni soru (Soru Değiştir).
create or replace function public.duello4_soru_benzer(p_id uuid, p_kat text, p_zorluk int)
returns uuid language plpgsql security definer set search_path to 'public' as $$
declare d public.duellolar%rowtype; v uuid;
begin
  select * into d from public.duellolar where id = p_id;
  select x.id into v
    from unnest(coalesce(public.soru_sec(p_kat, 8, array[d.oyuncu1, d.oyuncu2]), '{}')) with ordinality x(id, n)
    join public.questions q on q.id = x.id
   where not (x.id = any(coalesce(d.kullanilan_sorular, '{}')))
   order by (q.zorluk is not distinct from p_zorluk) desc, abs(coalesce(q.zorluk, 0) - coalesce(p_zorluk, 0)), x.n
   limit 1;
  return coalesce(v, public.duello_soru_bul(p_id, p_kat, array[d.oyuncu1, d.oyuncu2], d.kullanilan_sorular));
end $$;

-- ------------------------------------------------------------------ soru açılışları
-- Nötr soru / Son Düello: iki oyuncuya AYNI soru. p_giris: ilk sorudan önceki giriş (3-2-1) payı.
create or replace function public.duello4_ortak_soru_ac(p_id uuid, p_son boolean, p_giris interval default interval '0')
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  d public.duellolar%rowtype;
  v_kat text;
  v_soru uuid;
  v_bas timestamptz := now() + coalesce(p_giris, interval '0');
  v_bitis timestamptz;
begin
  select * into d from public.duellolar where id = p_id for update;
  for v_kat in select k from unnest(public.duello4_kategoriler(p_id)) k order by random() loop
    v_soru := public.duello_soru_bul(p_id, v_kat, array[d.oyuncu1, d.oyuncu2], d.kullanilan_sorular);
    exit when v_soru is not null;
  end loop;
  if v_soru is null then
    -- Pratikte olmaz (havuz tükendi): Son Düello'da maç berabere biter, nötrde Son Düello da açılamaz → berabere.
    perform public.duello_bitir(p_id, null);
    return;
  end if;
  v_bitis := v_bas + make_interval(secs => public.ayar_sayi('duello4_cevap_sn', 15)) + public.duello2_gosterim_payi();
  update public.duellolar
     set faz = case when p_son then 'son' else 'notr' end,
         v4_son = p_son, uzatma = p_son,
         kategori = v_kat, kategori1 = v_kat, kategori2 = v_kat,
         soru_id = v_soru, soru_id1 = v_soru, soru_id2 = v_soru,
         v4_soru_no = v4_soru_no + 1,
         soru_baslangic = v_bas, bitis1 = v_bitis, bitis2 = v_bitis, faz_bitis = v_bitis,
         cevaplar = '{}'::jsonb, elli1 = null, elli2 = null, elli_kapali = null,
         zaman_baskisi = false, ek_sure = false, soru_degisti_saldiri = false, soru_degisti_savunma = false,
         v4_kartlar = null, v4_gonderilen = null, v4_secilen = null, v4_kart_oto = false,
         kullanilan_sorular = kullanilan_sorular || v_soru,
         son_hareket = now()
   where id = p_id;
end $$;

-- Kart fazı: kontrol sahibine bu dönemde kullanılmamış kategorilerden rastgele 4 kart. Kalan < 4 → havuz yeniden açılır
-- (kontrol ve seri değişmez).
create or replace function public.duello4_kart_ac(p_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  d public.duellolar%rowtype;
  v_tum text[];
  v_kalan text[];
  v_kullanilan text[];
  v_kartlar text[];
  v_n int;
begin
  select * into d from public.duellolar where id = p_id for update;
  v_n := greatest(2, coalesce(d.v4_kart_sayisi, 4));
  v_tum := public.duello4_kategoriler(p_id);
  if coalesce(array_length(v_tum, 1), 0) < 2 then v_tum := public.duello_kategorileri(); end if;
  v_kullanilan := coalesce(d.v4_kullanilan, '{}');
  select coalesce(array_agg(k), '{}') into v_kalan from unnest(v_tum) k where not (k = any(v_kullanilan));
  if coalesce(array_length(v_kalan, 1), 0) < least(v_n, coalesce(array_length(v_tum, 1), 0)) then
    v_kullanilan := '{}';
    v_kalan := v_tum;
  end if;
  select array_agg(k) into v_kartlar from (select k from unnest(v_kalan) k order by random() limit v_n) s;
  update public.duellolar
     set faz = 'kart', saldiran = d.v4_kontrol,
         v4_tur = v4_tur + 1, v4_kullanilan = v_kullanilan,
         v4_kartlar = v_kartlar, v4_gonderilen = null, v4_secilen = null, v4_kart_oto = false,
         faz_bitis = now() + make_interval(secs => public.ayar_sayi('duello4_kart_sn', 7)) + public.duello2_gosterim_payi(),
         cevaplar = '{}'::jsonb, son_hareket = now()
   where id = p_id;
end $$;

-- Saldırı sorusu: kontrol sahibine kendi seçtiği, rakibe gönderilen kategoriden; aynı zorlukta iki farklı soru.
create or replace function public.duello4_soru_ac(p_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  d public.duellolar%rowtype;
  v_k uuid;            -- kontrol sahibi
  v_cift uuid[];
  v_kat1 text;
  v_kat2 text;
  v_s1 uuid;
  v_s2 uuid;
  v_bitis timestamptz;
begin
  select * into d from public.duellolar where id = p_id for update;
  v_k := d.v4_kontrol;
  v_cift := public.duello4_soru_cifti(p_id, d.v4_secilen, d.v4_gonderilen);   -- [kontrol, rakip]
  if v_k = d.oyuncu1 then
    v_kat1 := d.v4_secilen; v_kat2 := d.v4_gonderilen; v_s1 := v_cift[1]; v_s2 := v_cift[2];
  else
    v_kat1 := d.v4_gonderilen; v_kat2 := d.v4_secilen; v_s1 := v_cift[2]; v_s2 := v_cift[1];
  end if;
  if v_s1 is null or v_s2 is null then
    -- Kategori(ler)de soru kalmadı (pratikte olmaz): maç takılmasın, tur nötr soruyla oynanır.
    perform public.duello4_ortak_soru_ac(p_id, false);
    update public.duellolar set faz = 'cevap' where id = p_id;
    return;
  end if;
  v_bitis := now() + make_interval(secs => public.ayar_sayi('duello4_cevap_sn', 15)) + public.duello2_gosterim_payi();
  update public.duellolar
     set faz = 'cevap',
         kategori = case when v_k = d.oyuncu1 then v_kat1 else v_kat2 end,
         soru_id = case when v_k = d.oyuncu1 then v_s1 else v_s2 end,
         kategori1 = v_kat1, kategori2 = v_kat2, soru_id1 = v_s1, soru_id2 = v_s2,
         v4_kullanilan = (select coalesce(array_agg(distinct k), '{}') from unnest(v4_kullanilan || array[d.v4_gonderilen, d.v4_secilen]) k),
         v4_soru_no = v4_soru_no + 1,
         soru_baslangic = now(), bitis1 = v_bitis, bitis2 = v_bitis, faz_bitis = v_bitis,
         cevaplar = '{}'::jsonb, elli1 = null, elli2 = null, elli_kapali = null,
         zaman_baskisi = false, ek_sure = false, soru_degisti_saldiri = false, soru_degisti_savunma = false,
         kullanilan_sorular = kullanilan_sorular || v_s1 || v_s2,
         son_hareket = now()
   where id = p_id;
end $$;

-- Kart seçimini uygular (insan, bot ve süre dolumu aynı yoldan). p_gonder/p_sec null olabilir (adım adım).
create or replace function public.duello4_kart_uygula(p_id uuid, p_gonder text, p_sec text, p_oto boolean)
returns void language plpgsql security definer set search_path to 'public' as $$
declare d public.duellolar%rowtype;
begin
  select * into d from public.duellolar where id = p_id for update;
  if d.faz <> 'kart' then return; end if;
  if p_gonder is not null and d.v4_gonderilen is null then
    if not (p_gonder = any(d.v4_kartlar)) then raise exception 'Bu kategori şu an seçilemez'; end if;
    update public.duellolar set v4_gonderilen = p_gonder, v4_kart_oto = v4_kart_oto or p_oto, son_hareket = now() where id = p_id;
    d.v4_gonderilen := p_gonder;
  end if;
  if p_sec is not null and d.v4_gonderilen is not null and d.v4_secilen is null then
    if not (p_sec = any(d.v4_kartlar)) or p_sec = d.v4_gonderilen then raise exception 'Bu kategori şu an seçilemez'; end if;
    update public.duellolar set v4_secilen = p_sec, v4_kart_oto = v4_kart_oto or p_oto, son_hareket = now() where id = p_id;
    perform public.duello4_soru_ac(p_id);
  end if;
end $$;

-- Süre doldu: sunucu eksik seçimleri rastgele, iki FARKLI kart olarak tamamlar.
create or replace function public.duello4_kart_oto(p_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare d public.duellolar%rowtype; v_g text; v_s text;
begin
  select * into d from public.duellolar where id = p_id for update;
  if d.faz <> 'kart' then return; end if;
  v_g := coalesce(d.v4_gonderilen, (select k from unnest(d.v4_kartlar) k order by random() limit 1));
  v_s := (select k from unnest(d.v4_kartlar) k where k <> v_g order by random() limit 1);
  perform public.duello4_kart_uygula(p_id, v_g, v_s, true);
end $$;

-- ------------------------------------------------------------------ çözüm
create or replace function public.duello4_cozumle(p_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  d public.duellolar%rowtype;
  v_dc1 smallint; v_dc2 smallint;
  v_c1 smallint; v_c2 smallint;
  v_d1 boolean; v_d2 boolean;
  v_tip text;
  v_k uuid;            -- kontrol önce
  v_r uuid;            -- rakip (kontrol sahibi değil)
  v_dk boolean; v_dr boolean;
  v_kontrol uuid;
  v_seri int;
  v_notr int;
  v_kullanilan text[];
  v_sonuc text;
  v_kazanan uuid;
  v_detay jsonb;
  v_o uuid; v_kat text; v_q uuid; v_c smallint; v_dc smallint;
begin
  select * into d from public.duellolar where id = p_id for update;
  if not found or d.durum <> 'aktif' or d.faz not in ('notr', 'cevap', 'son') then return; end if;

  select dogru_cevap into v_dc1 from public.questions where id = d.soru_id1;
  select dogru_cevap into v_dc2 from public.questions where id = d.soru_id2;
  v_c1 := (d.cevaplar -> d.oyuncu1::text ->> 'cevap')::smallint;
  v_c2 := (d.cevaplar -> d.oyuncu2::text ->> 'cevap')::smallint;
  v_d1 := v_c1 is not null and v_c1 = v_dc1;    -- süre dolması yanlış sayılır
  v_d2 := v_c2 is not null and v_c2 = v_dc2;

  v_tip := case d.faz when 'notr' then 'notr' when 'son' then 'son' else 'saldiri' end;
  v_k := d.v4_kontrol;
  v_kontrol := d.v4_kontrol; v_seri := d.v4_seri; v_notr := d.v4_notr_seri; v_kullanilan := d.v4_kullanilan;

  if v_tip = 'notr' then
    if v_d1 <> v_d2 then
      v_kontrol := case when v_d1 then d.oyuncu1 else d.oyuncu2 end;
      v_seri := 0; v_notr := 0; v_kullanilan := '{}'; v_sonuc := 'kontrol_aldi';
    else
      v_notr := v_notr + 1; v_sonuc := case when v_d1 then 'ikisi_dogru' else 'ikisi_yanlis' end;
    end if;
  elsif v_tip = 'son' then
    if v_d1 <> v_d2 then
      v_kazanan := case when v_d1 then d.oyuncu1 else d.oyuncu2 end; v_sonuc := 'son_kazandi';
    else
      v_sonuc := case when v_d1 then 'ikisi_dogru' else 'ikisi_yanlis' end;
    end if;
  else
    v_r := case when v_k = d.oyuncu1 then d.oyuncu2 else d.oyuncu1 end;
    v_dk := case when v_k = d.oyuncu1 then v_d1 else v_d2 end;
    v_dr := case when v_r = d.oyuncu1 then v_d1 else v_d2 end;
    if v_dk and not v_dr then
      v_seri := v_seri + 1; v_sonuc := 'basarili';
    elsif v_dr and not v_dk then
      v_kontrol := v_r; v_seri := 1; v_kullanilan := '{}'; v_sonuc := 'el_degisti';
    else
      v_sonuc := case when v_dk then 'ikisi_dogru' else 'ikisi_yanlis' end;
    end if;
  end if;

  v_detay := jsonb_build_object(
    'surum', 4, 'tip', v_tip, 'no', d.v4_soru_no, 'tur', d.v4_tur, 'sonuc', v_sonuc, 'kazanan', v_kazanan,
    'kontrol_once', v_k, 'kontrol_sonra', v_kontrol, 'seri_once', d.v4_seri, 'seri_sonra', v_seri,
    'seri_hedef', d.v4_seri_hedef, 'notr_seri', v_notr,
    'gonderilen', d.v4_gonderilen, 'secilen', d.v4_secilen, 'oto', d.v4_kart_oto,
    'oyuncular', jsonb_build_object(
      d.oyuncu1::text, jsonb_build_object('soru_id', d.soru_id1, 'kategori', d.kategori1, 'cevap', v_c1, 'dogru', v_d1,
                                          'yanitsiz', v_c1 is null, 'dogru_cevap', v_dc1),
      d.oyuncu2::text, jsonb_build_object('soru_id', d.soru_id2, 'kategori', d.kategori2, 'cevap', v_c2, 'dogru', v_d2,
                                          'yanitsiz', v_c2 is null, 'dogru_cevap', v_dc2)));

  update public.duellolar
     set v4_kontrol = v_kontrol, v4_seri = v_seri, v4_notr_seri = v_notr, v4_kullanilan = v_kullanilan,
         saldiran = coalesce(v_kontrol, oyuncu1),
         dogru1 = dogru1 + case when v_d1 then 1 else 0 end,
         dogru2 = dogru2 + case when v_d2 then 1 else 0 end,
         faz = 'sonuc',
         faz_bitis = now() + make_interval(secs => public.ayar_sayi('duello4_sonuc_sn', 3)),
         son_hamle = v_detay,
         son_hareket = now()
   where id = p_id;

  -- Geçmiş: kontrol sahibi "saldıran" kolonlarında, rakip "savunan" kolonlarında; iki sorunun ayrıntısı v4'te.
  -- Puan kolonları boş → eski rozet ölçütleri (Son Nefes / Büyük Geri Dönüş) bu maçları saymaz.
  insert into public.duello_hamleler (duello_id, tur, saldiran, savunan, kategori, soru_id, cevap, dogru,
                                      riskli, can_kaybeden, zaman_baskisi, savunma_kilidi,
                                      surum, uzatma, cevap_saldiran, dogru_saldiran,
                                      yanitsiz_saldiran, yanitsiz_savunan, altin_kazanan, v4)
  select p_id, d.v4_tur, s.k, s.r,
         case when s.k = d.oyuncu1 then d.kategori1 else d.kategori2 end,
         case when s.k = d.oyuncu1 then d.soru_id1 else d.soru_id2 end,
         case when s.k = d.oyuncu1 then v_c2 else v_c1 end,
         case when s.k = d.oyuncu1 then v_d2 else v_d1 end,
         false, null, d.zaman_baskisi, false, 4, v_tip = 'son',
         case when s.k = d.oyuncu1 then v_c1 else v_c2 end,
         case when s.k = d.oyuncu1 then v_d1 else v_d2 end,
         (case when s.k = d.oyuncu1 then v_c1 else v_c2 end) is null,
         (case when s.k = d.oyuncu1 then v_c2 else v_c1 end) is null,
         v_kazanan, v_detay
    from (select coalesce(v_k, d.oyuncu1) k,
                 case when coalesce(v_k, d.oyuncu1) = d.oyuncu1 then d.oyuncu2 else d.oyuncu1 end r) s;

  -- Kategori ustalığı, istatistik ve soru sayacı: her oyuncu KENDİ sorusu/kategorisiyle.
  foreach v_o in array array[d.oyuncu1, d.oyuncu2] loop
    v_kat := case when v_o = d.oyuncu1 then d.kategori1 else d.kategori2 end;
    v_q := case when v_o = d.oyuncu1 then d.soru_id1 else d.soru_id2 end;
    v_c := case when v_o = d.oyuncu1 then v_c1 else v_c2 end;
    v_dc := case when v_o = d.oyuncu1 then v_dc1 else v_dc2 end;
    perform public.kategori_istatistik_yaz(v_o, v_kat, v_c is not null and v_c = v_dc);
    if v_c is not null and v_c = v_dc then perform public.kategori_dogru_arttir(v_o, v_kat); end if;
    if v_c is not null then perform public.soru_sayac(v_q, v_c = v_dc); end if;
  end loop;

  delete from public.skill_ikinci_sans_denemeleri
   where mac_tur = 'duello' and mac_id = p_id and soru_index = d.v4_soru_no;
end $$;

-- Sonuç fazından sonra: kazanan / Son Düello / yeni nötr / yeni kart turu.
create or replace function public.duello4_sonraki(p_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare d public.duellolar%rowtype;
begin
  select * into d from public.duellolar where id = p_id for update;
  if not found or d.durum <> 'aktif' or d.faz <> 'sonuc' then return; end if;
  if d.son_hamle ->> 'sonuc' = 'son_kazandi' then
    perform public.duello_bitir(p_id, (d.son_hamle ->> 'kazanan')::uuid);
  elsif d.v4_kontrol is not null and d.v4_seri >= coalesce(d.v4_seri_hedef, 3) then
    perform public.duello_bitir(p_id, d.v4_kontrol);
  elsif d.v4_son then
    perform public.duello4_ortak_soru_ac(p_id, true);                  -- tek bilen çıkana kadar
  elsif d.v4_kontrol is null then
    if d.v4_notr_seri >= coalesce(d.v4_notr_max, 5) then
      perform public.duello4_ortak_soru_ac(p_id, true);                -- art arda 5 nötr → Son Düello
    else
      perform public.duello4_ortak_soru_ac(p_id, false);
    end if;
  elsif d.v4_tur >= coalesce(d.v4_max_tur, 15) then
    perform public.duello4_ortak_soru_ac(p_id, true);                  -- 15 saldırı turu bitti → Son Düello
  else
    perform public.duello4_kart_ac(p_id);
  end if;
end $$;

-- ------------------------------------------------------------------ ilerletme (kopukluk kapısı 2. sürümle aynı)
create or replace function public.duello4_ilerlet(p_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  d public.duellolar%rowtype;
  v_adim int := 0;
  v_kopuk uuid;
  v_kapanis interval := greatest(make_interval(secs => public.ayar_sayi('duello2_cevap_tolerans_sn', 1)),
                                 make_interval(secs => public.ayar_ondalik('cevap_gec_varis_sn', 5)::double precision));
  v_secim_pay interval := make_interval(secs => public.ayar_ondalik('secim_gec_varis_sn', 3)::double precision);
  v_taban interval := make_interval(secs => public.ayar_sayi('duello_kopuk_taban_sn', 3));
begin
  select * into d from public.duellolar where id = p_id for update;
  if not found or d.durum <> 'aktif' or d.surum <> 4 then return; end if;

  -- ---------- KOPUKLUK KAPISI (duello2_ilerlet ile aynı) ----------
  v_kopuk := public.duello_kopuk_kim(p_id);
  if v_kopuk is not null then
    if d.kopuk_at is null then
      update public.duellolar
         set kopuk_at = now(),
             kopuk_kalan = greatest(coalesce(d.faz_bitis, now()) - now(), v_taban),
             kopuk_kalan1 = case when d.bitis1 is not null then greatest(d.bitis1 - now(), v_taban) end,
             kopuk_kalan2 = case when d.bitis2 is not null then greatest(d.bitis2 - now(), v_taban) end
       where id = p_id;
      perform public.duello_sinyal_ver(p_id);
      select * into d from public.duellolar where id = p_id;
    end if;
    if d.kopuk_at < now() - make_interval(secs => public.ayar_sayi('duello_kopuk_bekleme_sn', 45)) then
      perform public.duello_bitir(p_id, case when v_kopuk = d.oyuncu1 then d.oyuncu2 else d.oyuncu1 end);
      perform public.duello_sinyal_ver(p_id);
      return;
    end if;
    update public.duellolar
       set faz_bitis = now() + greatest(coalesce(d.kopuk_kalan, v_taban), v_taban),
           bitis1 = case when d.kopuk_kalan1 is not null then now() + greatest(d.kopuk_kalan1, v_taban) else bitis1 end,
           bitis2 = case when d.kopuk_kalan2 is not null then now() + greatest(d.kopuk_kalan2, v_taban) else bitis2 end
     where id = p_id;
    return;
  end if;
  if d.kopuk_at is not null then
    update public.duellolar
       set kopuk_at = null, kopuk_kalan = null, kopuk_kalan1 = null, kopuk_kalan2 = null,
           faz_bitis = now() + greatest(coalesce(d.kopuk_kalan, v_taban), v_taban),
           bitis1 = case when d.kopuk_kalan1 is not null then now() + greatest(d.kopuk_kalan1, v_taban) else bitis1 end,
           bitis2 = case when d.kopuk_kalan2 is not null then now() + greatest(d.kopuk_kalan2, v_taban) else bitis2 end,
           son_hareket = now()
     where id = p_id;
    perform public.duello_sinyal_ver(p_id);
  end if;
  -- ---------- /KOPUKLUK KAPISI ----------

  loop
    v_adim := v_adim + 1;
    exit when v_adim > 12;
    select * into d from public.duellolar where id = p_id;
    exit when not found or d.durum <> 'aktif';

    if d.son_hareket < now() - make_interval(mins => public.ayar_sayi('duello_zaman_asimi_dk', 60)::int) then
      update public.duellolar set durum = 'iptal', bitis = now() where id = p_id;
      perform public.duello_sinyal_ver(p_id);
      exit;
    end if;

    if d.faz in ('notr', 'cevap', 'son') then
      -- Her oyuncu ya cevapladı ya da kişisel süresi (+ geç varış payı) doldu → çözümle.
      exit when not ((d.cevaplar ? d.oyuncu1::text) or now() > d.bitis1 + v_kapanis)
             or not ((d.cevaplar ? d.oyuncu2::text) or now() > d.bitis2 + v_kapanis);
      perform public.duello4_cozumle(p_id);
    elsif d.faz = 'kart' then
      exit when now() < d.faz_bitis + v_secim_pay;
      perform public.duello4_kart_oto(p_id);
    elsif d.faz = 'sonuc' then
      exit when now() < d.faz_bitis;
      perform public.duello4_sonraki(p_id);
    else
      exit;
    end if;
    perform public.duello_sinyal_ver(p_id);
  end loop;
end $$;

-- ------------------------------------------------------------------ maç başlangıcı (duello_olustur çağırır)
create or replace function public.duello4_baslat(p_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  update public.duellolar
     set surum = 4, hakimiyet = false, secim_modu = false, puan_modu = false, ban_acik = false,
         faz = 'notr', saldiran = oyuncu1, ilk_secen = null, tur = 0, max_tur = null,
         v4_kontrol = null, v4_seri = 0, v4_tur = 0, v4_notr_seri = 0, v4_kullanilan = '{}',
         v4_max_tur = greatest(1, public.ayar_sayi('duello4_max_tur', 15))::smallint,
         v4_seri_hedef = greatest(1, public.ayar_sayi('duello4_seri_hedef', 3))::smallint,
         v4_notr_max = greatest(1, public.ayar_sayi('duello4_notr_max', 5))::smallint,
         v4_kart_sayisi = greatest(2, public.ayar_sayi('duello4_kart_sayisi', 4))::smallint
   where id = p_id;
  perform public.duello4_ortak_soru_ac(p_id, false, make_interval(secs => public.ayar_sayi('duello4_giris_sn', 3)));
end $$;

-- ------------------------------------------------------------------ eylemler (MEVCUT RPC'lerden çağrılır)
-- Cevap: oyuncu KENDİ sorusunu cevaplar (nötr/Son Düello'da ikisinin sorusu aynı). İkinci Şans 2. sürümle aynı.
create or replace function public.duello4_cevap(p_id uuid, p_cevap smallint)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  d public.duellolar%rowtype;
  v_me uuid := auth.uid();
  v_bitis timestamptz;
  v_soru uuid;
  v_dogru boolean;
  v_index int;
  v_ilk smallint;
  v_ikinci boolean;
begin
  perform public.hiz_siniri('duello_eylem', 90, interval '60 seconds');
  if p_cevap is null or p_cevap not between 0 and 3 then raise exception 'Geçersiz cevap'; end if;
  d := public.duello_kilitle(p_id);
  if d.durum <> 'aktif' then raise exception 'Düello bitti'; end if;
  if d.faz not in ('notr', 'cevap', 'son') then raise exception 'Şu an cevap verilemez'; end if;
  if d.cevaplar ? v_me::text then raise exception 'Bu soruyu zaten cevapladın'; end if;
  if now() < d.soru_baslangic then raise exception 'Şu an cevap verilemez'; end if;
  v_bitis := case when v_me = d.oyuncu1 then d.bitis1 else d.bitis2 end;
  if not public.cevap_gec_kabul(v_bitis, make_interval(secs => public.ayar_sayi('duello2_cevap_tolerans_sn', 1)), public.ayar_ondalik('cevap_gec_varis_sn', 5)) then
    raise exception 'Süre doldu';
  end if;
  v_soru := case when v_me = d.oyuncu1 then d.soru_id1 else d.soru_id2 end;
  v_index := d.v4_soru_no;
  v_dogru := p_cevap = (select dogru_cevap from public.questions where id = v_soru);

  v_ikinci := exists (select 1 from public.joker_kullanimlari k where k.mac_tur = 'duello' and k.mac_id = p_id
                        and k.user_id = v_me and k.soru_index = v_index and k.tur = 'ikinci_sans');
  select s.ilk_cevap into v_ilk from public.skill_ikinci_sans_denemeleri s
   where s.mac_tur = 'duello' and s.mac_id = p_id and s.user_id = v_me and s.soru_index = v_index for update;
  if v_ikinci and not v_dogru and v_ilk is null then
    insert into public.skill_ikinci_sans_denemeleri (mac_tur, mac_id, user_id, soru_index, ilk_cevap)
    values ('duello', p_id, v_me, v_index, p_cevap);
    perform public.duello_sinyal_ver(p_id);
    return jsonb_build_object('tekrar_hakki', true, 'ilk_yanlis_cevap', p_cevap);
  end if;
  if v_ilk is not null and p_cevap = v_ilk then raise exception 'Başka bir cevap seç'; end if;

  update public.duellolar
     set cevaplar = cevaplar || jsonb_build_object(v_me::text, jsonb_build_object('cevap', p_cevap, 'at', least(now(), v_bitis))),
         son_hareket = now()
   where id = p_id;
  perform public.gorulen_kaydet(v_soru);
  if not v_dogru then perform public.yanlis_kaydet(v_soru); end if;
  perform public.duello4_ilerlet(p_id);
  perform public.duello_sinyal_ver(p_id);
  return jsonb_build_object('tekrar_hakki', false, 'cevaplandi', true);
end $$;

-- Kart seçimi (duello_kategori_sec çağırır): ilk dokunuş RAKİBE GÖNDER, ikinci dokunuş KENDİNE SEÇ. Sıra sunucuda.
create or replace function public.duello4_kart(p_id uuid, p_kategori text)
returns void language plpgsql security definer set search_path to 'public' as $$
declare d public.duellolar%rowtype;
begin
  perform public.hiz_siniri('duello_eylem', 90, interval '60 seconds');
  d := public.duello_kilitle(p_id);
  if d.durum <> 'aktif' then raise exception 'Düello bitti'; end if;
  if d.faz <> 'kart' or d.v4_kontrol is distinct from auth.uid() then raise exception 'Şu an kategori seçme sırası sende değil'; end if;
  if not public.cevap_gec_kabul(d.faz_bitis, interval '0 seconds', public.ayar_ondalik('secim_gec_varis_sn', 3)) then
    raise exception 'Bu kategori şu an seçilemez';
  end if;
  if p_kategori is null or not (p_kategori = any(d.v4_kartlar)) then raise exception 'Bu kategori şu an seçilemez'; end if;
  if p_kategori is not distinct from d.v4_gonderilen then raise exception 'Bu kategoriyi rakibe gönderdin'; end if;
  if d.v4_gonderilen is null then
    perform public.duello4_kart_uygula(p_id, p_kategori, null, false);
  else
    perform public.duello4_kart_uygula(p_id, null, p_kategori, false);
  end if;
  perform public.duello_sinyal_ver(p_id);
end $$;

-- Joker sınırları (2. sürümün sayıları: maçta 4 · aynı joker 2 · soruda 1). Son Düello jokersiz; Baskın/Kalkan yok.
create or replace function public.duello4_izinli_skiller()
returns text[] language sql immutable as $$ select array['elli','sure','soru_degistir','zaman_baskisi','ikinci_sans']::text[] $$;

create or replace function public.duello4_joker_hak_kontrol(p_id uuid, p_user uuid, p_tur text)
returns void language plpgsql security definer set search_path to 'public' as $$
declare d public.duellolar%rowtype; v_toplam int; v_tur int; v_soru int;
begin
  select * into d from public.duellolar where id = p_id;
  if not (p_tur = any(public.duello4_izinli_skiller())) then raise exception 'Bu joker bu maçta kullanılamaz'; end if;
  if d.v4_son or d.faz = 'son' then raise exception 'Son Düello''da joker kullanılamaz'; end if;
  select count(*), count(*) filter (where k.tur = p_tur), count(*) filter (where k.soru_index = d.v4_soru_no)
    into v_toplam, v_tur, v_soru
    from public.joker_kullanimlari k where k.user_id = p_user and k.mac_tur = 'duello' and k.mac_id = p_id;
  if v_toplam >= public.ayar_sayi('duello2_skill_toplam_hak', 4) then
    raise exception 'Bu maçta en fazla % skill kullanabilirsin', public.ayar_sayi('duello2_skill_toplam_hak', 4);
  end if;
  if v_tur >= public.ayar_sayi('duello2_skill_tur_basi_hak', 2) then raise exception 'Bu skill için maç hakkın doldu'; end if;
  if v_soru >= public.ayar_sayi('duello2_skill_soru_basi_hak', 1) then raise exception 'Bu soruda skill hakkını kullandın'; end if;
end $$;

-- Joker (duello_saldiri_jokeri / duello_savunma_jokeri çağırır). Etkiler oyuncunun KENDİ sorusuna/süresine:
-- 50:50 kendi sorusu · Ek Süre kendi süresi · Zaman Baskısı rakibin süresi · İkinci Şans cevapta ·
-- Soru Değiştir: nötrde (ortak soru) ikisinin sorusu birlikte değişir; saldırıda yalnız kendi sorusu, aynı kategori + aynı zorluk.
create or replace function public.duello4_joker(p_id uuid, p_tur text)
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  d public.duellolar%rowtype;
  v_me uuid := auth.uid();
  v_ben1 boolean;
  v_rakip uuid;
  v_idx int;
  v_ucretsiz boolean;
  v_soru uuid;
  v_kat text;
  v_dogru smallint;
  v_kapali int[];
  v_yeni_soru uuid;
  v_yeni timestamptz;
  v_bitis timestamptz;
begin
  perform public.hiz_siniri('duello_eylem', 90, interval '60 seconds');
  d := public.duello_kilitle(p_id);
  if d.durum <> 'aktif' or d.faz not in ('notr', 'cevap', 'son') then raise exception 'Skill yalnız soru açıkken kullanılır'; end if;
  v_ben1 := d.oyuncu1 = v_me;
  v_rakip := case when v_ben1 then d.oyuncu2 else d.oyuncu1 end;
  v_idx := d.v4_soru_no;
  v_bitis := case when v_ben1 then d.bitis1 else d.bitis2 end;
  v_soru := case when v_ben1 then d.soru_id1 else d.soru_id2 end;
  v_kat := case when v_ben1 then d.kategori1 else d.kategori2 end;
  if d.cevaplar ? v_me::text then raise exception 'Bu soruyu zaten cevapladın'; end if;
  if now() > v_bitis then raise exception 'Süre doldu'; end if;
  if p_tur = 'zaman_baskisi' and d.cevaplar ? v_rakip::text then raise exception 'Rakibin bu soruyu zaten cevapladı'; end if;
  if p_tur = 'soru_degistir' then
    if exists (select 1 from public.skill_ikinci_sans_denemeleri s
                where s.mac_tur = 'duello' and s.mac_id = p_id and s.soru_index = v_idx and s.user_id = v_me) then
      raise exception 'Cevap verildikten sonra soru değiştirilemez';
    end if;
    if d.faz = 'notr' then
      -- Ortak soru: rakip cevapladıysa ya da bu soruda joker kullandıysa değişmez (2. sürüm kuralı).
      if d.cevaplar <> '{}'::jsonb or exists (select 1 from public.skill_ikinci_sans_denemeleri s
           where s.mac_tur = 'duello' and s.mac_id = p_id and s.soru_index = v_idx) then
        raise exception 'Cevap verildikten sonra soru değiştirilemez';
      end if;
      if exists (select 1 from public.joker_kullanimlari k where k.mac_tur = 'duello' and k.mac_id = p_id
                   and k.user_id = v_rakip and k.soru_index = v_idx) then
        raise exception 'Rakibin bu soruda skill kullandı, soru değiştirilemez';
      end if;
    end if;
    v_yeni_soru := public.duello4_soru_benzer(p_id, v_kat, (select q.zorluk from public.questions q where q.id = v_soru));
    if v_yeni_soru is null then raise exception 'Bu kategoride başka soru kalmadı'; end if;
  end if;

  perform public.duello4_joker_hak_kontrol(p_id, v_me, p_tur);
  v_ucretsiz := public.jokerler_serbest();
  if not v_ucretsiz then
    perform public.joker_hareket(v_me, p_tur, -1, 'kullanim', 'duello:' || p_id::text);
  end if;
  insert into public.joker_kullanimlari (user_id, mac_tur, mac_id, soru_index, tur, ucretsiz)
  values (v_me, 'duello', p_id, v_idx, p_tur, v_ucretsiz);

  if p_tur = 'elli' then
    select dogru_cevap into v_dogru from public.questions where id = v_soru;
    select array_agg(x) into v_kapali
      from (select x from generate_series(0, 3) x where x <> v_dogru order by random() limit 2) s;
    update public.duellolar
       set elli1 = case when v_ben1 then v_kapali else elli1 end,
           elli2 = case when v_ben1 then elli2 else v_kapali end, son_hareket = now()
     where id = p_id;
  elsif p_tur = 'sure' then
    update public.duellolar
       set bitis1 = case when v_ben1 then bitis1 + make_interval(secs => public.ayar_sayi('duello_ek_sure_sn', 5)) else bitis1 end,
           bitis2 = case when v_ben1 then bitis2 else bitis2 + make_interval(secs => public.ayar_sayi('duello_ek_sure_sn', 5)) end,
           ek_sure = true, son_hareket = now()
     where id = p_id;
  elsif p_tur = 'zaman_baskisi' then
    v_yeni := greatest(
      (case when v_ben1 then d.bitis2 else d.bitis1 end) - make_interval(secs => public.ayar_sayi('duello2_zaman_baskisi_eksi_sn', 5)),
      now() + make_interval(secs => public.ayar_sayi('duello2_zaman_baskisi_taban_sn', 3)));
    update public.duellolar
       set bitis1 = case when v_ben1 then bitis1 else least(bitis1, v_yeni) end,
           bitis2 = case when v_ben1 then least(bitis2, v_yeni) else bitis2 end,
           zaman_baskisi = true, son_hareket = now()
     where id = p_id;
  elsif p_tur = 'soru_degistir' then
    v_yeni := now() + make_interval(secs => public.ayar_sayi('duello4_cevap_sn', 15)) + public.duello2_gosterim_payi();
    if d.faz = 'notr' then
      update public.duellolar
         set soru_id = v_yeni_soru, soru_id1 = v_yeni_soru, soru_id2 = v_yeni_soru,
             kullanilan_sorular = kullanilan_sorular || v_yeni_soru,
             soru_baslangic = now(), bitis1 = v_yeni, bitis2 = v_yeni, elli1 = null, elli2 = null,
             cevaplar = '{}'::jsonb, son_hareket = now()
       where id = p_id;
    else
      update public.duellolar
         set soru_id1 = case when v_ben1 then v_yeni_soru else soru_id1 end,
             soru_id2 = case when v_ben1 then soru_id2 else v_yeni_soru end,
             soru_id = case when v_me = v4_kontrol then v_yeni_soru else soru_id end,
             kullanilan_sorular = kullanilan_sorular || v_yeni_soru,
             bitis1 = case when v_ben1 then v_yeni else bitis1 end,
             bitis2 = case when v_ben1 then bitis2 else v_yeni end,
             elli1 = case when v_ben1 then null else elli1 end,
             elli2 = case when v_ben1 then elli2 else null end,
             soru_degisti_saldiri = soru_degisti_saldiri or v_me = v4_kontrol,
             soru_degisti_savunma = soru_degisti_savunma or v_me <> v4_kontrol,
             son_hareket = now()
       where id = p_id;
    end if;
  else   -- ikinci_sans: etkisi cevapta
    update public.duellolar set son_hareket = now() where id = p_id;
  end if;

  update public.duellolar set faz_bitis = greatest(bitis1, bitis2) where id = p_id;
  perform public.duello_sinyal_ver(p_id);
end $$;

-- ------------------------------------------------------------------ durum (duello_durum çağırır)
create or replace function public.duello4_durum(p_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  d public.duellolar%rowtype;
  v_me uuid := auth.uid();
  v_ben1 boolean;
  v_rakip uuid;
  v_dil text := public.oyuncu_dili();
  v_benim_profil jsonb;
  v_rakip_profil jsonb;
  v_soru jsonb;
  v_soru_id uuid;
  v_soru_acik boolean;
  v_kart jsonb;
  v_arkadas boolean;
  v_ezeli jsonb;
  v_odul jsonb;
  v_gecmis jsonb;
  v_benim jsonb;
  v_bu_soruda int;
  v_rakip_soruda boolean;
  v_ilk smallint;
  v_kilit text;
  v_varsayilan int := public.ayar_sayi('duello4_oran_varsayilan', 50);
begin
  perform public.hiz_siniri('duello_durum', 400, interval '60 seconds');
  d := public.duello_kilitle(p_id);
  v_ben1 := d.oyuncu1 = v_me;
  v_rakip := case when v_ben1 then d.oyuncu2 else d.oyuncu1 end;
  v_benim_profil := case when v_ben1 then d.profil1 else d.profil2 end;
  v_rakip_profil := case when v_ben1 then d.profil2 else d.profil1 end;

  -- Soru metni yalnız giriş bittikten sonra ve soru/sonuç fazında (kart fazında yok).
  v_soru_id := case when v_ben1 then d.soru_id1 else d.soru_id2 end;
  v_soru_acik := v_soru_id is not null
    and ((d.faz in ('notr', 'cevap', 'son') and now() >= d.soru_baslangic) or d.faz = 'sonuc' or d.durum <> 'aktif');
  if v_soru_acik then
    select jsonb_build_object('soru', sd.soru, 'secenekler', sd.secenekler, 'kategori', sd.kategori)
      into v_soru from public.soru_dilinde(v_soru_id, v_dil) sd;
  end if;

  -- Kartlar: oranlar izleyenin bakışıyla (ben / rakip). null = yeterli veri yok ("?"). Rakibe gönderilen kart,
  -- seçim bitene kadar bekleyen oyuncuya gizli (adim: kaç seçim yapıldı).
  if d.faz = 'kart' and d.v4_kartlar is not null then
    v_kart := jsonb_build_object(
      'kartlar', (select coalesce(jsonb_agg(jsonb_build_object(
                    'k', k, 'ben', public.duello4_oran(v_benim_profil, k), 'rakip', public.duello4_oran(v_rakip_profil, k)) order by n), '[]'::jsonb)
                    from unnest(d.v4_kartlar) with ordinality x(k, n)),
      'adim', (case when d.v4_gonderilen is not null then 1 else 0 end) + (case when d.v4_secilen is not null then 1 else 0 end),
      'gonderilen', case when v_me = d.v4_kontrol then d.v4_gonderilen end,
      'secilen', case when v_me = d.v4_kontrol then d.v4_secilen end,
      'varsayilan', v_varsayilan);
  end if;

  v_arkadas := exists (select 1 from public.friendships f where f.durum = 'arkadas'
     and ((f.requester = v_me and f.addressee = v_rakip) or (f.requester = v_rakip and f.addressee = v_me)));
  if v_arkadas then
    select jsonb_build_object('ben', count(*) filter (where x.kazanan = v_me), 'rakip', count(*) filter (where x.kazanan = v_rakip))
      into v_ezeli from public.duellolar x
     where x.durum = 'bitti'
       and ((x.oyuncu1 = v_me and x.oyuncu2 = v_rakip) or (x.oyuncu1 = v_rakip and x.oyuncu2 = v_me));
  end if;

  if d.durum = 'bitti' then
    v_odul := jsonb_build_object(
      'lig_puan', case when d.dereceli and d.kazanan = v_me
                       then floor(public.ayar_sayi('lig_duello_galibiyet', 50) * d.odul_carpan)::int else 0 end,
      'coin', coalesce((select sum(h.miktar) from public.coin_hareketleri h
                         where h.user_id = v_me and h.tur = 'mac' and h.referans = 'duello:' || p_id::text), 0));
  end if;

  -- Maç sonu özeti: her soru izleyenin bakışıyla.
  if d.durum <> 'aktif' then
    select coalesce(jsonb_agg(jsonb_build_object(
             'tip', h.v4 ->> 'tip', 'tur', h.tur, 'sonuc', h.v4 ->> 'sonuc',
             'kontrol_sonra', h.v4 -> 'kontrol_sonra', 'seri_sonra', h.v4 -> 'seri_sonra',
             'kategori', h.v4 -> 'oyuncular' -> v_me::text ->> 'kategori',
             'rakip_kategori', h.v4 -> 'oyuncular' -> v_rakip::text ->> 'kategori',
             'soru', sd.soru, 'secenekler', sd.secenekler,
             'dogru_cevap', (h.v4 -> 'oyuncular' -> v_me::text -> 'dogru_cevap'),
             'benim_cevabim', (h.v4 -> 'oyuncular' -> v_me::text -> 'cevap'),
             'ben_dogru', (h.v4 -> 'oyuncular' -> v_me::text -> 'dogru'),
             'ben_yanitsiz', (h.v4 -> 'oyuncular' -> v_me::text -> 'yanitsiz'),
             'rakip_dogru', (h.v4 -> 'oyuncular' -> v_rakip::text -> 'dogru'),
             'rakip_yanitsiz', (h.v4 -> 'oyuncular' -> v_rakip::text -> 'yanitsiz')) order by h.id), '[]'::jsonb)
      into v_gecmis
      from public.duello_hamleler h
      left join lateral public.soru_dilinde((h.v4 -> 'oyuncular' -> v_me::text ->> 'soru_id')::uuid, v_dil) sd on true
     where h.duello_id = p_id and h.v4 is not null;
  end if;

  select jsonb_build_object('kullanilan', coalesce(sum(s.n), 0), 'sayilar', coalesce(jsonb_object_agg(s.tur, s.n), '{}'::jsonb))
    into v_benim
    from (select k.tur, count(*) n from public.joker_kullanimlari k
           where k.user_id = v_me and k.mac_tur = 'duello' and k.mac_id = p_id group by k.tur) s;
  select count(*) into v_bu_soruda from public.joker_kullanimlari k
   where k.user_id = v_me and k.mac_tur = 'duello' and k.mac_id = p_id and k.soru_index = d.v4_soru_no;
  v_rakip_soruda := exists (select 1 from public.joker_kullanimlari k
   where k.user_id = v_rakip and k.mac_tur = 'duello' and k.mac_id = p_id and k.soru_index = d.v4_soru_no);
  select s.ilk_cevap into v_ilk from public.skill_ikinci_sans_denemeleri s
   where s.mac_tur = 'duello' and s.mac_id = p_id and s.user_id = v_me and s.soru_index = d.v4_soru_no;
  v_kilit := case
    when d.faz not in ('notr', 'cevap') or d.durum <> 'aktif' then 'Soru açık değil'
    when d.cevaplar ? v_me::text or v_ilk is not null then 'Cevap verildikten sonra soru değiştirilemez'
    when d.faz = 'notr' and d.cevaplar <> '{}'::jsonb then 'Cevap verildikten sonra soru değiştirilemez'
    when d.faz = 'notr' and v_rakip_soruda then 'Rakibin bu soruda skill kullandı, soru değiştirilemez'
    when v_bu_soruda >= public.ayar_sayi('duello2_skill_soru_basi_hak', 1) then 'Bu soruda skill hakkını kullandın'
    else null end;

  return jsonb_build_object(
    'surum', 4,
    'id', d.id, 'durum', d.durum, 'dereceli', d.dereceli,
    'faz', d.faz, 'faz_bitis', d.faz_bitis, 'sunucu_zamani', clock_timestamp(),
    'ben', v_me, 'rakip', v_rakip,
    'oyuncular', jsonb_build_array(
      (select jsonb_build_object('id', p.id, 'gorunen_ad', p.gorunen_ad, 'gorunen_avatar', p.gorunen_avatar,
               'gorunum', p.gorunum, 'dogru', d.dogru1, 'unvan', public.oyuncu_unvani(p.id))
         from public.profiles p where p.id = d.oyuncu1),
      (select jsonb_build_object('id', p.id, 'gorunen_ad', p.gorunen_ad, 'gorunen_avatar', p.gorunen_avatar,
               'gorunum', p.gorunum, 'dogru', d.dogru2, 'unvan', public.oyuncu_unvani(p.id))
         from public.profiles p where p.id = d.oyuncu2)),
    'v4', jsonb_build_object(
      'kontrol', d.v4_kontrol, 'seri', d.v4_seri, 'seri_hedef', d.v4_seri_hedef,
      'tur', d.v4_tur, 'max_tur', d.v4_max_tur, 'notr_seri', d.v4_notr_seri, 'notr_max', d.v4_notr_max,
      'son', d.v4_son, 'soru_no', d.v4_soru_no, 'kullanilan', to_jsonb(d.v4_kullanilan),
      'kart', v_kart,
      -- Saldırı turunda kategoriler kart fazı bitince iki oyuncuya da açılır.
      'benim_kategori', case when d.faz <> 'kart' then case when v_ben1 then d.kategori1 else d.kategori2 end end,
      'rakip_kategori', case when d.faz <> 'kart' then case when v_ben1 then d.kategori2 else d.kategori1 end end,
      'oto', case when d.faz <> 'kart' then d.v4_kart_oto end,
      'ilk_mac', not exists (select 1 from public.duellolar x
                              where x.surum = 4 and x.durum = 'bitti' and x.id <> d.id and v_me in (x.oyuncu1, x.oyuncu2))),
    'soru', v_soru,
    'cevap', case when d.faz in ('notr', 'cevap', 'son') then jsonb_build_object(
        'benim_bitis', case when v_ben1 then d.bitis1 else d.bitis2 end,
        'rakip_bitis', case when v_ben1 then d.bitis2 else d.bitis1 end,
        'ben_cevapladim', d.cevaplar ? v_me::text,
        'benim_cevabim', d.cevaplar -> v_me::text -> 'cevap',
        'rakip_cevapladi', d.cevaplar ? v_rakip::text,
        'elli_kapali', to_jsonb(case when v_ben1 then d.elli1 else d.elli2 end),
        'ikinci_sans_ilk_cevap', v_ilk) end,
    'son_hamle', d.son_hamle,
    'skill', jsonb_build_object(
       'kapali', d.v4_son,
       'set', to_jsonb(public.skill_setim('duello')),
       'izinli', to_jsonb(public.duello4_izinli_skiller()),
       'toplam_hak', public.ayar_sayi('duello2_skill_toplam_hak', 4),
       'tur_basi_hak', public.ayar_sayi('duello2_skill_tur_basi_hak', 2),
       'soru_basi_hak', public.ayar_sayi('duello2_skill_soru_basi_hak', 1),
       'kullanilan', v_benim -> 'kullanilan', 'sayilar', v_benim -> 'sayilar',
       'bu_soruda', v_bu_soruda, 'rakip_bu_soruda', v_rakip_soruda,
       'soru_degistir_kilit', v_kilit,
       'envanter', (select coalesce(jsonb_object_agg(e.tur, e.adet), '{}'::jsonb) from public.joker_envanter e where e.user_id = v_me),
       'fiyatlar', public.joker_fiyatlari(),
       'coin', (select coalesce(pr.coin, 0) from public.profiles pr where pr.id = v_me)),
    'sureler', jsonb_build_object(
       'kart', public.ayar_sayi('duello4_kart_sn', 7),
       'cevap', public.ayar_sayi('duello4_cevap_sn', 15),
       'sonuc', public.ayar_sayi('duello4_sonuc_sn', 3),
       'ek_sure', public.ayar_sayi('duello_ek_sure_sn', 5),
       'zaman_baskisi_eksi', public.ayar_sayi('duello2_zaman_baskisi_eksi_sn', 5),
       'nabiz', public.duello_nabiz_sn(),
       'kopuk', public.ayar_sayi('duello_kopuk_sn', 25),
       'gosterim_payi_ms', public.ayar_sayi('duello_gosterim_payi_ms', 1200),
       'gosterim_bas', case
          when d.faz = 'kart' then d.faz_bitis - make_interval(secs => public.ayar_sayi('duello4_kart_sn', 7))
          when d.faz in ('notr', 'cevap', 'son') then d.soru_baslangic + public.duello2_gosterim_payi() end),
    'kazanan', d.kazanan, 'terk_eden', d.terk_eden, 'odul', v_odul, 'ezeli', v_ezeli, 'gecmis', v_gecmis,
    'rovans', jsonb_build_object('isteyen', d.rovans_isteyen, 'id', d.rovans_id,
       'gecerli', d.rovans_at is not null and d.rovans_at > now() - make_interval(secs => public.ayar_sayi('duello_rovans_sn', 60))));
end $$;

-- ------------------------------------------------------------------ bot
-- Kart: rakibe, rakibin EN ZAYIF kategorisini gönderir; kendine EN GÜÇLÜSÜNÜ seçer — duello4_bot_en_iyi_yuzde (75)
-- olasılıkla, kalanında rastgele başka kart (insan gibi hata payı). Verisiz oran varsayılan %50.
create or replace function public.duello4_bot_kart(p_id uuid, p_bot uuid, p_adim int)
returns text language plpgsql security definer set search_path to 'public' as $$
declare
  d public.duellolar%rowtype;
  v_rakip_profil jsonb;
  v_en_iyi boolean;
  v_varsayilan int := public.ayar_sayi('duello4_oran_varsayilan', 50);
  v text;
begin
  select * into d from public.duellolar where id = p_id;
  v_rakip_profil := case when p_bot = d.oyuncu1 then d.profil2 else d.profil1 end;
  v_en_iyi := public.bot_rasgele('d4bk:' || p_id::text || ':' || d.v4_tur || ':' || p_adim) * 100
              < public.ayar_sayi('duello4_bot_en_iyi_yuzde', 75);
  if p_adim = 1 then
    select k into v from unnest(d.v4_kartlar) k
     order by case when v_en_iyi then coalesce(public.duello4_oran(v_rakip_profil, k), v_varsayilan) end nulls last, random()
     limit 1;
    if not v_en_iyi then
      -- hata payı: en zayıf OLMAYAN rastgele bir kart
      select k into v from unnest(d.v4_kartlar) k
       order by (k = (select k2 from unnest(d.v4_kartlar) k2
                       order by coalesce(public.duello4_oran(v_rakip_profil, k2), v_varsayilan), k2 limit 1)), random()
       limit 1;
    end if;
  else
    select k into v from unnest(d.v4_kartlar) k
     where k <> d.v4_gonderilen
     order by case when v_en_iyi then public.bot_kategori_isabet(p_bot, k) end desc nulls last, random()
     limit 1;
    if not v_en_iyi then
      select k into v from unnest(d.v4_kartlar) k
       where k <> d.v4_gonderilen
       order by (k = (select k2 from unnest(d.v4_kartlar) k2 where k2 <> d.v4_gonderilen
                       order by public.bot_kategori_isabet(p_bot, k2) desc, k2 limit 1)), random()
       limit 1;
    end if;
  end if;
  return v;
end $$;

-- Cevap gecikmesi: kendi sorusunun okuma yüküyle (2. sürümün formülü); kişisel bitişi aşmaz.
create or replace function public.duello4_bot_gecikme(p_id uuid, p_bot uuid)
returns double precision language plpgsql stable security definer set search_path to 'public' as $$
declare
  d public.duellolar%rowtype;
  p public.profiles%rowtype;
  v_soru uuid;
  v_tohum text;
  v_g double precision;
  v_sure double precision;
  v_min double precision;
  v_max double precision;
begin
  select * into d from public.duellolar where id = p_id;
  select * into p from public.profiles where id = p_bot;
  v_soru := case when p_bot = d.oyuncu1 then d.soru_id1 else d.soru_id2 end;
  v_tohum := 'd4cev:' || p_id::text || ':' || coalesce(v_soru::text, '') || ':' || p_bot::text;
  if public.duello2_bot_acik_mi(p_bot) then
    v_min := public.ayar_ondalik('duello2_bot_acik_cevap_min_sn', 0.3);
    v_max := public.ayar_ondalik('duello2_bot_acik_cevap_max_sn', 0.8);
    v_g := v_min + (v_max - v_min) * public.bot_rasgele(v_tohum);
  else
    v_g := public.bot_gecikme_sn(p_bot, v_tohum, p.bot_gecikme_min, p.bot_gecikme_max, public.soru_okuma_yuku(v_soru));
  end if;
  v_sure := extract(epoch from (case when p_bot = d.oyuncu1 then d.bitis1 else d.bitis2 end) - d.soru_baslangic)
            - public.ayar_ondalik('duello2_bot_cevap_pay_sn', 2);
  return greatest(least(v_g + extract(epoch from public.duello2_gosterim_payi()), v_sure), 0.3);
end $$;

-- Bot tiki (duello_tik_hepsi çağırır, ~2 sn). Jokersiz (2. sürümün bot jokeri v4'e taşınmadı).
create or replace function public.duello4_bot_tik(p_id uuid)
returns integer language plpgsql security definer set search_path to 'public' as $$
declare
  d public.duellolar%rowtype;
  v_bot uuid;
  v_n int := 0;
  v_kat text;
  v_bas timestamptz;
  v_t1 double precision;
  v_t2 double precision;
  v_min double precision := public.ayar_ondalik('duello4_bot_kart_min_sn', 1.2);
  v_max double precision := public.ayar_ondalik('duello4_bot_kart_max_sn', 3);
  v_kart_sn double precision := public.ayar_ondalik('duello4_kart_sn', 7);
  v_soru uuid;
  v_kategori text;
  v_dc smallint;
  v_cevap smallint;
begin
  select * into d from public.duellolar where id = p_id and surum = 4 for update skip locked;
  if not found or d.durum <> 'aktif' then return 0; end if;
  perform public.duello4_ilerlet(p_id);

  for v_bot in select p.id from public.profiles p where p.id in (d.oyuncu1, d.oyuncu2) and coalesce(p.is_bot, false) loop
    select * into d from public.duellolar where id = p_id;
    exit when d.durum <> 'aktif' or d.kopuk_at is not null;

    if d.faz = 'kart' and d.v4_kontrol = v_bot then
      v_bas := d.faz_bitis - make_interval(secs => v_kart_sn);   -- = gösterim başı
      v_t1 := least(v_min + (v_max - v_min) * public.bot_rasgele('d4k1:' || p_id::text || ':' || d.v4_tur), v_kart_sn - 2);
      v_t2 := least(v_t1 + 0.8 + 1.2 * public.bot_rasgele('d4k2:' || p_id::text || ':' || d.v4_tur), v_kart_sn - 0.5);
      if d.v4_gonderilen is null and now() >= v_bas + make_interval(secs => v_t1) then
        perform public.duello4_kart_uygula(p_id, public.duello4_bot_kart(p_id, v_bot, 1), null, false);
        perform public.duello_sinyal_ver(p_id);
        v_n := v_n + 1;
        select * into d from public.duellolar where id = p_id;
      end if;
      if d.faz = 'kart' and d.v4_gonderilen is not null and d.v4_secilen is null and now() >= v_bas + make_interval(secs => v_t2) then
        perform public.duello4_kart_uygula(p_id, null, public.duello4_bot_kart(p_id, v_bot, 2), false);
        perform public.duello_sinyal_ver(p_id);
        v_n := v_n + 1;
        select * into d from public.duellolar where id = p_id;
      end if;
    end if;

    if d.faz in ('notr', 'cevap', 'son') and not (d.cevaplar ? v_bot::text) and d.soru_baslangic is not null
       and now() >= d.soru_baslangic + make_interval(secs => public.duello4_bot_gecikme(p_id, v_bot)) then
      v_soru := case when v_bot = d.oyuncu1 then d.soru_id1 else d.soru_id2 end;
      v_kategori := case when v_bot = d.oyuncu1 then d.kategori1 else d.kategori2 end;
      select dogru_cevap into v_dc from public.questions where id = v_soru;
      -- Doğruluk: kategoriye + bot seviyesine + soru zorluğuna göre (bot_soru_isabet, 2. sürümle aynı).
      if random() < public.bot_soru_isabet(v_bot, v_kategori, v_soru) then
        v_cevap := v_dc;
      else
        select x into v_cevap from generate_series(0, 3) x where x <> v_dc order by random() limit 1;
      end if;
      update public.duellolar
         set cevaplar = cevaplar || jsonb_build_object(v_bot::text, jsonb_build_object('cevap', v_cevap, 'at', now())),
             son_hareket = now()
       where id = p_id;
      perform public.duello4_ilerlet(p_id);
      perform public.duello_sinyal_ver(p_id);
      v_n := v_n + 1;
    end if;
  end loop;
  return v_n;
end $$;

-- ------------------------------------------------------------------ yetkiler: hepsi iç fonksiyon
revoke all on function public.duello4_acik_mi(uuid, uuid) from public, anon, authenticated;
revoke all on function public.duello4_oran(jsonb, text) from public, anon, authenticated;
revoke all on function public.duello4_kategoriler(uuid) from public, anon, authenticated;
revoke all on function public.duello4_soru_cifti(uuid, text, text) from public, anon, authenticated;
revoke all on function public.duello4_soru_benzer(uuid, text, int) from public, anon, authenticated;
revoke all on function public.duello4_ortak_soru_ac(uuid, boolean, interval) from public, anon, authenticated;
revoke all on function public.duello4_kart_ac(uuid) from public, anon, authenticated;
revoke all on function public.duello4_soru_ac(uuid) from public, anon, authenticated;
revoke all on function public.duello4_kart_uygula(uuid, text, text, boolean) from public, anon, authenticated;
revoke all on function public.duello4_kart_oto(uuid) from public, anon, authenticated;
revoke all on function public.duello4_cozumle(uuid) from public, anon, authenticated;
revoke all on function public.duello4_sonraki(uuid) from public, anon, authenticated;
revoke all on function public.duello4_ilerlet(uuid) from public, anon, authenticated;
revoke all on function public.duello4_baslat(uuid) from public, anon, authenticated;
revoke all on function public.duello4_cevap(uuid, smallint) from public, anon, authenticated;
revoke all on function public.duello4_kart(uuid, text) from public, anon, authenticated;
revoke all on function public.duello4_izinli_skiller() from public, anon, authenticated;
revoke all on function public.duello4_joker_hak_kontrol(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.duello4_joker(uuid, text) from public, anon, authenticated;
revoke all on function public.duello4_durum(uuid) from public, anon, authenticated;
revoke all on function public.duello4_bot_kart(uuid, uuid, int) from public, anon, authenticated;
revoke all on function public.duello4_bot_gecikme(uuid, uuid) from public, anon, authenticated;
revoke all on function public.duello4_bot_tik(uuid) from public, anon, authenticated;
