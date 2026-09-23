import { useEffect, useState } from "react";
import { QtKart, QtIkon, QtDugme } from "../tasarim/index.js";
import "../tasarim/ekranlar/l-kart.css";
import { pushDestekleniyor, bildirimleriAc, iosSekmesi } from "../lib/push.js";
import { hataMesaji } from "../lib/hata.js";
import { tt } from "../lib/dil.js";

// Paket 19 §F: anahtar sürümlendi (_v2). Paket 17 §B öncesi kod teknik hatada da "bir daha sorma" işaretini
// koyuyordu; eski işaretli herkes kartı bir kez daha görür. Eski anahtar (`bildim_bildirim_sorma`) yok sayılır.
const DEPO = "bildim_bildirim_sorma_v2";
const DEPO_IOS = "bildim_bildirim_ios_ipucu";
const oku = (k) => { try { return localStorage.getItem(k); } catch { return null; /* özel mod: her oturumda sorulur */ } };
const yaz = (k) => { try { localStorage.setItem(k, "1"); } catch { /* özel mod */ } };

/**
 * Bildirim izni ilk açılışta DEĞİL, maç sonucundan ana sayfaya dönünce sorulur (Paket 36 H: Home.jsx,
 * MacSonuSahnesi oturum işareti bırakır). Önceden sonuç ekranının ortasındaydı; ödül anını kesiyordu.
 * (Oyuncu oyunu görmeden izin istemek reddedilme oranını artırıyordu.)
 *
 * Paket 17 §B: eskiden hata `catch {}` ile yutuluyor VE "bir daha sorma" işareti yine konuyordu —
 * tek bir teknik hata oyuncuyu kalıcı olarak bildirimsiz bırakıyordu, kimse de görmüyordu.
 * Şimdi: işaret yalnız oyuncu "Şimdi değil" derse, izni reddederse ya da abonelik başarılı olursa konur;
 * teknik hata konsola yazılır, kartta gösterilir, tekrar denenebilir.
 * iPhone Safari sekmesinde push yok (Apple) → kart yerine "ana ekrana ekle" ipucu (bir kez).
 */
export default function BildirimIzniSor() {
  const [durum, setDurum] = useState(null);   // null | "sor" | "ios" | "acik"
  const [calisiyor, setCalisiyor] = useState(false);
  const [hata, setHata] = useState(null);

  useEffect(() => {
    if (!pushDestekleniyor()) {
      if (iosSekmesi() && !oku(DEPO_IOS)) setDurum("ios");
      return;
    }
    if (Notification.permission !== "default") return;
    if (oku(DEPO)) return;
    setDurum("sor");
  }, []);

  if (!durum) return null;

  if (durum === "acik") {
    return (
      <IzinKart ikon="onay" ton="dogru" baslik={tt("Bildirimler açık")} />
    );
  }

  if (durum === "ios") {
    return (
      <IzinKart
        ikon="zil"
        baslik={tt("iPhone'da bildirim almak için")}
        metin={tt("Quiz Tactics'i ana ekrana ekle (Paylaş → Ana Ekrana Ekle) ve oradan aç. Apple bildirimleri yalnız ana ekrandaki uygulamaya izin veriyor.")}
      >
        <QtDugme tur="ikincil" boyut="k" onClick={() => { yaz(DEPO_IOS); setDurum(null); }}>{tt("Anladım")}</QtDugme>
      </IzinKart>
    );
  }

  const kapat = () => { yaz(DEPO); setDurum(null); };

  return (
    <IzinKart
      ikon="zil"
      baslik={tt("Bir sonraki maçı kaçırma")}
      metin={tt("Sana meydan okunduğunda, turnuva başladığında ve haftalık lig sonuçlandığında haber verelim mi?")}
      hata={hata}
    >
      <QtDugme
        tur="mor"
        boyut="k"
        ikon="zil"
        yukleniyor={calisiyor}
        onClick={async () => {
          setCalisiyor(true);
          setHata(null);
          try {
            await bildirimleriAc();
            yaz(DEPO);
            setDurum("acik");
          } catch (e) {
            console.error("[Bildim] bildirim aboneliği başarısız:", e);
            if (typeof Notification !== "undefined" && Notification.permission === "denied") kapat();   // oyuncu reddetti
            else setHata(hataMesaji(e, tt("Bildirimler açılamadı. Tekrar dene.")));
          } finally {
            setCalisiyor(false);
          }
        }}
      >
        {tt("Bildirimleri aç")}
      </QtDugme>
      <QtDugme tur="hayalet" boyut="k" onClick={kapat}>
        {tt("Şimdi değil")}
      </QtDugme>
    </IzinKart>
  );
}

/** Tasarım A: izin kartının ortak kabuğu (ikon kutusu + metin + düğmeler). */
function IzinKart({ ikon, ton = "mor", baslik, metin, hata, children }) {
  return (
    <QtKart className="bi-kart" role="region" aria-label={baslik}>
      <span className={`qt-satir-ikon qt-satir-ikon--${ton} bi-ikon`} aria-hidden="true">
        <QtIkon ad={ikon} boyut={22} />
      </span>
      <div className="bi-govde">
        <p className="bi-baslik">{baslik}</p>
        {metin && <p className="bi-metin">{metin}</p>}
        {hata && (
          <p className="bi-hata" role="alert"><QtIkon ad="uyari" boyut={16} /> <span>{hata}</span></p>
        )}
      </div>
      {children && <div className="bi-dugmeler">{children}</div>}
    </QtKart>
  );
}
