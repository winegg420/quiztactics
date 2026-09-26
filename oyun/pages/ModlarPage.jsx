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
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../src/context/AuthContext.jsx";
import RakipAra from "../components/RakipAra.jsx";
import DereceliAnahtari from "../components/DereceliAnahtari.jsx";
import { useDereceliTercih } from "../lib/dereceli.js";
import { KLASIK_JOKERLER, DUELLO_JOKERLER } from "../lib/jokerler.js";
import { y } from "../lib/yol.js";
import { tt } from "../lib/dil.js";
import { useDil } from "../lib/dilKanca.js";
import { QtModKart, QtListe, QtListeSatiri } from "../tasarim/index.js";
import "../tasarim/ekranlar/a-modlar.css";

// Gerçek joker sayıları — prototipteki "6 JOKER / 5 JOKER" yazıları uydurmaydı.
const DUELLO_JOKER = DUELLO_JOKERLER.length;
const KLASIK_JOKER = KLASIK_JOKERLER.length;

export default function ModlarPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [dereceliTercih, setDereceliTercih] = useDereceliTercih();
  // Arama açıkken hangi tür: jokersiz = Saf Bilgi
  const [arama, setArama] = useState(null);   // null | { jokersiz: boolean }

  const macAra = (jokersiz) => setArama({ jokersiz });
  const { ceviri } = useDil();

  return (
    <div className="a-modlar">
      {arama && (
        <RakipAra
          kategori={profile?.tercih_kategori ?? null}
          dereceli={dereceliTercih}
          jokersiz={arama.jokersiz}
          onBulundu={(macId) => { setArama(null); navigate(y(`/mac/${macId}`)); }}
          onIptal={() => setArama(null)}
        />
      )}

      <header className="a-modlar-bas">
        <h1 className="qt-baslik-1">{tt("Tarzını seç, bilgini göster")}</h1>
        <p className="qt-govde qt-soluk-zemin">{tt("Taktik ya da saf bilgi. Her mücadelede başka bir yol var.")}</p>
      </header>

      {/* Dereceli/serbest ayrımı tek anahtarla — ana sayfadakiyle AYNI tercih
          (localStorage + profiles.dereceli_tercih). */}
      <DereceliAnahtari dereceli={dereceliTercih} onDegistir={setDereceliTercih} />

      {/* Canlı maç modları: sayılar oyun/lib/jokerler.js'ten hesaplanır */}
      <section className="a-modlar-izgara" aria-label={tt("Oyun modları")}>
        <QtModKart
          mod="klasik"
          ad={tt("Klasik Maç")}
          alt={tt("Hızlı cevap ver, skillerini kullan ve rakibini geç.")}
          rozet={tt("{n} joker türü", { n: KLASIK_JOKER })}
          onClick={() => macAra(false)}
        />
        <QtModKart
          mod="duello"
          ad={ceviri("Düello")}
          alt={tt("Skillerini doğru anda kullan. Rakibinin planını boz ve taktik üstünlük kur.")}
          rozet={tt("{n} joker türü · 3 can", { n: DUELLO_JOKER })}
          onClick={() => navigate(y("/duello"))}
        />
        <QtModKart
          mod="saf"
          ad={ceviri("Saf Bilgi")}
          alt={tt("Yardım yok. Sadece bilgi, dikkat ve hız.")}
          rozet={tt("Skillsiz")}
          onClick={() => macAra(true)}
        />
        <QtModKart
          mod="turnuva"
          ad={tt("Turnuva")}
          alt={tt("Elene elene sona kal ve büyük ödülü kazan.")}
          rozet={tt("Her gün")}
          onClick={() => navigate(y("/turnuva"))}
        />
      </section>

      {/* Grup maçı ödülsüz arkadaş modudur (coin/lig/seri yok, rozet var) —
          kurulumu /meydan sayfasının içinde. */}
      <QtModKart
        mod="grup"
        genis
        ad={tt("Grup Maçı")}
        alt={tt("3–5 arkadaş · ödülsüz. Aynı sorularda eğlencesine yarış.")}
        rozet={tt("Kur")}
        onClick={() => navigate(y("/meydan"))}
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
          <QtListeSatiri
            ikon="lig"
            ikonTon="bilgi"
            baslik={tt("Lig")}
            alt={tt("Maç kazan, yüksel ve hafta sonunda sıranı gör.")}
            onClick={() => navigate(y("/siralama"))}
            ok
          />
        </QtListe>
      </section>
    </div>
  );
}
