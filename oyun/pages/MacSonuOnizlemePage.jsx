// ============================================================
// /mac-sonu-onizleme — Maç sonu kutlama sahnesinin ÖNİZLEMESİ (Ajan G)
//
// Menüde yok; giriş + yalnız sahip (BildimApp › SahipKapisi). Gerçek maçlara
// BAĞLI DEĞİL: altı hâl örnek verilerle çizilir. Örnek verilerin şekli
// gerçek kaynaklarla aynıdır (MacSonuKutlama.jsx başındaki not), böylece
// Ida onaylayınca bağlama ayrı adımda veri eşlemesinden ibaret kalır.
//
// Sahte üst çubuk: coin'ler gerçek Layout yerine buradaki sayaca uçar.
// ============================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import MacSonuKutlama from "../components/MacSonuKutlama.jsx";
import { NavLink } from "react-router-dom";
import { QtAltMenu, QtCoinHapi, QtDugme, QtIkonDugme, QtMarka } from "../tasarim/index.js";
import CerceveliAvatar from "../components/CerceveliAvatar.jsx";
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
// A.4 (tek ekran ölçümü): ?arac=0 → hâl seçici gizli (üst bölge gerçek üst çubuk kadar) · ?kabuk=1 → gerçek
// kabuğun sınıfları + alt sekme çubuğu (sahne açıkken gizlenmeli) · ?detay=0 → Detay/ek içerik verilmez.
const ARAC = ARAMA.get("arac") !== "0";
const KABUK = ARAMA.get("kabuk") === "1";
const DETAY = ARAMA.get("detay") !== "0";
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

