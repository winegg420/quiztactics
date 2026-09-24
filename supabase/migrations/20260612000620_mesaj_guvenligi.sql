-- ============================================================
-- 620 · MESAJLAŞMA GÜVENLİĞİ — Google Play UGC şartları + KVKK (Ida, 25 Eyl 2026)
--
-- ÖNCEDEN VAR OLAN (yeniden yazılmadı): dm_gonder yalnız kabul edilmiş arkadaşa (dm_arkadas_mi) · hesabimi_sil
-- (direkt_mesajlar CASCADE) · yasakli_kelimeler (61 kelime, yalnız takma adda alt dize — "Kemal" gibi masum adları
-- da reddediyordu).
-- EKLENEN (kurallar SUNUCUDA; istemci yalnız görünümü çizer):
--   1) Engelleme: engellemeler tablosu + oyuncu_engelle / engel_kaldir / engellediklerim. Engelli çift arasında
--      tablo tetikleyicileri şunları reddeder: mesaj, arkadaşlık isteği/kabulü, Klasik meydan okuma/rövanş
--      (matches 'bekliyor'), grup daveti, Düello daveti ve rövanşı, maç içi hazır mesaj; tepki özel kanalı
--      (tepki_kanal_uyesi_mi) ve tepki_durumu kapanır. Engelleme arkadaşlığı ve bekleyen davetleri bitirir.
--      Gizli botlar etkilenmez (bot içeren çift hiçbir zaman "engelli" sayılmaz). Rastgele eşleşme kapsam dışı.
--   2) Şikâyet: sikayetler tablosu + sikayet_et (günde aynı kişiye 1; mesaj şikâyetinde metin kopyalanır) +
--      yönetim: yonetici_mi / sikayetler_yonetim / sikayet_isle (incelendi · mesajlaşmayı kapat · askıya al ·
--      geri al). Yönetici = sahip_kullanicilar ∪ yonetici_kullanicilar (oyun_ayarlari).
--   3) Küfür/argo filtresi: yasakli_kelimeler'e kapsam ('hepsi' mesaj+ad / 'ad' yalnız ad) ve eşleşme ('tam'
--      kelimenin kendisi / 'onek' kelimeyle başlayan, ekli hâller) + izinli_kelimeler (önek istisnası: sikke,
--      siklet…). Normalleştirme: Türkçe küçük harf (I→ı, İ→i), ş/ç/ğ/ö/ü katlanır (ı KATLANMAZ — "sıkıldım" masum
--      kalsın), 0→o 1→i 3→e 4→a @→a $→s 5→s 7→t !→i, harf dışı atılır, tekrar eden harf sıkıştırılır;
--      "s i k" gibi tek harfli diziler birleştirilir. Mesajda eşleşen kelime ***; takma adda reddedilir.
--   4) Kullanım Koşulları: profiles.kosullar_kabul_at + kosullari_kabul_et; ilk mesajdan önce zorunlu.
--   5) Hesap silme: engellemeler iki yönde CASCADE; oyuncunun AÇTIĞI şikâyetler CASCADE; HAKKINDAKİ şikâyetler
--      kanıt olarak kalır (sikayet_edilen SET NULL + ad ve mesaj metni kopyası).
-- Yeni tablolarda RLS açık, politika yok (erişim yalnız RPC). Yeni profil sütunları istemciye açılmadı
-- (profiles sütun bazlı SELECT yetkisi). Tekrar çalıştırılabilir.
-- ============================================================

-- ---------- Profil alanları ----------
alter table public.profiles add column if not exists kosullar_kabul_at timestamptz;
alter table public.profiles add column if not exists mesaj_kapali boolean not null default false;
alter table public.profiles add column if not exists askida boolean not null default false;

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('yonetici_kullanicilar', '[]'::jsonb, 'Şikâyet yönetimi yetkisi olan hesaplar (auth.users id). Sahip hesapları ayrıca yetkilidir (620).')
on conflict (anahtar) do nothing;

-- ---------- Tablolar ----------
create table if not exists public.engellemeler (
  engelleyen uuid not null references public.profiles(id) on delete cascade,
  engellenen uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (engelleyen, engellenen),
  check (engelleyen <> engellenen)
);
create index if not exists engellemeler_engellenen_idx on public.engellemeler (engellenen);
alter table public.engellemeler enable row level security;

