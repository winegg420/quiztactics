-- ============================================================
-- 960 · DÜELLO — SIRAYLA KATEGORİ SEÇİMİ (draft) + 7 yuva + 20 tur
-- Ida kararları, 5 Eki 2026 (simülasyonla doğrulandı). Rakamlar Ida'nındır.
--
-- SORUN: maç başında bütün kategoriler boştu; herkes boşları kapıyor, maçların %100'ü rakipten tek kategori
-- çalmadan bitiyordu. YENİ: maç başında kategoriler SAHİPLİ — oyun rakibin kategorilerini almaya döner.
--
-- AKIŞ (duello_secim_modu = true iken açılan maç):
--   · faz 'secim': 10 kategori ortada; sıra yılan A-B-B-A-A-B-B-A-A-B, her oyuncu 5 kategori. İlk seçen (A) rastgele:
--     duello_olustur oyuncuları zaten rastgele sıralar; A = oyuncu2 → ilk SALDIRAN = oyuncu1 = İLK SEÇMEYEN
--     (ilk seçen avantajını dengeler) ve sonraki roller mevcut düzenle (tek tur oyuncu1, çift tur oyuncu2).
--   · Seçilen kategori ANINDA seçenin olur (sahiplik + yuva). Aynı kategori iki kez seçilemez, sıra dışı seçim reddedilir;
--     hepsi maç satırı FOR UPDATE kilidiyle serileşir (duello_kilitle). İstemci seçimi MEVCUT duello_kategori_sec
--     RPC'siyle gönderir (faz 'secim' iken seçim dalı) → yeni GRANT yok.
--   · Süre duello_secim_sn (5) + gösterim payı (ilk seçimde + duello_secim_ilk_ek_sn: VS ekranı). Dolarsa sunucu
--     oyuncunun maç başında sabitlenen kart yüzdelerinden (profil.oranlar — kartta "Sen %X") EN YÜKSEK olanı seçer;
--     yüzdesi olmayan ("Yeni", < duello_oran_min_cevap cevap) kartlar onlardan sonra, rastgele sırada.
--   · Bot: seçim süresinin içinde duello_bot_secim_min_sn–max_sn (1–3) gecikmeyle kendi isabeti en yüksek kalan kategori.
--   · Seçim bitince tur 1 başlar (savunma banı 853 aynen). Boş kategori YOK; tutma kuralları, kilit, ban, Baskın/Kalkan,
--     Altın Soru DEĞİŞMEZ. Boş kategori kuralı (870) kodda durur, bu modda tetiklenmez.
--   · Eşik duello_hakimiyet_esik 5 → 7, tur duello_max_tur 16 → 20. Mod, eşik ve tur MAÇ SATIRINA sabitlenir
--     (secim_modu, hakimiyet_esik, max_tur) → süren maçlar kendi kuralıyla biter.
--   · duello_secim_modu = false → ESKİ akış (boş kategori, eşik duello_bos_mod_esik 5, duello_bos_mod_max_tur 16).
-- Geri alma: docs/duello-geri-alma-secim.sql
-- ============================================================

-- ---------------------------------------------------------------- şema
alter table public.duellolar
  add column if not exists secim_modu boolean not null default false,
  add column if not exists max_tur smallint,
  add column if not exists ilk_secen uuid,
  add column if not exists secim_sira smallint not null default 0,
  add column if not exists secimler jsonb not null default '[]'::jsonb;

comment on column public.duellolar.secim_modu is '960: maç sıralı kategori seçimiyle (draft) açıldı mı';
comment on column public.duellolar.max_tur is '960: maçın tur sayısı (açılışta sabitlenir; boşsa duello_max_tur okunur)';
comment on column public.duellolar.ilk_secen is '960: seçim fazında ilk seçen oyuncu (yılan sırasının A''sı)';
comment on column public.duellolar.secim_sira is '960: seçim fazında yapılmış seçim sayısı';
comment on column public.duellolar.secimler is '960: seçimler [{k, u, oto, sira}] (oto = süre doldu, sunucu seçti)';

-- Süren (960 öncesi) maçlar 16 turla biter: tur sayısı ayar değişmeden ÖNCE satıra yazılır.
update public.duellolar
   set max_tur = greatest(1, public.ayar_sayi('duello_max_tur', 16))::smallint
 where durum = 'aktif' and max_tur is null;

alter table public.duellolar drop constraint if exists duellolar_faz_check;
alter table public.duellolar add constraint duellolar_faz_check
  check (faz = any (array['kategori', 'hazirlik', 'cevap', 'sonuc', 'altin', 'ban', 'secim']));

-- ---------------------------------------------------------------- ayarlar
-- Eski akışın değerleri (bayrak kapalıyken) önce kopyalanır; sonra yeni değerler.
insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('duello_bos_mod_esik', to_jsonb(public.ayar_sayi('duello_hakimiyet_esik', 5)),
   'Düello (960): duello_secim_modu KAPALIYKEN (eski boş kategori akışı) kazanma eşiği'),
  ('duello_bos_mod_max_tur', to_jsonb(public.ayar_sayi('duello_max_tur', 16)),
   'Düello (960): duello_secim_modu KAPALIYKEN (eski boş kategori akışı) tur sayısı')
on conflict (anahtar) do nothing;

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('duello_secim_modu', 'true'::jsonb,
   'Düello (960): maç başında sıralı kategori seçimi (draft, yılan A-B-B-A…). false → eski akış (boş kategoriler, eşik duello_bos_mod_esik, tur duello_bos_mod_max_tur). Maç satırına sabitlenir.'),
  ('duello_secim_sn', '5'::jsonb, 'Düello (960): seçim fazında her seçimin süresi (sn); dolarsa sunucu en yüksek kendi yüzdeli kalan kategoriyi seçer'),
  ('duello_secim_ilk_ek_sn', '3'::jsonb, 'Düello (960): yalnız İLK seçimin süresine eklenen pay (sn) — maç açılışı / VS ekranı'),
  ('duello_bot_secim_min_sn', '1'::jsonb, 'Düello botu (960): seçim fazında seçmeden önce en az bekleme (sn, sayaç başladıktan sonra)'),
  ('duello_bot_secim_max_sn', '3'::jsonb, 'Düello botu (960): seçim fazında seçmeden önce en çok bekleme (sn)')
