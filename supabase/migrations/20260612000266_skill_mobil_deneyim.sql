-- Skill + mobil oyun deneyimi revizyonu (preview branch)
-- Bu migration üretim veritabanına bu görevde UYGULANMAZ.

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('saf_bilgi_odul_carpani', '0.5'::jsonb, 'Skillsiz Klasik ödül çarpanı')
on conflict (anahtar) do update set deger=excluded.deger,aciklama=excluded.aciklama;

alter table public.joker_envanter drop constraint if exists joker_envanter_tur_check;
alter table public.joker_envanter add constraint joker_envanter_tur_check
  check (tur=any(array['elli','sure','pas','seri_koruma','soru_degistir',
    'zaman_baskisi','saldiri_degistir','savunma_kilidi','sis',
    'sigorta','cifte_puan','ikinci_sans']));

-- Klasik ve Düello aynı temel galibiyet ödüllerini kullanır.
insert into public.oyun_ayarlari(anahtar,deger,aciklama)
select 'lig_duello_galibiyet',deger,'Düello galibiyet lig puanı; Klasik standardıyla eşit' from public.oyun_ayarlari where anahtar='lig_mac_galibiyet'
on conflict(anahtar) do update set deger=excluded.deger,aciklama=excluded.aciklama;
insert into public.oyun_ayarlari(anahtar,deger,aciklama)
select 'coin_duello_galibiyet',deger,'Düello galibiyet coini; Klasik standardıyla eşit' from public.oyun_ayarlari where anahtar='coin_mac_galibiyet'
on conflict(anahtar) do update set deger=excluded.deger,aciklama=excluded.aciklama;

create or replace function public.skill_aktif(p_tur text)
returns boolean language sql immutable
as $$ select p_tur in ('elli','sure','soru_degistir','zaman_baskisi','sigorta','cifte_puan','ikinci_sans') $$;

create or replace function public.joker_fiyati(p_tur text)
returns bigint language sql stable security definer set search_path to 'public'
as $$
  select case p_tur
    when 'elli' then public.ayar_sayi('coin_joker_elli',40)
    when 'sure' then public.ayar_sayi('coin_joker_sure',60)
    when 'soru_degistir' then public.ayar_sayi('coin_joker_soru_degistir',80)
    when 'zaman_baskisi' then public.ayar_sayi('coin_joker_zaman_baskisi',60)
    -- Yeni fiyat uydurulmaz; en yakın mevcut skill ayarı kullanılır.
    when 'sigorta' then public.ayar_sayi('coin_joker_sure',60)
    when 'cifte_puan' then public.ayar_sayi('coin_joker_zaman_baskisi',60)
    when 'ikinci_sans' then public.ayar_sayi('coin_joker_soru_degistir',80)
    else null
  end;
$$;

create or replace function public.joker_fiyatlari()
returns jsonb language sql stable security definer set search_path to 'public'
as $$
  select jsonb_object_agg(t,public.joker_fiyati(t))
  from unnest(array['elli','sure','soru_degistir','zaman_baskisi','sigorta','cifte_puan','ikinci_sans']) t;
$$;

-- İkinci Şans'ın ilk yanlış seçimi final cevap değildir. İstemciye güvenmeden
-- geçici olarak sunucuda tutulur; soru/süre değişince kullanılamaz.
create table if not exists public.skill_ikinci_sans_denemeleri (
  mac_tur text not null check (mac_tur in ('1v1','duello')),
  mac_id uuid not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  soru_index integer not null,
  ilk_cevap smallint not null check (ilk_cevap between 0 and 3),
  created_at timestamptz not null default now(),
  primary key (mac_tur,mac_id,user_id,soru_index)
);
alter table public.skill_ikinci_sans_denemeleri enable row level security;
revoke all on public.skill_ikinci_sans_denemeleri from public,anon,authenticated;

create or replace function public.duello_savunma_jokeri(p_id uuid,p_tur text)
returns void language plpgsql security definer set search_path to 'public'
as $$
declare
  d public.duellolar%rowtype; v_me uuid:=auth.uid(); v_ucretsiz boolean:=false;
  v_dogru smallint; v_soru uuid;
