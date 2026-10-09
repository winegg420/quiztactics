// DÜELLO v4 — TEK ARENA (1013–1016, 9 Eki 2026). Kurallar SUNUCUDA (duello4_* → duello_durum › v4); bu dosya yalnız çizer.
// Maç boyunca aynı ekran: üstte sabit bilgi çubuğu (iki oyuncu, kontrol kimde, seri x/3, tur), ortada KONTROL ÇEKİRDEĞİ
// (mevcut kılıç ikonu; sahibin tarafına kayar, el değişince karşıya uçar + kısa sarsıntı), altında faza göre panel:
// nötr / saldırı sorusu · 4 kart (önce RAKİBE GÖNDER, sonra KENDİNE SEÇ) · bekleyen (rakip seçiyor) · açılış (kim neyi aldı)
// · tur sonucu anı (iki cevap, avatar tepkisi, 2/3 SON BASKI, 3/3 düello anı) · SON DÜELLO (aynı soru, jokersiz).
// Yazı: ekran başına 1 başlık + 1 kısa alt bilgi + 1 eylem; maç sırasında öğretici cümle yok (yalnız ilk v4 maçında tek satır).
// Ses: mevcut ses.js; her an bir olay anahtarına bağlı TEK SEFER, sesler aralıklı (üst üste binmez).
// iOS: position:fixed YOK; sarsıntı/uçuş yalnız iç sahnede (fixed katman içermez). Hareket azaltmada animasyonlar kapalı (CSS).
import { useEffect, useRef, useState } from "react";
import CerceveliAvatar from "../CerceveliAvatar.jsx";
import KategoriIkon, { KATEGORI_RENK } from "../KategoriIkon.jsx";
import MacUstSerit from "../MacUstSerit.jsx";
import OyuncuAdiDugmesi from "../OyuncuAdiDugmesi.jsx";
import { V2Skill } from "../DuelloJokerSeridi.jsx";
import { kategoriAdi } from "../../lib/kategoriler.js";
import { adKisalt } from "../../lib/adKisalt.js";
import { aktifDil } from "../../lib/dil.js";
import { soruUzunlukSinifi } from "../../lib/soruUzunluk.js";
import { secenekleriCoz } from "../DuelloV2.jsx";
import { QtDugme, QtIkon, QtSayac, QtSik, QtSikler, QtSoruKarti, sinif } from "../../tasarim/index.js";
import { sesDogru, sesYanlis, sesTik, sesKategoriGeriSayim, sesTurGecis, sesCanKaybi, sesSoruGeldi,
  sesKategoriSecildi, sesRakipCevapladi, sesSonSaniyeler } from "../../lib/ses.js";
import { sure, sureOlcek, varsayilanSure } from "../../lib/sureler.js";
import { titret } from "../../lib/geriBildirim.js";
import "./duello4.css";

const HARFLER = ["A", "B", "C", "D"];
const ACILIS_MS = varsayilanSure("duello4_acilis");     // saldırı sorusu açılınca "kim neyi aldı" paneli (sunucu gösterim payının içinde)
const SARSINTI_MS = varsayilanSure("duello4_sarsinti");   // geçerli: sure() — lib/sureler.js
// 1034 · Kart seçimi tek dokunuş (onay düğmesi yok): 1. dokunuş rakibe, 2. dokunuş kendine. Her adımın başında sunucunun
// duyuru süresi (duello4_kart_duyuru_ms) boyunca yazı vurgulanır, kartlar kilitli, sayaç durur (gosterim_bas = duyuru bitişi).
// false → eski akış (kart seç + alt eylem düğmesiyle onayla); sunucu tarafı için docs/duello-v4-kart-akisi-geri-al.sql.
const KART_TEK_DOKUNUS = true;
const yuzde = (v) => (v === null || v === undefined ? "?" : aktifDil() === "en" ? `${v}%` : `%${v}`);

// ---------------------------------------------------------------- küçük parçalar
function SeriPip({ deger, hedef, taraf }) {
  return (
    <span className={`d4-pip d4-pip--${taraf}`} role="img" aria-label={`${deger}/${hedef}`}>
      {Array.from({ length: hedef }, (_, i) => <i key={i} className={i < deger ? "d4-pip-dolu" : undefined} />)}
    </span>
  );
}

