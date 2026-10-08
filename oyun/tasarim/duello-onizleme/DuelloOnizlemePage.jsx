// /duello-onizleme — YENİ Düello'nun ekran taslağı (9 Eki 2026, Ida onayı için).
// SADECE görünüm: oyun mantığı, veritabanı, realtime, bot YOK; sunucuya istek atmaz, mevcut Düello'ya bağlı değil.
// Veri sahte ve sabit (Tarih %28 rakip / %74 sen gibi). Menüde link yok; /lig-sahne-onizleme gibi giriş yapmış herkese açık, tembel parça.
// Kural özeti: nötr soruda yalnız biri doğru bilirse KONTROL onda · kontrol sahibi 4 karttan birini rakibe gönderir, birini kendine seçer (7 sn)
// · başarılı saldırı seri +1 · kontrol sahibi yanlış + rakip doğru = kontrol el değiştirir (yeni seri 1/3) · aynı dönemde 3/3 = galibiyet
// · 15 turda çıkmazsa SON DÜELLO (aynı soru, jokersiz).
// Bileşenler gerçek olanlar: CerceveliAvatar, KategoriIkon, QtDugme/QtSekmeler/QtIkon. Yeni ikon çizilmedi.
import { useEffect, useState } from "react";
import CerceveliAvatar from "../../components/CerceveliAvatar.jsx";
import KategoriIkon from "../../components/KategoriIkon.jsx";
import { QtDugme, QtIkon, QtSekmeler } from "../index.js";
import { kategoriAdi } from "../../lib/kategoriler.js";
import { aktifDil, tt } from "../../lib/dil.js";
import "./duello-onizleme.css";

const SEN = { gorunen_ad: "Sen", gorunen_avatar: "/avatars/pro/tilki-k04.svg" };
const RAKIP = { gorunen_ad: "Deniz", gorunen_avatar: "/avatars/pro2/samuray-y15.svg" };
const TUR_MAX = 15;
// [sen, rakip] başarı oranı (%)
const ORAN = { tarih: [74, 28], muzik: [66, 40], bilim: [61, 55], sinema: [38, 72] };

const pct = (n) => (aktifDil() === "en" ? `${n}%` : `%${n}`);
const up = (m) => m.toLocaleUpperCase(aktifDil() === "tr" ? "tr" : "en");
const harf = (i) => "ABCD"[i];

const ADIMLAR = [
  { ad: "Nötr ilk soru" },
  { ad: "Kontrol anı" },
  { ad: "Kontrol sahibi · rakibe gönder" },
  { ad: "Kontrol sahibi · kendine seç" },
  { ad: "Rakip ekranı (bekleyen)" },
  { ad: "Soru turu" },
  { ad: "Tur sonucu" },
  { ad: "Seri durumu" },
  { ad: "Düello kazanıldı" },
  { ad: "Kontrol el değiştirdi" },
  { ad: "Son Düello" },
];

/* ---------------------------------------------------------------- küçük parçalar */
function useSayac(toplam) {
  const [sn, setSn] = useState(toplam);
  useEffect(() => {
    const id = setInterval(() => setSn((x) => (x <= 1 ? toplam : x - 1)), 1000);
    return () => clearInterval(id);
  }, [toplam]);
  return sn;
}

function Zaman({ toplam, etiket }) {
  const sn = useSayac(toplam);
  return (
    <div className="dop-zaman" style={{ "--sure": `${toplam}s` }} role="timer" aria-label={etiket}>
      <span className="dop-zaman-yol"><i /></span>
      <b>{sn}</b>
    </div>
  );
}

function Oyuncu({ taraf, kontrolde }) {
  const p = taraf === "sen" ? SEN : RAKIP;
  return (
    <div className={`dop-oy dop-oy--${taraf}${kontrolde ? " dop-oy--kontrol" : ""}`}>
      <CerceveliAvatar profile={p} boyut={44} cerceve="lig_gumus" aura={null} premiumCerceve={null} premiumAura={null} sezonBp={false} />
      <span className="dop-oy-ad">{tt(p.gorunen_ad)}</span>
    </div>
  );
}

function SeriNoktalari({ deger, taraf }) {
  return (
    <span className={`dop-nokta-sira dop-nokta-sira--${taraf ?? "yok"}`} aria-hidden="true">
      {[1, 2, 3].map((i) => <i key={i} className={i <= deger ? "dop-nokta dop-nokta--dolu" : "dop-nokta"} />)}
    </span>
  );
}

