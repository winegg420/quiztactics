// ÜRETİLDİ — araclar/ses-duzelt.mjs (2026-10-17). ELLE DÜZENLEME; aracı yeniden çalıştır.
// SES BİTİŞ KURALI (oyun/lib/sesKurali.js): kaynakta kesik ya da rolünün en dar penceresine doğal hâliyle sığmayan dosyaların
// düzeltilmiş kopyaları (public/ses/, ad içerik sürümlü). Ida'nın /ses-secim seçimi değişmez; seçili aday burada eşlenir.

/** /ses-secim aday id'si → düzeltilmiş dosya (public/ses). */
export const DUZELTILMIS_ADAY = {
  "dogru-n1": "dogru-n1-f0351e252a.wav",
  "rozet-n1": "rozet-n1-df4f6419ca.wav",
  "skill-n1": "skill-n1-2daf0199ba.wav",
  "yanlis-n1": "yanlis-n1-1445b6e216.wav",
  "turnuva-n1": "turnuva-n1-169200f784.wav",
  "skill_2x-n1": "skill_2x-n1-b25207edc5.wav",
  "xp_dolma-n1": "xp_dolma-n1-df7e296a85.wav",
  "can_kaybi-n1": "can_kaybi-n1-121f0f06fb.wav",
  "galibiyet-n1": "galibiyet-n1-8d7e811f5e.wav",
  "beraberlik-n1": "beraberlik-n1-35b4891731.wav",
  "maglubiyet-n1": "maglubiyet-n1-a9eea9e11d.wav",
  "satin_alma-n1": "satin_alma-n1-9af1f9e622.wav",
  "skill_elli-n1": "skill_elli-n1-e2566e77d3.wav",
  "sure_doldu-n1": "sure_doldu-n1-1090625fa3.wav",
  "skill_sigorta-n1": "skill_sigorta-n1-f2dd99e77a.wav",
  "skill_ikinci_sans-n1": "skill_ikinci_sans-n1-16dd277b0a.wav",
  "skill_soru_degistir-n1": "skill_soru_degistir-n1-55a4a01657.wav",
  "skill_zaman_baskisi-n1": "skill_zaman_baskisi-n1-96bfcfb561.wav"
};
/** Varsayılan dosya (seçim yok / "mevcut") → düzeltilmiş dosya (public/ses). */
export const DUZELTILMIS_VARSAYILAN = {
  "kaybettin.wav": "kaybettin-e71304cf40.wav",
  "soru_geldi.wav": "soru_geldi-1008d41ce0.wav",
  "tur_gecis.wav": "tur_gecis-1781d6f888.wav",
  "sayim_son.wav": "sayim_son-90d6b6bfd2.wav",
  "skill_elli.wav": "skill_elli-e8a1ed13f6.wav",
  "skill_ek_sure.wav": "skill_ek_sure-2f972448d8.wav",
  "skill_soru_degistir.wav": "skill_soru_degistir-576e2a9435.wav",
  "skill_2x.wav": "skill_2x-84ca00c179.wav",
  "skill_ikinci_sans.wav": "skill_ikinci_sans-0752cea321.wav",
  "coin.wav": "coin-067c69fbfa.wav",
  "level.wav": "level-fd441b4bd8.wav",
  "turnuva.wav": "turnuva-3d80d74de6.wav",
  "dogru.mp3": "dogru-34ccd47c79.wav",
  "yanlis.mp3": "yanlis-45b86bf9b7.wav",
  "rakip_bulundu.mp3": "rakip_bulundu-007545f14f.wav",
  "rutbe.mp3": "rutbe-277eefc2d4.wav"
};
/** Aday id'si → an varyantları (ör. Hazine AÇ / DEVAM anının kısa rozeti). */
export const AN_VARYANT = {
  "rozet-n1": {
    "ac": "rozet-n1-ac-e529e8b1c9.wav",
    "devam": "rozet-n1-devam-8864fe3bed.wav"
  }
};
/** Üretimde kullanılan seçim (ses_secimleri_oyun, sürüm 501) — test bu seçimin her dosyasına bakar. */
export const SECIM_ANLIK = {"surum":501,"secimler":{"coin":"coin-n1","dogru":"dogru-n1","level":"level-n1","rozet":"rozet-n1","skill":"skill-n1","vs_ani":"vs_ani-n1","yanlis":"yanlis-n1","dokunus":"dokunus-n1","turnuva":"turnuva-n1","bildirim":"bildirim-n1","skill_2x":"skill_2x-n1","xp_dolma":"xp_dolma-n1","can_kaybi":"can_kaybi-n1","galibiyet":"galibiyet-n1","muzik_mac":"muzik_mac-5","tur_gecis":"tur_gecis-n1","beraberlik":"beraberlik-n1","hata_uyari":"hata_uyari-n1","lig_atlama":"lig_atlama-n1","maglubiyet":"maglubiyet-n1","muzik_menu":"muzik_menu-2","satin_alma":"satin_alma-n1","skill_elli":"skill_elli-n1","soru_geldi":"soru_geldi-n1","sure_doldu":"sure_doldu-n1","sayfa_gecis":"sessiz","son_3_saniye":"son_3_saniye-n1","muzik_turnuva":"muzik_turnuva-3","rakip_bulundu":"rakip_bulundu-n1","skill_ek_sure":"skill_ek_sure-n1","skill_sigorta":"skill_sigorta-n1","geri_sayim_tik":"geri_sayim_tik-n1","rakip_cevapladi":"rakip_cevapladi-n1","kategori_secildi":"kategori_secildi-n1","skill_ikinci_sans":"skill_ikinci_sans-n1","skill_soru_degistir":"skill_soru_degistir-n1","skill_zaman_baskisi":"skill_zaman_baskisi-n1"}};
