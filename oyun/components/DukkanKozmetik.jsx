/**
 * DÜKKÂN › ELMAS KOZMETİKLERİ (540) — VS Kartı · İsim Efekti · Zafer Efekti · Tepki  +  Avatar (520, Ajan A kataloğu)
 *
 * Satış kapısı SUNUCUDA: kozmetik_satis_acik = false iken normal oyuncuya katalog boş döner (sekme hiç
 * görünmez), satın alma reddedilir. Yalnız Ida'nın "Satışa girsin" dediği kalemler satılır.
 * SAHİP TEST MODU: sahip hesabı her kalemi görür (kapalı olanlar "Satışta değil" işaretli) ve satın almadan
 * takıp çıkarabilir (kozmetik_tak sunucuda sahip_mi() ile izin verir). Takılan kalem gerçek maçta görünür.
 * Veri: oyun/lib/kozmetik.js. Görünüm: qt-dc- (Aura sekmesiyle aynı dil) + dukkan-kozmetik.css.
 */
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../src/context/AuthContext.jsx";
import { supabase } from "../../src/lib/supabase.js";
import CerceveliAvatar from "./CerceveliAvatar.jsx";
import IsimEfekti from "./IsimEfekti.jsx";
import { VsKarti } from "./AramaSahnesi.jsx";
import { ElmasFiyat } from "./DukkanAuralar.jsx";
import { KOZMETIK_TANIMLARI, TEPKI_TANIMLARI, kozmetikHatasi, kozmetikKatalogu, kozmetikSatinAl, kozmetikTak, kozmetikTemasi, sahipMi, tepkiGorseli } from "../lib/kozmetik.js";
import { oyuncuKartiUnut } from "../lib/cerceve.js";
import { elmasTazele } from "../lib/elmas.js";
import { sesHataUyari, sesSatinAlma } from "../lib/ses.js";
import { aktifDil, tt } from "../lib/dil.js";
import { y } from "../lib/yol.js";
import { QtDugme, QtIkon, QtKart, QtModal } from "../tasarim/index.js";
import { HAZIR_AVATARLAR } from "../lib/avatarKatalogu.js";
import "../tasarim/ekranlar/dukkan-cerceve.css";
import "../tasarim/ekranlar/dukkan-kozmetik.css";

const ZaferEfekti = lazy(() => import("./ZaferEfekti.jsx"));

/** Dükkân sekmelerinin kodu → kozmetik türü (sıra Ida'nın istediği: Aura · Avatar · VS · İsim · Zafer · Tepki). */
export const KOZMETIK_SEKMELERI = [
  // 560: premium — hareketli çerçeve + avatarın iç arka planı (aura). Kod "pcerceve"/"paura": eski dükkân
  // "aura" sekmesiyle (481, pasif auralar) karışmasın.
  { kod: "pcerceve", tur: "premium_cerceve", ad: "Çerçeve", ikon: "yildiz" },
  { kod: "paura", tur: "premium_aura", ad: "Aura", ikon: "gunes" },
  { kod: "avatar", ad: "Avatar", ikon: "kisi" },
  { kod: "vs", tur: "vs_karti", ad: "VS Kartı", ikon: "duello" },
  { kod: "isim", tur: "isim_efekti", ad: "İsim Efekti", ikon: "kalem" },
  { kod: "zafer", tur: "zafer_efekti", ad: "Zafer Efekti", ikon: "kupa" },
  { kod: "tepki", tur: "tepki_paketi", ad: "Tepki", ikon: "havali" },
];

/**
 * Kozmetik kataloğu + yeni avatar kataloğu + sahip mi — tek yerde, bir kez. Normal oyuncuya satış kapalıyken
 * iki katalog da boş döner (sunucu kapısı) → sekmeler hiç çizilmez.
 */