// Üst bilgi: yalnız iki oyuncu, KONTROL kimde, seri kaç/3, tur sayısı.
function Ust({ kontrol, seri, tur, son = false }) {
  const taraf = kontrol === "ben" ? "sen" : kontrol === "rakip" ? "rakip" : null;
  const bantYazi = son ? tt("SON DÜELLO")
    : kontrol === "ben" ? tt("KONTROL SENDE")
    : kontrol === "rakip" ? up(tt("Kontrol {ad}'de", { ad: tt("Deniz") }))
    : tt("KONTROL KİMSEDE DEĞİL");
  return (
    <header className="dop-ust">
      <div className="dop-ust-satir">
        <Oyuncu taraf="sen" kontrolde={kontrol === "ben"} />
        <div className="dop-tur" aria-label={tt("Tur")}>
          <span>{son ? tt("SON") : tt("TUR")}</span>
          <b>{son ? "★" : `${tur}/${TUR_MAX}`}</b>
        </div>
        <Oyuncu taraf="rakip" kontrolde={kontrol === "rakip"} />
      </div>
      <div className={`dop-bant dop-bant--${son ? "son" : taraf ?? "yok"}`}>
        <span className="dop-bant-ad"><QtIkon ad={son ? "duello" : "kilic"} boyut={18} />{bantYazi}</span>
        {!son && (
          <span className="dop-bant-seri">
            <span>{tt("SERİ")}</span>
            <SeriNoktalari deger={taraf ? seri : 0} taraf={taraf} />
            <b>{taraf ? seri : 0}/3</b>
          </span>
        )}
      </div>
    </header>
  );
}

function Oran({ taraf, ad, v, vurgu }) {
  return (
    <div className={`dop-oran dop-oran--${taraf}${vurgu ? " dop-oran--vurgu" : ""}`}>
      <span className="dop-oran-ad">{ad}</span>
      <span className="dop-oran-yol"><i style={{ width: `${v}%` }} /></span>
      <b>{pct(v)}</b>
    </div>
  );
}

function Oranlar({ k, vurgu }) {
  const [s, r] = ORAN[k];
  return (
    <div className="dop-oranlar">
      <Oran taraf="sen" ad={tt("Sen")} v={s} vurgu={vurgu === "sen"} />
      <Oran taraf="rakip" ad={tt("Deniz")} v={r} vurgu={vurgu === "rakip"} />
    </div>
  );
}

function KatKart({ k, vurgu, secili, damga, satir = false, onClick }) {
  return (
    <button type="button" className={`dop-kart${satir ? " dop-kart--satir" : ""}${secili ? " dop-kart--secili" : ""}`}
      aria-pressed={secili} onClick={onClick}>
      <span className="dop-kart-ust">
        <KategoriIkon anahtar={k} boyut={40} plaka />
        <b className="dop-kart-ad">{kategoriAdi(k)}</b>
      </span>
      <Oranlar k={k} vurgu={vurgu} />
      {secili && <span className="dop-damga"><QtIkon ad={damga === "rakip" ? "gonder" : "onay"} boyut={14} />{damga === "rakip" ? tt("RAKİBE") : tt("SANA")}</span>}
    </button>
  );
}

function Sik({ i, yazi, secili, onClick }) {
  return (
    <button type="button" className={`dop-sik${secili ? " dop-sik--secili" : ""}`} aria-pressed={secili} onClick={onClick}>
      <span className="dop-sik-harf">{harf(i)}</span>
      <span className="dop-sik-yazi">{yazi}</span>
    </button>
  );
}

function SeriYolu({ deger, taraf, yeni = false, nabiz = false }) {
  return (
    <div className={`dop-yol dop-yol--${taraf}`} role="img" aria-label={`${deger}/3`}>
      {[1, 2, 3].map((i) => {
        const dolu = i <= deger;
        const sonAdim = i === deger && yeni;
        const hedef = nabiz && i === deger + 1;
        return (
          <span key={i} className={`dop-yol-adim${dolu ? " dop-yol-adim--dolu" : ""}${sonAdim ? " dop-yol-adim--yeni" : ""}${hedef ? " dop-yol-adim--hedef" : ""}`}>
            {dolu ? <QtIkon ad="kilic" boyut={24} /> : <b>{i}</b>}
          </span>
        );
      })}
    </div>
  );
}

