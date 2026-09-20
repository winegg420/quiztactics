-- Skill Sistemi v1
-- Oyuncu dili Joker -> Skill olur; mevcut joker_* tablo/RPC adları geriye uyumluluk
-- için korunur. Geçmiş kayıtlar ve envanterler silinmez.

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('skill_seti_slot', '3'::jsonb, 'Maç öncesi seçilebilen skill slotu sayısı'),
  ('skill_ek_sure_sn', '10'::jsonb, 'Klasik/grup/turnuva Ek Süre etkisi')
on conflict (anahtar) do update set deger = excluded.deger, aciklama = excluded.aciklama;

create table if not exists public.oyuncu_skill_setleri (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  skiller text[] not null default array['elli','sure','soru_degistir']::text[],
  guncellendi timestamptz not null default now()
);
alter table public.oyuncu_skill_setleri enable row level security;
drop policy if exists "skill setini oku" on public.oyuncu_skill_setleri;
create policy "skill setini oku" on public.oyuncu_skill_setleri for select
  using (auth.uid() = user_id);

create or replace function public.skill_aktif(p_tur text)
returns boolean language sql immutable
as $$ select p_tur in ('elli','sure','soru_degistir','zaman_baskisi') $$;
revoke all on function public.skill_aktif(text) from public, anon;
grant execute on function public.skill_aktif(text) to authenticated;

create or replace function public.skill_setim()
returns text[] language sql stable security definer set search_path to 'public'
as $$
  select coalesce(
    (select s.skiller from public.oyuncu_skill_setleri s where s.user_id = auth.uid()),
    array['elli','sure','soru_degistir']::text[]
  );
$$;
revoke all on function public.skill_setim() from public, anon;
grant execute on function public.skill_setim() to authenticated;

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
  insert into public.oyuncu_skill_setleri(user_id, skiller, guncellendi)
  values (v_me, p_skiller, now())
  on conflict (user_id) do update set skiller = excluded.skiller, guncellendi = now();
  return p_skiller;
end;
$$;
revoke all on function public.skill_setimi_kaydet(text[]) from public, anon;
grant execute on function public.skill_setimi_kaydet(text[]) to authenticated;

-- Tek Soru Değiştir aynı kategoriden seçim yapar ve yalnız kullanan oyuncunun
-- kişisel override satırını yeniler. Başka kategoriye sessiz fallback yoktur.
create or replace function public.mac_soru_degistir(
  p_mac_tur text, p_mac_id uuid, p_user uuid, p_index integer
)
returns uuid language plpgsql security definer set search_path to 'public'
as $$
declare
  v_haric uuid[];
  v_kategori text;
  v_oyuncular uuid[] := array[p_user];
  v_yeni uuid;
begin
  if p_mac_tur = '1v1' then
    select m.soru_ids,m.kategori,array[m.oyuncu1,m.oyuncu2]
      into v_haric,v_kategori,v_oyuncular from public.matches m where m.id=p_mac_id;
  elsif p_mac_tur = 'grup' then
    select g.soru_ids,g.kategori into v_haric,v_kategori from public.group_matches g where g.id=p_mac_id;
  elsif p_mac_tur = 'hizli' then
    select h.soru_ids,h.kategori into v_haric,v_kategori from public.hizli_maclar h where h.id=p_mac_id;
  else
    raise exception 'Bu maç türünde soru değiştirilemez';
  end if;

  v_haric := coalesce(v_haric,'{}'::uuid[]) || coalesce((
    select array_agg(d.question_id) from public.soru_degisimleri d
    where d.mac_tur=p_mac_tur and d.mac_id=p_mac_id),'{}'::uuid[]);

  select s.id into v_yeni
    from unnest(public.soru_sec(v_kategori,25,coalesce(v_oyuncular,array[p_user]))) s(id)
    where s.id <> all(v_haric) limit 1;
  if v_yeni is null then raise exception 'Bu kategoride değiştirilecek yeni soru kalmadı'; end if;

  insert into public.soru_degisimleri(mac_tur,mac_id,user_id,soru_index,question_id,baslangic)
  values(p_mac_tur,p_mac_id,p_user,p_index,v_yeni,now())
  on conflict(mac_tur,mac_id,user_id,soru_index)
  do update set question_id=excluded.question_id,baslangic=now();
  return v_yeni;
end;
$$;

