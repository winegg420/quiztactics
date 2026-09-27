-- ============================================================
-- 666 · DÜELLO PUAN SİSTEMİ (Ida, 27 Eyl 2026)
--
-- Can sistemi kalkar, yerine biriken puan gelir:
--   · Kategoriler MAÇ BAŞINDA yıldızlanır (sabit): rakibin o kategorideki genel doğru oranı
--     (duello_oranlar_ic; < duello_oran_min_cevap cevap = veri yok → ★★) —
--     ≤ %45 ★ (1 puan) · ≤ %70 ★★ (3 puan) · üstü ★★★ (6 puan). Eşik ve puanlar oyun_ayarlari'nda.
--   · Puan simetrik: saldıran/savunan fark etmez, doğru bilen kategori değerini alır;
--     ikisi doğru → ikisi alır, ikisi yanlış → kimse.
--   · Maç sabit 10 tur; bitince puanı yüksek kazanır. Eşitlikte Altın Soru (Turnuva'nın
--     seçicisiyle: kullanılmamış, zor, jokersiz), tek doğru bilen kazanana kadar.
--   · KALDIRILDI: zayıf nokta kuralı, kategori başına kullanım sınırı, üst üste aynı kategori yasağı.
--   · Kategori Kalkanı: tek kategori korur; maçta 2 ücretsiz hak — 1. hak Tur 1–5'te, 2. hak Tur 6–10'da
--     açılır; kullanılmayan 1. hak kaybolmaz (2. pencerede iki hak). Seçim başına tek kalkan.
--   · Yeni oyuncu kilidi: Düello için en az duello_acilis_mac_esigi (5) bitmiş Klasik/Saf Bilgi maçı.
-- Sürüm dalı AÇILMAZ: surum = 2 maçın kuralları yerinde değişir; eski can kolonları geçmiş
-- maçlar için durur (silinmez), yeni maçta kullanılmaz. Aktif düello yok (ölçüldü: 0).
-- ============================================================

-- ---------------------------------------------------------------- kolonlar
alter table public.duellolar
  add column if not exists puan1 integer,
  add column if not exists puan2 integer,
  add column if not exists yildiz1 jsonb,          -- oyuncu1'in kategorileri: {kategori: 1|2|3} (oyuncu2 saldırırken değer)
  add column if not exists yildiz2 jsonb,
  add column if not exists puan_degerleri jsonb,   -- maç başında sabit: {"1":1,"2":3,"3":6}
  add column if not exists kalkanlar1 jsonb not null default '[]'::jsonb,   -- [{kategori, idx, tur}]
  add column if not exists kalkanlar2 jsonb not null default '[]'::jsonb;

alter table public.duello_hamleler
  add column if not exists yildiz smallint,
  add column if not exists deger integer,
  add column if not exists puan_saldiran integer,
  add column if not exists puan_savunan integer,
  add column if not exists altin_kazanan uuid;

-- Yeni maçlar can taşımaz (eski satırların değerleri durur).
alter table public.duellolar alter column can1 drop not null, alter column can2 drop not null;
alter table public.duellolar alter column can1 drop default, alter column can2 drop default;

-- ---------------------------------------------------------------- ayarlar
insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('duello_yildiz_zayif_esik', '45'::jsonb, 'Düello: rakibin kategori doğru oranı bu yüzdeye kadar ★ (zayıf)'),
  ('duello_yildiz_orta_esik', '70'::jsonb, 'Düello: bu yüzdeye kadar ★★ (orta), üstü ★★★ (güçlü); veri yoksa ★★'),
  ('duello_puan_yildiz1', '1'::jsonb, 'Düello: ★ kategoride doğru bilenin puanı'),
  ('duello_puan_yildiz2', '3'::jsonb, 'Düello: ★★ kategoride doğru bilenin puanı'),
  ('duello_puan_yildiz3', '6'::jsonb, 'Düello: ★★★ kategoride doğru bilenin puanı'),
  ('duello_acilis_mac_esigi', '5'::jsonb, 'Düello açılışı: gereken bitmiş Klasik + Saf Bilgi maç sayısı'),
  ('duello_kalkan_pencere1_son_tur', '5'::jsonb, 'Kategori Kalkanı: 1. hak bu tura kadar (Tur 1–5)'),
  ('duello_kalkan_pencere2_son_tur', '10'::jsonb, 'Kategori Kalkanı: 2. hak bu tura kadar (Tur 6–10); 1. hak kaybolmaz'),
  ('rozet_kil_payi_puan', '3'::jsonb, 'Son Nefes rozeti: Düello bu kadar ya da daha az puan farkla kazanılır'),
  ('rozet_geri_donus_puan_farki', '10'::jsonb, 'Büyük Geri Dönüş rozeti: Düello''da bu kadar puan gerideyken kazanmak')
on conflict (anahtar) do update set deger = excluded.deger, aciklama = excluded.aciklama;

update public.oyun_ayarlari set aciklama = 'KULLANILMIYOR (666): Düello can sistemi kalktı'
 where anahtar in ('duello_can', 'duello_kategori_max', 'duello2_zayif_min_cevap');

-- ---------------------------------------------------------------- yıldız / puan yardımcıları
create or replace function public.duello_yildiz(p_oran integer)
returns smallint language sql stable security definer set search_path = public as $$
  select (case when p_oran is null then 2
               when p_oran <= public.ayar_sayi('duello_yildiz_zayif_esik', 45) then 1
               when p_oran <= public.ayar_sayi('duello_yildiz_orta_esik', 70) then 2
               else 3 end)::smallint;
$$;
revoke all on function public.duello_yildiz(integer) from public, anon, authenticated;

-- Oranlar (duello_oranlar_ic çıktısı: {kategori: yüzde|null}) → {kategori: yıldız}
create or replace function public.duello_yildizlar_ic(p_oranlar jsonb)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(k, public.duello_yildiz(
           case when jsonb_typeof(p_oranlar -> k) = 'number' then (p_oranlar ->> k)::numeric::int end)), '{}'::jsonb)
    from unnest(public.duello_kategorileri()) k;
$$;
revoke all on function public.duello_yildizlar_ic(jsonb) from public, anon, authenticated;

create or replace function public.duello_puan_degerleri()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('1', public.ayar_sayi('duello_puan_yildiz1', 1)::int,
                            '2', public.ayar_sayi('duello_puan_yildiz2', 3)::int,
                            '3', public.ayar_sayi('duello_puan_yildiz3', 6)::int);
$$;
revoke all on function public.duello_puan_degerleri() from public, anon, authenticated;

-- Saldıran bu kategoriyi seçerse sorunun yıldızı: SAVUNANIN (rakibin) kategori yıldızı.
create or replace function public.duello_kategori_yildizi(p_id uuid, p_kategori text)
returns smallint language sql stable security definer set search_path = public as $$
  select coalesce((case when d.saldiran = d.oyuncu1 then d.yildiz2 else d.yildiz1 end ->> p_kategori)::smallint, 2)
    from public.duellolar d where d.id = p_id;
