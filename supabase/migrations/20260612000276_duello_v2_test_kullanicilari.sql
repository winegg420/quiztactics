-- Düello 1.0 — yalnız TEST KULLANICILARINA açılış.
--
-- Veritabanı canlıyla ortak; canlı site (main) hâlâ eski Düello arayüzünde. Genel
-- bayrak duello_surum = 2 yapılırsa canlıdaki oyuncular v2 maçına düşer ve eski
-- arayüz bunu çizemez. Bu yüzden:
--   · duello_surum genel ayarı 1'de KALIR (herkese açılış main birleştirmesiyle aynı anda).
--   · oyun_ayarlari.duello_v2_test_kullanicilari (uuid dizisi): maç açılırken iki
--     oyuncudan biri listede ise maç sürüm 2 olur — ANCAK öteki de listede ya da bot
--     olmalı. Test hesabı kuyrukta canlı sitedeki gerçek bir oyuncuyla eşleşirse o
--     oyuncu eski arayüzde v2 maçına düşerdi; o eşleşme sürüm 1 kalır.
--   · İstemci kendi sürümünü duello_surum_benim() ile öğrenir (giriş metinleri, tanıtım).

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('duello_v2_test_kullanicilari',
   '["e4f6006f-d6bb-4ca8-be67-3bdf9efc9708",
     "5b555bd3-9371-4f35-90a5-39289111335e",
     "c88c8dee-7325-4a59-9b13-3d1e228b0430",
     "705864ef-4791-4002-9aca-8380c3cad3b9"]'::jsonb,
   'Düello 1.0 test hesapları (Ida + arayüz denetim hesapları). Maçtaki iki oyuncudan biri listede ise maç sürüm 2 açılır; duello_surum genel ayarı 1 kalır.')
on conflict (anahtar) do nothing;

create or replace function public.duello_v2_test_kullanicisi_mi(p_user uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select p_user is not null and exists (
    select 1 from public.oyun_ayarlari a,
           jsonb_array_elements_text(case when jsonb_typeof(a.deger) = 'array' then a.deger else '[]'::jsonb end) e
     where a.anahtar = 'duello_v2_test_kullanicilari' and e = p_user::text);
$function$;

create or replace function public.duello_bot_mu(p_user uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select coalesce((select p.is_bot from public.profiles p where p.id = p_user), false);
$function$;

-- Oyuncunun yeni açacağı düellonun sürümü (genel bayrak ya da test listesi).
create or replace function public.duello_surum_benim()
returns integer
language sql
stable security definer
set search_path to 'public'
as $function$
  select case when public.ayar_sayi('duello_surum', 1) = 2
                or public.duello_v2_test_kullanicisi_mi(auth.uid()) then 2 else 1 end;
$function$;

revoke all on function public.duello_v2_test_kullanicisi_mi(uuid) from public, anon, authenticated;
revoke all on function public.duello_bot_mu(uuid) from public, anon, authenticated;
revoke all on function public.duello_surum_benim() from public, anon;
grant execute on function public.duello_surum_benim() to authenticated;

-- 268'deki tanımın aynısı; yalnız sürüm kararı test listesine de bakar.
create or replace function public.duello_olustur(p_a uuid, p_b uuid, p_dereceli boolean, p_onceki uuid default null)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id uuid;
  v_can int := public.ayar_sayi('duello_can', 3)::int;
  v_surum smallint := case when public.ayar_sayi('duello_surum', 1) = 2
                             or (public.duello_v2_test_kullanicisi_mi(p_a)
                                 and (public.duello_v2_test_kullanicisi_mi(p_b) or public.duello_bot_mu(p_b)))
                             or (public.duello_v2_test_kullanicisi_mi(p_b)
                                 and (public.duello_v2_test_kullanicisi_mi(p_a) or public.duello_bot_mu(p_a)))
                        then 2 else 1 end;
  v_p1 jsonb;
  v_p2 jsonb;
  v_x uuid;
begin
  if v_surum = 2 and random() < 0.5 then
    v_x := p_a; p_a := p_b; p_b := v_x;
  end if;

  -- Profil ve en zayıf kategori MAÇ BAŞINDA sabitlenir.
  select public.oyuncu_kategori_profili_ic(p_a) into v_p1;
  select public.oyuncu_kategori_profili_ic(p_b) into v_p2;

  insert into public.duellolar (oyuncu1, oyuncu2, dereceli, can1, can2, saldiran, faz, faz_bitis,
                                profil1, profil2, zayif1, zayif2, onceki_id, surum)
  values (p_a, p_b, coalesce(p_dereceli, true), v_can, v_can, p_a, 'kategori',
          now() + make_interval(secs => case when v_surum = 2
                                             then public.ayar_sayi('duello2_kategori_sn', 8)
                                             else public.duello_kategori_suresi(p_a) end),   -- Paket 20 IV.3
          v_p1, v_p2, public.duello_en_zayif(p_a), public.duello_en_zayif(p_b), p_onceki, v_surum)
  returning id into v_id;

  insert into public.duello_sinyal (duello_id, oyuncu1, oyuncu2) values (v_id, p_a, p_b);
  delete from public.duello_kuyrugu where user_id in (p_a, p_b);
  return v_id;
end $function$;