-- Eski türlerin tekil alım fiyatını kapat; mevcut adetler ve geçmiş hareketler kalır.
create or replace function public.joker_fiyati(p_tur text)
returns bigint language sql stable security definer set search_path to 'public'
as $$
  select case p_tur
    when 'elli' then public.ayar_sayi('coin_joker_elli', 40)
    when 'sure' then public.ayar_sayi('coin_joker_sure', 60)
    when 'soru_degistir' then public.ayar_sayi('coin_joker_soru_degistir', 80)
    when 'zaman_baskisi' then public.ayar_sayi('coin_joker_zaman_baskisi', 60)
    else null
  end;
$$;

create or replace function public.joker_fiyatlari()
returns jsonb language sql stable security definer set search_path to 'public'
as $$
  select jsonb_object_agg(t, public.joker_fiyati(t))
  from unnest(array['elli','sure','soru_degistir','zaman_baskisi']) t;
$$;

-- İçinde kaldırılmış combat skill'i bulunan eski paketleri satıştan gizle.
update public.joker_paketleri
   set aktif = false
 where coalesce(icerik, '{}'::jsonb) ?| array['sis','savunma_kilidi','saldiri_degistir'];

-- Kullanım kaydı bütün maç RPC'lerinin ortak kapısıdır. Böylece eski istemci de
-- kaldırılmış skill'i kullanamaz; coin/envanter değişikliği aynı işlemde geri alınır.
create or replace function public.skill_kullanim_kapisi()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
declare
  v_bot boolean := false;
  v_secili text[];
  v_soru uuid;
  v_bas timestamptz;
  v_m public.matches%rowtype;
begin
  select coalesce(p.is_bot, false) into v_bot from public.profiles p where p.id = new.user_id;

  if not public.skill_aktif(new.tur) then
    -- Eski cron gövdeleri kaldırılmış bir tür seçerse maçı/cron'u düşürme; kayıt
    -- ve etki üretmeden geç. İnsan isteği ise açık biçimde reddedilir.
    if v_bot then return null; end if;
    raise exception 'Bu skill artık aktif değil';
  end if;

  if not v_bot then
    select coalesce(s.skiller, array['elli','sure','soru_degistir']::text[])
      into v_secili
      from (select 1) z
      left join public.oyuncu_skill_setleri s on s.user_id = new.user_id;
    if not (new.tur = any(v_secili)) then
      raise exception 'Bu skill maç setinde değil';
    end if;
  end if;

  -- Eski joker_kullan gövdesi Ek Süre için soru_degisimleri satırı varsa onu
  -- kişisel uzatır. Paylaşılan sayaç yerine kişisel satırı önceden oluşturarak
  -- Klasik ve Grup'ta rakibin süresinin uzamasını engelleriz.
  if new.tur = 'sure' and new.mac_tur <> 'turnuva' then
    if new.mac_tur = '1v1' then
      select * into v_m from public.matches where id = new.mac_id;
      v_soru := public.soru_id_coz('1v1', new.mac_id, new.user_id, new.soru_index,
        v_m.soru_ids[new.soru_index + 1]);
      v_bas := public.soru_baslangic_coz('1v1', new.mac_id, new.user_id, new.soru_index,
        case when coalesce(v_m.senkron,false) then v_m.soru_baslangic
             when v_m.oyuncu1 = new.user_id then v_m.oyuncu1_baslangic
             else v_m.oyuncu2_baslangic end);
    elsif new.mac_tur = 'grup' then
      select public.soru_id_coz('grup', g.id, new.user_id, new.soru_index, g.soru_ids[new.soru_index+1]),
             public.soru_baslangic_coz('grup', g.id, new.user_id, new.soru_index, g.soru_baslangic)
        into v_soru, v_bas from public.group_matches g where g.id = new.mac_id;
    elsif new.mac_tur = 'hizli' then
      select public.soru_id_coz('hizli', h.id, new.user_id, new.soru_index, h.soru_ids[new.soru_index+1]),
             public.soru_baslangic_coz('hizli', h.id, new.user_id, new.soru_index, h.soru_baslangic)
        into v_soru, v_bas from public.hizli_maclar h where h.id = new.mac_id;
    end if;
    if v_soru is not null and v_bas is not null then
      insert into public.soru_degisimleri(mac_tur,mac_id,user_id,soru_index,question_id,baslangic)
      values(new.mac_tur,new.mac_id,new.user_id,new.soru_index,v_soru,v_bas)
      on conflict (mac_tur,mac_id,user_id,soru_index) do nothing;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists skill_kullanim_kapisi_trg on public.joker_kullanimlari;
