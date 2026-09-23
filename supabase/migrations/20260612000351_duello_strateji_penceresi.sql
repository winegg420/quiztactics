-- 351 · Düello strateji penceresi (Ida onayı, 23 Eyl 2026).
-- Düello'nun kimliği strateji; saldıranın tek avantajı kategori seçmek. Süre düşünmeye yetmiyordu.
--   1. Kategori seçim süresi 8 → 15 sn (cevap süresi 15 aynı; gösterim payı aynı).
--   2. Seçim ekranında her kategoride rakibin ve senin doğru oranın: maç BAŞINDA bir kez
--      hesaplanır, profil1/profil2 anlık görüntüsüne 'oranlar' olarak girer. duello2_durum
--      bu kolonları zaten döndürüyor → yoklamalarda ek sorgu/hesap YOK (Disk IO).
--      Kaynak kategori_istatistik: Klasik + Düello + Grup + Turnuva + Hızlı (bütün modlar).
--      Az veri kuralı: bir kategoride `duello_oran_min_cevap` (5) cevaptan azsa null → "—".
--      Botlar da aynı kuraldan geçer (bot_mac_istatistik_simule ile gerçek geçmişleri var);
--      ayrı dal yok → gizli bot oran görünümüyle gerçek oyuncudan ayırt edilemez.
--   3. Bot kategori seçimi 3–8 sn (tik 2 sn → pratikte 3–10 sn) ve biraz akıllı:
--      %65 rakibin (anlık görüntüdeki) en zayıf iki uygun kategorisinden biri,
--      %20 kendi en güçlüsü, kalan rastgele. Rakibin oranı bilinmiyorsa kendi en güçlüsü.
-- Rakamlar oyun_ayarlari'nda, hepsi test değeri.

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('duello_oran_min_cevap', '5', 'Düello kategori ekranında oran göstermek için kategorideki asgari cevap (altı "—")'),
  ('duello2_bot_zayif_secim_yuzde', '65', 'Düello botu: rakibin en zayıf (iki) kategorisinden birini seçme olasılığı (%)'),
  ('duello2_bot_guclu_secim_yuzde', '20', 'Düello botu: kendi en güçlü kategorisini seçme olasılığı (%); kalan rastgele')
on conflict (anahtar) do nothing;

update public.oyun_ayarlari set deger = '15'::jsonb,
  aciklama = 'Düello 1.0: saldıranın kategori seçim süresi (sn) (351: 8 → 15, strateji penceresi)'
where anahtar = 'duello2_kategori_sn';
update public.oyun_ayarlari set deger = '3'::jsonb where anahtar = 'duello2_bot_kategori_min_sn';
update public.oyun_ayarlari set deger = '8'::jsonb where anahtar = 'duello2_bot_kategori_max_sn';

-- Oyuncunun kategori başına doğru oranı (0–100) · veri azsa null. İç kullanım.
create or replace function public.duello_oranlar_ic(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_object_agg(k.kat,
           case when coalesce(s.toplam, 0) >= greatest(1, public.ayar_sayi('duello_oran_min_cevap', 5))
                then round(100.0 * s.dogru / s.toplam)::int end), '{}'::jsonb)
    from unnest(public.duello_kategorileri()) k(kat)
    left join public.kategori_istatistik s on s.user_id = p_user and s.kategori = k.kat;
$$;
revoke all on function public.duello_oranlar_ic(uuid) from public, anon, authenticated;

-- Maç oluşturma: profil anlık görüntüsüne 'oranlar' eklendi (başka değişiklik yok).
CREATE OR REPLACE FUNCTION public.duello_olustur(p_a uuid, p_b uuid, p_dereceli boolean, p_onceki uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_id uuid;
  v_can int := public.ayar_sayi('duello_can', 3)::int;
  v_surum smallint := case when public.ayar_sayi('duello_surum', 1) = 2
                             or (public.duello_v2_test_kullanicisi_mi(p_a)
                                 and (public.duello_v2_test_kullanicisi_mi(p_b) or public.duello_bot_mu(p_b)))
                             or (public.duello_v2_test_kullanicisi_mi(p_b)
                                 and (public.duello_v2_test_kullanicisi_mi(p_a) or public.duello_bot_mu(p_a)))
                        then 2 else 1 end;
  v_p1 jsonb;
  v_p2 jsonb;
  v_x uuid;
begin
  if v_surum = 2 and random() < 0.5 then
    v_x := p_a; p_a := p_b; p_b := v_x;
  end if;

  -- Profil ve en zayıf kategori MAÇ BAŞINDA sabitlenir.
  select public.oyuncu_kategori_profili_ic(p_a) into v_p1;
  select public.oyuncu_kategori_profili_ic(p_b) into v_p2;
  -- 351: strateji penceresi oranları (bir kez; yoklamalarda yeniden hesaplanmaz).
  v_p1 := coalesce(v_p1, '{}'::jsonb) || jsonb_build_object('oranlar', public.duello_oranlar_ic(p_a));
  v_p2 := coalesce(v_p2, '{}'::jsonb) || jsonb_build_object('oranlar', public.duello_oranlar_ic(p_b));

  insert into public.duellolar (oyuncu1, oyuncu2, dereceli, can1, can2, saldiran, faz, faz_bitis,
                                profil1, profil2, zayif1, zayif2, onceki_id, surum)
  values (p_a, p_b, coalesce(p_dereceli, true), v_can, v_can, p_a, 'kategori',
          now() + make_interval(secs => case when v_surum = 2
                                             then public.ayar_sayi('duello2_kategori_sn', 8)
                                             else public.duello_kategori_suresi(p_a) end)
          + case when v_surum = 2 then public.duello2_gosterim_payi() else interval '0' end,   -- Paket 20 IV.3 · 325 gösterim payı
          v_p1, v_p2, public.duello_en_zayif(p_a), public.duello_en_zayif(p_b), p_onceki, v_surum)
  returning id into v_id;

  insert into public.duello_sinyal (duello_id, oyuncu1, oyuncu2) values (v_id, p_a, p_b);
  delete from public.duello_kuyrugu where user_id in (p_a, p_b);
  return v_id;
end $function$;

-- Bot kategori seçimi: çoğunlukla rakibin zayıfı, bazen kendi güçlüsü, bazen rastgele.
CREATE OR REPLACE FUNCTION public.duello2_bot_kategori(p_id uuid, p_bot uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_kat text;
  d public.duellolar%rowtype;
  v_rakip_oran jsonb;
  v_r double precision := random() * 100;
  v_zayif double precision := public.ayar_sayi('duello2_bot_zayif_secim_yuzde', 65);
  v_guclu double precision := public.ayar_sayi('duello2_bot_guclu_secim_yuzde', 20);
begin
  select * into d from public.duellolar where id = p_id;
  v_rakip_oran := case when d.oyuncu1 = p_bot then d.profil2 else d.profil1 end -> 'oranlar';

  if v_r < v_zayif and v_rakip_oran is not null then
    -- Rakibin en zayıf iki uygun kategorisinden biri (hep aynısı olmasın).
    select z.k into v_kat from (
      select k from unnest(public.duello_kategorileri()) k
       where public.duello2_kategori_uygun_mu(p_id, k)
         and jsonb_typeof(v_rakip_oran -> k) = 'number'
       order by (v_rakip_oran ->> k)::int asc, random()
       limit 2) z
     order by random() limit 1;
  elsif v_r >= v_zayif + v_guclu then
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
    select k into v_kat from unnest(public.duello_kategorileri()) k order by random() limit 1;
  end if;
  return v_kat;
end $function$;
