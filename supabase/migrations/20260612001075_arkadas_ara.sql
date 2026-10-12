-- 1075 — Arkadaşlar: takma adla oyuncu arama (Telefon denetimi 12 Eki 2026, Ida onaylı).
--
-- Eski "kullanıcı adıyla arama" gerçek adı (username) sızdırdığı için kaldırılmıştı. Bu arama YALNIZ
-- oyuncunun kendi seçtiği takma adda (takma_ad_secildi) yapılır; username hiç okunmaz ve dönmez.
-- Kurallar:
--   • en az 3 karakter (boşluklar kırpılır), en çok 30; ILIKE desenindeki % _ \ kaçırılır
--   • en fazla 20 sonuç; önce adı aramayla BAŞLAYANLAR, sonra kısa ad, sonra alfabetik
--   • görünmez: kendisi · iki yönlü engelliler (engellemeler) · bütün botlar (is_bot: gizli + açık)
--     · araç hesapları (arac_hesabi) · ligden gizlenen hesaplar (lig_gizli) · askıdakiler · takma ad seçmemişler
--   • hız sınırı: mevcut rpc_sayac deseni (hiz_siniri) — dakikada 20 arama
--   • dönen alanlar yalnız kartın çizimi için gerekenler + arkadaşlık durumu
--     (durum: 'arkadas' | 'giden' (benim isteğim bekliyor) | 'gelen' (onun isteği bekliyor) | null)

create or replace function public.arkadas_ara(p_metin text)
returns table (
  id uuid,
  gorunen_ad text,
  gorunen_avatar text,
  cerceve text,
  lig text,
  level integer,
  durum text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_metin text := btrim(coalesce(p_metin, ''));
  v_desen text;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  if char_length(v_metin) < 3 then return; end if;
  if char_length(v_metin) > 30 then v_metin := left(v_metin, 30); end if;

  perform public.hiz_siniri('arkadas_ara', 20, interval '60 seconds');

  -- ILIKE kaçışı (varsayılan kaçış karakteri ters bölü)
  v_desen := replace(replace(replace(v_metin, '\', '\\'), '%', '\%'), '_', '\_');

  return query
  select p.id,
         p.gorunen_ad,
         p.gorunen_avatar,
         p.takili_cerceve,
         p.lig,
         p.level,
         case
           when f.durum = 'arkadas' then 'arkadas'
           when f.durum = 'bekliyor' and f.requester = v_me then 'giden'
           when f.durum = 'bekliyor' then 'gelen'
           else null
         end::text
    from public.profiles p
    left join lateral (
      select fr.durum, fr.requester
        from public.friendships fr
       where (fr.requester = v_me and fr.addressee = p.id)
          or (fr.requester = p.id and fr.addressee = v_me)
       order by (fr.durum = 'arkadas') desc
       limit 1
    ) f on true
   where p.id <> v_me
     and p.takma_ad_secildi
     and p.takma_ad is not null
     and p.takma_ad ilike '%' || v_desen || '%'
     and not coalesce(p.is_bot, false)
     and not coalesce(p.arac_hesabi, false)
     and not coalesce(p.lig_gizli, false)
     and not coalesce(p.askida, false)
     and not exists (
       select 1 from public.engellemeler e
        where (e.engelleyen = v_me and e.engellenen = p.id)
           or (e.engelleyen = p.id and e.engellenen = v_me)
     )
   order by (p.takma_ad ilike v_desen || '%') desc, char_length(p.takma_ad), lower(p.takma_ad)
   limit 20;
end;
$$;

revoke all on function public.arkadas_ara(text) from public, anon;
grant execute on function public.arkadas_ara(text) to authenticated;

comment on function public.arkadas_ara(text) is
  '1075: Arkadaşlar sayfası takma ad araması. ≥3 karakter, ≤20 sonuç, engelli/bot/araç/lig_gizli/askıda görünmez, hiz_siniri 20/dk. username okunmaz.';
