/**
 * TEK OYUNCU KARTI — "A — Vitrin kartı (dikey)" (Ida seçimi 25 Eyl 2026, Bölüm 4 + düzeltme 4).
 * Her şey ortada, yukarıdan aşağı: çerçeveli avatar (çerçeve + arka plan) → isim (altın isim dahil) → unvan (Kurdele)
 * → lig amblemi + lig + level → 3 vitrin rozeti (Madalyon). Tek veri kaynağı oyuncu_kartlari (cerceve.js; toplu +
 * önbellekli → aynı karede kaç kart olursa olsun tek istek, N+1 yok).
 *
 * <OyuncuVitrinKarti userId={id} profile={p} boyut={88} hareketli />      — profil başı, oyuncu kartı penceresi
 * <OyuncuVitrinKarti … kompakt />                                          — dar yerler
 * Küçük hâl (maç şeridi, lig tablosu satırı, VS sahnesi) aynı kaynaktan parçalarla: <KartUnvani>, <KartLigSatiri>.
 * Uzun isim ve "Afyonkarahisar Şampiyonu" 360 px'te tek satır, sığmazsa "…" (taşma yok).
 */
import { useEffect, useState } from "react";
import CerceveliAvatar from "./CerceveliAvatar.jsx";
import IsimEfekti from "./IsimEfekti.jsx";
import VitrinRozetleri from "./VitrinRozetleri.jsx";
import UnvanYazisi from "./UnvanYazisi.jsx";
import { LigAmblemi } from "../tasarim/premium/ligAmblemi.jsx";
import { QtIkon } from "../tasarim/index.js";
import { koleksiyonSayi } from "../lib/koleksiyon.js";
import { oyuncuKarti, oyuncuKartiDinle } from "../lib/cerceve.js";
import { LIG_ADLARI } from "../lib/lig.js";
import { tt } from "../lib/dil.js";
import "../tasarim/ekranlar/oyuncu-vitrin-karti.css";
import "../tasarim/ekranlar/koleksiyon-puani.css";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Oyuncu kartı verisi (verilmişse o; yoksa önbellekli toplu okuma). Önizlemedeki sahte kimlikler sunucuya gitmez. */
export function useOyuncuKarti(userIdHam, verilen) {
  const userId = typeof userIdHam === "string" && UUID.test(userIdHam) ? userIdHam : null;
  const [kart, setKart] = useState(verilen ?? null);
  const [tazele, setTazele] = useState(0);
  useEffect(() => {
    if (verilen !== undefined || !userId) return undefined;
    return oyuncuKartiDinle((id) => { if (!id || id === userId) setTazele((x) => x + 1); });
  }, [verilen, userId]);
  useEffect(() => {
    if (verilen !== undefined) { setKart(verilen); return undefined; }
    if (!userId) { setKart(null); return undefined; }
    let aktif = true;
    oyuncuKarti(userId)
      .then((k) => { if (aktif) setKart(k ?? null); })
      .catch((e) => { console.warn("[Bildim] oyuncu kartı okunamadı:", e?.message ?? e); if (aktif) setKart(null); });
    return () => { aktif = false; };
  }, [verilen, userId, tazele]);
  return kart;
}

/** Kartın unvanı (küçük hâl: liste, maç şeridi). Unvan yoksa hiçbir şey çizmez. */
export function KartUnvani({ userId, kart, boy = "k", className = "" }) {
  const k = useOyuncuKarti(userId, kart);
  return k?.unvan ? <UnvanYazisi unvan={k.unvan} boy={boy} className={className} /> : null;
}

/** Koleksiyon Puanı tek sayı ("Koleksiyon 1.240"; 646). Puan yoksa çizilmez. */
export function KartKoleksiyonu({ puan, className = "" }) {
  if (!(puan > 0)) return null;
  return <span className={`qt-ok-kp ${className}`.trim()}><QtIkon ad="yildiz" boyut={14} />{tt("Koleksiyon {n}", { n: koleksiyonSayi(puan) })}</span>;
}

/** Lig amblemi + lig adı + level hapı. */
export function KartLigSatiri({ lig, level, yazi = true, amblem = 22 }) {
  return (
    <span className="qt-ok-satir">
      {lig && (
        <span className="qt-ok-lig">
          <LigAmblemi lig={lig} boyut={amblem} />
          {yazi && <span>{tt("{lig} Lig", { lig: tt(LIG_ADLARI[lig] ?? lig) })}</span>}
        </span>
      )}
      {level != null && <span className="qt-ok-lv qt-sayi">{tt("Lv {0}", { 0: level })}</span>}
    </span>
  );
}

export default function OyuncuVitrinKarti({ userId, profile, kart: verilenKart, boyut = 88, hareketli = false, kompakt = false,
  className = "", avatarEk = null, adEk = null, children }) {
  const kart = useOyuncuKarti(userId, verilenKart);
  const ad = kart?.ad ?? profile?.gorunen_ad ?? tt("Oyuncu");
  const profil = profile ?? (kart ? { id: kart.id, gorunen_ad: kart.ad, gorunen_avatar: kart.avatar } : {});
  return (
    <div className={`qt-ok${kompakt ? " qt-ok--kompakt" : ""} ${className}`.trim()}>
      <div className="qt-ok-avatar">
        <CerceveliAvatar profile={profil} userId={userId} boyut={boyut} hareketli={hareketli} {...(kart ? { kart } : {})} />
        {avatarEk}
      </div>
      <p className="qt-ok-ad">
        <span className="qt-ok-ad-metin"><IsimEfekti userId={userId} kart={kart ?? undefined} koyu hareketli={hareketli}>{ad}</IsimEfekti></span>
        {adEk}
      </p>
      {kart?.unvan && <UnvanYazisi unvan={kart.unvan} boy={kompakt ? "k" : "o"} />}
      <KartLigSatiri lig={kart?.lig} level={kart?.level} yazi={!kompakt} amblem={kompakt ? 20 : 24} />
      <KartKoleksiyonu puan={kart?.koleksiyon_puani} />
      {kart?.vitrin?.length > 0 && <VitrinRozetleri vitrin={kart.vitrin} boyut={kompakt ? 28 : 36} className="qt-ok-vitrin" />}
      {children}
    </div>
  );
}