function Etiket({ children }) {
  return <p className="dop-etiket">{children}</p>;
}

function Alt({ children }) {
  return <footer className="dop-alt">{children}</footer>;
}

function Kirmizi({ children, ikon = "kilic", ...r }) {
  return <QtDugme tur="birincil" tamGenislik ikon={ikon} className="dop-dugme" {...r}>{children}</QtDugme>;
}

function Gizli({ taraf }) {
  return (
    <span className={`dop-kart dop-kart--gizli${taraf ? ` dop-kart--${taraf}` : ""}`} aria-hidden="true">
      <QtIkon ad="soru" boyut={30} />
    </span>
  );
}

/* ---------------------------------------------------------------- ekranlar */
// 1 — nötr ilk soru: iki oyuncu aynı soruyu cevaplar, kontrol kimsede değil
function EkNotr() {
  const [c, setC] = useState(1);
  return (
    <>
      <Ust kontrol={null} seri={0} tur={1} />
      <div className="dop-govde">
        <div className="dop-ipucu"><QtIkon ad="bilgi" boyut={18} /><span>{tt("Aynı soru. Yalnız biri doğru bilirse KONTROL onda olur.")}</span></div>
        <div className="dop-soru-kap">
          <span className="dop-kat-cip"><KategoriIkon anahtar="genel_kultur" boyut={22} plaka />{kategoriAdi("genel_kultur")}</span>
          <Zaman toplam={15} etiket={tt("Süre")} />
          <h2 className="dop-soru">{tt("Türkiye'nin başkenti neresidir?")}</h2>
        </div>
        <div className="dop-sikler">
          {["İstanbul", "Ankara", "İzmir", "Bursa"].map((s, i) => <Sik key={s} i={i} yazi={s} secili={c === i} onClick={() => setC(i)} />)}
        </div>
        <div className="dop-durumlar">
          <span className="dop-durum dop-durum--sen"><i />{tt("Sen cevaplıyorsun")}</span>
          <span className="dop-durum dop-durum--rakip"><i />{tt("Deniz cevaplıyor")}</span>
        </div>
      </div>
    </>
  );
}

// 2 — "Kontrol sende" anı
function EkKontrolAni({ rol, ileri }) {
  const ben = rol === "ben";
  return (
    <>
      <Ust kontrol={rol} seri={0} tur={2} />
      <div className="dop-govde dop-govde--orta">
        <div className={`dop-amblem dop-amblem--${ben ? "sen" : "rakip"}`}><QtIkon ad="kilic" boyut={56} /></div>
        <h2 className="dop-dev">{ben ? tt("KONTROL SENDE") : up(tt("Kontrol {ad}'de", { ad: tt("Deniz") }))}</h2>
        <p className="dop-alt-yazi">{ben ? tt("Yalnız sen doğru bildin.") : tt("Yalnız {ad} doğru bildi.", { ad: tt("Deniz") })}</p>
        <ul className="dop-kurallar">
          {(ben
            ? ["Rakibe bir kategori gönder.", "Kendine bir kategori seç.", "Aynı dönemde 3 üstünlük = galibiyet."]
            : ["{ad} sana bir kategori gönderir.", "Kendine de bir kategori seçer.", "Yanlış yaparsa ve sen bilirsen kontrol sana geçer."]
          ).map((s) => <li key={s}><QtIkon ad="onay" boyut={16} />{tt(s, { ad: tt("Deniz") })}</li>)}
        </ul>
      </div>
      <Alt><Kirmizi ikon="ileri" onClick={ileri}>{tt("Devam")}</Kirmizi></Alt>
    </>
  );
}

