-- 470 · Düello zayıf nokta kuralı + kategori limiti (Ida, 24 Eyl 2026 — kesin karar).
--
-- 1. ZAYIF NOKTA: her oyuncunun en zayıf kategorisi maç BAŞINDA sabitlenir (duello_olustur) ve
--    iki tarafa da görünür (profil1/profil2 anlık görüntüsüne 'zayif' — duello2_durum bu kolonları
--    zaten döndürüyor; ek sorgu yok). En zayıf = kategori_istatistik doğru oranı en düşük olan;
--    YALNIZ en az `duello2_zayif_min_cevap` (5) cevaplı kategoriler arasından. Hiç yoksa zayıf yok
--    (null) → o oyuncu için kural işlemez. Eşitlikte çok cevaplı olan, sonra ad sırası (belirlenimci).
--    Botlarda da aynı: botun kendi cevap geçmişinden (kategori_istatistik'te satırları var).
-- 2. KURAL (duello2_cozumle, FOR UPDATE altında): saldıran, savunanın zayıf kategorisini seçtiyse ve
--    savunan doğru bildiyse saldıran 1 can kaybeder — saldıran da doğru bilse bile. İkisi yanlışsa
--    kimse; yalnız saldıran doğruysa savunan kaybeder (normal kural). Uzatmada kategori rastgele
--    geldiği için (kimse seçmedi) kural işlemez. Hamle kaydında `riskli` = true, son_hamle'de
--    'zayif_saldiri' = true.
--    Kaynak bilerek profil->>'zayif' (duellolar.zayif1/2 değil): deploy anında süren eski maçlarda
--    profil'de zayif yok → kural yalnız yeni maçlarda işler (oyuncunun görmediği kural uygulanmaz).
--    zayif1/zayif2 kolonları da yeni değerle yazılır (kayıt tutarlılığı).
-- 3. SÜRE DOLUNCA otomatik seçim (duello2_ilerlet) uygun kategorilerden rastgele, ama savunanın zayıf
--    kategorisini — başka uygun seçenek varsa — seçmez: saldıran seçmediği bir risk yüzünden can
--    kaybetmesin. (Bot kendi seçer: duello2_bot_kategori değişmedi, uygunluk kuralına zaten uyar.)
-- 4. KATEGORİ LİMİTİ: her kategori maçta en çok 3 kez (duello_kategori_max 2 → 3; v1 artık
--    kullanılmıyor, anahtar ortak). "Arka arkaya seçilemez" = maçtaki bir önceki seçimle aynı olamaz
--    (iki saldıran arasında da) — mevcut duello2_kategori_uygun_mu kuralı, değişmedi.
--    Sunucu reddeder (duello2_kategori_sec → duello2_kategori_uygun_mu), bot ve otomatik seçim aynı
--    fonksiyondan geçer.
-- Yetki: yeni iç fonksiyonlar mevcut kalıpla (security definer, istemciye kapalı); var olan hiçbir
-- yetki değişmedi (CREATE OR REPLACE ACL'yi korur).

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('duello2_zayif_min_cevap', '5', 'Düello zayıf nokta: kategorinin en zayıf sayılabilmesi için oyuncunun o kategorideki asgari cevabı (hiçbir kategori yetmezse zayıf yok)')
on conflict (anahtar) do nothing;

update public.oyun_ayarlari set deger = '3'::jsonb,
  aciklama = 'Düello: bir kategori maçta en çok kaç kez seçilebilir (470: 2 → 3; uzatma sayılmaz)'
where anahtar = 'duello_kategori_max';

-- ---------------------------------------------------------------- en zayıf kategori (Düello 1.0)
create or replace function public.duello2_en_zayif(p_user uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select k.kategori from public.kategori_istatistik k
   where k.user_id = p_user
     and k.kategori = any(public.duello_kategorileri())
     and k.toplam >= greatest(1, public.ayar_sayi('duello2_zayif_min_cevap', 5))
   order by k.dogru::numeric / k.toplam asc, k.toplam desc, k.kategori asc
   limit 1;
$$;
revoke all on function public.duello2_en_zayif(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------- süre dolunca otomatik kategori
create or replace function public.duello2_otomatik_kategori(p_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.duellolar%rowtype;
  v_zayif text;
  v_kat text;
begin
  select * into d from public.duellolar where id = p_id;
  v_zayif := (case when d.saldiran = d.oyuncu1 then d.profil2 else d.profil1 end) ->> 'zayif';
  select k into v_kat from unnest(public.duello_kategorileri()) k
   where public.duello2_kategori_uygun_mu(p_id, k)
   order by (k is not distinct from v_zayif), random() limit 1;   -- zayıf kategori en sona
  if v_kat is null then
    select k into v_kat from unnest(public.duello_kategorileri()) k order by random() limit 1;
  end if;
  return v_kat;
end $$;
revoke all on function public.duello2_otomatik_kategori(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------- duello_olustur (zayıf sabitlenir)
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
  v_z1 text;
  v_z2 text;
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
  -- 470: zayıf nokta (≥ 5 cevaplı kategoriler arasından; yoksa null = kural işlemez).
  if v_surum = 2 then
    v_z1 := public.duello2_en_zayif(p_a);
    v_z2 := public.duello2_en_zayif(p_b);
    v_p1 := v_p1 || jsonb_build_object('zayif', v_z1);
    v_p2 := v_p2 || jsonb_build_object('zayif', v_z2);
  else
    v_z1 := public.duello_en_zayif(p_a);
    v_z2 := public.duello_en_zayif(p_b);
  end if;

  insert into public.duellolar (oyuncu1, oyuncu2, dereceli, can1, can2, saldiran, faz, faz_bitis,
                                profil1, profil2, zayif1, zayif2, onceki_id, surum)
  values (p_a, p_b, coalesce(p_dereceli, true), v_can, v_can, p_a, 'kategori',
          now() + make_interval(secs => case when v_surum = 2
                                             then public.ayar_sayi('duello2_kategori_sn', 8)
                                             else public.duello_kategori_suresi(p_a) end)
          + case when v_surum = 2 then public.duello2_gosterim_payi() else interval '0' end,   -- Paket 20 IV.3 · 325 gösterim payı
          v_p1, v_p2, v_z1, v_z2, p_onceki, v_surum)
  returning id into v_id;

  insert into public.duello_sinyal (duello_id, oyuncu1, oyuncu2) values (v_id, p_a, p_b);
  delete from public.duello_kuyrugu where user_id in (p_a, p_b);
  return v_id;
end $function$;

-- ---------------------------------------------------------------- duello2_cozumle (kural)
CREATE OR REPLACE FUNCTION public.duello2_cozumle(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype;
  v_dc smallint;
  v_savunan uuid;
  v_c_sal smallint;
  v_c_sav smallint;
  v_d_sal boolean;
  v_d_sav boolean;
  v_kaybeden uuid;
  v_idx int;
  v_o uuid;
  v_c smallint;
  v_zayif_saldiri boolean;
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

  -- 470: saldıran savunanın ZAYIF kategorisini seçtiyse (uzatma hariç — orada kimse seçmez).
  v_zayif_saldiri := not d.uzatma and d.kategori is not null
    and d.kategori = (case when v_savunan = d.oyuncu1 then d.profil1 else d.profil2 end) ->> 'zayif';

  v_kaybeden := case when v_zayif_saldiri and v_d_sav then d.saldiran   -- savunan bildi → saldıran (ikisi doğru olsa da)
                     when v_d_sal and not v_d_sav then v_savunan
                     when v_d_sav and not v_d_sal then d.saldiran
                     else null end;

  update public.duellolar
     set can1 = greatest(can1 - (case when v_kaybeden = oyuncu1 then 1 else 0 end), 0),
         can2 = greatest(can2 - (case when v_kaybeden = oyuncu2 then 1 else 0 end), 0),
         dogru1 = dogru1 + (case when (oyuncu1 = d.saldiran and v_d_sal) or (oyuncu1 = v_savunan and v_d_sav) then 1 else 0 end),
         dogru2 = dogru2 + (case when (oyuncu2 = d.saldiran and v_d_sal) or (oyuncu2 = v_savunan and v_d_sav) then 1 else 0 end),
         faz = 'sonuc',
         faz_bitis = now() + make_interval(secs => public.ayar_sayi('duello_sonuc_sn', 3)),
         son_hamle = jsonb_build_object(
           'surum', 2, 'tur', d.tur, 'saldiri_sirasi', d.saldiri_sirasi, 'uzatma', d.uzatma,
           'saldiran', d.saldiran, 'savunan', v_savunan, 'kategori', d.kategori,
           'soru_id', d.soru_id, 'dogru_cevap', v_dc, 'can_kaybeden', v_kaybeden,
           'zayif_saldiri', v_zayif_saldiri,
           'cevaplar', jsonb_build_object(
             d.saldiran::text, jsonb_build_object('cevap', v_c_sal, 'dogru', v_d_sal, 'yanitsiz', v_c_sal is null),
             v_savunan::text, jsonb_build_object('cevap', v_c_sav, 'dogru', v_d_sav, 'yanitsiz', v_c_sav is null))),
         son_hareket = now()
   where id = p_id;

  insert into public.duello_hamleler (duello_id, tur, saldiran, savunan, kategori, soru_id, cevap, dogru,
                                      riskli, can_kaybeden, zaman_baskisi, savunma_kilidi,
                                      surum, uzatma, cevap_saldiran, dogru_saldiran,
                                      yanitsiz_saldiran, yanitsiz_savunan)
  values (p_id, d.tur, d.saldiran, v_savunan, d.kategori, d.soru_id, v_c_sav, v_d_sav,
          v_zayif_saldiri, v_kaybeden, d.zaman_baskisi, false,
          2, d.uzatma, v_c_sal, v_d_sal, v_c_sal is null, v_c_sav is null);

  foreach v_o in array array[d.saldiran, v_savunan] loop
    v_c := case when v_o = d.saldiran then v_c_sal else v_c_sav end;
    perform public.kategori_istatistik_yaz(v_o, d.kategori, v_c is not null and v_c = v_dc);
    if v_c is not null and v_c = v_dc then perform public.kategori_dogru_arttir(v_o, d.kategori); end if;
    if v_c is not null then perform public.soru_sayac(d.soru_id, v_c = v_dc); end if;
  end loop;

  delete from public.skill_ikinci_sans_denemeleri
   where mac_tur = 'duello' and mac_id = p_id and soru_index = v_idx;
end $function$;

-- ---------------------------------------------------------------- duello2_ilerlet (otomatik seçim)
CREATE OR REPLACE FUNCTION public.duello2_ilerlet(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype;
  v_adim int := 0;
  v_kopuk uuid;
  v_kat text;
  v_tol interval := make_interval(secs => public.ayar_sayi('duello2_cevap_tolerans_sn', 1));
  v_taban interval := make_interval(secs => public.ayar_sayi('duello_kopuk_taban_sn', 3));
begin
  select * into d from public.duellolar where id = p_id for update;
  if not found or d.durum <> 'aktif' then return; end if;

  -- ---------- KOPUKLUK KAPISI (eski akışla aynı; kişisel bitişler de donar) ----------
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

    if d.faz = 'kategori' then
      exit when now() < d.faz_bitis;
      -- Süre doldu: uygun kategorilerden RASTGELE; 470: savunanın zayıf kategorisi başka seçenek
      -- varsa seçilmez (saldıran seçmediği bir risk yüzünden can kaybetmesin).
      v_kat := public.duello2_otomatik_kategori(p_id);
      perform public.duello2_soru_ac(p_id, v_kat);
    elsif d.faz = 'cevap' then
      -- Her oyuncu ya cevapladı ya da kişisel süresi (+ tolerans) doldu → çözümle.
      exit when not ((d.cevaplar ? d.oyuncu1::text) or now() > d.bitis1 + v_tol)
             or not ((d.cevaplar ? d.oyuncu2::text) or now() > d.bitis2 + v_tol);
      perform public.duello2_cozumle(p_id);
    elsif d.faz = 'sonuc' then
      exit when now() < d.faz_bitis;
      perform public.duello2_sonraki(p_id);
    else
      exit;
    end if;
    perform public.duello_sinyal_ver(p_id);
  end loop;
end $function$;
