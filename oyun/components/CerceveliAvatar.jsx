/**
 * ÇERÇEVELİ AVATAR — avatar gösterilen HER YERDE bu kullanılır (ana sayfa, üst çubuk, profil, maç
 * şeridi, maç sonu, lig tablosu, arkadaşlar, meydan okumalar, mesajlar). Takılı çerçeve sunucudan
 * (`oyuncu_kartlari`, oyun/lib/cerceve.js — toplu + önbellekli) gelir; görünüm oyun/tasarim/cerceveler/.
 *
 * <CerceveliAvatar profile={p} userId={p.id} boyut={64} hareketli />
 *
 * - `boyut` dış çaptır (çerçeve dahil); avatar içeride.
 * - `cerceve` verilirse sorgu yapılmaz (null = çerçevesiz). Kart elde varsa `kart` ver.
 * - `hareketli`: yalnız tekil/önemli yerlerde (ana sayfa kartı, profil başı, maç şeridi). Listelerde verme.
 */
import { useEffect, useState } from "react";
import Avatar from "../../src/components/Avatar.jsx";
import CerceveGorseli, { icBoyut } from "../tasarim/cerceveler/CerceveGorseli.jsx";
import { cerceveTanimiBul } from "../tasarim/cerceveler/tanimlar.js";
import { oyuncuKarti, oyuncuKartiDinle } from "../lib/cerceve.js";
import { tt } from "../lib/dil.js";

export default function CerceveliAvatar({ profile, userId, boyut = 44, cerceve, kart, hareketli = false, className = "" }) {
  const kimlik = userId ?? profile?.id ?? profile?.user_id ?? null;
  const verildi = cerceve !== undefined || kart !== undefined;
  const [okunan, setOkunan] = useState(null);   // { cerceve, nadirlik }
  const [tazele, setTazele] = useState(0);

  useEffect(() => {
    if (verildi || !kimlik) return undefined;
    return oyuncuKartiDinle((id) => { if (!id || id === kimlik) setTazele((x) => x + 1); });
  }, [verildi, kimlik]);

  useEffect(() => {
    if (verildi || !kimlik) { setOkunan(null); return undefined; }
    let aktif = true;
    oyuncuKarti(kimlik)
      .then((k) => { if (aktif) setOkunan(k ? { cerceve: k.cerceve ?? null, nadirlik: k.cerceve_nadirlik } : null); })
      .catch((e) => { console.error("[Bildim] çerçeve okunamadı:", e?.message ?? e); if (aktif) setOkunan(null); });
    return () => { aktif = false; };
  }, [verildi, kimlik, tazele]);

  const anahtar = cerceve !== undefined ? cerceve : kart !== undefined ? (kart?.cerceve ?? null) : (okunan?.cerceve ?? null);
  const nadirlik = kart?.cerceve_nadirlik ?? okunan?.nadirlik;
  const tanim = cerceveTanimiBul(anahtar, { nadirlik });
  const etiket = tanim?.ad ? tt("{ad} çerçevesi", { ad: tt(tanim.ad) }) : undefined;

  return (
    <CerceveGorseli anahtar={anahtar} satir={{ nadirlik }} boyut={boyut} hareketli={hareketli}
                    className={className} etiket={etiket}>
      <Avatar profile={profile ?? {}} boyut={icBoyut(boyut, !!tanim)} />
    </CerceveGorseli>
  );
}
