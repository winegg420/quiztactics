// ============================================================
// EKRAN REVİZYONU ÖNİZLEMESİ — /ekran-revizyon-onizleme (yalnız sahip; SahipKapisi). 10 Eki 2026, Aşama 1.
// Üç zayıf ekranın (Hatalarım · Profil üst bloğu · boş durumlar) "Şu anki" hâli + A/B varyantı, 390 px telefon
// çerçevesinde, TAKLİT veriyle. Sunucuya hiçbir çağrı yapmaz; canlı ekranların hiçbiri bu dosyayı kullanmaz.
// Seçilen varyant Aşama 2'de ilgili sayfaya taşınır (er-* sınıfları o zaman sayfanın kendi CSS'ine geçer).
// ============================================================
import { useState } from "react";
import KategoriIkon from "../components/KategoriIkon.jsx";
import OyuncuVitrinKarti from "../components/OyuncuVitrinKarti.jsx";
import LevelCubugu from "../components/LevelCubugu.jsx";
import { kategoriEtiket } from "../lib/kategoriler.js";
import { aktifDil, dilKaydet, sozlukYukle, tt } from "../lib/dil.js";
import {
  QtAfis, QtAnahtar, QtAvatar, QtBosDurum, QtCip, QtDugme, QtIkon, QtIlerleme, QtKart, QtLigRozeti, QtListe,
  QtListeSatiri, QtRozet, QtSekmeler, sayiBicim, sinif,
} from "../tasarim/index.js";
import "../tasarim/ekranlar/ikon-disk.css";
import "../tasarim/ekranlar/m1-calisma.css";
import "../tasarim/ekranlar/dukkan-profil.css";
import "../tasarim/ekranlar/g-sayfalar.css";
import "../tasarim/ekranlar/l-kart.css";
import "../tasarim/ekranlar/ekran-revizyon-onizleme.css";

// ---------- Taklit veri ----------
// Hatalarım: yanlis_bankam() gerçekte YALNIZ bunları döner → toplam · ogrenilen · bekleyen · kategori başına adet.
// "Bu hafta düzelttiğin" alanı sunucuda YOK (ogrenildi_at var ama RPC haftalık saymıyor) → uydurulmadı.
const BANKA = {
  toplam: 31, ogrenilen: 7, bekleyen: 24,
  kategoriler: [
    { kategori: "tarih", kategori_adet: 9 }, { kategori: "bilim", kategori_adet: 6 }, { kategori: "cografya", kategori_adet: 5 },
    { kategori: "spor", kategori_adet: 3 }, { kategori: "sanat", kategori_adet: 1 },
  ],
};
const BANKA_BOS = { toplam: 7, ogrenilen: 7, bekleyen: 0, kategoriler: [] };
const SORU_SECENEKLERI = [10, 20, 30];

const AVATAR = "/avatars/pro/ayi-k08.svg";
const PROFIL = { id: "onizleme-ben", gorunen_ad: "Deniz", gorunen_avatar: AVATAR, level: 23, level_xp: 640, level_gereken: 1000, puan: 12450, sampiyonluk: 2, seri: 5 };
const KART = { id: "onizleme-ben", ad: "Deniz", avatar: AVATAR, lig: "altin", level: 23, unvan: null, koleksiyon_puani: 340, vitrin: [] };

// ---------- Telefon çerçevesi ----------
function Telefon({ etiket, not, uzun = false, children }) {
  return (
    <figure className="er-tel">
      <figcaption className="er-tel-etiket"><b>{etiket}</b>{not && <span>{not}</span>}</figcaption>
      <div className={sinif("er-tel-ekran", uzun && "er-tel-ekran--uzun")}>{children}</div>
    </figure>
  );
}

function Secici({ etiket, secenekler, deger, onSec }) {
  return (
    <div className="er-secici" role="group" aria-label={etiket}>
      <span className="er-secici-ad">{etiket}</span>
      {secenekler.map(([k, ad]) => (
        <QtCip key={k} secili={deger === k} onClick={() => onSec(k)}>{ad}</QtCip>
      ))}
    </div>
  );
}

