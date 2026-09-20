-- Skill sistemi hardening
-- Klasik: 3 seçili skill, maçta toplam 6, tür başına 2, soru başına 1.
-- Eski joker_* adları istemci uyumluluğu için korunur.

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('klasik_skill_toplam_hak', '6'::jsonb, 'Klasik maçta oyuncu başına toplam skill kullanımı'),
  ('klasik_skill_tur_basi_hak', '2'::jsonb, 'Klasik maçta aynı skill için kullanım sınırı'),
  ('klasik_skill_soru_basi_hak', '1'::jsonb, 'Klasik maçta soru başına skill kullanım sınırı')
on conflict (anahtar) do nothing;

-- Eski ortak kapı Klasik için "aynı tür bir kez" ve duello_joker_hak
-- kullanıyordu. Klasik kendi ayarlarını okur; diğer modların davranışı korunur.
create or replace function public.joker_hak_kontrol(p_mac_tur text, p_mac_id uuid, p_tur text)
returns void language plpgsql stable security definer set search_path to 'public'
as $$
declare
  v_me uuid := auth.uid();
  v_sinir int;
  v_kullanilan int;
  v_tur_kullanilan int;
begin
  if p_mac_tur = '1v1' and exists (
    select 1 from public.matches m where m.id = p_mac_id and coalesce(m.jokersiz, false)
  ) then
    raise exception 'Bu modda skill kullanılamaz';
  end if;

  if p_mac_tur = '1v1' then
    v_sinir := public.ayar_sayi('klasik_skill_toplam_hak', 6)::int;
    select count(*), count(*) filter (where tur = p_tur)
      into v_kullanilan, v_tur_kullanilan
      from public.joker_kullanimlari
     where user_id = v_me and mac_tur = p_mac_tur and mac_id = p_mac_id;
    if v_kullanilan >= v_sinir then
      raise exception 'Bu maçta en fazla % skill kullanabilirsin', v_sinir;
    end if;
    if v_tur_kullanilan >= public.ayar_sayi('klasik_skill_tur_basi_hak', 2)::int then
      raise exception 'Bu skill için maç hakkın doldu';
    end if;
    return;
  end if;

  -- Grup/turnuva/düello kuralları değişmedi.
  if exists (
    select 1 from public.joker_kullanimlari
     where user_id = v_me and mac_tur = p_mac_tur and mac_id = p_mac_id and tur = p_tur
  ) then
    raise exception 'Bu skill''i bu maçta zaten kullandın';
  end if;
  if p_mac_tur = 'duello' then
    v_sinir := public.ayar_sayi('duello_joker_hak', 4)::int;
  else
    v_sinir := public.joker_mac_siniri(p_mac_tur, p_mac_id);
  end if;
  if v_sinir = 0 then raise exception 'Turnuva finalinde skill kullanılamaz'; end if;
  if v_sinir is null then return; end if;
  select count(*) into v_kullanilan from public.joker_kullanimlari
   where user_id = v_me and mac_tur = p_mac_tur and mac_id = p_mac_id;
  if v_kullanilan >= v_sinir then
    raise exception 'Bu maçta en fazla % skill kullanabilirsin', v_sinir;
  end if;
end;
$$;

-- Son ve ortak atomik kapı. İnsan RPC'leri ile doğrudan kayıt atan bot aynı
-- kilit ve aynı 6/2/1 kurallarından geçer. Önceki Ek Süre kişiselleştirmesi korunur.
create or replace function public.skill_kullanim_kapisi()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
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
    select coalesce(s.skiller, array['elli','sure','soru_degistir']::text[])
      into v_secili from (select 1) z
      left join public.oyuncu_skill_setleri s on s.user_id = new.user_id;
    if not (new.tur = any(v_secili)) then raise exception 'Bu skill maç setinde değil'; end if;
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
$$;

