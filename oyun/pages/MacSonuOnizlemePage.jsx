// ============================================================
// /mac-sonu-onizleme — Maç sonu kutlama sahnesinin ÖNİZLEMESİ (Ajan G)
//
// Menüde yok, girişsiz açılır (BildimApp › bagimsizModul). Gerçek maçlara
// BAĞLI DEĞİL: altı hâl örnek verilerle çizilir. Örnek verilerin şekli
// gerçek kaynaklarla aynıdır (MacSonuKutlama.jsx başındaki not), böylece
// Ida onaylayınca bağlama ayrı adımda veri eşlemesinden ibaret kalır.
//
// Sahte üst çubuk: coin'ler gerçek Layout yerine buradaki sayaca uçar.
// ============================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import MacSonuKutlama from "../components/MacSonuKutlama.jsx";
import { QtCoinHapi, QtDugme, QtMarka } from "../tasarim/index.js";
import { aktifDil, dilKaydet, tt } from "../lib/dil.js";
import { cerceveTarziAyarla } from "../lib/cerceveTarzi.js";
import "../tasarim/ekranlar/mac-sonu-onizleme.css";

const BAKIYE = 1480;
// 540: ?zafer=zafer_havai_fisek → kazanan tarafın zafer efekti (performans ölçümü ve önizleme). Yoksa efekt yok.
const ZAFER_ONIZLEME = (() => {
  try {
    const z = new URLSearchParams(window.location.search).get("zafer");
    return { ben: z || null, rakip: z || null };
  } catch {
    return { ben: null, rakip: null };
  }
})();
// 550: ?cerceve=level_75 → "ben" tarafının çerçevesi (taç/plaka çakışması ölçümü) · ?tarz=cizgi|mucevher|isik →
// Altın Lig çerçevesi o tarzda (sunucudaki Ida seçimi yerine; yalnız bu sayfa).
const ARAMA = (() => { try { return new URLSearchParams(window.location.search); } catch { return new URLSearchParams(); } })();
const CERCEVE_ONIZLEME = ARAMA.get("cerceve");
if (ARAMA.get("tarz")) cerceveTarziAyarla(ARAMA.get("tarz"));
// 560: ?pcerceve=pc_galaksi · ?paura=pa_gece → "ben" tarafında premium çerçeve/aura (sunucusuz ölçüm) ·
// ?lig=altin → lig amblemi (varsayılan altın; rakip gümüş).
const PREMIUM_BEN = {
  ...(ARAMA.get("pcerceve") ? { premiumCerceve: ARAMA.get("pcerceve") } : {}),
  ...(ARAMA.get("paura") ? { premiumAura: ARAMA.get("paura") } : {}),
};
const LIG_BEN = ARAMA.get("lig") || "altin";
const profil = (id, ad, dosya) => ({ id, gorunen_ad: ad, gorunen_avatar: `/avatars/pro/${dosya}.svg` });
const BEN = profil("onizleme-ben", "Deniz", "astronot-k17");
const RAKIP = profil("onizleme-rakip", "Mert", "baykus-k03");

/** level_kazancim yanıtı şeklinde örnek. */
const xp = (x, level, levelXp, gereken, ek = {}) => ({
  hazir: true, xp: x, level, level_xp: levelXp, level_gereken: gereken, level_once: level, level_sonra: level,
  rutbe_once: null, rutbe_sonra: null, level_coin: 0, rutbe_coin: 0, skiller: [], ...ek,
});

/** odul_dokumu.gorevler şeklinde (+ onceki: maçtan önceki ilerleme). */
const GOREVLER = [
  { id: "g1", ad: "3 maç kazan", ilerleme: 3, hedef: 3, alindi: false, onceki: 2 },
  { id: "g2", ad: "20 soruyu doğru cevapla", ilerleme: 17, hedef: 20, alindi: false, onceki: 9 },
];

