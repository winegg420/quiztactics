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
import { TacIkon } from "../tasarim/sezon-yolu/simgeler.jsx";
import { QtIkon } from "../tasarim/index.js";
import { koleksiyonSayi } from "../lib/koleksiyon.js";
import { oyuncuKarti, oyuncuKartiDinle } from "../lib/cerceve.js";
import { KartArkaPlanKatmani, kartArkaPlanSinifi, useKartArkaPlani } from "../tasarim/arka-plan/kayit.jsx";
import { LIG_ADLARI } from "../lib/lig.js";
import { BpKartCerceve } from "../tasarim/lig-sahnesi/BpCizimler.jsx";
import LigSahneArka from "../tasarim/lig-sahnesi/LigSahneArka.jsx";
import LigSahnesiImza from "../tasarim/lig-sahnesi/LigSahnesiImza.jsx";
import { ESKI_GORUNUM, CANLI_BP_CERCEVE, CANLI_LIG_VARYANT, CANLI_SAHNE_ARKA } from "../tasarim/lig-sahnesi/canliGorunum.js";
import { tt } from "../lib/dil.js";
import "../tasarim/ekranlar/oyuncu-vitrin-karti.css";
import "../tasarim/ekranlar/koleksiyon-puani.css";
import { gorunenAd } from "../lib/oyuncu.js";

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

/** Lig amblemi + lig adı + level hapı + (bp) taç ikonlu Battle Pass rozeti. */
export function KartLigSatiri({ lig, level, yazi = true, amblem = 22, bp = false }) {
  return (
    <span className="qt-ok-satir">
      {lig && (
        <span className="qt-ok-lig">
          <LigAmblemi lig={lig} boyut={amblem} />
          {yazi && <span>{tt("{lig} Lig", { lig: tt(LIG_ADLARI[lig] ?? lig) })}</span>}
        </span>
      )}
      {level != null && <span className="qt-ok-lv qt-sayi">{tt("Lv {0}", { 0: level })}</span>}
      {bp && (
        <span className="qt-ok-bp" title={tt("Battle Pass")}>
          <TacIkon boyut={13} /> {tt("BP")}
        </span>
      )}
    </span>
  );
}