// ============================================================ 1. HATALARIM
function HatSoruSayisi() {
  const [n, setN] = useState(10);
  return (
    <section className="m1-cal-bolum">
      <h2 className="qt-baslik-3 qt-plaka">{tt("Soru sayısı")}</h2>
      <div className="m1-cal-adetler" role="group">
        {SORU_SECENEKLERI.map((s) => <QtCip key={s} secili={n === s} onClick={() => setN(s)}>{s}</QtCip>)}
      </div>
    </section>
  );
}

/** Şu anki hâl: CalismaPage.jsx › seçim ekranının taklit veriyle aynısı */
function HatalarimSuAnki({ bos }) {
  const b = bos ? BANKA_BOS : BANKA;
  return (
    <div className="m1-cal">
      <header className="m1-cal-baslik">
        <h1 className="qt-baslik-1">{tt("Hatalarım")}</h1>
        <p className="qt-soluk-zemin">{tt("Yanlış yaptığın soruları tekrar et, açığını kapat.")}</p>
      </header>
      {bos ? (
        <QtKart className="m1-cal-bos">
          <span className="qt-ikon-disk qt-ikon-disk--turuncu" aria-hidden="true"><QtIkon ad="kitap" boyut={34} /></span>
          <p>{tt("Henüz yanlışın yok — maç yaptıkça burada birikecek.")}<br />{tt("Yine de genel havuzdan çalışabilirsin.")}</p>
        </QtKart>
      ) : (
        <QtKart className="m1-cal-ozet">
          <div className="m1-cal-sayilar">
            <div className="m1-cal-sayi m1-cal-sayi--bekleyen"><b className="qt-sayi">{b.bekleyen}</b><span>{tt("soru bankanda")}</span></div>
            <div className="m1-cal-sayi m1-cal-sayi--ogrenilen"><b className="qt-sayi">{b.ogrenilen}</b><span>{tt("öğrenildi")}</span></div>
          </div>
        </QtKart>
      )}
      <section className="m1-cal-bolum">
        <h2 className="qt-baslik-3 qt-plaka">{tt("Kategori")}</h2>
        <div className="m1-cal-serit">
          <QtCip secili><span className="m1-cal-cip"><KategoriIkon anahtar="karisik" boyut={18} />{tt("Tümü")}</span></QtCip>
          {b.kategoriler.map((k) => (
            <QtCip key={k.kategori}><span className="m1-cal-cip"><KategoriIkon anahtar={k.kategori} boyut={18} />{kategoriEtiket(k.kategori)}</span></QtCip>
          ))}
        </div>
      </section>
      <HatSoruSayisi />
      <QtDugme tamGenislik boyut="b" ikon="kitap">{bos ? tt("Pratik turuna başla") : tt("Çalışmaya başla")}</QtDugme>
    </div>
  );
}

/** Afiş: kitap ikonu + başlık + sağda bekleyen soru sayısı; şeritte gerçek ilerleme (öğrenilen / toplam). */
function HatAfis({ b }) {
  return (
    <QtAfis
      ikon="kitap"
      ton="vurgu"
      baslik={tt("Hatalarım")}
      sag={b.bekleyen > 0 ? (
        <span className="er-afis-sayi" aria-label={tt("{n} soru bankanda", { n: b.bekleyen })}>
          <b className="qt-sayi">{b.bekleyen}</b><small>{tt("soru")}</small>
        </span>
      ) : <QtRozet ton="dogru" ikon="onay" boyut="k">{tt("Temiz")}</QtRozet>}
    >
      {b.bekleyen > 0
        ? tt("{o}/{t} soruyu öğrendin — iki kez doğru bil, bankadan çıksın.", { o: b.ogrenilen, t: b.toplam })
        : tt("Bankan temiz — {o} soruyu öğrendin.", { o: b.ogrenilen })}
    </QtAfis>
  );
}

function HatBos({ tarz }) {
  return (
    <QtKart>
      <QtBosDurum
        gorsel="hatalarim"
        gorselTarz={tarz}
        baslik={tt("Hatalı sorun yok")}
        metin={tt("Yanlış yaptığın sorular burada birikir.")}
        eylem={<QtDugme ikon="kitap">{tt("Pratik turuna başla")}</QtDugme>}
      />
    </QtKart>
  );
}

