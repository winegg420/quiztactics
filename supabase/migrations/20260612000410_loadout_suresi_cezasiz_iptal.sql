-- 410 · Loadout süresi + bağlanmayan rakipte cezasız iptal (Ajan I, I.1 — Ida onayladı)
--
-- KLASİK (Serbest/Dereceli, Saf Bilgi) — "Hazır mısın?" kapısı (mac_nabiz):
--   · Kapı açıldıktan (lobi başı) loadout_secim_sn (20) sonra HERKES hazır sayılır; oyuncunun
--     sunucudaki son kayıtlı seti (oyuncu_skill_setleri — SkillSeti her değişiklikte kaydeder)
--     kullanılır, maç başlar. Kimse kaybetmez.
--   · Süre dolduğunda rakip bağlı değilse (hiç gelmedi ya da nabzı 12 sn'den bayat) ve maç
--     EŞLEŞTİRMEYLE kurulduysa (kabul_at boş: kuyruga_gir / quick_match) → maç CEZASIZ iptal:
--     durum 'iptal', kazanan yok, puan/coin/lig/XP yok, bildirim yok. matches.baglanmayan
--     kimin gelmediğini söyler; bekleyen istemci yeniden aramaya döner.
--   · Arkadaş meydan okuması / rövanş (kabul_at dolu) iptal EDİLMEZ: bağlı iki taraf için süre
--     kuralı işler, rakip gelmediyse eski bekleme (+ "Asenkron bırak") aynen durur.
--   · Lobi başı = greatest(lobi_baslangic, kabul_at): davet beklerken atılan nabızlar sayılmaz.
--   · Botlar: bot her zaman bağlıdır; hazır olma gecikmesi (bot_hazir_mi) değişmedi.
--
-- DÜELLO — loadout giriş ekranında, aramadan ÖNCE seçilir (bekleyen rakip yok, süre gerekmez).
--   Aynı "bağlanmayan rakip" kuralı: düello kurulduktan duello_baglanma_sn (10) sonra rakip
--   düello ekranına hiç girmediyse (duello_giris hiç çağrılmadı) ve düello ARAMAYLA kurulduysa
--   (onceki_id boş, davetten değil) → durum 'iptal', kazanan yok, ödül yok (duello_bitir
--   çağrılmaz). Eskiden bu durumda ~70 sn sonra kopukluk yüzünden bekleyen hükmen KAZANIYORDU
--   (arkadaşla anlaşıp bedava galibiyet yolu). Sürenin kısa olması bilinçli: Düello kurulur
--   kurulmaz kategori fazı işler.
--
-- Rakamlar oyun_ayarlari'nda (TEST DEĞERİ).

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('loadout_secim_sn',   '20'::jsonb, 'TEST DEĞERİ — Klasik "Hazır mısın?" kapısında loadout süresi (sn). Dolunca son kayıtlı setle maç başlar; eşleştirme maçında rakip bağlı değilse maç cezasız iptal.'),
  ('duello_baglanma_sn', '10'::jsonb, 'TEST DEĞERİ — Aramayla kurulan düelloda rakibin düello ekranına gelmesi için süre (sn). Gelmezse düello cezasız iptal, bekleyen yeniden arar.')
on conflict (anahtar) do nothing;

alter table public.matches   add column if not exists baglanmayan uuid;
alter table public.duellolar add column if not exists baglanmayan uuid;
alter table public.duellolar add column if not exists giris1 timestamptz;
alter table public.duellolar add column if not exists giris2 timestamptz;

comment on column public.matches.baglanmayan   is '410: cezasız iptalde hazır kapısına zamanında gelmeyen oyuncu (yalnız bilgi; ödül/ceza yok).';
comment on column public.duellolar.baglanmayan is '410: cezasız iptalde düello ekranına zamanında gelmeyen oyuncu.';
comment on column public.duellolar.giris1      is '410: oyuncu1 düello ekranına ilk geldiği an (duello_giris).';
comment on column public.duellolar.giris2      is '410: oyuncu2 düello ekranına ilk geldiği an (duello_giris).';

-- Yayın anında süren düellolar iptal edilmesin: iki taraf da "gelmiş" sayılır.
update public.duellolar
   set giris1 = coalesce(giris1, created_at), giris2 = coalesce(giris2, created_at)
 where durum = 'aktif';

-- matches'te sütun düzeyinde SELECT izni kullanılıyorsa yeni sütun da okunabilsin.
grant select (baglanmayan) on public.matches to authenticated;

-- ------------------------------------------------------------------ mac_nabiz
-- İmza ve dönüş AYNI (create or replace). Değişenler: lobi başı, süre kuralı, cezasız iptal.
create or replace function public.mac_nabiz(p_match_id uuid, p_hazir boolean default false)
 returns table(durum text, basladi boolean, ben_hazir boolean, rakip_hazir boolean, rakip_baglantili boolean, duraklatildi boolean, duraklama_sn integer, baslangic timestamp with time zone, sunucu_zamani timestamp with time zone, terk_eden uuid, lobi_saniye integer)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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

    elsif v_sure_doldu and not v_rakip_bagli and m.kabul_at is null then
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
$function$;

-- ------------------------------------------------------------------ duello_kilitle
-- Düelloya bakan her okuma/eylem (duello_durum, cevap, skill…) oyuncunun "geldiğini" de yazar.
-- Böylece duello_giris'i çağırmayan eski istemci de gelmiş sayılır (yanlış iptal olmaz).
-- Tek ek: giris1/giris2 satırları; geri kalanı canlı tanımın aynısı.
create or replace function public.duello_kilitle(p_id uuid)
 returns duellolar
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare d public.duellolar%rowtype;
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  select * into d from public.duellolar where id = p_id for update;
  if not found then raise exception 'Düello bulunamadı'; end if;
  if auth.uid() not in (d.oyuncu1, d.oyuncu2) then raise exception 'Bu düelloda değilsin'; end if;

  -- 410: ilk geliş anı (yalnız bir kez yazılır)
  if d.oyuncu1 = auth.uid() and d.giris1 is null then
    update public.duellolar set giris1 = now() where id = p_id;
  elsif d.oyuncu2 = auth.uid() and d.giris2 is null then
    update public.duellolar set giris2 = now() where id = p_id;
  end if;

  -- Düelloya bakan oyuncu bağlıdır (Paket 24 · A.4)
  update public.profiles set last_seen = now()
   where id = auth.uid() and (last_seen is null or last_seen < now() - interval '5 seconds');

  perform public.duello_ilerlet(p_id);
  select * into d from public.duellolar where id = p_id;
  return d;
end;
$function$;

-- ------------------------------------------------------------------ duello_giris
-- Düello ekranı açılınca (ve rakip gelene dek ~2 sn'de bir) çağrılır.
-- Dönüş: { durum, rakip_geldi, kalan_sn, baglanmayan }
create or replace function public.duello_giris(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  d public.duellolar%rowtype;
  v_me uuid := auth.uid();
  v_ben_p1 boolean;
  v_rakip uuid;
  v_rakip_bot boolean;
  v_rakip_giris timestamptz;
  v_sure numeric := public.ayar_ondalik('duello_baglanma_sn', 10);
  v_aramadan boolean;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('duello_giris', 90, interval '60 seconds');

  select * into d from public.duellolar where id = p_id for update;
  if not found then raise exception 'Düello bulunamadı'; end if;
  if v_me not in (d.oyuncu1, d.oyuncu2) then raise exception 'Bu düelloda değilsin'; end if;

  v_ben_p1 := (d.oyuncu1 = v_me);
  v_rakip := case when v_ben_p1 then d.oyuncu2 else d.oyuncu1 end;
  select coalesce(is_bot, false) into v_rakip_bot from public.profiles where id = v_rakip;

  if v_ben_p1 then
    update public.duellolar set giris1 = coalesce(giris1, now()) where id = p_id and giris1 is null;
  else
    update public.duellolar set giris2 = coalesce(giris2, now()) where id = p_id and giris2 is null;
  end if;
  v_rakip_giris := case when v_ben_p1 then d.giris2 else d.giris1 end;

  -- Aramayla kurulan düello: rövanş değil (onceki_id boş) ve davetten değil.
  v_aramadan := d.onceki_id is null
    and not exists (select 1 from public.duello_davetleri x where x.duello_id = p_id);

  if d.durum = 'aktif' and not coalesce(v_rakip_bot, false) and v_rakip_giris is null
     and v_aramadan and now() >= d.created_at + make_interval(secs => v_sure) then
    -- CEZASIZ iptal: duello_bitir çağrılmaz → kazanan/ödül/lig/XP yok.
    update public.duellolar
       set durum = 'iptal', kazanan = null, bitis = now(), baglanmayan = v_rakip
     where id = p_id;
    perform public.duello_sinyal_ver(p_id);
    return jsonb_build_object('durum', 'iptal', 'rakip_geldi', false, 'kalan_sn', 0,
                              'baglanmayan', v_rakip);
  end if;

  return jsonb_build_object(
    'durum', d.durum,
    'rakip_geldi', coalesce(v_rakip_bot, false) or v_rakip_giris is not null or not v_aramadan,
    'kalan_sn', greatest(0, ceil(v_sure - extract(epoch from (now() - d.created_at))))::int,
    'baglanmayan', d.baglanmayan
  );
end;
$$;

revoke all on function public.duello_giris(uuid) from public, anon;
grant execute on function public.duello_giris(uuid) to authenticated;