create trigger skill_kullanim_kapisi_trg
before insert on public.joker_kullanimlari
for each row execute function public.skill_kullanim_kapisi();

-- Tek Soru Değiştir: mac_soru_degistir zaten yalnız p_user için kişisel
-- override yazar. Klasik etki artık bunu rakibe kopyalamaz; yalnız Zaman
-- Baskısı rakibin kişisel sayacını etkiler.
create or replace function public.klasik_joker_etki(p_mac_id uuid, p_user uuid, p_index integer, p_tur text)
returns void language plpgsql security definer set search_path to 'public'
as $$
declare
  m public.matches%rowtype;
  v_rakip uuid;
  v_bas timestamptz;
  v_yeni_bas timestamptz;
  v_soru uuid;
begin
  if p_tur <> 'zaman_baskisi' then return; end if;
  select * into m from public.matches where id = p_mac_id;
  if not found then raise exception 'Maç bulunamadı'; end if;
  if not coalesce(m.senkron, false) then raise exception 'Bu skill yalnız eş zamanlı maçta kullanılabilir'; end if;
  v_rakip := case when m.oyuncu1 = p_user then m.oyuncu2 else m.oyuncu1 end;
  if exists (select 1 from public.match_answers a where a.match_id=p_mac_id and a.user_id=v_rakip and a.soru_index=p_index) then
    raise exception 'Rakibin bu soruyu zaten cevapladı';
  end if;
  v_bas := public.soru_baslangic_coz('1v1',p_mac_id,v_rakip,p_index,m.soru_baslangic);
  v_soru := public.soru_id_coz('1v1',p_mac_id,v_rakip,p_index,m.soru_ids[p_index+1]);
  v_yeni_bas := least(v_bas, greatest(
    v_bas - make_interval(secs => public.ayar_sayi('klasik_zaman_baskisi_sn',5)),
    now() - make_interval(secs => 15-public.ayar_sayi('klasik_zaman_baskisi_taban_sn',3))));
  insert into public.soru_degisimleri(mac_tur,mac_id,user_id,soru_index,question_id,baslangic)
  values('1v1',p_mac_id,v_rakip,p_index,v_soru,v_yeni_bas)
  on conflict(mac_tur,mac_id,user_id,soru_index) do update set baslangic=excluded.baslangic;
  update public.matches set joker_surum=joker_surum+1 where id=p_mac_id;
end;
$$;

-- Eski düello bot gövdesi Savunma Kilidi seçerse alanın aktifleşmesini engelle.
create or replace function public.skill_duello_eski_etki_kapisi()
returns trigger language plpgsql set search_path to 'public'
as $$
begin
  if new.savunma_kilidi and not old.savunma_kilidi then new.savunma_kilidi := false; end if;
  return new;
end;
$$;
drop trigger if exists skill_duello_eski_etki_kapisi_trg on public.duellolar;
create trigger skill_duello_eski_etki_kapisi_trg before update on public.duellolar
for each row execute function public.skill_duello_eski_etki_kapisi();

-- Klasik bot yalnız aktif saldırı/taktik skill'lerinden seçim yapar.
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
    continue when (select count(*) from public.joker_kullanimlari k where k.mac_tur='1v1' and k.mac_id=r.id and k.user_id=r.bot_id) >= public.ayar_sayi('duello_joker_hak',4);
    select t into v_tur from unnest(array['zaman_baskisi','soru_degistir']) t
      where not exists(select 1 from public.joker_kullanimlari k where k.mac_tur='1v1' and k.mac_id=r.id and k.user_id=r.bot_id and k.tur=t)
      order by public.bot_rasgele('kjt:'||r.id::text||':'||r.idx||':'||t) limit 1;
    continue when v_tur is null;
    insert into public.joker_kullanimlari(user_id,mac_tur,mac_id,soru_index,tur,ucretsiz)
      values(r.bot_id,'1v1',r.id,r.idx,v_tur,true);
    if v_tur='soru_degistir' then perform public.mac_soru_degistir('1v1',r.id,r.bot_id,r.idx); end if;
    perform public.klasik_joker_etki(r.id,r.bot_id,r.idx,v_tur);
  end loop;
end;
$$;