begin
  perform public.hiz_siniri('duello_eylem',90,interval '60 seconds');
  if p_tur not in ('elli','sure','soru_degistir','ikinci_sans') then raise exception 'Geçersiz skill'; end if;
  d:=public.duello_kilitle(p_id);
  if d.durum<>'aktif' or d.faz<>'cevap' or d.saldiran=v_me or now()>d.faz_bitis then
    raise exception 'Savunma skilleri yalnız cevap verirken kullanılır';
  end if;
  if p_tur='elli' and d.elli_kapali is not null then raise exception 'Bu soruda 50:50 zaten kullanıldı'; end if;
  if p_tur='sure' and d.ek_sure then raise exception 'Bu soruda Ek Süre zaten kullanıldı'; end if;
  if p_tur='soru_degistir' and d.soru_degisti_savunma then raise exception 'Bu soruda Soru Değiştir zaten kullanıldı'; end if;
  perform public.joker_hak_kontrol('duello',p_id,p_tur);
  v_ucretsiz:=public.jokerler_serbest();
  if not v_ucretsiz then perform public.joker_hareket(v_me,p_tur,-1,'kullanim','duello:'||p_id::text); end if;
  insert into public.joker_kullanimlari(user_id,mac_tur,mac_id,soru_index,tur,ucretsiz)
  values(v_me,'duello',p_id,d.tur*2+d.saldiri_sirasi,p_tur,v_ucretsiz);
  if p_tur='elli' then
    select dogru_cevap into v_dogru from public.questions where id=d.soru_id;
    update public.duellolar set elli_kapali=(select array_agg(x) from
      (select x from generate_series(0,3)x where x<>v_dogru order by random() limit 2)s),son_hareket=now() where id=p_id;
  elsif p_tur='sure' then
    update public.duellolar set ek_sure=true,
      faz_bitis=faz_bitis+make_interval(secs=>public.ayar_sayi('duello_ek_sure_sn',5)),son_hareket=now() where id=p_id;
  elsif p_tur='soru_degistir' then
    v_soru:=public.duello_soru_bul(p_id,d.kategori,array[v_me,d.saldiran],d.kullanilan_sorular);
    if v_soru is null then raise exception 'Bu kategoride başka soru kalmadı'; end if;
    update public.duellolar set soru_id=v_soru,soru_degisti_savunma=true,elli_kapali=null,
      kullanilan_sorular=kullanilan_sorular||v_soru,
      faz_bitis=now()+make_interval(secs=>case when zaman_baskisi then public.ayar_sayi('duello_zaman_baskisi_sn',10)
        else public.ayar_sayi('duello_cevap_sn',15) end),son_hareket=now() where id=p_id;
  else
    update public.duellolar set son_hareket=now() where id=p_id;
  end if;
  perform public.duello_sinyal_ver(p_id);
end;
$$;

-- Üç yeni skill için dar, açık bir hazırlama yüzeyi. Sigorta/2X Düello'ya
-- sokulmaz; Düello yalnız İkinci Şans'ı doğal savunma akışında kabul eder.
create or replace function public.skill_hazirla(p_mac_tur text,p_mac_id uuid,p_soru_index integer,p_tur text)
returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare v_me uuid:=auth.uid(); v_ucretsiz boolean:=false;
begin
  perform public.hiz_siniri('skill_hazirla',30,interval '60 seconds');
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  if p_tur not in ('sigorta','cifte_puan','ikinci_sans') then raise exception 'Geçersiz skill'; end if;
  if p_mac_tur='duello' then
    if p_tur<>'ikinci_sans' then raise exception 'Bu skill Düello modunda kullanılamaz'; end if;
    perform public.duello_savunma_jokeri(p_mac_id,p_tur);
    return jsonb_build_object('tur',p_tur);
  end if;
  if p_mac_tur<>'1v1' then raise exception 'Bu skill bu modda kullanılamaz'; end if;
  if p_soru_index is null then raise exception 'Soru bilgisi gerekli'; end if;
  perform public.joker_hak_kontrol(p_mac_tur,p_mac_id,p_tur);
  v_ucretsiz:=public.jokerler_serbest();
  if not v_ucretsiz then perform public.joker_hareket(v_me,p_tur,-1,'kullanim',p_mac_tur||':'||p_mac_id::text); end if;
  insert into public.joker_kullanimlari(user_id,mac_tur,mac_id,soru_index,tur,ucretsiz)
  values(v_me,p_mac_tur,p_mac_id,p_soru_index,p_tur,v_ucretsiz);
  return jsonb_build_object('tur',p_tur);
