// ANA SAYFA (kök rota, 23 Eyl 2026'dan beri; önceki ana sayfa pages/Home.jsx kullanılmıyor).
// Seçenek A — TEK EKRAN (lobi), kaydırmasız. Rozet + çerçeve paketiyle yeniden düzenlendi:
// kompakt oyuncu kartı, turnuva şeridi, ÜÇ EŞİT MOD ŞERİDİ (Klasik · Düello · Ortak Hazine), canlı lig kartı, Sezon + Görevler, kısayollar.
// Masaüstü: solda oyuncu + lig, ortada oyna alanı, sağda turnuva + seanslar + görev şeridi + etkinlik.
// Görev şeridi (740–744): eski günlük görev kartı/penceresi kalktı; tek satır, dokununca /gorevler.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { QtIkon } from "../../tasarim/index.js";
import BildirimIzniSor from "../../components/BildirimIzniSor.jsx";
import { BILDIRIM_SONRA_ANAHTAR } from "../../components/MacSonuSahnesi.jsx";
import { tt } from "../../lib/dil.js";
import { useAyar } from "../../lib/ayarlar.js";
import { useAuth } from "../../../src/context/AuthContext.jsx";
import DurumKutusu, { useZamanAsimi } from "../../components/DurumKutusu.jsx";
import SezonSeridi from "../../components/sezon/SezonSeridi.jsx";
import BpTanitimPenceresi from "../../components/sezon/BpTanitimPenceresi.jsx";
import { useAnaSayfaVerisi, useOyunBaslat, useDevamEdenMaclar, sonModuYaz, sonModuOku } from "./veri.jsx";
import {
  KompaktOyuncu, LigKarti, GorevSeridi, modListesi, etkinlikler, EtkinlikSatiri,
  TurnuvaSeridi, TurnuvaSeansListesi, DevamEdenMaclarKarti, ModFiguru,
} from "./parcalar.jsx";
import "./anasayfa.css";

/**
 * Kaydırmasız sığdırma (8 Eki 2026): telefonda (≤767 px, .as-kaydirmasiz) içerik kabı aşarsa
 * kademe 0→8 artırılır (`data-sik` + birikimli `data-s1…s8` öznitelikleri) (anasayfa.css › "Sığdırma kademeleri"); her kademe yalnız boşluk,
 * yükseklik ve figür boyunu küçültür — hiçbir öğe gizlenmez. Bant gelip gidince ve ekran boyu
 * değişince yeniden ölçülür (ResizeObserver + alt ağaç değişimi, kare başına bir ölçüm).
 */
const SIK_EN_COK = 8;
function useSigdir(ref, etkin) {
  useLayoutEffect(() => {
    const kok = ref.current;
    if (!etkin || !kok || typeof window.matchMedia !== "function") return undefined;
    const telefon = window.matchMedia("(max-width: 767px)");
    let kare = 0;
    const olc = () => {
      kare = 0;
      // Birikimli öznitelikler: k. kademede data-s1 … data-sk (className React'e ait; sınıf eklenirse ilk çizimde silinirdi)
      const kur = (k) => {
        kok.dataset.sik = String(k);
        for (let i = 1; i <= SIK_EN_COK; i += 1) kok.toggleAttribute(`data-s${i}`, i <= k);
      };
      if (!telefon.matches) { kur(0); delete kok.dataset.sik; return; }
      for (let k = 0; k <= SIK_EN_COK; k += 1) {
        kur(k);
        if (kok.scrollHeight <= kok.clientHeight + 1) break;   // okuma düzeni zorlar: kademe hemen ölçülür
      }
    };
    const iste = () => { if (!kare) kare = requestAnimationFrame(olc); };
    olc();
    const boyut = typeof ResizeObserver === "function" ? new ResizeObserver(iste) : null;
    boyut?.observe(kok);
    const agac = new MutationObserver(iste);
    agac.observe(kok, { childList: true, subtree: true });
    telefon.addEventListener?.("change", iste);
    return () => {
      cancelAnimationFrame(kare);
      boyut?.disconnect();
      agac.disconnect();
      telefon.removeEventListener?.("change", iste);
    };
  }, [ref, etkin]);
}

