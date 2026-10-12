-- 1070 — LİG ÇERÇEVESİ LİGE GÖRE OTOMATİK (Ida, 12 Eki 2026)
--
-- Kök sebep: profiles.takili_cerceve bir lig_* çerçevesi olduğunda lig değişince güncellenmiyordu
-- (idagg: lig = altin, takili_cerceve = lig_gumus) → oyuncu_kartlari takılı çerçeveyi olduğu gibi döndürüyordu.
--
-- Karar: takılı çerçeve bir lig_* çerçevesiyse daima oyuncunun ŞU ANKİ liginin çerçevesidir.
--   * profiles üzerinde BEFORE INSERT/UPDATE OF lig, takili_cerceve tetikleyicisi takılı lig çerçevesini
--     'lig_' || lig'e eşitler (gorunum.lig_cerceve de aynı). Lig değişimi hangi fonksiyondan gelirse gelsin
--     (lig kapanışı, düşme, yönetim) tek yerde çözülür; okuyan hiçbir fonksiyon (oyuncu_kartlari, cercevelerim,
--     cerceve_katalogu, davet_durumum) değişmez.
--   * cerceve_tak / lig_cerceve_sec: şu anki lig dışındaki lig çerçevesini takma isteği reddedilir.
--   * Lig dışı (dükkân/rozet/etkinlik) çerçeveye dokunulmaz.
-- YETKİ: hiçbir RLS/GRANT değişmez (CREATE OR REPLACE mevcut yetkileri korur).

create or replace function public.trg_lig_cercevesi_esitle()
 returns trigger
 language plpgsql
 set search_path to 'public'
as $function$
begin
  if new.takili_cerceve like 'lig\_%' then
    new.takili_cerceve := 'lig_' || coalesce(new.lig, 'bronz');
    new.gorunum := coalesce(new.gorunum, '{}'::jsonb) || jsonb_build_object('lig_cerceve', coalesce(new.lig, 'bronz'));
  end if;
  return new;
end $function$;
revoke all on function public.trg_lig_cercevesi_esitle() from public, anon, authenticated;

drop trigger if exists trg_profiles_lig_cercevesi on public.profiles;
create trigger trg_profiles_lig_cercevesi
  before insert or update of lig, takili_cerceve on public.profiles
  for each row execute function public.trg_lig_cercevesi_esitle();

-- ---------- cerceve_tak: alt/üst lig çerçevesi reddedilir ----------
CREATE OR REPLACE FUNCTION public.cerceve_tak(p_anahtar text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v_lig text;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('cerceve_tak', 20, interval '60 seconds');
  p_anahtar := nullif(btrim(coalesce(p_anahtar, '')), '');
  if p_anahtar is not null and not exists (
       select 1 from public.oyuncu_cerceveleri o
         join public.cerceveler c on c.anahtar = o.cerceve and c.aktif
        where o.user_id = v_me and o.cerceve = p_anahtar) then
    raise exception 'Bu çerçeve sende yok';
  end if;
  -- 1070: lig çerçevesi yalnız şu anki ligin çerçevesi olabilir
  if p_anahtar like 'lig\_%' and p_anahtar <> (select 'lig_' || coalesce(p.lig, 'bronz') from public.profiles p where p.id = v_me) then
    raise exception 'Yalnız bulunduğun ligin çerçevesini takabilirsin';
  end if;
  v_lig := case when p_anahtar like 'lig\_%' then substr(p_anahtar, 5) else null end;
  update public.profiles
     set takili_cerceve = p_anahtar,
         gorunum = coalesce(gorunum, '{}'::jsonb) || jsonb_build_object('lig_cerceve', v_lig, 'lig_cerceve_elle', true)
   where id = v_me;
  return jsonb_build_object('takili', p_anahtar);
end;
$function$;

-- ---------- lig_cerceve_sec (eski yol): aynı kural ----------
CREATE OR REPLACE FUNCTION public.lig_cerceve_sec(p_lig text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('lig_cerceve_sec', 20, interval '60 seconds');
  if p_lig is not null and not exists (select 1 from public.lig_cerceveleri c where c.user_id = v_me and c.lig = p_lig) then
    raise exception 'Bu çerçeveyi henüz kazanmadın';
  end if;
  -- 1070: lig çerçevesi yalnız şu anki ligin çerçevesi olabilir
  if p_lig is not null and p_lig <> (select coalesce(p.lig, 'bronz') from public.profiles p where p.id = v_me) then
    raise exception 'Yalnız bulunduğun ligin çerçevesini takabilirsin';
  end if;
  update public.profiles
     set gorunum = coalesce(gorunum, '{}'::jsonb) || jsonb_build_object('lig_cerceve', p_lig, 'lig_cerceve_elle', true),
         takili_cerceve = case when p_lig is null then null else 'lig_' || p_lig end
   where id = v_me;
  return p_lig;
end;
$function$;

-- ---------- Mevcut veriyi eşitle (yalnız ligiyle uyuşmayan lig çerçevesi takılı satırlar) ----------
update public.profiles
   set takili_cerceve = takili_cerceve   -- tetikleyici 'lig_' || lig'e eşitler
 where takili_cerceve like 'lig\_%'
   and takili_cerceve <> 'lig_' || coalesce(lig, 'bronz');