/** A: afiş + kategori KART ızgarası (her kartta bekleyen sayı) */
function HatalarimA({ bos }) {
  const b = bos ? BANKA_BOS : BANKA;
  const [kat, setKat] = useState(null);
  if (bos) return <div className="m1-cal er-cal"><HatAfis b={b} /><HatBos tarz="sahne" /></div>;
  const liste = [{ kategori: null, kategori_adet: b.bekleyen }, ...b.kategoriler];
  return (
    <div className="m1-cal er-cal">
      <HatAfis b={b} />
      <section className="m1-cal-bolum">
        <h2 className="qt-baslik-3 qt-plaka">{tt("Kategori")}</h2>
        <div className="er-kat-izgara" role="group">
          {liste.map((k) => (
            <button key={k.kategori ?? "tumu"} type="button" className="er-kat-kart" aria-pressed={kat === k.kategori} onClick={() => setKat(k.kategori)}>
              <KategoriIkon anahtar={k.kategori ?? "karisik"} boyut={34} plaka />
              <span className="er-kat-ad">{k.kategori ? kategoriEtiket(k.kategori) : tt("Tümü")}</span>
              <b className="qt-sayi er-kat-sayi">{k.kategori_adet}</b>
            </button>
          ))}
        </div>
      </section>
      <HatSoruSayisi />
      <QtDugme tamGenislik boyut="b" ikon="kitap">{tt("Çalışmaya başla")}</QtDugme>
    </div>
  );
}

/** B: afiş + ilerleme kartı (öğrenilen/toplam çubuğu) + sayılı kategori çipleri (sarmalı, kaydırmasız) */
function HatalarimB({ bos }) {
  const b = bos ? BANKA_BOS : BANKA;
  const [kat, setKat] = useState(null);
  if (bos) return <div className="m1-cal er-cal"><HatAfis b={b} /><HatBos tarz="rozet" /></div>;
  return (
    <div className="m1-cal er-cal">
      <HatAfis b={b} />
      <QtKart className="er-cal-ilerleme">
        <div className="er-cal-ilerleme-ust">
          <span><b className="qt-sayi">{b.ogrenilen}</b> {tt("öğrenildi")}</span>
          <span><b className="qt-sayi">{b.bekleyen}</b> {tt("bekliyor")}</span>
        </div>
        <QtIlerleme deger={b.ogrenilen} en={b.toplam} ton="mor" konturlu etiket={tt("Öğrenilen sorular")} />
      </QtKart>
      <section className="m1-cal-bolum">
        <h2 className="qt-baslik-3 qt-plaka">{tt("Kategori")}</h2>
        <div className="er-cip-sarmal" role="group">
          <QtCip secili={kat === null} sayi={b.bekleyen} onClick={() => setKat(null)}>
            <span className="m1-cal-cip"><KategoriIkon anahtar="karisik" boyut={18} />{tt("Tümü")}</span>
          </QtCip>
          {b.kategoriler.map((k) => (
            <QtCip key={k.kategori} secili={kat === k.kategori} sayi={k.kategori_adet} onClick={() => setKat(k.kategori)}>
              <span className="m1-cal-cip"><KategoriIkon anahtar={k.kategori} boyut={18} />{kategoriEtiket(k.kategori)}</span>
            </QtCip>
          ))}
        </div>
      </section>
      <HatSoruSayisi />
      <QtDugme tamGenislik boyut="b" ikon="kitap">{tt("Çalışmaya başla")}</QtDugme>
    </div>
  );
}

// ============================================================ 2. PROFİL
const PF_SEKMELER = () => [
  { kod: "istatistik", ad: <><span className="qt-pf-sek-uzun">{tt("İstatistiklerim")}</span><span className="qt-pf-sek-kisa" aria-hidden="true">{tt("İstatistik")}</span></>, ikon: "grafik" },
  { kod: "ayarlar", ad: tt("Ayarlar"), ikon: "ayar" },
  { kod: "rozet", ad: tt("Rozetler"), ikon: "madalya" },
  { kod: "koleksiyon", ad: tt("Koleksiyon"), ikon: "palet" },
  { kod: "davet", ad: tt("Davet"), ikon: "kisiEkle" },
];