export function useKozmetikDukkan() {
  const [durum, setDurum] = useState({ katalog: [], avatarlar: [], sahipHesap: false, hazir: false });
  const yenile = useCallback(async () => {
    const [k, a, s] = await Promise.all([
      kozmetikKatalogu().catch(() => []),
      (async () => {
        try {
          const { data, error } = await supabase.rpc("avatar_katalogu_oyun");
          if (error) throw error;
          return data ?? [];
        } catch (e) {
          console.error("[Bildim] avatar kataloğu okunamadı:", e?.message ?? e);
          return [];
        }
      })(),
      sahipMi(),
    ]);
    setDurum({ katalog: k, avatarlar: a, sahipHesap: s, hazir: true });
  }, []);
  useEffect(() => { yenile(); }, [yenile]);
  const turVar = (tur) => durum.katalog.some((x) => x.tur === tur);
  const sekmeler = KOZMETIK_SEKMELERI.filter((s) => (s.kod === "avatar" ? durum.avatarlar.length > 0 : turVar(s.tur)));
  return { ...durum, yenile, sekmeler };
}

const ZAFER_SIMGE = {
  "havai-fisek": "/kozmetik/havai-fisek.webp", "altin-yagmuru": "/kozmetik/coin.webp", "ejder-alevi": "/kozmetik/ejder-alev.webp",
  "kar-firtinasi": "/kozmetik/kar-tanesi.webp", "yildiz-yagmuru": "/kozmetik/kayan-yildiz.webp",
};

const tepkiListesi = (x) => (Array.isArray(x?.icerik?.tepkiler) ? x.icerik.tepkiler : KOZMETIK_TANIMLARI[x?.anahtar]?.tepkiler ?? []);
export const kozmetikAdi = (x) => x?.ad ?? tt(KOZMETIK_TANIMLARI[x?.anahtar]?.ad ?? x?.anahtar ?? "");

export const premiumMi = (x) => x?.tur === "premium_cerceve" || x?.tur === "premium_aura";

/**
 * Izgaradaki küçük görsel (64 px kutu).
 * Premium (hareketli satış kalemi): avatar orta kademede (≥ 49 px → PremiumCerceve sade hareket: uzak süs ve
 * parçacık yok) ve `hareketli` verilirse oynar; ekran dışında / azaltılmış harekette PremiumCerceve durdurur.
 * Kutu avatardan 24 px geniş ve süsler kutuda KIRPILIR (overflow: clip) → komşu karta taşmaz.
 */
export function KozmetikSimge({ kalem, profile, boyut = 64, hareketli = false }) {
  // 560: premium — kendi avatarınla, yalnız o kalem
  if (premiumMi(kalem)) {
    const b = Math.max(52, boyut - 4);
    return (
      <span className="qt-kz-premium-simge" style={{ width: b + 24, height: b + 24 }} aria-hidden="true">
        <CerceveliAvatar profile={profile ?? {}} boyut={b} cerceve={null} aura={null} hareketli={hareketli}
                         premiumCerceve={kalem.tur === "premium_cerceve" ? kalem.anahtar : null}
                         premiumAura={kalem.tur === "premium_aura" ? kalem.anahtar : null} />
      </span>
    );
  }
  const tema = kozmetikTemasi(kalem.anahtar);
  if (kalem.tur === "vs_karti") {
    return <span className="qt-kz-vs-simge qt-vs" data-vs={tema} style={{ width: boyut, height: boyut }} aria-hidden="true" />;
  }
  if (kalem.tur === "isim_efekti") {
    return (
      <span className="qt-kz-isim-simge" style={{ minHeight: boyut }} aria-hidden="true">
        <IsimEfekti ef={kalem.anahtar}>{profile?.gorunen_ad || tt("Oyuncu")}</IsimEfekti>
      </span>
    );
  }
  if (kalem.tur === "zafer_efekti") {
    return <img className="qt-kz-zafer-simge" src={ZAFER_SIMGE[tema]} alt="" width={boyut - 12} height={boyut - 12} loading="lazy" decoding="async" />;
  }
  return (
    <span className="qt-kz-tepki-simge" style={{ width: boyut, height: boyut }} aria-hidden="true">
      {tepkiListesi(kalem).slice(0, 4).map((k) => <img key={k} src={tepkiGorseli(k)} alt="" loading="lazy" decoding="async" />)}
    </span>
  );
}