const HALLER = [
  {
    kod: "normal", ad: "Kazandın — normal",
    veri: {
      durum: "kazandi", mod: "klasik",
      ben: { profil: BEN, skor: 14, cerceve: "dukkan_anka" }, rakip: { profil: RAKIP, skor: 11, cerceve: "dukkan_yakut" },
      oduller: [{ ikon: "coin", deger: 22, etiket: "coin" }],
      level: xp(45, 3, 250, 400), gorevler: GOREVLER,
    },
  },
  {
    kod: "level", ad: "Kazandın — level atladı",
    veri: {
      durum: "kazandi", mod: "klasik",
      ben: { profil: BEN, skor: 15, cerceve: "dukkan_anka" }, rakip: { profil: RAKIP, skor: 12, cerceve: "dukkan_yakut" },
      oduller: [{ ikon: "coin", deger: 42, etiket: "coin" }],
      level: xp(60, 4, 35, 450, { level_once: 3, level_sonra: 4, level_coin: 20, level_xp_once: 375, level_gereken_once: 400 }),
      gorevler: GOREVLER,
    },
  },
  {
    kod: "rozet", ad: "Kazandın — yeni rozet + lig sırası",
    veri: {
      durum: "kazandi", mod: "klasik",
      ben: { profil: BEN, skor: 16, cerceve: "lig_altin" }, rakip: { profil: RAKIP, skor: 10, cerceve: "dukkan_gece" },
      oduller: [{ ikon: "coin", deger: 22, etiket: "coin" }],
      level: xp(45, 3, 250, 400),
      lig: { puan: 12, siraOnce: 8, siraSonra: 6 },
      gorevler: GOREVLER.slice(0, 1),
      rozetler: [{ id: "klasik_10", ad: "Klasik Ustası", ikon: "trophy", grup: "klasik", kademe: "altin" }],
    },
  },
  {
    kod: "kaybetti", ad: "Kaybettin",
    veri: {
      durum: "kaybetti", mod: "klasik",
      ben: { profil: BEN, skor: 9, cerceve: "dukkan_anka" }, rakip: { profil: RAKIP, skor: 14, cerceve: "dukkan_yakut" },
      oduller: [], level: xp(15, 3, 220, 400),
      gorevler: [{ id: "g2", ad: "20 soruyu doğru cevapla", ilerleme: 18, hedef: 20, alindi: false, onceki: 9 }],
    },
  },
  {
    kod: "berabere", ad: "Berabere (Klasik)",
    veri: {
      durum: "berabere", mod: "klasik",
      ben: { profil: BEN, skor: 12, cerceve: "dukkan_anka" }, rakip: { profil: RAKIP, skor: 12, cerceve: "dukkan_yakut" },
      oduller: [{ ikon: "coin", deger: 10, etiket: "coin" }], level: xp(25, 3, 230, 400),
      gorevler: GOREVLER.slice(1),
    },
  },
  {
    kod: "duello", ad: "Düello galibiyeti",
    veri: {
      durum: "kazandi", mod: "duello", canToplam: 3,
      ben: { profil: BEN, can: 2, cerceve: "dukkan_anka" }, rakip: { profil: RAKIP, can: 0, cerceve: "dukkan_nebula" },
      oduller: [{ ikon: "coin", deger: 30, etiket: "coin" }], level: xp(50, 3, 255, 400),
      gorevler: GOREVLER,
    },
  },
];

export default function MacSonuOnizlemePage() {
  const [kod, setKod] = useState(() => {
    try { return new URLSearchParams(window.location.search).get("hal") || "normal"; } catch { return "normal"; }
  });
  const [oynatma, setOynatma] = useState(0);
  const [eklenen, setEklenen] = useState(0);
  const [rovansKapali, setRovansKapali] = useState(false);
  const [not, setNot] = useState("");
  const hal = HALLER.find((h) => h.kod === kod) ?? HALLER[0];
  const coin = hal.veri.oduller?.find((o) => o.ikon === "coin")?.deger ?? 0;

  useEffect(() => { document.title = "Quiz Tactics — " + tt("Maç Sonu Önizleme"); }, []);

  const yeniden = useCallback(() => { setEklenen(0); setNot(""); setOynatma((n) => n + 1); }, []);
  const halSec = (k) => {
    setKod(k);
    try { window.history.replaceState(null, "", `?hal=${k}`); } catch { /* adres değişmezse sorun değil */ }
    yeniden();
  };
  const onCoinVaris = useCallback((i, n) => setEklenen(Math.round((coin * (i + 1)) / n)), [coin]);
  const eylemler = useMemo(() => {
    const dugmeNotu = (ad) => () => setNot(tt("Önizleme: “{ad}” burada bir yere bağlı değil.", { ad }));
    return {
      rovansKapali,
      onRovans: dugmeNotu(tt("Rövanş")),
      onYeniMac: dugmeNotu(tt("Yeni maç")),
      onAnaSayfa: dugmeNotu(tt("Ana sayfa")),
      onHatalar: dugmeNotu(tt("Hatalarını çalış")),
    };
  }, [rovansKapali]);

  return (
    <div className="mso">
      <header className="mso-ust">
        <QtMarka />
        <span className="mso-coin" data-ms-coin-hedef>
          <QtCoinHapi miktar={BAKIYE + eklenen} />
        </span>
      </header>

      <div className="mso-arac">
        <label className="mso-secim">
          <span className="qt-gizli">{tt("Hâl")}</span>
          <select value={hal.kod} onChange={(e) => halSec(e.target.value)}>
            {HALLER.map((h, i) => <option key={h.kod} value={h.kod}>{`${i + 1}. ${tt(h.ad)}`}</option>)}
          </select>
        </label>
        <QtDugme tur="mor" boyut="k" ikon="yenile" onClick={yeniden}>{tt("Tekrar oynat")}</QtDugme>
        <div className="mso-dil" role="group" aria-label={tt("Dil")}>
          {["tr", "en"].map((d) => (
            <button key={d} type="button" className="mso-dil-dugme" aria-pressed={aktifDil() === d}
                    onClick={() => { if (aktifDil() !== d) { dilKaydet(d); window.location.reload(); } }}>
              {d.toUpperCase()}
            </button>
          ))}
        </div>
        <label className="mso-kutu">
          <input type="checkbox" checked={rovansKapali} onChange={(e) => setRovansKapali(e.target.checked)} />
          {tt("Rövanş devre dışı")}
        </label>
        <p className="mso-not" aria-live="polite">{not}</p>
      </div>

      <MacSonuKutlama
        key={`${hal.kod}-${oynatma}`}
        {...hal.veri}
        ben={{ ...hal.veri.ben, lig: LIG_BEN, ...(CERCEVE_ONIZLEME ? { cerceve: CERCEVE_ONIZLEME } : {}), ...PREMIUM_BEN }}
        rakip={{ ...hal.veri.rakip, lig: "gumus" }}
        coinHedefSecici="[data-ms-coin-hedef]"
        onCoinVaris={onCoinVaris}
        eylemler={eylemler}
        zaferEfekti={ZAFER_ONIZLEME}
      />
    </div>
  );
}