end;
$$;
revoke all on function public.skill_hazirla(text,uuid,integer,text) from public,anon;
grant execute on function public.skill_hazirla(text,uuid,integer,text) to authenticated;

create or replace function public.skill_al_ve_hazirla(p_mac_tur text,p_mac_id uuid,p_soru_index integer,p_tur text)
returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare
  v_me uuid:=auth.uid(); v_fiyat bigint; v_adet int; v_satin boolean:=false; v_sonuc jsonb;
begin
  perform public.hiz_siniri('skill_al_ve_hazirla',10,interval '60 seconds');
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  if p_tur not in ('sigorta','cifte_puan','ikinci_sans') then raise exception 'Geçersiz skill'; end if;
  v_fiyat:=public.joker_fiyati(p_tur);
  perform public.joker_hak_kontrol(p_mac_tur,p_mac_id,p_tur);
  perform 1 from public.profiles where id=v_me for update;
  select coalesce(e.adet,0) into v_adet from public.joker_envanter e where e.user_id=v_me and e.tur=p_tur;
  if not public.jokerler_serbest() and coalesce(v_adet,0)<=0 then
    perform public.coin_harca(v_fiyat,'joker','skill_mac_ici:'||p_mac_id::text);
    perform public.joker_hareket(v_me,p_tur,1,'mac_ici',p_mac_tur||':'||p_mac_id::text);
    v_satin:=true;
  end if;
  v_sonuc:=public.skill_hazirla(p_mac_tur,p_mac_id,p_soru_index,p_tur);
  return v_sonuc||jsonb_build_object('satin_alindi',v_satin,'odenen',case when v_satin then v_fiyat else 0 end,
    'coin',(select coin from public.profiles where id=v_me));
end;
$$;
revoke all on function public.skill_al_ve_hazirla(text,uuid,integer,text) from public,anon;
grant execute on function public.skill_al_ve_hazirla(text,uuid,integer,text) to authenticated;

drop function if exists public.submit_match_answer(uuid,smallint);
create function public.submit_match_answer(p_match_id uuid,p_cevap smallint)
returns table(dogru boolean,dogru_cevap smallint,puan integer,benim_skor integer,rakip_skor integer,
  tekrar_hakki boolean,ilk_yanlis_cevap smallint)
language plpgsql security definer set search_path to 'public'
as $$
#variable_conflict use_column
declare
  m public.matches%rowtype; q public.questions%rowtype; v_dogru boolean; v_puan int; v_ben_p1 boolean;
  v_index int; v_bas timestamptz; v_toplam int; v_senkron boolean; v_s1 int; v_s2 int; v_soru_id uuid;
  v_skill text; v_ilk smallint;