/** Büyük önizleme: kalem gerçek yerinde (VS kartı, ad açık + koyu zeminde, maç sonu kutusu, tepki balonları). */
export function KozmetikBuyukOnizleme({ kalem, profile, userId, boyut = 128 }) {
  const [tekrar, setTekrar] = useState(0);
  const ad = profile?.gorunen_ad || tt("Oyuncu");
  if (premiumMi(kalem)) {
    // 560: gerçek PremiumCerceve (tembel) — profil boyutunda, hareketli (önizlemedeki gibi)
    return (
      <span className="qt-kz-premium-onizleme" style={{ "--kz-b": `${boyut}px` }}>
        <CerceveliAvatar profile={profile ?? {}} userId={userId} boyut={boyut} hareketli cerceve={null} aura={null}
                         premiumCerceve={kalem.tur === "premium_cerceve" ? kalem.anahtar : null}
                         premiumAura={kalem.tur === "premium_aura" ? kalem.anahtar : null} />
      </span>
    );
  }
  if (kalem.tur === "vs_karti") {
    return <VsKarti profil={{ ...(profile ?? {}), id: userId }} kart={undefined} taraf="ben" vsKarti={kalem.anahtar} className="qt-kz-vs" />;
  }
  if (kalem.tur === "isim_efekti") {
    return (
      <div className="qt-kz-isim-onizleme">
        <span className="qt-kz-isim-zemin qt-kz-isim-zemin--acik"><IsimEfekti ef={kalem.anahtar} hareketli>{ad}</IsimEfekti></span>
        <span className="qt-kz-isim-zemin qt-kz-isim-zemin--koyu qt-sahne-mac"><IsimEfekti ef={kalem.anahtar} hareketli>{ad}</IsimEfekti></span>
      </div>
    );
  }
  if (kalem.tur === "zafer_efekti") {
    return (
      <button type="button" className="qt-kz-zafer-kutu" onClick={() => setTekrar((n) => n + 1)} aria-label={tt("Efekti yeniden oynat")}>
        <Suspense fallback={null}><ZaferEfekti key={tekrar} ef={kalem.anahtar} yol={220} en={240} /></Suspense>
        <CerceveliAvatar profile={profile ?? {}} userId={userId} boyut={72} />
        <span className="qt-kz-zafer-yazi">{tt("ZAFER!")}</span>
        <span className="qt-kz-tekrar"><QtIkon ad="yenile" boyut={14} /> {tt("Tekrar")}</span>
      </button>
    );
  }
  return (
    <div className="qt-kz-tepki-onizleme">
      {tepkiListesi(kalem).map((k) => (
        <span key={k} className="qt-kz-tepki-kalem">
          <img src={tepkiGorseli(k)} alt="" width="40" height="40" decoding="async" />
          <small>{tt(TEPKI_TANIMLARI[k]?.ad ?? k)}</small>
        </span>
      ))}
    </div>
  );
}

/**
 * Satın al / tak işlevleri — Dükkân sahnesi, büyük önizleme penceresi ve Koleksiyon aynısını kullanır
 * (kozmetik_satin_al / kozmetik_tak; kapı sunucuda, sahip test modu dahil).
 */
