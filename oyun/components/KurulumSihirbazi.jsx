import { useEffect, useMemo, useState } from "react";
import Modal from "./Modal.jsx";
import { hataMesaji } from "../lib/hata.js";
import { supabase } from "../../src/lib/supabase.js";
import { useAuth } from "../../src/context/AuthContext.jsx";
import Avatar from "../../src/components/Avatar.jsx";
import Bayrak from "./Bayrak.jsx";
import SehirArama from "./SehirArama.jsx";
import { ulkeAdi } from "../lib/konum.js";
import { useDil } from "../lib/dilKanca.js";
import { tt } from "../lib/dil.js";
import { QtDugme, QtToast } from "../tasarim/index.js";
import { DavetKoduGir } from "./DavetKarti.jsx";
import { HAZIR_AVATARLAR, useKatalogAvatarlari } from "../lib/avatarKatalogu.js";
import "../tasarim/ekranlar/g-ortak.css";
import "../tasarim/ekranlar/g-kurulum.css";

// Profesyonel avatar seti (31) — tek liste oyun/lib/avatarKatalogu.js (profil, Koleksiyon, Dükkân › Avatar ile aynı).

/**
 * İlk girişte (ve takma adı olmayan mevcut üyelerde) zorunlu kurulum:
 *   1) Takma ad  2) Avatar  3) Şehir/ülke
 * Tamamlanmadan oyun ekranları açılmaz (Layout tarafından sarmalanır).
 * Gerçek ad ve Google fotoğrafı asla otomatik gösterilmez.
 */
