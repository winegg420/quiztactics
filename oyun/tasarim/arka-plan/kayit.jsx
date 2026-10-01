/**
 * KART ARKA PLANI KAYDI — oyundaki oyuncu kartlarının arkasına giren arka planlar (avatarın arkasındaki eski
 * "premium_aura" çiziminin yerine).
 *
 * YENİ ARKA PLAN EKLEMEK = bu dosyada TEK SATIR (KAYIT) + katalogda kalemi aktif=true yapmak.
 * Anahtar = premium sanat anahtarı (pa_sualti → "sualti", bkz. lib/kozmetik.js › premiumSanat).
 * Değer = { ad, Bilesen } — Bilesen, KartArkaPlan ile aynı props'u alır ({ hareketli, yukseklik, katman, duzen, className }).
 *
 * Kaydı olmayan (ya da henüz kart karşılığı çizilmemiş) arka plan → kart eskisi gibi düz kalır, hata yok.
 *
 * Kullanım (kartın kendi öğesi kalır; arka plan İÇİNE katman olarak girer):
 *   const sanat = useKartArkaPlani(userId, kart);
 *   <div className={`kart${kartArkaPlanSinifi(sanat)}`}> <KartArkaPlanKatmani sanat={sanat} hareketli />  …içerik… </div>
 */
import { useEffect, useState } from "react";
import { oyuncuKarti, oyuncuKartiDinle } from "../../lib/cerceve.js";
import { premiumSanat } from "../../lib/kozmetik.js";
import KartArkaPlan from "./KartArkaPlan.jsx";
import YildizliGeceArkaPlan from "./YildizliGeceArkaPlan.jsx";
// Yükselen Köz ve Kuzey Işıkları oyuna GİRMEZ (Ida, 30 Eyl 2026): dosyalar durur, migration 690'da aktif=false kalır.
// import KozArkaPlan from "./KozArkaPlan.jsx";
// import KuzeyIsiklariArkaPlan from "./KuzeyIsiklariArkaPlan.jsx";

// ---- KAYIT: yeni arka plan = bir satır. ----
export const KAYIT = {
  sualti: { ad: "Su Altı", Bilesen: (p) => <KartArkaPlan tur="su" {...p} /> },
  kar: { ad: "Yağan Kar", Bilesen: (p) => <KartArkaPlan tur="kar" {...p} /> },
  yaprak: { ad: "Düşen Sonbahar Yaprakları", Bilesen: (p) => <KartArkaPlan tur="yaprak" {...p} /> },
  // kor: { ad: "Yükselen Köz", Bilesen: KozArkaPlan },
  gece: { ad: "Yıldızlı Gece", Bilesen: YildizliGeceArkaPlan },
  // kuzey: { ad: "Kuzey Işıkları", Bilesen: KuzeyIsiklariArkaPlan },
  // 821 · LİG ARKA PLANI (varsayılan): arka plan takılı değilse oyuncunun ligine göre `lig_<lig>` satırı kullanılır
  // (lig_bronz · lig_gumus · lig_altin · lig_elmas · lig_efsane). Çizimleri HENÜZ YOK → satır yok → kart düz kalır.
  // Çizim gelince buraya satır eklemek yeter; sunucu ve kartlar değişmez.
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Kayıtta varsa oyuncunun lig arka planının anahtarı (`lig_<lig>`), yoksa null. */
const ligArkaPlani = (lig) => (lig && KAYIT[`lig_${lig}`] ? `lig_${lig}` : null);

/**
 * Oyuncunun takılı arka planının sanat anahtarı (kayıtlıysa); takılı yoksa lig arka planı (kayıtlıysa); o da yoksa null.
 * `kart` verilmişse ve alanı taşıyorsa ek sorgu yok.
 */
export function useKartArkaPlani(userIdHam, kart) {
  const userId = typeof userIdHam === "string" && UUID.test(userIdHam) ? userIdHam : null;
  const kartta = kart != null && Object.prototype.hasOwnProperty.call(kart, "premium_aura");
  const [okunan, setOkunan] = useState(null);
  const [okunanLig, setOkunanLig] = useState(null);
  const [tazele, setTazele] = useState(0);
  useEffect(() => {
    if (kartta || !userId) return undefined;
    return oyuncuKartiDinle((id) => { if (!id || id === userId) setTazele((x) => x + 1); });
  }, [kartta, userId]);
  useEffect(() => {
    if (kartta || !userId) { setOkunan(null); return undefined; }
    let aktif = true;
    oyuncuKarti(userId)
      .then((k) => { if (aktif) { setOkunan(k?.premium_aura ?? null); setOkunanLig(k?.lig ?? null); } })
      .catch((e) => { console.warn("[Bildim] arka plan okunamadı:", e?.message ?? e); if (aktif) setOkunan(null); });
    return () => { aktif = false; };
  }, [kartta, userId, tazele]);
  const sanat = premiumSanat(kartta ? kart.premium_aura : okunan);
  if (sanat && KAYIT[sanat]) return sanat;
  return ligArkaPlani(kartta ? kart.lig : okunanLig);   // 821: hiçbiri takılı değil → lig arka planı
}

/** Kart öğesine eklenecek sınıf (yalnız arka plan varsa; başında boşluk). */
export const kartArkaPlanSinifi = (sanat) => (sanat && KAYIT[sanat] ? " abp-sahip" : "");

/** Kartın İÇİNE ilk çocuk olarak konur. `sanat` yoksa hiçbir şey çizmez. */
export function KartArkaPlanKatmani({ sanat, hareketli = false, yukseklik = 100, duzen = "yatay" }) {
  const K = sanat ? KAYIT[sanat] : null;
  if (!K) return null;
  return <K.Bilesen katman hareketli={hareketli} yukseklik={yukseklik} duzen={duzen} />;
}

/**
 * Kart öğesi + arka plan tek parça (kartın kendi öğesi olarak div): `userId` yoksa/arka plan yoksa düz div.
 * Kart bir bileşen içinde değil de liste `map`'inde çiziliyorsa (kanca kullanılamayan yer) bunu kullan.
 */
export function KartArkaPlanSahibi({ userId, kart, hareketli = false, yukseklik = 100, duzen = "yatay", className = "", children, ...ek }) {
  const sanat = useKartArkaPlani(userId, kart);
  return (
    <div className={`${className}${kartArkaPlanSinifi(sanat)}`.trim()} {...ek}>
      <KartArkaPlanKatmani sanat={sanat} hareketli={hareketli} yukseklik={yukseklik} duzen={duzen} />
      {children}
    </div>
  );
}
