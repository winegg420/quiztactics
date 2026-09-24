/**
 * İSİM EFEKTİ (540) — oyuncu adının görünümü: lig tablosu, maç şeridi, maç sonu, profil.
 *
 * <IsimEfekti userId={id}>{ad}</IsimEfekti>              → takılı efekt oyuncu kartından (toplu + önbellekli
 *                                                           oyuncu_kartlari; avatarla aynı çağrı, ek sorgu yok)
 * <IsimEfekti ef="isim_altin" koyu>{ad}</IsimEfekti>      → efekt elde (önizleme, dükkân)
 * - `ef` verilirse (null dahil) kart okunmaz. `kart` verilirse içindeki isim_efekti kullanılır.
 * - `koyu`: koyu zemin paleti (maç sahnesi/VS içinde CSS zaten seçer); `acik`: koyu bağlamdaki açık levha.
 * - `hareketli`: yalnız tekil yerler (profil başı, maç sonu) — köşede küçük parıltı. Listelerde verme.
 * Görünüm: oyun/tasarim/ekranlar/kozmetik.css (kontrast ≥ 4,5 her zeminde).
 * ALTIN (Ida, 24 Eyl 2026 — 2. karar): isim_altin artık PLAKASIZ — ismin kendisi parlak metal altın harf
 * (koyu→parlak altın degrade, ince koyu kenar, arka plan yok; kozmetik.css › [data-ef="altin"]). `hareketli`
 * → harflerin üstünden ara sıra ince parıltı geçer (listelerde yok; hareketi azalt'ta yavaş/yumuşak).
 * Yalnız istemci eşlemesi: DB/anahtar aynı, takmış herkes (gizli botlar dahil) otomatik yeni hâli görür.
 * Önceki "külçe" plaka (IsimPlakasi2) yalnız /premium-onizleme'de aday olarak kalır.
 * ALTIN 3. karar (Ida, 24 Eyl 2026): /tasarim-onizleme'deki "Işık Şeritli Altın" (altin-isim:serit) adayı
 * BİREBİR — parlak sarı dolgu + kalın lacivert kontur + arkada yarı saydam altın ışık şeridi (AltinIsim,
 * görünüm: tasarim/ekranlar/altin-isim.css). Önizlemedeki aday da bu bileşeni çizer (tek kaynak).
 */
import { useEffect, useState } from "react";
import { oyuncuKarti, oyuncuKartiDinle } from "../lib/cerceve.js";
import { kozmetikTemasi } from "../lib/kozmetik.js";
import "../tasarim/ekranlar/kozmetik.css";
import "../tasarim/ekranlar/altin-isim.css";
import { yumusakHareketKur } from "../tasarim/yumusakHareket.js";

yumusakHareketKur();   // hareketi azalt → yumuşak mod (durmaz, yavaşlar)

/** Oyuncu kartından tek alan (önbellekli). Kart değişince (kendi kozmetiğimi takınca) tazelenir. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function useKartAlani(userIdHam, alan, verildi = false) {
  // Önizleme sayfalarındaki sahte kimlikler ("onizleme-ben") sunucuya gitmez (toplu çağrıyı bozmasın)
  const userId = typeof userIdHam === "string" && UUID.test(userIdHam) ? userIdHam : null;
  const [deger, setDeger] = useState(null);
  const [tazele, setTazele] = useState(0);
  useEffect(() => {
    if (verildi || !userId) return undefined;
    return oyuncuKartiDinle((id) => { if (!id || id === userId) setTazele((x) => x + 1); });
  }, [verildi, userId]);
  useEffect(() => {
    if (verildi || !userId) { setDeger(null); return undefined; }
    let aktif = true;
    oyuncuKarti(userId)
      .then((k) => { if (aktif) setDeger(k?.[alan] ?? null); })
      .catch(() => { if (aktif) setDeger(null); });
    return () => { aktif = false; };
  }, [verildi, userId, alan, tazele]);
  return deger;
}

export default function IsimEfekti({ ef, userId, kart, koyu = false, acik = false, hareketli = false, className = "", children }) {
  const verildi = ef !== undefined || (kart != null && Object.prototype.hasOwnProperty.call(kart, "isim_efekti"));
  const okunan = useKartAlani(userId, "isim_efekti", verildi);
  const anahtar = ef !== undefined ? ef : verildi ? kart?.isim_efekti ?? null : okunan;
  const tema = kozmetikTemasi(anahtar);
  if (!tema) return <span className={className || undefined}>{children}</span>;
  if (tema === "altin") return <AltinIsim koyu={koyu} acik={acik} hareketli={hareketli} className={className}>{children}</AltinIsim>;
  const s = ["qt-isim-ef", koyu && "qt-isim-ef--koyu", acik && "qt-isim-ef--acik", hareketli && "qt-isim-ef--hareketli", className]
    .filter(Boolean).join(" ");
  return <span className={s} data-ef={tema}>{children}</span>;
}

/**
 * ALTIN İSİM — "Işık Şeritli Altın" (Ida seçimi, 24 Eyl 2026; önizleme kodu altin-isim:serit).
 * Metin iki kez çizilir: arkada kontur katmanı (lacivert + 16 yönlü text-shadow halkası, aria-hidden; düz
 * metinde ::before içeriği → seçime, kopyalamaya, innerText'e girmez), önde asıl metin (degrade background-clip:text) — ekran okuyucu ve seçim/kopyalama TEK ad
 * görür; iki katman da aynı üç noktayı (…) taşır. Arkada yarı saydam altın şerit (aria-hidden).
 * `hareketli` (profil başı, VS, maç sonu kazananı, oyuncu kartı): şerit iki yana ışık teli olarak uzar,
 * üstünden ışık süzülür, harflerden parıltı geçer. Listede/şeritte durağan.
 * `koyu`: koyu zemin şeridi (maç sahnesi/VS içinde CSS kendiliğinden seçer); `acik`: koyu bağlamdaki açık levha.
 */
export function AltinIsim({ koyu = false, acik = false, hareketli = false, className = "", children }) {
  const s = ["qt-isim-ef", "qt-ia", hareketli && "qt-ia--hareketli", koyu && "qt-ia--koyu", acik && "qt-ia--acik", className]
    .filter(Boolean).join(" ");
  const duz = typeof children === "string" || typeof children === "number";
  return (
    <span className={s} data-ef="altin">
      <span className="qt-ia-yazi">
        <span className="qt-ia-serit" aria-hidden="true" />
        {/* Kontur kopyası metin düğümü DEĞİL, ::before içeriği (data-ad): seçim/kopyalama ve innerText adı iki kez almasın */}
        {duz ? <span className="qt-ia-kontur" aria-hidden="true" data-ad={String(children)} />
          : <span className="qt-ia-kontur" aria-hidden="true">{children}</span>}
        <span className="qt-ia-dolgu">{children}</span>
      </span>
    </span>
  );
}
