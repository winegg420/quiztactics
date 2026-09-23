-- 327: Loadout geri döndü — 3 yuva, Klasik ve Düello (Ida, 23 Eyl 2026).
--
-- Gerekçe: Klasik maç sınırı 6, aynı skill en çok 2 → 3 yuva × 2 = 6. Düello sınırı 4,
-- 3 yuva yeter. Maç içi sınırlar DEĞİŞMEZ.
-- Setler moda göre ayrı: Klasik `oyuncu_skill_setleri.skiller` (eski sütun), Düello yeni
-- `skiller_duello` — Düello'da yalnız Düello'ya uygun skill'ler (Sigorta ve 2X yalnız Klasik).
-- Kapı (skill_kullanim_kapisi) set kontrolünü YALNIZ Klasik (1v1) ve Düello'da yapar; Grup ve
-- Turnuva'da loadout yok, mod için açık bütün skill'ler kullanılır.
-- Hakkı (envanter) olmayan skill sete girebilir (maçta "al ve kullan" akışı kalır); kilitli giremez.
-- Botlar: kapıdan muaf; sunucu bot mantığı zaten yalnız Zaman Baskısı + Soru Değiştir kullanır
-- (bot_klasik_joker_tik, duello2_bot_skill_dene) — bot seti fiilen bu 2 skill, 3 yuvanın içinde.

update public.oyun_ayarlari
   set deger = '3'::jsonb,
       aciklama = 'Skill yuvası (loadout) sayısı — Klasik ve Düello maç öncesi seçilir (327). Aktif skill sayısına eşit ya da büyükse loadout KAPALI olur.'
 where anahtar = 'skill_seti_slot';

alter table public.oyuncu_skill_setleri add column if not exists skiller_duello text[];

-- Düello'da kullanılabilen skill'ler (duello2_durum › skill.izinli ile aynı liste).
create or replace function public.duello2_izinli_skiller()
returns text[] language sql immutable set search_path to 'public'
as $$ select array['elli','sure','soru_degistir','zaman_baskisi','ikinci_sans']::text[] $$;

-- Moda göre set: p_mod '1v1' (Klasik) | 'duello'. Loadout kapalıysa bütün açık skill'ler.
create or replace function public.skill_setim(p_mod text)
returns text[] language sql stable security definer set search_path to 'public'
as $$
  select case when public.skill_loadout_acik() then
    case when p_mod = 'duello' then
      coalesce((select s.skiller_duello from public.oyuncu_skill_setleri s where s.user_id = auth.uid()),
               array['elli','sure','soru_degistir']::text[])
    else
      coalesce((select s.skiller from public.oyuncu_skill_setleri s where s.user_id = auth.uid()),
               array['elli','sure','soru_degistir']::text[])
    end
  else
    coalesce((select array_agg(k.tur order by k.sira) from public.skill_katalogu k
               where k.aktif and public.skill_kilidi_acik(auth.uid(), k.tur)
                 and (p_mod <> 'duello' or k.tur = any(public.duello2_izinli_skiller()))), '{}'::text[])
  end;
$$;
revoke all on function public.skill_setim(text) from public, anon;
grant execute on function public.skill_setim(text) to authenticated;

-- Eski imza (argümansız) Klasik setidir.
create or replace function public.skill_setim()
returns text[] language sql stable security definer set search_path to 'public'
as $$ select public.skill_setim('1v1') $$;

create or replace function public.skill_setimi_kaydet(p_skiller text[], p_mod text)
returns text[] language plpgsql security definer set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  v_slot int := public.ayar_sayi('skill_seti_slot', 3)::int;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  if p_mod not in ('1v1', 'duello') then raise exception 'Geçersiz mod'; end if;
  if p_skiller is null or cardinality(p_skiller) = 0 or cardinality(p_skiller) > v_slot then
    raise exception 'En fazla % skill seçebilirsin', v_slot;
  end if;
  if cardinality(p_skiller) <> (select count(distinct x) from unnest(p_skiller) x)
     or exists (select 1 from unnest(p_skiller) x where not public.skill_aktif(x)) then
    raise exception 'Geçersiz skill seti';
  end if;
  if p_mod = 'duello' and exists (select 1 from unnest(p_skiller) x where not (x = any(public.duello2_izinli_skiller()))) then
    raise exception 'Bu skill Düello''da kullanılamaz';
  end if;
  if exists (select 1 from unnest(p_skiller) x where not public.skill_kilidi_acik(v_me, x)) then
    raise exception 'Bu skill kilitli';
  end if;
  if p_mod = 'duello' then
    insert into public.oyuncu_skill_setleri(user_id, skiller, skiller_duello, guncellendi)
    values (v_me, array['elli','sure','soru_degistir']::text[], p_skiller, now())
    on conflict (user_id) do update set skiller_duello = excluded.skiller_duello, guncellendi = now();
  else
    insert into public.oyuncu_skill_setleri(user_id, skiller, guncellendi)
    values (v_me, p_skiller, now())
    on conflict (user_id) do update set skiller = excluded.skiller, guncellendi = now();
  end if;
  return p_skiller;
end;
$$;
revoke all on function public.skill_setimi_kaydet(text[], text) from public, anon;
grant execute on function public.skill_setimi_kaydet(text[], text) to authenticated;

create or replace function public.skill_setimi_kaydet(p_skiller text[])
returns text[] language sql security definer set search_path to 'public'
as $$ select public.skill_setimi_kaydet(p_skiller, '1v1') $$;
revoke all on function public.skill_setimi_kaydet(text[]) from public, anon;
grant execute on function public.skill_setimi_kaydet(text[]) to authenticated;

CREATE OR REPLACE FUNCTION public.skill_kullanim_kapisi()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    -- 327: set kontrolü yalnız Klasik (1v1) ve Düello'da, moda göre ayrı set.
    if public.skill_loadout_acik() and new.mac_tur in ('1v1', 'duello') then
      select coalesce(case when new.mac_tur = 'duello' then s.skiller_duello else s.skiller end,
                      array['elli','sure','soru_degistir']::text[])
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
$function$
;

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
             'can_kaybeden', h.can_kaybeden) order by h.id), '[]'::jsonb)
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
               'gorunum', p.gorunum, 'can', d.can1, 'dogru', d.dogru1, 'profil', d.profil1,
               'unvan', public.oyuncu_unvani(p.id))
         from public.profiles p where p.id = d.oyuncu1),
      (select jsonb_build_object('id', p.id, 'gorunen_ad', p.gorunen_ad, 'gorunen_avatar', p.gorunen_avatar,
               'gorunum', p.gorunum, 'can', d.can2, 'dogru', d.dogru2, 'profil', d.profil2,
               'unvan', public.oyuncu_unvani(p.id))
         from public.profiles p where p.id = d.oyuncu2)),
    'kategoriler', to_jsonb(public.duello_kategorileri()),
    'kategori_max', public.ayar_sayi('duello_kategori_max', 2),
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
  );
end $function$
;