/** Level ödülleri + koleksiyon özeti (taklit; canlıda LevelOdulleri + KoleksiyonDokumu) */
function PfOdulBloklari() {
  return (
    <>
      <div className="er-pf-oduller" aria-label={tt("Sıradaki level ödülleri")}>
        {[[25, "kisi", tt("Avatar")], [28, "yildiz", tt("Skill")], [30, "madalya", tt("Rütbe")]].map(([lv, ik, ad]) => (
          <span key={lv} className="er-pf-odul"><QtIkon ad={ik} boyut={20} /><b>Lv {lv}</b><small>{ad}</small></span>
        ))}
      </div>
      <QtKart className="er-pf-koleksiyon">
        <QtIkon ad="palet" boyut={22} />
        <span><b>{tt("Koleksiyon Puanı")}</b> · <span className="qt-sayi">340</span></span>
        <span className="er-pf-koleksiyon-alt">{tt("12 rozet · 3 unvan")}</span>
      </QtKart>
    </>
  );
}

function PfSayilar() {
  return (
    <ul className="qt-pf-sayilar">
      <li><div className="qt-pf-sayi qt-pf-sayi--mor"><span className="qt-pf-sayi-ikon" aria-hidden="true"><QtIkon ad="lig" boyut={20} /></span><b className="qt-sayi">{sayiBicim(PROFIL.puan)}</b><span>{tt("Toplam puan")}</span></div></li>
      <li><div className="qt-pf-sayi qt-pf-sayi--altin"><span className="qt-pf-sayi-ikon" aria-hidden="true"><QtIkon ad="kupa" boyut={20} /></span><b className="qt-sayi">{PROFIL.sampiyonluk}</b><span>{tt("Şampiyonluk")}</span></div></li>
      <li><div className="qt-pf-sayi qt-pf-sayi--vurgu"><span className="qt-pf-sayi-ikon" aria-hidden="true"><QtIkon ad="ates" boyut={20} /></span><b className="qt-sayi">{PROFIL.seri}</b><span>{tt("Günlük Seri")}</span></div></li>
    </ul>
  );
}

/** Sekme paneli (taklit içerik; kaydırma uzunluğunu göstermek için) */
function PfPanel({ sekme, ustte = null }) {
  return (
    <div role="tabpanel" className="qt-pf-panel">
      {ustte}
      {sekme === "ayarlar" ? (
        <QtKart className="er-pf-ayarlar">
          <QtAnahtar acik etiket={tt("Ses")} />
          <QtAnahtar acik etiket={tt("Müzik")} />
          <QtAnahtar etiket={tt("Bildirimler")} aciklama={tt("Davet ve maç haberleri")} />
          <QtAnahtar acik etiket={tt("Efektler")} />
        </QtKart>
      ) : sekme === "davet" ? (
        <QtKart className="er-pf-davet">
          <QtIkon ad="kisiEkle" boyut={28} />
          <b>{tt("Arkadaşını davet et")}</b>
          <code className="er-pf-kod">DENIZ-4K7Q</code>
          <QtDugme tamGenislik ikon="paylas">{tt("Bağlantıyı paylaş")}</QtDugme>
        </QtKart>
      ) : (
        <QtListe>
          {[["oyunKolu", tt("Maç"), 128], ["kupa", tt("Galibiyet"), 74], ["hedef", tt("Doğru oranı"), "%68"], ["ates", tt("En uzun seri"), 12], ["kitap", tt("Öğrenilen soru"), 7]].map(([ik, ad, d]) => (
            <QtListeSatiri key={ad} ikon={ik} baslik={ad} sag={<b className="qt-sayi">{d}</b>} />
          ))}
        </QtListe>
      )}
    </div>
  );
}

/** Kısa kimlik satırı: doğrudan Ayarlar/Davet'e gelince (ör. /profil?sekme=ayarlar) iki varyantta da üst blok bu */
function PfKisaKimlik({ seviyeCubugu = false }) {
  return (
    <QtKart className="er-pf-kisa">
      <QtAvatar src={AVATAR} ad="Deniz" boyut="m" seviye={PROFIL.level} />
      <span className="er-pf-kisa-metin">
        <b className="er-pf-ad">Deniz</b>
        <span className="er-pf-kisa-alt"><QtLigRozeti lig="altin" boyut="k" /><QtRozet ton="mor" boyut="k">Lv {PROFIL.level}</QtRozet></span>
      </span>
      {seviyeCubugu && <QtIlerleme deger={PROFIL.level_xp} en={PROFIL.level_gereken} ton="mor" etiket={tt("Seviye ilerlemesi")} className="er-pf-kisa-cubuk" />}
    </QtKart>
  );
}

