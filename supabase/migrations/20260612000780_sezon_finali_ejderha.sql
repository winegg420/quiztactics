-- ============================================================
-- 780 · SEZON FİNALİ ÖDÜLÜ = EJDERHA ÇERÇEVESİ (Ida kararı, 1 Eki 2026)
--
-- Sezon Yolu seviye 28 ücretli kol ödülü (yer tutucu "?") → Ejderha çerçevesi (`pc_ejderha2`, premium çerçeve, efsanevi).
-- Ejderha ARTIK DÜKKÂNDA SATILMAZ: yalnız bu ödülle kazanılır. Kayıt, çizim, sahipler ve takılı olanlar korunur.
--
-- Değişenler:
--   kozmetikler.satis_pasif          YENİ kolon (varsayılan false) — true iken dükkânda satılmaz, sahibine görünmeye/takılmaya devam eder
--   kozmetik_satista                 + "and not satis_pasif" (satın alma, katalog ve bot seçimi bu işlevi kullanır; imza/yetki aynı)
--   kozmetikler pc_ejderha2          satis_pasif = true (aktif/onay/sanat/sahiplik DEĞİŞMEZ)
--   bp_odul_uygula                   'cerceve' türü: anahtar premium çerçeve kozmetiğiyse kozmetik_ver (sahiplik, idempotent),
--                                    değilse eski cerceve_ver (DEĞİŞMEDİ). Dönüş tipi/yetki aynı.
--   bp_seviye_odulleri 28/ucretli    placeholder=false, veri {"anahtar":"pc_ejderha2"}, ad TR/EN, nadirlik efsanevi
--
-- Verme yolları (bp_odul_al, bp_toplu_al, bp_satin_al geriye dönük, sezon_kapat) HEPSİ bp_odul_ver_ic → bp_odul_uygula'dan geçer:
-- ayrı kod yok, bu yüzden tek noktada çözülür. Alım satırı (oyuncu_bp_odul_alimi) çift alımı zaten engeller.
-- Yıkıcı değil, tekrar çalıştırılabilir; RLS/politika/GRANT değişmez. Seviye 28 ücretli için mevcut alım kaydı yoktu (kontrol edildi).
-- ============================================================

alter table public.kozmetikler add column if not exists satis_pasif boolean not null default false;

create or replace function public.kozmetik_satista(p_anahtar text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select k.aktif and k.onay = 'girsin' and not k.satis_pasif
                          and public.kozmetik_fiyati(k.tur, k.fiyat_elmas) is not null
                     from public.kozmetikler k where k.anahtar = p_anahtar), false)
     and public.kozmetik_satis_acik_mi();
$$;

update public.kozmetikler set satis_pasif = true where anahtar = 'pc_ejderha2' and not satis_pasif;

create or replace function public.bp_odul_uygula(p_user uuid, p_sezon bigint, p_seviye int, p_kol text, p_odul jsonb)
 returns boolean language plpgsql security definer set search_path to 'public'
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
    when 'avatar' then insert into public.oyuncu_avatarlari (user_id, avatar, kaynak) values (p_user, v_veri->>'url', 'etkinlik') on conflict do nothing;
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

update public.bp_seviye_odulleri
   set placeholder = false, veri = '{"anahtar":"pc_ejderha2"}'::jsonb,
       ad_tr = 'Ejderha çerçevesi', ad_en = 'Dragon frame', nadirlik = 'efsanevi'
 where seviye = 28 and kol = 'ucretli'
   and (placeholder or veri is distinct from '{"anahtar":"pc_ejderha2"}'::jsonb or ad_tr is distinct from 'Ejderha çerçevesi');

do $$
begin
  raise notice '780 sezon finali: satista=%, odul=%', 
    (select public.kozmetik_satista('pc_ejderha2')),
    (select format('%s/%s placeholder=%s %s', seviye, kol, placeholder, veri) from public.bp_seviye_odulleri where seviye = 28 and kol = 'ucretli');
end $$;