function useKozmetikEylem({ c, yenile, elmasYetmedi, onBilgi, onHata }) {
  const { user } = useAuth();
  const [islem, setIslem] = useState(null);
  const tur = c?.tur;
  const takilir = tur !== "tepki_paketi";
  const satinAl = async () => {
    if (islem) return;
    setIslem("al");
    try {
      await kozmetikSatinAl(c.anahtar);
      sesSatinAlma();
      elmasTazele();
      onBilgi?.(takilir ? tt("{ad} senin. Şimdi takabilirsin.", { ad: kozmetikAdi(c) }) : tt("{ad} paketi senin. Maçta tepkilerin arasında.", { ad: kozmetikAdi(c) }));
      await yenile?.();
    } catch (e) {
      const m = kozmetikHatasi(e);
      sesHataUyari();
      onHata?.(m);
      if (m === tt("Elmas yetmiyor")) elmasYetmedi?.();
    } finally {
      setIslem(null);
    }
  };
  const tak = async (anahtar) => {
    if (islem) return;
    setIslem("tak");
    try {
      await kozmetikTak(tur, anahtar, user?.id);
      onBilgi?.(anahtar ? tt("Takıldı.") : tt("Çıkarıldı."));
      await yenile?.();
    } catch (e) {
      onHata?.(kozmetikHatasi(e));
    } finally {
      setIslem(null);
    }
  };

  return { islem, satinAl, tak, takilir };
}

/** Kalemin durumuna göre tek düğme: Çıkar · Tak / Test için tak · Sende var · Satın al (fiyat) · Satılmıyor. */
function KozmetikEylemDugmesi({ c, sahipHesap, eylem }) {
  const { islem, satinAl, tak, takilir } = eylem;
  const testModu = sahipHesap && c.kapali && !c.sahip;
  return (
    <>
          {takilir && c.takili ? (
            <QtDugme tur="ikincil" tamGenislik yukleniyor={islem === "tak"} onClick={() => tak(null)}>{tt("Çıkar")}</QtDugme>
          ) : takilir && (c.sahip || testModu) ? (
            <QtDugme tamGenislik ikon="onay" yukleniyor={islem === "tak"} onClick={() => tak(c.anahtar)}>
              {testModu ? tt("Test için tak") : tt("Tak")}
            </QtDugme>
          ) : !takilir && (c.sahip || sahipHesap) ? (
            <QtDugme tur="ikincil" tamGenislik devreDisi ikon="onay">{c.sahip ? tt("Sende var") : tt("Test modunda açık")}</QtDugme>
          ) : c.satilik && c.fiyat != null ? (
            <QtDugme tamGenislik yukleniyor={islem === "al"} onClick={satinAl}
                     aria-label={tt("{ad} satın al — {n} elmas", { ad: kozmetikAdi(c), n: c.fiyat })}>
              <span className="qt-dc-fiyat">{tt("Satın al")} <ElmasFiyat fiyat={c.fiyat} boyut={18} /></span>
            </QtDugme>
          ) : (
            <QtDugme tur="ikincil" tamGenislik devreDisi ikon="kilit">{tt("Satılmıyor")}</QtDugme>
          )}
    </>
  );
}

/** Büyük önizleme penceresinde avatar çapı: telefonda ~200 px, süsler (%170) pencereye sığsın diye genişliğe göre. */
function pencereBoyutu() {
  const en = typeof window !== "undefined" ? window.innerWidth : 390;
  // Pencere genişliği min(ekran − 32, 440); süsler çapın %170'i → tamamı pencereye sığar (390 px'te 210, 360'ta 192).
  return Math.max(160, Math.min(240, Math.floor(Math.min(en - 32, 440) / 1.7)));
}

/**
 * BÜYÜK ÖNİZLEME PENCERESİ (premium çerçeve/aura) — karta dokununca açılır: kalem oyuncunun KENDİ avatarıyla,
 * tam boyut ve tam hareketli; altında fiyat ve Satın al / Tak (mevcut işlevler, sahip test modu aynen).
 * `kalem` null → kapalı. Dükkân ve Profil › Koleksiyon kullanır.
 */