function Oyuncu({ o, rakipMi, c, kontrolde, seri, hedef, aktif, tepki, onay, seviye }) {
  return (
    <div className={sinif("d4-oy", rakipMi ? "d4-oy--rakip" : "d4-oy--ben", kontrolde && "d4-oy--kontrol",
                          aktif && "d4-oy--aktif", tepki && `d4-oy--${tepki}`)}>
      <span className="d4-oy-av">
        <CerceveliAvatar profile={o} userId={o.id} boyut={40} hareketli kart={seviye} />
        {onay && <span className="d4-oy-onay" role="img" aria-label={c("cevapladı")}><QtIkon ad="onay" boyut={11} /></span>}
        {tepki && <span className="d4-oy-tepki" aria-hidden="true"><QtIkon ad={tepki === "dogru" ? "onay" : "carpi"} boyut={14} /></span>}
      </span>
      <span className="d4-oy-yazi">
        <OyuncuAdiDugmesi userId={o.id} profil={o} className="d4-oy-ad">{rakipMi ? adKisalt(o.gorunen_ad) : c("Sen")}</OyuncuAdiDugmesi>
        {kontrolde ? <SeriPip deger={seri} hedef={hedef} taraf={rakipMi ? "rakip" : "ben"} /> : <span className="d4-pip-bos" aria-hidden="true" />}
      </span>
    </div>
  );
}

function Oran({ kim, ad, v }) {
  return (
    <span className={`d4-oran d4-oran--${kim}`}>
      <span className="d4-oran-ad">{ad}</span>
      <span className="d4-oran-yol"><i style={{ width: `${v ?? 0}%` }} /></span>
      <b>{yuzde(v)}</b>
    </span>
  );
}

function Kart({ k, ben, rakip, c, rakipAd, durum, sira, onClick, devreDisi }) {
  const damga = durum === "rakibe" ? c("RAKİBE") : durum === "sana" ? c("SANA") : null;
  return (
    <button type="button" className={sinif("d4-kart", `d4-kart--${durum}`)} style={{ "--kat": KATEGORI_RENK[k] ?? "#7C93B5", "--sira": sira }}
            aria-pressed={durum === "rakibe" || durum === "sana"} disabled={devreDisi} onClick={onClick}>
      <span className="d4-kart-ust">
        <KategoriIkon anahtar={k} boyut={34} plaka />
        <b className="d4-kart-ad">{c(kategoriAdi(k))}</b>
      </span>
      <span className="d4-oranlar">
        <Oran kim="ben" ad={c("Sen")} v={ben} />
        <Oran kim="rakip" ad={rakipAd} v={rakip} />
      </span>
      {damga && <span className="d4-damga"><QtIkon ad={durum === "rakibe" ? "gonder" : "onay"} boyut={12} />{damga}</span>}
    </button>
  );
}

function Bilet({ k, et, kim }) {
  return (
    <div className={`d4-bilet d4-bilet--${kim}`} style={{ "--kat": KATEGORI_RENK[k] ?? "#7C93B5" }}>
      <span className="d4-bilet-et">{et}</span>
      {k && <KategoriIkon anahtar={k} boyut={44} plaka />}
    </div>
  );
}

