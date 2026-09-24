/**
 * PROFİL › KOLEKSİYON (481) — çerçeveler, auralar, avatarlar tek yerde; takma/çıkarma.
 *   Çerçeve = kazanılan prestij (lig, turnuva, level, etkinlik) — satılmaz; kilitliler nasıl
 *             kazanılacağıyla görünür.
 *   Aura    = avatarın arkasındaki tema katmanı — Dükkân'da elmasla alınır (etkinlik aurası satılmaz).
 *   Avatar  = profesyonel avatar seti (avatar_onayla).
 * Katman sırası her yerde aynı (CerceveliAvatar): aura (arkada) → avatar → çerçeve (önde).
 * Veri: cerceveKatalogu/cerceveTak, auraKatalogu/auraTak (oyun/lib/cerceve.js). Listeler durağan.
 * (Eski CerceveSecici.jsx'in yerine; qt-cs- sınıfları aynı.)
 */
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Avatar from "../../src/components/Avatar.jsx";
import { useAuth } from "../../src/context/AuthContext.jsx";
import { supabase } from "../../src/lib/supabase.js";
import CerceveliAvatar from "./CerceveliAvatar.jsx";
import CerceveGorseli, { icBoyut } from "../tasarim/cerceveler/CerceveGorseli.jsx";
import { cerceveTanimiBul, auraTanimiBul } from "../tasarim/cerceveler/tanimlar.js";
import DurumKutusu from "./DurumKutusu.jsx";
import { NadirlikEtiketi, ElmasFiyat } from "./DukkanAuralar.jsx";
import { HAZIR_AVATARLAR } from "./ProfilAyarlari.jsx";
import { cerceveKatalogu, cerceveTak, auraKatalogu, auraTak, oyuncuKartiUnut } from "../lib/cerceve.js";
import { LIG_ADLARI } from "../lib/lig.js";
import { hataMesaji } from "../lib/hata.js";
import { tt } from "../lib/dil.js";
import { y } from "../lib/yol.js";
import { QtDugme, QtIkon, QtKart } from "../tasarim/index.js";
import "../tasarim/ekranlar/cerceve-secici.css";

/** Kazanılmamış çerçevenin nasıl kazanılacağı (kosul: "lig:gumus" | "level:25" | "turnuva:1" | "etkinlik:yilbasi"). */
export function kosulMetni(kosul) {
  const [tur, deger] = String(kosul ?? "").split(":");
  if (tur === "lig") return tt("{lig} Lig'e yüksel", { lig: LIG_ADLARI[deger] ?? deger });
  if (tur === "level") return tt("Level {n}'e ulaş", { n: deger });
  if (tur === "turnuva") return tt("Bir turnuvayı birinci bitir");
  if (tur === "etkinlik" && deger === "yilbasi") return tt("Yılbaşı etkinliğinde kazanılır");
  if (tur === "etkinlik" && deger === "ramazan") return tt("Ramazan Bayramı etkinliğinde kazanılır");
  return tt("Etkinlik ödülü");
}

const KAYNAK_ADI = { lig: "Lig", turnuva: "Turnuva", level: "Level", etkinlik: "Etkinlik" };

