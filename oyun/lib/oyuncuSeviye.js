// Maç ekranı oyuncu şeridi için level + lig + takılı çerçeve (yalnız gösterim). profiles.lig
// istemciye kapalı; başkasının ligi ve çerçevesi oyuncu_kartlari RPC'siyle gelir (oyun/lib/cerceve.js,
// toplu + önbellekli). Maç verisine (RPC'ler, durum akışı) dokunmaz. Okunamazsa şerit level'siz çizilir.
import { useEffect, useState } from "react";
import { oyuncuKartlari } from "./cerceve.js";

/** @returns {{[id:string]: {level?:number, lig?:string, cerceve?:string|null, cerceve_nadirlik?:string, vs_karti?:string|null, isim_efekti?:string|null, zafer_efekti?:string|null}}} */
export function useOyuncuSeviyeleri(idler) {
  const anahtar = (idler ?? []).filter(Boolean).sort().join(",");
  const [harita, setHarita] = useState({});
  useEffect(() => {
    if (!anahtar) return undefined;
    let aktif = true;
    (async () => {
      try {
        const kartlar = await oyuncuKartlari(anahtar.split(","));
        if (!aktif) return;
        setHarita(Object.fromEntries(kartlar.filter(Boolean).map((k) => [k.id, {
          level: k.level, lig: k.lig ?? undefined, cerceve: k.cerceve ?? null, cerceve_nadirlik: k.cerceve_nadirlik,
          // 540: elmas kozmetikleri (aynı kart, ek sorgu yok)
          vs_karti: k.vs_karti ?? null, isim_efekti: k.isim_efekti ?? null, zafer_efekti: k.zafer_efekti ?? null,
          // 643: unvan (tek oyuncu kartının küçük hâli, maç şeridinde)
          unvan: k.unvan ?? null,
        }])));
      } catch (e) {
        console.warn("[Maç şeridi] oyuncu kartları okunamadı:", e?.message ?? e);
      }
    })();
    return () => { aktif = false; };
  }, [anahtar]);
  return harita;
}
