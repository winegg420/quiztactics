/**
 * ROZET MADALYONU — oyunun her yerindeki rozet görseli (profil › rozetler, vitrin, oyuncu kartı, maç sonu, bildirim).
 * 25 Eyl 2026 (Ida seçimi, Bölüm 10 "Madalyon"): çizim oyun/tasarim/rozet/Madalyon.jsx — temel amblem (kendi zemin
 * rengi + sembolü) × seviye (kademe) süsü + gerekiyorsa eşik rakamı. Eski tek tip madalyon (grup sembolü + nokta)
 * kalktı. API aynı; `anahtar` ve `ikon` verilirse rozete özgü amblem ve rakam seçilir (verilmezse grup amblemi).
 *
 * <RozetMadalyonu anahtar="klasik_50" grup="klasik" kademe="gumus" ikon="trophy" boyut={64} />
 * <RozetMadalyonu grup="gizli" gizli boyut={40} />
 */
import Madalyon, { KADEMELER } from "../tasarim/rozet/Madalyon.jsx";

export { KADEMELER };

/** Geriye uyum: eski çağrılar `sembol={rozetSembolu(ikon)}` verirdi; artık amblemi `ikon` seçer. */
export function rozetSembolu() {
  return null;
}

export default function RozetMadalyonu({ anahtar, grup, kademe = "bronz", ikon, boyut = 48, kilitli = false, gizli = false,
  hareketli = false, etiket, className = "" }) {
  return (
    <Madalyon anahtar={anahtar} grup={grup} kademe={kademe} ikon={ikon} boyut={boyut} kilitli={kilitli} gizli={gizli}
              hareketli={hareketli} etiket={etiket} className={className} />
  );
}
