// ============================================================
// DURUM KUTUSU (Paket 41 A) — ortak yükleniyor / hata / boş durumu
//
// Kural: veri gelmezse oyuncuya SAHTE değer ("0 puan", "0 maç") ya da boş durum
// ("Henüz arkadaşın yok") gösterilmez — hata ayrı bir durumdur ve "Tekrar dene"
// ile çıkılır. Ham sunucu metni oyuncuya gösterilmez; çağıran console.error'a yazar.
//
//   <DurumKutusu durum="yukleniyor" />               iskelet (sahte veri yok)
//   <DurumKutusu durum="hata" onTekrar={yukle} />      maskot + "Yüklenemedi." + Tekrar dene
//   <DurumKutusu durum="bos">…mevcut boş durum…</DurumKutusu>
//   durum başka bir şeyse (ör. "hazir") children çizilir.
// ============================================================
import { useEffect, useState } from "react";
import Maskot from "./Maskot.jsx";
import { tt } from "../lib/dil.js";

export default function DurumKutusu({ durum, onTekrar, children, satir = 3, kucuk = false, metin }) {
  if (durum === "yukleniyor") {
    return (
      <div className={`bd-durum bd-durum-yukleniyor${kucuk ? " kucuk" : ""}`} role="status" aria-busy="true">
        <span className="bd-gorsel-gizli">{tt("Yükleniyor…")}</span>
        {Array.from({ length: satir }).map((_, i) => (
          <span key={i} className="bd-iskelet" aria-hidden="true" />
        ))}
      </div>
    );
  }
  if (durum === "hata") {
    return (
      <div className={`bd-durum bd-durum-hata bd-bos-durum${kucuk ? " kucuk" : ""}`} role="alert">
        {!kucuk && <Maskot poz="dusunuyor" boyut={72} />}
        <p>
          <b>{tt("Yüklenemedi.")}</b>{" "}
          {metin ?? tt("Bağlantını kontrol edip tekrar dene.")}
        </p>
        {onTekrar && (
          <button type="button" className="btn" onClick={onTekrar}>
            {tt("Tekrar dene")}
          </button>
        )}
      </div>
    );
  }
  return children ?? null;
}

/**
 * Veri hiç gelmezse sonsuza dek "yükleniyor" kalınmasın: `aktif` süre boyunca
 * doğru kalırsa true döner (çağıran bunu hata gibi gösterir). `aktif` false olunca sıfırlanır.
 */
export function useZamanAsimi(aktif, ms = 12000) {
  const [doldu, setDoldu] = useState(false);
  useEffect(() => {
    if (!aktif) { setDoldu(false); return undefined; }
    const t = setTimeout(() => setDoldu(true), ms);
    return () => clearTimeout(t);
  }, [aktif, ms]);
  return doldu;
}
