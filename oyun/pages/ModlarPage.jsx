// ============================================================
// OYUN MODLARI (/modlar) — Arayüz Yenileme, 20 Eylül 2026
//
// Prototipteki `modes.html` sayfasının karşılığı. YENİ MOD EKLEMEZ:
// buradaki her kart var olan bir rotaya ya da var olan bir akışa bağlıdır.
// Prototipteki joker sayıları ve açıklamalar atıldı; sayılar
// oyun/lib/jokerler.js'ten HESAPLANIR.
//
// Dondurulmuş modlar (Hızlı Mod, "Hızlı Olan Kazanır") burada YOKTUR.
// ============================================================
import { useAyar } from "../lib/ayarlar.js";
import { useDuelloKurallari } from "../lib/duelloKurallari.js";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import RakipAra from "../components/RakipAra.jsx";
import DereceliAnahtari from "../components/DereceliAnahtari.jsx";
import KategoriSecici from "../components/KategoriSecici.jsx";
import { useDereceliTercih } from "../lib/dereceli.js";
import { useKategoriTercih } from "../lib/kategoriTercih.js";
import { KLASIK_JOKERLER, DUELLO_JOKERLER } from "../lib/jokerler.js";
import { y } from "../lib/yol.js";
import { tt } from "../lib/dil.js";
import { useDil } from "../lib/dilKanca.js";
import { QtModKart, QtListe, QtListeSatiri, QtAfis, dokunus, siraStili, useSiraliGiris } from "../tasarim/index.js";
import "../tasarim/ekranlar/a-modlar.css";

// Gerçek joker sayıları — prototipteki "6 JOKER / 5 JOKER" yazıları uydurmaydı.
const DUELLO_JOKER = DUELLO_JOKERLER.length;
const KLASIK_JOKER = KLASIK_JOKERLER.length;

