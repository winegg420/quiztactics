import { Fragment, useEffect, useState } from "react";
import { hataMesaji } from "../lib/hata.js";
import { supabase } from "../../src/lib/supabase.js";
import { useAuth } from "../../src/context/AuthContext.jsx";
import { sureMetni } from "../lib/konum.js";
import { y } from "../lib/yol.js";
import { MEYDAN_ACIK } from "../lib/ozellikBayraklari.js";
import DavetKodu from "./DavetKodu.jsx";
import EngellediklerimBolumu from "./EngellediklerimBolumu.jsx";
import AvatarCerceve from "./AvatarCerceve.jsx";
import { tt } from "../lib/dil.js";
import { HAZIR_AVATARLAR, avatarKilitliMi, useAvatarSahiplik, useHazirAvatarlar, useKatalogAvatarlari } from "../lib/avatarKatalogu.js";
import { nadirligeGoreBolumle, useNadirlikHaritasi } from "../../src/lib/avatarNadirlik.js";
import { AvatarBolumBasligi, AvatarKilitRozeti, NadirlikImg } from "./AvatarNadirlikGoruntu.jsx";
import { QtAnahtar, QtDugme, QtIkon, QtKart } from "../tasarim/index.js";
import "../tasarim/ekranlar/dukkan-profil.css";

// Profesyonel avatar seti (31) — liste oyun/lib/avatarKatalogu.js'te (Dükkân › Avatar da kullanır; profil
// sayfası paketini dükkâna taşımasın diye). Buradan dışa aktarım geriye uyum için durur.
export { HAZIR_AVATARLAR };

// Takma ad günde bir kez değişir (sunucudaki takma_ad_sec ile aynı pencere).
const TAKMA_AD_KILIT_MS = 24 * 60 * 60 * 1000;