$$;
revoke all on function public.duello_kategori_yildizi(uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------------- yeni oyuncu kilidi
create or replace function public.duello_acilis_durumu(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_gereken int := greatest(0, public.ayar_sayi('duello_acilis_mac_esigi', 5)::int);
  v_oynanan int := 0;
begin
  if exists (select 1 from public.profiles p where p.id = p_user and coalesce(p.is_bot, false)) then
    return jsonb_build_object('acik', true, 'gereken', v_gereken, 'oynanan', v_gereken, 'kalan', 0);
  end if;
  -- Klasik + Saf Bilgi (jokersiz) = bitmiş 1v1 maçlar; terk ettiği maç sayılmaz.
  select count(*) into v_oynanan from public.matches m
   where m.durum = 'bitti' and p_user in (m.oyuncu1, m.oyuncu2)
     and m.terk_eden is distinct from p_user;
  return jsonb_build_object('acik', v_oynanan >= v_gereken, 'gereken', v_gereken,
                            'oynanan', v_oynanan, 'kalan', greatest(0, v_gereken - v_oynanan));
end $$;
revoke all on function public.duello_acilis_durumu(uuid) from public, anon, authenticated;

create or replace function public.duello_acilis_benim()
returns jsonb language sql stable security definer set search_path = public as $$
  select public.duello_acilis_durumu(auth.uid());
$$;
revoke all on function public.duello_acilis_benim() from public, anon;
grant execute on function public.duello_acilis_benim() to authenticated;

-- p_ben: çağıranın kendisi mi (mesaj farkı). Kilitliyse hata fırlatır.
create or replace function public.duello_acilis_kontrol(p_user uuid, p_ben boolean default true)
returns void language plpgsql stable security definer set search_path = public as $$
declare v jsonb := public.duello_acilis_durumu(p_user);
begin
  if coalesce((v ->> 'acik')::boolean, false) then return; end if;
  if p_ben then
    raise exception 'Düello''yu açmak için % maç daha oyna', (v ->> 'kalan');
  end if;
  raise exception 'Rakibin Düello''yu henüz açmadı (% maç daha oynaması gerek)', (v ->> 'kalan');
end $$;
revoke all on function public.duello_acilis_kontrol(uuid, boolean) from public, anon, authenticated;

-- ---------------------------------------------------------------- Kategori Kalkanı: 2 hak, iki pencere
-- Açılmış hak − kullanılan. Tur ≤ pencere1 → 1 hak açık; ≤ pencere2 → 2 (1. hak kaybolmaz); sonrası (Altın Soru) 0.
create or replace function public.duello_kalkan_kalan(p_tur integer, p_kullanilan integer)
returns integer language sql stable security definer set search_path = public as $$
  select greatest(0,
    (case when p_tur <= public.ayar_sayi('duello_kalkan_pencere1_son_tur', 5) then 1
          when p_tur <= public.ayar_sayi('duello_kalkan_pencere2_son_tur', 10) then 2
          else 0 end) - coalesce(p_kullanilan, 0));
$$;
revoke all on function public.duello_kalkan_kalan(integer, integer) from public, anon, authenticated;

create or replace function public.duello2_aktif_kalkan(p_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select e ->> 'kategori'
    from public.duellolar x,
         jsonb_array_elements(case when x.saldiran = x.oyuncu1 then x.kalkanlar2 else x.kalkanlar1 end) e
   where x.id = p_id and x.surum = 2 and x.faz = 'kategori' and not coalesce(x.uzatma, false)
     and (e ->> 'idx')::int = x.tur * 2 + x.saldiri_sirasi
   limit 1;
$$;
revoke all on function public.duello2_aktif_kalkan(uuid) from public, anon, authenticated;

create or replace function public.duello2_kalkan_engel(p_id uuid, p_user uuid, p_kategori text)
returns text language plpgsql security definer set search_path = public as $$
declare
  d public.duellolar%rowtype;
  v_savunan uuid;
  v_kullanilan jsonb;
  v_diger int;
  v_p1 int := public.ayar_sayi('duello_kalkan_pencere1_son_tur', 5)::int;
begin
  select * into d from public.duellolar where id = p_id;
  if not found then return 'Düello bulunamadı'; end if;
  if d.durum <> 'aktif' then return 'Düello bitti'; end if;
  if coalesce(d.surum, 1) <> 2 or public.ayar_sayi('duello2_kalkan_acik', 1) <> 1 then
    return 'Kategori Kalkanı bu maçta yok';
  end if;
  if d.uzatma then return 'Altın Soru''da Kategori Kalkanı kullanılamaz'; end if;
  if d.faz <> 'kategori' then return 'Kategori Kalkanı yalnız rakip kategori seçerken kullanılır'; end if;
  v_savunan := case when d.saldiran = d.oyuncu1 then d.oyuncu2 else d.oyuncu1 end;
  if p_user is distinct from v_savunan then return 'Kategori Kalkanı yalnız rakip kategori seçerken kullanılır'; end if;
  v_kullanilan := case when p_user = d.oyuncu1 then d.kalkanlar1 else d.kalkanlar2 end;
  if exists (select 1 from jsonb_array_elements(v_kullanilan) e
              where (e ->> 'idx')::int = d.tur * 2 + d.saldiri_sirasi) then
    return 'Bu seçimde zaten bir kategoriyi koruyorsun';
  end if;
  if public.duello_kalkan_kalan(d.tur, jsonb_array_length(v_kullanilan)) < 1 then
    if d.tur <= v_p1 then
      return format('Bu pencerede Kalkan hakkını kullandın; 2. hak Tur %s''da açılır', v_p1 + 1);
    end if;
    return 'Kategori Kalkanı hakların bitti';
  end if;
  if d.faz_bitis - clock_timestamp() < make_interval(secs => public.ayar_sayi('duello2_kalkan_son_sn', 5)) then
    return 'Kategori Kalkanı için süre çok az kaldı';
  end if;
  if p_kategori is null or not public.duello2_kategori_uygun_mu(p_id, p_kategori) then
    return 'Bu kategori zaten seçilemez, korumaya gerek yok';
  end if;
  select count(*) into v_diger from unnest(public.duello_kategorileri()) k
   where k <> p_kategori and public.duello2_kategori_uygun_mu(p_id, k);
  if v_diger < 1 then return 'Rakibe seçebileceği kategori kalmaz, bu kategori korunamaz'; end if;
  return null;
end $$;
revoke all on function public.duello2_kalkan_engel(uuid, uuid, text) from public, anon, authenticated;

create or replace function public.duello2_kalkan_uygula(p_id uuid, p_user uuid, p_kategori text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.duellolar
     set kalkanlar1 = case when oyuncu1 = p_user
                           then kalkanlar1 || jsonb_build_array(jsonb_build_object(
                                  'kategori', p_kategori, 'idx', tur * 2 + saldiri_sirasi, 'tur', tur))
                           else kalkanlar1 end,
         kalkanlar2 = case when oyuncu2 = p_user
                           then kalkanlar2 || jsonb_build_array(jsonb_build_object(
                                  'kategori', p_kategori, 'idx', tur * 2 + saldiri_sirasi, 'tur', tur))
                           else kalkanlar2 end,
         son_hareket = now()
   where id = p_id;
end $$;
revoke all on function public.duello2_kalkan_uygula(uuid, uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------------- kategori uygunluğu
-- 666: kullanım sınırı ve üst üste yasağı KALKTI. Kalan: listede olmak, kalkanlı olmamak, kapsam.
create or replace function public.duello2_kategori_uygun_mu(p_id uuid, p_kategori text)
returns boolean language sql stable security definer set search_path = public as $$
  select p_kategori = any(public.duello_kategorileri())
     and p_kategori is distinct from public.duello2_aktif_kalkan(p_id)          -- 650
     and public.duello_kategori_kapsam_uygun(p_id, p_kategori);                 -- 652
$$;

create or replace function public.duello2_otomatik_kategori(p_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_kat text;
begin
  -- Süre doldu: uygun kategorilerden rastgele.
  select k into v_kat from unnest(public.duello_kategorileri()) k
   where public.duello2_kategori_uygun_mu(p_id, k)
   order by random() limit 1;
  if v_kat is null then
    select k into v_kat from unnest(public.duello_kategorileri()) k
     where k is distinct from public.duello2_aktif_kalkan(p_id)
     order by random() limit 1;
  end if;
  return v_kat;
end $$;

-- ---------------------------------------------------------------- maç kurulumu
create or replace function public.duello_olustur(p_a uuid, p_b uuid, p_dereceli boolean, p_onceki uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_p1 jsonb;
  v_p2 jsonb;
  v_x uuid;
begin
  if random() < 0.5 then
    v_x := p_a; p_a := p_b; p_b := v_x;
  end if;

  -- Profil, oranlar ve kategori yıldızları MAÇ BAŞINDA sabitlenir (yoklamalarda yeniden hesaplanmaz).
  select public.oyuncu_kategori_profili_ic(p_a) into v_p1;
  select public.oyuncu_kategori_profili_ic(p_b) into v_p2;
  v_p1 := coalesce(v_p1, '{}'::jsonb) || jsonb_build_object('oranlar', public.duello_oranlar_ic(p_a));
  v_p2 := coalesce(v_p2, '{}'::jsonb) || jsonb_build_object('oranlar', public.duello_oranlar_ic(p_b));

  insert into public.duellolar (oyuncu1, oyuncu2, dereceli, can1, can2, puan1, puan2,
                                yildiz1, yildiz2, puan_degerleri, saldiran, faz, faz_bitis,
                                profil1, profil2, onceki_id, surum)
  values (p_a, p_b, coalesce(p_dereceli, true), null, null, 0, 0,
          public.duello_yildizlar_ic(v_p1 -> 'oranlar'), public.duello_yildizlar_ic(v_p2 -> 'oranlar'),
          public.duello_puan_degerleri(), p_a, 'kategori',
          now() + make_interval(secs => public.ayar_sayi('duello2_kategori_sn', 15)) + public.duello2_gosterim_payi(),
          v_p1, v_p2, p_onceki, 2)
  returning id into v_id;

  insert into public.duello_sinyal (duello_id, oyuncu1, oyuncu2) values (v_id, p_a, p_b);
  delete from public.duello_kuyrugu where user_id in (p_a, p_b);
  return v_id;
end $$;

-- ---------------------------------------------------------------- Altın Soru
-- Turnuva'nın seçicisi (turnuva_soru_aday): kullanılmamış, önce altın zorluk dilimi (4–5), boşsa alt dilimler.
create or replace function public.duello_altin_soru_bul(p_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  d public.duellolar%rowtype;
  v_yeni uuid;
  v_aralik int[] := array[
    public.ayar_sayi('turnuva_altin_zorluk_min', 4)::int,  public.ayar_sayi('turnuva_altin_zorluk_max', 5)::int,
    public.ayar_sayi('turnuva_zorluk_dilim2_min', 3)::int, public.ayar_sayi('turnuva_zorluk_dilim2_max', 3)::int,
    public.ayar_sayi('turnuva_zorluk_dilim1_min', 1)::int, public.ayar_sayi('turnuva_zorluk_dilim1_max', 2)::int];
  v_k int;
begin
  select * into d from public.duellolar where id = p_id;
  if public.soru_kapsam_evrensel_mi(array[d.oyuncu1, d.oyuncu2]) then
    perform set_config('app.soru_kapsam', 'evrensel', true);   -- 652
  end if;
  for v_k in 0..2 loop
    v_yeni := (public.turnuva_soru_aday(1, d.kullanilan_sorular, v_aralik[v_k*2+1], v_aralik[v_k*2+2], 'tr'))[1];
    exit when v_yeni is not null;
  end loop;
  perform set_config('app.soru_kapsam', '', true);
  if v_yeni is null then
    select q.id into v_yeni from public.questions q
     where q.aktif and not (q.id = any(d.kullanilan_sorular))
       and (q.kapsam = 'global' or not public.soru_kapsam_evrensel_mi(array[d.oyuncu1, d.oyuncu2]))
     order by random() limit 1;
  end if;
  return v_yeni;
end $$;
revoke all on function public.duello_altin_soru_bul(uuid) from public, anon, authenticated;

-- Soruyu açar (kategori seçimi ya da Altın Soru). p_soru verilirse onu açar.
-- Eski imza (2 argüman) yenisiyle çakışmasın.
drop function if exists public.duello2_soru_ac(uuid, text);
create or replace function public.duello2_soru_ac(p_id uuid, p_kategori text, p_soru uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  d public.duellolar%rowtype;
  v_soru uuid := p_soru;
  v_kat text := p_kategori;
  v_bitis timestamptz := now() + make_interval(secs => public.ayar_sayi('duello2_cevap_sn', 15)) + public.duello2_gosterim_payi();
begin
  select * into d from public.duellolar where id = p_id for update;
  if v_soru is null then
    v_soru := public.duello_soru_bul(p_id, v_kat, array[d.oyuncu1, d.oyuncu2], d.kullanilan_sorular);
  else
    select q.kategori into v_kat from public.questions q where q.id = v_soru;
  end if;
  if v_soru is null then raise exception 'Bu kategoride soru kalmadı'; end if;

  update public.duellolar
     set kategori = v_kat, soru_id = v_soru, faz = 'cevap',
         soru_baslangic = now(), bitis1 = v_bitis, bitis2 = v_bitis, faz_bitis = v_bitis,
         cevaplar = '{}'::jsonb, elli1 = null, elli2 = null, elli_kapali = null,
         zaman_baskisi = false, ek_sure = false,
         soru_degisti_saldiri = false, soru_degisti_savunma = false,
         kullanilan_sorular = kullanilan_sorular || v_soru,
         son_hareket = now()
   where id = p_id;
end $$;
revoke all on function public.duello2_soru_ac(uuid, text, uuid) from public, anon, authenticated;

create or replace function public.duello2_uzatma_ac(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  d public.duellolar%rowtype;
  v_soru uuid;
begin
  select * into d from public.duellolar where id = p_id for update;
  update public.duellolar
     set uzatma = true,
         tur = case when saldiri_sirasi = 1 then tur + 1 else tur end,
         saldiri_sirasi = case when saldiri_sirasi = 1 then 0 else 1 end,
         saldiran = case when saldiri_sirasi = 1 then oyuncu1 else oyuncu2 end,
         son_hareket = now()
   where id = p_id;
  v_soru := public.duello_altin_soru_bul(p_id);
  if v_soru is null then
    -- Havuzda kullanılmamış soru kalmadı (pratikte olmaz): maç asılı kalmasın.
    perform public.duello_bitir(p_id, d.oyuncu1);
    return;
  end if;
  perform public.duello2_soru_ac(p_id, null, v_soru);
end $$;

-- ---------------------------------------------------------------- çözümleme (puan)
create or replace function public.duello2_cozumle(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  d public.duellolar%rowtype;
  v_dc smallint;
  v_savunan uuid;
  v_c_sal smallint;
  v_c_sav smallint;
  v_d_sal boolean;
  v_d_sav boolean;
  v_idx int;
  v_o uuid;
  v_c smallint;
  v_kalkan_kat text;
  v_yildiz smallint;
  v_deger int;
  v_p_sal int := 0;
  v_p_sav int := 0;
  v_altin uuid;
begin
  select * into d from public.duellolar where id = p_id for update;
  if not found or d.durum <> 'aktif' or d.faz <> 'cevap' then return; end if;

  v_idx := d.tur * 2 + d.saldiri_sirasi;
  v_savunan := case when d.saldiran = d.oyuncu1 then d.oyuncu2 else d.oyuncu1 end;
  select dogru_cevap into v_dc from public.questions where id = d.soru_id;
  v_c_sal := (d.cevaplar -> d.saldiran::text ->> 'cevap')::smallint;
  v_c_sav := (d.cevaplar -> v_savunan::text ->> 'cevap')::smallint;
  v_d_sal := v_c_sal is not null and v_c_sal = v_dc;   -- Yanıtsız = doğru değil
  v_d_sav := v_c_sav is not null and v_c_sav = v_dc;

  if d.uzatma then
    -- Altın Soru: puan yok; yalnız biri doğruysa o kazanır.
    v_altin := case when v_d_sal and not v_d_sav then d.saldiran
                    when v_d_sav and not v_d_sal then v_savunan end;
  else
    select e ->> 'kategori' into v_kalkan_kat
      from jsonb_array_elements(case when v_savunan = d.oyuncu1 then d.kalkanlar1 else d.kalkanlar2 end) e
     where (e ->> 'idx')::int = v_idx limit 1;
    -- Değer: savunanın (rakibin) maç başında sabitlenen kategori yıldızı. Simetrik: doğru bilen alır.
    v_yildiz := coalesce((case when v_savunan = d.oyuncu1 then d.yildiz1 else d.yildiz2 end ->> d.kategori)::smallint, 2);
    v_deger := coalesce((d.puan_degerleri ->> v_yildiz::text)::int, (public.duello_puan_degerleri() ->> v_yildiz::text)::int);
    v_p_sal := case when v_d_sal then v_deger else 0 end;
    v_p_sav := case when v_d_sav then v_deger else 0 end;
  end if;

  update public.duellolar
     set puan1 = coalesce(puan1, 0) + (case when oyuncu1 = d.saldiran then v_p_sal else v_p_sav end),
         puan2 = coalesce(puan2, 0) + (case when oyuncu2 = d.saldiran then v_p_sal else v_p_sav end),
         dogru1 = dogru1 + (case when (oyuncu1 = d.saldiran and v_d_sal) or (oyuncu1 = v_savunan and v_d_sav) then 1 else 0 end),
         dogru2 = dogru2 + (case when (oyuncu2 = d.saldiran and v_d_sal) or (oyuncu2 = v_savunan and v_d_sav) then 1 else 0 end),
         faz = 'sonuc',
         faz_bitis = now() + make_interval(secs => public.ayar_sayi('duello_sonuc_sn', 3)),
         son_hamle = jsonb_build_object(
           'surum', 2, 'tur', d.tur, 'saldiri_sirasi', d.saldiri_sirasi, 'uzatma', d.uzatma,
           'saldiran', d.saldiran, 'savunan', v_savunan, 'kategori', d.kategori,
           'soru_id', d.soru_id, 'dogru_cevap', v_dc,
           'yildiz', v_yildiz, 'deger', v_deger, 'altin_kazanan', v_altin, 'kalkan', v_kalkan_kat,
           'puanlar', jsonb_build_object(d.saldiran::text, v_p_sal, v_savunan::text, v_p_sav),
           'cevaplar', jsonb_build_object(
             d.saldiran::text, jsonb_build_object('cevap', v_c_sal, 'dogru', v_d_sal, 'yanitsiz', v_c_sal is null),
             v_savunan::text, jsonb_build_object('cevap', v_c_sav, 'dogru', v_d_sav, 'yanitsiz', v_c_sav is null))),
         son_hareket = now()
   where id = p_id;

  insert into public.duello_hamleler (duello_id, tur, saldiran, savunan, kategori, soru_id, cevap, dogru,
                                      riskli, can_kaybeden, zaman_baskisi, savunma_kilidi,
                                      surum, uzatma, cevap_saldiran, dogru_saldiran,
                                      yanitsiz_saldiran, yanitsiz_savunan, kalkan,
                                      yildiz, deger, puan_saldiran, puan_savunan, altin_kazanan)
  values (p_id, d.tur, d.saldiran, v_savunan, d.kategori, d.soru_id, v_c_sav, v_d_sav,
          false, null, d.zaman_baskisi, false,
          2, d.uzatma, v_c_sal, v_d_sal, v_c_sal is null, v_c_sav is null, v_kalkan_kat,
          v_yildiz, v_deger, v_p_sal, v_p_sav, v_altin);

  foreach v_o in array array[d.saldiran, v_savunan] loop
    v_c := case when v_o = d.saldiran then v_c_sal else v_c_sav end;
    perform public.kategori_istatistik_yaz(v_o, d.kategori, v_c is not null and v_c = v_dc);
    if v_c is not null and v_c = v_dc then perform public.kategori_dogru_arttir(v_o, d.kategori); end if;
    if v_c is not null then perform public.soru_sayac(d.soru_id, v_c = v_dc); end if;
  end loop;

  delete from public.skill_ikinci_sans_denemeleri
   where mac_tur = 'duello' and mac_id = p_id and soru_index = v_idx;
end $$;

-- ---------------------------------------------------------------- tur sonu: sabit 10 tur, puan
create or replace function public.duello2_sonraki(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  d public.duellolar%rowtype;
  v_altin uuid;
begin
  select * into d from public.duellolar where id = p_id for update;

  if d.uzatma then
    v_altin := (d.son_hamle ->> 'altin_kazanan')::uuid;
    if v_altin is not null then
      perform public.duello_bitir(p_id, v_altin);
    else
      perform public.duello2_uzatma_ac(p_id);   -- kazanan çıkana kadar yeni Altın Soru
    end if;
    return;
  end if;

  if d.saldiri_sirasi = 0 then
    update public.duellolar
       set saldiri_sirasi = 1, saldiran = oyuncu2, faz = 'kategori', kategori = null, soru_id = null,
           cevaplar = '{}'::jsonb, bitis1 = null, bitis2 = null,
           faz_bitis = now() + make_interval(secs => public.ayar_sayi('duello2_kategori_sn', 15)) + public.duello2_gosterim_payi(),
           son_hareket = now()
     where id = p_id;
    return;
  end if;

  if d.tur < public.ayar_sayi('duello_max_tur', 10) then
    update public.duellolar
       set tur = tur + 1, saldiri_sirasi = 0, saldiran = oyuncu1, faz = 'kategori',
           kategori = null, soru_id = null, cevaplar = '{}'::jsonb, bitis1 = null, bitis2 = null,
           faz_bitis = now() + make_interval(secs => public.ayar_sayi('duello2_kategori_sn', 15)) + public.duello2_gosterim_payi(),
           son_hareket = now()
     where id = p_id;
  elsif coalesce(d.puan1, 0) <> coalesce(d.puan2, 0) then
    perform public.duello_bitir(p_id, case when d.puan1 > d.puan2 then d.oyuncu1 else d.oyuncu2 end);
  else
    perform public.duello2_uzatma_ac(p_id);   -- eşitlik: Altın Soru
  end if;
end $$;

-- ---------------------------------------------------------------- jokerler: Altın Soru jokersiz
create or replace function public.duello2_skill_hak_kontrol(p_id uuid, p_user uuid, p_tur text)
returns void language plpgsql security definer set search_path = public as $$
declare
  d public.duellolar%rowtype;
  v_idx int;
  v_toplam int;
  v_tur int;
  v_soru int;
begin
  select * into d from public.duellolar where id = p_id;
  if p_tur not in ('elli', 'sure', 'soru_degistir', 'zaman_baskisi', 'ikinci_sans') then
    raise exception 'Bu skill Düello modunda kullanılamaz';
  end if;
  if coalesce(d.uzatma, false) then raise exception 'Altın Soru''da joker kullanılamaz'; end if;   -- 666
  v_idx := d.tur * 2 + d.saldiri_sirasi;
  select count(*), count(*) filter (where k.tur = p_tur), count(*) filter (where k.soru_index = v_idx)
    into v_toplam, v_tur, v_soru
    from public.joker_kullanimlari k
   where k.user_id = p_user and k.mac_tur = 'duello' and k.mac_id = p_id;
  if v_toplam >= public.ayar_sayi('duello2_skill_toplam_hak', 4) then
    raise exception 'Bu maçta en fazla % skill kullanabilirsin', public.ayar_sayi('duello2_skill_toplam_hak', 4);
  end if;
  if v_tur >= public.ayar_sayi('duello2_skill_tur_basi_hak', 2) then
    raise exception 'Bu skill için maç hakkın doldu';
  end if;
  if v_soru >= public.ayar_sayi('duello2_skill_soru_basi_hak', 1) then
    raise exception 'Bu soruda skill hakkını kullandın';
  end if;
end $$;

-- ---------------------------------------------------------------- bot: kategori ve kalkan
-- Saldırırken: %65 beklenen avantaj (değer × (kendi isabet − rakip oranı)) en yüksek iki kategoriden biri,
-- %20 kendi en güçlüsü, kalan rastgele.
create or replace function public.duello2_bot_kategori(p_id uuid, p_bot uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_kat text;
  d public.duellolar%rowtype;
  v_rakip_oran jsonb;
  v_rakip_yildiz jsonb;
  v_r double precision := random() * 100;
  v_akilli double precision := public.ayar_sayi('duello2_bot_zayif_secim_yuzde', 65);
  v_guclu double precision := public.ayar_sayi('duello2_bot_guclu_secim_yuzde', 20);
begin
  select * into d from public.duellolar where id = p_id;
  v_rakip_oran := coalesce(case when d.oyuncu1 = p_bot then d.profil2 else d.profil1 end -> 'oranlar', '{}'::jsonb);
  v_rakip_yildiz := coalesce(case when d.oyuncu1 = p_bot then d.yildiz2 else d.yildiz1 end, '{}'::jsonb);

  if v_r < v_akilli then
    select z.k into v_kat from (
      select k from unnest(public.duello_kategorileri()) k
       where public.duello2_kategori_uygun_mu(p_id, k)
       order by coalesce((d.puan_degerleri ->> coalesce(v_rakip_yildiz ->> k, '2'))::numeric, 3)
                * (public.bot_kategori_isabet(p_bot, k)
                   - coalesce(case when jsonb_typeof(v_rakip_oran -> k) = 'number' then (v_rakip_oran ->> k)::numeric end, 50) / 100.0)
                desc, random()
       limit 2) z
     order by random() limit 1;
  elsif v_r >= v_akilli + v_guclu then
    select k into v_kat from unnest(public.duello_kategorileri()) k
     where public.duello2_kategori_uygun_mu(p_id, k)
     order by random() limit 1;
  end if;

  if v_kat is null then
    select k into v_kat from unnest(public.duello_kategorileri()) k
     where public.duello2_kategori_uygun_mu(p_id, k)
     order by public.bot_kategori_isabet(p_bot, k) desc, random()
     limit 1;
  end if;
  if v_kat is null then
    select k into v_kat from unnest(public.duello_kategorileri()) k
     where k is distinct from public.duello2_aktif_kalkan(p_id)
     order by random() limit 1;
  end if;
  return v_kat;
end $$;

-- Savunurken korunacak kategori: saldıranın en çok kazanacağı yer — değer × (saldıran oranı − bot isabeti).
create or replace function public.duello2_bot_kalkan_kategori(p_id uuid, p_bot uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  d public.duellolar%rowtype;
  v_sal_oran jsonb;
  v_bot_yildiz jsonb;
  v_kat text;
begin
  select * into d from public.duellolar where id = p_id;
  v_sal_oran := coalesce(case when d.oyuncu1 = p_bot then d.profil2 else d.profil1 end -> 'oranlar', '{}'::jsonb);
  v_bot_yildiz := coalesce(case when d.oyuncu1 = p_bot then d.yildiz1 else d.yildiz2 end, '{}'::jsonb);
  select k into v_kat from unnest(public.duello_kategorileri()) k
   where public.duello2_kategori_uygun_mu(p_id, k)
   order by coalesce((d.puan_degerleri ->> coalesce(v_bot_yildiz ->> k, '2'))::numeric, 3)
            * (coalesce(case when jsonb_typeof(v_sal_oran -> k) = 'number' then (v_sal_oran ->> k)::numeric end, 50) / 100.0
               - public.bot_kategori_isabet(p_bot, k))
            desc, random()
   limit 1;
  return v_kat;
end $$;
revoke all on function public.duello2_bot_kalkan_kategori(uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------- bot tiki (kalkan 2 hak, Altın Soru jokersiz)
CREATE OR REPLACE FUNCTION public.duello2_bot_tik(p_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype;
  v_bot uuid;
  v_n int := 0;
  v_kat text;
  v_gecikme double precision;
  v_min double precision := public.ayar_ondalik('duello2_bot_kategori_min_sn', 1.5);
  v_max double precision := public.ayar_ondalik('duello2_bot_kategori_max_sn', 4);
  v_dc smallint;
  v_cevap smallint;
  v_kat_bas timestamptz;
  v_idx int;
begin
  -- Maç satırı kilitliyse (oyuncu eylemi / başka tik) bu tikte atla.
  select * into d from public.duellolar where id = p_id and surum = 2 for update skip locked;
  if not found or d.durum <> 'aktif' then return 0; end if;
  perform public.duello2_ilerlet(p_id);

  for v_bot in select p.id from public.profiles p
                where p.id in (d.oyuncu1, d.oyuncu2) and coalesce(p.is_bot, false) loop
    select * into d from public.duellolar where id = p_id;
    -- Kopuk oyuncu varken maç donar; bot da bekler.
    exit when d.durum <> 'aktif' or d.kopuk_at is not null;

    -- ---------- 650: kategori kalkanı (bot savunanken, hakkı duruyorsa) ----------
    -- Her kategori fazında bir kez zar (tohum: maç + tur indeksi); an fazın 1–4. saniyesi
    -- (tik aralığı yüzünden en geç +6 sn). Saldıran ondan önce seçtiyse faz geçmiştir — normal.
    if d.faz = 'kategori' and d.saldiran <> v_bot and not d.uzatma
       and public.duello_kalkan_kalan(d.tur, jsonb_array_length(case when v_bot = d.oyuncu1 then d.kalkanlar1 else d.kalkanlar2 end)) > 0   -- 666: 2 hak, iki pencere
       and public.ayar_sayi('duello2_kalkan_acik', 1) = 1 then
      v_idx := d.tur * 2 + d.saldiri_sirasi;
      v_kat_bas := d.faz_bitis - make_interval(secs => public.ayar_sayi('duello2_kategori_sn', 8));
      if now() >= v_kat_bas + make_interval(secs => 1 + 3 * public.bot_rasgele('d2klkz:' || p_id::text || ':' || v_idx))
         and now() < v_kat_bas + interval '6 seconds'
         and public.bot_rasgele('d2klk:' || p_id::text || ':' || v_idx) * 100
             < (case when d.tur > public.ayar_sayi('duello_kalkan_pencere1_son_tur', 5)   -- 666: 2. pencerede puanda gerideyse
                      and (case when v_bot = d.oyuncu1 then coalesce(d.puan1, 0) - coalesce(d.puan2, 0)
                                else coalesce(d.puan2, 0) - coalesce(d.puan1, 0) end) < 0
                     then public.ayar_sayi('duello2_bot_kalkan_kritik_yuzde', 45)
                     else public.ayar_sayi('duello2_bot_kalkan_yuzde', 12) end) then
        v_kat := public.duello2_bot_kalkan_kategori(p_id, v_bot);
        if v_kat is not null and public.duello2_kalkan_engel(p_id, v_bot, v_kat) is null then
          perform public.duello2_kalkan_uygula(p_id, v_bot, v_kat);
          perform public.duello_sinyal_ver(p_id);
          v_n := v_n + 1;
          select * into d from public.duellolar where id = p_id;
        end if;
      end if;
    end if;

    -- ---------- kategori ----------
    if d.faz = 'kategori' and d.saldiran = v_bot
       and now() >= d.faz_bitis - make_interval(secs => public.ayar_sayi('duello2_kategori_sn', 8))
                    + make_interval(secs => v_min + (v_max - v_min)
                        * public.bot_rasgele('d2kat:' || p_id::text || ':' || d.tur || ':' || d.saldiri_sirasi)) then
      v_kat := public.duello2_bot_kategori(p_id, v_bot);
      perform public.duello2_soru_ac(p_id, v_kat);
      perform public.duello_sinyal_ver(p_id);
      v_n := v_n + 1;
      select * into d from public.duellolar where id = p_id;
    end if;

    -- ---------- skill + cevap (saldırı, savunma, uzatma) ----------
    if d.faz = 'cevap' and not (d.cevaplar ? v_bot::text) and d.soru_baslangic is not null then
      v_gecikme := public.duello2_bot_cevap_gecikme(p_id, v_bot);
      -- Skill anı: cevap gecikmesinin %35–75'i (bot cevapladıktan sonra skill kullanılamaz).
      if now() >= d.soru_baslangic + make_interval(secs => v_gecikme * (0.35 + 0.4
             * public.bot_rasgele('d2skz:' || p_id::text || ':' || (d.tur * 2 + d.saldiri_sirasi) || ':' || v_bot::text))) then
        if not d.uzatma and public.duello2_bot_skill_dene(p_id, v_bot) then   -- 666: Altın Soru jokersiz
          v_n := v_n + 1;
          select * into d from public.duellolar where id = p_id;
          v_gecikme := public.duello2_bot_cevap_gecikme(p_id, v_bot);   -- Soru Değiştir süreyi baştan başlatır
        end if;
      end if;

      if now() >= d.soru_baslangic + make_interval(secs => v_gecikme) then
        -- İsabet KATEGORİYE göre (botun kişiliği: güçlü/zayıf kategoriler).
        select dogru_cevap into v_dc from public.questions where id = d.soru_id;
        if random() < public.bot_soru_isabet(v_bot, d.kategori, d.soru_id) then
          v_cevap := v_dc;
        else
          select x into v_cevap from generate_series(0, 3) x
           where x <> v_dc and not (x = any(coalesce(case when v_bot = d.oyuncu1 then d.elli1 else d.elli2 end, '{}')))
           order by random() limit 1;
        end if;
        begin
          perform public.duello2_bot_cevap(p_id, v_bot, v_cevap);
          v_n := v_n + 1;
        exception when others then
          -- Süre kaçtıysa soru "Yanıtsız" çözümlenir (duello2_ilerlet).
          raise warning 'duello2_bot_tik % cevap: %', p_id, sqlerrm;
        end;
      end if;
    end if;
  end loop;
  return v_n;
end $function$;

-- ---------------------------------------------------------------- durum (puan, yıldız, kalkan hakları)
CREATE OR REPLACE FUNCTION public.duello2_durum(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype;
  v_me uuid := auth.uid();
  v_rakip uuid;
  v_savunan uuid;
  v_ben1 boolean;
  v_idx int;
  v_dil text := public.oyuncu_dili();
  v_soru jsonb;
  v_arkadas boolean;
  v_ezeli jsonb;
  v_odul jsonb;
  v_gecmis jsonb;
  v_sayim jsonb;
  v_benim jsonb;
  v_bu_soruda int;
  v_rakip_soruda boolean;
  v_ilk smallint;
  v_kilit text;
begin
  perform public.hiz_siniri('duello_durum', 400, interval '60 seconds');
  d := public.duello_kilitle(p_id);
  v_ben1 := d.oyuncu1 = v_me;
  v_rakip := case when v_ben1 then d.oyuncu2 else d.oyuncu1 end;
  v_savunan := case when d.saldiran = d.oyuncu1 then d.oyuncu2 else d.oyuncu1 end;
  v_idx := d.tur * 2 + d.saldiri_sirasi;

  -- Soru iki oyuncuya AYNI ANDA görünür: yalnız cevap/sonuç fazında (saldıran önceden görmez).
  if d.soru_id is not null and (d.faz in ('cevap', 'sonuc') or d.durum <> 'aktif') then
    select jsonb_build_object('soru', sd.soru, 'secenekler', sd.secenekler, 'kategori', sd.kategori)
      into v_soru from public.soru_dilinde(d.soru_id, v_dil) sd;
  end if;

  v_arkadas := exists (select 1 from public.friendships f where f.durum = 'arkadas'
     and ((f.requester = v_me and f.addressee = v_rakip) or (f.requester = v_rakip and f.addressee = v_me)));
  if v_arkadas then
    select jsonb_build_object('ben', count(*) filter (where x.kazanan = v_me),
                              'rakip', count(*) filter (where x.kazanan = v_rakip))
      into v_ezeli
      from public.duellolar x
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

  -- Maç sonu özeti: her soru, doğru cevap ve "şık işaretlenmedi" (yanitsiz) bilgisi.
  if d.durum <> 'aktif' then
    select coalesce(jsonb_agg(jsonb_build_object(
             'tur', h.tur, 'uzatma', h.uzatma, 'kategori', h.kategori, 'saldiran', h.saldiran,
             'soru', sd.soru, 'secenekler', sd.secenekler, 'dogru_cevap', q.dogru_cevap,
             'benim_cevabim', case when h.saldiran = v_me then h.cevap_saldiran else h.cevap end,
             'ben_dogru', case when h.saldiran = v_me then h.dogru_saldiran else h.dogru end,
             'ben_yanitsiz', case when h.saldiran = v_me then h.yanitsiz_saldiran else h.yanitsiz_savunan end,
             'rakip_dogru', case when h.saldiran = v_me then h.dogru else h.dogru_saldiran end,
             'rakip_yanitsiz', case when h.saldiran = v_me then h.yanitsiz_savunan else h.yanitsiz_saldiran end,
             'yildiz', h.yildiz, 'deger', h.deger, 'altin_kazanan', h.altin_kazanan,   -- 666
             'benim_puanim', case when h.saldiran = v_me then h.puan_saldiran else h.puan_savunan end,
             'rakip_puani', case when h.saldiran = v_me then h.puan_savunan else h.puan_saldiran end,
             'kalkan', h.kalkan, 'savunan', h.savunan) order by h.id), '[]'::jsonb)   -- 650: kalkan
      into v_gecmis
      from public.duello_hamleler h
      join public.questions q on q.id = h.soru_id
      left join lateral public.soru_dilinde(h.soru_id, v_dil) sd on true
     where h.duello_id = p_id;
  end if;

  select coalesce(jsonb_object_agg(s.kategori, s.n), '{}'::jsonb) into v_sayim
    from (select h.kategori, count(*) n from public.duello_hamleler h
           where h.duello_id = p_id and not h.uzatma group by h.kategori) s;

  select jsonb_build_object('kullanilan', coalesce(sum(s.n), 0),
                            'sayilar', coalesce(jsonb_object_agg(s.tur, s.n), '{}'::jsonb))
    into v_benim
    from (select k.tur, count(*) n from public.joker_kullanimlari k
           where k.user_id = v_me and k.mac_tur = 'duello' and k.mac_id = p_id group by k.tur) s;
  select count(*) into v_bu_soruda from public.joker_kullanimlari k
   where k.user_id = v_me and k.mac_tur = 'duello' and k.mac_id = p_id and k.soru_index = v_idx;
  v_rakip_soruda := exists (select 1 from public.joker_kullanimlari k
   where k.user_id = v_rakip and k.mac_tur = 'duello' and k.mac_id = p_id and k.soru_index = v_idx);
  select s.ilk_cevap into v_ilk from public.skill_ikinci_sans_denemeleri s
   where s.mac_tur = 'duello' and s.mac_id = p_id and s.user_id = v_me and s.soru_index = v_idx;

  v_kilit := case
    when d.faz <> 'cevap' or d.durum <> 'aktif' then 'Soru açık değil'
    when d.cevaplar <> '{}'::jsonb or v_ilk is not null
      or exists (select 1 from public.skill_ikinci_sans_denemeleri s
                  where s.mac_tur = 'duello' and s.mac_id = p_id and s.soru_index = v_idx)
      then 'Cevap verildikten sonra soru değiştirilemez'
    when v_rakip_soruda then 'Rakibin bu soruda skill kullandı, soru değiştirilemez'
    when v_bu_soruda >= public.ayar_sayi('duello2_skill_soru_basi_hak', 1) then 'Bu soruda skill hakkını kullandın'
    else null end;

  return jsonb_build_object(
    'surum', 2,
    'id', d.id, 'durum', d.durum, 'dereceli', d.dereceli,
    'tur', d.tur, 'max_tur', public.ayar_sayi('duello_max_tur', 10), 'saldiri_sirasi', d.saldiri_sirasi,
    'uzatma', d.uzatma,
    'faz', d.faz, 'faz_bitis', d.faz_bitis, 'sunucu_zamani', clock_timestamp(),   -- 325: yanıtın çıktığı an
    'ben', v_me, 'saldiran', d.saldiran, 'savunan', v_savunan,
    'oyuncular', jsonb_build_array(
      (select jsonb_build_object('id', p.id, 'gorunen_ad', p.gorunen_ad, 'gorunen_avatar', p.gorunen_avatar,
               'gorunum', p.gorunum, 'puan', coalesce(d.puan1, 0), 'yildizlar', d.yildiz1, 'dogru', d.dogru1, 'profil', d.profil1,
               'unvan', public.oyuncu_unvani(p.id))
         from public.profiles p where p.id = d.oyuncu1),
      (select jsonb_build_object('id', p.id, 'gorunen_ad', p.gorunen_ad, 'gorunen_avatar', p.gorunen_avatar,
               'gorunum', p.gorunum, 'puan', coalesce(d.puan2, 0), 'yildizlar', d.yildiz2, 'dogru', d.dogru2, 'profil', d.profil2,
               'unvan', public.oyuncu_unvani(p.id))
         from public.profiles p where p.id = d.oyuncu2)),
    'kategoriler', to_jsonb(public.duello_kategorileri()),
    'puan_degerleri', coalesce(d.puan_degerleri, public.duello_puan_degerleri()),   -- 666
    'kategori_sayim', v_sayim,
    'uygun_kategoriler', case when d.faz = 'kategori' then
        (select coalesce(jsonb_agg(k order by k), '[]'::jsonb) from unnest(public.duello_kategorileri()) k
          where public.duello2_kategori_uygun_mu(p_id, k)) end,
    'kategori', d.kategori,
    'soru', v_soru,
    -- Rakibin CEVAPLADIĞI görünür, NE cevapladığı görünmez.
    'cevap', case when d.faz = 'cevap' then jsonb_build_object(
        'benim_bitis', case when v_ben1 then d.bitis1 else d.bitis2 end,
        'rakip_bitis', case when v_ben1 then d.bitis2 else d.bitis1 end,
        'ben_cevapladim', d.cevaplar ? v_me::text,
        'benim_cevabim', d.cevaplar -> v_me::text -> 'cevap',
        'rakip_cevapladi', d.cevaplar ? v_rakip::text,
        'elli_kapali', to_jsonb(case when v_ben1 then d.elli1 else d.elli2 end),
        'ikinci_sans_ilk_cevap', v_ilk) end,
    'son_hamle', d.son_hamle,
    'skill', jsonb_build_object(
       'set', to_jsonb(public.skill_setim('duello')),   -- 327: Düello seti
       'izinli', to_jsonb(public.duello2_izinli_skiller()),
       'toplam_hak', public.ayar_sayi('duello2_skill_toplam_hak', 4),
       'tur_basi_hak', public.ayar_sayi('duello2_skill_tur_basi_hak', 2),
       'soru_basi_hak', public.ayar_sayi('duello2_skill_soru_basi_hak', 1),
       'kullanilan', v_benim -> 'kullanilan',
       'sayilar', v_benim -> 'sayilar',
       'bu_soruda', v_bu_soruda,
       'rakip_bu_soruda', v_rakip_soruda,
       'soru_degistir_kilit', v_kilit,
       'envanter', (select coalesce(jsonb_object_agg(e.tur, e.adet), '{}'::jsonb)
                      from public.joker_envanter e where e.user_id = v_me),
       'fiyatlar', public.joker_fiyatlari(),
       'coin', (select coalesce(pr.coin, 0) from public.profiles pr where pr.id = v_me)),
    'sureler', jsonb_build_object(
       'kategori', public.ayar_sayi('duello2_kategori_sn', 8),
       'cevap', public.ayar_sayi('duello2_cevap_sn', 15),
       'ek_sure', public.ayar_sayi('duello_ek_sure_sn', 5),
       'zaman_baskisi_eksi', public.ayar_sayi('duello2_zaman_baskisi_eksi_sn', 5),
       'sonuc', public.ayar_sayi('duello_sonuc_sn', 3),
       'nabiz', public.duello_nabiz_sn(),
       'kopuk', public.ayar_sayi('duello_kopuk_sn', 25),
       -- 325: sayaç bu andan önce tam süreyi gösterir (ekran fazı geç görse de hızlanmaz).
       'gosterim_payi_ms', public.ayar_sayi('duello_gosterim_payi_ms', 1200),
       'gosterim_bas', case d.faz
          when 'kategori' then d.faz_bitis - make_interval(secs => public.ayar_sayi('duello2_kategori_sn', 8))
          when 'cevap' then d.soru_baslangic + public.duello2_gosterim_payi() end),
    'kazanan', d.kazanan, 'odul', v_odul, 'ezeli', v_ezeli, 'gecmis', v_gecmis,
    'rovans', jsonb_build_object('isteyen', d.rovans_isteyen, 'id', d.rovans_id,
       'gecerli', d.rovans_at is not null and d.rovans_at > now() - make_interval(secs => public.ayar_sayi('duello_rovans_sn', 60)))
  )
  -- 666: Kategori Kalkanı — maçta 2 hak (Tur 1–pencere1: 1 açık; pencere2'ye kadar: 2, kullanılmayan kaybolmaz).
  -- kullanilan: [{kategori, idx, tur}]; kalan: şu an kullanılabilecek hak; aktif: bu seçimde korunan kategori.
  || jsonb_build_object('kalkan', jsonb_build_object(
       'acik', d.surum = 2 and public.ayar_sayi('duello2_kalkan_acik', 1) = 1,
       'son_sn', public.ayar_sayi('duello2_kalkan_son_sn', 5),
       'toplam_hak', 2,
       'pencere1_son', public.ayar_sayi('duello_kalkan_pencere1_son_tur', 5),
       'pencere2_son', public.ayar_sayi('duello_kalkan_pencere2_son_tur', 10),
       'oyuncular', jsonb_build_object(
          d.oyuncu1::text, jsonb_build_object('kullanilan', d.kalkanlar1,
             'kalan', case when d.uzatma then 0 else public.duello_kalkan_kalan(d.tur, jsonb_array_length(d.kalkanlar1)) end),
          d.oyuncu2::text, jsonb_build_object('kullanilan', d.kalkanlar2,
             'kalan', case when d.uzatma then 0 else public.duello_kalkan_kalan(d.tur, jsonb_array_length(d.kalkanlar2)) end)),
       'aktif', public.duello2_aktif_kalkan(p_id)));
end $function$;

-- ---------------------------------------------------------------- yeni oyuncu kilidi: arama, davet, kabul
CREATE OR REPLACE FUNCTION public.duello_ara(p_dereceli boolean DEFAULT true)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v_id uuid;
  v_lig int;
  v_rakip uuid;
  v_bas timestamptz;
  v_bot uuid;
begin
  perform public.hiz_siniri('duello_ara', 90, interval '60 seconds');
  if v_me is null then raise exception 'Giriş gerekli'; end if;

  -- Devam eden düellom varsa ona dön
  select x.id into v_id from public.duellolar x
   where x.durum = 'aktif' and v_me in (x.oyuncu1, x.oyuncu2) limit 1;
  if found then
    delete from public.duello_kuyrugu where user_id = v_me;
    return v_id;
  end if;

  perform public.duello_acilis_kontrol(v_me, true);   -- 666: yeni oyuncu kilidi
  delete from public.duello_kuyrugu where created_at < now() - interval '90 seconds';
  select public.lig_sirasi(coalesce(lig, 'bronz')) into v_lig from public.profiles where id = v_me;
  v_lig := coalesce(v_lig, 1);

  -- Gerçek rakip: aynı giriş türü, kendi ligi ± 1
  select q.user_id into v_rakip
    from public.duello_kuyrugu q
    join public.profiles pr on pr.id = q.user_id
   where q.user_id <> v_me
       and not public.iletisim_engelli(v_me, q.user_id)   -- 630: engelli çift eşleşmez
     and q.dereceli = coalesce(p_dereceli, true)
     and public.lig_sirasi(coalesce(pr.lig, 'bronz')) between v_lig - 1 and v_lig + 1
   order by q.created_at
   limit 1
   for update of q skip locked;

  if v_rakip is not null then
    perform public.mac_kotasi_kontrol();
    return public.duello_olustur(v_rakip, v_me, p_dereceli);
  end if;

  select q.created_at into v_bas from public.duello_kuyrugu q where q.user_id = v_me;
  if v_bas is null then
    insert into public.duello_kuyrugu (user_id, dereceli) values (v_me, coalesce(p_dereceli, true))
    on conflict (user_id) do update set dereceli = excluded.dereceli, created_at = now();
    return null;
  end if;
  update public.duello_kuyrugu set dereceli = coalesce(p_dereceli, true) where user_id = v_me;

  -- 370: kimse yoksa aramaya özgü rastgele sürede (üçgen 3-6-15 sn) gizli bot (lig ± 1).
  if not public.eslesme_bot_hazir(v_me, v_bas, 0.5) then
    return null;
  end if;

  v_bot := public.bot_sec(v_me);
  if v_bot is null then raise exception 'Şu an uygun rakip yok, birazdan tekrar dene.'; end if;
  perform public.mac_kotasi_kontrol();
  perform public.bot_kisilik_tohumla(v_bot);
  return public.duello_olustur(v_me, v_bot, p_dereceli);
end $function$;

CREATE OR REPLACE FUNCTION public.duello_davet_et(p_rakip uuid, p_dereceli boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v_davet uuid;
  v_duello uuid;
  v_bot boolean;
  v_ad text;
begin
  -- 440 (Ida, 24 Eyl 2026): açık botla antrenman her zaman serbest; botla lig puanı kasılamaz.
  if exists (select 1 from public.profiles b where b.id = p_rakip and public.acik_bot_mu(b.is_bot, b.bot_turu)) then
    p_dereceli := false;
  end if;
  perform public.hiz_siniri('duello_davet_et', 30, interval '60 seconds');
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  if p_rakip = v_me then raise exception 'Kendine meydan okuyamazsın'; end if;
  if not exists (select 1 from public.profiles where id = p_rakip) then
    raise exception 'Oyuncu bulunamadı';
  end if;
  if not public.oynanabilir_mi(p_rakip) then
    raise exception 'Yalnız arkadaşlarına ve botlara meydan okuyabilirsin.';
  end if;
  perform public.duello_acilis_kontrol(v_me, true);        -- 666: yeni oyuncu kilidi
  perform public.duello_acilis_kontrol(p_rakip, false);

  delete from public.duello_davetleri
   where durum = 'bekliyor' and created_at < now() - interval '24 hours';

  if exists (select 1 from public.duellolar
              where durum = 'aktif' and (v_me in (oyuncu1, oyuncu2) or p_rakip in (oyuncu1, oyuncu2))) then
    raise exception 'Devam eden bir düello var';
  end if;
  -- Kural 5: aynı modda ikinci davet yok
  if exists (select 1 from public.duello_davetleri
              where durum = 'bekliyor'
                and ((kuran = v_me and rakip = p_rakip) or (kuran = p_rakip and rakip = v_me))) then
    raise exception 'Bu oyuncuyla bekleyen bir düello davetin zaten var';
  end if;
  -- Kural 2: modlar toplamında en fazla 2 bekleyen davet (Paket 24 · A.2)
  perform public.davet_siniri_kontrol(p_rakip);

  perform public.mac_kotasi_kontrol();

  insert into public.duello_davetleri (kuran, rakip, dereceli)
  values (v_me, p_rakip, coalesce(p_dereceli, true))
  returning id into v_davet;

  select coalesce(is_bot, false) and coalesce(acik_bot, false) into v_bot
    from public.profiles where id = p_rakip;
  if coalesce(v_bot, false) then
    v_duello := public.duello_olustur(v_me, p_rakip, coalesce(p_dereceli, true));
    update public.duello_davetleri
       set durum = 'kabul', duello_id = v_duello, yanit_at = now()
     where id = v_davet;
  else
    -- Davet edilen haberdar olsun (bant + telefon bildirimi). Bot ise bildirim_yaz kendisi susar.
    select gorunen_ad into v_ad from public.profiles where id = v_me;
    perform public.bildirim_yaz(
      p_rakip,
      'duello_daveti',
      coalesce(v_ad, 'Bir oyuncu') || ' seni düelloya çağırdı!',
      '/bildim/duello'
    );
  end if;

  return jsonb_build_object('davet_id', v_davet, 'duello_id', v_duello);
end;
$function$;

CREATE OR REPLACE FUNCTION public.duello_davet_cevap(p_id uuid, p_kabul boolean)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  d public.duello_davetleri%rowtype;
  v_duello uuid;
  v_ad text;
begin
  perform public.hiz_siniri('duello_davet_cevap', 60, interval '60 seconds');
  if v_me is null then raise exception 'Giriş gerekli'; end if;

  select * into d from public.duello_davetleri where id = p_id for update;
  if not found then raise exception 'Davet bulunamadı'; end if;
  if d.rakip <> v_me then raise exception 'Bu davet sana ait değil'; end if;
  if d.durum <> 'bekliyor' then raise exception 'Davet zaten yanıtlanmış'; end if;

  if not coalesce(p_kabul, false) then
    update public.duello_davetleri set durum = 'red', yanit_at = now() where id = p_id;
    return null;
  end if;
  perform public.duello_acilis_kontrol(v_me, true);        -- 666: yeni oyuncu kilidi
  perform public.duello_acilis_kontrol(d.kuran, false);

  if exists (select 1 from public.duellolar
              where durum = 'aktif' and (v_me in (oyuncu1, oyuncu2) or d.kuran in (oyuncu1, oyuncu2))) then
    raise exception 'Devam eden bir düello var';
  end if;
  -- Kural 4: aynı rakiple başka bir modda aktif oyun varsa bu davet kabul edilemez
  perform public.davet_kabul_kontrol(d.kuran);
  perform public.mac_kotasi_kontrol();

  v_duello := public.duello_olustur(d.kuran, v_me, d.dereceli);
  update public.duello_davetleri
     set durum = 'kabul', duello_id = v_duello, yanit_at = now()
   where id = p_id;

  -- Daveti gönderen başka sayfadaysa da görsün (BildirimToast "Oyuna git")
  select gorunen_ad into v_ad from public.profiles where id = v_me;
  perform public.bildirim_yaz(
    d.kuran,
    'duello_kabul',
    coalesce(v_ad, 'Rakibin') || ' düello davetini kabul etti - düello başlıyor!',
    '/bildim/duello/' || v_duello::text
  );
  return v_duello;
end;
$function$;

-- ---------------------------------------------------------------- bot tepkisi: can yerine puan/kazanan
create or replace function public.trg_duello_bot_tepki()
returns trigger language plpgsql security definer set search_path = public as $function$
declare
  v_bot uuid;
  v_insan uuid;
  v_mod text;
  v_bot_dogru boolean;
  v_insan_dogru boolean;
  v_seri int;
  v_onceki int;
  v_olay text;
begin
  select p.id into v_bot from public.profiles p
   where p.id in (new.oyuncu1, new.oyuncu2) and coalesce(p.is_bot, false) limit 1;
  if v_bot is null then return null; end if;
  v_insan := case when v_bot = new.oyuncu1 then new.oyuncu2 else new.oyuncu1 end;
  v_mod := public.tepki_mac_modu('duello', new.id, v_insan);
  if v_mod is null or not public.tepki_mod_acik(v_mod) then return null; end if;

  v_bot_dogru := coalesce((new.son_hamle -> 'cevaplar' -> v_bot::text ->> 'dogru')::boolean, false);
  v_insan_dogru := coalesce((new.son_hamle -> 'cevaplar' -> v_insan::text ->> 'dogru')::boolean, false);
  v_seri := greatest(2, public.ayar_sayi('tepki_bot_seri', 3)::int);

  if new.durum = 'bitti' then
    -- maç sonu
    v_olay := case when new.kazanan = v_bot then 'dogru'
                   when new.kazanan = v_insan then 'saygi'
                   else 'dusun' end;
  elsif not v_insan_dogru then
    -- rakip hatası (yanlış ya da cevapsız)
    v_olay := case when v_bot_dogru then 'dogru' else 'dusun' end;
  elsif v_bot_dogru then
    select count(*) into v_onceki from (
      select (h.saldiran = v_bot and coalesce(h.dogru_saldiran, false)) or (h.savunan = v_bot and h.dogru) as bd
        from public.duello_hamleler h
       where h.duello_id = new.id
       order by h.id desc
       limit v_seri - 1) x
     where x.bd;
    if v_onceki < v_seri - 1 then return null; end if;
    v_olay := 'dogru';   -- doğru cevap serisi
  else
    return null;   -- anlamlı an değil
  end if;

  perform public.bot_tepki_gonder('tepki-duello-' || new.id::text, v_bot, v_olay);
  return null;
exception when others then
  raise warning 'trg_duello_bot_tepki (%): %', new.id, sqlerrm;
  return null;
end;
$function$;

-- ---------------------------------------------------------------- rozetler: can ölçütleri puana uyarlandı
update public.rozet_tanimlari
   set aciklama_tr = 'Düello''yu en çok 3 puan farkla kazan',
       aciklama_en = 'Win a Duel by 3 points or fewer'
 where anahtar = 'ozel_son_can';
update public.rozet_tanimlari
   set aciklama_tr = 'Düello''da 10 puan gerideyken maçı kazan',
       aciklama_en = 'Win a Duel after trailing by 10 points'
 where anahtar = 'ozel_geri_donus';
update public.rozet_tanimlari
   set ad_tr = 'Altın Dokunuş', ad_en = 'Golden Touch',
       aciklama_tr = 'Altın Soru''ya giden bir Düello''yu kazan',
       aciklama_en = 'Win a Duel decided by a Golden Question'
 where anahtar = 'gizli_2';


-- ---------------------------------------------------------------- rozet ölçütü
CREATE OR REPLACE FUNCTION public.rozet_olcut(p_user uuid, p_olcut text)
 RETURNS bigint
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v bigint := 0;
  v_fark int;
  v_min int;
begin
  if p_user is null or p_olcut is null then return 0; end if;

  if p_olcut = 'level' then
    select coalesce(level, 1) into v from public.profiles where id = p_user;

  elsif p_olcut = 'klasik_galibiyet' then
    select count(*) into v from public.matches m
     where m.durum = 'bitti' and m.kazanan = p_user;

  elsif p_olcut = 'saf_bilgi_galibiyet' then
    select count(*) into v from public.matches m
     where m.durum = 'bitti' and m.kazanan = p_user and coalesce(m.jokersiz, false);

  elsif p_olcut = 'duello_galibiyet' then
    select count(*) into v from public.duellolar d
     where d.durum = 'bitti' and d.kazanan = p_user;

  elsif p_olcut = 'seri' then
    select greatest(coalesce(seri_gun, 0), coalesce(seri_en_uzun, 0), coalesce(seri, 0))
      into v from public.profiles where id = p_user;

  elsif p_olcut like 'kategori:%' then
    select coalesce(max(kd.dogru_sayisi), 0) into v from public.kategori_dogru kd
     where kd.user_id = p_user and kd.kategori = substr(p_olcut, 10);

  elsif p_olcut = 'kasif' then
    v_min := public.ayar_sayi('rozet_kasif_min_dogru', 10)::int;
    select count(*) into v from public.kategori_dogru kd
     where kd.user_id = p_user and kd.dogru_sayisi >= v_min;

  elsif p_olcut = 'turnuva_katilim' then
    select count(*) into v from public.tournament_players tp
      join public.tournaments t on t.id = tp.tournament_id
     where tp.user_id = p_user and t.durum = 'bitti' and tp.terk_at is null;

  elsif p_olcut in ('turnuva_ilk10', 'turnuva_ilk3') then
    -- Sıra, ödül dağıtımıyla aynı düzen (turnuva_odullerini_dagit)
    select count(*) into v from (
      select tp.user_id,
             row_number() over (partition by tp.tournament_id
                                order by tp.elendi asc, tp.elenme_sorusu desc nulls first,
                                         tp.dogru_sayisi desc, tp.user_id) as sira
        from public.tournament_players tp
        join public.tournaments t on t.id = tp.tournament_id and t.durum = 'bitti'
       where tp.terk_at is null and tp.tournament_id in (select x.tournament_id from public.tournament_players x where x.user_id = p_user)
    ) s
     where s.user_id = p_user and s.sira <= case when p_olcut = 'turnuva_ilk3' then 3 else 10 end;

  elsif p_olcut = 'turnuva_sampiyon' then
    select count(*) into v from public.tournaments t
     where t.durum = 'bitti' and t.kazanan = p_user;

  elsif p_olcut = 'turnuva_seans' then
    select count(distinct t.seans) into v
      from public.tournament_players tp
      join public.tournaments t on t.id = tp.tournament_id
     where tp.user_id = p_user and tp.terk_at is null
       and t.seans in (select jsonb_array_elements_text(o.deger) from public.oyun_ayarlari o
                        where o.anahtar = 'turnuva_saatleri' and jsonb_typeof(o.deger) = 'array');

  elsif p_olcut in ('lig_gumus', 'lig_altin', 'lig_elmas', 'lig_efsane') then
    -- Bir kez çıkılan lig sayılır (düşse de rozet kalır): profil + kalıcı lig çerçeveleri
    select case when greatest(
             public.lig_sirasi(coalesce(p.lig, 'bronz')),
             coalesce((select max(public.lig_sirasi(c.lig)) from public.lig_cerceveleri c where c.user_id = p_user), 1)
           ) >= public.lig_sirasi(substr(p_olcut, 5)) then 1 else 0 end
      into v from public.profiles p where p.id = p_user;

  elsif p_olcut = 'klasik_tam' then
    select count(*) into v from public.matches m
     where m.durum = 'bitti' and p_user in (m.oyuncu1, m.oyuncu2) and m.terk_eden is distinct from p_user
       and coalesce(array_length(m.soru_ids, 1), 0) > 0
       and (select count(distinct a.soru_index) from public.match_answers a
             where a.match_id = m.id and a.user_id = p_user and a.dogru) >= array_length(m.soru_ids, 1);

  elsif p_olcut = 'duello_son_can' then
    -- 666: puan sisteminde "Son Nefes" = en çok rozet_kil_payi_puan (3) farkla kazanılan düello
    -- (Altın Soru'suz, terksiz). Eski can maçları (puan1 boş) eski kuralla sayılmaya devam eder.
    select count(*) into v from public.duellolar d
     where d.durum = 'bitti' and d.kazanan = p_user
       and ((d.puan1 is null and ((d.oyuncu1 = p_user and d.can1 = 1) or (d.oyuncu2 = p_user and d.can2 = 1)))
         or (d.puan1 is not null and not coalesce(d.uzatma, false) and d.terk_eden is null
             and abs(d.puan1 - d.puan2) between 1 and public.ayar_sayi('rozet_kil_payi_puan', 3)));

  elsif p_olcut = 'duello_geri_donus' then
    -- 666: puan maçında rakip en az rozet_geri_donus_puan_farki (10) öndeyken kazanmak; eski maçlarda can farkı.
    v_fark := public.ayar_sayi('rozet_geri_donus_can_farki', 2)::int;
    v_min := public.ayar_sayi('rozet_geri_donus_puan_farki', 10)::int;
    select count(*) into v from public.duellolar d
     where d.durum = 'bitti' and d.kazanan = p_user
       and exists (
         select 1 from (
           select case when d.puan1 is null then
                    sum(case when h.can_kaybeden = p_user then 1
                             when h.can_kaybeden is not null then -1 else 0 end) over (order by h.id)
                  else
                    sum(case when h.saldiran = p_user then coalesce(h.puan_savunan, 0) - coalesce(h.puan_saldiran, 0)
                             else coalesce(h.puan_saldiran, 0) - coalesce(h.puan_savunan, 0) end) over (order by h.id)
                  end as fark
             from public.duello_hamleler h where h.duello_id = d.id
         ) x where x.fark >= case when d.puan1 is null then v_fark else v_min end);

  elsif p_olcut = 'uzatma_galibiyet' then
    select count(*) into v from public.duellolar d
     where d.durum = 'bitti' and d.kazanan = p_user and coalesce(d.uzatma, false);

  elsif p_olcut = 'rovans_galibiyet' then
    select (select count(*) from public.matches m
             where m.durum = 'bitti' and m.kazanan = p_user and coalesce(m.rovans, false))
         + (select count(*) from public.duellolar d
             where d.durum = 'bitti' and d.kazanan = p_user and d.onceki_id is not null)
      into v;

  elsif p_olcut = 'galibiyet_serisi' then
    -- Klasik + Düello, bitiş sırasıyla; beraberlik ve mağlubiyet seriyi keser.
    with g as (
      select coalesce(m.bitis, m.created_at) as t, coalesce(m.kazanan = p_user, false) as w
        from public.matches m
       where m.durum = 'bitti' and p_user in (m.oyuncu1, m.oyuncu2)
      union all
      select coalesce(d.bitis, d.son_hareket, d.created_at), coalesce(d.kazanan = p_user, false)
        from public.duellolar d
       where d.durum = 'bitti' and p_user in (d.oyuncu1, d.oyuncu2)
    ), n as (
      select w, sum(case when w then 0 else 1 end) over (order by t rows unbounded preceding) as grp from g
    )
    select coalesce(max(c), 0) into v from (select count(*) as c from n where w group by grp) x;

  elsif p_olcut = 'arkadas' then
    select count(*) into v from public.friendships f
     where f.durum = 'arkadas' and p_user in (f.requester, f.addressee);

  elsif p_olcut = 'arkadas_mac' then
    with ark as (
      select case when f.requester = p_user then f.addressee else f.requester end as id
        from public.friendships f
       where f.durum = 'arkadas' and p_user in (f.requester, f.addressee)
    )
    select (select count(*) from public.matches m
             where m.durum = 'bitti' and p_user in (m.oyuncu1, m.oyuncu2) and m.terk_eden is distinct from p_user
               and (case when m.oyuncu1 = p_user then m.oyuncu2 else m.oyuncu1 end) in (select id from ark))
         + (select count(*) from public.duellolar d
             where d.durum = 'bitti' and p_user in (d.oyuncu1, d.oyuncu2) and d.terk_eden is distinct from p_user
               and (case when d.oyuncu1 = p_user then d.oyuncu2 else d.oyuncu1 end) in (select id from ark))
      into v;

  elsif p_olcut = 'davet' then
    select count(*) into v from public.davetler dv
     where dv.davet_eden = p_user and dv.durum in ('odullendi', 'sinir_asildi');

  elsif p_olcut = 'mac_mesaji' then
    select case when exists (select 1 from public.match_messages mm where mm.user_id = p_user) then 1 else 0 end into v;

  else
    v := 0;   -- 'olay' ve bilinmeyenler: yalnız olay anında verilir
  end if;

  return coalesce(v, 0);
end;
$function$;