export default function Koleksiyon() {
  const { user, profile, refreshProfile } = useAuth();
  const [cerceveler, setCerceveler] = useState(null);
  const [auralar, setAuralar] = useState(null);
  const [hata, setHata] = useState(null);
  const [mesgul, setMesgul] = useState(null);
  const [bilgi, setBilgi] = useState(null);

  const yukle = useCallback(async () => {
    setHata(null);
    try {
      const [c, a] = await Promise.all([cerceveKatalogu(), auraKatalogu()]);
      setCerceveler([...c].sort((x, z) => (x.sira ?? 0) - (z.sira ?? 0)));
      setAuralar([...a].sort((x, z) => (x.sira ?? 0) - (z.sira ?? 0)));
    } catch (e) {
      setHata(hataMesaji(e, tt("Koleksiyon yüklenemedi.")));
    }
  }, []);
  useEffect(() => { yukle(); }, [yukle]);

  if (!cerceveler || !auralar) {
    return (
      <QtKart className="qt-cs">
        <DurumKutusu durum={hata ? "hata" : "yukleniyor"} metin={hata ?? undefined} onTekrar={yukle} satir={4} />
      </QtKart>
    );
  }

  const takiliCerceve = cerceveler.find((c) => c.takili)?.anahtar ?? null;
  const takiliAura = auralar.find((a) => a.takili)?.anahtar ?? null;

  const cerceveSec = async (anahtar) => {
    if (mesgul || anahtar === takiliCerceve) return;
    setMesgul(`c:${anahtar ?? "yok"}`);
    setHata(null);
    try {
      await cerceveTak(anahtar, user?.id);
      setCerceveler((l) => l.map((c) => ({ ...c, takili: c.anahtar === anahtar })));
      setBilgi(anahtar ? tt("Çerçeve takıldı.") : tt("Çerçeve çıkarıldı."));
    } catch (e) {
      setHata(hataMesaji(e, tt("Çerçeve takılamadı.")));
    } finally {
      setMesgul(null);
    }
  };
  const auraSec = async (anahtar) => {
    if (mesgul || anahtar === takiliAura) return;
    setMesgul(`a:${anahtar ?? "yok"}`);
    setHata(null);
    try {
      await auraTak(anahtar, user?.id);
      setAuralar((l) => l.map((a) => ({ ...a, takili: a.anahtar === anahtar })));
      setBilgi(anahtar ? tt("Aura takıldı.") : tt("Aura çıkarıldı."));
    } catch (e) {
      setHata(hataMesaji(e, tt("Aura takılamadı.")));
    } finally {
      setMesgul(null);
    }
  };
  const avatarSec = async (url) => {
    if (mesgul || profile?.avatar_url === url) return;
    setMesgul(`v:${url}`);
    setHata(null);
    try {
      const { error } = await supabase.rpc("avatar_onayla", { p_url: url });
      if (error) throw error;
      await refreshProfile(user.id);
      oyuncuKartiUnut(user?.id);
      setBilgi(tt("Avatar değişti."));
    } catch (e) {
      setHata(hataMesaji(e, tt("Avatar kaydedilemedi.")));
    } finally {
      setMesgul(null);
    }
  };

  const sahipCerceve = cerceveler.filter((c) => c.sahip).length;
  const sahipAura = auralar.filter((a) => a.sahip).length;
  const durumYazi = (secili, anahtarMesgul) => (secili ? tt("Takılı") : mesgul === anahtarMesgul ? tt("Takılıyor…") : tt("Tak"));

  return (
    <div className="qt-ks">
      {/* Önizleme: şu an herkesin gördüğü hâl */}
      <QtKart className="qt-ks-onizleme" aria-live="polite">
        <CerceveliAvatar profile={profile ?? {}} userId={user?.id} boyut={112} hareketli />
        <div className="qt-ks-ozet">
          <h2 className="qt-baslik-3">{tt("Görünümün")}</h2>
          <p className="qt-kucuk qt-soluk">{tt("Aura arkada, avatar ortada, çerçeve önde. Maçta, lig tablosunda ve profilinde herkes böyle görür.")}</p>
          <p className="qt-kucuk">
            {tt("{a}/{b} çerçeve · {c}/{d} aura", { a: sahipCerceve, b: cerceveler.length, c: sahipAura, d: auralar.length })}
          </p>
        </div>
      </QtKart>
      {bilgi && <p className="qt-ks-bilgi" role="status">{bilgi}</p>}
      {hata && <p className="qt-cs-hata" role="alert">{hata}</p>}

      {/* ---------- Çerçeveler (kazanılır, satılmaz) ---------- */}
      <QtKart as="section" className="qt-cs" aria-labelledby="qt-ks-cerceve">
        <h2 id="qt-ks-cerceve" className="qt-baslik-3">{tt("Çerçeveler")}</h2>
        <p className="qt-kucuk qt-soluk">{tt("Çerçeve satılmaz, kazanılır: lig, turnuva, level ve etkinliklerle.")}</p>
        <ul className="qt-cs-izgara">
          <li>
            <button type="button" className="qt-cs-oge" aria-pressed={takiliCerceve === null} disabled={Boolean(mesgul)}
                    onClick={() => cerceveSec(null)}>
              <CerceveGorseli anahtar={null} boyut={64}>
                <Avatar profile={profile ?? {}} boyut={icBoyut(64, false)} />
              </CerceveGorseli>
              <span className="qt-cs-ad">{tt("Çerçevesiz")}</span>
              <span className="qt-cs-durum">{durumYazi(takiliCerceve === null, "c:yok")}</span>
            </button>
          </li>
          {cerceveler.map((c) => {
            const tanim = cerceveTanimiBul(c.anahtar, c);
            const ad = c.ad ?? tt(tanim?.ad ?? "");
            return (
              <li key={c.anahtar}>
                <button type="button" className={"qt-cs-oge" + (c.sahip ? "" : " qt-cs-oge--kilitli")}
                        aria-pressed={c.sahip ? c.takili : undefined} disabled={Boolean(mesgul) || !c.sahip}
                        aria-label={c.sahip ? undefined : tt("{ad} — kilitli: {kosul}", { ad, kosul: kosulMetni(c.kosul) })}
                        onClick={() => cerceveSec(c.anahtar)}>
                  <CerceveGorseli anahtar={c.anahtar} satir={c} boyut={64}>
                    <Avatar profile={profile ?? {}} boyut={icBoyut(64, !!tanim)} />
                  </CerceveGorseli>
                  <span className="qt-cs-ad">{ad}</span>
                  <span className="qt-cs-kaynak">{tt(KAYNAK_ADI[c.kaynak] ?? "Etkinlik")}</span>
                  {c.sahip
                    ? <span className="qt-cs-durum">{durumYazi(c.takili, `c:${c.anahtar}`)}</span>
                    : <span className="qt-cs-kosul"><QtIkon ad="kilit" boyut={12} /> {kosulMetni(c.kosul)}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </QtKart>

      {/* ---------- Auralar (elmasla dükkândan) ---------- */}
      <QtKart as="section" className="qt-cs" aria-labelledby="qt-ks-aura">
        <h2 id="qt-ks-aura" className="qt-baslik-3">{tt("Auralar")}</h2>
        <p className="qt-kucuk qt-soluk">{tt("Aura avatarının arkasında durur. Dükkân'da elmasla alınır.")}</p>
        <ul className="qt-cs-izgara">
          <li>
            <button type="button" className="qt-cs-oge" aria-pressed={takiliAura === null} disabled={Boolean(mesgul)}
                    onClick={() => auraSec(null)}>
              <CerceveliAvatar profile={profile ?? {}} userId={user?.id} aura={null} boyut={64} />
              <span className="qt-cs-ad">{tt("Aurasız")}</span>
              <span className="qt-cs-durum">{durumYazi(takiliAura === null, "a:yok")}</span>
            </button>
          </li>
          {auralar.map((a) => {
            const ad = a.ad ?? tt(auraTanimiBul(a.anahtar, a)?.ad ?? "");
            return (
              <li key={a.anahtar}>
                {a.sahip ? (
                  <button type="button" className="qt-cs-oge" aria-pressed={a.takili} disabled={Boolean(mesgul)}
                          onClick={() => auraSec(a.anahtar)}>
                    <CerceveliAvatar profile={profile ?? {}} userId={user?.id} aura={a.anahtar} boyut={64} />
                    <span className="qt-cs-ad">{ad}</span>
                    <NadirlikEtiketi nadirlik={a.nadirlik} />
                    <span className="qt-cs-durum">{durumYazi(a.takili, `a:${a.anahtar}`)}</span>
                  </button>
                ) : (
                  <Link className="qt-cs-oge qt-cs-oge--kilitli" to={y("/joker?sekme=aura")}
                        aria-label={a.satilik ? tt("{ad} — Dükkân'da {n} elmas", { ad, n: a.fiyat }) : tt("{ad} — etkinlik ödülü", { ad })}>
                    <CerceveliAvatar profile={profile ?? {}} userId={user?.id} aura={a.anahtar} boyut={64} />
                    <span className="qt-cs-ad">{ad}</span>
                    <NadirlikEtiketi nadirlik={a.nadirlik} />
                    <span className="qt-cs-kosul">
                      {a.satilik && a.fiyat != null ? <ElmasFiyat fiyat={a.fiyat} boyut={14} /> : <><QtIkon ad="kilit" boyut={12} /> {tt("Etkinlik ödülü")}</>}
                    </span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
        <QtDugme as={Link} to={y("/joker?sekme=aura")} tur="ikincil" ikon="dukkan" tamGenislik>{tt("Dükkân'da auralar")}</QtDugme>
      </QtKart>

      {/* ---------- Avatarlar ---------- */}
      <QtKart as="section" className="qt-cs" aria-labelledby="qt-ks-avatar">
        <h2 id="qt-ks-avatar" className="qt-baslik-3">{tt("Avatarlar")}</h2>
        <ul className="qt-cs-izgara qt-ks-avatarlar">
          {HAZIR_AVATARLAR.map((a) => {
            const secili = profile?.avatar_url === a.url;
            return (
              <li key={a.url}>
                <button type="button" className="qt-cs-oge qt-ks-avatar" aria-pressed={secili} disabled={Boolean(mesgul)}
                        aria-label={tt("{0} avatarını seç", { 0: a.ad })} onClick={() => avatarSec(a.url)}>
                  <img src={a.url} alt="" loading="lazy" decoding="async" width="56" height="56" />
                  <span className="qt-cs-ad">{a.ad}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </QtKart>
    </div>
  );
}