begin
  perform public.hiz_siniri('submit_match_answer',60,interval '60 seconds');
  if p_cevap is null or p_cevap not between 0 and 3 then raise exception 'Geçersiz cevap'; end if;
  select * into m from public.matches where id=p_match_id for update;
  if not found then raise exception 'Maç bulunamadı'; end if;
  if auth.uid() not in(m.oyuncu1,m.oyuncu2) then raise exception 'Bu maçta değilsin'; end if;
  if m.durum<>'aktif' then raise exception 'Maç aktif değil'; end if;
  v_ben_p1:=(m.oyuncu1=auth.uid()); v_senkron:=coalesce(m.senkron,false);
  v_toplam:=coalesce(array_length(m.soru_ids,1),0);
  if v_senkron then
    if not m.basladi or m.soru_baslangic is null then raise exception 'Maç henüz başlamadı'; end if;
    if m.duraklatildi_at is not null then raise exception 'Rakip bağlantısı koptu — maç duraklatıldı'; end if;
    if now()<m.soru_baslangic then raise exception 'Maç başlamak üzere'; end if;
    v_index:=m.aktif_soru; v_bas:=m.soru_baslangic;
  else
    v_index:=case when v_ben_p1 then m.oyuncu1_soru else m.oyuncu2_soru end;
    v_bas:=coalesce(case when v_ben_p1 then m.oyuncu1_baslangic else m.oyuncu2_baslangic end,now());
  end if;
  if v_index>=v_toplam then raise exception 'Bu maçta senin sıran bitti'; end if;
  v_soru_id:=public.soru_id_coz('1v1',p_match_id,auth.uid(),v_index,m.soru_ids[v_index+1]);
  v_bas:=public.soru_baslangic_coz('1v1',p_match_id,auth.uid(),v_index,v_bas);
  if now()>v_bas+interval '17 seconds' then raise exception 'Süre doldu'; end if;
  if exists(select 1 from public.match_answers a where a.match_id=p_match_id and a.user_id=auth.uid() and a.soru_index=v_index)
    then raise exception 'Bu soruyu zaten cevapladın'; end if;
  if v_senkron and exists(select 1 from public.joker_kullanimlari k where k.mac_tur='1v1' and k.mac_id=p_match_id
    and k.soru_index=v_index and k.tur='sis' and k.user_id<>auth.uid()
    and k.created_at+make_interval(secs=>public.ayar_sayi('klasik_sis_sn',3))>now())
    then raise exception 'Sis kalkınca cevaplayabilirsin'; end if;
  select * into q from public.questions where id=v_soru_id;
  v_dogru:=(p_cevap=q.dogru_cevap);
  select k.tur into v_skill from public.joker_kullanimlari k where k.mac_tur='1v1' and k.mac_id=p_match_id
    and k.user_id=auth.uid() and k.soru_index=v_index and k.tur in('sigorta','cifte_puan','ikinci_sans')
    order by k.created_at desc limit 1;
  select s.ilk_cevap into v_ilk from public.skill_ikinci_sans_denemeleri s where s.mac_tur='1v1'
    and s.mac_id=p_match_id and s.user_id=auth.uid() and s.soru_index=v_index for update;
  if v_skill='ikinci_sans' and not v_dogru and v_ilk is null then
    insert into public.skill_ikinci_sans_denemeleri(mac_tur,mac_id,user_id,soru_index,ilk_cevap)
    values('1v1',p_match_id,auth.uid(),v_index,p_cevap);
    select oyuncu1_skor,oyuncu2_skor into v_s1,v_s2 from public.matches where id=p_match_id;
    return query select false,q.dogru_cevap,0,
      case when v_ben_p1 then v_s1 else v_s2 end,case when v_ben_p1 then v_s2 else v_s1 end,true,p_cevap;
    return;
  end if;
  if v_ilk is not null and p_cevap=v_ilk then raise exception 'Başka bir cevap seç'; end if;
  delete from public.skill_ikinci_sans_denemeleri where mac_tur='1v1' and mac_id=p_match_id
    and user_id=auth.uid() and soru_index=v_index;
  perform public.soru_sayac(q.id,v_dogru);
  insert into public.match_answers(match_id,user_id,soru_index,cevap,dogru)
  values(p_match_id,auth.uid(),v_index,p_cevap,v_dogru);
  if not v_dogru then perform public.yanlis_kaydet(q.id); end if;
  v_puan:=case when v_dogru and v_skill='cifte_puan' then 20 when v_dogru then 10
    when not v_dogru and v_skill='sigorta' then 5 else 0 end;
  if v_ben_p1 then
    update public.matches set oyuncu1_skor=oyuncu1_skor+v_puan,oyuncu1_soru=v_index+1,
      oyuncu1_baslangic=case when v_senkron then oyuncu1_baslangic else null end,
      oyuncu1_bitti_at=case when not v_senkron and v_index+1>=v_toplam then now() else oyuncu1_bitti_at end,
      aktif_soru=case when v_senkron then aktif_soru else greatest(aktif_soru,v_index+1) end where id=p_match_id;
  else
    update public.matches set oyuncu2_skor=oyuncu2_skor+v_puan,oyuncu2_soru=v_index+1,
      oyuncu2_baslangic=case when v_senkron then oyuncu2_baslangic else null end,
      oyuncu2_bitti_at=case when not v_senkron and v_index+1>=v_toplam then now() else oyuncu2_bitti_at end,
      aktif_soru=case when v_senkron then aktif_soru else greatest(aktif_soru,v_index+1) end where id=p_match_id;
  end if;
  perform public.advance_match(p_match_id);
  select oyuncu1_skor,oyuncu2_skor into v_s1,v_s2 from public.matches where id=p_match_id;
  return query select v_dogru,q.dogru_cevap,v_puan,
    case when v_ben_p1 then v_s1 else v_s2 end,case when v_ben_p1 then v_s2 else v_s1 end,false,v_ilk;
