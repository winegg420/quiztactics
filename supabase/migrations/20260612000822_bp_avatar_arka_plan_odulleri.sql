-- ============================================================
-- 822 · SEZON YOLU: avatar ve arka plan ödülleri + Sezon 1'in altı "?" yuvası doldu (Ida, 1 Eki 2026)
--
-- Karar: dükkânda elmasla satılan Epik / Efsanevi avatarlar ve arka planlar Battle Pass'te HEDİYE olarak da verilir.
-- BP'deki kalem dükkânda satılmaya DEVAM eder (gizlenmez). Zaten sahip olan oyuncuya ödül "alınmış" sayılır: çift
-- sahiplik satırı oluşmaz, iade / dönüşüm YOK (karar verilmedi), cevapta `zaten_sahip: true` gider.
--
-- SONRAKİ SEZONLAR — yuva → ödül eşlemesi TEK SATIR veri güncellemesidir (kod değişmez):
--   update public.bp_seviye_odulleri set tur = 'avatar',    veri = '{"anahtar":"vampir-y19"}', placeholder = false
--    where seviye = 5 and kol = 'ucretli';
--   update public.bp_seviye_odulleri set tur = 'arka_plan', veri = '{"anahtar":"pa_kar"}',     placeholder = false
--    where seviye = 8 and kol = 'ucretli';
-- Ad (TR/EN), nadirlik ve görsel adresi `trg_bp_odul_doldur` ile katalogdan kendiliğinden dolar; katalogda olmayan
-- anahtar güncellemeyi REDDEDER (yanlış anahtar oyuncuya hata olarak dönmesin).
--
-- Değişenler:
--   bp_seviye_odulleri.tur kısıtı   + 'arka_plan'
--   trg_bp_odul_doldur              YENİ (BEFORE INSERT/UPDATE): avatar / arka_plan ödülünü doğrular ve doldurur
--   bp_odul_sahip_mi                YENİ iç yardımcı: oyuncu bu avatar / arka plan ödülüne zaten sahip mi
--   bp_odul_uygula                  'avatar' → oyuncu_avatarlari (anahtar ya da url; idempotent) · 'arka_plan' → kozmetik_ver
--                                   (eski 'avatar' dalı sahiplik tablosuna ADRES yazıyordu → yabancı anahtara takılırdı;
--                                    bugüne kadar hiç avatar ödülü verilmedi)
--   bp_odul_ver_ic                  alımdan önce sahipliğe bakar → ödüle `zaten_sahip: true` işler (alım kaydına da)
--   sezon_yolu_durumum              her ödüle `sahip` alanı (yalnız avatar / arka_plan'da true olabilir)
--   bp_seviye_odulleri              5 Korsan · 14 Samuray (Epik avatar) · 21 Kristal Uzaylı · 27 Savaş Robotu (Efsanevi avatar)
--                                   8 Yıldızlı Gece (Nadir arka plan) · 17 Su Altı (Epik arka plan) — hepsi ücretli kol
--   DOKUNULMAZ: 19 ve 23 (çerçeve "?"), 22 (tepki paketi "?"), 28 (Ejderha çerçevesi).
--
-- Verme yolları (bp_odul_al, bp_toplu_al, bp_satin_al geriye dönük, sezon_kapat, trg_bp_odul_gercek) hepsi
-- bp_odul_ver_ic / bp_odul_uygula'dan geçer. Placeholder iken alınmış yuva varsa trg_bp_odul_gercek ödülü hemen verir
-- (canlıda bu altı yuva için alım kaydı YOK → geriye dönük ödül alan hesap 0).
-- 820 ve 821'den SONRA çalışır. Yetkiler korunur. Yıkıcı değil, tekrar çalıştırılabilir.
-- ============================================================

-- ---------- 1. Ödül türü: + arka_plan ----------
do $$
declare r record;
begin
  for r in
    select c.conname from pg_constraint c
     where c.conrelid = 'public.bp_seviye_odulleri'::regclass and c.contype = 'c'
       and pg_get_constraintdef(c.oid) like '%tepki_paketi%'
       and pg_get_constraintdef(c.oid) not like '%arka_plan%'
  loop
    execute format('alter table public.bp_seviye_odulleri drop constraint %I', r.conname);
  end loop;
  if not exists (
    select 1 from pg_constraint c
     where c.conrelid = 'public.bp_seviye_odulleri'::regclass and c.contype = 'c'
       and pg_get_constraintdef(c.oid) like '%arka_plan%'
  ) then
    alter table public.bp_seviye_odulleri add constraint bp_seviye_odulleri_tur_check
      check (tur in ('coin', 'elmas', 'joker', 'tepki_paketi', 'unvan', 'avatar', 'cerceve', 'arka_plan'));
  end if;
end $$;

-- ---------- 2. Avatar / arka plan ödülünü doğrula ve doldur ----------
-- veri.anahtar (avatarda veri.url de olur) katalogda aranır. Bulunamazsa hata. Bulunursa:
--   avatar    → veri {anahtar, url}        · nadirlik avatar_nitelikleri'nden (yaygin → siradan)
--   arka_plan → veri {anahtar, sanat}      · nadirlik kozmetikler.dukkan_nadirlik'ten (boşsa satırdaki kalır)
-- Ad: elle verilmediyse (boş ya da güncellemede değişmediyse) "<ad> avatarı" / "<ad> arka planı" (EN: avatar / background).
create or replace function public.trg_bp_odul_doldur()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n public.avatar_nitelikleri%rowtype;
  v_k public.kozmetikler%rowtype;
  v_ad_elle boolean;
begin
  if new.placeholder or new.tur not in ('avatar', 'arka_plan') then return new; end if;
  -- ad elle verildi mi: eklemede dolu geldiyse; güncellemede eski değerden farklıysa
  v_ad_elle := case when tg_op = 'INSERT' then new.ad_tr is not null
                    else new.ad_tr is distinct from old.ad_tr end;

  if new.tur = 'avatar' then
    select * into v_n from public.avatar_nitelikleri n
     where n.anahtar = new.veri->>'anahtar' or n.url = new.veri->>'url';
    if not found then raise exception 'Sezon ödülü: böyle bir avatar yok (%)', new.veri; end if;
    new.veri := new.veri || jsonb_build_object('anahtar', v_n.anahtar, 'url', v_n.url);
    new.nadirlik := case v_n.nadirlik when 'yaygin' then 'siradan' else v_n.nadirlik end;
    if not v_ad_elle then
      new.ad_tr := v_n.ad_tr || ' avatarı';
      new.ad_en := v_n.ad_en || ' avatar';
    end if;
  else
    select * into v_k from public.kozmetikler k
     where k.anahtar = new.veri->>'anahtar' and k.tur = 'premium_aura';
    if not found then raise exception 'Sezon ödülü: böyle bir arka plan yok (%)', new.veri; end if;
    new.veri := new.veri || jsonb_build_object('anahtar', v_k.anahtar, 'sanat', coalesce(v_k.icerik->>'sanat', substr(v_k.anahtar, 4)));
    new.nadirlik := coalesce(case v_k.dukkan_nadirlik when 'yaygin' then 'siradan' else v_k.dukkan_nadirlik end, new.nadirlik);
    if not v_ad_elle then
      new.ad_tr := v_k.ad_tr || ' arka planı';
      new.ad_en := v_k.ad_en || ' background';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.trg_bp_odul_doldur() from public, anon, authenticated;
grant execute on function public.trg_bp_odul_doldur() to service_role;

drop trigger if exists trg_bp_odul_doldur on public.bp_seviye_odulleri;
create trigger trg_bp_odul_doldur before insert or update on public.bp_seviye_odulleri
  for each row execute function public.trg_bp_odul_doldur();

-- ---------- 3. Oyuncu bu ödüle zaten sahip mi (yalnız avatar / arka_plan) ----------
create or replace function public.bp_odul_sahip_mi(p_user uuid, p_tur text, p_veri jsonb)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case p_tur
    when 'avatar' then exists (
      select 1 from public.oyuncu_avatarlari o
        join public.avatar_nitelikleri n on n.anahtar = o.avatar
       where o.user_id = p_user and (n.anahtar = p_veri->>'anahtar' or n.url = p_veri->>'url'))
    when 'arka_plan' then exists (
      select 1 from public.oyuncu_kozmetikleri o
       where o.user_id = p_user and o.kozmetik = p_veri->>'anahtar')
    else false end;
$$;
revoke all on function public.bp_odul_sahip_mi(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.bp_odul_sahip_mi(uuid, text, jsonb) to service_role;

-- ---------- 4. Ödülü uygula (780'in gövdesi; avatar dalı düzeldi, arka_plan eklendi) ----------
create or replace function public.bp_odul_uygula(p_user uuid, p_sezon bigint, p_seviye integer, p_kol text, p_odul jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tur text := p_odul->>'tur';
  v_veri jsonb := coalesce(p_odul->'veri', '{}'::jsonb);
  v_ref text := 'sezon:' || p_sezon || ':' || p_seviye || ':' || p_kol;
begin
  if coalesce((p_odul->>'placeholder')::boolean, false) then return false; end if;
  case v_tur
    when 'coin'  then perform public.coin_ekle(p_user, (v_veri->>'miktar')::bigint, 'sezon_yolu', v_ref);
    when 'elmas' then perform public.elmas_ekle(p_user, (v_veri->>'miktar')::int, 'sezon_yolu', v_ref);
    when 'joker' then perform public.joker_hareket(p_user, v_veri->>'tur', (v_veri->>'adet')::int, 'hediye', v_ref);
    when 'tepki_paketi' then perform public.kozmetik_ver(p_user, v_veri->>'anahtar', 'etkinlik');
    when 'unvan' then insert into public.oyuncu_unvanlari (user_id, unvan) values (p_user, v_veri->>'anahtar') on conflict do nothing;
    when 'avatar' then
      -- 822: sahiplik anahtarla tutulur (820); zaten sahipse satır eklenmez
      insert into public.oyuncu_avatarlari (user_id, avatar, kaynak)
      select p_user, n.anahtar, 'etkinlik'
        from public.avatar_nitelikleri n
       where n.anahtar = v_veri->>'anahtar' or n.url = v_veri->>'url'
      on conflict do nothing;
    when 'arka_plan' then perform public.kozmetik_ver(p_user, v_veri->>'anahtar', 'etkinlik');   -- 822; idempotent
    when 'cerceve' then
      -- 780: premium çerçeve (kozmetik) → sahiplik kozmetik_ver ile; lig/level/rozet çerçevesi → eski yol
      if exists (select 1 from public.kozmetikler k where k.anahtar = v_veri->>'anahtar' and k.tur = 'premium_cerceve') then
        perform public.kozmetik_ver(p_user, v_veri->>'anahtar', 'etkinlik');
      else
        perform public.cerceve_ver(p_user, v_veri->>'anahtar', 'etkinlik');
      end if;
    else raise exception 'Bilinmeyen ödül türü: %', v_tur;
  end case;
  return true;
end $$;

-- ---------- 5. Ödül verme (720'nin gövdesi + zaten_sahip işareti) ----------
create or replace function public.bp_odul_ver_ic(p_user uuid, p_sezon bigint, p_seviye integer, p_kol text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_odul jsonb;
  v_n int;
  v_verildi boolean;
begin
  select to_jsonb(o) into v_odul from public.bp_seviye_odulleri o where o.seviye = p_seviye and o.kol = p_kol;
  if v_odul is null then return null; end if;
  v_verildi := not coalesce((v_odul->>'placeholder')::boolean, false);
  -- 822: ödül verilmeden ÖNCE bakılır; zaten sahipse ödül alınmış sayılır, çift satır yok, iade yok
  if v_verildi and public.bp_odul_sahip_mi(p_user, v_odul->>'tur', v_odul->'veri') then
    v_odul := v_odul || jsonb_build_object('zaten_sahip', true);
  end if;
  insert into public.oyuncu_bp_odul_alimi (sezon, user_id, seviye, kol, odul, verildi)
  values (p_sezon, p_user, p_seviye, p_kol, v_odul, v_verildi)
  on conflict do nothing;
  get diagnostics v_n = row_count;
  if v_n = 0 then return null; end if;
  perform public.bp_odul_uygula(p_user, p_sezon, p_seviye, p_kol, v_odul);
  return v_odul;
end $$;

-- ---------- 6. Durum: ödüllere `sahip` alanı (730'un gövdesi; tek satır eklendi) ----------
create or replace function public.sezon_yolu_durumum()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_sezon bigint;
  v_s public.sezonlar;
  v_sp int := 0;
  v_seviye int := 0;
  v_max int := public.ayar_sayi('sezon_seviye_sayisi', 28)::int;
  v_bp public.oyuncu_bp_sahipligi;
  v_bugun date := (now() at time zone 'Europe/Istanbul')::date;
  v_oduller jsonb;
  v_esikler jsonb;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  v_sezon := public.sezon_gorunen_ic();
  if v_sezon is null then
    return jsonb_build_object('gorunur', false, 'acik', public.sezon_yolu_acik_mi());
  end if;
  select * into v_s from public.sezonlar where id = v_sezon;
  select sp, seviye into v_sp, v_seviye from public.oyuncu_sezon_puani where sezon = v_sezon and user_id = v_me;
  v_sp := coalesce(v_sp, 0); v_seviye := coalesce(v_seviye, 0);
  select * into v_bp from public.oyuncu_bp_sahipligi where sezon = v_sezon and user_id = v_me;

  select jsonb_agg(public.sezon_esik(g) order by g) into v_esikler from generate_series(1, v_max) g;
  select coalesce(jsonb_agg(jsonb_build_object(
           'seviye', o.seviye, 'kol', o.kol, 'tur', o.tur, 'veri', o.veri, 'placeholder', o.placeholder,
           'ad_tr', o.ad_tr, 'ad_en', o.ad_en, 'nadirlik', o.nadirlik,
           'alindi', a.seviye is not null,
           'alinabilir', a.seviye is null and o.seviye <= v_seviye
                         and (o.kol = 'ucretsiz' or coalesce(v_bp.aktif, false)),
           -- 822: oyuncu bu avatar / arka plan ödülüne zaten sahip mi (dükkândan ya da önceki ödülden)
           'sahip', not o.placeholder and public.bp_odul_sahip_mi(v_me, o.tur, o.veri))
           order by o.seviye, o.kol), '[]'::jsonb)
    into v_oduller
    from public.bp_seviye_odulleri o
    left join public.oyuncu_bp_odul_alimi a
      on a.sezon = v_sezon and a.user_id = v_me and a.seviye = o.seviye and a.kol = o.kol
   where o.seviye <= v_max;

  return jsonb_build_object(
    'gorunur', true,
    'acik', public.sezon_yolu_acik_mi(),
    'test', v_s.test,
    'sahip', public.sahip_kullanici_mi(v_me),
    'sezon', jsonb_build_object('id', v_s.id, 'no', v_s.no, 'baslangic', v_s.baslangic, 'bitis', v_s.bitis,
                                'kalan_gun', greatest(0, ceil(extract(epoch from (v_s.bitis - now())) / 86400.0))::int),
    'sp', v_sp, 'seviye', v_seviye, 'seviye_sayisi', v_max,
    'esikler', v_esikler,
    'sonraki_esik', case when v_seviye >= v_max then null else public.sezon_esik(v_seviye + 1) end,
    'onceki_esik', public.sezon_esik(v_seviye),
    'bp', jsonb_build_object('aktif', coalesce(v_bp.aktif, false), 'satin_alma_at', v_bp.satin_alma_at,
                             'fiyat', public.ayar_sayi('bp_fiyat_elmas', 500),
                             'sp_carpan', public.ayar_ondalik('bp_sp_carpan', 1.25)),
    'elmas', (select elmas from public.profiles where id = v_me),
    'oduller', v_oduller,
    'bonus_gorev', jsonb_build_object(
      'hedef', public.ayar_sayi('bp_bonus_gorev_hedef', 2),
      'ilerleme', least(public.gorev_sayaci('mac_oyna_3', v_me, v_bugun), public.ayar_sayi('bp_bonus_gorev_hedef', 2)),
      'sp', public.ayar_sayi('sp_bp_bonus_gorev', 20),
      'alindi', exists (select 1 from public.sezon_bonus_gorev b where b.user_id = v_me and b.tarih = v_bugun)),
    'final_unvan', (select jsonb_build_object('anahtar', t.anahtar, 'ad_tr', t.ad_tr, 'ad_en', t.ad_en,
                                              'kazanildi', exists (select 1 from public.oyuncu_unvanlari u where u.user_id = v_me and u.unvan = t.anahtar))
                      from public.unvan_tanimlari t where t.anahtar = v_s.final_unvan),
    'bugun_mac_sp', coalesce((select sum(h.taban) from public.sezon_puan_hareketleri h
                               where h.user_id = v_me and h.sezon = v_sezon and h.kaynak in ('mac', 'duello')
                                 and (h.created_at at time zone 'Europe/Istanbul')::date = v_bugun), 0),
    'gunluk_mac_tavan', public.ayar_sayi('sp_gunluk_mac_tavan', 150),
    'tasma', public.sezon_tasma_bilgi(v_sezon, v_me)
  );
end $$;

-- ---------- 7. Sezon 1 yuvaları (her biri tek satır; ad / nadirlik / görsel tetikleyiciden) ----------
-- Yalnız hâlâ yer tutucu olan satır güncellenir → tekrar çalıştırma ya da elle yapılmış bir seçim ezilmez.
update public.bp_seviye_odulleri set tur = 'avatar',    veri = '{"anahtar":"korsan-k19"}',         placeholder = false where seviye = 5  and kol = 'ucretli' and placeholder;
update public.bp_seviye_odulleri set tur = 'arka_plan', veri = '{"anahtar":"pa_gece"}',            placeholder = false where seviye = 8  and kol = 'ucretli' and placeholder;
update public.bp_seviye_odulleri set tur = 'avatar',    veri = '{"anahtar":"samuray-y15"}',        placeholder = false where seviye = 14 and kol = 'ucretli' and placeholder;
update public.bp_seviye_odulleri set tur = 'arka_plan', veri = '{"anahtar":"pa_sualti"}',          placeholder = false where seviye = 17 and kol = 'ucretli' and placeholder;
update public.bp_seviye_odulleri set tur = 'avatar',    veri = '{"anahtar":"kristal-uzayli-y28"}', placeholder = false where seviye = 21 and kol = 'ucretli' and placeholder;
update public.bp_seviye_odulleri set tur = 'avatar',    veri = '{"anahtar":"savas-robotu-y30"}',   placeholder = false where seviye = 27 and kol = 'ucretli' and placeholder;

-- ---------- 8. Rapor + doğrulama ----------
do $$
declare v_yuva text; v_kalan text; v_alim int;
begin
  select string_agg(seviye || ' ' || tur || ' ' || (veri->>'anahtar') || ' ' || coalesce(nadirlik, '-') || ' "' || ad_tr || '"', ' · ' order by seviye)
    into v_yuva from public.bp_seviye_odulleri
   where kol = 'ucretli' and seviye in (5, 8, 14, 17, 21, 27);
  select string_agg(seviye || ' ' || tur, ', ' order by seviye) into v_kalan
    from public.bp_seviye_odulleri where placeholder;
  select count(*) into v_alim from public.oyuncu_bp_odul_alimi a
   where a.kol = 'ucretli' and a.seviye in (5, 8, 14, 17, 21, 27);
  if exists (select 1 from public.bp_seviye_odulleri
              where kol = 'ucretli' and seviye in (5, 8, 14, 17, 21, 27) and (placeholder or veri->>'anahtar' is null)) then
    raise exception '822: altı yuvadan en az biri dolmadı (%)', v_yuva;
  end if;
  raise notice '822 dolan yuvalar: %', v_yuva;
  raise notice '822 kalan "?" yuvalar: % · bu altı yuvada mevcut alım kaydı (geriye dönük ödül alan): %', coalesce(v_kalan, '(yok)'), v_alim;
end $$;
