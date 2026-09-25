/**
 * KAZANILAN ÇERÇEVE (görsel revizyon, Ida seçimi 25 Eyl 2026 — tasarim/SECIMLER_GORSEL_REVIZYON.md)
 * Lig çerçeveleri "Set A — Defne ve Taç", level çerçeveleri "Set A — Altıgen Madalya", Turnuva Şampiyonu
 * "A — Kupa Tepesi". Çizimler /gorsel-revizyon önizlemesindeki kaynakla AYNI dosyalardan gelir (tek kaynak):
 * oyun/tasarim/gorsel-revizyon/b/cizim/{ligSetA,level,turnuva}.js; kap GrCerceve (tur2 motoru, tek WebGL bağlamı).
 * Altın Lig = oyundaki onaylı 2. tur Altın Lig (Cerceve2 "altinlig").
 *
 * Bu dosya PremiumAvatarCizim üzerinden TEMBEL yüklenir (ana paket büyümez).
 * Hareket (brief A8): yalnız `hareketli` verilen yerde (profil, ana sayfa kartı, maç şeridi, VS, maç sonu) ve
 * ekrandayken; listelerde (lig tablosu, koleksiyon ızgarası) durağan çizim. Hareketi azalt → motorun yumuşak modu
 * (0,4 hız = 2,5× yavaş, parçacık yarı, flaş yok). ≤ 48 px sade çizim, kutudan taşmaz.
 * Kimlikler (anahtar) ve sahiplikler DEĞİŞMEDİ; yalnız görünüm.
 */
import Cerceve2 from "../premium/tur2/Cerceve2.jsx";
import GrCerceve from "../gorsel-revizyon/b/GrCerceve.jsx";
import { LIG_A, LIG_A_EFEKT } from "../gorsel-revizyon/b/cizim/ligSetA.js";
import { LEVEL_A, LEVEL_EFEKT } from "../gorsel-revizyon/b/cizim/level.js";
import { TURNUVA, TURNUVA_EFEKT } from "../gorsel-revizyon/b/cizim/turnuva.js";
import { KAZANILAN } from "./anahtarlar.js";

function cizimBul(t) {
  if (t.tur === "lig") return { cizim: (k) => LIG_A[t.lig](k), efekt: LIG_A_EFEKT[t.lig] ?? null };
  if (t.tur === "level") return { cizim: (k) => LEVEL_A[t.lv](k), efekt: LEVEL_EFEKT.A[t.lv] ?? null };
  return { cizim: (k) => TURNUVA.a(k), efekt: TURNUVA_EFEKT.a };
}
const cizimler = new Map();

export default function KazanilanCerceve({ anahtar, aura = null, boyut = 64, hareketli = false, etiket, className = "", children }) {
  const t = KAZANILAN[anahtar];
  if (!t) return null;
  if (t.tur === "lig" && t.lig === "altin") {
    return <Cerceve2 tur="altinlig" aura={aura} boyut={boyut} hareketli={hareketli} etiket={etiket} className={className}>{children}</Cerceve2>;
  }
  if (!cizimler.has(anahtar)) cizimler.set(anahtar, cizimBul(t));
  const { cizim, efekt } = cizimler.get(anahtar);
  return (
    <GrCerceve cizim={cizim} anahtar={`kz:${anahtar}`} efekt={efekt} boyut={boyut} hareketli={hareketli} aura={aura}
               etiket={etiket} className={className}>
      {children}
    </GrCerceve>
  );
}
