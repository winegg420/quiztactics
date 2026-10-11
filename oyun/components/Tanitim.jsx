import { useState } from "react";
import Modal from "./Modal.jsx";
import { tt } from "../lib/dil.js";
import { QtDugme } from "../tasarim/index.js";
import { AmblemSembolu, ModFiguru } from "./ModFiguru.jsx";
import "../tasarim/ekranlar/g-kurulum.css";
import "../tasarim/ekranlar/ikon-disk.css";

// Giriş · Tanıtım · Kurulum turu (11 Eki 2026): 4 kısa kart — üç mod + lig/turnuva. Her kartta modun rengi,
// büyük figür, başlık ve en çok 2 satır. Kurallar oyunun kendi tanıtımlarıyla aynı (Düello v4: tek bilen
// kontrolü alır, 3/3; Ortak Hazine: tek bilen sahibi olur, AÇ/DEVAM; turnuva: son kalan kazanır).
const KARTLAR = [
  { tur: "klasik", baslik: tt("Klasik"), metin: tt("Rakibinle aynı sorular, aynı anda. En çok bilen kazanır.") },
  { tur: "duello", baslik: tt("Düello"), metin: tt("Tek bilen kontrolü alır. Kontrolü al, üst üste 3 doğru yap.") },
  { tur: "kasa", baslik: tt("Ortak Hazine"), metin: tt("Tek bilen hazinenin sahibi olur. Doğru anda AÇ, puanı kap.") },
  { tur: "lig", baslik: tt("Lig ve turnuva"), metin: tt("Şehir, ülke ve dünya liglerinde yüksel. Her gün turnuva: son kalan kazanır.") },
];

/**
 * İlk girişte gösterilen 4 kartlık tanıtım.
 * Kurulum sihirbazından ÖNCE gelir: kullanıcı ne oynayacağını bilmeden
 * takma ad/avatar/şehir soruları karşısına çıkmasın.
 */
export default function Tanitim({ onBitti }) {
  const [i, setI] = useState(0);
  const k = KARTLAR[i];
  const sonuncu = i === KARTLAR.length - 1;

  // Tasarım Adım 2 (Yön A): eski paylaşılan Modal (bd-modal-katman — araç testleri onu arar)
  // içinde tasarım sisteminin paneli. Kapatılamaz: "Atla" ya da son karttaki düğme bitirir.
  return (
    <Modal etiket={tt("Tanıtım")} ekSinif="g-tanitim-katman">
      <div className="qt-modal g-tanitim">
        <div className="g-tanitim-ust">
          <div className="g-tanitim-noktalar" aria-hidden="true">
            {KARTLAR.map((_, n) => (
              <span key={n} className={"g-tanitim-nokta" + (n === i ? " g-tanitim-nokta--aktif" : "")} />
            ))}
          </div>
          <QtDugme tur="hayalet" boyut="k" onClick={onBitti}>
            {tt("Atla")}
          </QtDugme>
        </div>

        <div key={i} className="g-tanitim-icerik qt-h-gir">
          <div className={`g-tanitim-gorsel g-tanitim-gorsel--${k.tur} qt-isin-sahne`}>
            {/* Baykuş maskot yok (Ida, 24 Eyl 2026): ana sayfa / Modlar ile aynı mod figürü; lig kartında kupa */}
            {k.tur === "lig"
              ? <span className="as-figur g-tanitim-figur" aria-hidden="true"><AmblemSembolu ad="kupa" className="as-figur-ana" /></span>
              : <ModFiguru tur={k.tur} className="g-tanitim-figur" />}
          </div>
          <h2 className="qt-baslik-1 g-tanitim-baslik">{k.baslik}</h2>
          <p className="qt-govde qt-soluk g-tanitim-metin">{k.metin}</p>
        </div>

        <QtDugme
          tamGenislik
          boyut="b"
          ikonSag={sonuncu ? "oyna" : "ileri"}
          onClick={() => (sonuncu ? onBitti() : setI((x) => x + 1))}
        >
          {sonuncu ? tt("Hadi başlayalım!") : tt("Devam")}
        </QtDugme>
      </div>
    </Modal>
  );
}
