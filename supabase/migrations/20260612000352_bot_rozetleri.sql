-- 352 · Botlara rozet (Ida kararı, 23 Eyl 2026): botlar gerçekçi görünsün.
-- Rozet motoru (333) botları bilerek atlar; bot rozetleri burada, DETERMİNİSTİK üretilir:
-- tohum = bot kimliği (bot_rasgele), her açılışta aynı. Başkası yalnız vitrini görür
-- (oyuncu_kartlari) — gizli bot, gerçek oyuncudan ayırt edilemez.
--   · Level rozetleri: bot level'i ≥ eşik olanlar (elmas kademe hariç).
--   · Klasik / Düello galibiyet ve seri: level × çarpan × (0,5–1,5 tohumlu) tahmini değer,
--     eşiği geçen rozetler; elmas kademe hariç.
--   · Turnuva: en çok `bot_rozet_turnuva_max` (2) — katılım / ilk 10 / ilk 3 (şampiyonluk yok).
--   · VERİLMEZ: etkinlik, gizli, elmas kademe, lig, özel, sosyal, ustalık (gerçek oyuncunun prestiji
--     ya da botta anlamsız).
--   · Vitrin: farklı gruplardan en yüksek kademeli 3 rozet (eşitlikte tohumlu sıra).
--   · Coin 0, geriye_donuk + goruldu (bildirim yok).
--   · Level değişince (trg_bot_level seviye puanından türetir) yeniden üretilir.
--   · Botlar etkinlik çerçevesi takmaz (veri kuralı; bugün etkinlik çerçevesi yok).
-- Rakamlar oyun_ayarlari'nda, test değeri.

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('bot_rozet_klasik_carpan', '3', 'Bot rozeti: tahmini Klasik galibiyet = level × bu × (0,5–1,5)'),
  ('bot_rozet_duello_carpan', '1.5', 'Bot rozeti: tahmini Düello galibiyet = level × bu × (0,5–1,5)'),
  ('bot_rozet_seri_carpan', '0.6', 'Bot rozeti: tahmini en uzun seri (gün) = level × bu × (0,5–1,5)'),
  ('bot_rozet_turnuva_max', '2', 'Bot rozeti: en çok kaç turnuva rozeti')
on conflict (anahtar) do nothing;

