-- Paket 2 · Şerit B · B3 — Loadout fiilen kapalı (Ida kararı) + kullanım kapısında kilit
--
-- Yuva sayısı TEK anahtar: oyun_ayarlari.skill_seti_slot (yeni 'skill_yuva_sayisi' AÇILMADI —
-- ikisi aynı anlam; istemci ve sunucu zaten skill_seti_slot'u okuyor).
-- Kural: skill_seti_slot >= aktif skill sayısı (skill_katalogu.aktif) → loadout KAPALI:
--   * seçim ekranı gizlenir (istemci: oyun/lib/jokerler.js › skillLoadoutKapali),
--   * skill_setim() bütün aktif + kilidi açık skill'leri döndürür (Düello 1.0 arayüzü
--     skill.set ∩ skill.izinli'den çizdiği için hepsini gösterir),
--   * kullanım kapısı set kontrolünü atlar.
-- İleride loadout'u açmak = tek ayar (ör. skill_seti_slot = 3). Altyapı (oyuncu_skill_setleri,
-- skill_setimi_kaydet, set kapısı) SİLİNMEDİ.

update public.oyun_ayarlari
   set deger = '7'::jsonb,
       aciklama = 'Skill yuvası (loadout) sayısı, adet. Aktif skill sayısına (skill_katalogu.aktif) eşit ya da büyükse loadout KAPALI: seçim ekranı gizlenir, herkes bütün açık skill''leri kullanır. Loadout''u açmak için aktif skill sayısından küçük bir değer ver (ör. 3). DİKKAT: kataloğa yeni aktif skill eklenince bu değeri de artır, yoksa loadout kendiliğinden açılır. Eski değer 3 (Paket 2 B3).'
 where anahtar = 'skill_seti_slot';
insert into public.oyun_ayarlari (anahtar, deger, aciklama)
select 'skill_seti_slot', '7'::jsonb, 'Skill yuvası (loadout) sayısı, adet. Aktif skill sayısına eşit ya da büyükse loadout KAPALI.'
 where not exists (select 1 from public.oyun_ayarlari where anahtar = 'skill_seti_slot');

create or replace function public.skill_loadout_acik()
returns boolean language sql stable security definer set search_path to 'public'
as $$
  select public.ayar_sayi('skill_seti_slot', 3)
       < (select count(*) from public.skill_katalogu k where k.aktif);
$$;
revoke all on function public.skill_loadout_acik() from public, anon;
grant execute on function public.skill_loadout_acik() to authenticated;

-- Loadout kapalıyken: bütün aktif ve kilidi açık skill'ler (katalog sırasıyla).
create or replace function public.skill_setim()
returns text[] language sql stable security definer set search_path to 'public'
as $$
  select case when public.skill_loadout_acik() then
    coalesce(
      (select s.skiller from public.oyuncu_skill_setleri s where s.user_id = auth.uid()),
      array['elli','sure','soru_degistir']::text[])
  else
    coalesce((select array_agg(k.tur order by k.sira) from public.skill_katalogu k
               where k.aktif and public.skill_kilidi_acik(auth.uid(), k.tur)), '{}'::text[])
  end;
$$;
revoke all on function public.skill_setim() from public, anon;
grant execute on function public.skill_setim() to authenticated;

-- Kilitli skill sete giremez; gerisi aynı.
create or replace function public.skill_setimi_kaydet(p_skiller text[])
returns text[] language plpgsql security definer set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  v_slot int := public.ayar_sayi('skill_seti_slot', 3)::int;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  if p_skiller is null or cardinality(p_skiller) = 0 or cardinality(p_skiller) > v_slot then
    raise exception 'En fazla % skill seçebilirsin', v_slot;
  end if;
  if cardinality(p_skiller) <> (select count(distinct x) from unnest(p_skiller) x)
     or exists (select 1 from unnest(p_skiller) x where not public.skill_aktif(x)) then
    raise exception 'Geçersiz skill seti';
  end if;
  if exists (select 1 from unnest(p_skiller) x where not public.skill_kilidi_acik(v_me, x)) then
    raise exception 'Bu skill kilitli';
  end if;
  insert into public.oyuncu_skill_setleri(user_id, skiller, guncellendi)
  values (v_me, p_skiller, now())
  on conflict (user_id) do update set skiller = excluded.skiller, guncellendi = now();
  return p_skiller;
end;
$$;
revoke all on function public.skill_setimi_kaydet(text[]) from public, anon;
grant execute on function public.skill_setimi_kaydet(text[]) to authenticated;

-- Kullanım kapısı (joker_kullanimlari BEFORE INSERT): canlı gövde (268) + iki değişiklik:
--   1. kilitli skill reddedilir ('Bu skill kilitli'),
--   2. set kontrolü yalnız loadout AÇIKKEN.
-- Bot istisnası mevcut desenle aynı: botta set ve kilit kontrolü yok.
create or replace function public.skill_kullanim_kapisi()
returns trigger language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_bot boolean := false;
  v_secili text[];
  v_soru uuid;
  v_bas timestamptz;
  v_m public.matches%rowtype;
  v_aktif_soru int;
  v_rakip uuid;