// 3 — kontrol sahibi, adım A: 4 kart, "Rakibe gönder", 7 sn
const KARTLAR_A = ["tarih", "sinema", "muzik", "bilim"];
function EkSecimA({ ileri }) {
  const [k, setK] = useState("tarih");
  return (
    <>
      <Ust kontrol="ben" seri={1} tur={4} />
      <div className="dop-govde">
        <Etiket>{tt("Kontrol sahibinin ekranı")}</Etiket>
        <div className="dop-adim-basligi">
          <span className="dop-adim-no">1/2</span>
          <h2>{tt("Rakibe göndereceğin kategoriyi seç")}</h2>
        </div>
        <Zaman toplam={7} etiket={tt("Süre")} />
        <div className="dop-kartlar">
          {KARTLAR_A.map((x) => <KatKart key={x} k={x} vurgu="rakip" secili={k === x} damga="rakip" onClick={() => setK(x)} />)}
        </div>
        <p className="dop-not">{tt("Süre dolarsa otomatik seçilir.")}</p>
      </div>
      <Alt><Kirmizi ikon="gonder" onClick={ileri}>{tt("RAKİBE GÖNDER")}</Kirmizi></Alt>
    </>
  );
}

// 4 — adım B: kalan 3 kart, "Kendine seç"
function EkSecimB({ ileri }) {
  const [k, setK] = useState("muzik");
  return (
    <>
      <Ust kontrol="ben" seri={1} tur={4} />
      <div className="dop-govde">
        <Etiket>{tt("Kontrol sahibinin ekranı")}</Etiket>
        <div className="dop-adim-basligi">
          <span className="dop-adim-no">2/2</span>
          <h2>{tt("Kendine seçeceğin kategoriyi seç")}</h2>
        </div>
        <Zaman toplam={7} etiket={tt("Süre")} />
        <div className="dop-gonderildi">
          <QtIkon ad="gonder" boyut={16} />
          <span>{tt("Rakibe gitti:")}</span>
          <KategoriIkon anahtar="tarih" boyut={22} plaka />
          <b>{kategoriAdi("tarih")}</b>
        </div>
        <div className="dop-kartlar dop-kartlar--sutun">
          {["muzik", "bilim", "sinema"].map((x) => <KatKart key={x} k={x} satir vurgu="sen" secili={k === x} damga="sen" onClick={() => setK(x)} />)}
        </div>
        <p className="dop-not">{tt("Seçilmeyen 2 kart kullanılmaz.")}</p>
      </div>
      <Alt><Kirmizi ikon="onay" onClick={ileri}>{tt("KENDİNE SEÇ")}</Kirmizi></Alt>
    </>
  );
}

// 5 — rakip ekranı (bekleyen taraf): kategori seçilirken bekler, açılınca iki kategori görünür
function EkBekleyen({ ileri }) {
  const [faz, setFaz] = useState("bekle");
  return (
    <>
      <Ust kontrol="rakip" seri={1} tur={5} />
      <div className="dop-govde">
        <Etiket>{tt("Bekleyen tarafın ekranı")}</Etiket>
        <QtSekmeler etiket={tt("Durum")} aktif={faz} onSec={setFaz} className="dop-alt-sekme"
          sekmeler={[{ kod: "bekle", ad: tt("Seçiyor") }, { kod: "ac", ad: tt("Açıldı") }]} />
        {faz === "bekle" ? (
          <>
            <div className="dop-bekle-baslik">
              <span className="dop-yuk" aria-hidden="true"><i /><i /><i /></span>
              <h2>{tt("Rakip kategori seçiyor")}</h2>
              <p className="dop-alt-yazi">{tt("Sana ve kendine birer kategori seçecek.")}</p>
            </div>
            <Zaman toplam={7} etiket={tt("Süre")} />
            <div className="dop-kartlar" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => <Gizli key={i} />)}
            </div>
          </>
        ) : (
          <>
            <div className="dop-bekle-baslik">
              <h2>{tt("Kategoriler belli oldu")}</h2>
              <p className="dop-alt-yazi">{tt("İkiniz de kendi kategorinizden, aynı zorlukta soru alacaksınız.")}</p>
            </div>
            <div className="dop-acilis">
              <div className="dop-bilet dop-bilet--sen">
                <span className="dop-bilet-et">{tt("SANA GELEN")}</span>
                <KategoriIkon anahtar="sinema" boyut={48} plaka />
                <b>{kategoriAdi("sinema")}</b>
                <Oran taraf="sen" ad={tt("Sen")} v={ORAN.sinema[0]} vurgu />
              </div>
              <div className="dop-bilet dop-bilet--rakip">
                <span className="dop-bilet-et">{up(tt("{ad}'in kategorisi", { ad: tt("Deniz") }))}</span>
                <KategoriIkon anahtar="muzik" boyut={48} plaka />
                <b>{kategoriAdi("muzik")}</b>
                <Oran taraf="rakip" ad={tt("Deniz")} v={ORAN.muzik[1]} vurgu />
              </div>
            </div>
          </>
        )}
      </div>
      <Alt><Kirmizi ikon="ileri" onClick={ileri}>{tt("Devam")}</Kirmizi></Alt>
    </>
  );
}

