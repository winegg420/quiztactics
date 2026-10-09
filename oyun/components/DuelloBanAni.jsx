// ============================================================
// DÜELLO — SAVUNMA BANI "AN"LARI (Ida, 2 Eki 2026)
//
// Kural ve ban mantığı SUNUCUDA (853); burası yalnız sunum: ban fazının hissi.
//   · BanKonsol    — ban fazında mesaj satırının yerine geçen durum satırı (aynı yuva, aynı yükseklik):
//                    savunanda dolu kırmızı "BAN SIRASI SENDE" + geri sayım; saldıranda "Rakip ban seçiyor…".
//   · BanGirisAni  — savunanın faz girişi: damga + uyarı sesi + titreşim (~1 sn; dokunuşu engellemez).
//   · BanAciklama  — ban → kategori geçişi: saldırana "RAKİP BANLADI" açıklaması (plaka banlı karta uçar),
//                    ardından mavi "SIRA SENDE"; savunana "BANLADIN" onayı ya da "BAN KULLANILMADI".
//   · banIpucuGoster — ilk 3 Düello'da, maç başına bir kez (ilk savunma banında) ipucu.
// Renk rolü: kırmızı = Düello / rakip, mavi = ben. Sesler ve titreşim mevcut yapı taşları; ikisi de kendi
// kapısından geçer (ses ayarı, "Efektler", hareketi azalt). Yumuşak mod (data-yumusak): sabit damga + solma.
// iOS: position:fixed YOK — bütün katmanlar sahnenin içinde, absolute.
// ============================================================
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import KategoriIkon from "./KategoriIkon.jsx";
import { kategoriAdi } from "../lib/kategoriler.js";
import { QtIkon, sinif } from "../tasarim/index.js";
import { titret } from "../lib/geriBildirim.js";
import { sesSonSaniyeler, sesHataUyari, sesKategoriSecildi, sesTurGecis } from "../lib/ses.js";
import "../styles/duello-ban.css";
import { sure, varsayilanSure } from "../lib/sureler.js";

/** Savunanın faz girişi damgası (ms). Ban fazının gösterim payı (duello_gosterim_payi_ms) içinde kalır. */
const GIRIS_MS = varsayilanSure("duello_ban_giris");   // geçerli: sure() — lib/sureler.js
/** Saldırana ban açıklaması (ms) — sunucudaki duello_ban_gosterim_ms (880) ile aynı: seçme süresinden yemez. */
export const BAN_ACIKLAMA_MS = varsayilanSure("duello_ban_aciklama");
const ONAY_MS = varsayilanSure("duello_ban_onay");      // savunan: "BANLADIN"
const BILGI_MS = varsayilanSure("duello_ban_bilgi");     // savunan: "BAN KULLANILMADI"
const SIRA_MS = varsayilanSure("duello_ban_sira");       // saldıran: mavi "SIRA SENDE"
const SIRA_BILGI_MS = varsayilanSure("duello_ban_sira_bilgi"); // saldıran, rakip banlamadıysa: bilgi satırıyla biraz uzun

// Ses + titreşim faz başına BİR kez (StrictMode çift efekti ve yeniden bağlanma çift çalmasın).
const calinanlar = new Set();
function birKez(anahtar, fn) {
  if (calinanlar.has(anahtar)) return;
  if (calinanlar.size > 80) calinanlar.clear();
  calinanlar.add(anahtar);
  fn();
}