end;
$$;
revoke all on function public.submit_match_answer(uuid,smallint) from public,anon;
grant execute on function public.submit_match_answer(uuid,smallint) to authenticated;

drop function if exists public.duello_cevap(uuid,smallint);
create function public.duello_cevap(p_id uuid,p_cevap smallint)
returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare
  d public.duellolar%rowtype; v_me uuid:=auth.uid(); v_dogru boolean; v_index int; v_ilk smallint; v_ikinci boolean;
begin
  perform public.hiz_siniri('duello_eylem',90,interval '60 seconds');
  if p_cevap is null or p_cevap not between 0 and 3 then raise exception 'Geçersiz cevap'; end if;
  d:=public.duello_kilitle(p_id);
  if d.durum<>'aktif' then raise exception 'Düello bitti'; end if;
  if d.faz='cevap' then
    if d.saldiran=v_me then raise exception 'Kendi saldırını cevaplayamazsın'; end if;
    v_index:=d.tur*2+d.saldiri_sirasi;
    v_dogru:=p_cevap=(select dogru_cevap from public.questions where id=d.soru_id);
    v_ikinci:=exists(select 1 from public.joker_kullanimlari k where k.mac_tur='duello' and k.mac_id=p_id
      and k.user_id=v_me and k.soru_index=v_index and k.tur='ikinci_sans');
    select s.ilk_cevap into v_ilk from public.skill_ikinci_sans_denemeleri s where s.mac_tur='duello'
      and s.mac_id=p_id and s.user_id=v_me and s.soru_index=v_index for update;
    if v_ikinci and not v_dogru and v_ilk is null then
      insert into public.skill_ikinci_sans_denemeleri(mac_tur,mac_id,user_id,soru_index,ilk_cevap)
      values('duello',p_id,v_me,v_index,p_cevap);
      return jsonb_build_object('tekrar_hakki',true,'ilk_yanlis_cevap',p_cevap);
    end if;
    if v_ilk is not null and p_cevap=v_ilk then raise exception 'Başka bir cevap seç'; end if;
    delete from public.skill_ikinci_sans_denemeleri where mac_tur='duello' and mac_id=p_id
      and user_id=v_me and soru_index=v_index;
    perform public.gorulen_kaydet(d.soru_id); perform public.duello_cozumle(p_id,p_cevap);
  elsif d.faz='altin' then
    if d.altin_cevaplar?v_me::text then raise exception 'Bu soruyu zaten cevapladın'; end if;
    v_dogru:=p_cevap=(select dogru_cevap from public.questions where id=d.soru_id);
    update public.duellolar set altin_cevaplar=altin_cevaplar||jsonb_build_object(v_me::text,
      jsonb_build_object('cevap',p_cevap,'dogru',v_dogru)),son_hareket=now() where id=p_id;
    perform public.gorulen_kaydet(d.soru_id); perform public.kategori_istatistik_yaz(v_me,d.kategori,v_dogru);
    if v_dogru then perform public.kategori_dogru_arttir(v_me,d.kategori); end if;
    select * into d from public.duellolar where id=p_id;
    if (d.altin_cevaplar?d.oyuncu1::text) and (d.altin_cevaplar?d.oyuncu2::text) then
      perform public.duello_altin_degerlendir(p_id); end if;
  else raise exception 'Şu an cevap verilemez'; end if;
  perform public.duello_sinyal_ver(p_id);
  return jsonb_build_object('tekrar_hakki',false);
end;
$$;
revoke all on function public.duello_cevap(uuid,smallint) from public,anon;
grant execute on function public.duello_cevap(uuid,smallint) to authenticated;