// 6 — soru turu: kendi sorun, atanan kategori ve oran, seri/kontrol bilgisi
function EkSoru({ rol }) {
  const ben = rol === "ben";
  const [c, setC] = useState(0);
  const k = ben ? "muzik" : "tarih";
  return (
    <>
      <Ust kontrol={rol} seri={1} tur={6} />
      <div className="dop-govde">
        <div className="dop-atanan">
          <KategoriIkon anahtar={k} boyut={44} plaka />
          <div className="dop-atanan-metin">
            <span>{ben ? tt("Kendine seçtin") : tt("{ad} sana gönderdi", { ad: tt("Deniz") })}</span>
            <b>{kategoriAdi(k)}</b>
          </div>
          <div className="dop-atanan-oran">
            <Oran taraf="sen" ad={tt("Sen")} v={ORAN[k][0]} vurgu />
            <Oran taraf="rakip" ad={tt("Deniz")} v={ORAN[k][1]} />
          </div>
        </div>
        <Zaman toplam={15} etiket={tt("Süre")} />
        <h2 className="dop-soru">{ben ? tt("Aşağıdakilerden hangisi bir bestecidir?") : tt("Osmanlı Devleti'ni kuran kişi kimdir?")}</h2>
        <div className="dop-sikler">
          {(ben ? ["Mozart", "Rembrandt", "Dante", "Galilei"] : ["Osman Bey", "Orhan Bey", "Ertuğrul Gazi", "I. Murad"])
            .map((s, i) => <Sik key={s} i={i} yazi={s} secili={c === i} onClick={() => setC(i)} />)}
        </div>
        <div className="dop-durumlar">
          <span className="dop-durum dop-durum--rakip"><i />{tt("{ad} kendi sorusunu cevaplıyor", { ad: tt("Deniz") })}</span>
        </div>
      </div>
    </>
  );
}

