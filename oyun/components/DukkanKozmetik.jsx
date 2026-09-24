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
import { QtDugme, QtIkon, QtKart } from "../tasarim/index.js";
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

/** Izgaradaki küçük görsel (64 px kutu). */
export function KozmetikSimge({ kalem, profile, boyut = 64 }) {
  // 560: premium — kendi avatarınla, yalnız o kalem (ızgarada durağan; süsler komşuya taşmasın diye küçük)
  if (kalem.tur === "premium_cerceve" || kalem.tur === "premium_aura") {
    const b = Math.min(boyut, 56) - 8;
    return (
      <span className="qt-kz-premium-simge" style={{ width: boyut, height: boyut }} aria-hidden="true">
        <CerceveliAvatar profile={profile ?? {}} boyut={b} cerceve={null} aura={null}
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
export function KozmetikBuyukOnizleme({ kalem, profile, userId }) {
  const [tekrar, setTekrar] = useState(0);
  const ad = profile?.gorunen_ad || tt("Oyuncu");
  if (kalem.tur === "premium_cerceve" || kalem.tur === "premium_aura") {
    // 560: gerçek PremiumCerceve (tembel) — profil boyutunda, hareketli (önizlemedeki gibi)
    return (
      <span className="qt-kz-premium-onizleme">
        <CerceveliAvatar profile={profile ?? {}} userId={userId} boyut={128} hareketli cerceve={null} aura={null}
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
 * Tek tür sekmesi. `katalog` JokerDukkani'nda bir kez okunur (sekmenin görünürlüğü de ondan: normal oyuncuya
 * satış kapalıyken boş döner). `sahipHesap` yalnız arayüz ipucu (kapı sunucuda).
 */
export default function DukkanKozmetik({ tur, katalog, sahipHesap = false, yenile, elmasYetmedi, onBilgi, onHata }) {
  const { user, profile } = useAuth();
  const liste = (katalog ?? []).filter((x) => x.tur === tur).sort((a, b) => (a.sira ?? 0) - (b.sira ?? 0));
  const [secili, setSecili] = useState(() => liste.find((x) => x.takili)?.anahtar ?? liste[0]?.anahtar ?? null);
  const [islem, setIslem] = useState(null);
  const c = liste.find((x) => x.anahtar === secili) ?? liste[0] ?? null;
  const takilir = tur !== "tepki_paketi";

  if (!c) {
    return <QtKart><p className="qt-kucuk qt-soluk">{tt("Bu bölümde şu an satışta bir şey yok.")}</p></QtKart>;
  }

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

  const testModu = sahipHesap && c.kapali && !c.sahip;
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
        </div>
      </QtKart>

      <ul className="qt-dc-izgara">
        {liste.map((x) => (
          <li key={x.anahtar}>
            <button type="button" className="qt-dc-oge" aria-pressed={x.anahtar === c.anahtar} onClick={() => setSecili(x.anahtar)}>
              <KozmetikSimge kalem={x} profile={profile} />
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
  const liste = [...(avatarlar ?? [])].sort((a, b) => (a.sira ?? 0) - (b.sira ?? 0));
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
                {profile?.avatar_url === a.url ? tt("Takılı") : a.sahibim ? tt("Sende var") : a.tur === "gunluk" || (a.kullanabilir && !(a.fiyat_elmas > 0)) ? tt("Bedava")
                  : a.fiyat_elmas != null && !a.kapali ? <ElmasFiyat fiyat={a.fiyat_elmas} /> : <><QtIkon ad="kilit" boyut={12} /> {tt("Kapalı")}</>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
