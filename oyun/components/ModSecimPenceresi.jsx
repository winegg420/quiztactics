import { useEffect, useState } from "react";
import { QtModal, QtModKart, QtDugme, QtIkon } from "../tasarim/index.js";
import "../tasarim/ekranlar/a-modlar.css";
import AvatarCerceve from "./AvatarCerceve.jsx";
import DereceliAnahtari from "./DereceliAnahtari.jsx";
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
 * @param {boolean} [props.dereceli]   23 Eyl 2026: verilirse pencerenin EN ÜSTÜNDE "Serbest | Dereceli"
 *        anahtarı çizilir (ana sayfa OYNA / Saf Bilgi) — oyun sessizce kayıtlı tercihle başlamaz.
 * @param {(d: boolean) => void} [props.onDereceli]
 * @param {string[]} [props.modlar]    yalnız bu modlar gösterilir (ör. Saf Bilgi kısayolu: ["saf"])
 *
 * `profil` null ise (ana sayfa "Hemen oyna") avatar çizilmez, başlık tek satır.
 */
export default function ModSecimPenceresi({ profil, onSec, onKapat, baslik, bekleMetni, alttan = false,
                                            dereceli, onDereceli, modlar }) {
  const [calisan, setCalisan] = useState(null);   // "klasik" | "duello" | null
  const [hata, setHata] = useState(null);
  const [odul, setOdul] = useState(null);
  const [odulDurum, setOdulDurum] = useState("yukleniyor");   // yukleniyor | hazir | yok

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
        setOdulDurum("hazir");
      })
      .catch((e) => { console.error("[Bildim] ödül ayarları okunamadı:", e); if (aktif) setOdulDurum("yok"); });
    return () => { aktif = false; };
  }, []);

  // Klavyeyle açılınca odak ilk seçeneğe gelsin.
  // Paket 42 C.1: fareyle/dokunarak açılınca ilk kart odak halkasıyla "seçili" görünüyordu
  // (fare başka kartın üstündeyken iki kart turuncu). Açan düğme klavye odağındaysa ilk
  // karta, değilse pencerenin kendisine (halkasız) odaklanılır. QtModal ilk odağı
  // `data-qt-ilk-odak` taşıyan öğeye verir; yoksa panelin kendisine (halkasız).
  const [klavyeyle] = useState(() => Boolean(document.activeElement?.matches?.(":focus-visible")));

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
  // Paket 41 M.3: ayar okunamazsa satır yok olmasın — yüklenirken "…", okunamazsa "—"
  const odulMetni = (o) =>
    o && o.lig != null && o.coin != null
      ? tt("Galibiyet: +{lig} lig puanı · {coin} coin", { lig: o.lig, coin: o.coin })
      : odulDurum === "yukleniyor"
        ? tt("Ödül: …")
        : tt("Ödül: —");

  const TUM_SECENEKLER = [
    {
      mod: "klasik",
      ikon: "klasik",
      ad: tt("Klasik Maç"),
      aciklama: tt("İkiniz aynı soruları cevaplarsınız, en çok doğru bilen kazanır."),
      joker: tt("4 skill · aynı anda"),
      odul: odulMetni(odul?.klasik),
    },
    {
      mod: "duello",
      ikon: "duello",
      ad: tt("Düello (Taktik Maçı)"),
      aciklama: tt("Rakibinin zayıf kategorisini bul, oradan vur. 3 can, en çok 10 tur."),
      joker: tt("4 skill · sıra sende"),
      odul: odulMetni(odul?.duello),
      rozet: tt("En çok ödül"),
    },
    // Paket 31 B: Saf Bilgi — jokersiz Klasik; ödül Klasik ile aynı
    {
      mod: "saf",
      ikon: "safBilgi",
      ad: tt("Saf Bilgi"),
      aciklama: tt("Skill yok. Sadece bilgi ve hız."),
      joker: tt("skill yok"),
      odul: odulMetni(odul?.klasik),
    },
  ];

  const SECENEKLER = modlar ? TUM_SECENEKLER.filter((x) => modlar.includes(x.mod)) : TUM_SECENEKLER;

  // Yön A: QtModal (body'ye portal, Esc, odak tuzağı). Seçim sürerken kapatılamaz.
  return (
    <QtModal
      acik
      tur={alttan ? "altSayfa" : "modal"}
      onKapat={calisan ? undefined : onKapat}
      kapatDugmesi={!calisan}
      ortuKapatir={!calisan}
      baslik={
        <span className="a-modsecim-baslik">
          {profil && <AvatarCerceve profile={profil} boyut={44} />}
          <span>{baslik ?? tt("{ad} ile nasıl oynamak istersin?", { ad })}</span>
        </span>
      }
      className="a-modsecim"
      altlik={
        <QtDugme tur="ikincil" tamGenislik onClick={onKapat} devreDisi={Boolean(calisan)}>
          {tt("Vazgeç")}
        </QtDugme>
      }
    >
      {onDereceli && <DereceliAnahtari dereceli={dereceli} onDegistir={onDereceli} className="a-modsecim-dereceli" />}
      <div className="a-modsecim-liste" role="group" aria-label={baslik ?? tt("{ad} ile oyun modu seç", { ad })}>
        {SECENEKLER.map((s, i) => (
          <QtModKart
            key={s.mod}
            data-qt-ilk-odak={i === 0 && klavyeyle ? "" : undefined}
            mod={s.mod}
            ikon={s.ikon}
            genis
            ad={s.ad}
            rozet={s.rozet}
            className={calisan && calisan !== s.mod ? "a-modsecim-soluk" : undefined}
            onClick={() => sec(s.mod)}
            disabled={Boolean(calisan)}
            aria-busy={calisan === s.mod}
            alt={
              <>
                <span className="a-modsecim-aciklama">{s.aciklama}</span>
                <span className="a-modsecim-meta">
                  {calisan === s.mod ? (
                    <span className="a-modsecim-bekle"><span className="qt-donen" aria-hidden="true" />{bekleMetni ?? tt("Davet gönderiliyor…")}</span>
                  ) : (
                    <>
                      <span>{s.joker}</span>
                      {s.odul && <span className="a-modsecim-odul"><QtIkon ad="coin" boyut={16} /> {s.odul}</span>}
                    </>
                  )}
                </span>
              </>
            }
          />
        ))}
      </div>

      {hata && <p className="a-modsecim-hata" role="alert">{hata}</p>}
    </QtModal>
  );
}
