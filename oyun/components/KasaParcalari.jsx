// ============================================================
// KASA (deneysel, 950) — ARAYÜZ PARÇALARI
//
// Kurallar SUNUCUDA (kasa_ilerlet / kasa_bitir). Bu dosya yalnız kasa_durum()'u çizer; hiçbir kural
// burada hesaplanmaz. Doğru cevap yalnız sonuç fazında (sonuc.dogru_cevap) gelir.
// Renk rolleri: sen mavi (--qt-ikinci) · rakip kırmızı (--qt-mod-duello) · sahipsiz gri · eylem turuncu.
// Görünüm: oyun/styles/kasa.css (ks- önekli). İngilizcesi: oyun/lib/ceviri/kasa.js.
// iOS: bu dosyada position:fixed yok.
// ============================================================
import CerceveliAvatar from "./CerceveliAvatar.jsx";
import OyuncuAdiDugmesi from "./OyuncuAdiDugmesi.jsx";
import IsimEfekti from "./IsimEfekti.jsx";
import { SeviyeEtiketi } from "./MacUstSerit.jsx";
import { adKisalt } from "../lib/adKisalt.js";
import SayanSayi from "./SayanSayi.jsx";
import { KasaKasasi, kasaSeviye } from "./KasaEfekt.jsx";
import { QtDugme, QtIkon, sinif } from "../tasarim/index.js";

/** Kasanın sahibi bu ekrana göre: "ben" | "rakip" | "yok". */
export function kasaSahibi(d) {
  if (!d?.sahip) return "yok";
  return d.sahip === d.ben ? "ben" : "rakip";
}

/**
 * Kasa: altın/pirinç kasa görseli (KasaEfekt › KasaKasasi) + değer plakası + sahip etiketi. Doluluk arttıkça büyür.
 * kucuk: soru/sonuç fazında üst şeritte mini kasa (değer hep görünür).
 * goster / sahipGoster: efekt sürerken gösterilecek eski değer ve sahip (altın kasaya ulaşınca gerçeğe geçer).
 * hareket: ek sınıflar (nabiz · titre · gergin · vardi · patla · don · yeni-sahip) — yalnız sunum.
 */
export function KasaKadran({ d, c, kucuk = false, goster, sahipGoster, hareket = [], artis = null }) {
  const sahip = kasaSahibi(sahipGoster === undefined ? d : { ...d, sahip: sahipGoster });
  const kasa = Math.max(0, Number(goster ?? d.kasa) || 0);
  const seviye = kasaSeviye(kasa, d.hedef);
  const etiket = sahip === "ben" ? c("Sende") : sahip === "rakip" ? c("Rakipte") : c("Sahipsiz");
  return (
    <div className={sinif("ks-kadran", `ks-kadran--${sahip}`, `ks-kadran--${seviye}`, kucuk && "ks-kadran--kucuk",
                          ...hareket.map((h) => `ks-kadran--${h}`))}
         role="img" aria-label={c("Kasa {k} · {s}", { k: kasa, s: etiket })}
         data-ks-hedef={kucuk ? "kasa" : "kasa-buyuk"}>
      {kucuk ? <KasaKasasi seviye={seviye} kucuk /> : (
        <span className="ks-kadran-govde"><KasaKasasi seviye={seviye} /></span>
      )}
      <span className={kucuk ? "ks-kadran-ic" : "ks-kadran-plaka"}>
        <small>{c("KASA")}</small>
        <b className="qt-sayi"><SayanSayi deger={kasa} sure={520} /></b>
      </span>
      {!kucuk && <span className="ks-kadran-sahip">{etiket}</span>}
      {artis && (
        <span key={artis.anahtar} className={sinif("ks-artis-etiket qt-sayi", artis.buyuk && "ks-artis-etiket--buyuk")} aria-hidden="true">
          +{artis.n}
        </span>
      )}
    </div>
  );
}

/**
 * SEN / RAKİP skor çubukları (hedef çizgisiyle). Kasanın sahibi açarsa ulaşacağı yer soluk "hayalet" dolguyla
 * gösterilir (yalnız bilgi; kural sunucuda).
 */