export function KozmetikOnizlemePenceresi({ kalem, onKapat, sahipHesap = false, yenile, elmasYetmedi, onBilgi, onHata }) {
  const { user, profile } = useAuth();
  const eylem = useKozmetikEylem({ c: kalem, yenile, elmasYetmedi, onBilgi, onHata });
  const [boyut] = useState(pencereBoyutu);
  if (!kalem) return null;
  return (
    <QtModal acik onKapat={onKapat} baslik={kozmetikAdi(kalem)} className="qt-kz-pencere"
             altlik={(
               <>
                 <KozmetikEylemDugmesi c={kalem} sahipHesap={sahipHesap} eylem={eylem} />
                 <QtDugme tur="hayalet" tamGenislik onClick={onKapat}>{tt("Kapat")}</QtDugme>
               </>
             )}>
      <div className="qt-kz-pencere-sahne">
        <KozmetikBuyukOnizleme kalem={kalem} profile={profile} userId={user?.id} boyut={boyut} />
      </div>
      {kalem.kapali && sahipHesap && (
        <span className="qt-kz-kapali"><QtIkon ad="kilit" boyut={12} /> {tt("Satışta değil — yalnız sen görüyorsun")}</span>
      )}
      <p className="qt-kucuk qt-soluk qt-kz-pencere-aciklama">{tt(ACIKLAMA[kalem.tur] ?? "")}</p>
      {!kalem.sahip && kalem.satilik && kalem.fiyat != null && (
        <p className="qt-kz-pencere-fiyat">{tt("Fiyat")} <ElmasFiyat fiyat={kalem.fiyat} boyut={18} /></p>
      )}
    </QtModal>
  );
}

/**
 * Tek tür sekmesi. `katalog` JokerDukkani'nda bir kez okunur (sekmenin görünürlüğü de ondan: normal oyuncuya
 * satış kapalıyken boş döner). `sahipHesap` yalnız arayüz ipucu (kapı sunucuda).
 */
