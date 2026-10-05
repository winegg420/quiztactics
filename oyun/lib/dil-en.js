// İNGİLİZCE SÖZLÜK PAKETİ — yalnız dil İngilizceyken iner (dil.js › sozlukYukle, dinamik import).
// Türkçe oyuncu bu parçayı hiç indirmez. Sıra önemlidir: sonraki ek öncekini ezer (eski Object.assign sırası aynen).
import temel from "./ceviri/temel.js";
import enMac from "./ceviri/mac.js";
import enAna from "./ceviri/ana.js";
import enLig from "./ceviri/lig.js";
import enDukkan from "./ceviri/dukkan.js";
import enGiris from "./ceviri/giris.js";
import enTasarim from "./ceviri/tasarim.js";
import enKozmetik from "./ceviri/kozmetik.js";
import enAntrenman from "./ceviri/antrenman.js";
import enDenetim5 from "./ceviri/denetim5.js";
import enDenetim6 from "./ceviri/denetim6.js";
import enMacSonuOnizleme from "./ceviri/mac-sonu-onizleme.js";
import enArama from "./ceviri/arama.js";
import enPremium from "./ceviri/premium.js";
import enCikisOnay from "./ceviri/cikis-onay.js";
import enGuvenlik from "./ceviri/guvenlik.js";
import enKoleksiyon from "./ceviri/koleksiyon.js";
import enSunucu from "./ceviri/sunucu.js";
import enTarama from "./ceviri/tarama.js";
import enHakimiyet from "./ceviri/hakimiyet.js";
import enHakimiyetEkran from "./ceviri/hakimiyet-ekran.js";
import enHakimiyetJoker from "./ceviri/hakimiyet-joker.js";
import enSezonYolu from "./ceviri/sezon-yolu.js";
import enSezonYoluParca from "./ceviri/sezon-yolu-parca.js";
import enGorevler from "./ceviri/gorevler.js";
import enAvatarSatis from "./ceviri/avatar-satis.js";
import enKategoriMaci from "./ceviri/kategori-maci.js";
import enKasa from "./ceviri/kasa.js";   // KASA (deneysel, 950)
import enDuelloSecim from "./ceviri/duello-secim.js";   // Düello 960: sırayla kategori seçimi

export default Object.assign({}, temel, enMac, enAna, enLig, enDukkan, enGiris, enTasarim, enKozmetik, enAntrenman, enMacSonuOnizleme, enArama, enPremium, enCikisOnay, enGuvenlik, enKoleksiyon, enSunucu, enTarama, enDenetim5, enDenetim6, enHakimiyet, enHakimiyetEkran, enHakimiyetJoker, enSezonYolu, enSezonYoluParca, enGorevler, enAvatarSatis, enKategoriMaci, enKasa, enDuelloSecim);
