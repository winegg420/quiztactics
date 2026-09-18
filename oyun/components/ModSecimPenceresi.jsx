import { useEffect, useRef, useState } from "react";
import Modal from "./Modal.jsx";
import Ikon from "./Ikon.jsx";
import AvatarCerceve from "./AvatarCerceve.jsx";
import { ayarlar } from "../lib/ayarlar.js";
import { tt } from "../lib/dil.js";

/**
 * Arkadaşla oynarken mod seçimi (Paket 30 B).
 *
 * Arkadaş satırındaki iki ikon (kılıç = Klasik, kalkan = Düello) anlaşılmıyordu;
 * yerine tek "Oyna" düğmesi ve bu pencere geldi. RPC'leri ÇAĞIRAN taraf sayfadır —
 * pencere yalnız seçimi iletir ve hatayı KENDİ İÇİNDE gösterir (eskiden sayfanın
 * en üstüne düşüyor, mobilde görünmüyordu).
 *
 * Ödül rakamları `oyun_ayarlari`'ndan okunur (koda gömülmez).
 *
 * @param {object}   props
 * @param {object}   props.profil   arkadaşın profili (gorunen_ad, avatar…)
 * @param {(mod: "klasik"|"duello"|"saf") => Promise<string|null>} props.onSec
 *        null dönerse iş bitti (pencere sayfa tarafından kapatılır); metin dönerse hata.
 * @param {() => void} props.onKapat
 * @param {string}  [props.baslik]     Paket 35 B: verilirse "{ad} ile nasıl oynamak istersin?" yerine
 * @param {string}  [props.bekleMetni] Paket 35 B: seçim sürerken kartta (varsayılan "Davet gönderiliyor…")
 * @param {boolean} [props.alttan]     Paket 35 B: pencere alttan açılır (ana sayfa, tek elle erişim)
 *
 * `profil` null ise (ana sayfa "Hemen oyna") avatar çizilmez, başlık tek satır.
 */
export default function ModSecimPenceresi({ profil, onSec, onKapat, baslik, bekleMetni, alttan = false }) {
  const [calisan, setCalisan] = useState(null);   // "klasik" | "duello" | null
  const [hata, setHata] = useState(null);
  const [odul, setOdul] = useState(null);
  const ilkRef = useRef(null);

  useEffect(() => {
    let aktif = true;
    ayarlar()
      .then((a) => {
        if (!aktif) return;
        const s = (k) => (Number.isFinite(Number(a?.[k])) ? Number(a[k]) : null);
        setOdul({
          klasik: { lig: s("lig_mac_galibiyet"), coin: s("coin_mac_galibiyet") },
          duello: { lig: s("lig_duello_galibiyet"), coin: s("coin_duello_galibiyet") },
        });
      })
      .catch(() => { /* ödül satırı gösterilmez, seçim yine çalışır */ });
    return () => { aktif = false; };
  }, []);

  // Klavyeyle açılınca odak ilk seçeneğe gelsin
  useEffect(() => { ilkRef.current?.focus(); }, []);

  const sec = async (mod) => {
    if (calisan) return;
    setHata(null);
    setCalisan(mod);
    try {
      const sonuc = await onSec(mod);
      if (sonuc) setHata(sonuc);
    } catch (e) {
      setHata(tt("Bir şeyler ters gitti. Tekrar dener misin?"));
      console.error("[Bildim] mod seçimi:", e);
    } finally {
      setCalisan(null);
    }
  };

  const ad = profil?.gorunen_ad ?? tt("Arkadaşın");
  const odulMetni = (o) =>
    o && o.lig != null && o.coin != null
      ? tt("Galibiyet: +{lig} lig puanı · {coin} coin", { lig: o.lig, coin: o.coin })
      : null;

  const SECENEKLER = [
    {
      mod: "klasik",
      ikon: "soru",
      ad: tt("Klasik Maç"),
      aciklama: tt("İkiniz aynı soruları cevaplarsınız, en çok doğru bilen kazanır."),
      joker: tt("5 joker · aynı anda"),
      odul: odulMetni(odul?.klasik),
    },
    {
      mod: "duello",
      ikon: "kilic",
      ad: tt("Düello (Taktik Maçı)"),
      aciklama: tt("Rakibinin zayıf kategorisini bul, oradan vur. 3 can, en çok 10 tur."),
      joker: tt("6 joker · sıra sende"),
      odul: odulMetni(odul?.duello),
      rozet: tt("En çok ödül"),
    },
    // Paket 31 B: Saf Bilgi — jokersiz Klasik; ödül Klasik ile aynı
    {
      mod: "saf",
      ikon: "yildiz",
      ad: tt("Saf Bilgi"),
      aciklama: tt("Joker yok. Sadece bilgi ve hız."),
      joker: tt("joker yok"),
      odul: odulMetni(odul?.klasik),
    },
  ];

  return (
    <Modal
      onKapat={calisan ? undefined : onKapat}
      etiket={baslik ?? tt("{ad} ile oyun modu seç", { ad })}
      ekSinif={alttan ? "bd-alttan" : ""}
    >
      <div className={`bd-modal bd-mod-secim${alttan ? " alttan" : ""}${calisan ? " seciliyor" : ""}`}>
        {alttan && <div className="bd-joker-sat-tutamac" aria-hidden="true" />}
        <div className="bd-mod-secim-ust">
          {profil && <AvatarCerceve profile={profil} boyut={44} />}
          <h2 className="bd-modal-baslik" id="bd-mod-secim-baslik">
            {baslik ?? tt("{ad} ile nasıl oynamak istersin?", { ad })}
          </h2>
        </div>

        <div className="bd-mod-secim-liste" role="group" aria-labelledby="bd-mod-secim-baslik">
          {SECENEKLER.map((s, i) => (
            <button
              key={s.mod}
              ref={i === 0 ? ilkRef : undefined}
              type="button"
              className={`bd-mod-secim-kart bd-mod-secim-${s.mod}${calisan && calisan !== s.mod ? " soluk" : ""}`}
              onClick={() => sec(s.mod)}
              disabled={Boolean(calisan)}
              aria-busy={calisan === s.mod}
            >
              <span className="bd-mod-secim-ikon" aria-hidden="true"><Ikon ad={s.ikon} boyut={24} /></span>
              <span className="bd-mod-secim-ad">
                {s.ad}
                {s.rozet && <span className="bd-mod-secim-rozet">{s.rozet}</span>}
              </span>
              <span className="bd-mod-secim-aciklama">{s.aciklama}</span>
              <span className="bd-mod-joker">{s.joker}</span>
              {s.odul && <span className="bd-mod-secim-odul"><Ikon ad="coin" boyut={14} /> {s.odul}</span>}
              {calisan === s.mod && <span className="bd-mod-secim-bekle">{bekleMetni ?? tt("Davet gönderiliyor…")}</span>}
            </button>
          ))}
        </div>

        {hata && <div className="hata-kutu" role="alert">{hata}</div>}

        <button type="button" className="btn ikincil" onClick={onKapat} disabled={Boolean(calisan)}>
          {tt("Vazgeç")}
        </button>
      </div>
    </Modal>
  );
}