function ProfilSuAnki({ giris }) {
  const [sekme, setSekme] = useState(giris);
  return (
    <div className="qt-pf">
      <section className="qt-pf-kimlik">
        <OyuncuVitrinKarti userId="onizleme-ben" kart={KART} profile={PROFIL} boyut={88} ligSahnesi koleksiyonCipi={false} className="qt-pf-ok" />
        <div className="qt-pf-serit">
          <LevelCubugu profile={PROFIL} levelYok />
          <PfOdulBloklari />
        </div>
      </section>
      <PfSayilar />
      <div className="qt-pf-sekmeler"><QtSekmeler etiket={tt("Profil bölümleri")} sekmeler={PF_SEKMELER()} aktif={sekme} onSec={setSekme} /></div>
      <PfPanel sekme={sekme} />
    </div>
  );
}

/** A: kompakt kimlik kartı (tek satır) → sekmeler ilk ekranda; ödül/vitrin blokları İstatistik sekmesinin başında */
function ProfilA({ giris }) {
  const [sekme, setSekme] = useState(giris);
  const kisa = giris === "ayarlar" || giris === "davet";
  return (
    <div className="qt-pf">
      <PfKisaKimlik seviyeCubugu={!kisa} />
      <div className="qt-pf-sekmeler"><QtSekmeler etiket={tt("Profil bölümleri")} sekmeler={PF_SEKMELER()} aktif={sekme} onSec={setSekme} /></div>
      <PfPanel sekme={sekme} ustte={sekme === "istatistik" ? (
        <section className="er-pf-odul-bolum" aria-label={tt("Ödüllerim")}>
          <h2 className="qt-baslik-3 qt-plaka">{tt("Ödüllerim")}</h2>
          <PfSayilar />
          <PfOdulBloklari />
        </section>
      ) : null} />
    </div>
  );
}

/** B: kimlik kartı aynı; ödül blokları tek satırlık yatay şeride iner; sekmeler yapışkan (transform yok) */
function ProfilB({ giris }) {
  const [sekme, setSekme] = useState(giris);
  const kisa = giris === "ayarlar" || giris === "davet";
  return (
    <div className="qt-pf">
      {kisa ? <PfKisaKimlik /> : (
        <section className="qt-pf-kimlik">
          <OyuncuVitrinKarti userId="onizleme-ben" kart={KART} profile={PROFIL} boyut={88} ligSahnesi koleksiyonCipi={false} className="qt-pf-ok" />
          <div className="qt-pf-serit"><LevelCubugu profile={PROFIL} levelYok /></div>
        </section>
      )}
      {!kisa && (
        <div className="er-pf-serit" aria-label={tt("Ödüllerim")}>
          <span className="er-pf-cip er-pf-cip--mavi"><QtIkon ad="lig" boyut={16} /><b className="qt-sayi">{sayiBicim(PROFIL.puan)}</b></span>
          <span className="er-pf-cip er-pf-cip--altin"><QtIkon ad="kupa" boyut={16} /><b className="qt-sayi">{PROFIL.sampiyonluk}</b></span>
          <span className="er-pf-cip er-pf-cip--turuncu"><QtIkon ad="ates" boyut={16} /><b className="qt-sayi">{PROFIL.seri}</b></span>
          <span className="er-pf-cip"><QtIkon ad="hediye" boyut={16} />{tt("Lv 25: Avatar")}</span>
          <span className="er-pf-cip"><QtIkon ad="palet" boyut={16} /><b className="qt-sayi">340</b></span>
        </div>
      )}
      <div className="qt-pf-sekmeler er-pf-yapiskan"><QtSekmeler etiket={tt("Profil bölümleri")} sekmeler={PF_SEKMELER()} aktif={sekme} onSec={setSekme} /></div>
      <PfPanel sekme={sekme} />
    </div>
  );
}

