-- ============================================================
-- Ajan H (23 Eyl 2026) — /ses-secim seçimleri oyuna bağlanıyor.
--
-- 380'de seçimleri yalnız sahip okuyabiliyordu. Oyunun her oyuncusu (girişsiz
-- giriş ekranı dahil) seçimleri okuyabilmeli: herkese açık, SALT OKUNUR tek RPC.
-- Yazma yine yalnız sahip (ses_secimi_kaydet değişmedi).
--
-- Sürüm: seçim her değiştiğinde oyun_ayarlari.ses_secim_surumu bir artar
-- (tetikleyici). İstemci açılışta elindeki sürümü yollar; aynıysa liste
-- gönderilmez (tek ucuz çağrı, Disk IO kuralı).
--
-- Müzik ayarları (test değeri): muzik_varsayilan_seviye (0–1),
-- muzik_kisik_oran (soru ekrandayken seviye × bu oran).
-- ============================================================

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('ses_secim_surumu', '1'::jsonb, 'ses_secimleri her değiştiğinde artar (tetikleyici). İstemci önbelleği bununla doğrulanır.'),
  ('muzik_varsayilan_seviye', '0.35'::jsonb, 'Oyun müziğinin ses seviyesi (0–1). Efektlerin altında, kısık.'),
  ('muzik_kisik_oran', '0.3'::jsonb, 'Soru ekrandayken müzik seviyesi × bu oran (cevapta geri açılır).')
on conflict (anahtar) do nothing;

/** ses_secimleri değişince sürümü artırır (deyim başına bir kez). */
create or replace function public.ses_secim_surumu_artir()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.oyun_ayarlari
     set deger = to_jsonb(coalesce((deger #>> '{}')::int, 0) + 1)
   where anahtar = 'ses_secim_surumu';
  return null;
end;
$$;

revoke execute on function public.ses_secim_surumu_artir() from public, anon, authenticated;

drop trigger if exists ses_secimleri_surum on public.ses_secimleri;
create trigger ses_secimleri_surum
  after insert or update or delete on public.ses_secimleri
  for each statement execute function public.ses_secim_surumu_artir();

/**
 * Oyunun okuduğu seçimler. Herkese açık, salt okunur.
 * p_surum istemcinin önbellekteki sürümü; eşitse `secimler` alanı gönderilmez.
 * Döner: {surum, muzik_seviye, muzik_kisik_oran, secimler?: {an: aday}}
 */
create or replace function public.ses_secimleri_oyun(p_surum int default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_surum int;
  v_sonuc jsonb;
begin
  select coalesce((deger #>> '{}')::int, 0) into v_surum
    from public.oyun_ayarlari where anahtar = 'ses_secim_surumu';
  v_surum := coalesce(v_surum, 0);

  v_sonuc := jsonb_build_object(
    'surum', v_surum,
    'muzik_seviye', coalesce((select (deger #>> '{}')::numeric from public.oyun_ayarlari where anahtar = 'muzik_varsayilan_seviye'), 0.35),
    'muzik_kisik_oran', coalesce((select (deger #>> '{}')::numeric from public.oyun_ayarlari where anahtar = 'muzik_kisik_oran'), 0.3));

  if p_surum is distinct from v_surum then
    v_sonuc := v_sonuc || jsonb_build_object('secimler',
      coalesce((select jsonb_object_agg(s.an, s.aday) from public.ses_secimleri s), '{}'::jsonb));
  end if;
  return v_sonuc;
end;
$$;

-- Girişsiz ekran (giriş sayfası) da seçimleri okuyabilsin: ses listesi gizli veri değil.
revoke execute on function public.ses_secimleri_oyun(int) from public;
grant execute on function public.ses_secimleri_oyun(int) to anon, authenticated;