on conflict (anahtar) do update set deger = excluded.deger, aciklama = excluded.aciklama;

update public.oyun_ayarlari set deger = '7'::jsonb,
       aciklama = 'Düello Hâkimiyet: bu kadar kategoriye (yuva) ilk ulaşan kazanır (960: 5 → 7, seçim modu; maç satırına sabitlenir)'
 where anahtar = 'duello_hakimiyet_esik';
update public.oyun_ayarlari set deger = '20'::jsonb,
       aciklama = 'Düello: maçın tur sayısı (1 tur = 1 hamle; 960: 16 → 20, seçim modu; maç satırına sabitlenir)'
 where anahtar = 'duello_max_tur';

-- ---------------------------------------------------------------- yardımcılar
create or replace function public.duello_secim_modu_acik()
returns boolean language sql stable security definer set search_path to 'public' as $$
  select coalesce((select a.deger::text in ('true', '1') from public.oyun_ayarlari a where a.anahtar = 'duello_secim_modu'), false);
$$;

-- Seçim havuzu: maçta seçilebilen kategoriler (kapsam filtresi 652 dahil; bugün 10).
create or replace function public.duello2_secim_havuzu(p_id uuid)
returns text[] language sql stable security definer set search_path to 'public' as $$
  select coalesce(array_agg(k order by k), '{}') from unnest(public.duello_kategorileri()) k
   where public.duello_kategori_kapsam_uygun(p_id, k);
$$;