// ============================================================ 3. BOŞ DURUMLAR
// Şu anki: sayfaların bugünkü QtBosDurum çağrısının aynısı. Yeni: kısa metin (≤ 2 satır) + tek eylem.
const BOSLAR = () => [
  {
    kod: "hatalarim", sayfa: tt("Hatalarım"),
    simdi: <div className="m1-cal-bos"><span className="qt-ikon-disk qt-ikon-disk--turuncu" aria-hidden="true"><QtIkon ad="kitap" boyut={34} /></span><p>{tt("Henüz yanlışın yok — maç yaptıkça burada birikecek.")}<br />{tt("Yine de genel havuzdan çalışabilirsin.")}</p></div>,
    yeni: { gorsel: "hatalarim", baslik: tt("Hatalı sorun yok"), metin: tt("Yanlış yaptığın sorular burada birikir."), eylem: [tt("Pratik turuna başla"), "kitap"] },
  },
  {
    kod: "mesajlar", sayfa: tt("Mesajlar"),
    simdi: <QtBosDurum ikon="sohbet" baslik={tt("Henüz mesajın yok")} metin={tt("Arkadaşlarına ilk mesajı sen at.")} eylem={<QtDugme ikon="kisiler">{tt("Arkadaşlar")}</QtDugme>} />,
    yeni: { gorsel: "mesajlar", baslik: tt("Henüz mesajın yok"), metin: tt("Arkadaşlarına ilk mesajı sen at."), eylem: [tt("Arkadaşlar"), "kisiler"] },
  },
  {
    kod: "bildirimler", sayfa: tt("Bildirimler"),
    simdi: <div className="bz-bos"><span className="bz-bos-ikon" aria-hidden="true"><QtIkon ad="zil" boyut={28} /></span><p className="bz-bos-baslik">{tt("Henüz bildirim yok.")}</p><p>{tt("Maç davetleri, lig hareketleri ve arkadaşlık istekleri burada görünür.")}</p></div>,
    yeni: { gorsel: "bildirimler", baslik: tt("Henüz bildirim yok"), metin: tt("Davetler ve maç haberleri burada çıkar."), eylem: [tt("Maç yap"), "oyna"] },
  },
  {
    kod: "arkadaslar", sayfa: tt("Arkadaşlar"),
    simdi: <QtBosDurum ikon="kisiler" baslik={tt("Henüz arkadaşın yok")} metin={tt("Davet bağlantını paylaş ya da arkadaşının davet koduyla ekle; sonra birlikte maç yapın.")} />,
    yeni: { gorsel: "arkadaslar", baslik: tt("Henüz arkadaşın yok"), metin: tt("Davet bağlantını paylaş, birlikte maç yapın."), eylem: [tt("Arkadaş davet et"), "kisiEkle"] },
  },
  {
    kod: "lig", sayfa: tt("Lig › Arkadaşlar"),
    simdi: <QtBosDurum ikon="kisiler" baslik={tt("Bu ligde şimdilik tek başınasın. Arkadaşlarını davet et.")} eylem={<QtDugme ikon="kisiEkle">{tt("Arkadaş davet et")}</QtDugme>} />,
    yeni: { gorsel: "arkadaslar", baslik: tt("Bu ligde tek başınasın"), metin: tt("Arkadaşlarını çağır, sıralamayı birlikte zorlayın."), eylem: [tt("Arkadaş davet et"), "kisiEkle"] },
  },
  {
    kod: "bulunamadi", sayfa: "404",
    simdi: <QtBosDurum ikon="haritaPini" baslik={tt("Bu sayfa yok.")} metin={tt("Adres yanlış yazılmış ya da sayfa kaldırılmış olabilir.")} eylem={<QtDugme ikon="ev">{tt("Ana sayfaya dön")}</QtDugme>} />,
    yeni: { gorsel: "bulunamadi", baslik: tt("Bu soru kartı kaybolmuş"), metin: tt("Adres yanlış ya da sayfa kaldırılmış."), eylem: [tt("Ana sayfaya dön"), "ev"] },
  },
];

