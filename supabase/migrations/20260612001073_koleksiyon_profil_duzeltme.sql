-- 1073 — Telefon denetimi (12 Eki 2026): Koleksiyon / Profil düzeltmeleri
--
-- 1) Level çerçevelerinin adı lig adlarıyla (Bronz / Gümüş / Altın) karışıyordu ("Level 25 Bronz" ≠ Bronz Lig).
--    Lig kelimesi içermeyen adlar. Anahtarlar (kod içi kimlik) değişmez.
-- 2) "İlk 10" / "Kürsü" rozetinin ilerlemesi "0/1" yazıyordu (ölçüt: ilk 10'da bitirilen turnuva SAYISI, eşik 1).
--    Anlamlı ilerleme için oyuncunun bitmiş turnuvalardaki EN İYİ sırası: turnuva_en_iyi_siram().
--    Sıra düzeni rozet_olcut / turnuva_odullerini_dagit ile aynı.
-- YETKİ: mevcut hiçbir RLS/GRANT değişmez; yalnız YENİ RPC'ye authenticated execute verilir.

update public.cerceveler set ad_tr = 'Level 25 Çerçevesi',  ad_en = 'Level 25 Frame'  where anahtar = 'level_25';
update public.cerceveler set ad_tr = 'Level 50 Çerçevesi',  ad_en = 'Level 50 Frame'  where anahtar = 'level_50';
update public.cerceveler set ad_tr = 'Level 75 Çerçevesi',  ad_en = 'Level 75 Frame'  where anahtar = 'level_75';
update public.cerceveler set ad_tr = 'Level 100 Kanatları', ad_en = 'Level 100 Wings' where anahtar = 'level_100';

create or replace function public.turnuva_en_iyi_siram()
 returns integer
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare
  v_me uuid := auth.uid();
  v int;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  select min(s.sira) into v from (
    select tp.user_id,
           row_number() over (partition by tp.tournament_id
                              order by tp.elendi asc, tp.elenme_sorusu desc nulls first,
                                       tp.dogru_sayisi desc, tp.user_id) as sira
      from public.tournament_players tp
      join public.tournaments t on t.id = tp.tournament_id and t.durum = 'bitti'
     where tp.terk_at is null
       and tp.tournament_id in (select x.tournament_id from public.tournament_players x where x.user_id = v_me)
  ) s
   where s.user_id = v_me;
  return v;   -- hiç bitmiş turnuvası yoksa null
end;
$function$;
revoke all on function public.turnuva_en_iyi_siram() from public, anon;
grant execute on function public.turnuva_en_iyi_siram() to authenticated;