// ---------------------------------------------------------------- tur sonucu metni (izleyenin bakışıyla)
function sonucModeli(h, benId, c) {
  if (!h || h.surum !== 4) return null;
  const benK = h.kontrol_sonra === benId;
  const once = h.kontrol_once;
  const seri = Number(h.seri_sonra ?? 0);
  const hedef = Number(h.seri_hedef ?? 3);
  if (h.tip === "son") {
    if (h.sonuc === "son_kazandi") return h.kazanan === benId
      ? { ton: "iyi", baslik: c("SON DÜELLO SENİN"), alt: c("Tek doğru bilen sendin") }
      : { ton: "kotu", baslik: c("SON DÜELLO RAKİBİN"), alt: c("Tek doğru bilen rakipti") };
    return { ton: "notr", baslik: h.sonuc === "ikisi_dogru" ? c("İKİNİZ DE BİLDİNİZ") : c("İKİNİZ DE BİLEMEDİNİZ"), alt: c("Yeni soru") };
  }
  if (h.tip === "notr") {
    if (h.sonuc === "kontrol_aldi") return benK
      ? { ton: "iyi", baslik: c("KONTROL SENDE"), alt: c("Tek doğru bilen sendin") }
      : { ton: "kotu", baslik: c("KONTROL RAKİPTE"), alt: c("Tek doğru bilen rakipti") };
    return { ton: "notr", baslik: h.sonuc === "ikisi_dogru" ? c("İKİNİZ DE BİLDİNİZ") : c("İKİNİZ DE BİLEMEDİNİZ"), alt: c("Kontrol kimsede değil") };
  }
  if (seri >= hedef) return benK
    ? { ton: "iyi", baslik: c("DÜELLO KAZANILDI"), alt: `${seri}/${hedef}`, bitis: true }
    : { ton: "kotu", baslik: c("DÜELLO KAYBEDİLDİ"), alt: `${seri}/${hedef}`, bitis: true };
  if (h.sonuc === "basarili") return benK
    ? { ton: "iyi", baslik: c("BAŞARILI SALDIRI"), alt: c("Seri {n}/{t}", { n: seri, t: hedef }), baski: seri === hedef - 1 }
    : { ton: "kotu", baslik: c("RAKİP SALDIRDI"), alt: c("Rakip {n}/{t}", { n: seri, t: hedef }), baski: seri === hedef - 1 };
  if (h.sonuc === "el_degisti") return benK
    ? { ton: "iyi", baslik: c("KONTROLÜ ALDIN"), alt: c("Seri {n}/{t}", { n: seri, t: hedef }), el: true }
    : { ton: "kotu", baslik: c("KONTROL RAKİBE GEÇTİ"), alt: c("Rakip {n}/{t}", { n: seri, t: hedef }), el: true };
  return { ton: "notr", baslik: c("SERİ DEĞİŞMEDİ"),
           alt: h.sonuc === "ikisi_dogru" ? c("İkiniz de bildiniz") : c("İkiniz de bilemediniz"), kontrolBen: once === benId };
}