export function KasaSkor({ d, ben, rakip, c, puanGoster = {}, parla = null }) {
  const hedef = Math.max(1, Number(d.hedef) || 20);
  const sahip = kasaSahibi(d);
  const satir = (o, kim) => {
    // AÇ anında altın çubuğa ulaşana kadar eski puan; sonra sayarak yükselir (yalnız sunum)
    const puan = Number(puanGoster[kim] ?? o?.puan ?? 0);
    const hayalet = sahip === kim ? Math.min(hedef, puan + Number(d.kasa || 0)) : puan;
    return (
      <div className={sinif("ks-skor-satir", `ks-skor-satir--${kim}`, parla === kim && "ks-skor-satir--parla")}>
        <span className="ks-skor-ad">{kim === "ben" ? c("SEN") : c("RAKİP")}</span>
        <span className="ks-skor-cubuk" aria-hidden="true" data-ks-hedef={`skor-${kim}`}>
          <i className="ks-skor-hayalet" style={{ width: `${(100 * hayalet) / hedef}%` }} />
          <i className="ks-skor-dolu" style={{ width: `${(100 * Math.min(hedef, puan)) / hedef}%` }} />
        </span>
        <span className="ks-skor-sayi qt-sayi"><SayanSayi deger={puan} sure={600} /><small>/{hedef}</small></span>
      </div>
    );
  };
  return (
    <div className="ks-skor" role="group" aria-label={c("Skor: sen {a}, rakip {b}, hedef {h}", { a: ben?.puan ?? 0, b: rakip?.puan ?? 0, h: hedef })}>
      {satir(ben, "ben")}
      {satir(rakip, "rakip")}
    </div>
  );
}

/** Üst başlık: sen · Tur N/T + sayaç · rakip (avatar, ad, seviye; cevapladı işareti). */
export function KasaUst({ d, ben, rakip, c, seviyeler = {}, sayac, onay = {}, anahtar = null }) {
  const taraf = (o, rakipMi) => (
    <div className={sinif("qt-oyuncu ks-oyuncu", rakipMi && "qt-oyuncu--rakip")}>
      <span className={sinif("ks-avatar", anahtar === (rakipMi ? "rakip" : "ben") && "ks-avatar--anahtar")}
            data-ks-hedef={rakipMi ? "avatar-rakip" : "avatar-ben"}>
        <CerceveliAvatar profile={o} userId={o.id} boyut={32} hareketli kart={seviyeler[o.id]} />
        {onay[o.id] && (
          <span className="ks-onay qt-h-pop-gir" role="img" aria-label={rakipMi ? c("cevapladı") : c("Cevabın kilitlendi")}>
            <QtIkon ad="onay" boyut={11} />
          </span>
        )}
      </span>
      <span className="qt-oyuncu-yazi">
        <OyuncuAdiDugmesi userId={o.id} profil={o} className="qt-oyuncu-ad">
          <IsimEfekti userId={o.id} {...(seviyeler[o.id] ? { kart: seviyeler[o.id] } : {})}>{rakipMi ? adKisalt(o.gorunen_ad) : c("Sen")}</IsimEfekti>
        </OyuncuAdiDugmesi>
        <SeviyeEtiketi {...(seviyeler[o.id] ?? {})} />
      </span>
    </div>
  );
  return (
    <header className={sinif("ks-ust", d.altin && "ks-ust--altin")}>
      {taraf(ben, false)}
      <div className="ks-ust-orta" key={`${d.tur}-${d.altin}`}>
        <span className="ks-tur">
          {d.altin ? c("ALTIN SORU") : <>{c("Tur")} <b className="qt-sayi">{Math.max(1, d.tur)}/{d.max_tur}</b></>}
        </span>
        {sayac}
      </div>
      {taraf(rakip, true)}
    </header>
  );
}

