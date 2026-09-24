import { useEffect, useState } from "react";
import KategoriIkon from "./KategoriIkon.jsx";
import { hataMesaji } from "../lib/hata.js";
import { supabase } from "../../src/lib/supabase.js";
import { useAuth } from "../../src/context/AuthContext.jsx";
import { kategoriEtiket, kategorileriSirala } from "../lib/kategoriler.js";
import { sureMetni } from "../lib/konum.js";
import { y } from "../lib/yol.js";
import { MEYDAN_ACIK } from "../lib/ozellikBayraklari.js";
import DavetKodu from "./DavetKodu.jsx";
import AvatarCerceve from "./AvatarCerceve.jsx";
import { tt } from "../lib/dil.js";
import { rpcDene } from "../lib/rpcDene.js";
import { HAZIR_AVATARLAR, useKatalogAvatarlari } from "../lib/avatarKatalogu.js";
import { QtAnahtar, QtDugme, QtIkon, QtKart, sayiBicim } from "../tasarim/index.js";
import "../tasarim/ekranlar/dukkan-profil.css";

// Profesyonel avatar seti (31) — liste oyun/lib/avatarKatalogu.js'te (Dükkân › Avatar da kullanır; profil
// sayfası paketini dükkâna taşımasın diye). Buradan dışa aktarım geriye uyum için durur.
export { HAZIR_AVATARLAR };

// Takma ad günde bir kez değişir (sunucudaki takma_ad_sec ile aynı pencere).
const TAKMA_AD_KILIT_MS = 24 * 60 * 60 * 1000;

/** Profil sayfasındaki kimlik ayarları: takma ad, avatar, davet kodu, varsayılan kategori. */
export default function ProfilAyarlari() {
  const { user, profile, refreshProfile } = useAuth();
  const [yeniAd, setYeniAd] = useState("");
  const [adDuzenle, setAdDuzenle] = useState(false);
  const [adHata, setAdHata] = useState(null);
  const [avatarDuzenle, setAvatarDuzenle] = useState(false);
  const [avatarHata, setAvatarHata] = useState(null);
  // 550: 27 yeni avatar (ücretsiz) sunucu kataloğundan; migration yoksa boş → yalnız 31 hazır avatar
  const katalogAvatarlari = useKatalogAvatarlari(avatarDuzenle);
  const [kategoriler, setKategoriler] = useState([]);
  const [kategoriHata, setKategoriHata] = useState(null);
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

  useEffect(() => {
    rpcDene("get_categories").then(({ data }) => setKategoriler(data ?? []));
  }, []);

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

  const kategoriKaydet = async (kategori) => {
    setKategoriHata(null);
    try {
      const { error } = await supabase.rpc("tercih_kategori_kaydet", {
        p_kategori: kategori,
      });
      if (error) throw error;
      await refreshProfile(user.id);
    } catch (e) {
      setKategoriHata(hataMesaji(e, tt("Kategori kaydedilemedi.")));
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
          <div className="qt-pf-ayar-satir">
            <div className="qt-pf-ayar-metin">
              <span className="qt-pf-takma-ad">{profile.gorunen_ad}</span>
              <span className="qt-kucuk qt-soluk">
                {kalanKilit > 0
                  ? tt("Tekrar değiştirebilmen için {0} kaldı.", { 0: sureMetni(kalanKilit) })
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
              {[...HAZIR_AVATARLAR, ...katalogAvatarlari].map((a) => {
                const secili = profile.avatar_url === a.url;
                return (
                  <button
                    type="button"
                    key={a.url}
                    className={"qt-pf-avatar-sec" + (secili ? " qt-pf-avatar-sec--secili" : "")}
                    aria-label={tt("{0} avatarını seç", { 0: a.ad })}
                    aria-pressed={secili}
                    title={a.ad}
                    disabled={calisiyor}
                    onClick={() => avatarKaydet(a.url)}
                  >
                    <img src={a.url} alt="" loading="lazy" decoding="async" />
                  </button>
                );
              })}
            </div>
            {avatarHata && <p className="qt-pf-hata" role="alert">{avatarHata}</p>}
            <div className="qt-pf-dugme-sira">
              {googleFoto && (
                <QtDugme tur="ikincil" boyut="k" devreDisi={calisiyor} onClick={() => avatarKaydet(googleFoto)}>
                  {tt("Google fotoğrafım")}
                </QtDugme>
              )}
              <QtDugme tur="ikincil" boyut="k" devreDisi={calisiyor} onClick={() => avatarKaydet(null)}>
                {tt("Kaldır")}
              </QtDugme>
              <QtDugme tur="hayalet" boyut="k" onClick={() => setAvatarDuzenle(false)}>
                {tt("Kapat")}
              </QtDugme>
            </div>
          </>
        ) : (
          <div className="qt-pf-ayar-satir">
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

      {/* ---------- Varsayılan kategori ---------- */}
      <QtKart as="section" className="qt-pf-bolum" aria-labelledby="qt-pf-kategori-tercih">
        <h2 id="qt-pf-kategori-tercih" className="qt-baslik-3">{tt("Varsayılan kategorim")}</h2>
        <p className="qt-kucuk qt-soluk">
          {tt("\"Hemen Oyna\" ve \"Dereceli Maç\" bu kategoride rakip arar. Ana Sayfa'dan da değiştirebilirsin.")}
        </p>
        <div className="qt-pf-kategori-izgara">
          <button
            type="button"
            className={"qt-pf-kategori" + (!profile.tercih_kategori ? " qt-pf-kategori--secili" : "")}
            aria-pressed={!profile.tercih_kategori}
            onClick={() => kategoriKaydet(null)}
          >
            <KategoriIkon anahtar="karisik" boyut={22} plaka />
            <span className="qt-pf-kategori-ad">{tt("Karışık")}</span>
          </button>
          {kategorileriSirala(kategoriler).map((k) => {
            const secili = profile.tercih_kategori === k.kategori;
            return (
              <button
                type="button"
                key={k.kategori}
                className={"qt-pf-kategori" + (secili ? " qt-pf-kategori--secili" : "")}
                aria-pressed={secili}
                onClick={() => kategoriKaydet(k.kategori)}
              >
                <KategoriIkon anahtar={k.kategori} boyut={22} plaka />
                <span className="qt-pf-kategori-ad">{tt(kategoriEtiket(k.kategori))}</span>
                <span className="qt-pf-kategori-alt">{tt("{n} soru", { n: sayiBicim(Number(k.soru_sayisi)) })}</span>
              </button>
            );
          })}
        </div>
        {kategoriHata && <p className="qt-pf-hata" role="alert">{kategoriHata}</p>}
      </QtKart>
    </>
  );
}