create or replace function public.duello_rovans_iptal(p_id uuid)
returns void language plpgsql security definer set search_path to 'public'
as $$
declare d public.duellolar%rowtype;
begin
  perform public.hiz_siniri('duello_eylem',90,interval '60 seconds');
  d:=public.duello_kilitle(p_id);
  if auth.uid() not in(d.oyuncu1,d.oyuncu2) then raise exception 'Bu düelloda değilsin'; end if;
  if d.rovans_id is not null then raise exception 'Rövanş zaten başladı'; end if;
  if d.rovans_isteyen is distinct from auth.uid() then raise exception 'Geri çekilecek rövanş isteği yok'; end if;
  update public.duellolar set rovans_isteyen=null,rovans_at=null where id=p_id;
  perform public.duello_sinyal_ver(p_id);
end;
$$;
revoke all on function public.duello_rovans_iptal(uuid) from public,anon;
grant execute on function public.duello_rovans_iptal(uuid) to authenticated;

-- Klasik coin ödülünde Saf Bilgi ve Serbest indirimleri üst üste çarpılmaz;
-- en düşük geçerli çarpan uygulanır. Böylece %50, yanlışlıkla %25 olmaz.
create or replace function public.coin_mac_odulu(p_referans text,p_kazanan uuid,p_oyuncular uuid[],p_carpan numeric default 1,
  p_serbest boolean default false,p_acik_bot boolean default false,p_galibiyet_anahtar text default 'coin_mac_galibiyet')
returns void language plpgsql security definer set search_path to 'public'
as $$
declare
  v_galibiyet bigint:=public.ayar_sayi(coalesce(p_galibiyet_anahtar,'coin_mac_galibiyet'),25);
  v_beraberlik bigint:=public.ayar_sayi('coin_mac_beraberlik',10); v_serbest boolean:=coalesce(p_serbest,false);
  v_carpan numeric; v_oyuncu uuid; v_mac_id uuid; v_dereceli boolean; v_jokersiz boolean:=false;
begin
  if p_referans is null then return; end if;
  begin v_mac_id:=p_referans::uuid; exception when others then v_mac_id:=null; end;
  if v_mac_id is not null then
    select coalesce(m.dereceli,true),coalesce(m.jokersiz,false) into v_dereceli,v_jokersiz from public.matches m where m.id=v_mac_id;
    if found and not v_dereceli then v_serbest:=true; end if;
  end if;
  v_carpan:=public.odul_carpani(p_carpan,v_serbest,p_acik_bot);
  if v_jokersiz then v_carpan:=least(v_carpan,public.ayar_ondalik('saf_bilgi_odul_carpani',0.5)); end if;
  perform set_config('app.odul_detay',coalesce(jsonb_build_object('indirim',
    case when v_jokersiz then 'Saf Bilgi' else public.odul_indirim_sebebi(p_carpan,v_serbest,p_acik_bot) end)::text,''),true);
  if v_carpan<=0 then
    foreach v_oyuncu in array(case when p_kazanan is null then coalesce(p_oyuncular,'{}'::uuid[]) else array[p_kazanan] end) loop
      perform public.odul_kalem_yaz(v_oyuncu,case when p_kazanan is null then 'beraberlik' else 'galibiyet' end,0,0,'{}'::jsonb);
    end loop;
  elsif p_kazanan is not null then
    perform set_config('app.odul_kalem','galibiyet',true);
    perform public.coin_ekle(p_kazanan,floor(v_galibiyet*v_carpan)::bigint,'mac',p_referans);
  else
    perform set_config('app.odul_kalem','beraberlik',true);
    foreach v_oyuncu in array coalesce(p_oyuncular,'{}'::uuid[]) loop
      perform public.coin_ekle(v_oyuncu,floor(v_beraberlik*v_carpan)::bigint,'mac',p_referans);
    end loop;
  end if;
  perform set_config('app.odul_kalem','',true); perform set_config('app.odul_detay','',true);
end;
$$;

-- Saf Bilgi indirimi lig ve coin için aynı çarpanı kullanır. Serbest maçın
-- "lig yok" kuralı değişmez; indirimler birbiriyle çarpılmaz.
create or replace function public.mac_sonuclandir(p_match_id uuid,p_kazanan uuid,p_kaybeden uuid)
returns void language plpgsql security definer set search_path to 'public'
as $$
declare
  m public.matches%rowtype; v_oyuncu uuid; v_carpan numeric:=1; v_lig int;
  v_bot_var boolean; v_acik_bot boolean;
  v_bot_yuzde numeric:=public.ayar_sayi('lig_bot_puan_yuzde',40)::numeric/100;
  v_oyuncu_bot boolean;