function BosListe({ tarz }) {
  return (
    <div className="er-bos-liste">
      {BOSLAR().map((b) => (
        <section key={b.kod} className="er-bos-oge" aria-label={b.sayfa}>
          <h3 className="er-bos-sayfa">{b.sayfa}</h3>
          <QtKart>
            {tarz ? (
              <QtBosDurum gorsel={b.yeni.gorsel} gorselTarz={tarz} baslik={b.yeni.baslik} metin={b.yeni.metin}
                          eylem={<QtDugme ikon={b.yeni.eylem[1]}>{b.yeni.eylem[0]}</QtDugme>} />
            ) : b.simdi}
          </QtKart>
        </section>
      ))}
    </div>
  );
}

// ============================================================ SAYFA
export default function EkranRevizyonOnizlemePage() {
  const [hatDurum, setHatDurum] = useState("dolu");
  const [pfGiris, setPfGiris] = useState("istatistik");
  const [dilHata, setDilHata] = useState(false);
  const dilSec = async (d) => {
    if (aktifDil() === d) return;
    try {
      await sozlukYukle(d);
      dilKaydet(d);
      window.location.reload();
    } catch (e) {
      console.error("[Bildim] önizleme dili yüklenemedi:", e);
      setDilHata(true);
    }
  };
  const bos = hatDurum === "bos";
  return (
    <div className="er-sayfa">
      <header className="er-ust">
        <h1 className="qt-baslik-1">{tt("Ekran revizyonu — önizleme")}</h1>
        <p>{tt("Taklit veriyle; canlı ekranlar değişmedi. Her bölümde Şu anki · A · B.")}</p>
        <div className="er-dil" role="group" aria-label={tt("Dil")}>
          {["tr", "en"].map((d) => (
            <QtCip key={d} secili={aktifDil() === d} onClick={() => dilSec(d)}>{d.toUpperCase()}</QtCip>
          ))}
        </div>
        {dilHata && <p className="er-hata" role="alert">{tt("Dil yüklenemedi; bağlantını kontrol et.")}</p>}
      </header>

      <section className="er-bolum" id="hatalarim" aria-labelledby="er-b1">
        <h2 id="er-b1" className="er-bolum-baslik">1 · {tt("Hatalarım")}</h2>
        <Secici etiket={tt("Hâl")} secenekler={[["dolu", tt("Dolu")], ["bos", tt("Boş (hiç hatalı soru yok)")]]} deger={hatDurum} onSec={setHatDurum} />
        <div className="er-teller">
          <Telefon etiket={tt("Şu anki")}><HatalarimSuAnki bos={bos} /></Telefon>
          <Telefon etiket="A" not={tt("Afiş + kategori kartları")}><HatalarimA bos={bos} /></Telefon>
          <Telefon etiket="B" not={tt("Afiş + ilerleme çubuğu + sayılı çipler")}><HatalarimB bos={bos} /></Telefon>
        </div>
      </section>

      <section className="er-bolum" id="profil" aria-labelledby="er-b2">
        <h2 id="er-b2" className="er-bolum-baslik">2 · {tt("Profil üst bloğu")}</h2>
        <Secici etiket={tt("Gelen sekme")} secenekler={[["istatistik", tt("İstatistik")], ["ayarlar", tt("Ayarlar")], ["davet", tt("Davet")]]} deger={pfGiris} onSec={setPfGiris} />
        <div className="er-teller" key={pfGiris}>
          <Telefon etiket={tt("Şu anki")}><ProfilSuAnki giris={pfGiris} /></Telefon>
          <Telefon etiket="A" not={tt("Kompakt kimlik, ödüller sekmede")}><ProfilA giris={pfGiris} /></Telefon>
          <Telefon etiket="B" not={tt("Ödül şeridi + yapışkan sekmeler")}><ProfilB giris={pfGiris} /></Telefon>
        </div>
      </section>

      <section className="er-bolum" id="bos" aria-labelledby="er-b3">
        <h2 id="er-b3" className="er-bolum-baslik">3 · {tt("Boş durumlar")}</h2>
        <div className="er-teller">
          <Telefon etiket={tt("Şu anki")} uzun><BosListe /></Telefon>
          <Telefon etiket="A" not={tt("Küçük sahne görseli")} uzun><BosListe tarz="sahne" /></Telefon>
          <Telefon etiket="B" not={tt("Büyük ikon rozeti")} uzun><BosListe tarz="rozet" /></Telefon>
        </div>
      </section>
    </div>
  );
}