// 7 — tur sonucu: başarılı saldırı · kontrol el değiştirdi · nötr
function EkSonuc({ rol, ileri }) {
  const [d, setD] = useState("saldiri");
  const ben = rol === "ben";
  // Kontrol sahibi (rol) doğru/yanlış → sonuç
  const sahipDogru = d === "saldiri" || d === "notr";
  const rakipDogru = d === "degisim" || d === "notr";
  const sen = ben ? sahipDogru : rakipDogru;
  const den = ben ? rakipDogru : sahipDogru;
  const iyi = d === "saldiri" ? ben : d === "degisim" ? !ben : null;
  const basliklar = {
    saldiri: ben ? tt("BAŞARILI SALDIRI") : up(tt("{ad} saldırdı", { ad: tt("Deniz") })),
    degisim: ben ? up(tt("Kontrol {ad}'e geçti", { ad: tt("Deniz") })) : tt("KONTROLÜ ALDIN"),
    notr: tt("ÜSTÜNLÜK YOK"),
  };
  const altlar = {
    saldiri: ben ? tt("Sen doğru, {ad} yanlış. Seri +1, kontrol sende.", { ad: tt("Deniz") }) : tt("{ad} doğru, sen yanlış. {ad}'in serisi +1.", { ad: tt("Deniz") }),
    degisim: ben ? tt("Sen yanlış, {ad} doğru. {ad}'in serisi 1/3 ile başlıyor.", { ad: tt("Deniz") }) : tt("Sen doğru, {ad} yanlış. Serin 1/3 ile başlıyor.", { ad: tt("Deniz") }),
    notr: tt("İkiniz de aynı sonucu aldınız. Kontrol ve seri aynı kalıyor."),
  };
  const taraf = (d === "degisim" ? !ben : ben) ? "sen" : "rakip";
  const once = 1;
  const sonra = d === "saldiri" ? 2 : 1;
  const yolTaraf = d === "degisim" ? (ben ? "rakip" : "sen") : (ben ? "sen" : "rakip");
  return (
    <>
      <Ust kontrol={rol} seri={1} tur={6} />
      <div className="dop-govde">
        <QtSekmeler etiket={tt("Sonuç durumu")} aktif={d} onSec={setD} className="dop-alt-sekme"
          sekmeler={[{ kod: "saldiri", ad: tt("Saldırı") }, { kod: "degisim", ad: tt("El değişti") }, { kod: "notr", ad: tt("Nötr") }]} />
        <div key={`${d}-${rol}`} className={`dop-sonuc dop-sonuc--${iyi === null ? "notr" : iyi ? "iyi" : "kotu"}`}>
          <h2 className="dop-sonuc-baslik">{basliklar[d]}</h2>
          <p>{altlar[d]}</p>
        </div>
        <div className="dop-cevaplar">
          {[{ t: "sen", ok: sen, k: ben ? "muzik" : "tarih" }, { t: "rakip", ok: den, k: ben ? "tarih" : "muzik" }].map((x) => (
            <div key={x.t} className={`dop-cevap dop-cevap--${x.t}${x.ok ? " dop-cevap--dogru" : " dop-cevap--yanlis"}`}>
              <span className="dop-cevap-kim">{tt(x.t === "sen" ? "Sen" : "Deniz")}</span>
              <KategoriIkon anahtar={x.k} boyut={30} plaka />
              <span className="dop-cevap-isaret"><QtIkon ad={x.ok ? "onay" : "carpi"} boyut={22} />{x.ok ? tt("Doğru") : tt("Yanlış")}</span>
            </div>
          ))}
        </div>
        <div className="dop-seri-degisim">
          <span>{d === "degisim" ? tt("{ad} yeni seri", { ad: tt(taraf === "sen" ? "Sen" : "Deniz") }) : tt("Seri")}</span>
          {d === "degisim" ? (
            <SeriYolu deger={1} taraf={yolTaraf} yeni />
          ) : (
            <><SeriYolu deger={once} taraf={yolTaraf} /><QtIkon ad="ileri" boyut={18} /><SeriYolu deger={d === "notr" ? once : sonra} taraf={yolTaraf} yeni={d === "saldiri"} /></>
          )}
        </div>
      </div>
      <Alt><Kirmizi ikon="ileri" onClick={ileri}>{tt("Sonraki tur")}</Kirmizi></Alt>
    </>
  );
}

// 8 — seri 1/3, 2/3 (2/3'te gerilim)
function EkSeri({ rol, ileri }) {
  const [n, setN] = useState(2);
  const ben = rol === "ben";
  const taraf = ben ? "sen" : "rakip";
  const ad = ben ? tt("Sen") : tt("Deniz");
  return (
    <>
      <Ust kontrol={rol} seri={n} tur={n === 1 ? 5 : 8} />
      <div className="dop-govde">
        <QtSekmeler etiket={tt("Seri")} aktif={String(n)} onSec={(k) => setN(Number(k))} className="dop-alt-sekme"
          sekmeler={[{ kod: "1", ad: "1/3" }, { kod: "2", ad: "2/3" }]} />
        <div key={n} className={`dop-seri-kutu dop-seri-kutu--${taraf}${n === 2 ? " dop-seri-kutu--gerilim" : ""}`}>
          <span className="dop-seri-et">{ben ? tt("Senin serin") : tt("{ad} serisi", { ad: tt("Deniz") })}</span>
          <b className="dop-seri-sayi">{n}<small>/3</small></b>
          <SeriYolu deger={n} taraf={taraf} yeni nabiz={n === 2} />
        </div>
        {n === 2 ? (
          <div className="dop-uyari" role="alert">
            <QtIkon ad="uyari" boyut={22} />
            <div>
              <b>{ben ? tt("Bir sonraki üstünlük maçı bitirir") : tt("{ad}'in bir sonraki üstünlüğü maçı bitirir", { ad: tt("Deniz") })}</b>
              <span>{ben ? tt("Kontrolü kaybetme: yanlış yaparsan seri bozulur.") : tt("Kontrolü almak için bilmen, {ad}'in yanlış yapması gerekir.", { ad: tt("Deniz") })}</span>
            </div>
          </div>
        ) : (
          <p className="dop-alt-yazi dop-ort">{ben ? tt("İki üstünlük daha ve düello senin.") : tt("{ad} iki üstünlük daha kurarsa düello biter.", { ad: tt("Deniz") })}</p>
        )}
        <p className="dop-not">{tt("Aynı kontrol döneminde 3/3'e ulaşan maçı kazanır.")}</p>
      </div>
      <Alt><Kirmizi ikon="ileri" onClick={ileri}>{tt("Devam")}</Kirmizi></Alt>
    </>
  );
}

