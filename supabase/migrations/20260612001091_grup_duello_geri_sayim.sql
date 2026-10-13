-- 1091 · Grup maçı ve Düello v4'te maç başında 3-2-1 (Klasik 651 ile aynı yöntem).
-- İlk sorunun/turun başlangıcı SUNUCUDA 3 sn + gösterim payı (mac_geri_sayim_payi_ms) ileri kurulur:
-- herkes sayımı aynı anda görür, sayım sırasında soru süresi yanmaz. Botların gecikmesi soru_baslangic'tan
-- sayıldığı için (1088 bot_bekletmez, duello4_bot_tik) ilk bot cevabı kendiliğinden sayım bittikten sonra gelir.

-- ------------------------------------------------------------------ Grup: başlatma anı
-- grup_mac_nabiz (1056) maçı "basladi = true, aktif_soru = 0, soru_baslangic = now()" ile başlatır.
-- Fonksiyonu kopyalamak yerine başlatma geçişi tetikleyiciyle ileri alınır (yalnız false → true anında, ilk soru).
create or replace function public.grup_mac_baslangic_sayim()
returns trigger language plpgsql set search_path to 'public' as $$
begin
  if new.basladi and not coalesce(old.basladi, false) and new.aktif_soru = 0 then
    new.soru_baslangic := now()
      + make_interval(secs => greatest(0, public.ayar_sayi('mac_geri_sayim_sn', 3)))
      + make_interval(secs => greatest(0, public.ayar_sayi('mac_geri_sayim_payi_ms', 2000)) / 1000.0);
  end if;
  return new;
end $$;
revoke all on function public.grup_mac_baslangic_sayim() from public, anon, authenticated;

drop trigger if exists grup_mac_baslangic_sayim on public.group_matches;
create trigger grup_mac_baslangic_sayim
  before update of basladi on public.group_matches
  for each row execute function public.grup_mac_baslangic_sayim();

-- ------------------------------------------------------------------ Grup: sayım bitmeden cevap yok
-- Sonraki sorular gösterim payı kadar ileri kurulur ve pay içinde cevaplanabilir (326); bu koruma onu değiştirmez.
create or replace function public.grup_cevap_baslangic_kontrol()
returns trigger language plpgsql set search_path to 'public' as $$
declare
  v_bas timestamptz;
  v_basladi boolean;
begin
  select soru_baslangic, basladi into v_bas, v_basladi from public.group_matches where id = new.group_match_id;
  if not coalesce(v_basladi, true) or (v_bas is not null and now() < v_bas - public.soru_gosterim_payi()) then
    raise exception 'Maç başlamak üzere';
  end if;
  return new;
end $$;
revoke all on function public.grup_cevap_baslangic_kontrol() from public, anon, authenticated;

drop trigger if exists grup_cevap_baslangic_kontrol on public.group_match_answers;
create trigger grup_cevap_baslangic_kontrol
  before insert on public.group_match_answers
  for each row execute function public.grup_cevap_baslangic_kontrol();

-- ------------------------------------------------------------------ Düello v4: giriş + gösterim payı
-- 1014'teki tanımın aynısı; yalnız giriş süresine mac_geri_sayim_payi_ms eklendi (geç açan da 3-2-1'i baştan görür).
create or replace function public.duello4_baslat(p_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  update public.duellolar
     set surum = 4, hakimiyet = false, secim_modu = false, puan_modu = false, ban_acik = false,
         faz = 'notr', saldiran = oyuncu1, ilk_secen = null, tur = 0, max_tur = null,
         v4_kontrol = null, v4_seri = 0, v4_tur = 0, v4_notr_seri = 0, v4_kullanilan = '{}',
         v4_max_tur = greatest(1, public.ayar_sayi('duello4_max_tur', 15))::smallint,
         v4_seri_hedef = greatest(1, public.ayar_sayi('duello4_seri_hedef', 3))::smallint,
         v4_notr_max = greatest(1, public.ayar_sayi('duello4_notr_max', 5))::smallint,
         v4_kart_sayisi = greatest(2, public.ayar_sayi('duello4_kart_sayisi', 4))::smallint
   where id = p_id;
  perform public.duello4_ortak_soru_ac(p_id, false,
    make_interval(secs => public.ayar_sayi('duello4_giris_sn', 3))
    + make_interval(secs => greatest(0, public.ayar_sayi('mac_geri_sayim_payi_ms', 2000)) / 1000.0));   -- 1091
end $$;
revoke all on function public.duello4_baslat(uuid) from public, anon, authenticated;
