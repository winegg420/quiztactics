import { useState } from "react";
import Modal from "./Modal.jsx";
import { tt } from "../lib/dil.js";
import { QtDugme, QtIkon } from "../tasarim/index.js";
import "../tasarim/ekranlar/g-kurulum.css";
import "../tasarim/ekranlar/ikon-disk.css";

const KARTLAR = [
  {
    ikon: "kilic",
    baslik: tt("Nasıl oynanır?"),
    metin:
      tt("20 soruluk kapışmalarda rakibinle yarışırsın. Her doğru cevap 10 puan — ") +
      tt("hızlı basmak fark etmez, bilmek yeter. Sıra beklemek yok: sen istediğin ") +
      tt("zaman oynarsın, rakibin de kendi zamanında."),
    ton: "duello",
  },
  {
    ikon: "yildiz",
    baslik: tt("On kategori"),
    metin:
      tt("Genel Kültür, Bilim, Tarih, Coğrafya, Edebiyat, Spor, Sanat, Sinema, ") +
      tt("Müzik ve Teknoloji. 5.000'den fazla doğrulanmış soru seni bekliyor."),
    ton: "turnuva",
  },
  {
    ikon: "lig",
    baslik: tt("Şehrini zirveye taşı"),
    metin:
      tt("Kazandığın puanlar seni şehir, ülke ve dünya liglerinde yükseltir. ") +
      tt("Her pazartesi yeni hafta başlar. Günlük turnuvalarda son kalan kazanır!"),
    ton: "saf",
  },
];

/**
 * İlk girişte gösterilen 3 kartlık tanıtım.
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
          <div className={`g-tanitim-gorsel g-tanitim-gorsel--${k.ton}`}>
            {/* Baykuş maskot kaldırıldı (Ida, 24 Eyl 2026): kartın ikonu büyük diskte */}
            <span className="qt-ikon-disk g-tanitim-disk" aria-hidden="true">
              <QtIkon ad={k.ikon} boyut={52} />
            </span>
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
