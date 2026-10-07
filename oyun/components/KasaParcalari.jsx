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
import { TepkiAvatar } from "./Tepki.jsx";   // 957
import OyuncuAdiDugmesi from "./OyuncuAdiDugmesi.jsx";
import IsimEfekti from "./IsimEfekti.jsx";
import { SeviyeEtiketi } from "./MacUstSerit.jsx";
import { adKisalt } from "../lib/adKisalt.js";
import SayanSayi from "./SayanSayi.jsx";
import { KasaKasasi, kasaSeviye } from "./KasaEfekt.jsx";
import SkillRozeti from "./SkillRozeti.jsx";
import { jokerBilgi } from "../lib/jokerler.js";
import { QtDugme, QtIkon, sinif } from "../tasarim/index.js";

/** Kasanın sahibi bu ekrana göre: "ben" | "rakip" | "yok". */
export function kasaSahibi(d) {
  if (!d?.sahip) return "yok";
  return d.sahip === d.ben ? "ben" : "rakip";
}

// 987: DEVAM ödülü — oyuncuya görünen ad TEK yerde (EN karşılığı ceviri/kasa.js; Düello "Kalkan" jokeriyle karışmasın)
export const SAVUNMA_HAKKI = "Savunma Hakkı";
export const SAVUNMA_SORUSU = "Savunma Sorusu";

/** 987: süren Savunma Sorusu — { benSavunuyorum, izliyorum } ya da null. */
export function kasaSavunma(d) {
  const s = d?.savunma;
  if (!s || s.durum !== "soru" || d?.faz !== "cevap") return null;
  return { benSavunuyorum: s.sahip === d.ben, izliyorum: s.sahip !== d.ben };
}

/** 987: hak simgesi (kalkan rozeti). Kalkan çizimi ortak ikon setinden; ad ve renk Hazine'ye özel (altın). */
export function SavunmaRozeti({ c, aktif = false, boyut = 12 }) {
  return (
    <span className={sinif("ks-hak", aktif && "ks-hak--aktif")} role="img" aria-label={c(SAVUNMA_HAKKI)} title={c(SAVUNMA_HAKKI)}>
      <QtIkon ad="kalkan" boyut={boyut} />
    </span>
  );
}

/** Tavan nominal artışı kırptığında ekranda gerçekten kasaya eklenen değeri kullan. */
export function kasaSonucArtisi(sonuc, varsayilan = 0) {
  if (!sonuc) return Number(varsayilan) || 0;
  return sonuc.tavan_kirpti
    ? Math.max(0, Number(sonuc.kasa_sonra) - Number(sonuc.kasa_once))
    : Number(sonuc.artis ?? varsayilan) || 0;
}

/**
 * Kasa: altın/pirinç kasa görseli (KasaEfekt › KasaKasasi) + değer plakası + sahip etiketi. Doluluk arttıkça büyür.
 * kucuk: soru/sonuç fazında üst şeritte mini kasa (değer hep görünür).
 * goster / sahipGoster: efekt sürerken gösterilecek eski değer ve sahip (altın kasaya ulaşınca gerçeğe geçer).
 * hareket: ek sınıflar (nabiz · titre · gergin · vardi · patla · don · yeni-sahip) — yalnız sunum.
 */
// 951: kasa büyüdükçe ışık (≥ 20) ve alev (≥ 40) — mutlak eşik, yalnız sunum
export const KASA_ISIK_ESIK = 20;
export const KASA_ALEV_ESIK = 40;
function Alev() {
  return <span className="ks-alev" aria-hidden="true"><i /><i /><i /></span>;
}

/** 955: DEVAM çarpanı yazısı ("×1,25" / EN "×1.25"); çarpan yoksa null. */
export function carpanYazisi(carpan, dil = "tr") {
  const x = Number(carpan);
  if (!(x > 1)) return null;
  return `×${String(Math.round(x * 100) / 100).replace(".", dil === "en" ? "." : ",")}`;
}