export default function ModlarPage() {
  const { tur: turSayisi } = useDuelloKurallari();   // Düello tur sayısı metne gömülmez (960: seçim modunda 20, kapalıysa eski 16)
  // KASA (deneysel, 950): ayar satırı yoksa (migration uygulanmamış) ya da 0 ise kart kilitli + kapalı notu
  const kasaAcik = useAyar("kasa_modu_acik", 0) >= 1;
  const kasaHedef = useAyar("kasa_hedef_puan", 80);
  const navigate = useNavigate();
  const [dereceliTercih, setDereceliTercih] = useDereceliTercih();
  // 860: Klasik / Saf Bilgi maç kategorisi (null = Karışık) — ana sayfa OYNA penceresiyle AYNI tercih.
  const [kategoriTercih, setKategoriTercih] = useKategoriTercih();
  // Arama açıkken hangi tür: jokersiz = Saf Bilgi
  const [arama, setArama] = useState(null);   // null | { jokersiz: boolean }

  const macAra = (jokersiz) => setArama({ jokersiz });
  const { ceviri } = useDil();
  // Sıralı giriş yalnız ilk açılışta oynar (arama penceresi/tercih değişince yeniden oynamaz).
  const sirali = useSiraliGiris(true, 1200);
  // Mod kartı = seçim eylemi: dokunuş sesi + titreşim (yalnız dokunus()), sonra asıl iş.
  const sec = (is) => () => { dokunus(); is(); };

  return (
    <div className="a-modlar">
      {arama && (
        <RakipAra
          kategori={kategoriTercih}
          dereceli={dereceliTercih}
          jokersiz={arama.jokersiz}
          onBulundu={(macId) => { setArama(null); navigate(y(`/mac/${macId}`)); }}
          onIptal={() => setArama(null)}
        />
      )}

      <QtAfis ikon="oyna" baslik={tt("Tarzını seç, bilgini göster")} className="a-modlar-afis" />

      {/* Dereceli/serbest ayrımı tek anahtarla — ana sayfadakiyle AYNI tercih
          (localStorage + profiles.dereceli_tercih). */}
      <DereceliAnahtari className="a-dereceli--serit" dereceli={dereceliTercih} onDegistir={setDereceliTercih} />

      {/* 860: kategori seçilirse Klasik Maç / Saf Bilgi'nin bütün soruları o kategoriden gelir (Düello hariç). */}
      <KategoriSecici deger={kategoriTercih} onDegistir={setKategoriTercih} aciklama={tt("Klasik Maç ve Saf Bilgi için")} />

      {/* Canlı maç modları: sayılar oyun/lib/jokerler.js'ten hesaplanır */}
      <section className="a-modlar-izgara" aria-label={tt("Oyun modları")}>
        <QtModKart
          mod="klasik"
          className={sirali}
          style={siraStili(0)}
          ad={tt("Klasik Maç")}
          alt={tt("Skillerini kullan ve rakibini geç.")}
          rozet={tt("{n} joker türü", { n: KLASIK_JOKER })}
          onClick={sec(() => macAra(false))}
        />
        <QtModKart
          mod="duello"
          className={sirali}
          style={siraStili(1)}
          ad={ceviri("Düello")}
          alt={tt("Skillerini doğru anda kullan. Rakibinin planını boz ve taktik üstünlük kur.")}
          rozet={tt("{n} joker türü · {t} tur", { n: DUELLO_JOKER, t: turSayisi })}
          onClick={sec(() => navigate(y("/duello")))}
        />
        <QtModKart
          mod="saf"
          className={sirali}
          style={siraStili(2)}
          ad={ceviri("Saf Bilgi")}
          alt={tt("Kategori seç, yalnız bilgiyle yarış.")}
          rozet={tt("Skillsiz")}
          onClick={sec(() => macAra(true))}
        />
        <QtModKart
          mod="turnuva"
          className={sirali}
          style={siraStili(3)}
          ad={tt("Turnuva")}
          alt={tt("Elene elene sona kal ve büyük ödülü kazan.")}
          rozet={tt("Her gün")}
          onClick={sec(() => navigate(y("/turnuva")))}
        />
      </section>

      {/* Grup maçı ödülsüz arkadaş modudur (coin/lig/seri yok, rozet var) —
          kurulumu /meydan sayfasının içinde. */}
      <QtModKart
        mod="grup"
        genis
        className={sirali}
        style={siraStili(4)}
        ad={tt("Grup Maçı")}
        alt={tt("3–5 arkadaş · ödülsüz. Aynı sorularda eğlencesine yarış.")}
        rozet={tt("Kur")}
        onClick={sec(() => navigate(y("/meydan")))}
      />

      {/* KASA (deneysel, 950): kapalıyken mevcut kilitli kart kalıbı (kilitMetni) */}
      <QtModKart
        mod="kasa"
        genis
        className={sirali}
        style={siraStili(5)}
        ad={tt("Ortak Hazine")}
        alt={tt("Tek başına bil, hazineyi al; doğru anda aç. {h} puana ilk ulaşan kazanır.", { h: kasaHedef })}
        kilitli={!kasaAcik}
        kilitMetni={tt("Bu mod şu an kapalı.")}
        onClick={kasaAcik ? sec(() => navigate(y("/kasa"))) : undefined}
      />

      <section className="a-modlar-bolum" aria-labelledby="a-modlar-diger-b">
        <h2 id="a-modlar-diger-b" className="qt-baslik-2">{tt("Arkadaşların ve sen")}</h2>
        <QtListe etiket={tt("Arkadaşların ve sen")}>
          <QtListeSatiri
            ikon="kisiler"
            ikonTon="dogru"
            baslik={tt("Meydan Oku")}
            alt={tt("Bir arkadaşını seç ve bire bir kapış.")}
            onClick={() => navigate(y("/meydan"))}
            ok
          />
          <QtListeSatiri
            ikon="kitap"
            ikonTon="mor"
            baslik={tt("Hatalarım")}
            alt={tt("Yanlış yaptığın soruları tekrar et, açığını kapat.")}
            onClick={() => navigate(y("/calisma"))}
            ok
          />
        </QtListe>
      </section>
    </div>
  );
}