begin
  select * into m from public.matches where id=p_match_id;
  if not found then return; end if;
  perform public.odul_baglam('mac:'||p_match_id::text);
  select bool_or(coalesce(p.is_bot,false)),
         bool_or(coalesce(p.is_bot,false) and coalesce(p.bot_turu,'acik')='acik')
    into v_bot_var,v_acik_bot from public.profiles p where p.id in(m.oyuncu1,m.oyuncu2);
  if coalesce(v_bot_var,false) then v_carpan:=1;
  else v_carpan:=public.cift_odul_carpani(m.oyuncu1,m.oyuncu2,p_match_id); end if;
  if coalesce(m.jokersiz,false) then
    v_carpan:=least(v_carpan,public.ayar_ondalik('saf_bilgi_odul_carpani',0.5));
  end if;
  update public.matches set durum='bitti',kazanan=p_kazanan,bitis=now(),
    odul_carpan=v_carpan,dostluk=(v_carpan=0) where id=p_match_id;
  perform public.coin_mac_odulu(p_match_id::text,p_kazanan,array[m.oyuncu1,m.oyuncu2],
    v_carpan,not coalesce(m.dereceli,true),coalesce(v_acik_bot,false));
  if p_kazanan is not null then perform public.award_badge(p_kazanan,'ilk_galibiyet'); end if;
  if not coalesce(m.dereceli,true) then perform public.odul_baglam(null); return; end if;
  if p_kazanan is not null then
    select coalesce(is_bot,false) into v_oyuncu_bot from public.profiles where id=p_kazanan;
    v_lig:=floor(public.ayar_sayi('lig_mac_galibiyet',25)*v_carpan*
      (case when v_oyuncu_bot then v_bot_yuzde else 1 end))::int;
    if v_lig>0 then update public.profiles set puan=puan+v_lig,puan_hafta=puan_hafta+v_lig where id=p_kazanan; end if;
    perform public.odul_kalem_yaz(p_kazanan,'galibiyet',greatest(v_lig,0),0,
      case when coalesce(m.jokersiz,false) then jsonb_build_object('indirim','Saf Bilgi') else public.odul_lig_indirimi(v_carpan) end);
    if (select count(*) from public.matches where kazanan=p_kazanan and durum='bitti')>=10 then
      perform public.award_badge(p_kazanan,'mac_10'); end if;
    if p_kaybeden='b0b00000-0000-4000-8000-000000000003' then perform public.award_badge(p_kazanan,'bot_avcisi'); end if;
    if (select count(*) from public.match_answers where match_id=p_match_id and user_id=p_kazanan and dogru)
      >=coalesce(array_length(m.soru_ids,1),0) then perform public.award_badge(p_kazanan,'tam_isabet'); end if;
  else
    foreach v_oyuncu in array array[m.oyuncu1,m.oyuncu2] loop
      select coalesce(is_bot,false) into v_oyuncu_bot from public.profiles where id=v_oyuncu;
      v_lig:=floor(public.ayar_sayi('lig_mac_beraberlik',10)*v_carpan*
        (case when v_oyuncu_bot then v_bot_yuzde else 1 end))::int;
      if v_lig>0 then update public.profiles set puan=puan+v_lig,puan_hafta=puan_hafta+v_lig where id=v_oyuncu; end if;
      perform public.odul_kalem_yaz(v_oyuncu,'beraberlik',greatest(v_lig,0),0,
        case when coalesce(m.jokersiz,false) then jsonb_build_object('indirim','Saf Bilgi') else public.odul_lig_indirimi(v_carpan) end);
    end loop;
  end if;
  foreach v_oyuncu in array array[m.oyuncu1,m.oyuncu2] loop perform public.gunluk_seri_bonusu(v_oyuncu); end loop;
  perform public.odul_baglam(null);
end;
$$;

-- Deneme kayıtları maç/soru sonlandığında geride kalabilse bile etkisizdir;
-- küçük bakım işi eski kayıtları temizler.
delete from public.skill_ikinci_sans_denemeleri where created_at<now()-interval '1 day';
