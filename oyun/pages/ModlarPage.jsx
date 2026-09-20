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
import Avatar from "../../src/components/Avatar.jsx";
import Ikon from "../components/Ikon.jsx";
import RakipAra from "../components/RakipAra.jsx";
import DereceliAnahtari from "../components/DereceliAnahtari.jsx";
import { useDereceliTercih } from "../lib/dereceli.js";
import { KLASIK_JOKERLER, MAC_ICI_JOKERLER, SALDIRI_JOKERLERI } from "../lib/jokerler.js";
import { y } from "../lib/yol.js";
import { tt } from "../lib/dil.js";

// Gerçek joker sayıları — prototipteki "6 JOKER / 5 JOKER" yazıları uydurmaydı.
const DUELLO_JOKER = MAC_ICI_JOKERLER.length + SALDIRI_JOKERLERI.length;
const KLASIK_JOKER = KLASIK_JOKERLER.length;

export default function ModlarPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [dereceliTercih, setDereceliTercih] = useDereceliTercih();
  // Arama açıkken hangi tür: jokersiz = Saf Bilgi
  const [arama, setArama] = useState(null);   // null | { jokersiz: boolean }

  const macAra = (jokersiz) => setArama({ jokersiz });

  return (
    <div className="bd-modlar">
      {arama && (
        <RakipAra
          kategori={profile?.tercih_kategori ?? null}
          dereceli={dereceliTercih}
          jokersiz={arama.jokersiz}
          onBulundu={(macId) => { setArama(null); navigate(y(`/mac/${macId}`)); }}
          onIptal={() => setArama(null)}
        />
      )}

      <section className="page-heading">
        <div>
          <span className="eyebrow">{tt("OYUN MODLARI")}</span>
          <h1>{tt("Tarzını seç, bilgini göster")}</h1>
          <p>{tt("Taktik ya da saf bilgi. Her mücadelede başka bir yol var.")}</p>
        </div>
      </section>

      {/* Dereceli/serbest ayrımı tek anahtarla — ana sayfadakiyle AYNI tercih
          (localStorage + profiles.dereceli_tercih). */}
      <DereceliAnahtari dereceli={dereceliTercih} onDegistir={setDereceliTercih} />

      <section className="featured-mode">
        <div>
          <span className="eyebrow light">{tt("ÖNE ÇIKAN MOD")}</span>
          <h2>{tt("Düello")}</h2>
          <p>{tt("Jokerlerini doğru anda kullan. Rakibinin planını boz ve taktik üstünlük kur.")}</p>
          <div className="feature-tags">
            <span>{tt("SIRA TABANLI")}</span>
            <span>{DUELLO_JOKER} {tt("JOKER")}</span>
            <span>{tt("3 CAN")}</span>
          </div>
          <button type="button" onClick={() => navigate(y("/duello"))}>
            <Ikon ad="kilic" boyut={18} /> {tt("DÜELLOYA GİR")} →
          </button>
        </div>
        <div className="duel-visual">
          <Avatar profile={profile} boyut={64} />
          <b>VS</b>
          <span className="bd-modlar-rakip" aria-hidden="true">?</span>
        </div>
      </section>

      <section className="catalog-grid">
        <button type="button" className="catalog-card orange" onClick={() => macAra(false)}>
          <span><Ikon ad="hizli" boyut={24} /></span>
          <div>
            <small>{tt("CANLI")} · {KLASIK_JOKER} {tt("JOKER")}</small>
            <h3>{tt("Klasik Maç")}</h3>
            <p>{tt("Hızlı cevap ver, jokerlerini kullan ve rakibini geç.")}</p>
          </div>
          <b>{tt("OYNA")} →</b>
        </button>

        <button type="button" className="catalog-card teal" onClick={() => macAra(true)}>
          <span><Ikon ad="soru" boyut={24} /></span>
          <div>
            <small>{tt("JOKERSİZ")}</small>
            <h3>{tt("Saf Bilgi")}</h3>
            <p>{tt("Yardım yok. Sadece bilgi, dikkat ve hız.")}</p>
          </div>
          <b>{tt("OYNA")} →</b>
        </button>

        <button type="button" className="catalog-card purple" onClick={() => navigate(y("/turnuva"))}>
          <span><Ikon ad="kupa" boyut={24} /></span>
          <div>
            <small>{tt("HER GÜN")}</small>
            <h3>{tt("Turnuva")}</h3>
            <p>{tt("Elene elene sona kal ve büyük ödülü kazan.")}</p>
          </div>
          <b>{tt("İNCELE")} →</b>
        </button>

        <button type="button" className="catalog-card blue" onClick={() => navigate(y("/meydan"))}>
          <span><Ikon ad="kisiler" boyut={24} /></span>
          <div>
            <small>{tt("ARKADAŞLAR")}</small>
            <h3>{tt("Meydan Oku")}</h3>
            <p>{tt("Bir arkadaşını seç ve bire bir kapış.")}</p>
          </div>
          <b>{tt("SEÇ")} →</b>
        </button>

        <button type="button" className="catalog-card green" onClick={() => navigate(y("/calisma"))}>
          <span><Ikon ad="kitap" boyut={24} /></span>
          <div>
            <small>{tt("KİŞİSEL ÇALIŞMA")}</small>
            <h3>{tt("Hatalarım")}</h3>
            <p>{tt("Yanlış yaptığın soruları tekrar et, açığını kapat.")}</p>
          </div>
          <b>{tt("ÇALIŞ")} →</b>
        </button>

        <button type="button" className="catalog-card navy" onClick={() => navigate(y("/siralama"))}>
          <span><Ikon ad="grafik" boyut={24} /></span>
          <div>
            <small>{tt("DERECELİ")}</small>
            <h3>{tt("Lig")}</h3>
            <p>{tt("Maç kazan, yüksel ve hafta sonunda sıranı gör.")}</p>
          </div>
          <b>{tt("LİGE BAK")} →</b>
        </button>
      </section>

      {/* Grup maçı ödülsüz arkadaş modudur (coin/lig/seri yok, rozet var) —
          kurulumu /meydan sayfasının içinde. */}
      <section className="group-mode-banner">
        <div>
          <span><Ikon ad="kisiler" boyut={24} /></span>
          <div>
            <small>{tt("3–5 ARKADAŞ · ÖDÜLSÜZ")}</small>
            <h2>{tt("Grup Maçı")}</h2>
            <p>{tt("Arkadaş grubunu kur, aynı sorularda eğlencesine yarış.")}</p>
          </div>
        </div>
        <button type="button" onClick={() => navigate(y("/meydan"))}>
          {tt("GRUP MAÇI KUR")} →
        </button>
      </section>
    </div>
  );
}