export function KasaKadran({ d, c, kucuk = false, goster, sahipGoster, hareket = [], artis = null, carpan = null, sayiSure = 520 }) {
  const sahip = kasaSahibi(sahipGoster === undefined ? d : { ...d, sahip: sahipGoster });
  const kasa = Math.max(0, Number(goster ?? d.kasa) || 0);
  // 955: tavan (> 0) göstergede belli: "12/30", tavana varınca DOLU; kademe ve ışık tavana oranla
  const tavan = Math.max(0, Number(d.tavan) || 0);
  const seviye = kasaSeviye(kasa, d.hedef, tavan);
  const etiket = sahip === "ben" ? c("Sende") : sahip === "rakip" ? c("Rakipte") : c("Sahipsiz");
  const alevli = tavan > 0 ? seviye === "tavan" : kasa >= KASA_ALEV_ESIK;
  const isikli = tavan > 0 ? seviye === "dolu" || seviye === "tavan" : kasa >= KASA_ISIK_ESIK;
  return (
    <div className={sinif("ks-kadran", `ks-kadran--${sahip}`, `ks-kadran--${seviye}`, kucuk && "ks-kadran--kucuk",
                          isikli && "ks-kadran--isikli", alevli && "ks-kadran--alevli",
                          ...hareket.map((h) => `ks-kadran--${h}`))}
         role="img" aria-label={tavan > 0 ? c("Hazine {k}/{t} · {s}", { k: kasa, t: tavan, s: etiket }) : c("Hazine {k} · {s}", { k: kasa, s: etiket })}
         data-ks-hedef={kucuk ? "kasa" : "kasa-buyuk"}>
      {kucuk ? (
        <span className="ks-kadran-mini">{alevli && <Alev />}<KasaKasasi seviye={seviye} kucuk /></span>
      ) : (
        <span className="ks-kadran-govde">{alevli && <Alev />}<KasaKasasi seviye={seviye} /></span>
      )}
      <span className={kucuk ? "ks-kadran-ic" : "ks-kadran-plaka"}>
        <small>{seviye === "tavan" ? c("DOLU") : c("HAZİNE")}</small>
        <b className="qt-sayi">
          <SayanSayi deger={kasa} sure={sayiSure} />
          {tavan > 0 && <span className="ks-kadran-tavan">/{tavan}</span>}
        </b>
      </span>
      {!kucuk && <span className="ks-kadran-sahip">{etiket}</span>}
      {/* 954: soru/sonuç şeridinde sahipsiz kasa açıkça yazılır (DEVAM sahipliği bırakır) */}
      {kucuk && sahip === "yok" && kasa > 0 && !d.altin && <span className="ks-kadran-sahipsiz">{c("SAHİPSİZ")}</span>}
      {/* 955: DEVAM anı — "×1,25" patlar (yalnız sunum) */}
      {carpan && <span key={carpan.anahtar} className="ks-carpan-etiket qt-sayi" aria-hidden="true"
                        style={{ "--ks-ac-olcek": Math.max(0.1, Math.min(1, Number(carpan.olcek) || 1)) }}>{carpan.metin}</span>}
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
 * 990 · orta: hazine şeridin ORTASINDA ortak nesne — SEN solda, RAKİP sağda, çubuklar merkeze (hazineye) doğru dolar.
 * Yükseklik eski iki satırlı şeritle aynı kalır (soru alanı sıkışmaz). orta yoksa eski iki satırlı görünüm.
 */
export function KasaSkor({ d, ben, rakip, c, puanGoster = {}, parla = null, orta = null }) {
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
          {/* 951: puan her değiştiğinde dolan çubukta bir kez ışık süzülür (key = puan) */}
          {puan > 0 && <i key={puan} className="ks-skor-isilti" style={{ width: `${(100 * Math.min(hedef, puan)) / hedef}%` }} />}
        </span>
        <span className="ks-skor-sayi qt-sayi"><SayanSayi deger={puan} sure={600} /><small>/{hedef}</small></span>
      </div>
    );
  };
  const etiket = c("Skor: sen {a}, rakip {b}, hedef {h}", { a: ben?.puan ?? 0, b: rakip?.puan ?? 0, h: hedef });
  if (orta) {
    return (
      <div className="ks-skor ks-skor--orta" role="group" aria-label={etiket}>
        <div className="ks-skor-yan ks-skor-yan--ben">{satir(ben, "ben")}</div>
        <div className="ks-skor-merkez" data-sahip={sahip}>{orta}</div>
        <div className="ks-skor-yan ks-skor-yan--rakip">{satir(rakip, "rakip")}</div>
      </div>
    );
  }
  return (
    <div className="ks-skor" role="group" aria-label={etiket}>
      {satir(ben, "ben")}
      {satir(rakip, "rakip")}
    </div>
  );
}