/** Gerçek sayfaların Detay'ı gibi uzun içerik (panel içinde kaydırılır). */
function OrnekDetay() {
  return (
    <div className="mso-detay-ornek">
      {Array.from({ length: 10 }, (_, i) => (
        <p key={i} className="mso-detay-satir">{tt("Soru {n}: örnek soru metni — doğru cevap burada yazar.", { n: i + 1 })}</p>
      ))}
    </div>
  );
}
/** Klasik'in ek içeriği gibi: not + tepki düğmeleri. */
function OrnekEk() {
  return (
    <>
      <p className="m1-ss-not">{tt("Maç bitti ama oturum açık: istersen burada kalıp sohbet edebilirsin. Çıkmak sana kalmış.")}</p>
      <div className="m1-tepki" role="group" aria-label={tt("Tepkiler")}>
        {["begeni", "gulen", "sasirmis", "kizgin"].map((ad) => <QtIkonDugme key={ad} ikon={ad} etiket={ad} onClick={() => {}} />)}
      </div>
    </>
  );
}
const derece = (sira, toplam, ek) => (
  <div className="msk-derece">
    <CerceveliAvatar profile={BEN} cerceve="dukkan_anka" boyut={88} />
    {sira ? <span className="msk-derece-sayi qt-sayi">{tt("{n}.", { n: sira })}</span> : null}
    {ek ? <span className="msk-derece-etiket">{tt("{t} oyuncu arasında · {d} doğru", { t: toplam, d: ek })}</span> : null}
  </div>
);

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
  // A.4: bütün modların kalan hâlleri (tek ekran ölçümü)
  {
    kod: "klasik-uc", ad: "Klasik — 3 basamak puan + 3 görev + rozet + level (en uzun)",
    veri: {
      durum: "kazandi", mod: "klasik", skorEtiket: "puan",
      ben: { profil: BEN, skor: 200, cerceve: "level_75" }, rakip: { profil: RAKIP, skor: 110, cerceve: "dukkan_yakut" },
      oduller: [{ ikon: "coin", deger: 42, etiket: "coin" }],
      level: xp(60, 4, 35, 450, { level_once: 3, level_sonra: 4, level_coin: 20, level_xp_once: 375, level_gereken_once: 400 }),
      lig: { puan: 12, siraOnce: 8, siraSonra: 6 },
      gorevler: [...GOREVLER, { id: "g3", ad: "Bir Düello kazan", ilerleme: 0, hedef: 1, alindi: false, onceki: 0 }],
      rozetler: [{ id: "klasik_10", ad: "Klasik Ustası", ikon: "trophy", grup: "klasik", kademe: "altin" }],
    },
  },
  {
    kod: "saf", ad: "Saf Bilgi — kaybetti (Hatalarını çalış)",
    veri: {
      durum: "kaybetti", mod: "klasik", skorEtiket: "puan",
      ben: { profil: BEN, skor: 90, cerceve: "dukkan_anka" }, rakip: { profil: RAKIP, skor: 120, cerceve: "dukkan_yakut" },
      oduller: [{ ikon: "coin", deger: 5, etiket: "coin" }], level: xp(15, 3, 220, 400),
      gorevler: GOREVLER,
    },
  },
  {
    kod: "antrenman", ad: "Antrenman (bot) — berabere",
    veri: {
      durum: "berabere", mod: "klasik", skorEtiket: "puan",
      ben: { profil: BEN, skor: 100, cerceve: "dukkan_anka" }, rakip: { profil: { ...RAKIP, id: "onizleme-bot", gorunen_ad: "Ada", is_bot: true }, skor: 100 },
      oduller: [], level: xp(10, 3, 210, 400), gorevler: GOREVLER.slice(1),
    },
  },
  {
    kod: "duello-kaybetti", ad: "Düello — kaybetti",
    veri: {
      durum: "kaybetti", mod: "duello", canToplam: 3,
      ben: { profil: BEN, can: 0, cerceve: "dukkan_anka" }, rakip: { profil: RAKIP, can: 1, cerceve: "dukkan_nebula" },
      oduller: [{ ikon: "coin", deger: 5, etiket: "coin" }], level: xp(20, 3, 225, 400), gorevler: GOREVLER.slice(1),
      yeniMacEtiketi: "Yeni düello",
    },
  },
  {
    kod: "terk-ben", ad: "Terk — maçtan ayrıldın",
    veri: { durum: "kaybetti", mod: "klasik", terk: "ben", ben: { profil: BEN, skor: 40, cerceve: "dukkan_anka" }, rakip: { profil: RAKIP, skor: 60 } },
  },
  {
    kod: "terk-rakip", ad: "Terk — rakip ayrıldı (galibiyet)",
    veri: {
      durum: "kazandi", mod: "klasik", terk: "rakip",
      ben: { profil: BEN, skor: 60, cerceve: "dukkan_anka" }, rakip: { profil: RAKIP, skor: 30 },
      oduller: [{ ikon: "coin", deger: 22, etiket: "coin" }], level: xp(45, 3, 250, 400), gorevler: GOREVLER,
    },
  },
  {
    kod: "turnuva", ad: "Turnuva — şampiyon",
    veri: {
      durum: "kazandi", mod: "turnuva", baslik: "ŞAMPİYON!", karsilasma: derece(1, 24, 14), rovans: null, yeniMacEtiketi: "Turnuvalara dön",
      oduller: [{ ikon: "coin", deger: 150, etiket: "coin" }], level: xp(80, 5, 300, 500), lig: { puan: 30, siraOnce: 12, siraSonra: 7 },
      gorevler: GOREVLER,
    },
  },
  {
    kod: "turnuva-derece", ad: "Turnuva — 5. oldun",
    veri: {
      durum: "berabere", mod: "turnuva", baslik: "Turnuva bitti", altYazi: "Şampiyon: Mert", karsilasma: derece(5, 24, 9), rovans: null,
      yeniMacEtiketi: "Turnuvalara dön", oduller: [{ ikon: "coin", deger: 20, etiket: "coin" }], level: xp(30, 5, 240, 500), gorevler: GOREVLER.slice(1),
    },
  },
  {
    kod: "turnuva-terk", ad: "Turnuva — ayrıldın",
    veri: { terk: "ben", mod: "turnuva", karsilasma: derece(null, 0, null), rovans: null, yeniMacEtiketi: "Turnuvalara dön" },
  },
  {
    kod: "grup", ad: "Grup — 2. oldun (ödülsüz)",
    veri: {
      durum: "kaybetti", mod: "grup", baslik: "Maç bitti", altYazi: "Arkadaş maçı — ödül ve puan yok.", karsilasma: derece(2, 4, 11), rovans: null,
      gorevler: GOREVLER.slice(1), rozetler: [{ id: "grup_1", ad: "Takım Oyuncusu", ikon: "users", grup: "grup", kademe: "bronz" }],
    },
  },
  {
    kod: "grup-terk", ad: "Grup — ayrıldın",
    veri: { terk: "ben", mod: "grup", karsilasma: derece(null, 0, null), rovans: null },
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
      ...(hal.veri.yeniMacEtiketi ? { yeniMacEtiketi: tt(hal.veri.yeniMacEtiketi) } : {}),
    };
  }, [rovansKapali, hal]);
  const { yeniMacEtiketi: _ym, baslik: halBaslik, altYazi: halAlt, ...veri } = hal.veri;
  const terkBen = veri.terk === "ben";

  const sayfa = (
    <div className={KABUK ? "mso app qt-sayfa a-kabuk" : "mso"}>
      {/* A.4: sahne üst bölgenin (data-msk-ust) altından başlar — gerçekte .a-ust-blok */}
      <div data-msk-ust="" className={KABUK ? "a-ust-blok" : undefined}>
      <header className="mso-ust">
        <QtMarka />
        <span className="mso-coin" data-ms-coin-hedef>
          <QtCoinHapi miktar={BAKIYE + eklenen} />
        </span>
      </header>

      {ARAC && <div className="mso-arac">
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
      </div>}
      </div>

      <main className={KABUK ? "shell a-icerik qt-altmenu-payi" : undefined}>
      <MacSonuKutlama
        key={`${hal.kod}-${oynatma}`}
        {...veri}
        {...(halBaslik ? { baslik: tt(halBaslik) } : {})}
        {...(halAlt ? { altYazi: tt(halAlt) } : {})}
        ben={veri.ben ? { ...veri.ben, lig: LIG_BEN, ...(CERCEVE_ONIZLEME ? { cerceve: CERCEVE_ONIZLEME } : {}), ...PREMIUM_BEN } : undefined}
        rakip={veri.rakip ? { ...veri.rakip, lig: "gumus" } : undefined}
        coinHedefSecici="[data-ms-coin-hedef]"
        onCoinVaris={onCoinVaris}
        eylemler={eylemler}
        zaferEfekti={ZAFER_ONIZLEME}
        detay={DETAY && !terkBen ? <OrnekDetay /> : undefined}
        detayRozet={DETAY && !terkBen ? 3 : 0}
      >
        {DETAY && !terkBen ? <OrnekEk /> : null}
      </MacSonuKutlama>
      </main>

      {KABUK && (
        <QtAltMenu sabit yalnizMobil className="mobile-nav a-altmenu" Baglanti={NavLink} etiket={tt("Mobil menü")}
                   sekmeler={[
                     { kod: "ana", ad: tt("Ana Sayfa"), ikon: "ev", to: "/mac-sonu-onizleme" },
                     { kod: "arkadas", ad: tt("Arkadaşlar"), ikon: "kisiler", to: "/mac-sonu-onizleme" },
                     { kod: "lig", ad: tt("Lig"), ikon: "lig", to: "/mac-sonu-onizleme" },
                     { kod: "dukkan", ad: tt("Dükkân"), ikon: "dukkan", to: "/mac-sonu-onizleme" },
                     { kod: "profil", ad: tt("Profil"), ikon: "kisi", to: "/mac-sonu-onizleme" },
                   ]} />
      )}
    </div>
  );
  return sayfa;
}