create or replace function public.bot_rozetleri_uret(p_bot uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_level int;
  v_tohum text := p_bot::text;
  v_klasik numeric;
  v_duello numeric;
  v_seri numeric;
  v_tmax int := public.ayar_sayi('bot_rozet_turnuva_max', 2)::int;
  v_rozetler text[] := '{}';
  v_turnuva text[] := '{}';
  v_vitrin text[];
  v_n int;
begin
  select coalesce(level, 1) into v_level from public.profiles where id = p_bot and coalesce(is_bot, false);
  if not found then return 0; end if;

  v_klasik := v_level * public.ayar_ondalik('bot_rozet_klasik_carpan', 3) * (0.5 + public.bot_rasgele('brz:k:' || v_tohum));
  v_duello := v_level * public.ayar_ondalik('bot_rozet_duello_carpan', 1.5) * (0.5 + public.bot_rasgele('brz:d:' || v_tohum));
  v_seri   := v_level * public.ayar_ondalik('bot_rozet_seri_carpan', 0.6) * (0.5 + public.bot_rasgele('brz:s:' || v_tohum));

  select coalesce(array_agg(t.anahtar), '{}') into v_rozetler
    from public.rozet_tanimlari t
   where t.aktif and not t.gizli and t.kademe <> 'elmas'
     and ((t.grup = 'level'  and t.esik <= v_level)
       or (t.grup = 'klasik' and t.esik <= v_klasik)
       or (t.grup = 'duello' and t.esik <= v_duello)
       or (t.grup = 'seri'   and t.esik <= v_seri));

  -- Turnuva: level arttıkça olası, en çok v_tmax tane; şampiyonluk verilmez.
  if v_level >= 5 and public.bot_rasgele('brz:t1:' || v_tohum) < least(0.9, 0.3 + v_level / 100.0) then
    v_turnuva := v_turnuva || 'turnuva_katilim'::text;
  end if;
  if v_level >= 25 and public.bot_rasgele('brz:t2:' || v_tohum) < least(0.6, v_level / 150.0) then
    v_turnuva := v_turnuva || 'turnuva_ilk10'::text;
  end if;
  if v_level >= 50 and public.bot_rasgele('brz:t3:' || v_tohum) < least(0.3, v_level / 400.0) then
    v_turnuva := v_turnuva || 'turnuva_ilk3'::text;
  end if;
  -- Sınırı aşarsa en yüksekler kalır.
  if cardinality(v_turnuva) > v_tmax then
    v_turnuva := v_turnuva[cardinality(v_turnuva) - v_tmax + 1 : cardinality(v_turnuva)];
  end if;
  select coalesce(array_agg(x), '{}') into v_turnuva
    from unnest(v_turnuva) x join public.rozet_tanimlari t on t.anahtar = x and t.aktif;
  v_rozetler := v_rozetler || v_turnuva;

  delete from public.oyuncu_rozetleri r where r.user_id = p_bot and not (r.rozet = any(v_rozetler));
  insert into public.oyuncu_rozetleri (user_id, rozet, kazanildi_at, coin, geriye_donuk, goruldu)
  select p_bot, x,
         -- Sabit, geçmişte bir tarih (tohumlu; her üretimde aynı).
         date_trunc('day', coalesce((select created_at from public.profiles where id = p_bot), now()))
           - make_interval(days => (1 + floor(300 * public.bot_rasgele('brz:z:' || x || ':' || v_tohum)))::int),
         0, true, true
    from unnest(v_rozetler) x
  on conflict (user_id, rozet) do nothing;
  get diagnostics v_n = row_count;

  -- Vitrin: her gruptan en yüksek kademeli rozet, sonra kademe + tohumlu sıra; ilk 3.
  select array_agg(z.anahtar order by z.sira) into v_vitrin from (
    select y.anahtar, row_number() over (order by y.kr desc, public.bot_rasgele('brz:v:' || y.anahtar || ':' || v_tohum)) sira
      from (select distinct on (t.grup) t.anahtar,
                   array_position(array['bronz','gumus','altin','elmas'], t.kademe) kr
              from public.rozet_tanimlari t
             where t.anahtar = any(v_rozetler)
             order by t.grup, array_position(array['bronz','gumus','altin','elmas'], t.kademe) desc, t.esik desc nulls last) y
  ) z where z.sira <= 3;

  update public.profiles set vitrin_rozetleri = coalesce(v_vitrin, '{}')
   where id = p_bot and vitrin_rozetleri is distinct from coalesce(v_vitrin, '{}');
  return v_n;
end $$;
revoke all on function public.bot_rozetleri_uret(uuid) from public, anon, authenticated;

-- Level değişince (ya da yeni bot) yeniden üret.
create or replace function public.trg_bot_rozetleri()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.bot_rozetleri_uret(new.id);
  return null;
exception when others then
  raise warning 'trg_bot_rozetleri %: %', new.id, sqlerrm;   -- bot kaydını asla düşürmesin
  return null;
end $$;
revoke all on function public.trg_bot_rozetleri() from public, anon, authenticated;

-- Not: bot level'i BEFORE tetikleyicisinde (trg_bot_level) seviye puanından türetilir; "UPDATE OF level"
-- yalnız SET listesine bakar, bu yüzden kolon listesiz + WHEN ile level farkı yakalanır.
drop trigger if exists trg_profiles_bot_rozet_ekle on public.profiles;
create trigger trg_profiles_bot_rozet_ekle
  after insert on public.profiles
  for each row when (coalesce(new.is_bot, false))
  execute function public.trg_bot_rozetleri();
drop trigger if exists trg_profiles_bot_rozet on public.profiles;
create trigger trg_profiles_bot_rozet
  after update on public.profiles
  for each row when (coalesce(new.is_bot, false)
                     and (new.level is distinct from old.level or new.is_bot is distinct from old.is_bot))
  execute function public.trg_bot_rozetleri();

-- Botlar etkinlik çerçevesi takmaz (veri kuralı).
create or replace function public.trg_bot_cerceve_kurali()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.takili_cerceve is not null
     and exists (select 1 from public.cerceveler c where c.anahtar = new.takili_cerceve and c.kaynak = 'etkinlik') then
    new.takili_cerceve := null;
  end if;
  return new;
end $$;
revoke all on function public.trg_bot_cerceve_kurali() from public, anon, authenticated;

drop trigger if exists trg_profiles_bot_cerceve on public.profiles;
create trigger trg_profiles_bot_cerceve
  before insert or update of takili_cerceve, is_bot on public.profiles
  for each row when (coalesce(new.is_bot, false))
  execute function public.trg_bot_cerceve_kurali();

-- Mevcut bütün botlar.
select public.bot_rozetleri_uret(p.id) from public.profiles p where coalesce(p.is_bot, false);
