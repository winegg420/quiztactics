-- Paket 2 · Şerit B — Dükkân için tek okuma: skill_dukkani() + envanterim() düzeltmesi
--
-- envanterim() yalnız elli/sure/soru_degistir/seri_koruma döndürüyordu: Zaman Baskısı,
-- Sigorta, 2X ve İkinci Şans hakları dükkânda ve maç çubuğunda 0 görünüyor, çubuk
-- envanterde hak varken bile "satın al" penceresini açıyordu. Artık katalogdaki bütün
-- aktif skill'ler + seri_koruma döner (sıra: katalog).
--
-- skill_dukkani(): dükkânın skill sekmesi için bütün satırlar TEK çağrıda —
-- tek hak fiyatı, 10'lu paket (urun_id + fiyat), envanter adedi, kilit durumu
-- (kilit_fiyati, gereken_level, acik) ve oyuncunun level'i. Rakamlar oyun_ayarlari /
-- skill_katalogu'ndan; istemci hiçbir fiyatı kendisi bilmez.

create or replace function public.envanterim()
returns table(tur text, adet integer)
language sql stable security definer set search_path to 'public'
as $$
  select t.tur, coalesce(e.adet, 0)
  from (
    select k.tur, k.sira from public.skill_katalogu k where k.aktif
    union all
    select 'seri_koruma', 1000
  ) t
  left join public.joker_envanter e on e.tur = t.tur and e.user_id = auth.uid()
  order by t.sira;
$$;

create or replace function public.skill_dukkani()
returns jsonb language sql stable security definer set search_path to 'public'
as $$
  select jsonb_build_object(
    'level', public.oyuncu_level(auth.uid()),
    'loadout_acik', public.skill_loadout_acik(),
    'yuva', public.ayar_sayi('skill_seti_slot', 3),
    'skiller', coalesce((
      select jsonb_agg(jsonb_build_object(
          'tur', k.tur,
          'kilit_fiyati', k.kilit_fiyati,
          'gereken_level', k.gereken_level,
          'acik', public.skill_kilidi_acik(auth.uid(), k.tur),
          'adet', coalesce((select e.adet from public.joker_envanter e
                             where e.user_id = auth.uid() and e.tur = k.tur), 0),
          'fiyat', public.joker_fiyati(k.tur),
          'paket', (select jsonb_build_object('urun_id', p.urun_id,
                                              'adet', (p.icerik ->> k.tur)::int,
                                              'fiyat', public.joker_paket_fiyati(p.urun_id))
                      from public.joker_paketleri p
                     where p.aktif and p.fiyat_anahtari is not null
                       and p.icerik ? k.tur
                       and (select count(*) from jsonb_object_keys(p.icerik)) = 1
                     order by p.sira limit 1))
        order by k.sira)
      from public.skill_katalogu k where k.aktif), '[]'::jsonb));
$$;
revoke all on function public.skill_dukkani() from public, anon;
grant execute on function public.skill_dukkani() to authenticated;