// 9 — 3/3: Düello kazanıldı
function EkKazanildi({ rol, ileri }) {
  const ben = rol === "ben";
  return (
    <>
      <Ust kontrol={rol} seri={3} tur={9} />
      <div className="dop-govde dop-govde--orta">
        {ben && <span className="dop-konfeti" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ "--i": i }} />)}</span>}
        <div className={`dop-kupa dop-kupa--${ben ? "sen" : "rakip"}`}><QtIkon ad={ben ? "kupa" : "kalkan"} boyut={64} /></div>
        <h2 className="dop-dev">{ben ? tt("DÜELLO KAZANILDI") : tt("DÜELLO KAYBEDİLDİ")}</h2>
        <p className="dop-alt-yazi">{ben ? tt("Aynı dönemde 3/3 seriye ulaştın.") : tt("{ad} aynı dönemde 3/3 seriye ulaştı.", { ad: tt("Deniz") })}</p>
        <SeriYolu deger={3} taraf={ben ? "sen" : "rakip"} yeni />
        <p className="dop-not">{tt("9. turda bitti")}</p>
      </div>
      <Alt>
        <Kirmizi ikon={ben ? "coin" : "yenile"} onClick={ileri}>{ben ? tt("Ödülü al") : tt("Rövanş iste")}</Kirmizi>
      </Alt>
    </>
  );
}

// 10 — kontrol el değiştirme: belirgin olay
function EkEl({ rol, ileri }) {
  const ben = rol === "ben";   // rol = ESKİ sahip; yeni sahip karşı taraf
  const yeni = ben ? "rakip" : "ben";
  return (
    <>
      <Ust kontrol={yeni} seri={1} tur={7} />
      <div key={rol} className={`dop-govde dop-govde--orta dop-el dop-el--${yeni === "ben" ? "sen" : "rakip"}`}>
        <span className="dop-el-isik" aria-hidden="true" />
        <div className={`dop-el-yol dop-el-yol--${ben ? "sagda" : "solda"}`}>
          <div className={`dop-el-oy${yeni === "ben" ? " dop-el-oy--yeni" : " dop-el-oy--eski"}`}><CerceveliAvatar profile={SEN} boyut={64} cerceve="lig_gumus" aura={null} premiumCerceve={null} premiumAura={null} sezonBp={false} /><span>{tt("Sen")}</span></div>
          <span className="dop-el-token"><QtIkon ad="kilic" boyut={34} /></span>
          <div className={`dop-el-oy${yeni === "rakip" ? " dop-el-oy--yeni" : " dop-el-oy--eski"}`}><CerceveliAvatar profile={RAKIP} boyut={64} cerceve="lig_gumus" aura={null} premiumCerceve={null} premiumAura={null} sezonBp={false} /><span>{tt("Deniz")}</span></div>
        </div>
        <h2 className="dop-dev dop-dev--el">{tt("KONTROL EL DEĞİŞTİRDİ")}</h2>
        <p className="dop-alt-yazi">{yeni === "ben" ? tt("Kontrol artık sende.") : tt("Kontrol artık {ad}'de.", { ad: tt("Deniz") })}</p>
        <div className="dop-seri-degisim dop-seri-degisim--orta">
          <span>{yeni === "ben" ? tt("Yeni seri") : tt("{ad} yeni seri", { ad: tt("Deniz") })}</span>
          <SeriYolu deger={1} taraf={yeni === "ben" ? "sen" : "rakip"} yeni />
        </div>
      </div>
      <Alt><Kirmizi ikon="ileri" onClick={ileri}>{tt("Devam")}</Kirmizi></Alt>
    </>
  );
}