// ---------------------------------------------------------------- arena
export default function Duello4Arena({
  d, ben, rakip, c, seviyeler = {}, gosterSn, farkMs = 0, simdi, kopukBant, yenidenBant, hata, calisan,
  secim, ikinciSansElendi = [], kiriliyor = [], ekBalon, jokerSerbest, sonKullanilan, skillDeger,
  onCevap, onKart, onJoker, onYenile, onCik,
}) {
  const v = d.v4 ?? {};
  const benId = d.ben;
  const hedef = Number(v.seri_hedef ?? 3);
  const kontrol = v.kontrol ?? null;
  const benKontrol = kontrol === benId;
  const taraf = kontrol == null ? "orta" : benKontrol ? "ben" : "rakip";
  const sunucuSimdi = Math.max(simdi, Date.now()) + farkMs;
  const gosterimBas = d.sureler?.gosterim_bas ? new Date(d.sureler.gosterim_bas).getTime() : null;
  const payiMs = Number(d.sureler?.gosterim_payi_ms ?? 2000);
  const soruFazi = ["notr", "cevap", "son"].includes(d.faz);
  const cv = d.cevap ?? {};
  const kilitli = Boolean(cv.ben_cevapladim);
  const rakipAd = adKisalt(rakip.gorunen_ad);
  const oranRakip = c("Rakip");   // kart oranlarında kısa etiket (ad kesilmesin)
  const h = d.faz === "sonuc" ? d.son_hamle : null;
  const sm = sonucModeli(h, benId, c);

  // Giriş (3-2-1): ilk nötr soru sunucuda soru_baslangic'a kadar gizli. O an gelince durum bir kez tazelenir.
  const soruBasMs = gosterimBas ? gosterimBas - payiMs : null;
  const girisAcik = d.faz === "notr" && !d.soru && soruBasMs && sunucuSimdi < soruBasMs + 1500;
  useEffect(() => {
    if (!(d.faz === "notr" && !d.soru && soruBasMs)) return undefined;
    const bekle = soruBasMs - (Date.now() + farkMs) + 80;
    if (bekle > 15000) return undefined;
    const t = setTimeout(() => onYenile?.(), Math.max(0, bekle));
    return () => clearTimeout(t);
  }, [d.faz, Boolean(d.soru), soruBasMs]);   // eslint-disable-line react-hooks/exhaustive-deps

  // Saldırı sorusu açılışı: kim neyi aldı (gösterim payının ilk ~1,6 sn'si).
  const acilisAcik = d.faz === "cevap" && gosterimBas && sunucuSimdi < gosterimBas - payiMs + sure("duello4_acilis");

  // Kontrol çekirdeği: el değişince uçuş + sarsıntı (TEK SEFER, anahtar = soru no).
  const oncekiKontrolRef = useRef(kontrol);
  const [sarsinti, setSarsinti] = useState(null);
  useEffect(() => {
    const once = oncekiKontrolRef.current;
    oncekiKontrolRef.current = kontrol;
    if (once && kontrol && once !== kontrol && document.visibilityState !== "hidden") {
      setSarsinti(Date.now());
      const t = setTimeout(() => setSarsinti(null), sure("duello4_sarsinti"));
      return () => clearTimeout(t);
    }
    return undefined;
  }, [kontrol]);

  // Kart seçimi (kontrol sahibi): tek dokunuşla gider (KART_TEK_DOKUNUS); eski akışta eylem düğmesiyle onaylanır. Adım değişince sıfırlanır.
  const kart = v.kart ?? null;
  const adim = Number(kart?.adim ?? 0);
  const [secili, setSecili] = useState(null);
  const kartAnahtar = `${v.soru_no}-${v.tur}-${d.faz}-${adim}`;
  useEffect(() => { setSecili(null); }, [kartAnahtar]);
  // Çift dokunuş kalkanı: aynı adımda istek yoldayken ikinci dokunuş gönderilmez (sunucu da aynı kartı yok sayar).
  const kartGonderRef = useRef(null);
  useEffect(() => { if (!calisan) kartGonderRef.current = null; }, [calisan, kartAnahtar]);

  // ---------------- sesler (her olay anahtarına bağlı tek sefer; gizli sekmede ses.js zaten çalmaz)
  const sesRef = useRef(new Set());
  const birKez = (anahtar, f) => { if (sesRef.current.has(anahtar)) return; sesRef.current.add(anahtar); f(); };
  const zamanRef = useRef([]);
  useEffect(() => () => zamanRef.current.forEach(clearTimeout), []);
  const sonra = (ms, f) => { zamanRef.current.push(setTimeout(f, ms)); };
  const soruMetni = d.soru?.soru ?? null;
  useEffect(() => {
    if (d.durum !== "aktif") return;
    if (d.faz === "kart" && benKontrol) birKez(`kart:${v.tur}`, () => { sesTurGecis(); titret(20); });
    if (d.faz === "cevap" && soruMetni) birKez(`acilis:${v.soru_no}`, () => { sesKategoriSecildi(); sonra(sure("duello4_acilis"), () => sesSoruGeldi()); });
    if ((d.faz === "notr" || d.faz === "son") && soruMetni) birKez(`soru:${v.soru_no}`, () => sesSoruGeldi());
    if (h && sm) {
      birKez(`sonuc:${h.no}`, () => {
        const benimki = h.oyuncular?.[benId];
        if (benimki?.dogru) { sesDogru(); titret(10); } else { sesYanlis(); titret(40); }
        if (sm.el || (h.tip === "notr" && h.sonuc === "kontrol_aldi")) {
          sonra(Math.round(650 * sureOlcek("duello4_sarsinti")), () => { if (h.kontrol_sonra === benId) { sesTurGecis(); titret([20, 40, 30]); } else { sesCanKaybi(); titret(45); } });
        } else if (sm.baski) sonra(Math.round(650 * sureOlcek("duello4_baski")), () => { sesSonSaniyeler(); titret([30, 50, 30]); });
      });
    }
  }, [d.faz, d.durum, soruMetni, h?.no, benKontrol]);   // eslint-disable-line react-hooks/exhaustive-deps
  // Rakip cevapladı (ben hâlâ düşünürken) — soru başına bir kez.
  useEffect(() => {
    if (soruFazi && cv.rakip_cevapladi && !kilitli) birKez(`rakip:${v.soru_no}`, () => sesRakipCevapladi());
  }, [soruFazi, cv.rakip_cevapladi, kilitli, v.soru_no]);   // eslint-disable-line react-hooks/exhaustive-deps
  // Son 3 sn: cevapta tik (cevaplamadıysam), kartta geri sayım (sıra bendeyse).
  const sn = Math.ceil(gosterSn ?? 0);
  useEffect(() => {
    if (d.durum !== "aktif" || sn <= 0 || sn > 3 || d.kopuk) return;
    if (soruFazi && !kilitli && soruMetni && !acilisAcik) birKez(`tik:${v.soru_no}:${sn}`, () => sesTik(sn));
    else if (d.faz === "kart" && benKontrol && adim < 2) birKez(`ksay:${v.tur}:${sn}`, () => { sesKategoriGeriSayim(sn); if (sn <= 2) titret(20); });
  }, [sn]);   // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------- üst çubuk
  const tepkiBen = h && sm ? (h.oyuncular?.[benId]?.dogru ? "dogru" : "yanlis") : null;
  const tepkiRakip = h && sm ? (h.oyuncular?.[rakip.id]?.dogru ? "dogru" : "yanlis") : null;
  const sayacVar = (soruFazi && Boolean(soruMetni) && !acilisAcik) || d.faz === "kart";
  const toplamSn = d.faz === "kart" ? Number(d.sureler?.kart ?? 10) : Math.max(Number(d.sureler?.cevap ?? 15), Math.ceil(gosterSn ?? 0));
  const rakipSeciyor = d.faz === "kart" && !benKontrol;
  const ust = (
    <header className={sinif("d4-ust", v.son && "d4-ust--son")}>
      <div className="d4-ust-satir">
        <Oyuncu o={ben} c={c} kontrolde={benKontrol} seri={Number(v.seri ?? 0)} hedef={hedef} tepki={tepkiBen}
                onay={soruFazi && kilitli} seviye={seviyeler[ben.id]} />
        <div className="d4-orta">
          <span className="d4-tur">{v.son ? c("SON DÜELLO") : kontrol == null ? c("NÖTR") : <>{c("Tur")} <b className="qt-sayi">{v.tur}/{v.max_tur}</b></>}</span>
          {sayacVar
            ? <QtSayac kalan={gosterSn} toplam={toplamSn} esik={d.faz === "kart" ? 3 : 5} boyut="k" durdu={kilitli || d.kopuk != null || (d.faz === "kart" && gosterimBas != null && sunucuSimdi < gosterimBas)} ekBalon={ekBalon} className="d4-sayac" />
            : <span className="d4-sayac d4-sayac--bos" aria-hidden="true" />}
        </div>
        <Oyuncu o={rakip} c={c} rakipMi kontrolde={kontrol === rakip.id} seri={Number(v.seri ?? 0)} hedef={hedef} tepki={tepkiRakip}
                aktif={rakipSeciyor} onay={soruFazi && Boolean(cv.rakip_cevapladi)} seviye={seviyeler[rakip.id]} />
      </div>
      {/* Kontrol çekirdeği: sahibin tarafına kayar ve parlar; el değişince karşıya uçar. */}
      <div className={sinif("d4-hat", `d4-hat--${v.son ? "son" : taraf}`)} role="img"
           aria-label={v.son ? c("SON DÜELLO") : kontrol == null ? c("Kontrol kimsede değil") : benKontrol ? c("KONTROL SENDE") : c("KONTROL RAKİPTE")}>
        <span className="d4-hat-yol" />
        <span className={sinif("d4-cekirdek", sarsinti && "d4-cekirdek--ucus")}><QtIkon ad={v.son ? "duello" : "kilic"} boyut={22} /></span>
      </div>
    </header>
  );

  // ---------------- sahne paneli
  let panel = null;
  let eylem = null;
  if (d.faz === "notr" && !soruMetni) {
    const kalan = soruBasMs ? Math.ceil((soruBasMs - sunucuSimdi) / 1000) : 0;
    panel = (
      <div className="d4-panel d4-panel--orta d4-giris">
        <span className="d4-amblem"><QtIkon ad="kilic" boyut={46} /></span>
        <h2 className="d4-dev">{c("DÜELLO")}</h2>
        <b className="d4-giris-sayi" key={kalan}>{kalan > 0 ? kalan : c("BAŞLA")}</b>
        {v.ilk_mac && <p className="d4-alt">{c("Tek bilen KONTROLÜ alır · 3/3 seri kazanır")}</p>}
      </div>
    );
  } else if (d.faz === "kart" && kart) {
    const kartlar = kart.kartlar ?? [];
    const gonderilen = kart.gonderilen ?? null;
    if (benKontrol) {
      const ikinci = adim >= 1 && gonderilen;
      // Süre doldu: sunucu ~3 sn geç varış payından sonra iki kartı kendisi seçer — bu arada dokunuş kabul edilmez.
      const sureBitti = !(gosterSn > 0) && !d.kopuk;
      const duyuruda = KART_TEK_DOKUNUS && adim < 2 && gosterimBas != null && sunucuSimdi < gosterimBas;
      const dokun = (k) => {
        if (!KART_TEK_DOKUNUS) { setSecili(k); titret(8); return; }
        const a = `${v.tur}:${adim}`;
        if (duyuruda || kartGonderRef.current === a) return;
        kartGonderRef.current = a;
        setSecili(k); titret(8);
        onKart(k);
      };
      panel = (
        <div className="d4-panel">
          <div className="d4-baslik">
            <span className="d4-adim">{ikinci ? "2/2" : "1/2"}</span>
            {KART_TEK_DOKUNUS
              ? <h2 key={ikinci ? "k2" : "k1"} className={sinif("d4-kart-yazi", duyuruda && "d4-kart-yazi--duyuru")} role="status">
                  {ikinci ? c("Kendi kategorini seç") : c("Rakibe gönderilecek kategoriyi seç")}
                </h2>
              : <h2>{ikinci ? c("KENDİNE SEÇ") : c("RAKİBE GÖNDER")}</h2>}
          </div>
          {sureBitti && <p className="d4-alt d4-oto-not" role="status">{c("Süre doldu · otomatik seçiliyor")}</p>}
          <div className={sinif("d4-kartlar", duyuruda && "d4-kartlar--duyuru")}>
            {kartlar.map((x, i) => {
              const durum = x.k === gonderilen ? "rakibe"
                : secili === x.k ? (ikinci ? "sana" : "rakibe")
                : "normal";
              return (
                <Kart key={x.k} k={x.k} ben={x.ben} rakip={x.rakip} c={c} rakipAd={oranRakip} durum={durum} sira={i}
                      devreDisi={x.k === gonderilen || adim >= 2 || Boolean(calisan) || sureBitti || duyuruda}
                      onClick={() => dokun(x.k)} />
              );
            })}
          </div>
        </div>
      );
      if (!KART_TEK_DOKUNUS) eylem = (
        <QtDugme tur="birincil" tamGenislik ikon={ikinci ? "onay" : "gonder"} className="d4-dugme"
                 devreDisi={!secili || adim >= 2 || Boolean(calisan) || !(gosterSn > 0)} yukleniyor={calisan === "kategori"}
                 onClick={() => secili && onKart(secili)}>
          {ikinci ? c("Kendine seç") : c("Rakibe gönder")}
        </QtDugme>
      );
    } else {
      panel = (
        <div className="d4-panel d4-panel--bekle">
          <div className="d4-baslik d4-baslik--orta">
            <span className="d4-yuk" aria-hidden="true"><i /><i /><i /></span>
            <h2>{c("RAKİP SEÇİYOR")}</h2>
            <span className="d4-adim d4-adim--rakip">{Math.min(2, adim + 1)}/2</span>
          </div>
          <div className="d4-kartlar d4-kartlar--izle">
            {kartlar.map((x, i) => (
              <Kart key={x.k} k={x.k} ben={x.ben} rakip={x.rakip} c={c} rakipAd={oranRakip} durum="izle" sira={i} devreDisi />
            ))}
          </div>
        </div>
      );
    }
  } else if (d.faz === "cevap" && acilisAcik) {
    panel = (
      <div className="d4-panel d4-panel--orta d4-acilis">
        <div className="d4-biletler">
          <div className="d4-bilet-kap">
            <Bilet k={v.benim_kategori} kim="ben" et={benKontrol ? c("KENDİNE ALDIN") : c("SANA GÖNDERDİ")} />
            <b>{c(kategoriAdi(v.benim_kategori))}</b>
          </div>
          <div className="d4-bilet-kap">
            <Bilet k={v.rakip_kategori} kim="rakip" et={benKontrol ? c("RAKİBE GÖNDERDİN") : c("KENDİNE ALDI")} />
            <b>{c(kategoriAdi(v.rakip_kategori))}</b>
          </div>
        </div>
        {v.oto && <p className="d4-alt">{c("Süre doldu · otomatik seçildi")}</p>}
      </div>
    );
  } else if (soruFazi && soruMetni) {
    const secenekler = secenekleriCoz(d.soru?.secenekler);
    const benimCevap = kilitli && cv.benim_cevabim !== null && cv.benim_cevabim !== undefined ? Number(cv.benim_cevabim) : secim;
    const kapali = Array.isArray(cv.elli_kapali) ? cv.elli_kapali.map(Number) : [];
    const ilkYanlis = cv.ikinci_sans_ilk_cevap === null || cv.ikinci_sans_ilk_cevap === undefined ? null : Number(cv.ikinci_sans_ilk_cevap);
    const elenen = new Set([...ikinciSansElendi, ...(ilkYanlis === null ? [] : [ilkYanlis])]);
    const sureBitti = !(gosterSn > 0);
    const tiklanabilir = !kilitli && !sureBitti && secim === null && calisan !== "cevap";
    const durum = (i) => {
      if (kapali.includes(i) || elenen.has(i)) return kiriliyor.includes(i) ? "kilitli" : "elendi";
      if (i === benimCevap) return "secili";
      return tiklanabilir ? "normal" : "kilitli";
    };
    const kat = v.benim_kategori ?? d.soru?.kategori;
    const etiket = d.faz === "son" ? c("Joker yok") : d.faz === "notr" ? c("Aynı soru")
      : benKontrol ? c("Seçimin") : c("Rakipten");
    panel = (
      <div className={sinif("d4-panel d4-soru", d.faz === "son" && "d4-soru--son", d.faz === "cevap" && (benKontrol ? "d4-soru--ben" : "d4-soru--rakip"))}>
        {d.faz === "son" && <p className="d4-son-bant"><QtIkon ad="duello" boyut={16} />{c("SON DÜELLO")}</p>}
        <QtSoruKarti
          key={soruMetni}
          className={sinif("m2-soru d4-soru-kart", soruUzunlukSinifi({ soru: soruMetni, secenekler }))}
          kategori={kat ? <><KategoriIkon anahtar={kat} boyut={16} /> {c(kategoriAdi(kat))}</> : null}
          sira={etiket}
          metin={soruMetni}
        />
        <QtSikler etiket={c("Şıklar")}>
          {secenekler.map((s, i) => {
            const dr = durum(i);
            return (
              <QtSik key={`${soruMetni}-${i}`} harf={HARFLER[i]} metin={s} durum={dr} kiriliyor={kiriliyor.includes(i)}
                     className={dr === "elendi" || kiriliyor.includes(i) ? "elendi" : undefined} onClick={() => onCevap(i)} />
            );
          })}
        </QtSikler>
        {d.faz === "cevap" && v.rakip_kategori && (
          // Otomatik seçim bilgisi burada da durur: istemci soruyu açılış anından geç görürse (ağ / sekme) bilgi kaybolmasın.
          <p className="d4-rakip-kat"><KategoriIkon anahtar={v.rakip_kategori} boyut={16} />{c("Rakibin sorusu: {k}", { k: c(kategoriAdi(v.rakip_kategori)) })}
            {v.oto && <span className="d4-oto-etiket"> · {c("Süre doldu · otomatik seçildi")}</span>}</p>
        )}
      </div>
    );
    if (d.faz !== "son") {
      eylem = (
        <V2Skill d={{ ...d, faz: "cevap", uzatma: false, hakimiyet: null }} calisan={calisan} kalanSn={gosterSn} serbest={jokerSerbest}
                 sonKullanilan={sonKullanilan} onKullan={onJoker} c={c} skillDeger={skillDeger} />
      );
    }
  } else if (d.faz === "sonuc" && sm) {
    const benimki = h.oyuncular?.[benId] ?? {};
    const rakibinki = h.oyuncular?.[rakip.id] ?? {};
    const satir = (x, ad, kim) => (
      <div className={sinif("d4-cevap", `d4-cevap--${kim}`, x.dogru ? "d4-cevap--dogru" : "d4-cevap--yanlis")}>
        <span className="d4-cevap-kim">{ad}</span>
        {x.kategori && <KategoriIkon anahtar={x.kategori} boyut={26} plaka />}
        <span className="d4-cevap-isaret"><QtIkon ad={x.dogru ? "onay" : x.yanitsiz ? "saat" : "carpi"} boyut={26} /></span>
        <b>{x.dogru ? c("Doğru") : x.yanitsiz ? c("Yanıtsız") : c("Yanlış")}</b>
      </div>
    );
    panel = (
      <div className={sinif("d4-panel d4-panel--orta d4-sonuc", `d4-sonuc--${sm.ton}`, sm.bitis && "d4-sonuc--bitis")} key={`s${h.no}`}>
        {sm.bitis && sm.ton === "iyi" && <span className="d4-konfeti" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ "--i": i }} />)}</span>}
        <h2 className="d4-sonuc-baslik">{sm.baslik}</h2>
        <p className="d4-alt d4-sonuc-alt">{sm.alt}</p>
        <div className="d4-cevaplar">
          {satir(benimki, c("Sen"), "ben")}
          {satir(rakibinki, rakipAd, "rakip")}
        </div>
        {sm.baski && (
          <div className={sinif("d4-baski", h.kontrol_sonra === benId ? "d4-baski--ben" : "d4-baski--rakip")} role="alert">
            <b>{c("SON BASKI")}</b>
            <span>{h.kontrol_sonra === benId ? c("Bir saldırı daha, düello senin") : c("Rakip bir saldırı uzakta")}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={sinif("m2-mac hk-mac d4-arena", `d4-arena--${d.faz}`, v.son && "d4-arena--sonduello")}>
      <MacUstSerit onCik={onCik} cikisEtiketi={c("Düellodan çık")} rozet={c("Düello")} />
      {ust}
      {kopukBant && (
        <p className="m2-bant m2-bant--uyari" role="status">
          <QtIkon ad="uyari" boyut={18} />
          <span>
            {kopukBant.benMi ? c("Bağlantın koptu — düello bekliyor.") : c("Rakibin bağlantısı koptu — düello durduruldu.")}
            {kopukBant.kalan == null ? "" : ` ${kopukBant.kalan} ${c("sn")}`}
          </span>
        </p>
      )}
      {yenidenBant && (
        <p className="m2-bant m2-bant--uyari" role="status"><QtIkon ad="yenile" boyut={18} /><span>{c("Bağlantı yeniden kuruluyor…")}</span></p>
      )}
      <main className={sinif("d4-sahne", sarsinti && "d4-sahne--sarsinti")} key={`${d.faz}-${v.soru_no}-${v.tur}`}>
        {panel}
      </main>
      {hata && <p className="m2-hata d4-hata" role="alert"><QtIkon ad="uyari" boyut={18} /> {hata}</p>}
      {eylem && <footer className="d4-alt-cubuk">{eylem}</footer>}
    </div>
  );
}

