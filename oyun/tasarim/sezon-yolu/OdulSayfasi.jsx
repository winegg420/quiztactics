// Ödül alt sayfası + BÜYÜK ÖNİZLEME (olmazsa olmaz). Tür'e göre:
//   çerçeve → oyuncunun KENDİ avatarı + o çerçeve ("Avatarında böyle görünür") · avatar → ödül avatarı · tepki paketi → emoji paketi
//   unvan → UnvanYazisi · coin/elmas/joker → büyük ikon · placeholder → "?" + "Yakında" · bilinmeyen tür → ödülün kendi görseli.
// Ağır çizim (premium çerçeve) CerceveliAvatar içinde TEMBEL yüklenir; bu dosya ana pakete girmez (sayfa zaten tembel rota).
// Alt düğmeler: Ödülü al / Battle Pass al · N elmas / Kapat (mevcut mantık).
import { useEffect, useRef, useState } from "react";
import { QtDugme, QtModal, QtRozet, QtIkon, sayiBicim } from "../index.js";
import { tt } from "../../lib/dil.js";
import { hataMesaji } from "../../lib/hata.js";
import { bpOdulAl, odulAdi } from "../../lib/sezonYolu.js";
import { KOZMETIK_TANIMLARI, TEPKI_TANIMLARI, tepkiGorseli, premiumSanat } from "../../lib/kozmetik.js";
import Avatar from "../../../src/components/Avatar.jsx";
import CerceveliAvatar from "../../components/CerceveliAvatar.jsx";
import NadirlikEtiketi from "../../components/NadirlikEtiketi.jsx";
import UnvanYazisi from "../../components/UnvanYazisi.jsx";
import "../ekranlar/dukkan-cerceve.css";   // .qt-dc-nadirlik (NadirlikEtiketi'nin stili)
import { ArkaPlanOdulGorsel, OdulGorsel, odulArkaPlani, odulAvatarAdresi } from "./OdulGorsel.jsx";
import { TacIkon } from "./simgeler.jsx";

/** Ödül avatarının adresi (822: veri.url; eski alanlar da okunur) — tek kaynak OdulGorsel.jsx. */
const avatarAdresi = odulAvatarAdresi;

function Onizleme({ odul, ad, profile, userId }) {
  const v = odul.veri ?? {};
  if (odul.placeholder) {
    return (
      <div className="sy-onizleme">
        <span className="sy-soru sy-soru--buyuk" aria-hidden="true">?</span>
        <p className="sy-not">{tt("Bu ödül yakında eklenecek. Görseli açıklanınca burada görünür.")}</p>
      </div>
    );
  }
  if (odul.tur === "cerceve" && v.anahtar) {
    const pc = premiumSanat(v.anahtar) ? v.anahtar : null;
    return (
      <div className="sy-onizleme" data-onizleme="cerceve" data-premium={pc ? "" : undefined}>
        <div className="sy-once-sonra">
          <span className="sy-once" aria-label={tt("Şimdiki avatarın")}><CerceveliAvatar profile={profile} userId={userId} boyut={48} /></span>
          <QtIkon ad="ileri" boyut={22} />
          <CerceveliAvatar profile={profile} userId={userId} boyut={120}
            cerceve={pc ? null : v.anahtar} aura={null} premiumCerceve={pc} premiumAura={null} hareketli />
        </div>
        <p className="sy-not">{tt("Avatarında böyle görünür")}</p>
      </div>
    );
  }
  if (odul.tur === "avatar") {
    const src = avatarAdresi(v);
    return (
      <div className="sy-onizleme" data-onizleme="avatar">
        {src ? <span className="sy-buyuk-avatar"><Avatar profile={{ gorunen_ad: ad, gorunen_avatar: src }} boyut={112} /></span>
          : <span className="sy-buyuk sy-buyuk--dz"><OdulGorsel odul={odul} boyut={64} /></span>}
      </div>
    );
  }
  if (odul.tur === "arka_plan" && odulArkaPlani(v)) {
    return (
      <div className="sy-onizleme" data-onizleme="arka_plan">
        <span className="sy-odul-abp-buyuk"><ArkaPlanOdulGorsel odul={odul} boyut={100} hareketli /></span>
        <p className="sy-not">{tt("Oyuncu kartının arkasında böyle görünür")}</p>
      </div>
    );
  }
  if (odul.tur === "tepki_paketi") {
    const liste = (KOZMETIK_TANIMLARI[v.anahtar]?.tepkiler ?? []).filter((k) => TEPKI_TANIMLARI[k]);
    if (liste.length) {
      return (
        <div className="sy-onizleme" data-onizleme="tepki">
          <ul className="sy-tepki-izgara" aria-label={ad}>
            {liste.map((t) => <li key={t} role="img" aria-label={tt(TEPKI_TANIMLARI[t].ad)}><img src={tepkiGorseli(t)} alt="" width={48} height={48} loading="eager" decoding="async" draggable="false" /></li>)}
          </ul>
        </div>
      );
    }
  }
  if (odul.tur === "unvan") {
    return (
      <div className="sy-onizleme" data-onizleme="unvan">
        <UnvanYazisi metin={ad} tur="basari" boy="o" />
      </div>
    );
  }
  const para = odul.tur === "coin" || odul.tur === "elmas";
  return (
    <div className="sy-onizleme" data-onizleme={odul.tur}>
      <span className="sy-buyuk sy-buyuk--dz"><OdulGorsel odul={odul} boyut={72} /></span>
      {para && <b className="sy-miktar">+{sayiBicim(Number(v.miktar ?? 0))}</b>}
      {odul.tur === "joker" && <b className="sy-miktar">×{Number(v.adet ?? 1)}</b>}
    </div>
  );
}

