-- Geri alma: 1117 (sesli sohbet kaldırıldı) → 206 sürümü (canlıdan 16 Eki 2026'da okunan gövde).
-- Yetkiler create or replace ile değişmez (yalnız authenticated). İstemci bileşeni ayrıca git geçmişinden geri getirilmeli.

CREATE OR REPLACE FUNCTION public.sesli_sohbet_izni(p_match_id uuid)
 RETURNS TABLE(izinli boolean, neden text, rakip_id uuid, kapanis_sn integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  m public.matches%rowtype;
  v_rakip uuid;
  v_acik_bot boolean;
  v_pencere int := public.ayar_sayi('mac_sonu_sesli_sn', 30)::int;
  v_kalan int;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;

  select * into m from public.matches where id = p_match_id;
  if not found then
    return query select false, 'Maç bulunamadı', null::uuid, null::int; return;
  end if;
  if v_me not in (m.oyuncu1, m.oyuncu2) then
    return query select false, 'Bu maçta değilsin', null::uuid, null::int; return;
  end if;

  if m.durum = 'bitti' then
    v_kalan := v_pencere - floor(extract(epoch from (now() - coalesce(m.bitis, now()))))::int;
    if v_kalan <= 0 then
      return query select false, 'Maç bitti', null::uuid, 0; return;
    end if;
  elsif m.durum <> 'aktif' then
    return query select false, 'Maç aktif değil', null::uuid, null::int; return;
  end if;

  v_rakip := case when m.oyuncu1 = v_me then m.oyuncu2 else m.oyuncu1 end;

  -- Yalnız AÇIK bot "bot" diye söylenir. Gizli bot aşağıdaki arkadaşlık
  -- kontrolüne gerçek oyuncu gibi düşer (gizli botlar arkadaş olmaz).
  select public.acik_bot_mu(is_bot, bot_turu) into v_acik_bot from public.profiles where id = v_rakip;
  if coalesce(v_acik_bot, false) then
    return query select false, 'Rakibin bir bot', v_rakip, null::int; return;
  end if;

  if not exists (
    select 1 from public.friendships f
    where f.durum = 'arkadas'
      and ((f.requester = v_me and f.addressee = v_rakip)
        or (f.requester = v_rakip and f.addressee = v_me))
  ) then
    return query select false, 'Sesli sohbet yalnız arkadaşlarınla açılabilir', v_rakip, null::int; return;
  end if;

  return query select true, null::text, v_rakip, v_kalan;
end;
$function$;