const IPUCU_ANAHTARI = "qt_duello_ban_ipucu";
const IPUCU_MAC_SAYISI = 3;
/** İlk 3 Düello'da, maçın yalnız İLK savunma banında true (kayıt cihazda; okunamazsa ipucu gösterilmez). */
export function banIpucuGoster(macId, tur) {
  try {
    const ham = JSON.parse(window.localStorage.getItem(IPUCU_ANAHTARI) || "[]");
    const liste = Array.isArray(ham) ? ham : [];
    const bu = liste.find((x) => x?.m === macId);
    if (bu) return bu.t === tur;
    if (liste.length >= IPUCU_MAC_SAYISI) return false;
    window.localStorage.setItem(IPUCU_ANAHTARI, JSON.stringify([...liste, { m: macId, t: tur }]));
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- durum satırı
/**
 * Ban fazının durum satırı (HkMesaj'ın yuvasında; children = tepki düğmesi).
 * bekleyen: savunanın az önce dokunduğu kategori (sunucu yanıtı gelene dek "Banladın: X").
 */
export function BanKonsol({ benSaldiran, sn, oran, bekleyen, c, children }) {
  const rakam = Math.max(0, Math.ceil(Number(sn) || 0));
  const son = !benSaldiran && !bekleyen && rakam > 0 && rakam <= 2;
  const dolu = Math.round(Math.max(0, Math.min(1, Number(oran) || 0)) * 100);
  return (
    <div className={sinif("hk-mesaj hk-bankonsol", benSaldiran ? "hk-bankonsol--bekle" : "hk-bankonsol--sec",
                          bekleyen && "hk-bankonsol--tamam", son && "hk-bankonsol--son")}>
      <span className="hk-bankonsol-sayi qt-sayi" aria-label={`${rakam} ${c("sn")}`}>
        {bekleyen ? <QtIkon ad="ban" boyut={20} /> : rakam}
      </span>
      <div className="hk-mesaj-yazi" role={benSaldiran ? "status" : "alert"}>
        {benSaldiran ? (
          <>
            <b>{c("Rakip ban seçiyor…")}</b>
            <span>{c("Bir kategorin bu tur kapanacak")}</span>
          </>
        ) : bekleyen ? (
          <>
            <b>{c("Banladın: {kat}", { kat: c(kategoriAdi(bekleyen)) })}</b>
            <span>{c("Rakip bu tur seçemez")}</span>
          </>
        ) : (
          <>
            <b><QtIkon ad="ban" boyut={15} /> {c("BAN SIRASI SENDE")}</b>
            <span>{c("Bir karta dokun · rakip oradan saldıramaz")}</span>
          </>
        )}
      </div>
      {children}
      {!bekleyen && <span className="hk-bankonsol-sure" aria-hidden="true"><i style={{ width: `${dolu}%` }} /></span>}
    </div>
  );
}

// ---------------------------------------------------------------- savunan: faz girişi
/** Savunan ban fazına girdi: kırmızı damga sahnenin ortasına iner, konsola doğru çekilir. Dokunuşu engellemez. */
export function BanGirisAni({ anahtar, tur, maxTur, c }) {
  const [acik, setAcik] = useState(true);
  useEffect(() => {
    birKez(`giris:${anahtar}`, () => {
      titret([40, 60, 40]);
      setTimeout(() => sesSonSaniyeler(), 160);   // tur geçiş sesinin hemen ardından (üst üste binmesin)
    });
    const zaman = setTimeout(() => setAcik(false), sure("duello_ban_giris"));
    return () => clearTimeout(zaman);
  }, [anahtar]);
  if (!acik) return null;
  return (
    <div className="hk-banan hk-banan--giris" data-yumusak="" aria-hidden="true" style={{ "--ban-ms": `${sure("duello_ban_giris")}ms` }}>
      <span className="hk-banan-perde" />
      <div className="hk-banan-panel hk-banan-panel--kirmizi">
        <span className="hk-banan-etiket">{c("Tur {n}/{t}", { n: tur, t: maxTur })}</span>
        <span className="hk-banan-rozet">
          <QtIkon ad="ban" boyut={44} />
          <i className="hk-banan-halka" />
        </span>
        <b className="hk-banan-baslik">{c("BAN SIRASI SENDE")}</b>
        <span className="hk-banan-alt">{c("Bir kategoriyi kapat")}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- ban → kategori geçişi
/**
 * Ban fazı kapandı. kategori = banlanan (null: ban kullanılmadı).
 * Saldıran: açıklama (BAN_ACIKLAMA_MS) → mavi "SIRA SENDE". Savunan: onay ya da "ban kullanılmadı".
 * Plaka kapanırken aynı sahnedeki banlı karta (.hk-kart[data-kategori]) doğru küçülerek uçar.
 */
export function BanAciklama({ anahtar, benSaldiran, kategori, c }) {
  const kokRef = useRef(null);
  const panelRef = useRef(null);
  const [asama, setAsama] = useState(benSaldiran && !kategori ? "sira" : "acik");
  const acikMs = sure(benSaldiran ? "duello_ban_aciklama" : kategori ? "duello_ban_onay" : "duello_ban_bilgi");
  const siraMs = sure(kategori ? "duello_ban_sira" : "duello_ban_sira_bilgi");

  useEffect(() => {
    const zamanlar = [];
    if (benSaldiran && kategori) {
      birKez(`acik:${anahtar}`, () => { sesHataUyari(); titret([35, 60, 20]); });
      zamanlar.push(setTimeout(() => {
        setAsama("sira");
        birKez(`sira:${anahtar}`, () => { sesTurGecis(); titret(15); });
      }, acikMs));
      zamanlar.push(setTimeout(() => setAsama(null), acikMs + siraMs));
    } else if (benSaldiran) {
      birKez(`sira:${anahtar}`, () => { sesTurGecis(); titret(15); });
      zamanlar.push(setTimeout(() => setAsama(null), siraMs));
    } else {
      birKez(`acik:${anahtar}`, () => {
        if (kategori) { sesKategoriSecildi(); titret([15, 40, 25]); }
        else { sesHataUyari(); titret(45); }
      });
      zamanlar.push(setTimeout(() => setAsama(null), acikMs));
    }
    return () => zamanlar.forEach(clearTimeout);
  }, [anahtar, benSaldiran, kategori, acikMs, siraMs]);

  // Plakanın çıkış hedefi: banlı kartın merkezi (yalnız sunum; kart bulunamazsa yerinde solar).
  useLayoutEffect(() => {
    if (asama !== "acik" || !kategori) return;
    const panel = panelRef.current;
    const kart = kokRef.current?.parentElement?.querySelector(`.hk-kart[data-kategori="${kategori}"]`);
    if (!panel || !kart) return;
    const p = panel.getBoundingClientRect();
    const k = kart.getBoundingClientRect();
    panel.style.setProperty("--dx", `${Math.round(k.left + k.width / 2 - (p.left + p.width / 2))}px`);
    panel.style.setProperty("--dy", `${Math.round(k.top + k.height / 2 - (p.top + p.height / 2))}px`);
  }, [asama, kategori]);

  if (asama === "sira") {
    return (
      <div className="hk-bansira" data-yumusak="" role="status" style={{ "--ban-ms": `${siraMs}ms` }}>
        <span>
          <QtIkon ad="kilic" boyut={20} />
          <span className="hk-bansira-yazi">
            <b>{c("SIRA SENDE")}</b>
            <small>{kategori ? c("Kategorini seç") : c("Rakip ban kullanmadı · hepsi açık")}</small>
          </span>
        </span>
      </div>
    );
  }
  if (asama !== "acik") return null;

  if (!kategori) {
    return (
      <div className="hk-banan hk-banan--bilgi" data-yumusak="" role="status" ref={kokRef} style={{ "--ban-ms": `${acikMs}ms` }}>
        <div className="hk-banan-panel hk-banan-panel--gri">
          <span className="hk-banan-rozet hk-banan-rozet--gri"><QtIkon ad="ban" boyut={34} /></span>
          <b className="hk-banan-baslik hk-banan-baslik--kucuk">{c("BAN KULLANILMADI")}</b>
          <span className="hk-banan-alt">{c("Süre doldu · rakip her kategoriden saldırabilir")}</span>
        </div>
      </div>
    );
  }
  return (
    <div className={sinif("hk-banan", benSaldiran ? "hk-banan--acik" : "hk-banan--onay")} data-yumusak="" role="status"
         ref={kokRef} style={{ "--ban-ms": `${acikMs}ms` }}>
      <span className="hk-banan-perde" aria-hidden="true" />
      <div className="hk-banan-panel hk-banan-panel--ucar" ref={panelRef}>
        <span className="hk-banan-etiket">{benSaldiran ? c("RAKİP BANLADI") : c("BANLADIN")}</span>
        <span className="hk-banan-kat">
          <KategoriIkon anahtar={kategori} boyut={54} plaka />
          <span className="hk-banan-damga" aria-hidden="true"><QtIkon ad="ban" boyut={78} /></span>
          <i className="hk-banan-halka" aria-hidden="true" />
        </span>
        <b className="hk-banan-baslik">{c(kategoriAdi(kategori))}</b>
        <span className="hk-banan-alt">{benSaldiran ? c("Bu tur seçemezsin") : c("Rakip bu tur seçemez")}</span>
      </div>
    </div>
  );
}