export default function KurulumSihirbazi({ onTamam }) {
  const { user, profile, refreshProfile } = useAuth();
  // Yeni oyuncunun ilk gördüğü ekran: dil kuralı Login ile aynı (bkz. dil.js)
  const { ceviri } = useDil();
  const [adim, setAdim] = useState(1);
  const [takmaAd, setTakmaAd] = useState(profile?.takma_ad ?? "");
  const [secilenAvatar, setSecilenAvatar] = useState(null);
  // 550: 27 yeni avatar (günlük + kostümlü, hepsi ücretsiz) sunucu kataloğundan; migration yoksa boş
  const katalogAvatarlari = useKatalogAvatarlari(adim === 2);
  const [googleFoto, setGoogleFoto] = useState(null);
  const [ulkeler, setUlkeler] = useState([]);
  const [sehirler, setSehirler] = useState([]);
  const [ulke, setUlke] = useState(profile?.ulke ?? "TR");
  const [sehir, setSehir] = useState(profile?.sehir ?? "");
  const [hata, setHata] = useState(null);
  const [calisiyor, setCalisiyor] = useState(false);
  const [sehirYukleniyor, setSehirYukleniyor] = useState(false);
  const ulkeListesi = useMemo(
    () => ulkeler
      .map((u) => ({ ...u, gorunen: ulkeAdi(u.kod, u.ad) }))
      .sort((a, b) => a.gorunen.localeCompare(b.gorunen)),
    [ulkeler]
  );

  // Hangi adımdan başlanacağını profil belirler (mevcut üyeler yarıda kalabilir)
  useEffect(() => {
    if (!profile) return;
    if (!profile.takma_ad_secildi) setAdim(1);
    else if (!profile.avatar_onayli) setAdim(2);
    else if (!profile.ulke) setAdim(3);
    else onTamam?.();
  }, [profile, onTamam]);

  // Google fotoğrafı yalnızca ONAY için gösterilir; DB'ye kendiliğinden yazılmaz
  useEffect(() => {
    const url =
      user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? null;
    if (url && /^https:\/\//.test(url)) setGoogleFoto(url);
  }, [user]);

  useEffect(() => {
    if (adim !== 3) return;
    let aktif = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("ulkeler")
          .select("kod, ad")
          .order("ad");
        if (error) throw error;
        if (aktif) setUlkeler(data ?? []);
      } catch (e) {
        if (aktif) setHata(hataMesaji(e, ceviri("Ülke listesi yüklenemedi.")));
      }
    })();
    return () => {
      aktif = false;
    };
  }, [adim]);

  useEffect(() => {
    if (adim !== 3 || !ulke) return;
    let aktif = true;
    setSehirYukleniyor(true);
    (async () => {
      try {
        // Büyük şehir önce (arama boşken listede en kalabalıklar üstte)
        const { data, error } = await supabase
          .from("sehirler")
          .select("ad, nufus")
          .eq("ulke", ulke)
          .order("nufus", { ascending: false, nullsFirst: false })
          .order("ad");
        if (error) throw error;
        if (aktif) setSehirler(data ?? []);
      } catch (e) {
        if (aktif) setHata(hataMesaji(e, ceviri("Şehir listesi yüklenemedi.")));
      } finally {
        if (aktif) setSehirYukleniyor(false);
      }
    })();
    return () => {
      aktif = false;
    };
  }, [adim, ulke]);

  const adKaydet = async () => {
    setHata(null);
    setCalisiyor(true);
    try {
      const { error } = await supabase.rpc("takma_ad_sec", { p_ad: takmaAd.trim() });
      if (error) throw error;
      await refreshProfile(user.id);
      setAdim(2);
    } catch (e) {
      setHata(hataMesaji(e, ceviri("Takma ad kaydedilemedi.")));
    } finally {
      setCalisiyor(false);
    }
  };

  const avatarKaydet = async (url) => {
    setHata(null);
    setCalisiyor(true);
    try {
      const { error } = await supabase.rpc("avatar_onayla", { p_url: url });
      if (error) throw error;
      await refreshProfile(user.id);
      setAdim(3);
    } catch (e) {
      setHata(hataMesaji(e, ceviri("Avatar kaydedilemedi.")));
    } finally {
      setCalisiyor(false);
    }
  };

  const konumKaydet = async () => {
    setHata(null);
    if (!sehir.trim() || !sehirler.some((s) => s.ad === sehir)) {
      setHata(ceviri("Şehrini listeden seç."));
      return;
    }
    setCalisiyor(true);
    try {
      const { error } = await supabase.rpc("profil_konum_kaydet", {
        p_ulke: ulke,
        p_sehir: sehir.trim(),
      });
      if (error) throw error;
      await refreshProfile(user.id);
      onTamam?.();
    } catch (e) {
      setHata(hataMesaji(e, ceviri("Konum kaydedilemedi.")));
    } finally {
      setCalisiyor(false);
    }
  };

  const hataNotu = hata ? <QtToast ton="yanlis" metin={hata} className="g-sihirbaz-hata" /> : null;

  // Tasarım Adım 2 (Yön A): eski paylaşılan Modal (bd-modal-katman — araç testleri
  // `.bd-modal-katman input/select` ve `img[src*='/avatars/']` arar) içinde tasarım
  // sisteminin paneli. RPC'ler ve adım akışı aynı.
  return (
    <Modal etiket={ceviri("Kurulum")}>
      <div className="qt-modal g-sihirbaz">
        <div className="g-sihirbaz-adimlar">
          <div className="g-sihirbaz-cizgi" aria-hidden="true">
            {[1, 2, 3].map((a) => (
              <span key={a} className={"g-sihirbaz-parca" + (adim >= a ? " g-sihirbaz-parca--dolu" : "")} />
            ))}
          </div>
          <span className="qt-kucuk qt-soluk">{ceviri("Adım {n}/{t}", { n: adim, t: 3 })}</span>
        </div>

        {adim === 1 && (
          <div key="a1" className="g-sihirbaz-adim qt-h-gir">
            <h2 className="qt-baslik-2">{ceviri("Kendine bir takma ad seç")}</h2>
            <p className="qt-kucuk qt-soluk">
              {ceviri("Quiz Tactics'te gerçek adın hiçbir zaman gösterilmez. Diğer oyuncular yalnızca burada seçtiğin takma adı görür.")}
            </p>
            <label className="g-alan">
              <span className="g-alan-etiket">{ceviri("Takma ad (3-16 karakter)")}</span>
              <input
                className="g-girdi"
                type="text"
                maxLength={16}
                autoFocus
                autoComplete="nickname"
                value={takmaAd}
                placeholder={ceviri("ör. BilgeKartal")}
                onChange={(e) => setTakmaAd(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && takmaAd.trim().length >= 3 && adKaydet()}
              />
            </label>
            <p className="qt-kucuk qt-soluk">
              {ceviri("Harf, rakam ve alt çizgi kullanabilirsin. Sonradan günde bir kez değiştirilebilir.")}
            </p>
            {hataNotu}
            <QtDugme
              tamGenislik
              ikonSag="ileri"
              yukleniyor={calisiyor}
              devreDisi={takmaAd.trim().length < 3}
              onClick={adKaydet}
            >
              {calisiyor ? ceviri("Kaydediliyor…") : ceviri("Devam")}
            </QtDugme>
          </div>
        )}

        {adim === 2 && (
          <div key="a2" className="g-sihirbaz-adim qt-h-gir">
            <h2 className="qt-baslik-2">{ceviri("Avatarını seç")}</h2>
            <p className="qt-kucuk qt-soluk">
              {ceviri("Hazır bir avatar seç ya da Google fotoğrafını kullanmayı onayla. Onaylamazsan fotoğrafın kimseye gösterilmez.")}
            </p>

            <div className="g-avatar-izgara" role="group" aria-label={ceviri("Avatarını seç")}>
              {[...HAZIR_AVATARLAR, ...katalogAvatarlari].map((a) => (
                <button
                  key={a.url}
                  type="button"
                  className={"g-avatar-sec" + (secilenAvatar === a.url ? " g-avatar-sec--secili" : "")}
                  aria-pressed={secilenAvatar === a.url}
                  aria-label={ceviri("{ad} avatarını seç", { ad: ceviri(a.ad) })}
                  title={ceviri(a.ad)}
                  onClick={() => setSecilenAvatar(a.url)}
                >
                  <img src={a.url} alt="" loading="lazy" />
                </button>
              ))}
            </div>

            {hataNotu}

            <QtDugme
              tamGenislik
              ikon="onay"
              yukleniyor={calisiyor && Boolean(secilenAvatar)}
              devreDisi={calisiyor || !secilenAvatar}
              onClick={() => avatarKaydet(secilenAvatar)}
            >
              {ceviri("Bu avatarı kullan")}
            </QtDugme>
            {googleFoto && (
              <QtDugme tur="ikincil" tamGenislik devreDisi={calisiyor} onClick={() => avatarKaydet(googleFoto)}>
                <span className="g-sihirbaz-google">
                  <img src={googleFoto} alt="" referrerPolicy="no-referrer" />
                  {ceviri("Google fotoğrafımı kullan")}
                </span>
              </QtDugme>
            )}
            <QtDugme tur="hayalet" tamGenislik devreDisi={calisiyor} onClick={() => avatarKaydet(null)}>
              {ceviri("Avatarsız devam et")}
            </QtDugme>
          </div>
        )}

        {adim === 3 && (
          <div key="a3" className="g-sihirbaz-adim qt-h-gir">
            <h2 className="qt-baslik-2">{ceviri("Hangi şehir için yarışıyorsun?")}</h2>
            <p className="qt-kucuk qt-soluk">
              {ceviri("Şehir ve ülke liglerinde bu bilgiyle yarışırsın. Günde en fazla bir kez değiştirebilirsin; o hafta puan kazandıysan yeni haftayı beklersin.")}
            </p>

            <label className="g-alan">
              <span className="g-alan-etiket">
                {ceviri("Ülke")} {ulke && <Bayrak kod={ulke} />}
              </span>
              <select
                className="g-girdi"
                value={ulke}
                onChange={(e) => {
                  if (e.target.value === ulke) return;
                  setUlke(e.target.value);
                  setSehir("");
                  // Önceki ülkenin şehirleri yeni ülkeyle seçilip sunucuda "Geçersiz şehir" olmasın
                  setSehirler([]);
                  setSehirYukleniyor(true);
                }}
              >
                {ulkeListesi.map((u) => (
                  <option key={u.kod} value={u.kod}>
                    {u.gorunen}
                  </option>
                ))}
              </select>
            </label>

            <SehirArama
              sarmalSinif="g-alan"
              etiketSinif="g-alan-etiket"
              girdiSinifi="g-girdi"
              etiket={ceviri("Şehir")}
              sehirler={sehirler}
              deger={sehir}
              onSec={setSehir}
              yukleniyor={sehirYukleniyor}
            />

            {/* Rozet + çerçeve paketi: davet kodu (isteğe bağlı; /davet/KOD ile gelindiyse dolu gelir) */}
            <DavetKoduGir />

            {hataNotu}

            <QtDugme tamGenislik ikonSag="oyna" yukleniyor={calisiyor} onClick={konumKaydet}>
              {calisiyor ? ceviri("Kaydediliyor…") : ceviri("Oyuna başla")}
            </QtDugme>
          </div>
        )}

        {profile && (
          <div className="g-sihirbaz-onizleme">
            <Avatar profile={profile} boyut={36} />
            <span className="qt-kucuk">{profile.gorunen_ad}</span>
          </div>
        )}
      </div>
    </Modal>
  );
}