export default function OdulSayfasi({ odul, durum, dil, userId, profile, onKapat, onBpAl, onAlindi }) {
  const [calisiyor, setCalisiyor] = useState(false);
  const [hata, setHata] = useState(null);
  const canli = useRef(true);
  useEffect(() => { canli.current = true; return () => { canli.current = false; }; }, []);
  const bpVar = Boolean(durum.bp?.aktif);
  const ucretli = odul.kol === "ucretli";
  const seviyeYok = odul.seviye > durum.seviye;
  const kalanSp = seviyeYok ? Math.max(0, Number(durum.esikler?.[odul.seviye - 1] ?? 0) - Number(durum.sp ?? 0)) : 0;
  const nedenler = [];
  if (!odul.alindi && !odul.alinabilir) {
    if (seviyeYok) nedenler.push(tt("{n}. seviyeye ulaşınca açılır. Kalan: {sp} SP", { n: odul.seviye, sp: sayiBicim(kalanSp) }));
    if (ucretli && !bpVar) nedenler.push(tt("Bu ödül için Battle Pass gerekir."));
  }
  const ad = odul.placeholder ? tt("Yakında") : odulAdi(odul, dil);
  const kolAdi = ucretli ? tt("Battle Pass kolu") : tt("Ücretsiz kol");
  const al = async () => {
    if (calisiyor) return;
    setCalisiyor(true);
    setHata(null);
    try {
      const r = await bpOdulAl(odul.seviye, odul.kol, userId);
      onAlindi?.(r?.odul ?? odul, `${odul.seviye}:${odul.kol}`);
      onKapat();
    } catch (e) {
      if (canli.current) setHata(hataMesaji(e, tt("Ödül alınamadı. Tekrar dener misin?")));
    } finally {
      if (canli.current) setCalisiyor(false);
    }
  };
  return (
    <QtModal acik tur="altSayfa" onKapat={calisiyor ? undefined : onKapat} ortuKapatir={!calisiyor} baslik={ad}
      altlik={
        <div className="sy-alt-dugmeler">
          {odul.alinabilir && !odul.alindi ? (
            <QtDugme tamGenislik boyut="b" tur="dogru" ikon="hediye" onClick={al} yukleniyor={calisiyor} devreDisi={calisiyor} data-qt-ilk-odak>
              {calisiyor ? tt("Alınıyor…") : tt("Ödülü al")}
            </QtDugme>
          ) : ucretli && !bpVar && !odul.alindi ? (
            <QtDugme tamGenislik boyut="b" className="sy-dugme-altin" onClick={onBpAl} data-qt-ilk-odak>
              <TacIkon boyut={22} /> {tt("Battle Pass Al · {n} elmas", { n: sayiBicim(Number(durum.bp?.fiyat ?? 0)) })}
            </QtDugme>
          ) : (
            <QtDugme tamGenislik tur="ikincil" onClick={onKapat} data-qt-ilk-odak>{tt("Kapat")}</QtDugme>
          )}
        </div>
      }>
      <div className="sy-sayfa-ic">
        <Onizleme odul={odul} ad={ad} profile={profile} userId={userId} />
        <div className="sy-etiketler">
          {odul.placeholder && <QtRozet ton="uyari" ikon="saat">{tt("Yakında")}</QtRozet>}
          {!odul.placeholder && <NadirlikEtiketi nadirlik={odul.nadirlik ?? "siradan"} />}
          {!odul.placeholder && ucretli && odul.seviye === Number(durum.seviye_sayisi ?? 28) && <QtRozet ton="uyari" ikon="kupa">{tt("Sezon sonu ödülü")}</QtRozet>}
          <span className={`sy-kol-etiket${ucretli ? " sy-kol-etiket--ucretli" : ""}`}>
            {tt("{n}. seviye · {kol}", { n: odul.seviye, kol: kolAdi })}
          </span>
          {odul.alindi && <QtRozet ton="dogru" ikon="onay">{tt("Alındı")}</QtRozet>}
          {/* 822: avatar / arka plan ödülüne dükkândan ya da önceki ödülden zaten sahip */}
          {odul.sahip && <QtRozet ton="bilgi" ikon="onay">{tt("Zaten sahipsin")}</QtRozet>}
        </div>
        {odul.sahip && !odul.alindi && <p className="sy-not">{tt("Bu ödül sende var. Alınca alınmış sayılır; yeniden verilmez.")}</p>}
        {nedenler.length > 0 && (
          <ul className="sy-neden" role="status">
            {nedenler.map((n) => <li key={n}><QtIkon ad="kilit" boyut={16} /><span>{n}</span></li>)}
          </ul>
        )}
        {hata && <p className="sy-hata" role="alert">{hata}</p>}
      </div>
    </QtModal>
  );
}
