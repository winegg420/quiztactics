-- 441: Rakip gelmeyince bekleme Klasik ve Düello'da 15 sn (Ida, 24 Eyl 2026).
-- Klasik: rakip "Hazır mısın?" kapısına hiç gelmediyse (nabız yok) eşleştirme maçı klasik_baglanma_sn (15)
-- sonunda cezasız iptal. Loadout süresi (loadout_secim_sn = 20) ayrı kalır: bağlı iki taraf için 20 sn.
-- Düello: duello_baglanma_sn 10 → 15. Arkadaş maçı/rövanş (kabul_at dolu) iptal edilmez (410'daki gibi).

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('klasik_baglanma_sn', '15'::jsonb, 'TEST DEĞERİ — Eşleştirme maçında rakibin "Hazır mısın?" kapısına hiç gelmemesi için bekleme (sn). Dolunca maç cezasız iptal, bekleyen yeniden arar.')
on conflict (anahtar) do nothing;
update public.oyun_ayarlari set deger = '15'::jsonb where anahtar = 'duello_baglanma_sn';

CREATE OR REPLACE FUNCTION public.mac_nabiz(p_match_id uuid, p_hazir boolean DEFAULT false)
 RETURNS TABLE(durum text, basladi boolean, ben_hazir boolean, rakip_hazir boolean, rakip_baglantili boolean, duraklatildi boolean, duraklama_sn integer, baslangic timestamp with time zone, sunucu_zamani timestamp with time zone, terk_eden uuid, lobi_saniye integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
declare
  m public.matches%rowtype;
  v_ben_p1 boolean;
  v_rakip uuid;
  v_rakip_bot boolean;
  v_rakip_hazir boolean;
  v_ben_hazir boolean;
  v_rakip_bagli boolean;
  v_duraklama int := 0;
  v_terk uuid;
  v_geri_sayim int := public.ayar_sayi('mac_geri_sayim_sn', 3)::int;
  v_loadout int := public.ayar_sayi('loadout_secim_sn', 20)::int;
  v_lobi int := 0;
  v_lobi_bas timestamptz;
  v_sure_doldu boolean := false;
  v_baglanma int := public.ayar_sayi('klasik_baglanma_sn', 15)::int;   -- 441
  v_baglanma_doldu boolean := false;
  v_rakip_hic_gelmedi boolean := false;
begin
  select * into m from public.matches where id = p_match_id for update;
  if not found then raise exception 'Maç bulunamadı'; end if;
  if auth.uid() not in (m.oyuncu1, m.oyuncu2) then raise exception 'Bu maçta değilsin'; end if;

  v_ben_p1 := (m.oyuncu1 = auth.uid());
  v_rakip := case when v_ben_p1 then m.oyuncu2 else m.oyuncu1 end;
  select coalesce(is_bot, false) into v_rakip_bot from public.profiles where id = v_rakip;

  -- Eski (asenkron) maç: kapı ve kilit yok.
  if not coalesce(m.senkron, false) then
    return query select m.durum, true, true, true, true, false, 0,
                        m.soru_baslangic, now(), m.terk_eden, 0;
    return;
  end if;

  if v_ben_p1 then
    update public.matches
       set oyuncu1_hazir_at = now(),
           oyuncu1_hazir = oyuncu1_hazir or coalesce(p_hazir, false),
           lobi_baslangic = coalesce(lobi_baslangic, now())
     where id = p_match_id;
  else
    update public.matches
       set oyuncu2_hazir_at = now(),
           oyuncu2_hazir = oyuncu2_hazir or coalesce(p_hazir, false),
           lobi_baslangic = coalesce(lobi_baslangic, now())
     where id = p_match_id;
  end if;
  select * into m from public.matches where id = p_match_id;

  v_ben_hazir := case when v_ben_p1 then m.oyuncu1_hazir else m.oyuncu2_hazir end;
  v_rakip_hazir := (coalesce(v_rakip_bot, false)
                    and public.bot_hazir_mi(v_rakip, m.lobi_baslangic, p_match_id::text))
    or (case when v_ben_p1 then m.oyuncu2_hazir else m.oyuncu1_hazir end);
  v_rakip_bagli := coalesce(v_rakip_bot, false) or
    coalesce(case when v_ben_p1 then m.oyuncu2_hazir_at else m.oyuncu1_hazir_at end,
             '-infinity'::timestamptz) > now() - interval '12 seconds';

  -- 410: lobi başı — davet kabulünden önceki nabızlar sayılmaz.
  v_lobi_bas := greatest(m.lobi_baslangic, coalesce(m.kabul_at, m.lobi_baslangic));
  v_sure_doldu := v_lobi_bas is not null and v_loadout > 0
                  and now() >= v_lobi_bas + make_interval(secs => v_loadout);

  -- 441: rakip kapıya HİÇ gelmediyse (tek nabız yok) bekleme klasik_baglanma_sn (15); loadout süresi ayrı (20).
  v_baglanma_doldu := v_lobi_bas is not null and v_baglanma > 0
                      and now() >= v_lobi_bas + make_interval(secs => v_baglanma);
  v_rakip_hic_gelmedi := not coalesce(v_rakip_bot, false)
    and (case when v_ben_p1 then m.oyuncu2_hazir_at else m.oyuncu1_hazir_at end) is null;

  if m.durum = 'aktif' and not m.basladi then
    if v_rakip_bagli and ((v_ben_hazir and v_rakip_hazir) or v_sure_doldu) then
      -- 410: süre dolduysa iki taraf da hazır sayılır (son kayıtlı set kullanılır).
      update public.matches
         set basladi = true, aktif_soru = 0,
             oyuncu1_hazir = true, oyuncu2_hazir = true,
             soru_baslangic = now() + (v_geri_sayim || ' seconds')::interval,
             oyuncu1_soru = 0, oyuncu2_soru = 0,
             oyuncu1_baslangic = null, oyuncu2_baslangic = null
       where id = p_match_id;
      select * into m from public.matches where id = p_match_id;
      v_ben_hazir := true;
      v_rakip_hazir := true;

    elsif ((v_sure_doldu and not v_rakip_bagli) or (v_baglanma_doldu and v_rakip_hic_gelmedi))
          and m.kabul_at is null then
      -- 410: eşleştirme maçı, rakip bağlanmadı → CEZASIZ iptal (mac_sonuclandir çağrılmaz:
      -- kazanan/puan/coin/lig/XP yok; bildirim yok).
      update public.matches
         set durum = 'iptal', kazanan = null, bitis = now(), baglanmayan = v_rakip
       where id = p_match_id;
      select * into m from public.matches where id = p_match_id;
    end if;

  elsif m.durum = 'aktif' and m.basladi then
    if not v_rakip_bagli and m.duraklatildi_at is null then
      update public.matches set duraklatildi_at = now() where id = p_match_id;
      select * into m from public.matches where id = p_match_id;

    elsif v_rakip_bagli and m.duraklatildi_at is not null then
      update public.matches
         set soru_baslangic = soru_baslangic + (now() - m.duraklatildi_at),
             duraklatildi_at = null
       where id = p_match_id;
      select * into m from public.matches where id = p_match_id;

    elsif not v_rakip_bagli and m.duraklatildi_at is not null
          and now() > m.duraklatildi_at + interval '45 seconds' then
      update public.matches set terk_eden = v_rakip where id = p_match_id;
      perform public.mac_sonuclandir(p_match_id, auth.uid(), v_rakip);
      select * into m from public.matches where id = p_match_id;
    end if;
  end if;

  if m.duraklatildi_at is not null then
    v_duraklama := greatest(0, extract(epoch from (now() - m.duraklatildi_at))::int);
  end if;
  if v_lobi_bas is not null and not m.basladi then
    v_lobi := greatest(0, extract(epoch from (now() - v_lobi_bas))::int);
  end if;
  v_terk := m.terk_eden;

  return query select m.durum, m.basladi, v_ben_hazir, v_rakip_hazir, v_rakip_bagli,
                      (m.duraklatildi_at is not null), v_duraklama,
                      m.soru_baslangic, now(), v_terk, v_lobi;
end;
$function$
;