// 11 — Son Düello: 15 turda kimse 3/3 yapamadı; aynı soru, jokersiz
function EkSon() {
  const [c, setC] = useState(2);
  return (
    <>
      <Ust kontrol={null} seri={0} tur={TUR_MAX} son />
      <div className="dop-govde">
        <div className="dop-son-baslik">
          <h2>{tt("SON DÜELLO")}</h2>
          <p className="dop-alt-yazi">{tt("15 turda kimse 3/3 yapamadı.")}</p>
        </div>
        <ul className="dop-cipler">
          <li><QtIkon ad="soru" boyut={16} />{tt("Aynı soru")}</li>
          <li><QtIkon ad="kilit" boyut={16} />{tt("Joker yok")}</li>
          <li><QtIkon ad="hedef" boyut={16} />{tt("Tek başına doğru bilen kazanır")}</li>
        </ul>
        <Zaman toplam={15} etiket={tt("Süre")} />
        <div className="dop-soru-kap">
          <h2 className="dop-soru">{tt("Dünyanın en uzun nehri hangisidir?")}</h2>
        </div>
        <div className="dop-sikler">
          {["Amazon", "Nil", "Yangtze", "Mississippi"].map((s, i) => <Sik key={s} i={i} yazi={s} secili={c === i} onClick={() => setC(i)} />)}
        </div>
        <div className="dop-durumlar">
          <span className="dop-durum dop-durum--sen"><i />{tt("Sen cevaplıyorsun")}</span>
          <span className="dop-durum dop-durum--rakip"><i />{tt("Deniz cevaplıyor")}</span>
        </div>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- sayfa */
export default function DuelloOnizlemePage() {
  const [adim, setAdim] = useState(1);
  const [rol, setRol] = useState("ben");
  useEffect(() => {
    try { document.title = `Quiz Tactics — ${tt("Düello önizleme")}`; } catch { /* başlık kritik değil */ }
  }, []);
  const ileri = () => setAdim((a) => Math.min(ADIMLAR.length, a + 1));
  const geri = () => setAdim((a) => Math.max(1, a - 1));
  const sabitRol = adim === 3 || adim === 4 || adim === 5;
  const ekran = {
    1: <EkNotr />,
    2: <EkKontrolAni rol={rol} ileri={ileri} />,
    3: <EkSecimA ileri={ileri} />,
    4: <EkSecimB ileri={ileri} />,
    5: <EkBekleyen ileri={ileri} />,
    6: <EkSoru rol={rol} />,
    7: <EkSonuc rol={rol} ileri={ileri} />,
    8: <EkSeri rol={rol} ileri={ileri} />,
    9: <EkKazanildi rol={rol} ileri={ileri} />,
    10: <EkEl rol={rol} ileri={ileri} />,
    11: <EkSon />,
  }[adim];
  return (
    <div className="qt-sayfa dop-sayfa">
      <main className="qt-sayfa-ic dop-ic">
        <div className="dop-arac">
          <div className="dop-arac-ust">
            <QtDugme tur="ikincil" boyut="k" ikon="geri" onClick={geri} devreDisi={adim === 1} aria-label={tt("Önceki ekran")} className="dop-gezin" />
            <div className="dop-arac-baslik">
              <small>{tt("Düello önizleme")} · {adim}/{ADIMLAR.length}</small>
              <b>{tt(ADIMLAR[adim - 1].ad)}</b>
            </div>
            <QtDugme tur="ikincil" boyut="k" ikon="ileri" onClick={ileri} devreDisi={adim === ADIMLAR.length} aria-label={tt("Sonraki ekran")} className="dop-gezin" />
          </div>
          <QtSekmeler etiket={tt("Ekranlar")} aktif={String(adim)} onSec={(k) => setAdim(Number(k))}
            sekmeler={ADIMLAR.map((_, i) => ({ kod: String(i + 1), ad: String(i + 1) }))} />
          <QtSekmeler etiket={tt("Kontrol sahibi")} aktif={rol} onSec={setRol} className="dop-rol"
            sekmeler={[{ kod: "ben", ad: tt("Ben kontrol sahibiyim") }, { kod: "rakip", ad: tt("Rakip kontrol sahibi") }]} />
          {sabitRol && <p className="dop-not dop-ort">{tt("Bu ekranın bakış açısı sabit; kontrol anahtarı etkilemez.")}</p>}
        </div>
        <section className="dop-sahne" aria-label={tt(ADIMLAR[adim - 1].ad)}>
          <div key={adim} className="dop-sahne-ic">{ekran}</div>
        </section>
      </main>
    </div>
  );
}
