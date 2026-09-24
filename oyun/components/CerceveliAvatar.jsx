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
 * - AURA (481): avatarın arkasındaki tema katmanı da buradan çözülür — çağıran dosya bir şey yapmaz.
 *   `aura` verilirse o; `kart` içinde `aura` alanı varsa o; yoksa oyuncu kartı (toplu + önbellekli
 *   oyuncu_kartlari) okunur. Katman sırası: aura (arkada) → avatar → çerçeve (önde).
 * - ÇERÇEVE TARZI (550): Ida /cerceve-onizleme'de tarz seçtiyse Altın Lig çerçevesi o tarzda çizilir
 *   (DenemeCerceve, tembel yüklenir; yüklenirken bugünkü çerçeve). Aura takılıysa bugünkü çerçeve kalır
 *   (yeni tarzın aura katmanı yok). Seçim yoksa hiçbir şey değişmez.
 */
import { lazy, Suspense, useEffect, useState } from "react";
import Avatar from "../../src/components/Avatar.jsx";
import CerceveGorseli, { icBoyut } from "../tasarim/cerceveler/CerceveGorseli.jsx";
import { cerceveTanimiBul } from "../tasarim/cerceveler/tanimlar.js";
import { oyuncuKarti, oyuncuKartiDinle } from "../lib/cerceve.js";
import { tt } from "../lib/dil.js";
import { useCerceveTarzi } from "../lib/cerceveTarzi.js";

const DenemeCerceve = lazy(() => import("../tasarim/cerceveler/deneme/DenemeCerceve.jsx"));

export default function CerceveliAvatar({ profile, userId, boyut = 44, cerceve, kart, aura, hareketli = false, className = "" }) {
  const kimlik = userId ?? profile?.id ?? profile?.user_id ?? null;
  const cerceveVerildi = cerceve !== undefined || kart !== undefined;
  const auraVerildi = aura !== undefined || (kart != null && Object.prototype.hasOwnProperty.call(kart, "aura"));
  // Çerçeve ya da aura elde değilse kart okunur (aynı karedeki istekler tek RPC, oturum boyunca önbellek)
  const verildi = cerceveVerildi && auraVerildi;
  const [okunan, setOkunan] = useState(null);   // { cerceve, nadirlik, aura }
  const [tazele, setTazele] = useState(0);

  useEffect(() => {
    if (verildi || !kimlik) return undefined;
    return oyuncuKartiDinle((id) => { if (!id || id === kimlik) setTazele((x) => x + 1); });
  }, [verildi, kimlik]);

  useEffect(() => {
    if (verildi || !kimlik) { setOkunan(null); return undefined; }
    let aktif = true;
    oyuncuKarti(kimlik)
      .then((k) => { if (aktif) setOkunan(k ? { cerceve: k.cerceve ?? null, nadirlik: k.cerceve_nadirlik, aura: k.aura ?? null } : null); })
      .catch((e) => { console.error("[Bildim] çerçeve okunamadı:", e?.message ?? e); if (aktif) setOkunan(null); });
    return () => { aktif = false; };
  }, [verildi, kimlik, tazele]);

  const anahtar = cerceve !== undefined ? cerceve : kart !== undefined ? (kart?.cerceve ?? null) : (okunan?.cerceve ?? null);
  const nadirlik = kart?.cerceve_nadirlik ?? okunan?.nadirlik;
  const auraAnahtar = aura !== undefined ? aura : auraVerildi ? (kart?.aura ?? null) : (okunan?.aura ?? null);
  const tanim = cerceveTanimiBul(anahtar, { nadirlik });
  const etiket = tanim?.ad ? tt("{ad} çerçevesi", { ad: tt(tanim.ad) }) : undefined;

  const tarz = useCerceveTarzi();
  const bugunku = (
    <CerceveGorseli anahtar={anahtar} satir={{ nadirlik }} aura={auraAnahtar} boyut={boyut} hareketli={hareketli}
                    className={className} etiket={etiket}>
      <Avatar profile={profile ?? {}} boyut={icBoyut(boyut, !!tanim)} />
    </CerceveGorseli>
  );
  if (tarz && tanim?.anahtar === "lig_altin" && !auraAnahtar) {
    return (
      <Suspense fallback={bugunku}>
        <DenemeCerceve tarz={tarz} boyut={boyut} hareketli={hareketli} etiket={etiket} className={className}>
          <Avatar profile={profile ?? {}} boyut={icBoyut(boyut, true)} />
        </DenemeCerceve>
      </Suspense>
    );
  }
  return bugunku;
}
