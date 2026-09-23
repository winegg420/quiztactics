// ============================================================
// DURUM KUTUSU (Paket 41 A) — ortak yükleniyor / hata / boş durumu
//
// Kural: veri gelmezse oyuncuya SAHTE değer ("0 puan", "0 maç") ya da boş durum
// ("Henüz arkadaşın yok") gösterilmez — hata ayrı bir durumdur ve "Tekrar dene"
// ile çıkılır. Ham sunucu metni oyuncuya gösterilmez; çağıran console.error'a yazar.
//
//   <DurumKutusu durum="yukleniyor" />               iskelet (sahte veri yok)
//   <DurumKutusu durum="hata" onTekrar={yukle} />      uyarı ikonu + "Yüklenemedi." + Tekrar dene
//   <DurumKutusu durum="bos">…mevcut boş durum…</DurumKutusu>
//   durum başka bir şeyse (ör. "hazir") children çizilir.
// Tasarım A: QtIskelet + QtBosDurum. Prop arayüzü aynı (12 ekran kullanır).
// ============================================================
import { useEffect, useState } from "react";
import { tt } from "../lib/dil.js";
import { QtBosDurum, QtDugme, QtIskelet } from "../tasarim/index.js";
import "../tasarim/ekranlar/dukkan-bilesen.css";

export default function DurumKutusu({ durum, onTekrar, children, satir = 3, kucuk = false, metin }) {
  if (durum === "yukleniyor") {
    return (
      <div className={`qt-dk-durum${kucuk ? " qt-dk-durum--kucuk" : ""}`} role="status" aria-busy="true">
        <span className="qt-gizli">{tt("Yükleniyor…")}</span>
        <QtIskelet tur="metin" adet={satir} />
      </div>
    );
  }
  if (durum === "hata") {
    const eylem = onTekrar
      ? <QtDugme tur="ikincil" boyut="k" ikon="yenile" onClick={onTekrar}>{tt("Tekrar dene")}</QtDugme>
      : null;
    if (kucuk) {
      return (
        <div className="qt-dk-durum qt-dk-durum--kucuk qt-dk-durum-hata" role="alert">
          <p>
            <b>{tt("Yüklenemedi.")}</b>{" "}
            {metin ?? tt("Bağlantını kontrol edip tekrar dene.")}
          </p>
          {eylem}
        </div>
      );
    }
    return (
      <div className="qt-dk-durum" role="alert">
        <QtBosDurum
          ikon="uyari"
          ton="yanlis"
          baslik={tt("Yüklenemedi.")}
          metin={metin ?? tt("Bağlantını kontrol edip tekrar dene.")}
          eylem={eylem}
        />
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