export default function DukkanKozmetik({ tur, katalog, sahipHesap = false, yenile, elmasYetmedi, onBilgi, onHata }) {
  const { user, profile } = useAuth();
  const liste = (katalog ?? []).filter((x) => x.tur === tur).sort((a, b) => (a.sira ?? 0) - (b.sira ?? 0));
  const [secili, setSecili] = useState(() => liste.find((x) => x.takili)?.anahtar ?? liste[0]?.anahtar ?? null);
  const [pencere, setPencere] = useState(null);   // premium: büyük önizleme penceresindeki kalemin anahtarı
  const c = liste.find((x) => x.anahtar === secili) ?? liste[0] ?? null;
  const eylem = useKozmetikEylem({ c, yenile, elmasYetmedi, onBilgi, onHata });
  const premium = premiumMi({ tur });

  if (!c) {
    return <QtKart><p className="qt-kucuk qt-soluk">{tt("Bu bölümde şu an satışta bir şey yok.")}</p></QtKart>;
  }

  return (
    <div className="qt-dc qt-kz">
      <QtKart className="qt-dc-sahne qt-kz-sahne" aria-live="polite">
        <div className="qt-dc-onizleme qt-kz-onizleme">
          <KozmetikBuyukOnizleme kalem={c} profile={profile} userId={user?.id} />
        </div>
        <div className="qt-dc-sahne-bilgi">
          <h2 className="qt-baslik-2">{kozmetikAdi(c)}</h2>
          {c.kapali && sahipHesap && (
            <span className="qt-kz-kapali"><QtIkon ad="kilit" boyut={12} /> {tt("Satışta değil — yalnız sen görüyorsun")}</span>
          )}
          <p className="qt-kucuk qt-soluk">{tt(ACIKLAMA[tur])}</p>
        </div>
        <div className="qt-dc-sahne-eylem">
          <KozmetikEylemDugmesi c={c} sahipHesap={sahipHesap} eylem={eylem} />
        </div>
      </QtKart>

      <ul className="qt-dc-izgara">
        {liste.map((x) => (
          <li key={x.anahtar}>
            <button type="button" className="qt-dc-oge" aria-pressed={x.anahtar === c.anahtar}
                    aria-haspopup={premium ? "dialog" : undefined}
                    onClick={() => { setSecili(x.anahtar); if (premium) setPencere(x.anahtar); }}>
              <KozmetikSimge kalem={x} profile={profile} hareketli={premium} />
              <span className="qt-dc-ad">{kozmetikAdi(x)}</span>
              <span className="qt-dc-durum">
                {x.takili ? tt("Takılı") : x.sahip ? tt("Sende var") : x.satilik && x.fiyat != null ? <ElmasFiyat fiyat={x.fiyat} />
                  : <><QtIkon ad="kilit" boyut={12} /> {tt("Kapalı")}</>}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="qt-kucuk qt-soluk-zemin qt-dc-not">
        {tt("Aldıkların Profil › Koleksiyon'da; oradan takıp çıkarabilirsin.")}{" "}
        <Link to={y("/profil?sekme=koleksiyon")}>{tt("Koleksiyonuna bak")}</Link>
      </p>
      {premium && (
        <KozmetikOnizlemePenceresi kalem={liste.find((x) => x.anahtar === pencere) ?? null} onKapat={() => setPencere(null)}
          sahipHesap={sahipHesap} yenile={yenile} elmasYetmedi={() => { setPencere(null); elmasYetmedi?.(); }} onBilgi={onBilgi} onHata={onHata} />
      )}
    </div>
  );
}

const ACIKLAMA = {
  vs_karti: "Rakip aranırken, VS anında ve profilinde kartının arka planı.",
  isim_efekti: "Lig tablosunda, maç şeridinde, maç sonunda ve profilinde adının görünümü.",
  zafer_efekti: "Kazandığında maç sonu sahnesine eklenir. Rakibin de görür.",
  tepki_paketi: "Maçta rakibine gönderebileceğin 4 yeni tepki. Paket takılmaz, alınca maçta hazır.",
  premium_cerceve: "Hareketli çerçeve: profilinde, ana sayfada, VS anında ve maç sonunda canlanır; listelerde sade durur. Rakibin de görür.",
  premium_aura: "Avatarının iç arka planı: düz zeminin yerine hareketli sahne. Maçta, lig tablosunda ve profilinde herkes görür.",
};

/** Dükkân › Avatar — Ajan A'nın kataloğu (avatar_katalogu_oyun / avatar_satin_al / avatar_onayla). */
export function DukkanAvatarlar({ avatarlar, sahipHesap = false, yenile, elmasYetmedi, onBilgi, onHata }) {
  const { user, profile, refreshProfile } = useAuth();
  // 31 hazır profesyonel avatar (bedava, avatar_onayla kabul eder) + katalogdaki 27 — profil ve kurulumla aynı
  // sıra; eskiden burada yalnız katalog (27) vardı → "yalnız son eklenen avatarlar görünüyor".
  const liste = [
    ...HAZIR_AVATARLAR.map((a, i) => ({ anahtar: a.url, url: a.url, ad_tr: a.ad, ad_en: a.ad, tur: "hazir", fiyat_elmas: 0,
      sira: -100 + i, kullanabilir: true, kapali: false, sahibim: false })),
    ...[...(avatarlar ?? [])].sort((a, b) => (a.sira ?? 0) - (b.sira ?? 0)),
  ];
  const [secili, setSecili] = useState(() => liste.find((a) => profile?.avatar_url === a.url)?.anahtar ?? liste[0]?.anahtar ?? null);
  const [islem, setIslem] = useState(null);
  const c = liste.find((a) => a.anahtar === secili) ?? liste[0] ?? null;
  if (!c) return <QtKart><p className="qt-kucuk qt-soluk">{tt("Bu bölümde şu an satışta bir şey yok.")}</p></QtKart>;
  const ad = (a) => (aktifDil() === "en" ? a.ad_en : a.ad_tr) ?? a.ad_tr;
  const takili = profile?.avatar_url === c.url;

  const satinAl = async () => {
    if (islem) return;
    setIslem("al");
    try {
      const { error } = await supabase.rpc("avatar_satin_al", { p_anahtar: c.anahtar });
      if (error) throw error;
      sesSatinAlma();
      elmasTazele();
      onBilgi?.(tt("{ad} senin. Şimdi takabilirsin.", { ad: ad(c) }));
      await yenile?.();
    } catch (e) {
      const m = kozmetikHatasi(e);
      sesHataUyari();
      onHata?.(m);
      if (m === tt("Elmas yetmiyor")) elmasYetmedi?.();
    } finally {
      setIslem(null);
    }
  };
  const tak = async () => {
    if (islem) return;
    setIslem("tak");
    try {
      const { error } = await supabase.rpc("avatar_onayla", { p_url: c.url });
      if (error) throw error;
      await refreshProfile?.(user.id);
      oyuncuKartiUnut(user?.id);
      onBilgi?.(tt("Avatar değişti."));
    } catch (e) {
      onHata?.(kozmetikHatasi(e));
    } finally {
      setIslem(null);
    }
  };

  return (
    <div className="qt-dc qt-kz">
      <QtKart className="qt-dc-sahne" aria-live="polite">
        <div className="qt-dc-onizleme">
          <CerceveliAvatar profile={{ ...(profile ?? {}), gorunen_avatar: c.url, avatar_url: c.url }} userId={user?.id} boyut={128} hareketli />
        </div>
        <div className="qt-dc-sahne-bilgi">
          <h2 className="qt-baslik-2">{ad(c)}</h2>
          {c.kapali && sahipHesap && <span className="qt-kz-kapali"><QtIkon ad="kilit" boyut={12} /> {tt("Satışta değil — yalnız sen görüyorsun")}</span>}
          {/* 550: fiyat 0 → bedava (27 avatarın hepsi ücretsiz); fiyatlı kostümlü kalırsa eski metin */}
          <p className="qt-kucuk qt-soluk">{c.tur === "kostumlu" ? (c.fiyat_elmas > 0 ? tt("Kostümlü avatar — elmasla alınır.") : tt("Kostümlü avatar — bedava.")) : tt("Günlük avatar — bedava.")}</p>
        </div>
        <div className="qt-dc-sahne-eylem">
          {takili ? (
            <QtDugme tur="ikincil" tamGenislik devreDisi ikon="onay">{tt("Takılı")}</QtDugme>
          ) : c.kullanabilir ? (
            <QtDugme tamGenislik ikon="onay" yukleniyor={islem === "tak"} onClick={tak}>
              {c.kapali && sahipHesap ? tt("Test için tak") : tt("Tak")}
            </QtDugme>
          ) : !c.kapali && c.fiyat_elmas != null ? (
            <QtDugme tamGenislik yukleniyor={islem === "al"} onClick={satinAl}>
              <span className="qt-dc-fiyat">{tt("Satın al")} <ElmasFiyat fiyat={c.fiyat_elmas} boyut={18} /></span>
            </QtDugme>
          ) : (
            <QtDugme tur="ikincil" tamGenislik devreDisi ikon="kilit">{tt("Satılmıyor")}</QtDugme>
          )}
        </div>
      </QtKart>
      <ul className="qt-dc-izgara">
        {liste.map((a) => (
          <li key={a.anahtar}>
            <button type="button" className="qt-dc-oge" aria-pressed={a.anahtar === c.anahtar} onClick={() => setSecili(a.anahtar)}>
              <img className="qt-kz-avatar-simge" src={a.url} alt="" width="64" height="64" loading="lazy" decoding="async" />
              <span className="qt-dc-ad">{ad(a)}</span>
              <span className="qt-dc-durum">
                {profile?.avatar_url === a.url ? tt("Takılı") : a.sahibim ? tt("Sende var") : a.tur === "gunluk" || a.tur === "hazir" || (a.kullanabilir && !(a.fiyat_elmas > 0)) ? tt("Bedava")
                  : a.fiyat_elmas != null && !a.kapali ? <ElmasFiyat fiyat={a.fiyat_elmas} /> : <><QtIkon ad="kilit" boyut={12} /> {tt("Kapalı")}</>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
