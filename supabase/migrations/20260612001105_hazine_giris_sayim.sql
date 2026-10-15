-- 1105 · Ortak Hazine maç başı: 3-2-1 iki kez sayılmasın (15 Eki 2026, yavaş telefon ölçümü)
--
-- 1092 giriş kapısı ilk fazın bitişini "o an + mac_geri_sayim_sn (3) + mac_geri_sayim_payi_ms (2) + kasa_giris_sahne_ms (4)"
-- kuruyordu. Ama Hazine'nin 3-2-1'i giriş sahnesinin SON 3 saniyesidir (KasaGirisSahnesi) — 3 sn iki kez sayılıyordu; istemci
-- sahnenin bitişine ayrıca ilk sorunun gösterim payını (kasa_gosterim_payi_ms, 2) ekler. Sonuç: bota karşı bile "iki taraf
-- hazır" anından "3"e ~7,5 sn; bu sürede sahne erken açılıp animasyonları bitince "Hazır ol!"da donuk kalıyordu.
--
-- Yeni: faz_bitis = o an + max(mac_geri_sayim_sn, mac_geri_sayim_payi + kasa_giris_sahne − kasa_gosterim_payi). Sahnenin
-- başlangıcı (= faz_bitis + gösterim payı − sahne) böylece Klasik'teki gibi "o an + mac_geri_sayim_payi" olur: iki istemci de
-- başlangıcı öğrenecek kadar pay (2 sn, bu sürede istemci "Rakip bekleniyor…" çizer), sonra 1 sn düşüş + 3-2-1. Varsayılan
-- ayarlarla faz_bitis +9 → +4 sn ("3" +7,5 → +3 sn). Gövde 1092 ile aynı; yalnız süre ifadesi değişti. Yetkiler aynen.
-- Geri alma: 20260612001092_senkron_paketi.sql içindeki kasa_ilerlet tanımı.

create or replace function public.kasa_ilerlet(p_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  k public.kasa_maclari%rowtype;
begin
  select * into k from public.kasa_maclari where id = p_id for update;
  if not found or k.durum <> 'aktif' then return; end if;
  if k.faz = 'baslangic' and k.faz_bitis is null then
    -- Giriş beklemesi: iki giriş (bot hazır) ya da kasa_baglanma_sn → başlangıç fazı o an + pay + giriş sahnesi − ilk sorunun
    -- gösterim payı (1105; sahne 3-2-1'i içerir, en az mac_geri_sayim_sn).
    if ((k.ekran1 is not null or k.oyuncu1 = k.bot) and (k.ekran2 is not null or k.oyuncu2 = k.bot))
       or now() >= k.created_at + make_interval(secs => public.ayar_ondalik('kasa_baglanma_sn', 10)::double precision) then
      update public.kasa_maclari
         set faz_bitis = now() + make_interval(secs => greatest(
                                  public.ayar_sayi('mac_geri_sayim_sn', 3)::numeric,
                                  (greatest(0, public.ayar_sayi('mac_geri_sayim_payi_ms', 2000))
                                   + greatest(0, public.ayar_sayi('kasa_giris_sahne_ms', 3000))
                                   - greatest(0, public.ayar_sayi('kasa_gosterim_payi_ms', 1500))) / 1000.0)),
             son_hareket = now()
       where id = p_id;
      perform public.kasa_sinyal_ver(p_id);
    end if;
    return;   -- beklemede kopukluk kapısı / faz döngüsü çalışmaz
  end if;
  perform public.kasa_ilerlet_ic(p_id);
end $$;
revoke all on function public.kasa_ilerlet(uuid) from public, anon, authenticated;