export default function AnaSayfaA() {
  // KASA (deneysel, 950): kapalıyken ya da ayar satırı yokken (migration uygulanmamış) kısayol çizilmez
  const kasaAcik = useAyar("kasa_modu_acik", 0) >= 1;
  const v = useAnaSayfaVerisi({ gorevYukle: false });   // görevleri GorevSeridi kendi okur (gorevlerim)
  const b = useOyunBaslat();
  const devamEden = useDevamEdenMaclar();
  // Bildirim izni maç sonucundan ana sayfaya dönünce sorulur (MacSonuSahnesi işaret bırakır).
  const [bildirimSor] = useState(() => {
    try { return sessionStorage.getItem(BILDIRIM_SONRA_ANAHTAR) === "1"; } catch { return false; }
  });
  // Telefonda ana sayfa kaydırılmaz: kabuk görünür yüksekliğe oturur (anasayfa.css › .as-kaydirmasiz).
  useEffect(() => {
    const kok = document.documentElement;
    kok.classList.add("as-kaydirmasiz");
    return () => kok.classList.remove("as-kaydirmasiz");
  }, []);
  // D-205: profil sunucudan gelmezse (hata ya da 12 sn) diğer sayfalar gibi "Yüklenemedi · Tekrar dene";
  // bağlantı gelince kendiliğinden yeniden dener. (Eski pages/Home.jsx ile aynı kalıp.)
  const { user, profilHata, refreshProfile } = useAuth();
  const profilGecikti = useZamanAsimi(!v.profile);
  const profilYok = !v.profile;
  useEffect(() => {
    if (!profilYok) return undefined;
    const tekrar = () => refreshProfile?.(user?.id);
    window.addEventListener("online", tekrar);
    return () => window.removeEventListener("online", tekrar);
  }, [profilYok, refreshProfile, user?.id]);
  // Telefonda sayfa sığmazsa (durum bantları: bildirim, devam eden maç, acil) kademeli sıkışır; kaydırma açılmaz.
  // Soğuk açılış (8 Eki 2026): profil gelmeden de sayfa çizilir; profile bağlı parçalar (oyuncu kartı,
  // lig kartı) yerinde iskelet olarak durur. Hata ya da 12 sn gecikmede eski "Yüklenemedi" kartı.
  const profilHazir = Boolean(v.profile);
  const hataKarti = !profilHazir && Boolean(profilHata || profilGecikti);
  const kokRef = useRef(null);
  useSigdir(kokRef, !hataKarti);
  if (hataKarti) {
    return (
      <div className="as-sayfa as-hata-kap">
        <h1 className="qt-gizli">{tt("Ana sayfa")}</h1>
        <div className="qt-kart qt-kart--yuzey qt-kart--dolgu-o">
          <DurumKutusu durum="hata" satir={4} onTekrar={() => refreshProfile?.(user?.id)} />
        </div>
      </div>
    );
  }
  // Kasa artık "Ortak Hazine" şeridi (6 Eki 2026): kısayol satırında tekrar etmez
  const modlar = modListesi(v, b).filter((m) => m.anahtar !== "kasa");
  const seritler = [
    { anahtar: "klasik", ikon: "hizli", ad: tt("Klasik"), vaat: tt("Hızlı sorular, en çok bilen kazanır"), git: b.oyna },
    { anahtar: "duello", ikon: "duello", ad: tt("Düello"), vaat: tt("Kategorini savun"),
      git: () => { sonModuYaz("duello"); b.git("/duello"); } },
    ...(kasaAcik ? [{ anahtar: "kasa", ikon: "sandik", ad: tt("Ortak Hazine"), vaat: tt("Doğru anda aç"),
      git: () => { sonModuYaz("kasa"); b.git("/kasa"); } }] : []),
  ];
  const sonMod = seritler.find((m) => m.anahtar === sonModuOku());
  const olaylar = etkinlikler(v);
  // Süren maç zaten "Devam et" kartında: aynı maçı gösteren "maçın sürüyor" şeridi çizilmez (tek bant).
  const acilAday = olaylar.find((e) => e.ton === "acil") ?? olaylar[0];
  const acil = acilAday?.ton === "sira" && devamEden?.length > 0 ? olaylar.find((e) => e.ton === "acil") ?? null : acilAday;

  // Rozet + çerçeve paketi (23 Eyl 2026): mor ışınlı dev avatar sahnesi kalktı. Telefonda tek sütun
  // (sıra CSS `order` ile): oyuncu kartı → turnuva → üç mod şeridi → lig kartı → Sezon/Görevler → kısayollar.
  // Masaüstünde (≥1024) üç sütun: solda oyuncu + lig, ortada oyna alanı, sağda turnuva + görevler.
  return (
    <div ref={kokRef} className={`as-sayfa as-a as-a2 as-sahne${devamEden?.length > 0 ? " as-a2--devam" : ""}`}
         aria-busy={profilHazir ? undefined : "true"}>
      <h1 className="qt-gizli">{tt("Ana sayfa")}</h1>
      {b.katmanlar}
      <BpTanitimPenceresi engel={devamEden?.length > 0} />

      <section className="as-a2-kol as-a2-kol--sol" aria-label={tt("Oyuncu")}>
        {bildirimSor && <div className="as-a2-bildirim"><BildirimIzniSor serit /></div>}
        <div className="as-a2-kart">{profilHazir ? <KompaktOyuncu v={v} /> : <span className="as-iskelet as-iskelet--ko" />}</div>
        <div className="as-a2-lig">{profilHazir ? <LigKarti v={v} /> : <span className="as-iskelet as-iskelet--lig" />}</div>
      </section>

      <section className="as-a2-kol as-a2-kol--sag" aria-label={tt("Etkinlikler")}>
        <div className="as-a2-turnuva"><TurnuvaSeridi v={v} git={b.git} /></div>
        <div className="as-a2-masaustu"><TurnuvaSeansListesi /></div>
        {/* Sezon Yolu + Görevler: tek satırda iki yarım kart (1 Eki 2026). Sezon kartı yalnız sezon_yolu_acik açıkken çizilir; kapalı/yüklenmiyorsa kap boş kalır, Görevler tam genişlik olur. Hiçbir yükseklikte gizlenmez. */}
        <div className="as-a2-seritlar">
          <div className="as-a2-sezon"><SezonSeridi /></div>
          <div className="as-a2-gorev"><GorevSeridi /></div>
        </div>
        {olaylar.length > 0 && (
          <div className="as-panel as-a2-masaustu">
            <h2 className="as-panel-baslik"><QtIkon ad="zil" boyut={20} />{tt("Seni bekleyenler")}</h2>
            {olaylar.slice(0, 3).map((e) => <EtkinlikSatiri key={e.id} e={e} />)}
          </div>
        )}
      </section>

      <section className="as-a2-kol as-a2-kol--orta" aria-label={tt("Oyna")}>
        <DevamEdenMaclarKarti liste={devamEden} />
        {acil && (
          <a href={acil.yol} className="as-a-acil" onClick={(e) => { e.preventDefault(); b.git(acil.yol); }}>
            <span className="as-canli-nokta" aria-hidden="true" />
            <span>{acil.baslik}</span>
            <QtIkon ad="ileri" boyut={18} />
          </a>
        )}

        <div className="as-a-seritler" role="group" aria-label={tt("Oyun modları")}>
          {seritler.map((m) => (
            <button key={m.anahtar} type="button" className={`as-mod-serit as-mod-serit--${m.anahtar}`}
                    aria-label={`${m.ad}. ${m.vaat}`} aria-haspopup={m.anahtar === "klasik" ? "dialog" : undefined} onClick={m.git}>
              <span className="as-mod-serit-metin"><b>{m.ad}</b><small>{m.vaat}</small></span>
              <ModFiguru tur={m.anahtar} />
            </button>
          ))}
          {sonMod && <p className="as-mod-son">{tt("En son oynadığın: {mod}", { mod: sonMod.ad })}</p>}
        </div>

        <nav className="as-a-kisayol" aria-label={tt("Diğer modlar")}>
          {modlar.map((m) => (
            <button key={m.anahtar} type="button" className={`as-kisayol as-renk--${m.anahtar}`} onClick={m.git}>
              <span className="as-kisayol-ikon"><QtIkon ad={m.ikon} boyut={24} /></span>
              <span className="as-kisayol-ad">{m.ad}</span>
              {m.etiket && <span className="as-kisayol-etiket">{m.etiket}</span>}
              {m.rozet && <span className="as-rozet-nokta"><span className="qt-gizli">{m.rozetEtiketi}</span></span>}
            </button>
          ))}
        </nav>
        {v.mesaj && <p className="as-hata" role="alert">{v.mesaj}</p>}
      </section>
    </div>
  );
}