/** Karar fazı: sahip AÇ / DEVAM seçer; diğer oyuncu "Rakip karar veriyor…" görür. */
export function KasaKarar({ d, c, calisan, onKarar, kalan = null }) {
  const benim = d.karar?.veren === d.ben;
  const deger = Number(d.karar?.deger ?? d.kasa ?? 0);
  // Gerilim: sahipte kalp atışı, beklerken titreme; son 3 sn kızarır ve hızlı titrer (tik sesi sayfada).
  const gergin = kalan != null && kalan > 0 && kalan <= 3;
  const hareket = gergin ? ["gergin"] : [benim ? "nabiz" : "titre"];
  if (!benim) {
    return (
      <div className="ks-karar ks-karar--bekle" role="status" aria-live="polite">
        <KasaKadran d={d} c={c} hareket={hareket} />
        <p className="ks-karar-baslik"><span className="ks-nokta" aria-hidden="true" />{c("Rakip karar veriyor…")}</p>
        <p className="ks-karar-not">{c("Açarsa {k} puan alır, kasa sıfırlanır.", { k: deger })}</p>
      </div>
    );
  }
  return (
    <div className="ks-karar">
      <KasaKadran d={d} c={c} hareket={hareket} />
      <p className="ks-karar-baslik">{c("Kasa sende: {k} puan", { k: deger })}</p>
      <div className="ks-karar-eylem">
        <QtDugme tamGenislik boyut="b" ikon="coin" yukleniyor={calisan === "karar-ac"} devreDisi={!!calisan}
                 onClick={() => onKarar(true)}>
          {c("AÇ · +{k} puan", { k: deger })}
        </QtDugme>
        <QtDugme tur="ikincil" tamGenislik boyut="b" ikon="ileri" yukleniyor={calisan === "karar-devam"} devreDisi={!!calisan}
                 onClick={() => onKarar(false)}>
          {c("DEVAM · kasa büyüsün")}
        </QtDugme>
      </div>
      <p className="ks-karar-not">{c("Süre dolarsa DEVAM sayılır.")}</p>
    </div>
  );
}

/** Kararın bu turdaki sonucu (soru üstünde tek satır). */
export function kasaKararMetni(d, c) {
  const k = d?.son_karar;
  if (!k) return null;
  const benim = k.veren === d.ben;
  if (k.son) return benim ? c("Son tur: kasa sana yazıldı +{k}", { k: k.deger }) : c("Son tur: kasa rakibe yazıldı +{k}", { k: k.deger });
  if (k.ac) return benim ? c("Kasayı açtın: +{k} puan", { k: k.deger }) : c("Rakip kasayı açtı: +{k} puan", { k: k.deger });
  if (k.sure_doldu) return benim ? c("Süre doldu: devam") : c("Rakibin süresi doldu: devam");
  return benim ? c("Devam ettin: kasa büyüyor") : c("Rakip devam etti: kasa büyüyor");
}

/** Soru sonu sonuç bandı: { ton, baslik, alt }. */
export function kasaSonucMetni(d, c) {
  const s = d?.sonuc;
  if (!s) return null;
  const ben = Boolean(s.ben_dogru);
  const rakip = Boolean(s.rakip_dogru);
  if (s.altin) {
    if (s.kazanan && s.kazanan === d.ben) return { ton: "iyi", baslik: c("Altın Soru'yu sen bildin!") };
    if (s.kazanan) return { ton: "kotu", baslik: c("Altın Soru'yu rakip bildi") };
    return { ton: "notr", baslik: c("Kimse tek başına bilemedi"), alt: c("Yeni Altın Soru geliyor") };
  }
  const alt = c("Kasa {k}", { k: s.kasa_sonra });
  if (ben && rakip) return { ton: "altin", baslik: c("İkiniz de bildiniz +{n}", { n: s.artis }), alt };
  if (ben) return { ton: "iyi", baslik: c("Tek başına bildin: kasa sende"), alt: c("+{n} · Kasa {k}", { n: s.artis, k: s.kasa_sonra }) };
  if (rakip) return { ton: "kotu", baslik: c("Rakip tek başına bildi: kasa rakipte"), alt: c("+{n} · Kasa {k}", { n: s.artis, k: s.kasa_sonra }) };
  return { ton: "notr", baslik: c("İkiniz de bilemediniz +{n}", { n: s.artis }), alt };
}

export function KasaSonucBandi({ d, c }) {
  const m = kasaSonucMetni(d, c);
  if (!m) return null;
  return (
    <div className={`ks-bant ks-bant--${m.ton} qt-h-pop-gir`} role="status" aria-live="polite" data-ks-hedef="bant">
      <b>{m.baslik}</b>
      {m.alt && <span>{m.alt}</span>}
    </div>
  );
}
