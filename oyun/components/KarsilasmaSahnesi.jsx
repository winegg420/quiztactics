// ============================================================
// KARŞILAŞMA SAHNESİ — rakip arama ekranının görsel katmanı (Paket 30 E)
//
// Eski ekran boş bir alanda dönen maskottu ("amatörce"). Sorun süsleme değil,
// ekranda OYUNCUNUN KENDİSİ yoktu. Bu bileşen aramayı bir karşılaşma kurulumuna
// çevirir: solda oyuncu, sağda rakip yeri, ortada VS.
//
// YALNIZ SUNUM: eşleştirme mantığı, süreler ve RPC'ler çağıran ekranda
// (DuelloArama, RakipAra) kalır. Bu bileşen yalnız bir kez, açılışta, kendi
// unvanını okumak için hafif bir sorgu yapar — her saniye yenileme YOK.
//
// Yön A (Şerit A): beyaz modal yüzeyinde çizilir (RakipAra ve Düello araması
// QtModal içine koyar). Prop arayüzü AYNI.
// iOS: katman `position: fixed`; transform'lu animasyonlar yalnız İÇ öğelerde.
// ============================================================
import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase.js";
import { useAuth } from "../../src/context/AuthContext.jsx";
import AvatarCerceve from "./AvatarCerceve.jsx";
import RankBadge from "./RankBadge.jsx";
import { QtAvatar, QtIkon, QtRozet, sinif } from "../tasarim/index.js";
import "../tasarim/ekranlar/a-modlar.css";
import { unvanAdi } from "../lib/unvanlar.js";
import { tt } from "../lib/dil.js";

/** Rakip bulununca VS parlaması + kartların yaklaşması bu kadar sürer (ms). */
export const KARSILASMA_ANIM_MS = 1000;

/**
 * @param {object}  o
 * @param {object|null} o.rakip   bulunduysa rakibin profili (gorunen_ad, gorunen_avatar, puan…)
 * @param {boolean} o.bulundu     eşleşme oldu mu
 * @param {string|null} [o.ezeli] "Bu oyuncuyla 7-4 öndesin" gibi hazır metin
 * @param {string}  o.baslik      üst başlık ("Düello rakibi aranıyor…")
 * @param {React.ReactNode} [o.children]  alt satırlar (ipucu, sayaç, düğmeler)
 */
// Paket 42 D.1: bosEtiket — rakip kartı boşken altındaki yazı başlıkla aynı durumu söylesin
// (başlık "Maç hazırlanıyor…" derken kutu "Rakip aranıyor" diyordu).
export default function KarsilasmaSahnesi({ rakip, bulundu, ezeli, baslik, bosEtiket, children }) {
  const { user, profile } = useAuth();
  const [unvan, setUnvan] = useState(null);

  useEffect(() => {
    if (!user?.id) return undefined;
    let aktif = true;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("oyuncu_kategori_profili", { p_user: user.id });
        if (error) throw error;
        if (aktif) setUnvan(unvanAdi(data?.unvan) ?? null);
      } catch (e) {
        console.warn("[Bildim] karşılaşma: unvan okunamadı:", e?.message ?? e);   // unvan satırı çıkmaz
      }
    })();
    return () => { aktif = false; };
  }, [user?.id]);

  const seri = Number(profile?.seri_gun ?? 0);

  return (
    <div className={sinif("a-karsilasma", bulundu && "a-karsilasma--bulundu")}>
      <p className="a-karsilasma-baslik" aria-live="polite">{baslik}</p>

      <div className="a-karsilasma-sahne">
        <div className="a-karsilasma-kart a-karsilasma-kart--ben">
          <AvatarCerceve profile={profile ?? {}} boyut={72} userId={user?.id} />
          <span className="a-karsilasma-ad">{profile?.gorunen_ad ?? tt("Sen")}</span>
          <RankBadge level={profile?.level ?? 1} />
          {unvan && <span className="a-karsilasma-unvan">{unvan}</span>}
          {seri > 0 && (
            <QtRozet ton="vurgu" boyut="k" ikon="ates">{tt("{0} gün seri", { 0: seri })}</QtRozet>
          )}
        </div>

        <div className="a-karsilasma-vs" aria-hidden="true"><span>VS</span></div>

        <div className={sinif("a-karsilasma-kart", "a-karsilasma-kart--rakip", rakip ? "a-karsilasma-kart--dolu" : "a-karsilasma-kart--bos")}>
          {rakip ? (
            <>
              <QtAvatar src={rakip.gorunen_avatar || undefined} ad={rakip.gorunen_ad ?? ""} boyut="xl" halka="vurgu" />
              <span className="a-karsilasma-ad">{rakip.gorunen_ad}</span>
              {/* P2A: rütbe level'den; rakibin verisinde level yoksa id ile okunur */}
              {(rakip.level != null || rakip.id) && <RankBadge level={rakip.level} userId={rakip.id} />}
            </>
          ) : (
            <>
              <span className="a-karsilasma-siluet" aria-hidden="true"><QtIkon ad="soru" boyut={34} /></span>
              <span className="a-karsilasma-ad a-karsilasma-ad--soluk">
                {bulundu ? tt("Rakip bulundu!") : bosEtiket ?? tt("Rakip aranıyor")}
              </span>
            </>
          )}
        </div>
      </div>

      {ezeli && <p className="a-karsilasma-ezeli">{ezeli}</p>}

      {children}
    </div>
  );
}