create table if not exists public.sikayetler (
  id bigserial primary key,
  sikayet_eden uuid not null references public.profiles(id) on delete cascade,
  sikayet_edilen uuid references public.profiles(id) on delete set null,   -- hesap silinse de kayıt kanıt olarak kalır
  edilen_ad text,                                                          -- şikâyet anındaki görünen ad (kopya)
  sebep text not null check (sebep in ('hakaret', 'uygunsuz_ad', 'spam', 'hile', 'diger')),
  aciklama text check (aciklama is null or length(aciklama) <= 500),
  mesaj_id uuid,                                                           -- şikâyet edilen mesaj (silinse de metin aşağıda)
  mesaj_metni text,                                                        -- şikâyet anındaki mesaj metni (kanıt)
  durum text not null default 'yeni' check (durum in ('yeni', 'incelendi')),
  islem text check (islem is null or islem in ('incelendi', 'mesaj_kapat', 'askiya_al', 'mesaj_ac', 'askidan_al')),
  inceleyen uuid,
  incelendi_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists sikayetler_eden_edilen_idx on public.sikayetler (sikayet_eden, sikayet_edilen, created_at desc);
create index if not exists sikayetler_durum_idx on public.sikayetler (durum, created_at desc);
alter table public.sikayetler enable row level security;

alter table public.yasakli_kelimeler add column if not exists kapsam text not null default 'hepsi';
alter table public.yasakli_kelimeler add column if not exists eslesme text not null default 'tam';
alter table public.yasakli_kelimeler add column if not exists dil text not null default 'tr';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'yasakli_kelimeler_kapsam_ck') then
    alter table public.yasakli_kelimeler add constraint yasakli_kelimeler_kapsam_ck check (kapsam in ('hepsi', 'ad'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'yasakli_kelimeler_eslesme_ck') then
    alter table public.yasakli_kelimeler add constraint yasakli_kelimeler_eslesme_ck check (eslesme in ('tam', 'onek'));
  end if;
end $$;

create table if not exists public.izinli_kelimeler (
  kelime text primary key,           -- 'onek' yasaklı kelimeyle başlayan ama masum kelime
  eslesme text not null default 'onek' check (eslesme in ('tam', 'onek'))   -- onek: bununla başlayan her kelime; tam: yalnız kendisi
);
alter table public.izinli_kelimeler add column if not exists eslesme text not null default 'onek';
alter table public.izinli_kelimeler enable row level security;

-- Mevcut 61 kelime: ayrılmış adlar / çok anlamlı kelimeler yalnız takma adda; güçlü kökler ekli hâlleri de yakalar
update public.yasakli_kelimeler set kapsam = 'ad'
 where kelime in ('admin', 'administrator', 'bildim', 'bot', 'destek', 'mod', 'moderator', 'sistem', 'support',
                  'system', 'yonetici', 'yönetici', 'top', 'mal', 'got', 'hitler', 'nazi', 'isis', 'pkk',
                  'terorist', 'terörist', 'avrat');
update public.yasakli_kelimeler set eslesme = 'onek'
 where kelime in ('orospu', 'sik', 'amcik', 'amcık', 'yarak', 'yarrak', 'pezevenk', 'kahpe', 'ibne', 'gavat',
                  'serefsiz', 'şerefsiz', 'kaltak', 'gotveren', 'götveren', 'fuck', 'shit', 'bitch', 'cunt', 'nigger',
                  'sikeyim', 'sikik');
update public.yasakli_kelimeler set dil = 'en'
 where kelime in ('bitch', 'cunt', 'dick', 'fuck', 'pussy', 'shit', 'nigger', 'administrator', 'support', 'system',
                  'admin', 'moderator');
insert into public.yasakli_kelimeler (kelime, kapsam, eslesme, dil) values
  ('siktir', 'hepsi', 'onek', 'tr'), ('yavşak', 'hepsi', 'onek', 'tr'), ('yavsak', 'hepsi', 'onek', 'tr'),
  ('dallama', 'hepsi', 'onek', 'tr'), ('mk', 'hepsi', 'tam', 'tr'), ('sg', 'hepsi', 'tam', 'tr'),
  ('oç', 'hepsi', 'tam', 'tr'), ('amq', 'hepsi', 'tam', 'tr'),   -- 'göt' yok: katlanınca EN 'got' olur (yalnız takma adda yasak)
  ('asshole', 'hepsi', 'onek', 'en'), ('bastard', 'hepsi', 'onek', 'en'), ('motherfuck', 'hepsi', 'onek', 'en'),
  ('whore', 'hepsi', 'onek', 'en'), ('slut', 'hepsi', 'onek', 'en'), ('faggot', 'hepsi', 'onek', 'en'),
  ('fag', 'hepsi', 'tam', 'en'), ('dickhead', 'hepsi', 'onek', 'en'), ('wanker', 'hepsi', 'onek', 'en'),
  ('retard', 'hepsi', 'onek', 'en'), ('cock', 'hepsi', 'tam', 'en'), ('dick', 'hepsi', 'tam', 'en')
on conflict (kelime) do nothing;
insert into public.izinli_kelimeler (kelime, eslesme) values
  ('sikke', 'onek'), ('siklet', 'onek'), ('şikâyet', 'onek'), ('şikayet', 'onek'), ('shitake', 'onek'),
  ('shiitake', 'onek'), ('retardant', 'onek'), ('scunthorpe', 'onek'),
  ('şike', 'tam'), ('şikeci', 'tam')   -- tam: önek olsa 'sikeyim' de geçerdi
on conflict (kelime) do nothing;
update public.yasakli_kelimeler set eslesme = 'onek' where kelime in ('salak', 'aptal', 'embesil', 'gerizekali', 'gerizekalı');

-- ---------- Normalleştirme ve eşleşme ----------
create or replace function public.kufur_norm(p text)
returns text
language sql
immutable
set search_path = public
as $$
  select regexp_replace(
           translate(
             lower(replace(replace(coalesce(p, ''), 'I', 'ı'), 'İ', 'i')),
             'şçğöüâîû013457@$!€',
             'scgouaiuoieastasie'),
           '[^a-zı]', '', 'g');
$$;

-- Tekrar eden harfleri sıkıştırır ("siiiik" → "sik")
create or replace function public.kufur_sikistir(p text)
returns text
language sql
immutable
set search_path = public
as $$ select regexp_replace(coalesce(p, ''), '(.)\1+', '\1', 'g'); $$;

-- Normalleştirilmiş tek kelime yasaklı mı? p_ad = takma ad denetimi ('ad' kapsamlı kelimeler de sayılır)
create or replace function public.kufur_kelime_mi(p_norm text, p_ad boolean default false)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(length(p_norm), 0) > 0 and exists (
    select 1 from public.yasakli_kelimeler y
     cross join lateral (select public.kufur_norm(y.kelime) as k) n
     where (y.kapsam = 'hepsi' or p_ad)
       and length(n.k) > 0
       and (
         (y.eslesme = 'tam' and (p_norm = n.k or public.kufur_sikistir(p_norm) = n.k))
         or (y.eslesme = 'onek'
             and (p_norm like n.k || '%' or public.kufur_sikistir(p_norm) like n.k || '%')
             and not exists (select 1 from public.izinli_kelimeler i
                              where (i.eslesme = 'onek' and p_norm like public.kufur_norm(i.kelime) || '%')
                                 or (i.eslesme = 'tam' and p_norm = public.kufur_norm(i.kelime))))
       ));
$$;

-- Mesaj metni: yasaklı kelimeler *** (ara boşluklu "s i k" dizileri dahil). Boşluklar korunur.
create or replace function public.kufur_maskele(p_metin text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tok text[] := array[]::text[];
  v_ara text[] := array[]::text[];
  v_norm text[] := array[]::text[];
  v_maske boolean[] := array[]::boolean[];
  r record;
  i int; j int; n int;
  v_bir text;
  v_sonuc text := '';
begin
  if p_metin is null or btrim(p_metin) = '' then return p_metin; end if;
  -- Baştaki boşluk korunur
  v_sonuc := coalesce(substring(p_metin from '^\s*'), '');
  for r in select m[1] as tok, m[2] as ara from regexp_matches(p_metin, '(\S+)(\s*)', 'g') as m loop
    v_tok := v_tok || r.tok; v_ara := v_ara || r.ara;
    v_norm := v_norm || public.kufur_norm(r.tok);
    v_maske := v_maske || public.kufur_kelime_mi(public.kufur_norm(r.tok), false);
  end loop;
  n := coalesce(array_length(v_tok, 1), 0);
  -- Tek harfli ardışık diziler ("s i k", "o r o s p u") birleştirilip denenir
  i := 1;
  while i <= n loop
    if length(v_norm[i]) = 1 then
      j := i; v_bir := '';
      while j <= n and length(v_norm[j]) = 1 loop v_bir := v_bir || v_norm[j]; j := j + 1; end loop;
      if j - i >= 2 and public.kufur_kelime_mi(v_bir, false) then
        for k in i .. j - 1 loop v_maske[k] := true; end loop;
      end if;
      i := j;
    else
      i := i + 1;
    end if;
  end loop;
  for k in 1 .. n loop
    v_sonuc := v_sonuc || case when v_maske[k] then '***' else v_tok[k] end || v_ara[k];
  end loop;
  return v_sonuc;
end;
$$;

-- Takma ad uygun mu? '_' ile ayrılan her parça + güçlü köklerin (onek, ≥4 harf) ad içinde geçmesi
create or replace function public.kufur_ad_uygun(p_ad text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_parca text;
  v_tum text := public.kufur_norm(p_ad);
begin
  foreach v_parca in array regexp_split_to_array(coalesce(p_ad, ''), '_+') loop
    if public.kufur_kelime_mi(public.kufur_norm(v_parca), true) then return false; end if;
  end loop;
  if exists (
    select 1 from public.yasakli_kelimeler y
     cross join lateral (select public.kufur_norm(y.kelime) as k) n
     where y.eslesme = 'onek' and length(n.k) >= 4
       and (v_tum like '%' || n.k || '%' or public.kufur_sikistir(v_tum) like '%' || n.k || '%')
       and not exists (select 1 from public.izinli_kelimeler i where v_tum like '%' || public.kufur_norm(i.kelime) || '%')
  ) then return false; end if;
  return true;
end;
$$;
revoke all on function public.kufur_norm(text) from public, anon, authenticated;
revoke all on function public.kufur_sikistir(text) from public, anon, authenticated;
revoke all on function public.kufur_kelime_mi(text, boolean) from public, anon, authenticated;
revoke all on function public.kufur_maskele(text) from public, anon, authenticated;
revoke all on function public.kufur_ad_uygun(text) from public, anon, authenticated;

-- ---------- Engel yardımcıları ----------
-- İki kişi arasında (herhangi bir yönde) engel var mı? Bot içeren çift asla engelli değil (gizli botlar etkilenmez).
create or replace function public.iletisim_engelli(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_a is not null and p_b is not null and p_a <> p_b
     and not exists (select 1 from public.profiles p where p.id in (p_a, p_b) and coalesce(p.is_bot, false))
     and exists (select 1 from public.engellemeler e
                  where (e.engelleyen = p_a and e.engellenen = p_b) or (e.engelleyen = p_b and e.engellenen = p_a));
$$;
revoke all on function public.iletisim_engelli(uuid, uuid) from public, anon, authenticated;

-- İşlemi yapan oyuncu (auth.uid) askıda mı? Sunucu işlerinde (auth.uid yok) false.
create or replace function public.askida_mi(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select coalesce((select p.askida from public.profiles p where p.id = p_id), false); $$;
revoke all on function public.askida_mi(uuid) from public, anon, authenticated;

create or replace function public.yonetici_mi()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    public.sahip_mi()
    or exists (select 1 from public.oyun_ayarlari a, jsonb_array_elements_text(a.deger) x(id)
                where a.anahtar = 'yonetici_kullanicilar' and x.id = auth.uid()::text));
$$;
revoke all on function public.yonetici_mi() from public, anon;
grant execute on function public.yonetici_mi() to authenticated;

-- ---------- Tetikleyiciler (her RPC yolunu kapsar) ----------
create or replace function public.trg_dm_guvenlik()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare p public.profiles%rowtype;
begin
  select * into p from public.profiles where id = new.gonderen_id;
  if found and not coalesce(p.is_bot, false) then
    if p.askida then raise exception 'Hesabın askıya alındı; mesaj gönderemezsin.'; end if;
    if p.mesaj_kapali then raise exception 'Mesajlaşman kapatıldı.'; end if;
    if p.kosullar_kabul_at is null then
      raise exception 'Mesaj göndermek için önce Kullanım Koşulları''nı kabul etmelisin.';
    end if;
  end if;
  if public.iletisim_engelli(new.gonderen_id, new.alici_id) then
    raise exception 'Bu oyuncuyla iletişim kuramazsın.';
  end if;
  new.metin := public.kufur_maskele(new.metin);
  return new;
end;
$$;
drop trigger if exists trg_dm_guvenlik on public.direkt_mesajlar;
create trigger trg_dm_guvenlik before insert on public.direkt_mesajlar
  for each row execute function public.trg_dm_guvenlik();

create or replace function public.trg_iletisim_engel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_a uuid; v_b uuid;
begin
  if tg_table_name = 'friendships' then
    if new.durum not in ('bekliyor', 'arkadas') then return new; end if;
    if tg_op = 'UPDATE' and old.durum is not distinct from new.durum then return new; end if;
    v_a := new.requester; v_b := new.addressee;
  elsif tg_table_name = 'matches' then
    if new.durum is distinct from 'bekliyor' then return new; end if;     -- yalnız meydan okuma / rövanş daveti
    v_a := new.oyuncu1; v_b := new.oyuncu2;
  elsif tg_table_name = 'duello_davetleri' then
    v_a := new.kuran; v_b := new.rakip;
  elsif tg_table_name = 'group_match_players' then
    if new.davet_durumu is distinct from 'bekliyor' then return new; end if;
    select g.kurucu into v_a from public.group_matches g where g.id = new.group_match_id;
    v_b := new.user_id;
  elsif tg_table_name = 'duellolar' then
    if tg_op = 'INSERT' and new.onceki_id is null then return new; end if;   -- yalnız rövanş düellosu
    if tg_op = 'UPDATE' and (new.rovans_isteyen is null or old.rovans_isteyen is not distinct from new.rovans_isteyen) then return new; end if;
    v_a := new.oyuncu1; v_b := new.oyuncu2;
  elsif tg_table_name = 'match_messages' then
    select case when m.oyuncu1 = new.user_id then m.oyuncu2 else m.oyuncu1 end into v_b from public.matches m where m.id = new.match_id;
    v_a := new.user_id;
  else
    return new;
  end if;
  if auth.uid() is not null and public.askida_mi(auth.uid()) then
    raise exception 'Hesabın askıya alındı; bu işlemi yapamazsın.';
  end if;
  if public.iletisim_engelli(v_a, v_b) then
    raise exception 'Bu oyuncuyla iletişim kuramazsın.';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_iletisim_engel on public.friendships;
create trigger trg_iletisim_engel before insert or update of durum on public.friendships
  for each row execute function public.trg_iletisim_engel();
drop trigger if exists trg_iletisim_engel on public.matches;
create trigger trg_iletisim_engel before insert on public.matches
  for each row execute function public.trg_iletisim_engel();
drop trigger if exists trg_iletisim_engel on public.duello_davetleri;
create trigger trg_iletisim_engel before insert on public.duello_davetleri
  for each row execute function public.trg_iletisim_engel();
drop trigger if exists trg_iletisim_engel on public.group_match_players;
create trigger trg_iletisim_engel before insert on public.group_match_players
  for each row execute function public.trg_iletisim_engel();
drop trigger if exists trg_iletisim_engel on public.duellolar;
create trigger trg_iletisim_engel before insert or update of rovans_isteyen on public.duellolar
  for each row execute function public.trg_iletisim_engel();
drop trigger if exists trg_iletisim_engel on public.match_messages;
create trigger trg_iletisim_engel before insert on public.match_messages
  for each row execute function public.trg_iletisim_engel();
revoke all on function public.trg_iletisim_engel() from public, anon, authenticated;
revoke all on function public.trg_dm_guvenlik() from public, anon, authenticated;

-- ---------- Oyuncu RPC'leri ----------
create or replace function public.kosullari_kabul_et()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare v timestamptz;
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  update public.profiles set kosullar_kabul_at = coalesce(kosullar_kabul_at, now())
   where id = auth.uid() returning kosullar_kabul_at into v;
  return v;
end;
$$;

create or replace function public.iletisim_durumu(p_kisi uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_me uuid := auth.uid(); p public.profiles%rowtype;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  select * into p from public.profiles where id = v_me;
  return jsonb_build_object(
    'arkadas', public.dm_arkadas_mi(v_me, p_kisi),
    'engelledim', exists (select 1 from public.engellemeler e where e.engelleyen = v_me and e.engellenen = p_kisi),
    'iletisim', not public.iletisim_engelli(v_me, p_kisi),
    'kosullar_kabul', p.kosullar_kabul_at is not null,
    'mesaj_kapali', coalesce(p.mesaj_kapali, false) or coalesce(p.askida, false));
end;
$$;

create or replace function public.oyuncu_engelle(p_kisi uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('oyuncu_engelle', 20, interval '60 seconds');
  if p_kisi is null or p_kisi = v_me then raise exception 'Kendini engelleyemezsin'; end if;
  if not exists (select 1 from public.profiles where id = p_kisi) then raise exception 'Oyuncu bulunamadı'; end if;
  insert into public.engellemeler (engelleyen, engellenen) values (v_me, p_kisi) on conflict do nothing;
  -- Engelleme arkadaşlığı ve bekleyen davetleri bitirir (eski mesajlar okunabilir kalır)
  delete from public.friendships f
   where (f.requester = v_me and f.addressee = p_kisi) or (f.requester = p_kisi and f.addressee = v_me);
  update public.duello_davetleri set durum = 'iptal', yanit_at = now()
   where durum = 'bekliyor' and ((kuran = v_me and rakip = p_kisi) or (kuran = p_kisi and rakip = v_me));
  update public.matches set durum = 'reddedildi'
   where durum = 'bekliyor' and ((oyuncu1 = v_me and oyuncu2 = p_kisi) or (oyuncu1 = p_kisi and oyuncu2 = v_me));
  return jsonb_build_object('engellendi', true);
end;
$$;

create or replace function public.engel_kaldir(p_kisi uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  delete from public.engellemeler where engelleyen = auth.uid() and engellenen = p_kisi;
  return jsonb_build_object('engellendi', false);
end;
$$;

create or replace function public.engellediklerim()
returns table (id uuid, ad text, avatar text, engellendi_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.gorunen_ad, p.gorunen_avatar, e.created_at
    from public.engellemeler e join public.profiles p on p.id = e.engellenen
   where e.engelleyen = auth.uid()
   order by e.created_at desc;
$$;

create or replace function public.sikayet_et(p_kisi uuid, p_sebep text, p_aciklama text default null,
                                             p_mesaj_id uuid default null, p_engelle boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_ad text;
  v_metin text;
  v_id bigint;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('sikayet_et', 10, interval '60 seconds');
  if p_kisi is null or p_kisi = v_me then raise exception 'Kendini şikâyet edemezsin'; end if;
  if p_sebep not in ('hakaret', 'uygunsuz_ad', 'spam', 'hile', 'diger') then raise exception 'Geçersiz şikâyet sebebi'; end if;
  select gorunen_ad into v_ad from public.profiles where id = p_kisi;
  if not found then raise exception 'Oyuncu bulunamadı'; end if;
  if exists (select 1 from public.sikayetler s
              where s.sikayet_eden = v_me and s.sikayet_edilen = p_kisi and s.created_at > now() - interval '24 hours') then
    raise exception 'Bu oyuncuyu bugün zaten şikâyet ettin.';
  end if;
  if p_mesaj_id is not null then
    -- Yalnız o kişinin BANA gönderdiği mesaj; metin şikâyet anındaki hâliyle kopyalanır (silinse de kanıt kalır)
    select d.metin into v_metin from public.direkt_mesajlar d
     where d.id = p_mesaj_id and d.gonderen_id = p_kisi and d.alici_id = v_me;
    if not found then raise exception 'Mesaj bulunamadı'; end if;
  end if;
  insert into public.sikayetler (sikayet_eden, sikayet_edilen, edilen_ad, sebep, aciklama, mesaj_id, mesaj_metni)
  values (v_me, p_kisi, v_ad, p_sebep, nullif(left(btrim(coalesce(p_aciklama, '')), 500), ''), p_mesaj_id, v_metin)
  returning id into v_id;
  if coalesce(p_engelle, false) then perform public.oyuncu_engelle(p_kisi); end if;
  return jsonb_build_object('id', v_id, 'engellendi', coalesce(p_engelle, false));
end;
$$;

-- ---------- Yönetim ----------
create or replace function public.sikayetler_yonetim(p_durum text default null)
returns table (id bigint, created_at timestamptz, durum text, islem text, sebep text, aciklama text, mesaj_metni text,
               eden_id uuid, eden_ad text, edilen_id uuid, edilen_ad text, edilen_mesaj_kapali boolean,
               edilen_askida boolean, edilen_sikayet_sayisi bigint, incelendi_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.yonetici_mi() then raise exception 'Bu sayfa yalnız yöneticilere açık'; end if;
  return query
  select s.id, s.created_at, s.durum, s.islem, s.sebep, s.aciklama, s.mesaj_metni,
         s.sikayet_eden, pe.gorunen_ad, s.sikayet_edilen, coalesce(pd.gorunen_ad, s.edilen_ad || ' (silindi)'),
         coalesce(pd.mesaj_kapali, false), coalesce(pd.askida, false),
         (select count(*) from public.sikayetler x where x.sikayet_edilen = s.sikayet_edilen),
         s.incelendi_at
    from public.sikayetler s
    left join public.profiles pe on pe.id = s.sikayet_eden
    left join public.profiles pd on pd.id = s.sikayet_edilen
   where p_durum is null or s.durum = p_durum
   order by (s.durum = 'yeni') desc, s.created_at desc
   limit 300;
end;
$$;

create or replace function public.sikayet_isle(p_id bigint, p_islem text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare s public.sikayetler%rowtype;
begin
  if not public.yonetici_mi() then raise exception 'Bu işlem yalnız yöneticilere açık'; end if;
  if p_islem not in ('incelendi', 'mesaj_kapat', 'askiya_al', 'mesaj_ac', 'askidan_al') then raise exception 'Geçersiz işlem'; end if;
  select * into s from public.sikayetler where id = p_id for update;
  if not found then raise exception 'Şikâyet bulunamadı'; end if;
  if p_islem <> 'incelendi' and s.sikayet_edilen is null then raise exception 'Hesap silinmiş'; end if;
  if p_islem = 'mesaj_kapat' then update public.profiles set mesaj_kapali = true where id = s.sikayet_edilen;
  elsif p_islem = 'mesaj_ac' then update public.profiles set mesaj_kapali = false where id = s.sikayet_edilen;
  elsif p_islem = 'askiya_al' then update public.profiles set askida = true where id = s.sikayet_edilen;
  elsif p_islem = 'askidan_al' then update public.profiles set askida = false where id = s.sikayet_edilen;
  end if;
  update public.sikayetler set durum = 'incelendi', islem = p_islem, inceleyen = auth.uid(), incelendi_at = now()
   where id = p_id;
  return jsonb_build_object('id', p_id, 'islem', p_islem);
end;
$$;

do $$
declare f text;
begin
  foreach f in array array['kosullari_kabul_et()', 'iletisim_durumu(uuid)', 'oyuncu_engelle(uuid)', 'engel_kaldir(uuid)',
                           'engellediklerim()', 'sikayet_et(uuid,text,text,uuid,boolean)', 'sikayetler_yonetim(text)',
                           'sikayet_isle(bigint,text)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- ---------- Mevcut fonksiyonlarda küçük değişiklik (canlı tanımla birebir; yalnız işaretli satırlar) ----------
CREATE OR REPLACE FUNCTION public.takma_ad_sec(p_ad text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_ad text;
  v_p public.profiles%rowtype;
  v_kalan interval;
begin
  perform public.hiz_siniri('takma_ad_sec', 10, interval '60 seconds');
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;

  v_ad := btrim(coalesce(p_ad, ''));

  if length(v_ad) < 3 or length(v_ad) > 16 then
    raise exception 'Takma ad 3-16 karakter olmalı.';
  end if;
  -- Harf (Türkçe dahil), rakam ve alt çizgi
  if v_ad !~ '^[A-Za-z0-9_ğüşıöçĞÜŞİÖÇ]+$' then
    raise exception 'Takma adda yalnız harf, rakam ve alt çizgi kullanabilirsin.';
  end if;
  if v_ad ~ '^[0-9_]+$' then
    raise exception 'Takma ad en az bir harf içermeli.';
  end if;

  -- 620: alt dize yerine küfür filtresi (harf oyunları, ekler; "Kemal" gibi masum adlar artık geçer)
  if not public.kufur_ad_uygun(v_ad) then
    raise exception 'Bu takma ad kullanılamaz. Başka bir tane dene.';
  end if;

  select * into v_p from public.profiles where id = auth.uid();
  if not found then raise exception 'Profil bulunamadı'; end if;

  -- Aynı adı tekrar göndermek kilidi harcamasın
  if v_p.takma_ad_secildi and lower(coalesce(v_p.takma_ad, '')) = lower(v_ad) then
    return;
  end if;

  -- KİLİT: 30 gün -> 24 saat
  if v_p.takma_ad_secildi
     and v_p.takma_ad_degisti_at is not null
     and v_p.takma_ad_degisti_at > now() - interval '24 hours'
  then
    v_kalan := (v_p.takma_ad_degisti_at + interval '24 hours') - now();
    raise exception 'Takma adını günde bir kez değiştirebilirsin. Kalan: % saat % dakika',
      extract(hour from v_kalan)::int, extract(minute from v_kalan)::int;
  end if;

  if exists (
    select 1 from public.profiles p
    where lower(p.takma_ad) = lower(v_ad) and p.id <> auth.uid()
  ) then
    raise exception 'Bu takma ad alınmış. Başka bir tane dene.';
  end if;

  begin
    update public.profiles
       set takma_ad = v_ad,
           takma_ad_secildi = true,
           takma_ad_degisti_at = now()
     where id = auth.uid();
  exception when unique_violation then
    raise exception 'Bu takma ad alınmış. Başka bir tane dene.';
  end;
end;
$function$;

CREATE OR REPLACE FUNCTION public.tepki_kanal_uyesi_mi(p_konu text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v_parca text[];
  v_id uuid;
begin
  if v_me is null or p_konu is null then return false; end if;
  v_parca := regexp_match(p_konu, '^tepki-(mac|duello)-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$');
  if v_parca is null then return false; end if;
  v_id := v_parca[2]::uuid;
  if v_parca[1] = 'mac' then
    return exists (select 1 from public.matches m where m.id = v_id and v_me in (m.oyuncu1, m.oyuncu2)
                    and not public.iletisim_engelli(m.oyuncu1, m.oyuncu2));   -- 620: engelli çift tepki alışverişi yapamaz
  end if;
  return exists (select 1 from public.duellolar d where d.id = v_id and v_me in (d.oyuncu1, d.oyuncu2)
                  and not public.iletisim_engelli(d.oyuncu1, d.oyuncu2));   -- 620
end;
$function$;

CREATE OR REPLACE FUNCTION public.tepki_durumu(p_mac_tur text, p_mac_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v_mod text;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  v_mod := public.tepki_mac_modu(p_mac_tur, p_mac_id, v_me);
  if v_mod is null then return jsonb_build_object('acik', false); end if;
  -- 620: engelli çiftte tepki kapalı (özel kanal da reddeder)
  if not public.tepki_kanal_uyesi_mi('tepki-' || case when p_mac_tur = 'duello' then 'duello' else 'mac' end || '-' || p_mac_id::text) then
    return jsonb_build_object('acik', false);
  end if;
  return jsonb_build_object(
    'acik', public.tepki_mod_acik(v_mod),
    'mod', v_mod,
    'kanal', 'tepki-' || case when p_mac_tur = 'duello' then 'duello' else 'mac' end || '-' || p_mac_id::text,
    'tepkiler', public.tepkilerim_liste(v_me),
    'aralik_sn', public.ayar_ondalik('tepki_aralik_sn', 3),
    'mac_max', public.ayar_sayi('tepki_mac_max', 10),
    'balon_ms', public.ayar_sayi('tepki_balon_ms', 2000));
end;
$function$;