// ---------------------------------------------------------------- maç sonu: soru soru özet (duello_durum › gecmis, v4)
export function D4Gecmis({ gecmis, c }) {
  if (!Array.isArray(gecmis) || !gecmis.length) return null;
  const etiket = (g) => g.tip === "son" ? c("Son Düello") : g.tip === "notr" ? c("Nötr") : c("Tur {n}", { n: g.tur });
  return (
    <ol className="d4-gecmis" aria-label={c("Sorular")}>
      {gecmis.map((g, i) => (
        <li key={i} className={sinif("d4-gecmis-satir", g.ben_dogru ? "d4-gecmis--dogru" : "d4-gecmis--yanlis")}>
          <span className="d4-gecmis-et">{etiket(g)}</span>
          {g.kategori && <KategoriIkon anahtar={g.kategori} boyut={20} />}
          <span className="d4-gecmis-soru">{g.soru}</span>
          <span className="d4-gecmis-isaret" title={c("Sen")}><QtIkon ad={g.ben_dogru ? "onay" : "carpi"} boyut={16} /></span>
          <span className={sinif("d4-gecmis-isaret d4-gecmis-isaret--rakip", g.rakip_dogru ? "d4-gecmis--dogru" : "d4-gecmis--yanlis")} title={c("Rakip")}>
            <QtIkon ad={g.rakip_dogru ? "onay" : "carpi"} boyut={16} />
          </span>
        </li>
      ))}
    </ol>
  );
}

// Maç sonu alt yazısı (v4): 3/3 seri ya da Son Düello.
export function d4AltYazi(d, c) {
  const h = d.son_hamle;
  if (d.durum !== "bitti" || !h || h.surum !== 4) return null;
  const kazandim = d.kazanan === d.ben;
  if (h.sonuc === "son_kazandi") return kazandim ? c("Son Düello'yu sen bildin") : c("Son Düello'yu rakip bildi");
  return kazandim ? c("3/3 seri — düello senin") : c("Rakip 3/3 seriye ulaştı");
}