-- UI artık türün ilk kullanımından sonra onu maç boyunca kapatmaz. Kalan haklar
-- envanterden ayrı, sunucunun sayımlarından gösterilir.
drop function if exists public.joker_mac_durumu(text, uuid);
create function public.joker_mac_durumu(p_mac_tur text, p_mac_id uuid)
returns table(
  sinir integer, kullanilan integer, ucretsiz_elli_kaldi boolean,
  kilitli boolean, kisaltildi boolean, sis_bitis timestamptz,
  sunucu_zamani timestamptz, kullanilan_turler text[],
  kullanim_sayilari jsonb, tur_basi_sinir integer,
  soru_basi_sinir integer, soruda_kullanildi boolean
)
language sql stable security definer set search_path to 'public'
as $$
  with mac as (
    select m.* from public.matches m where p_mac_tur='1v1' and m.id=p_mac_id
  ), etki as (
    select k.tur,k.created_at from mac m join public.joker_kullanimlari k
      on k.mac_tur='1v1' and k.mac_id=m.id and k.soru_index=m.aktif_soru
     and k.user_id<>auth.uid()
    where auth.uid() in(m.oyuncu1,m.oyuncu2)
  ), benim as (
    select k.* from public.joker_kullanimlari k
     where k.user_id=auth.uid() and k.mac_tur=p_mac_tur and k.mac_id=p_mac_id
  )
  select
    case when p_mac_tur='1v1' then public.ayar_sayi('klasik_skill_toplam_hak',6)::int
         else public.joker_mac_siniri(p_mac_tur,p_mac_id) end,
    (select count(*)::int from benim),
    public.joker_ucretsiz_elli_hakki(p_mac_tur,p_mac_id),
    false,
    exists(select 1 from etki where tur='zaman_baskisi'),
    null::timestamptz,
    now(),
    coalesce((select array_agg(distinct tur) from benim),'{}'::text[]),
    coalesce((select jsonb_object_agg(tur,adet) from
      (select tur,count(*)::int adet from benim group by tur) s),'{}'::jsonb),
    case when p_mac_tur='1v1' then public.ayar_sayi('klasik_skill_tur_basi_hak',2)::int else 1 end,
    case when p_mac_tur='1v1' then public.ayar_sayi('klasik_skill_soru_basi_hak',1)::int else null end,
    case when p_mac_tur='1v1' then exists(
      select 1 from benim b join mac m on b.soru_index = case when coalesce(m.senkron,false) then m.aktif_soru
        when m.oyuncu1=auth.uid() then coalesce(m.oyuncu1_soru,0) else coalesce(m.oyuncu2_soru,0) end)
      else false end;
$$;
revoke all on function public.joker_mac_durumu(text,uuid) from public,anon;
grant execute on function public.joker_mac_durumu(text,uuid) to authenticated;

-- Botun olasılığı değişmez; yalnız insanla aynı 6/2/1 yasal sınırları uygulanır.
create or replace function public.bot_klasik_joker_tik()
returns void language plpgsql security definer set search_path to 'public'
as $$
declare r record; v_tur text;
begin
  if not pg_try_advisory_xact_lock(hashtext('bot_klasik_joker_tik')) then return; end if;
  for r in
    select m.id,m.aktif_soru idx,p.id bot_id,
           case when m.oyuncu1=p.id then m.oyuncu2 else m.oyuncu1 end insan_id
    from public.matches m join public.profiles p on p.is_bot and p.id in(m.oyuncu1,m.oyuncu2)
    where m.durum='aktif' and coalesce(m.senkron,false) and m.basladi
      and not coalesce(m.jokersiz,false) and m.duraklatildi_at is null
      and m.aktif_soru < coalesce(array_length(m.soru_ids,1),0)
      and now() >= m.soru_baslangic + make_interval(secs=>2+6*public.bot_rasgele('kjz:'||m.id::text||':'||m.aktif_soru))
      and now() <= m.soru_baslangic + interval '10 seconds'
      and public.bot_rasgele('kjok:'||m.id::text||':'||m.aktif_soru)*100 < public.ayar_sayi('klasik_bot_joker_yuzde',15)
    for update of m skip locked
  loop
    continue when exists(select 1 from public.joker_kullanimlari k where k.mac_tur='1v1' and k.mac_id=r.id and k.soru_index=r.idx and k.user_id=r.bot_id);
    continue when exists(select 1 from public.match_answers a where a.match_id=r.id and a.soru_index=r.idx and a.user_id in(r.insan_id,r.bot_id));
    continue when (select count(*) from public.joker_kullanimlari k where k.mac_tur='1v1' and k.mac_id=r.id and k.user_id=r.bot_id)
      >= public.ayar_sayi('klasik_skill_toplam_hak',6);
    select t into v_tur from unnest(array['zaman_baskisi','soru_degistir']) t
      where (select count(*) from public.joker_kullanimlari k where k.mac_tur='1v1' and k.mac_id=r.id and k.user_id=r.bot_id and k.tur=t)
        < public.ayar_sayi('klasik_skill_tur_basi_hak',2)
      order by public.bot_rasgele('kjt:'||r.id::text||':'||r.idx||':'||t) limit 1;
    continue when v_tur is null;
    insert into public.joker_kullanimlari(user_id,mac_tur,mac_id,soru_index,tur,ucretsiz)
      values(r.bot_id,'1v1',r.id,r.idx,v_tur,true);
    if v_tur='soru_degistir' then perform public.mac_soru_degistir('1v1',r.id,r.bot_id,r.idx); end if;
    perform public.klasik_joker_etki(r.id,r.bot_id,r.idx,v_tur);
  end loop;
end;
$$;