export default function OyuncuVitrinKarti({ userId, profile, kart: verilenKart, boyut = 88, hareketli = false, kompakt = false,
  className = "", avatarEk = null, adEk = null, arkaPlan = false, ligSahnesi = false, sahneImza = false, koleksiyonCipi = true, bp, bpHalkasiYok: bpHalkasiYokProp = false, varyant: varyantProp = null, ligVaryant: ligVaryantProp = null, sahneArka: sahneArkaProp = null,
  eskiGorunum = ESKI_GORUNUM, children }) {
  // 9 Eki (canlıya alma): eskiGorunum false (varsayılan) → onaylı görünüm (BP Çerçeve 2, halka yok, Arka plan 2, Elmas/Efsane V2).
  // true → proplar eskisi gibi elle verilir (önizleme "Eski" sekmesi, geri alma). Ayar: tasarim/lig-sahnesi/canliGorunum.js
  const bpHalkasiYok = eskiGorunum ? bpHalkasiYokProp : true;
  const varyant = eskiGorunum ? varyantProp : (varyantProp ?? CANLI_BP_CERCEVE);
  const ligVaryant = eskiGorunum ? ligVaryantProp : (ligVaryantProp ?? CANLI_LIG_VARYANT);
  const sahneArka = eskiGorunum ? sahneArkaProp : (sahneArkaProp ?? CANLI_SAHNE_ARKA);
  // 9 Eki: `varyant` ("v1"|"v2"|"v3") yalnız /lig-sahne-onizleme verir — köşeli BP kart çerçevesi (SVG; avatar arkası halka yok)
  // + Elmas/Efsane yeni çerçeve. null (canlıdaki her kullanım) → DOM ve görünüm eskisiyle aynı.
  // 9 Eki (4. tur): ligVaryant (Elmas/Efsane çizimi, ör. "onayli") ve sahneArka ("a1"|"a2"|"a3" yeni arka plan) yalnız önizleme.
  const kart = useOyuncuKarti(userId, verilenKart);
  // 30 Eyl: arkaPlan → takılı kart arka planı kartın arkasında (yalnız profil sayfası ister; diğer kullananlar aynı)
  const arkaPlanSanat = useKartArkaPlani(arkaPlan ? userId : null, kart ?? undefined);
  const ad = gorunenAd(kart?.ad ?? profile?.gorunen_ad);
  const profil = profile ?? (kart ? { id: kart.id, gorunen_ad: kart.ad, gorunen_avatar: kart.avatar } : {});
  // Sezon Yolu (720): BP sahipliği kart'ta zaten var (oyuncu_kartlari.sezon_bp) — yeni sorgu yok.
  const bpAktif = bp !== undefined ? bp : kart?.sezon_bp === true;
  // 8 Eki: yeni lig sahnesi (imza çizimi) — yalnız ligSahnesi + sahneImza birlikteyken
  const imza = ligSahnesi && sahneImza;
  return (
    <div className={`qt-ok${kompakt ? " qt-ok--kompakt" : ""}${ligSahnesi ? " qt-ok--lig-sahnesi" : ""}${imza ? " qt-ok--sahne-v2" : ""}${bpAktif ? " qt-ok--bp" : ""}${bpAktif && varyant ? ` qt-ok--bpk qt-ok--bpk-${varyant}` : ""}${kartArkaPlanSinifi(arkaPlanSanat)} ${className}`.trim()}
      {...(ligSahnesi ? { "data-lig": kart?.lig ?? "" } : {})} {...(imza ? { style: { "--ok-av": `${boyut}px` } } : {})}>
      {bpAktif && ligSahnesi && ["ust-sol", "ust-sag", "alt-sol", "alt-sag"].map((k) => <i key={k} className={`qt-ok-percin qt-ok-percin--${k}`} aria-hidden="true" />)}
      {bpAktif && varyant && <BpKartCerceve varyant={varyant} />}
      <KartArkaPlanKatmani sanat={arkaPlanSanat} hareketli={hareketli} yukseklik={220} duzen="dikey" />
      {imza && <LigSahnesiImza lig={kart?.lig} />}
      {ligSahnesi && sahneArka && kart?.lig && <LigSahneArka lig={kart.lig} seviye={sahneArka} />}
      {ligSahnesi && kart?.lig && (
        <span className="qt-ok-filigran" aria-hidden="true">
          <LigAmblemi lig={kart.lig} boyut={140} />
        </span>
      )}
      <div className="qt-ok-avatar">
        <CerceveliAvatar profile={profil} userId={userId} boyut={boyut} hareketli={hareketli} {...(kart ? { kart } : {})} {...(bpHalkasiYok ? { sezonBp: false } : {})} {...(ligVaryant || varyant ? { ligVaryant: ligVaryant ?? varyant } : {})} eskiGorunum={eskiGorunum} />
        {avatarEk}
      </div>
      <p className="qt-ok-ad">
        <span className="qt-ok-ad-metin"><IsimEfekti userId={userId} kart={kart ?? undefined} koyu={!ligSahnesi} hareketli={hareketli}>{ad}</IsimEfekti></span>
        {adEk}
      </p>
      {kart?.unvan && <UnvanYazisi unvan={kart.unvan} boy={kompakt ? "k" : "o"} />}
      <KartLigSatiri lig={kart?.lig} level={kart?.level} yazi={!kompakt} amblem={kompakt ? 20 : 24} bp={bpAktif} />
      {koleksiyonCipi && <KartKoleksiyonu puan={kart?.koleksiyon_puani} />}
      {kart?.vitrin?.length > 0 && <VitrinRozetleri vitrin={kart.vitrin} boyut={kompakt ? 28 : 36} className="qt-ok-vitrin" />}
      {children}
    </div>
  );
}