/** Üst başlık: sen · Tur N/T + sayaç · rakip (avatar, ad, seviye; cevapladı işareti). */
export function KasaUst({ d, ben, rakip, c, seviyeler = {}, sayac, onay = {}, anahtar = null, rakipJoker = [], tepkiBalonlar = {} }) {
  const taraf = (o, rakipMi) => (
    <div className={sinif("qt-oyuncu ks-oyuncu", rakipMi && "qt-oyuncu--rakip")}>
      <span className={sinif("ks-avatar", anahtar === (rakipMi ? "rakip" : "ben") && "ks-avatar--anahtar")}
            data-ks-hedef={rakipMi ? "avatar-rakip" : "avatar-ben"}>
        {/* 957: maç içi tepki balonu avatarın yanında (Düello V2Ust ile aynı) */}
        <TepkiAvatar balon={tepkiBalonlar[o.id]} yan={rakipMi ? "rakip" : "sen"}>
          <CerceveliAvatar profile={o} userId={o.id} boyut={32} hareketli kart={seviyeler[o.id]} />
        </TepkiAvatar>
        {onay[o.id] && (
          <span className="ks-onay qt-h-pop-gir" role="img" aria-label={rakipMi ? c("cevapladı") : c("Cevabın kilitlendi")}>
            <QtIkon ad="onay" boyut={11} />
          </span>
        )}
        {/* 951: rakibin bu soruda kullandığı jokerler (yalnız ad/ikon — etkisi gizli) */}
        {/* 987: Savunma Hakkı simgesi — iki oyuncuya da görünür; Savunma Sorusu sürerken savunanda parlar */}
        {Array.isArray(d.savunma_hak) && (d.savunma_hak.includes(o.id) || (d.savunma?.durum === "soru" && d.savunma.sahip === o.id)) && (
          <SavunmaRozeti c={c} aktif={d.savunma?.durum === "soru" && d.savunma.sahip === o.id} />
        )}
        {rakipMi && rakipJoker.length > 0 && (
          <span className="ks-rakip-jokerler" role="img"
                aria-label={c("Rakip joker kullandı: {j}", { j: rakipJoker.map((t) => jokerBilgi(t, "kasa").ad).join(", ") })}>
            {rakipJoker.map((t, i) => <SkillRozeti key={`${t}-${i}`} tur={t} boyut={20} />)}
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
export function KasaKarar({ d, c, calisan, onKarar, kalan = null, carpanYazi = null }) {
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
        <p className="ks-karar-not">{c("Açarsa {k} puan alır, hazine sıfırlanır.", { k: deger })}</p>
      </div>
    );
  }
  // 951: kasa acma_min altındaysa AÇ kilitli (sunucu da reddeder; karar fazı normalde hiç açılmaz)
  const acKilit = deger < Number(d.acma_min ?? 0);
  // 955: DEVAM çarpanı (tavandaki kasa büyümez) ve tavan
  const tavan = Math.max(0, Number(d.tavan) || 0);
  const carpanVar = Boolean(carpanYazi) && !(tavan > 0 && deger >= tavan);
  return (
    <div className="ks-karar">
      <KasaKadran d={d} c={c} hareket={hareket} />
      <p className="ks-karar-baslik">{c("Hazine sende: {k} puan", { k: deger })}</p>
      <div className="ks-karar-eylem">
        <QtDugme tamGenislik boyut="b" ikon={acKilit ? "kilit" : "coin"} yukleniyor={calisan === "karar-ac"}
                 devreDisi={!!calisan || acKilit} className={acKilit ? "ks-ac-kilitli" : undefined}
                 onClick={() => { if (!acKilit) onKarar(true); }}>
          {acKilit ? c("AÇ · En az {m} hazine", { m: d.acma_min }) : c("AÇ · +{k} puan", { k: deger })}
        </QtDugme>
        <QtDugme tur="ikincil" tamGenislik boyut="b" ikon="ileri" yukleniyor={calisan === "karar-devam"} devreDisi={!!calisan}
                 onClick={() => onKarar(false)}>
          {/* 987: bilerek DEVAM → Savunma Hakkı (954 ücretsiz 50:50 kalktı) · 953 maçı: şans yazılır */}
          {carpanVar ? c("DEVAM {x}", { x: carpanYazi })
            : Number(d.devam_sans) > 0 ? c("DEVAM · %{p} joker şansı", { p: Number(d.devam_sans) }) : c("DEVAM · hazine büyüsün")}
        </QtDugme>
      </div>
      {d.savunma_acik && (
        <p className="ks-karar-hak">
          <SavunmaRozeti c={c} boyut={13} />
          <span>{Array.isArray(d.savunma_hak) && d.savunma_hak.includes(d.ben)
            ? c("{h} sende (en fazla 1)", { h: c(SAVUNMA_HAKKI) })
            : c("DEVAM de: {h} kazan", { h: c(SAVUNMA_HAKKI) })}</span>
        </p>
      )}
      <p className="ks-karar-not">
        {carpanYazi && tavan > 0 && deger >= tavan ? c("Hazine dolu ({t}): DEVAM büyütmez, sahipsiz bırakır.", { t: tavan })
          : carpanVar && d.devam_birakir ? (tavan > 0
            ? c("DEVAM: hazine {x} büyür (en çok {t}) ve sahipsiz kalır. Süre dolarsa DEVAM sayılır.", { x: carpanYazi, t: tavan })
            : c("DEVAM: hazine {x} büyür ve sahipsiz kalır. Süre dolarsa DEVAM sayılır.", { x: carpanYazi }))
          : d.devam_birakir ? c("DEVAM: hazine sahipsiz kalır. Süre dolarsa DEVAM sayılır.") : c("Süre dolarsa DEVAM sayılır.")}
      </p>
    </div>
  );
}

/**
 * 951: kasa sende ama acma_min altında — kilitli AÇ düğmesi görünümü (soru üstünde, karar satırının yerinde).
 * Basılamaz; yalnız kuralı gösterir. Sunucu karar fazını bu durumda hiç açmaz.
 */
export function KasaAcKilit({ d, c }) {
  const m = Number(d?.acma_min ?? 0);
  if (!(m > 0) || d?.altin || d?.sahip !== d?.ben || !(Number(d?.kasa) < m)) return null;
  return (
    <p className="ks-ac-kilit qt-h-gir" role="note" aria-label={c("AÇ kilitli: en az {m} hazine", { m })}>
      <span className="ks-ac-kilit-dugme" aria-hidden="true"><QtIkon ad="kilit" boyut={14} />{c("AÇ")}</span>
      <span>{c("En az {m} hazine", { m })}</span>
      <span className="ks-ac-kilit-ilerleme qt-sayi" aria-hidden="true">{Number(d.kasa)}/{m}</span>
    </p>
  );
}

/** Kararın bu turdaki sonucu (soru üstünde tek satır). */
export function kasaKararMetni(d, c) {
  const k = d?.son_karar;
  if (!k) return null;
  const benim = k.veren === d.ben;
  // 954: DEVAM sahipliği bıraktıysa ve kasa hâlâ sahipsizse karar satırı gizli (kadran "SAHİPSİZ" yazar)
  if (!k.ac && !k.son && k.birakti && !d.sahip) return null;
  if (k.son) return benim ? c("Son tur: hazine sana yazıldı +{k}", { k: k.deger }) : c("Son tur: hazine rakibe yazıldı +{k}", { k: k.deger });
  if (k.ac) return benim ? c("Hazineyi açtın: +{k} puan", { k: k.deger }) : c("Rakip hazineyi açtı: +{k} puan", { k: k.deger });
  if (k.sure_doldu) return benim ? c("Süre doldu: devam") : c("Rakibin süresi doldu: devam");
  return benim ? c("Devam ettin: hazine büyüyor") : c("Rakip devam etti: hazine büyüyor");
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
  // 987: Savunma Sorusunun sonucu (kasaya bir şey eklenmez)
  const sv = s.savunma;
  if (sv && (sv.durum === "basarili" || sv.durum === "basarisiz")) {
    const benSavundum = sv.sahip === d.ben;
    const neden = sv.neden === "sure" ? c("Süre doldu") : sv.neden === "kopuk" ? c("Bağlantı koptu") : null;
    if (sv.durum === "basarili") {
      return benSavundum
        ? { ton: "iyi", baslik: c("Savundun! Hazine sahipsiz kaldı"), alt: c("Hazine {k}", { k: s.kasa_sonra }) }
        : { ton: "kotu", baslik: c("Rakip savundu: hazine sahipsiz"), alt: c("Hazine {k}", { k: s.kasa_sonra }) };
    }
    return benSavundum
      ? { ton: "kotu", baslik: c("Savunma düştü: karar rakipte"), alt: neden ?? c("Hazine {k}", { k: s.kasa_sonra }) }
      : { ton: "iyi", baslik: c("Savunma düştü: karar sende"), alt: neden ?? c("Hazine {k}", { k: s.kasa_sonra }) };
  }
  // 955: tavana kırpıldıysa gerçek artış (kasa_sonra − kasa_once) yazılır; tavandaysa "Kasa dolu"
  const artis = kasaSonucArtisi(s);
  const alt = s.tavan_kirpti ? c("Hazine dolu: {k}", { k: s.kasa_sonra }) : c("Hazine {k}", { k: s.kasa_sonra });
  const altArti = s.tavan_kirpti ? alt : c("+{n} · Hazine {k}", { n: artis, k: s.kasa_sonra });
  if (ben && rakip) return { ton: "altin", baslik: c("İkiniz de bildiniz +{n}", { n: artis }), alt };
  // 987: tetik — hak sahibi yanlış, rakip tek doğru → önce Savunma Sorusu (hazine sahipsiz bekler)
  if (sv?.durum === "bekliyor") {
    return sv.sahip === d.ben
      ? { ton: "savunma", baslik: c("{h} devrede!", { h: c(SAVUNMA_HAKKI) }), alt: c("Rakip bildi · {s} geliyor", { s: c(SAVUNMA_SORUSU) }) }
      : { ton: "savunma", baslik: c("Rakip {h} kullanıyor", { h: c(SAVUNMA_HAKKI) }), alt: c("+{n} · önce {s}", { n: artis, s: c(SAVUNMA_SORUSU) }) };
  }
  if (ben) return { ton: "iyi", baslik: c("Tek başına bildin: hazine sende"), alt: altArti };
  if (rakip) return { ton: "kotu", baslik: c("Rakip tek başına bildi: hazine rakipte"), alt: altArti };
  return { ton: "notr", baslik: c("İkiniz de bilemediniz +{n}", { n: artis }), alt };
}

export function KasaSonucBandi({ d, c }) {
  const m = kasaSonucMetni(d, c);
  if (!m) return null;
  return (
    <div className={`ks-bant ks-bant--${m.ton} qt-h-pop-gir`} role="status" aria-live="polite" data-ks-hedef="bant">
      <b>{m.ton === "savunma" && <SavunmaRozeti c={c} aktif boyut={15} />}{m.baslik}</b>
      {m.alt && <span>{m.alt}</span>}
    </div>
  );
}