-- Yılan sırası: i. seçim (0'dan) → 0 = ilk seçen (A), 1 = öteki (B). A B B A A B B A A B …
create or replace function public.duello2_secim_sirasi(p_i int)
returns int language sql immutable set search_path to 'public' as $$
  select ((p_i + 1) / 2) % 2;
$$;

-- Seçimi uygula (iç): sahiplik + yuva + kayıt; sıradakine geç ya da seçim bittiyse tur 1'i (ban) başlat.
create or replace function public.duello2_secim_uygula(p_id uuid, p_kategori text, p_oto boolean)
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  d public.duellolar%rowtype;
  v_havuz text[];
  v_sira int;
  v_ben1 boolean;
begin
  select * into d from public.duellolar where id = p_id for update;
  if not found or d.durum <> 'aktif' or d.faz <> 'secim' or p_kategori is null then return; end if;
  v_havuz := public.duello2_secim_havuzu(p_id);
  if not (p_kategori = any(v_havuz)) or coalesce(d.sahiplik, '{}'::jsonb) ? p_kategori then return; end if;
  v_ben1 := d.saldiran = d.oyuncu1;
  v_sira := d.secim_sira + 1;

  update public.duellolar
     set sahiplik = coalesce(sahiplik, '{}'::jsonb) || jsonb_build_object(p_kategori, d.saldiran::text),
         yuva1 = coalesce(yuva1, 0) + case when v_ben1 then 1 else 0 end,
         yuva2 = coalesce(yuva2, 0) + case when v_ben1 then 0 else 1 end,
         secimler = coalesce(secimler, '[]'::jsonb)
                    || jsonb_build_array(jsonb_build_object('k', p_kategori, 'u', d.saldiran, 'oto', coalesce(p_oto, false), 'sira', v_sira)),
         secim_sira = v_sira,
         son_hareket = now()
   where id = p_id;

  if v_sira >= coalesce(array_length(v_havuz, 1), 0) then
    -- Seçim bitti → tur 1: ilk SALDIRAN oyuncu1 (= ilk seçmeyen); savunma banıyla açılır (bayrak kapalıysa 'kategori').
    update public.duellolar
       set faz = 'kategori', tur = 1, saldiri_sirasi = 0, saldiran = oyuncu1,
           kategori = null, soru_id = null, cevaplar = '{}'::jsonb, bitis1 = null, bitis2 = null,
           faz_bitis = now() + make_interval(secs => public.ayar_sayi('duello2_kategori_sn', 15)) + public.duello2_gosterim_payi()
     where id = p_id;
    perform public.duello2_ban_baslat(p_id);
  else
    update public.duellolar
       set saldiran = case when public.duello2_secim_sirasi(v_sira) = 0 then ilk_secen
                           when ilk_secen = oyuncu1 then oyuncu2 else oyuncu1 end,
           faz_bitis = now() + make_interval(secs => public.ayar_sayi('duello_secim_sn', 5)) + public.duello2_gosterim_payi()
     where id = p_id;
  end if;
end $$;

-- Botun seçimi: kendi isabeti (bot_kategori_isabet) en yüksek kalan kategori.
create or replace function public.duello2_bot_secim_kategori(p_id uuid, p_bot uuid)
returns text language sql stable security definer set search_path to 'public' as $$
  select k from unnest(public.duello2_secim_havuzu(p_id)) k
   where not (coalesce((select d.sahiplik from public.duellolar d where d.id = p_id), '{}'::jsonb) ? k)
   order by public.bot_kategori_isabet(p_bot, k) desc, k
   limit 1;
$$;

-- Süre doldu (iç): insan → maç başında sabitlenen kendi kart yüzdesi en yüksek kalan (yüzdesiz "Yeni" kartlar sonra,
-- rastgele); bot → bot seçimi (geç kalan bot otomatik sayılmaz).
create or replace function public.duello2_secim_oto(p_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  d public.duellolar%rowtype;
  v_bot boolean;
  v_oran jsonb;
  v_kat text;
begin
  select * into d from public.duellolar where id = p_id for update;
  if not found or d.durum <> 'aktif' or d.faz <> 'secim' then return; end if;
  select coalesce(p.is_bot, false) into v_bot from public.profiles p where p.id = d.saldiran;
  if coalesce(v_bot, false) then
    v_kat := public.duello2_bot_secim_kategori(p_id, d.saldiran);
  else
    v_oran := coalesce(case when d.saldiran = d.oyuncu1 then d.profil1 else d.profil2 end -> 'oranlar', '{}'::jsonb);
    select k into v_kat from unnest(public.duello2_secim_havuzu(p_id)) k
     where not (coalesce(d.sahiplik, '{}'::jsonb) ? k)
     order by case when jsonb_typeof(v_oran -> k) = 'number' then (v_oran ->> k)::numeric end desc nulls last, random()
     limit 1;
  end if;
  perform public.duello2_secim_uygula(p_id, v_kat, not coalesce(v_bot, false));
end $$;

revoke all on function public.duello_secim_modu_acik() from public, anon, authenticated;
revoke all on function public.duello2_secim_havuzu(uuid) from public, anon, authenticated;
revoke all on function public.duello2_secim_sirasi(int) from public, anon, authenticated;
revoke all on function public.duello2_secim_uygula(uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.duello2_bot_secim_kategori(uuid, uuid) from public, anon, authenticated;
revoke all on function public.duello2_secim_oto(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------- duello_olustur: mod + eşik + tur satıra; seçim modunda faz secim
CREATE OR REPLACE FUNCTION public.duello_olustur(p_a uuid, p_b uuid, p_dereceli boolean, p_onceki uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_id uuid;
  v_p1 jsonb;
  v_p2 jsonb;
  v_x uuid;
  v_secim boolean;
begin
  if random() < 0.5 then
    v_x := p_a; p_a := p_b; p_b := v_x;
  end if;

  -- Profil, oranlar ve kategori yıldızları MAÇ BAŞINDA sabitlenir (yoklamalarda yeniden hesaplanmaz).
  select public.oyuncu_kategori_profili_ic(p_a) into v_p1;
  select public.oyuncu_kategori_profili_ic(p_b) into v_p2;
  v_p1 := coalesce(v_p1, '{}'::jsonb) || jsonb_build_object('oranlar', public.duello_oranlar_ic(p_a));
  v_p2 := coalesce(v_p2, '{}'::jsonb) || jsonb_build_object('oranlar', public.duello_oranlar_ic(p_b));
  v_secim := public.duello_secim_modu_acik();   -- 960

  -- 680: Hâkimiyet — puan/yıldız/çarpan yok; oranlar kart yüzdeleri için profil içinde kalır.
  -- Eşik ve kilit süresi maç başında sabitlenir (ayar değişse de devam eden maç etkilenmez).
  -- 960: mod + eşik + tur sayısı da satıra sabitlenir. Seçim modunda maç 'secim' fazıyla açılır: ilk seçen oyuncu2
  -- (sıra zaten rastgele), böylece tur 1'de ilk saldıran oyuncu1 = ilk seçmeyen. Bayrak kapalıysa eski akış (eski değerler).
  insert into public.duellolar (oyuncu1, oyuncu2, dereceli, can1, can2, puan1, puan2,
                                yildiz1, yildiz2, puan_degerleri, carpanli_turlar, carpan_katsayi,
                                hakimiyet, sahiplik, kilitler, hakimiyet_esik, kilit_tur, yuva1, yuva2,
                                saldiran, faz, faz_bitis,
                                profil1, profil2, onceki_id, surum,
                                secim_modu, max_tur, ilk_secen, secim_sira, secimler)
  values (p_a, p_b, coalesce(p_dereceli, true), null, null, 0, 0,   -- puan kolonu 0 kalır (eski "puan1 boş = can maçı" ayrımı bozulmasın)
          null, null, null, null, null,
          true, '{}'::jsonb, '{}'::jsonb,
          greatest(1, case when v_secim then public.ayar_sayi('duello_hakimiyet_esik', 7)
                           else public.ayar_sayi('duello_bos_mod_esik', 5) end::int),
          greatest(0, public.ayar_sayi('duello_kilit_tur', 2)::int), 0, 0,
          case when v_secim then p_b else p_a end,
          case when v_secim then 'secim' else 'kategori' end,
          case when v_secim
               then now() + make_interval(secs => public.ayar_sayi('duello_secim_sn', 5) + public.ayar_sayi('duello_secim_ilk_ek_sn', 3))
                    + public.duello2_gosterim_payi()
               else now() + make_interval(secs => public.ayar_sayi('duello2_kategori_sn', 15)) + public.duello2_gosterim_payi() end,
          v_p1, v_p2, p_onceki, 2,
          v_secim,
          greatest(1, case when v_secim then public.ayar_sayi('duello_max_tur', 20)
                           else public.ayar_sayi('duello_bos_mod_max_tur', 16) end)::smallint,
          case when v_secim then p_b end, 0, '[]'::jsonb)
  returning id into v_id;
  if not v_secim then
    perform public.duello2_ban_baslat(v_id);   -- 853: ilk tur da savunma banıyla başlar (bayrak kapalıysa 'kategori' kalır)
  end if;

  insert into public.duello_sinyal (duello_id, oyuncu1, oyuncu2) values (v_id, p_a, p_b);
  delete from public.duello_kuyrugu where user_id in (p_a, p_b);
  return v_id;
end $function$
;

-- ---------------------------------------------------------------- duello2_kategori_sec: faz secim iken seçim dalı
CREATE OR REPLACE FUNCTION public.duello2_kategori_sec(p_id uuid, p_kategori text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare d public.duellolar%rowtype;
begin
  perform public.hiz_siniri('duello_eylem', 90, interval '60 seconds');
  d := public.duello_kilitle(p_id);   -- satır FOR UPDATE: iki seçim (ya da seçim + süre dolumu) sırayla işlenir
  if d.durum <> 'aktif' then raise exception 'Düello bitti'; end if;
  -- 960 · seçim fazı: aynı RPC sıradaki oyuncunun seçimini alır (yılan sırası sunucuda; istemciye güvenilmez).
  if d.faz = 'secim' then
    if d.saldiran <> auth.uid() then raise exception 'Şu an seçim sırası sende değil'; end if;
    if not (p_kategori = any(public.duello2_secim_havuzu(p_id))) then raise exception 'Bu kategori şu an seçilemez'; end if;
    if coalesce(d.sahiplik, '{}'::jsonb) ? p_kategori then raise exception 'Bu kategori zaten alındı'; end if;
    perform public.duello2_secim_uygula(p_id, p_kategori, false);
    perform public.duello_sinyal_ver(p_id);
    return;
  end if;
  if d.faz <> 'kategori' or d.saldiran <> auth.uid() then raise exception 'Şu an kategori seçme sırası sende değil'; end if;
  if not public.duello2_kategori_uygun_mu(p_id, p_kategori) then
    raise exception 'Bu kategori şu an seçilemez';
  end if;
  perform public.duello2_soru_ac(p_id, p_kategori);
  perform public.duello_sinyal_ver(p_id);
end $function$
;

-- ---------------------------------------------------------------- duello2_sonraki: tur sayısı satırdan (max_tur)
CREATE OR REPLACE FUNCTION public.duello2_sonraki(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype;
  v_altin uuid;
begin
  select * into d from public.duellolar where id = p_id for update;

  if d.uzatma then
    v_altin := (d.son_hamle ->> 'altin_kazanan')::uuid;
    if v_altin is not null then
      perform public.duello_bitir(p_id, v_altin);
    else
      perform public.duello2_uzatma_ac(p_id);   -- kazanan çıkana kadar yeni Altın Soru
    end if;
    return;
  end if;

  -- 680 · Hâkimiyet: 1 tur = 1 hamle, roller her tur el değiştirir (tek tur oyuncu1, çift tur oyuncu2 saldırır;
  -- saldiri_sirasi soru indeksini tur*2+sıra benzersiz tutmak için korunur). Eşiğe ilk ulaşan ANINDA kazanır;
  -- son turdan sonra yuvası çok olan kazanır, eşitse Altın Soru (sahiplik değişmez).
  if coalesce(d.hakimiyet, false) then
    if coalesce(d.yuva1, 0) >= d.hakimiyet_esik or coalesce(d.yuva2, 0) >= d.hakimiyet_esik then
      perform public.duello_bitir(p_id, case when coalesce(d.yuva1, 0) >= d.hakimiyet_esik then d.oyuncu1 else d.oyuncu2 end);
    elsif d.tur < coalesce(d.max_tur, public.ayar_sayi('duello_max_tur', 10)) then   -- 960: tur sayısı satırda
      update public.duellolar
         set tur = tur + 1,
             saldiri_sirasi = case when (tur + 1) % 2 = 1 then 0 else 1 end,
             saldiran = case when (tur + 1) % 2 = 1 then oyuncu1 else oyuncu2 end,
             faz = 'kategori', kategori = null, soru_id = null, cevaplar = '{}'::jsonb, bitis1 = null, bitis2 = null,
             faz_bitis = now() + make_interval(secs => public.ayar_sayi('duello2_kategori_sn', 15)) + public.duello2_gosterim_payi(),
             son_hareket = now()
       where id = p_id;
      perform public.duello2_ban_baslat(p_id);   -- 853: savunma banı (bayrak kapalıysa faz 'kategori' kalır)
    elsif coalesce(d.yuva1, 0) <> coalesce(d.yuva2, 0) then
      perform public.duello_bitir(p_id, case when coalesce(d.yuva1, 0) > coalesce(d.yuva2, 0) then d.oyuncu1 else d.oyuncu2 end);
    else
      perform public.duello2_uzatma_ac(p_id);
    end if;
    return;
  end if;

  if d.saldiri_sirasi = 0 then
    update public.duellolar
       set saldiri_sirasi = 1, saldiran = oyuncu2, faz = 'kategori', kategori = null, soru_id = null,
           cevaplar = '{}'::jsonb, bitis1 = null, bitis2 = null,
           faz_bitis = now() + make_interval(secs => public.ayar_sayi('duello2_kategori_sn', 15)) + public.duello2_gosterim_payi(),
           son_hareket = now()
     where id = p_id;
    return;
  end if;

  if d.tur < public.ayar_sayi('duello_max_tur', 10) then
    update public.duellolar
       set tur = tur + 1, saldiri_sirasi = 0, saldiran = oyuncu1, faz = 'kategori',
           kategori = null, soru_id = null, cevaplar = '{}'::jsonb, bitis1 = null, bitis2 = null,
           faz_bitis = now() + make_interval(secs => public.ayar_sayi('duello2_kategori_sn', 15)) + public.duello2_gosterim_payi(),
           son_hareket = now()
     where id = p_id;
  elsif coalesce(d.puan1, 0) <> coalesce(d.puan2, 0) then
    perform public.duello_bitir(p_id, case when d.puan1 > d.puan2 then d.oyuncu1 else d.oyuncu2 end);
  else
    perform public.duello2_uzatma_ac(p_id);   -- eşitlik: Altın Soru
  end if;
end $function$
;

-- ---------------------------------------------------------------- duello2_ilerlet: seçim süresi dolunca otomatik seçim
CREATE OR REPLACE FUNCTION public.duello2_ilerlet(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype;
  v_adim int := 0;
  v_kopuk uuid;
  v_kat text;
  v_tol interval := make_interval(secs => public.ayar_sayi('duello2_cevap_tolerans_sn', 1));
  v_taban interval := make_interval(secs => public.ayar_sayi('duello_kopuk_taban_sn', 3));
begin
  select * into d from public.duellolar where id = p_id for update;
  if not found or d.durum <> 'aktif' then return; end if;

  -- ---------- KOPUKLUK KAPISI (eski akışla aynı; kişisel bitişler de donar) ----------
  v_kopuk := public.duello_kopuk_kim(p_id);
  if v_kopuk is not null then
    if d.kopuk_at is null then
      update public.duellolar
         set kopuk_at = now(),
             kopuk_kalan = greatest(coalesce(d.faz_bitis, now()) - now(), v_taban),
             kopuk_kalan1 = case when d.bitis1 is not null then greatest(d.bitis1 - now(), v_taban) end,
             kopuk_kalan2 = case when d.bitis2 is not null then greatest(d.bitis2 - now(), v_taban) end
       where id = p_id;
      perform public.duello_sinyal_ver(p_id);
      select * into d from public.duellolar where id = p_id;
    end if;

    if d.kopuk_at < now() - make_interval(secs => public.ayar_sayi('duello_kopuk_bekleme_sn', 45)) then
      perform public.duello_bitir(p_id, case when v_kopuk = d.oyuncu1 then d.oyuncu2 else d.oyuncu1 end);
      perform public.duello_sinyal_ver(p_id);
      return;
    end if;

    update public.duellolar
       set faz_bitis = now() + greatest(coalesce(d.kopuk_kalan, v_taban), v_taban),
           bitis1 = case when d.kopuk_kalan1 is not null then now() + greatest(d.kopuk_kalan1, v_taban) else bitis1 end,
           bitis2 = case when d.kopuk_kalan2 is not null then now() + greatest(d.kopuk_kalan2, v_taban) else bitis2 end
     where id = p_id;
    return;
  end if;

  if d.kopuk_at is not null then
    update public.duellolar
       set kopuk_at = null, kopuk_kalan = null, kopuk_kalan1 = null, kopuk_kalan2 = null,
           faz_bitis = now() + greatest(coalesce(d.kopuk_kalan, v_taban), v_taban),
           bitis1 = case when d.kopuk_kalan1 is not null then now() + greatest(d.kopuk_kalan1, v_taban) else bitis1 end,
           bitis2 = case when d.kopuk_kalan2 is not null then now() + greatest(d.kopuk_kalan2, v_taban) else bitis2 end,
           son_hareket = now()
     where id = p_id;
    perform public.duello_sinyal_ver(p_id);
  end if;
  -- ---------- /KOPUKLUK KAPISI ----------

  loop
    v_adim := v_adim + 1;
    exit when v_adim > 12;
    select * into d from public.duellolar where id = p_id;
    exit when not found or d.durum <> 'aktif';

    if d.son_hareket < now() - make_interval(mins => public.ayar_sayi('duello_zaman_asimi_dk', 60)::int) then
      update public.duellolar set durum = 'iptal', bitis = now() where id = p_id;
      perform public.duello_sinyal_ver(p_id);
      exit;
    end if;

    if d.faz = 'kategori' then
      exit when now() < d.faz_bitis;
      -- Süre doldu: uygun kategorilerden RASTGELE; 470: savunanın zayıf kategorisi başka seçenek
      -- varsa seçilmez (saldıran seçmediği bir risk yüzünden can kaybetmesin).
      v_kat := public.duello2_otomatik_kategori(p_id);
      perform public.duello2_soru_ac(p_id, v_kat);
    elsif d.faz = 'cevap' then
      -- Her oyuncu ya cevapladı ya da kişisel süresi (+ tolerans) doldu → çözümle.
      exit when not ((d.cevaplar ? d.oyuncu1::text) or now() > d.bitis1 + v_tol)
             or not ((d.cevaplar ? d.oyuncu2::text) or now() > d.bitis2 + v_tol);
      perform public.duello2_cozumle(p_id);
    elsif d.faz = 'sonuc' then
      exit when now() < d.faz_bitis;
      perform public.duello2_sonraki(p_id);
    elsif d.faz = 'ban' then
      -- 853: savunma banı süresi doldu → ban yok, saldıran bütün uygun kategorilerden seçer.
      exit when now() < d.faz_bitis;
      perform public.duello2_ban_bitir(p_id, null);
    elsif d.faz = 'secim' then
      -- 960: seçim süresi doldu → sunucu sıradaki oyuncu için seçer (kendi en yüksek yüzdesi; bot: bot seçimi).
      exit when now() < d.faz_bitis;
      perform public.duello2_secim_oto(p_id);
    else
      exit;
    end if;
    perform public.duello_sinyal_ver(p_id);
  end loop;
end $function$
;

-- ---------------------------------------------------------------- duello2_bot_tik: bot seçimi
CREATE OR REPLACE FUNCTION public.duello2_bot_tik(p_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype;
  v_bot uuid;
  v_n int := 0;
  v_kat text;
  v_gecikme double precision;
  v_min double precision := public.ayar_ondalik('duello2_bot_kategori_min_sn', 1.5);
  v_max double precision := public.ayar_ondalik('duello2_bot_kategori_max_sn', 4);
  v_dc smallint;
  v_cevap smallint;
  v_kat_bas timestamptz;
  v_idx int;
begin
  -- Maç satırı kilitliyse (oyuncu eylemi / başka tik) bu tikte atla.
  select * into d from public.duellolar where id = p_id and surum = 2 for update skip locked;
  if not found or d.durum <> 'aktif' then return 0; end if;
  perform public.duello2_ilerlet(p_id);

  for v_bot in select p.id from public.profiles p
                where p.id in (d.oyuncu1, d.oyuncu2) and coalesce(p.is_bot, false) loop
    select * into d from public.duellolar where id = p_id;
    -- Kopuk oyuncu varken maç donar; bot da bekler.
    exit when d.durum <> 'aktif' or d.kopuk_at is not null;

    -- ---------- 960: seçim fazı (sıra bottaysa) ----------
    -- An: sayaç başladıktan (gösterim payı + ilk seçim payı sonrası) duello_bot_secim_min_sn–max_sn sonra (tik aralığıyla
    -- en geç ~+2 sn; süre dolarsa duello2_secim_oto aynı bot seçimini yapar). Sıra yine bottaysa (B-B) sonraki tikte.
    if d.faz = 'secim' and d.saldiran = v_bot
       and now() >= d.faz_bitis - make_interval(secs => public.ayar_sayi('duello_secim_sn', 5))
                    + make_interval(secs => public.ayar_ondalik('duello_bot_secim_min_sn', 1)
                        + (public.ayar_ondalik('duello_bot_secim_max_sn', 3) - public.ayar_ondalik('duello_bot_secim_min_sn', 1))
                          * public.bot_rasgele('d2sec:' || p_id::text || ':' || d.secim_sira)) then
      perform public.duello2_secim_uygula(p_id, public.duello2_bot_secim_kategori(p_id, v_bot), false);
      perform public.duello_sinyal_ver(p_id);
      v_n := v_n + 1;
      select * into d from public.duellolar where id = p_id;
    end if;

    -- ---------- 853: savunma banı (bot savunanken) ----------
    -- An: fazın 1–2,5. saniyesi (tik aralığıyla en geç ~+2 sn). Aday yoksa ban boş geçilir.
    if d.faz = 'ban' and d.saldiran <> v_bot
       and now() >= d.faz_bitis - public.duello2_gosterim_payi() - make_interval(secs => public.ayar_sayi('duello_ban_sn', 5))
                    + make_interval(secs => 1 + 1.5 * public.bot_rasgele('d2ban:' || p_id::text || ':' || d.tur)) then
      v_kat := public.duello2_bot_ban_kategori(p_id, v_bot);
      perform public.duello2_ban_bitir(p_id, v_kat);
      perform public.duello_sinyal_ver(p_id);
      v_n := v_n + 1;
      select * into d from public.duellolar where id = p_id;
    end if;

    -- ---------- 650: kategori kalkanı (bot savunanken, hakkı duruyorsa) ----------
    -- Her kategori fazında bir kez zar (tohum: maç + tur indeksi); an fazın 1–4. saniyesi
    -- (tik aralığı yüzünden en geç +6 sn). Saldıran ondan önce seçtiyse faz geçmiştir — normal.
    if d.faz = 'kategori' and d.saldiran <> v_bot and not d.uzatma
       and public.duello_kalkan_kalan(d.tur, jsonb_array_length(case when v_bot = d.oyuncu1 then d.kalkanlar1 else d.kalkanlar2 end)) > 0   -- 666: 2 hak, iki pencere
       and public.ayar_sayi('duello2_kalkan_acik', 1) = 1 then
      v_idx := d.tur * 2 + d.saldiri_sirasi;
      v_kat_bas := d.faz_bitis - make_interval(secs => public.ayar_sayi('duello2_kategori_sn', 8));
      if now() >= v_kat_bas + make_interval(secs => 1 + 3 * public.bot_rasgele('d2klkz:' || p_id::text || ':' || v_idx))
         and now() < v_kat_bas + interval '6 seconds'
         and public.bot_rasgele('d2klk:' || p_id::text || ':' || v_idx) * 100
             < (case when d.tur > public.ayar_sayi('duello_kalkan_pencere1_son_tur', 5)   -- 666: 2. pencerede puanda gerideyse
                      and (case when v_bot = d.oyuncu1 then coalesce(d.puan1, 0) - coalesce(d.puan2, 0)
                                else coalesce(d.puan2, 0) - coalesce(d.puan1, 0) end) < 0
                     then public.ayar_sayi('duello2_bot_kalkan_kritik_yuzde', 45)
                     else public.ayar_sayi('duello2_bot_kalkan_yuzde', 12) end) then
        v_kat := public.duello2_bot_kalkan_kategori(p_id, v_bot);
        if v_kat is not null and public.duello2_kalkan_engel(p_id, v_bot, v_kat) is null then
          perform public.duello2_kalkan_uygula(p_id, v_bot, v_kat);
          perform public.duello_sinyal_ver(p_id);
          v_n := v_n + 1;
          select * into d from public.duellolar where id = p_id;
        end if;
      end if;
    end if;

    -- ---------- kategori ----------
    if d.faz = 'kategori' and d.saldiran = v_bot
       and now() >= d.faz_bitis - make_interval(secs => public.ayar_sayi('duello2_kategori_sn', 8))
                    + make_interval(secs => v_min + (v_max - v_min)
                        * public.bot_rasgele('d2kat:' || p_id::text || ':' || d.tur || ':' || d.saldiri_sirasi)) then
      v_kat := public.duello2_bot_kategori(p_id, v_bot);
      perform public.duello2_soru_ac(p_id, v_kat);
      perform public.duello_sinyal_ver(p_id);
      v_n := v_n + 1;
      select * into d from public.duellolar where id = p_id;
    end if;

    -- ---------- skill + cevap (saldırı, savunma, uzatma) ----------
    if d.faz = 'cevap' and not (d.cevaplar ? v_bot::text) and d.soru_baslangic is not null then
      v_gecikme := public.duello2_bot_cevap_gecikme(p_id, v_bot);
      -- Skill anı: cevap gecikmesinin %35–75'i (bot cevapladıktan sonra skill kullanılamaz).
      if now() >= d.soru_baslangic + make_interval(secs => v_gecikme * (0.35 + 0.4
             * public.bot_rasgele('d2skz:' || p_id::text || ':' || (d.tur * 2 + d.saldiri_sirasi) || ':' || v_bot::text))) then
        if not d.uzatma and public.duello2_bot_skill_dene(p_id, v_bot) then   -- 666: Altın Soru jokersiz
          v_n := v_n + 1;
          select * into d from public.duellolar where id = p_id;
          v_gecikme := public.duello2_bot_cevap_gecikme(p_id, v_bot);   -- Soru Değiştir süreyi baştan başlatır
        end if;
      end if;

      if now() >= d.soru_baslangic + make_interval(secs => v_gecikme) then
        -- İsabet KATEGORİYE göre (botun kişiliği: güçlü/zayıf kategoriler).
        select dogru_cevap into v_dc from public.questions where id = d.soru_id;
        if random() < public.bot_soru_isabet(v_bot, d.kategori, d.soru_id) then
          v_cevap := v_dc;
        else
          select x into v_cevap from generate_series(0, 3) x
           where x <> v_dc and not (x = any(coalesce(case when v_bot = d.oyuncu1 then d.elli1 else d.elli2 end, '{}')))
           order by random() limit 1;
        end if;
        begin
          perform public.duello2_bot_cevap(p_id, v_bot, v_cevap);
          v_n := v_n + 1;
        exception when others then
          -- Süre kaçtıysa soru "Yanıtsız" çözümlenir (duello2_ilerlet).
          raise warning 'duello2_bot_tik % cevap: %', p_id, sqlerrm;
        end;
      end if;
    end if;
  end loop;
  return v_n;
end $function$
;

-- ---------------------------------------------------------------- duello2_durum: max_tur satırdan, secim nesnesi, secim sayacı
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
  v_hk jsonb;
  v_rol text;
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
             'yildiz', h.yildiz, 'deger', h.deger, 'carpan', h.carpan, 'altin_kazanan', h.altin_kazanan,   -- 666/667
             'benim_puanim', case when h.saldiran = v_me then h.puan_saldiran else h.puan_savunan end,
             'rakip_puani', case when h.saldiran = v_me then h.puan_savunan else h.puan_saldiran end,
             'kalkan', h.kalkan, 'savunan', h.savunan, 'hakimiyet', h.hakimiyet) order by h.id), '[]'::jsonb)   -- 650: kalkan
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
   where k.user_id = v_rakip and k.mac_tur = 'duello' and k.mac_id = p_id and k.soru_index = v_idx
     and k.tur not in ('baskin', 'kalkan'));   -- 680: rol jokerleri tur sonuna kadar rakibe gizli
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

  -- 680 · Hâkimiyet tahtası. kilitler: yalnız süren kilitler, değer = kalan tur (sonuç fazında bu tur sayılmaz).
  -- rol_joker: bu an bana gösterilecek rol jokeri (saldırıyorsam Baskın, kendi kategorime saldırılıyorsa Kalkan).
  if coalesce(d.hakimiyet, false) then
    v_rol := case when d.durum <> 'aktif' or d.faz <> 'cevap' or d.uzatma or d.kategori is null then null
                  when d.saldiran = v_me then 'baskin'
                  when (d.sahiplik ->> d.kategori) = v_me::text then 'kalkan' end;
    v_hk := jsonb_build_object(
      'acik', true,
      'esik', d.hakimiyet_esik,
      'kilit_tur', d.kilit_tur,
      'sahiplik', coalesce(d.sahiplik, '{}'::jsonb),
      'kilitler', (select coalesce(jsonb_object_agg(e.key, x.kalan), '{}'::jsonb)
                     from jsonb_each_text(coalesce(d.kilitler, '{}'::jsonb)) e
                     cross join lateral (select e.value::int - d.tur + case when d.faz = 'sonuc' then 0 else 1 end as kalan) x
                    where x.kalan > 0 and not d.uzatma),
      'yuvalar', jsonb_build_object(d.oyuncu1::text, coalesce(d.yuva1, 0), d.oyuncu2::text, coalesce(d.yuva2, 0)),
      'rol_joker', v_rol,
      'rol_joker_hak', public.ayar_sayi('duello_rol_joker_mac_hak', 1),
      'avantaj_esik', public.ayar_sayi('duello_kat_esik_yuzde', 10));
  else
    v_hk := jsonb_build_object('acik', false);
  end if;

  return jsonb_build_object(
    'surum', 2,
    'hakimiyet', v_hk,
    'id', d.id, 'durum', d.durum, 'dereceli', d.dereceli,
    'tur', d.tur, 'max_tur', coalesce(d.max_tur, public.ayar_sayi('duello_max_tur', 10)), 'saldiri_sirasi', d.saldiri_sirasi,   -- 960: satırdan
    'uzatma', d.uzatma,
    'faz', d.faz, 'faz_bitis', d.faz_bitis, 'sunucu_zamani', clock_timestamp(),   -- 325: yanıtın çıktığı an
    'ben', v_me, 'saldiran', d.saldiran, 'savunan', v_savunan,
    'oyuncular', jsonb_build_array(
      (select jsonb_build_object('id', p.id, 'gorunen_ad', p.gorunen_ad, 'gorunen_avatar', p.gorunen_avatar,
               'gorunum', p.gorunum, 'puan', coalesce(d.puan1, 0), 'yildizlar', d.yildiz1, 'dogru', d.dogru1, 'profil', d.profil1,
               'unvan', public.oyuncu_unvani(p.id))
         from public.profiles p where p.id = d.oyuncu1),
      (select jsonb_build_object('id', p.id, 'gorunen_ad', p.gorunen_ad, 'gorunen_avatar', p.gorunen_avatar,
               'gorunum', p.gorunum, 'puan', coalesce(d.puan2, 0), 'yildizlar', d.yildiz2, 'dogru', d.dogru2, 'profil', d.profil2,
               'unvan', public.oyuncu_unvani(p.id))
         from public.profiles p where p.id = d.oyuncu2)),
    'kategoriler', to_jsonb(public.duello_kategorileri()),
    'puan_degerleri', coalesce(d.puan_degerleri, public.duello_puan_degerleri()),   -- 666
    -- 667: son 2 tur ×çarpan — maç başında sabitlenen liste/katsayı; tur_carpani = bu an geçerli çarpan.
    'tur_carpani', case when d.uzatma or coalesce(d.hakimiyet, false) then 1 else public.duello_tur_carpani(d.tur, d.carpanli_turlar, d.carpan_katsayi) end,
    'carpanli_turlar', case when coalesce(d.hakimiyet, false) then '[]'::jsonb else coalesce(d.carpanli_turlar,
       (select deger from public.oyun_ayarlari where anahtar = 'duello_carpanli_turlar'), '[9,10]'::jsonb) end,
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
       'ban', public.ayar_sayi('duello_ban_sn', 5),   -- 853
       'secim', public.ayar_sayi('duello_secim_sn', 5),   -- 960
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
          when 'ban' then d.faz_bitis - make_interval(secs => public.ayar_sayi('duello_ban_sn', 5))   -- 853
          when 'secim' then d.faz_bitis - make_interval(secs => public.ayar_sayi('duello_secim_sn', 5))   -- 960
          when 'cevap' then d.soru_baslangic + public.duello2_gosterim_payi() end),
    'kazanan', d.kazanan, 'odul', v_odul, 'ezeli', v_ezeli, 'gecmis', v_gecmis,
    'rovans', jsonb_build_object('isteyen', d.rovans_isteyen, 'id', d.rovans_id,
       'gecerli', d.rovans_at is not null and d.rovans_at > now() - make_interval(secs => public.ayar_sayi('duello_rovans_sn', 60)))
  )
  -- 666: Kategori Kalkanı — maçta 2 hak (Tur 1–pencere1: 1 açık; pencere2'ye kadar: 2, kullanılmayan kaybolmaz).
  -- kullanilan: [{kategori, idx, tur}]; kalan: şu an kullanılabilecek hak; aktif: bu seçimde korunan kategori.
  || jsonb_build_object('kalkan', jsonb_build_object(
       'acik', d.surum = 2 and public.ayar_sayi('duello2_kalkan_acik', 1) = 1,
       'son_sn', public.ayar_sayi('duello2_kalkan_son_sn', 5),
       'toplam_hak', 2,
       'pencere1_son', public.ayar_sayi('duello_kalkan_pencere1_son_tur', 5),
       'pencere2_son', public.ayar_sayi('duello_kalkan_pencere2_son_tur', 10),
       'oyuncular', jsonb_build_object(
          d.oyuncu1::text, jsonb_build_object('kullanilan', d.kalkanlar1,
             'kalan', case when d.uzatma then 0 else public.duello_kalkan_kalan(d.tur, jsonb_array_length(d.kalkanlar1)) end),
          d.oyuncu2::text, jsonb_build_object('kullanilan', d.kalkanlar2,
             'kalan', case when d.uzatma then 0 else public.duello_kalkan_kalan(d.tur, jsonb_array_length(d.kalkanlar2)) end)),
       'aktif', public.duello2_aktif_kalkan(p_id)))
  -- 853: savunma banı. kategori: bu turun banı (ban fazı bitince, tur sonuna kadar); onceki: savunanın bir önceki
  -- savunmasındaki banı (arka arkaya banlanamaz); uygun: ban fazında banlanabilecek kategoriler.
  || jsonb_build_object('ban', jsonb_build_object(
       'acik', coalesce(d.hakimiyet, false) and public.ayar_sayi('duello_ban_acik', 1) = 1,
       'sure', public.ayar_sayi('duello_ban_sn', 5),
       'kategori', case when d.durum = 'aktif' and not d.uzatma and d.faz <> 'ban' then d.ban_kategori end,
       'onceki', case when d.durum = 'aktif' and d.faz = 'ban'
                      then (case when v_savunan = d.oyuncu1 then d.son_ban1 else d.son_ban2 end) end,
       'uygun', case when d.durum = 'aktif' and d.faz = 'ban' then
           (select coalesce(jsonb_agg(k order by k), '[]'::jsonb) from unnest(public.duello_kategorileri()) k
             where public.duello2_ban_uygun_mu(p_id, v_savunan, k)) end))
  -- 960: sıralı kategori seçimi. sira: yapılmış seçim sayısı; toplam: havuz (10); sirasi: her seçim sırasının oyuncusu
  -- (yılan A-B-B-A…); secimler: [{k, u, oto, sira}] — oto = süre doldu, sunucu seçti; kalan: henüz alınmamışlar.
  || jsonb_build_object('secim', case when coalesce(d.secim_modu, false) then jsonb_build_object(
       'acik', true,
       'sira', d.secim_sira,
       'toplam', coalesce(array_length(public.duello2_secim_havuzu(p_id), 1), 0),
       'ilk_secen', d.ilk_secen,
       'sure', public.ayar_sayi('duello_secim_sn', 5),
       'sirasi', (select coalesce(jsonb_agg(case when public.duello2_secim_sirasi(i) = 0 then d.ilk_secen
                                                 when d.ilk_secen = d.oyuncu1 then d.oyuncu2 else d.oyuncu1 end order by i), '[]'::jsonb)
                    from generate_series(0, coalesce(array_length(public.duello2_secim_havuzu(p_id), 1), 0) - 1) i),
       'secimler', coalesce(d.secimler, '[]'::jsonb),
       'kalan', case when d.faz = 'secim' then
           (select coalesce(jsonb_agg(k order by k), '[]'::jsonb) from unnest(public.duello2_secim_havuzu(p_id)) k
             where not (coalesce(d.sahiplik, '{}'::jsonb) ? k)) end)
     else jsonb_build_object('acik', false) end);
end $function$
;