/** Profil sayfasındaki kimlik ayarları: takma ad, avatar, davet kodu. */
export default function ProfilAyarlari() {
  const { user, profile, refreshProfile } = useAuth();
  const [yeniAd, setYeniAd] = useState("");
  const [adDuzenle, setAdDuzenle] = useState(false);
  const [adHata, setAdHata] = useState(null);
  const [avatarDuzenle, setAvatarDuzenle] = useState(false);
  const [avatarHata, setAvatarHata] = useState(null);
  // 550: 27 yeni avatar (ücretsiz) sunucu kataloğundan; migration yoksa boş → yalnız 31 hazır avatar
  const katalogAvatarlari = useKatalogAvatarlari(avatarDuzenle);
  const hazirAvatarlar = useHazirAvatarlar();   // 701: açılmamış hazır avatarlar süzülür
  const nadirlikHaritasi = useNadirlikHaritasi();   // 770: bayrak açıkken nadirliğe göre bölümler
  const avatarSahiplik = useAvatarSahiplik();   // 820: Epik / Efsanevi avatar kilitli görünür, seçilemez
  const [kopyalandi, setKopyalandi] = useState(false);
  const [calisiyor, setCalisiyor] = useState(false);

  // Meydanda ikram alma tercihi (varsayılan AÇIK = rahatsiz_etme false).
  // Karar sunucuda: ikram_gonder kapalıysa reddediyor (bkz. migration 153).
  const [rahatsizEtme, setRahatsizEtme] = useState(Boolean(profile?.rahatsiz_etme));
  const [ikramCalisiyor, setIkramCalisiyor] = useState(false);
  const [ikramHata, setIkramHata] = useState(null);

  useEffect(() => {
    setRahatsizEtme(Boolean(profile?.rahatsiz_etme));
  }, [profile?.rahatsiz_etme]);

  const rahatsizEtmeDegistir = async () => {
    setIkramHata(null);
    setIkramCalisiyor(true);
    const yeni = !rahatsizEtme;
    try {
      const { data, error } = await supabase.rpc("rahatsiz_etme_ayarla", { p_kapali: yeni });
      if (error) throw error;
      setRahatsizEtme(Boolean(data));
      refreshProfile?.(profile?.id);
    } catch (e) {
      setIkramHata(hataMesaji(e, tt("Ayar kaydedilemedi.")));
    } finally {
      setIkramCalisiyor(false);
    }
  };

  if (!profile) return null;

  const kalanKilit = profile.takma_ad_degisti_at
    ? Math.max(
        0,
        new Date(profile.takma_ad_degisti_at).getTime() + TAKMA_AD_KILIT_MS - Date.now()
      )
    : 0;

  const googleFoto =
    user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? null;

  const adKaydet = async () => {
    setAdHata(null);
    setCalisiyor(true);
    try {
      const { error } = await supabase.rpc("takma_ad_sec", { p_ad: yeniAd.trim() });
      if (error) throw error;
      await refreshProfile(user.id);
      setAdDuzenle(false);
    } catch (e) {
      setAdHata(hataMesaji(e, tt("Takma ad kaydedilemedi.")));
    } finally {
      setCalisiyor(false);
    }
  };

  const avatarKaydet = async (url) => {
    setAvatarHata(null);
    setCalisiyor(true);
    try {
      const { error } = await supabase.rpc("avatar_onayla", { p_url: url });
      if (error) throw error;
      await refreshProfile(user.id);
      setAvatarDuzenle(false);
    } catch (e) {
      setAvatarHata(hataMesaji(e, tt("Avatar kaydedilemedi.")));
    } finally {
      setCalisiyor(false);
    }
  };

  const davetLinki = profile.davet_kodu
    ? window.location.origin + y(`/davet/${profile.davet_kodu}`)
    : null;

  return (
    <>
      {/* ---------- Meydanda rahatsız etme ----------
          DONDURULDU (Arayüz Yenileme, 20 Eyl 2026): 3B meydan kapalıyken
          ikram diye bir şey olmuyor, ayar da görünmüyor. Kod ve sunucu
          tarafı (migration 153) yerinde — oyun/lib/ozellikBayraklari.js. */}
      {MEYDAN_ACIK && (
        <QtKart as="section" className="qt-pf-bolum" aria-label={tt("Meydanda ikramlar")}>
          <QtAnahtar
            acik={!rahatsizEtme}
            devreDisi={ikramCalisiyor}
            etiket={tt("Meydanda ikramlar")}
            aciklama={tt("Meydanda başka oyuncular sana kahve ya da balon ikram edebilir. Rahatsız olursan burayı kapat; meydan okumalar etkilenmez.")}
            onDegis={rahatsizEtmeDegistir}
          />
          {ikramHata && <p className="qt-pf-hata" role="alert">{ikramHata}</p>}
        </QtKart>
      )}

      {/* ---------- Takma ad ---------- */}
      <QtKart as="section" className="qt-pf-bolum" aria-labelledby="qt-pf-takma-ad">
        <h2 id="qt-pf-takma-ad" className="qt-baslik-3">{tt("Takma adın")}</h2>

        {adDuzenle ? (
          <>
            <label className="qt-pf-alan">
              <span>{tt("Yeni takma ad (3-16)")}</span>
              <input
                type="text"
                maxLength={16}
                autoFocus
                autoComplete="off"
                value={yeniAd}
                onChange={(e) => setYeniAd(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && adKaydet()}
              />
            </label>
            {adHata && <p className="qt-pf-hata" role="alert">{adHata}</p>}
            <div className="qt-pf-dugme-sira">
              <QtDugme boyut="k" yukleniyor={calisiyor} onClick={adKaydet}>{tt("Kaydet")}</QtDugme>
              <QtDugme tur="ikincil" boyut="k" onClick={() => setAdDuzenle(false)}>{tt("Vazgeç")}</QtDugme>
            </div>
          </>
        ) : (
          <div className="qt-pf-ayar-satir qt-pf-ayar-satir--duzenle">
            <div className="qt-pf-ayar-metin">
              <span className="qt-pf-takma-ad">{profile.gorunen_ad}</span>
              <span className="qt-kucuk qt-soluk">
                {kalanKilit > 0
                  ? tt("Seçimin kaydedildi. Bir sonraki değişiklik için {0} var.", { 0: sureMetni(kalanKilit) })
                  : tt("Günde bir kez değiştirebilirsin.")}
              </span>
            </div>
            <QtDugme
              tur="ikincil"
              boyut="k"
              ikon="kalem"
              devreDisi={kalanKilit > 0}
              onClick={() => {
                setYeniAd(profile.takma_ad ?? "");
                setAdDuzenle(true);
              }}
            >
              {tt("Değiştir")}
            </QtDugme>
          </div>
        )}
        {/* Gizlilik notu: ayar değil bilgi — takma adın altında durur. */}
        <p className="qt-kucuk qt-soluk qt-pf-not">
          <QtIkon ad="kalkan" boyut={16} />
          <span>{tt("Gerçek adın hiçbir zaman gösterilmez; diğer oyuncular yalnızca takma adını ve seçtiğin avatarı görür.")}</span>
        </p>
      </QtKart>

      {/* ---------- Avatar ---------- */}
      <QtKart as="section" className="qt-pf-bolum" aria-labelledby="qt-pf-avatar-baslik">
        <h2 id="qt-pf-avatar-baslik" className="qt-baslik-3">{tt("Avatarın")}</h2>
        {avatarDuzenle ? (
          <>
            <div className="qt-pf-avatar-izgara">
              {nadirligeGoreBolumle([...hazirAvatarlar, ...katalogAvatarlari], (a) => a.url, nadirlikHaritasi).map((b) => (
                <Fragment key={b.nadirlik ?? "tumu"}>
                  {b.nadirlik && <AvatarBolumBasligi nadirlik={b.nadirlik} sayi={b.ogeler.length} />}
                  {b.ogeler.map((a) => {
                    const secili = profile.avatar_url === a.url;
                    const kilitli = !secili && avatarKilitliMi(avatarSahiplik, a.url);
                    return (
                      <button
                        type="button"
                        key={a.url}
                        className={"qt-pf-avatar-sec" + (secili ? " qt-pf-avatar-sec--secili" : "") + (kilitli ? " qt-av-kilitli" : "")}
                        aria-label={kilitli ? tt("{ad} — kilitli", { ad: a.ad }) : tt("{0} avatarını seç", { 0: a.ad })}
                        aria-pressed={secili}
                        aria-disabled={kilitli || undefined}
                        title={a.ad}
                        disabled={calisiyor}
                        onClick={() => (kilitli ? setAvatarHata(tt("Bu avatar kilitli. Dükkân › Avatar bölümünden elmasla alabilirsin.")) : avatarKaydet(a.url))}
                      >
                        <NadirlikImg src={a.url} alt="" loading="lazy" decoding="async" />
                        {kilitli && <AvatarKilitRozeti />}
                      </button>
                    );
                  })}
                </Fragment>
              ))}
            </div>
            {avatarHata && <p className="qt-pf-hata" role="alert">{avatarHata}</p>}
            <div className="qt-pf-dugme-sira">
              {googleFoto && (
                <QtDugme tur="ikincil" boyut="k" devreDisi={calisiyor} onClick={() => avatarKaydet(googleFoto)}>
                  {tt("Google fotoğrafım")}
                </QtDugme>
              )}
              <QtDugme tur="ikincil" boyut="k" devreDisi={calisiyor} onClick={() => avatarKaydet(null)}
                        title={tt("Seçili avatarı kaldırır; yerine adının baş harfi görünür.")}>
                {tt("Avatarı kaldır")}
              </QtDugme>
              <QtDugme tur="hayalet" boyut="k" onClick={() => setAvatarDuzenle(false)}
                        title={tt("Avatar seçiciyi kapatır; avatarın olduğu gibi kalır.")}>
                {tt("Seçiciyi kapat")}
              </QtDugme>
            </div>
          </>
        ) : (
          <div className="qt-pf-ayar-satir qt-pf-ayar-satir--duzenle">
            {/* Paket 37 H: neyi değiştireceğin görünsün (lig çerçevesi dahil) */}
            <span className="qt-pf-avatar-onizleme">
              <AvatarCerceve profile={profile} boyut={44} userId={profile.id} />
            </span>
            <span className="qt-kucuk qt-soluk qt-pf-ayar-metin">
              {profile.avatar_onayli
                ? tt("Avatarın diğer oyunculara görünüyor.")
                : tt("Avatar seçmedin; adının ilk harfi gösteriliyor.")}
            </span>
            <QtDugme tur="ikincil" boyut="k" onClick={() => setAvatarDuzenle(true)}>
              {tt("Değiştir")}
            </QtDugme>
          </div>
        )}
      </QtKart>

      {/* ---------- Davet kodu ---------- */}
      <QtKart as="section" className="qt-pf-bolum" aria-labelledby="qt-pf-davet-kodu">
        <h2 id="qt-pf-davet-kodu" className="qt-baslik-3">{tt("Davet kodun")}</h2>
        {/* Kodun kendisi düğme: dokununca YALNIZ kod panoya gider. */}
        <DavetKodu kod={profile.davet_kodu} />
        <QtDugme
          tur="ikincil"
          ikon={kopyalandi ? "onay" : "kopyala"}
          tamGenislik
          devreDisi={!davetLinki}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(davetLinki);
              setKopyalandi(true);
              setTimeout(() => setKopyalandi(false), 2500);
            } catch (e) {
              console.warn("[Bildim] davet linki kopyalanamadı:", e?.message ?? e);
            }
          }}
        >
          {kopyalandi ? tt("Kopyalandı") : tt("Davet linkini kopyala")}
        </QtDugme>
      </QtKart>

      {/* ---------- 620: Engellediklerim ---------- */}
      <EngellediklerimBolumu />
    </>
  );
}
