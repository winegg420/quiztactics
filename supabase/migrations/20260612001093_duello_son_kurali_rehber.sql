-- 1093 · DÜELLO PAKETİ (Ida, 14 Eki 2026)
-- 1) SON DÜELLO KURALI: art arda 5 nötr soru (v4_notr_max) artık Son Düello tetiklemez; saldırı turu sınırı (v4_max_tur)
--    da kalktı. Son Düello yalnız TOPLAM soru sınırında başlar: nötr + saldırı soruları birlikte sayılır (v4_soru_no),
--    duello4_max_soru (20) → 20. soru Son Düello. Sınır maç açılırken satıra sabitlenir (v4_max_soru); süren maçta
--    null → ayar. Nötr döngüsü en geç 20. soruda biter. v4_notr_seri / v4_max_tur kolonları duruyor (geçmiş/özet okur).
-- 2) İLK DÜELLO REHBERİ: profiles.duello_rehber_mac = oyuncunun rehber gördüğü TEK maç. Oyuncu bir v4 maç ekranına ilk
--    kez gelince (duello_giris → ekran1/2) ve hiç bitmiş düellosu yoksa tetikleyici yazar; bir daha değişmez (misafir
--    dahil, hesapta). duello4_durum › v4.rehber yalnız o maçta true.
-- Yeni GRANT/RLS yok: tetikleyici fonksiyonu iç (public/anon/authenticated'tan geri alınır).
-- Geri alma: docs/duello-1093-geri-al.sql

alter table public.duellolar add column if not exists v4_max_soru smallint;
alter table public.profiles add column if not exists duello_rehber_mac uuid;
insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('duello4_max_soru', '20'::jsonb, 'Düello v4: toplam soru sınırı (nötr + saldırı). Bu sayıncı soru Son Düello olur (1093). Maç açılırken satıra sabitlenir.')
on conflict (anahtar) do nothing;

CREATE OR REPLACE FUNCTION public.duello4_baslat(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update public.duellolar
     set surum = 4, hakimiyet = false, secim_modu = false, puan_modu = false, ban_acik = false,
         faz = 'notr', saldiran = oyuncu1, ilk_secen = null, tur = 0, max_tur = null,
         v4_kontrol = null, v4_seri = 0, v4_tur = 0, v4_notr_seri = 0, v4_kullanilan = '{}', v4_soru_no = 0,
         v4_max_tur = greatest(1, public.ayar_sayi('duello4_max_tur', 15))::smallint,
         v4_max_soru = greatest(2, public.ayar_sayi('duello4_max_soru', 20))::smallint,   -- 1093: toplam soru sınırı
         v4_seri_hedef = greatest(1, public.ayar_sayi('duello4_seri_hedef', 3))::smallint,
         v4_notr_max = greatest(1, public.ayar_sayi('duello4_notr_max', 5))::smallint,
         v4_kart_sayisi = greatest(2, public.ayar_sayi('duello4_kart_sayisi', 4))::smallint,
         -- 1092: giriş beklemesi
         soru_id = null, soru_id1 = null, soru_id2 = null, soru_baslangic = null, bitis1 = null, bitis2 = null,
         faz_bitis = now() + make_interval(secs => greatest(1, public.ayar_sayi('duello_baglanma_sn', 15)))
   where id = p_id;
end $function$;

CREATE OR REPLACE FUNCTION public.duello4_sonraki(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare d public.duellolar%rowtype;
begin
  select * into d from public.duellolar where id = p_id for update;
  if not found or d.durum <> 'aktif' or d.faz <> 'sonuc' then return; end if;
  if d.son_hamle ->> 'sonuc' = 'son_kazandi' then
    perform public.duello_bitir(p_id, (d.son_hamle ->> 'kazanan')::uuid);
  elsif d.v4_kontrol is not null and d.v4_seri >= coalesce(d.v4_seri_hedef, 3) then
    perform public.duello_bitir(p_id, d.v4_kontrol);
  elsif d.v4_son
     or d.v4_soru_no + 1 >= coalesce(d.v4_max_soru, public.ayar_sayi('duello4_max_soru', 20)::smallint) then
    perform public.duello4_ortak_soru_ac(p_id, true);                  -- 1093: toplam 20. soru Son Düello (tek bilen çıkana kadar)
  elsif d.v4_kontrol is null then
    perform public.duello4_ortak_soru_ac(p_id, false);                 -- nötr (art arda nötr artık Son Düello tetiklemez)
  else
    perform public.duello4_kart_ac(p_id);
  end if;
end $function$;

CREATE OR REPLACE FUNCTION public.duello4_durum(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype;
  v_me uuid := auth.uid();
  v_ben1 boolean;
  v_rakip uuid;
  v_dil text := public.oyuncu_dili();
  v_benim_profil jsonb;
  v_rakip_profil jsonb;
  v_soru jsonb;
  v_soru_id uuid;
  v_soru_acik boolean;
  v_kart jsonb;
  v_arkadas boolean;
  v_ezeli jsonb;
  v_odul jsonb;
  v_gecmis jsonb;
  v_benim jsonb;
  v_bu_soruda int;
  v_rakip_soruda boolean;
  v_ilk smallint;
  v_kilit text;
  v_varsayilan int := public.ayar_sayi('duello4_oran_varsayilan', 50);
begin
  perform public.hiz_siniri('duello_durum', 400, interval '60 seconds');
  d := public.duello_kilitle(p_id);
  v_ben1 := d.oyuncu1 = v_me;
  v_rakip := case when v_ben1 then d.oyuncu2 else d.oyuncu1 end;
  v_benim_profil := case when v_ben1 then d.profil1 else d.profil2 end;
  v_rakip_profil := case when v_ben1 then d.profil2 else d.profil1 end;

  -- Soru metni yalnız giriş bittikten sonra ve soru/sonuç fazında (kart fazında yok).
  v_soru_id := case when v_ben1 then d.soru_id1 else d.soru_id2 end;
  v_soru_acik := v_soru_id is not null
    and ((d.faz in ('notr', 'cevap', 'son') and now() >= d.soru_baslangic) or d.faz = 'sonuc' or d.durum <> 'aktif'
         -- 1092: maçın 1. sorusu kurulduğu anda gelir (Klasik/Grup gibi): istemci 3-2-1 katmanının ALTINDA tutar, yavaş
         -- telefonda soru başlangıçtan sonraki okumayı beklemez. Cevap yine soru_baslangic'tan önce reddedilir (duello4_cevap).
         or (d.durum = 'aktif' and d.faz = 'notr' and d.v4_soru_no = 1));
  if v_soru_acik then
    select jsonb_build_object('soru', sd.soru, 'secenekler', sd.secenekler, 'kategori', sd.kategori)
      into v_soru from public.soru_dilinde(v_soru_id, v_dil) sd;
  end if;
  -- 1052 basılı tut: doğru şık YALNIZ hileli_mi() hesabına ve yalnız kendi cevap hakkı sürerken (normal oyuncuda alan yok).
  if v_soru is not null and d.durum = 'aktif' and d.faz in ('notr', 'cevap', 'son') and now() >= d.soru_baslangic and not (coalesce(d.cevaplar, '{}'::jsonb) ? v_me::text) and public.hileli_mi() then
    v_soru := v_soru || jsonb_build_object('dogru_cevap', (select q.dogru_cevap from public.questions q where q.id = v_soru_id));
  end if;

  -- Kartlar: oranlar izleyenin bakışıyla (ben / rakip). null = yeterli veri yok ("?"). Rakibe gönderilen kart,
  -- seçim bitene kadar bekleyen oyuncuya gizli (adim: kaç seçim yapıldı).
  if d.faz = 'kart' and d.v4_kartlar is not null then
    v_kart := jsonb_build_object(
      'kartlar', (select coalesce(jsonb_agg(jsonb_build_object(
                    'k', k, 'ben', public.duello4_oran(v_benim_profil, k), 'rakip', public.duello4_oran(v_rakip_profil, k)) order by n), '[]'::jsonb)
                    from unnest(d.v4_kartlar) with ordinality x(k, n)),
      'adim', (case when d.v4_gonderilen is not null then 1 else 0 end) + (case when d.v4_secilen is not null then 1 else 0 end),
      'gonderilen', case when v_me = d.v4_kontrol then d.v4_gonderilen end,
      'secilen', case when v_me = d.v4_kontrol then d.v4_secilen end,
      'varsayilan', v_varsayilan);
  end if;

  v_arkadas := exists (select 1 from public.friendships f where f.durum = 'arkadas'
     and ((f.requester = v_me and f.addressee = v_rakip) or (f.requester = v_rakip and f.addressee = v_me)));
  if v_arkadas then
    select jsonb_build_object('ben', count(*) filter (where x.kazanan = v_me), 'rakip', count(*) filter (where x.kazanan = v_rakip))
      into v_ezeli from public.duellolar x
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

  -- Maç sonu özeti: her soru izleyenin bakışıyla.
  if d.durum <> 'aktif' then
    select coalesce(jsonb_agg(jsonb_build_object(
             'tip', h.v4 ->> 'tip', 'tur', h.tur, 'sonuc', h.v4 ->> 'sonuc',
             'kontrol_sonra', h.v4 -> 'kontrol_sonra', 'seri_sonra', h.v4 -> 'seri_sonra',
             'kategori', h.v4 -> 'oyuncular' -> v_me::text ->> 'kategori',
             'rakip_kategori', h.v4 -> 'oyuncular' -> v_rakip::text ->> 'kategori',
             'soru', sd.soru, 'secenekler', sd.secenekler,
             'dogru_cevap', (h.v4 -> 'oyuncular' -> v_me::text -> 'dogru_cevap'),
             'benim_cevabim', (h.v4 -> 'oyuncular' -> v_me::text -> 'cevap'),
             'ben_dogru', (h.v4 -> 'oyuncular' -> v_me::text -> 'dogru'),
             'ben_yanitsiz', (h.v4 -> 'oyuncular' -> v_me::text -> 'yanitsiz'),
             'rakip_dogru', (h.v4 -> 'oyuncular' -> v_rakip::text -> 'dogru'),
             'rakip_yanitsiz', (h.v4 -> 'oyuncular' -> v_rakip::text -> 'yanitsiz')) order by h.id), '[]'::jsonb)
      into v_gecmis
      from public.duello_hamleler h
      left join lateral public.soru_dilinde((h.v4 -> 'oyuncular' -> v_me::text ->> 'soru_id')::uuid, v_dil) sd on true
     where h.duello_id = p_id and h.v4 is not null;
  end if;

  select jsonb_build_object('kullanilan', coalesce(sum(s.n), 0), 'sayilar', coalesce(jsonb_object_agg(s.tur, s.n), '{}'::jsonb))
    into v_benim
    from (select k.tur, count(*) n from public.joker_kullanimlari k
           where k.user_id = v_me and k.mac_tur = 'duello' and k.mac_id = p_id group by k.tur) s;
  select count(*) into v_bu_soruda from public.joker_kullanimlari k
   where k.user_id = v_me and k.mac_tur = 'duello' and k.mac_id = p_id and k.soru_index = d.v4_soru_no;
  v_rakip_soruda := exists (select 1 from public.joker_kullanimlari k
   where k.user_id = v_rakip and k.mac_tur = 'duello' and k.mac_id = p_id and k.soru_index = d.v4_soru_no);
  select s.ilk_cevap into v_ilk from public.skill_ikinci_sans_denemeleri s
   where s.mac_tur = 'duello' and s.mac_id = p_id and s.user_id = v_me and s.soru_index = d.v4_soru_no;
  v_kilit := case
    when d.faz not in ('notr', 'cevap') or d.durum <> 'aktif' then 'Soru açık değil'
    when d.cevaplar ? v_me::text or v_ilk is not null then 'Cevap verildikten sonra soru değiştirilemez'
    when d.faz = 'notr' and d.cevaplar <> '{}'::jsonb then 'Cevap verildikten sonra soru değiştirilemez'
    when d.faz = 'notr' and v_rakip_soruda then 'Rakibin bu soruda skill kullandı, soru değiştirilemez'
    when v_bu_soruda >= public.ayar_sayi('duello2_skill_soru_basi_hak', 1) then 'Bu soruda skill hakkını kullandın'
    else null end;

  return jsonb_build_object(
    'surum', 4,
    'id', d.id, 'durum', d.durum, 'dereceli', d.dereceli,
    'faz', d.faz, 'faz_bitis', d.faz_bitis, 'sunucu_zamani', clock_timestamp(),
    'ben', v_me, 'rakip', v_rakip,
    'oyuncular', jsonb_build_array(
      (select jsonb_build_object('id', p.id, 'gorunen_ad', p.gorunen_ad, 'gorunen_avatar', p.gorunen_avatar,
               'gorunum', p.gorunum, 'dogru', d.dogru1, 'unvan', public.oyuncu_unvani(p.id))
         from public.profiles p where p.id = d.oyuncu1),
      (select jsonb_build_object('id', p.id, 'gorunen_ad', p.gorunen_ad, 'gorunen_avatar', p.gorunen_avatar,
               'gorunum', p.gorunum, 'dogru', d.dogru2, 'unvan', public.oyuncu_unvani(p.id))
         from public.profiles p where p.id = d.oyuncu2)),
    'v4', jsonb_build_object(
      'kontrol', d.v4_kontrol, 'seri', d.v4_seri, 'seri_hedef', d.v4_seri_hedef,
      'tur', d.v4_tur, 'max_tur', d.v4_max_tur, 'notr_seri', d.v4_notr_seri, 'notr_max', d.v4_notr_max,
      'son', d.v4_son, 'soru_no', d.v4_soru_no,
      -- 1093: Son Düello toplam soru sınırında (nötr + saldırı); rehber = bu maç oyuncunun ilk Düello rehberi maçı
      'max_soru', coalesce(d.v4_max_soru, public.ayar_sayi('duello4_max_soru', 20)::smallint),
      'rehber', coalesce((select p.duello_rehber_mac = d.id from public.profiles p where p.id = v_me), false),
      -- 1092: iki oyuncu da maç ekranına gelene kadar ilk soru kurulmaz (istemci "Rakip bağlanıyor…" gösterir)
      'giris_bekle', d.durum = 'aktif' and d.faz = 'notr' and d.v4_soru_no = 0 and d.soru_id is null, 'kullanilan', to_jsonb(d.v4_kullanilan),
      'kart', v_kart,
      -- Saldırı turunda kategoriler kart fazı bitince iki oyuncuya da açılır.
      'benim_kategori', case when d.faz <> 'kart' then case when v_ben1 then d.kategori1 else d.kategori2 end end,
      'rakip_kategori', case when d.faz <> 'kart' then case when v_ben1 then d.kategori2 else d.kategori1 end end,
      'oto', case when d.faz <> 'kart' then d.v4_kart_oto end,
      -- 1058: hangi adım otomatik seçildi (istemci "Süre doldu · otomatik seçildi"yi yalnız o kategoride yazar)
      'oto_gonder', case when d.faz <> 'kart' then d.v4_oto_gonder end,
      'oto_sec', case when d.faz <> 'kart' then d.v4_oto_sec end,
      'ilk_mac', not exists (select 1 from public.duellolar x
                              where x.surum = 4 and x.durum = 'bitti' and x.id <> d.id and v_me in (x.oyuncu1, x.oyuncu2))),
    'soru', v_soru,
    'cevap', case when d.faz in ('notr', 'cevap', 'son') then jsonb_build_object(
        'benim_bitis', case when v_ben1 then d.bitis1 else d.bitis2 end,
        'rakip_bitis', case when v_ben1 then d.bitis2 else d.bitis1 end,
        'ben_cevapladim', d.cevaplar ? v_me::text,
        'benim_cevabim', d.cevaplar -> v_me::text -> 'cevap',
        'rakip_cevapladi', d.cevaplar ? v_rakip::text,
        'elli_kapali', to_jsonb(case when v_ben1 then d.elli1 else d.elli2 end),
        'ikinci_sans_ilk_cevap', v_ilk) end,
    'son_hamle', d.son_hamle,
    'skill', jsonb_build_object(
       'kapali', d.v4_son,
       'set', to_jsonb(public.skill_setim('duello')),
       'izinli', to_jsonb(public.duello4_izinli_skiller()),
       'toplam_hak', public.ayar_sayi('duello2_skill_toplam_hak', 4),
       'tur_basi_hak', public.ayar_sayi('duello2_skill_tur_basi_hak', 2),
       'soru_basi_hak', public.ayar_sayi('duello2_skill_soru_basi_hak', 1),
       'kullanilan', v_benim -> 'kullanilan', 'sayilar', v_benim -> 'sayilar',
       'bu_soruda', v_bu_soruda, 'rakip_bu_soruda', v_rakip_soruda,
       'soru_degistir_kilit', v_kilit,
       'envanter', (select coalesce(jsonb_object_agg(e.tur, e.adet), '{}'::jsonb) from public.joker_envanter e where e.user_id = v_me),
       'fiyatlar', public.joker_fiyatlari(),
       'coin', (select coalesce(pr.coin, 0) from public.profiles pr where pr.id = v_me)),
    'sureler', jsonb_build_object(
       'kart', public.ayar_sayi('duello4_kart_sn', 7),
       'kart_duyuru_ms', public.ayar_sayi('duello4_kart_duyuru_ms', 900),
       'cevap', public.ayar_sayi('duello4_cevap_sn', 15),
       'sonuc', public.ayar_sayi('duello4_sonuc_sn', 3),
       'ek_sure', public.ayar_sayi('duello_ek_sure_sn', 5),
       'zaman_baskisi_eksi', public.ayar_sayi('duello2_zaman_baskisi_eksi_sn', 5),
       'nabiz', public.duello_nabiz_sn(),
       'kopuk', public.ayar_sayi('duello_kopuk_sn', 25),
       'gosterim_payi_ms', public.ayar_sayi('duello_gosterim_payi_ms', 1200),
       'acilis_ms', case when d.faz = 'cevap' then coalesce(d.v4_acilis_ms, 0) else 0 end,   -- 1092
       'kart_payi_ms', case when d.faz = 'kart' then coalesce(d.v4_kart_payi_ms, 0) else 0 end,   -- 1092
       'gosterim_bas', case
          when d.faz = 'kart' then coalesce(d.v4_duyuru_bitis, d.faz_bitis - make_interval(secs => public.ayar_sayi('duello4_kart_sn', 7)))
          when d.faz = 'cevap' then d.soru_baslangic + make_interval(secs => coalesce(d.v4_acilis_ms, 0) / 1000.0) + public.duello2_gosterim_payi()   -- 1092
          when d.faz in ('notr', 'son') then d.soru_baslangic + public.duello2_gosterim_payi() end),
    'kazanan', d.kazanan, 'terk_eden', d.terk_eden, 'odul', v_odul, 'ezeli', v_ezeli, 'gecmis', v_gecmis,
    'rovans', jsonb_build_object('isteyen', d.rovans_isteyen, 'id', d.rovans_id,
       'gecerli', d.rovans_at is not null and d.rovans_at > now() - make_interval(secs => public.ayar_sayi('duello_rovans_sn', 60))));
end $function$;

create or replace function public.duello_rehber_isaretle()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_u uuid;
begin
  if new.surum is distinct from 4 then return null; end if;
  foreach v_u in array array[
      case when old.ekran1 is null and new.ekran1 is not null then new.oyuncu1 end,
      case when old.ekran2 is null and new.ekran2 is not null then new.oyuncu2 end] loop
    continue when v_u is null;
    update public.profiles p set duello_rehber_mac = new.id
     where p.id = v_u and p.duello_rehber_mac is null and not coalesce(p.is_bot, false)
       and not exists (select 1 from public.duellolar x where x.durum = 'bitti' and v_u in (x.oyuncu1, x.oyuncu2));
  end loop;
  return null;
end $$;
revoke all on function public.duello_rehber_isaretle() from public, anon, authenticated;
drop trigger if exists trg_duello_rehber on public.duellolar;
create trigger trg_duello_rehber after update of ekran1, ekran2 on public.duellolar
  for each row execute function public.duello_rehber_isaretle();