begin
  select coalesce(p.is_bot, false) into v_bot from public.profiles p where p.id = new.user_id;
  if not public.skill_aktif(new.tur) then
    if v_bot then return null; end if;
    raise exception 'Bu skill artık aktif değil';
  end if;

  if not v_bot then
    if not public.skill_kilidi_acik(new.user_id, new.tur) then
      raise exception 'Bu skill kilitli';
    end if;
    if public.skill_loadout_acik() then
      select coalesce(s.skiller, array['elli','sure','soru_degistir']::text[])
        into v_secili from (select 1) z
        left join public.oyuncu_skill_setleri s on s.user_id = new.user_id;
      if not (new.tur = any(v_secili)) then raise exception 'Bu skill maç setinde değil'; end if;
    end if;
  end if;

  if new.mac_tur = '1v1' then
    select * into v_m from public.matches where id = new.mac_id for update;
    if not found or v_m.durum <> 'aktif' then raise exception 'Maç aktif değil'; end if;
    if new.user_id not in (v_m.oyuncu1, v_m.oyuncu2) then raise exception 'Bu maçta değilsin'; end if;
    if coalesce(v_m.jokersiz, false) then raise exception 'Bu modda skill kullanılamaz'; end if;
    v_aktif_soru := case when coalesce(v_m.senkron, false) then v_m.aktif_soru
      when v_m.oyuncu1 = new.user_id then coalesce(v_m.oyuncu1_soru, 0)
      else coalesce(v_m.oyuncu2_soru, 0) end;
    if new.soru_index <> v_aktif_soru then raise exception 'Soru değişti, tekrar dene'; end if;
    if exists (select 1 from public.match_answers a
      where a.match_id = new.mac_id and a.user_id = new.user_id and a.soru_index = new.soru_index)
    then raise exception 'Bu soruyu zaten cevapladın'; end if;
    if (select count(*) from public.joker_kullanimlari k
      where k.user_id=new.user_id and k.mac_tur='1v1' and k.mac_id=new.mac_id)
      >= public.ayar_sayi('klasik_skill_toplam_hak',6)::int
    then raise exception 'Bu maçtaki skill hakkın doldu'; end if;
    if (select count(*) from public.joker_kullanimlari k
      where k.user_id=new.user_id and k.mac_tur='1v1' and k.mac_id=new.mac_id and k.tur=new.tur)
      >= public.ayar_sayi('klasik_skill_tur_basi_hak',2)::int
    then raise exception 'Bu skill için maç hakkın doldu'; end if;
    if (select count(*) from public.joker_kullanimlari k
      where k.user_id=new.user_id and k.mac_tur='1v1' and k.mac_id=new.mac_id and k.soru_index=new.soru_index)
      >= public.ayar_sayi('klasik_skill_soru_basi_hak',1)::int
    then raise exception 'Bu soruda skill hakkını kullandın'; end if;
    if new.tur = 'zaman_baskisi' then
      v_rakip := case when v_m.oyuncu1=new.user_id then v_m.oyuncu2 else v_m.oyuncu1 end;
      if exists (select 1 from public.match_answers a
        where a.match_id=new.mac_id and a.user_id=v_rakip and a.soru_index=new.soru_index)
      then raise exception 'Rakibin bu soruyu zaten cevapladı'; end if;
    end if;
  end if;

  -- Düello 1.0: surum = 2 maçta skill sınırları tetikleyicide de uygulanır (bot dahil).
  if new.mac_tur = 'duello' and exists (select 1 from public.duellolar where id = new.mac_id and surum = 2) then
    if not public.duello2_skill_kapisi(new.mac_id, new.user_id, new.soru_index, new.tur, v_bot) then
      return null;
    end if;
  end if;

  if new.tur = 'sure' and new.mac_tur <> 'turnuva' then
    if new.mac_tur = '1v1' then
      v_soru := public.soru_id_coz('1v1', new.mac_id, new.user_id, new.soru_index,
        v_m.soru_ids[new.soru_index + 1]);
      v_bas := public.soru_baslangic_coz('1v1', new.mac_id, new.user_id, new.soru_index,
        case when coalesce(v_m.senkron,false) then v_m.soru_baslangic
             when v_m.oyuncu1 = new.user_id then v_m.oyuncu1_baslangic else v_m.oyuncu2_baslangic end);
    elsif new.mac_tur = 'grup' then
      select public.soru_id_coz('grup',g.id,new.user_id,new.soru_index,g.soru_ids[new.soru_index+1]),
             public.soru_baslangic_coz('grup',g.id,new.user_id,new.soru_index,g.soru_baslangic)
        into v_soru,v_bas from public.group_matches g where g.id=new.mac_id;
    elsif new.mac_tur = 'hizli' then
      select public.soru_id_coz('hizli',h.id,new.user_id,new.soru_index,h.soru_ids[new.soru_index+1]),
             public.soru_baslangic_coz('hizli',h.id,new.user_id,new.soru_index,h.soru_baslangic)
        into v_soru,v_bas from public.hizli_maclar h where h.id=new.mac_id;
    end if;
    if v_soru is not null and v_bas is not null then
      insert into public.soru_degisimleri(mac_tur,mac_id,user_id,soru_index,question_id,baslangic)
      values(new.mac_tur,new.mac_id,new.user_id,new.soru_index,v_soru,v_bas)
      on conflict(mac_tur,mac_id,user_id,soru_index) do nothing;
    end if;
  end if;
  return new;
end;
$function$;