-- Düelloda tek saldırı skill'i Zaman Baskısıdır. Eski istemciler kaldırılmış
-- türlerle RPC'yi çağırsa dahi sunucu reddeder.
create or replace function public.duello_saldiri_jokeri(p_id uuid, p_tur text)
returns void language plpgsql security definer set search_path to 'public'
as $$
declare
  d public.duellolar%rowtype;
  v_me uuid := auth.uid();
  v_ucretsiz boolean;
begin
  perform public.hiz_siniri('duello_eylem',90,interval '60 seconds');
  if p_tur <> 'zaman_baskisi' then raise exception 'Bu saldırı skill''i artık aktif değil'; end if;
  d := public.duello_kilitle(p_id);
  if d.durum<>'aktif' or d.faz<>'hazirlik' or d.saldiran<>v_me or now()>=d.faz_bitis then
    raise exception 'Saldırı skilleri yalnız Saldırı Hazırlığı sırasında kullanılır';
  end if;
  if d.zaman_baskisi then raise exception 'Bu skill bu saldırıda zaten kullanıldı'; end if;
  perform public.joker_hak_kontrol('duello',p_id,p_tur);
  v_ucretsiz := public.jokerler_serbest();
  if not v_ucretsiz then
    perform public.joker_hareket(v_me,p_tur,-1,'kullanim','duello:'||p_id::text);
  end if;
  insert into public.joker_kullanimlari(user_id,mac_tur,mac_id,soru_index,tur,ucretsiz)
  values(v_me,'duello',p_id,d.tur*2+d.saldiri_sirasi,p_tur,v_ucretsiz);
  update public.duellolar set zaman_baskisi=true,son_hareket=now() where id=p_id;
  perform public.duello_sinyal_ver(p_id);
end;
$$;

-- Savunma yalnız 50:50, Ek Süre ve kişinin cevaplamakta olduğu soruyu
-- değiştirmedir; kaldırılan saldırı etkilerine bağlı bir kilit yoktur.
create or replace function public.duello_savunma_jokeri(p_id uuid, p_tur text)
returns void language plpgsql security definer set search_path to 'public'
as $$
declare
  d public.duellolar%rowtype;
  v_me uuid := auth.uid();
  v_ucretsiz boolean := false;
  v_dogru smallint;
  v_soru uuid;
begin
  perform public.hiz_siniri('duello_eylem',90,interval '60 seconds');
  if p_tur not in ('elli','sure','soru_degistir') then raise exception 'Geçersiz skill'; end if;
  d := public.duello_kilitle(p_id);
  if d.durum<>'aktif' or d.faz<>'cevap' or d.saldiran=v_me or now()>d.faz_bitis then
    raise exception 'Savunma skilleri yalnız cevap verirken kullanılır';
  end if;
  if p_tur='elli' and d.elli_kapali is not null then raise exception 'Bu soruda 50:50 zaten kullanıldı'; end if;
  if p_tur='sure' and d.ek_sure then raise exception 'Bu soruda Ek Süre zaten kullanıldı'; end if;
  if p_tur='soru_degistir' and d.soru_degisti_savunma then raise exception 'Bu soruda Soru Değiştir zaten kullanıldı'; end if;
  perform public.joker_hak_kontrol('duello',p_id,p_tur);
  v_ucretsiz := public.jokerler_serbest();
  if not v_ucretsiz then
    perform public.joker_hareket(v_me,p_tur,-1,'kullanim','duello:'||p_id::text);
  end if;
  insert into public.joker_kullanimlari(user_id,mac_tur,mac_id,soru_index,tur,ucretsiz)
  values(v_me,'duello',p_id,d.tur*2+d.saldiri_sirasi,p_tur,v_ucretsiz);
  if p_tur='elli' then
    select dogru_cevap into v_dogru from public.questions where id=d.soru_id;
    update public.duellolar set elli_kapali=(select array_agg(x) from
      (select x from generate_series(0,3)x where x<>v_dogru order by random() limit 2)s),
      son_hareket=now() where id=p_id;
  elsif p_tur='sure' then
    update public.duellolar set ek_sure=true,
      faz_bitis=faz_bitis+make_interval(secs=>public.ayar_sayi('duello_ek_sure_sn',5)),
      son_hareket=now() where id=p_id;
  else
    v_soru := public.duello_soru_bul(p_id,d.kategori,array[v_me,d.saldiran],d.kullanilan_sorular);
    if v_soru is null then raise exception 'Bu kategoride başka soru kalmadı'; end if;
    update public.duellolar set soru_id=v_soru,soru_degisti_savunma=true,elli_kapali=null,
      kullanilan_sorular=kullanilan_sorular||v_soru,
      faz_bitis=now()+make_interval(secs=>case when zaman_baskisi then public.ayar_sayi('duello_zaman_baskisi_sn',10)
        else public.ayar_sayi('duello_cevap_sn',15) end),son_hareket=now() where id=p_id;
  end if;
  perform public.duello_sinyal_ver(p_id);
end;
$$;
