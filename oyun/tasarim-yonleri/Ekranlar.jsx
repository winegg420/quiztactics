// Tasarım Yönleri — iki örnek ekran (Ana sayfa · Maç), sahte veriyle.
// Sunucuya bağlanmaz; oyun mantığı içermez. Yalnız görünüm ve dokunulabilir
// hareket örnekleri içindir. Üç yön aynı yapıyı kullanır, görünüm CSS'ten gelir.
import { useCallback, useEffect, useRef, useState } from "react";
import Ikon, { QIsareti } from "./ikonlar.jsx";

const OYUNCU = {
  ad: "Deniz",
  seviye: 23,
  xp: 68, // yüzde
  rutbe: "Altın III",
  coin: "12.450",
  seri: 6,
  avatar: "/avatars/pro/tilki-k04.svg",
};
const RAKIP = { ad: "Mert", avatar: "/avatars/pro/baykus-k03.svg" };

const MODLAR = [
  { kod: "klasik", ad: "Klasik", alt: "1'e 1 · 10 soru", ikon: "klasik" },
  { kod: "duello", ad: "Düello", alt: "Can savaşı · skill'li", ikon: "duello" },
  { kod: "turnuva", ad: "Turnuva", alt: "Sıradaki 20:00", ikon: "turnuva" },
  { kod: "grup", ad: "Grup", alt: "3-5 kişi · davetle", ikon: "grup" },
];

const MENU = [
  { kod: "ana", ad: "Ana Sayfa", ikon: "ev" },
  { kod: "arkadas", ad: "Arkadaşlar", ikon: "arkadas" },
  { kod: "lig", ad: "Lig", ikon: "lig" },
  { kod: "dukkan", ad: "Dükkân", ikon: "dukkan" },
  { kod: "profil", ad: "Profil", ikon: "profil" },
];

export const SKILLER = [
  { kod: "yariyari", ad: "50:50", kisa: "50:50", aciklama: "İki yanlış şık kırılıp düştü." },
  { kod: "eksure", ad: "Ek Süre", kisa: "+10 sn", aciklama: "Sayaca 10 saniye eklendi." },
  { kod: "degistir", ad: "Soru Değiştir", kisa: "Değiştir", aciklama: "Yeni soru geldi." },
  { kod: "baski", ad: "Zaman Baskısı", kisa: "Baskı", aciklama: "Rakibin süresi 5 saniye kısaldı." },
  { kod: "sigorta", ad: "Sigorta", kisa: "Sigorta", aciklama: "Yanlış cevapta canın korunacak." },
  { kod: "ikikat", ad: "2X", kisa: "2 Kat", aciklama: "Bu sorudan iki kat puan." },
  { kod: "ikincisans", ad: "İkinci Şans", kisa: "2. Şans", aciklama: "Yanılırsan bir hakkın daha var." },
];

const SORULAR = [
  { kategori: "Bilim", metin: "Güneş'e en yakın gezegen hangisidir?", siklar: ["Venüs", "Merkür", "Mars", "Dünya"], dogru: 1 },
  { kategori: "Coğrafya", metin: "Türkiye'nin en yüksek dağı hangisidir?", siklar: ["Erciyes", "Uludağ", "Ağrı Dağı", "Süphan Dağı"], dogru: 2 },
];
const HARFLER = ["A", "B", "C", "D"];
const SURE_UST = 20;
const BASLANGIC_SURE = 14;

function Kalpler({ dolu, toplam = 3, etiket }) {
  return (
    <span className="ty-kalpler" role="img" aria-label={`${etiket}: ${dolu} / ${toplam} can`}>
      {Array.from({ length: toplam }, (_, i) => (
        <span key={i} className={`ty-kalp ${i < dolu ? "dolu" : "bos"}`}>
          <Ikon ad="kalp" boyut={16} />
        </span>
      ))}
    </span>
  );
}

// ——————————————————— ANA SAYFA ———————————————————
export function AnaEkran() {
  const [aktifMenu, setAktifMenu] = useState("ana");
  const [secilenMod, setSecilenMod] = useState(null);

  return (
    <div className="ty-ekran ty-ana">
      <header className="ty-ust">
        <div className="ty-marka" aria-label="Quiz Tactics">
          <QIsareti boyut={34} />
          <span className="ty-marka-yazi">QUIZ TACTICS</span>
        </div>
        <div className="ty-ust-sag">
          <span className="ty-coin-hap" aria-label={`${OYUNCU.coin} coin`}>
            <Ikon ad="coin" boyut={20} />
            <b>{OYUNCU.coin}</b>
          </span>
          <button type="button" className="ty-ikon-dugme" aria-label="Bildirimler (2 yeni)">
            <Ikon ad="zil" boyut={22} />
            <span className="ty-rozet-nokta" aria-hidden="true">2</span>
          </button>
        </div>
      </header>

      <section className="ty-oyuncu-kart" aria-label="Oyuncu kartı">
        <div className="ty-avatar-cerceve">
          <img src={OYUNCU.avatar} alt="" width="64" height="64" />
          <span className="ty-seviye" aria-label={`Seviye ${OYUNCU.seviye}`}>{OYUNCU.seviye}</span>
        </div>
        <div className="ty-oyuncu-bilgi">
          <div className="ty-oyuncu-ad">Merhaba, {OYUNCU.ad}</div>
          <div className="ty-oyuncu-satir">
            <span className="ty-rutbe"><Ikon ad="yildiz" boyut={16} /> {OYUNCU.rutbe}</span>
            <span className="ty-seri"><Ikon ad="ates" boyut={16} /> {OYUNCU.seri} gün seri</span>
          </div>
          <div className="ty-xp" role="progressbar" aria-label="Seviye ilerlemesi" aria-valuemin={0} aria-valuemax={100} aria-valuenow={OYUNCU.xp}>
            <span style={{ width: `${OYUNCU.xp}%` }} />
          </div>
          <div className="ty-xp-yazi">Seviye {OYUNCU.seviye + 1} için 320 XP</div>
        </div>
      </section>

      <h3 className="ty-bolum-baslik">Oyna</h3>
      <div className="ty-modlar">
        {MODLAR.map((m, i) => (
          <button
            key={m.kod}
            type="button"
            className={`ty-mod ty-mod-${i + 1} ${secilenMod === m.kod ? "secili" : ""}`}
            onClick={() => setSecilenMod(m.kod)}
            aria-pressed={secilenMod === m.kod}
          >
            <span className="ty-mod-ikon"><Ikon ad={m.ikon} boyut={30} /></span>
            <span className="ty-mod-ad">{m.ad}</span>
            <span className="ty-mod-alt">{m.alt}</span>
          </button>
        ))}
      </div>

      <section className="ty-lig" aria-label="Lig durumu">
        <div className="ty-lig-sol">
          <span className="ty-lig-arma"><Ikon ad="lig" boyut={26} /></span>
          <div>
            <div className="ty-lig-ad">Altın Lig · 4. sıra</div>
            <div className="ty-lig-alt">Yükselme hattına 40 puan · 2g 14s kaldı</div>
          </div>
        </div>
        <div className="ty-lig-cubuk" aria-hidden="true">
          <span className="ty-lig-dolu" style={{ width: "72%" }} />
          <span className="ty-lig-hat" style={{ left: "84%" }} />
        </div>
      </section>

      <nav className="ty-menu" aria-label="Alt menü (örnek)">
        {MENU.map((m) => (
          <button
            key={m.kod}
            type="button"
            className={`ty-menu-oge ${aktifMenu === m.kod ? "aktif" : ""}`}
            onClick={() => setAktifMenu(m.kod)}
            aria-current={aktifMenu === m.kod ? "page" : undefined}
          >
            <span className="ty-menu-ikon"><Ikon ad={m.ikon} boyut={24} /></span>
            <span className="ty-menu-ad">{m.ad}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

// ——————————————————— MAÇ EKRANI ———————————————————
function ilkDurum() {
  return {
    soruNo: 0,
    secim: null,
    sonuc: null, // "dogru" | "yanlis" | "sure"
    denenen: [], // İkinci Şans ile elenen yanlış denemeler
    kirilan: [],
    elenen: [],
    sure: BASLANGIC_SURE,
    geri: false, // son 5 saniye geri sayımı çalışıyor mu
    skorSen: 3,
    skorRakip: 2,
    canSen: 3,
    canRakip: 2,
    kullanilan: {},
    bilgi: null, // { metin, anahtar }
    ekSure: 0, // "+10" balonunun anahtarı
    degisiyor: false,
    baski: 0,
  };
}

export function MacEkrani() {
  const [d, setD] = useState(ilkDurum);
  const zamanlayicilar = useRef([]);

  const sonra = useCallback((ms, fn) => {
    const id = window.setTimeout(fn, ms);
    zamanlayicilar.current.push(id);
  }, []);

  useEffect(() => () => zamanlayicilar.current.forEach((id) => window.clearTimeout(id)), []);

  const sifirla = useCallback(() => {
    zamanlayicilar.current.forEach((id) => window.clearTimeout(id));
    zamanlayicilar.current = [];
    setD(ilkDurum());
  }, []);

  // Son 5 saniye geri sayımı
  useEffect(() => {
    if (!d.geri) return undefined;
    const id = window.setInterval(() => {
      setD((o) => {
        if (!o.geri) return o;
        if (o.sure <= 1) return { ...o, sure: 0, geri: false, sonuc: o.sonuc ?? "sure" };
        return { ...o, sure: o.sure - 1 };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [d.geri]);

  // Sonuç sonrası kendiliğinden yeniden kur (demo tekrar tekrar denenebilsin)
  useEffect(() => {
    if (!d.sonuc) return undefined;
    const id = window.setTimeout(() => setD(ilkDurum()), 2600);
    return () => window.clearTimeout(id);
  }, [d.sonuc]);

  const soru = SORULAR[d.soruNo];

  const cevapla = (i) => {
    setD((o) => {
      if (o.sonuc || o.elenen.includes(i) || o.denenen.includes(i)) return o;
      const dogru = i === SORULAR[o.soruNo].dogru;
      if (dogru) {
        const puan = o.kullanilan.ikikat ? 2 : 1;
        return { ...o, secim: i, sonuc: "dogru", geri: false, skorSen: o.skorSen + puan };
      }
      if (o.kullanilan.ikincisans && !o.kullanilan.ikincisansHarcandi) {
        return {
          ...o,
          denenen: [...o.denenen, i],
          kullanilan: { ...o.kullanilan, ikincisansHarcandi: true },
          bilgi: { metin: "İkinci Şans: bir hakkın daha var!", anahtar: Date.now() },
        };
      }
      const korundu = o.kullanilan.sigorta;
      return {
        ...o,
        secim: i,
        sonuc: "yanlis",
        geri: false,
        canSen: korundu ? o.canSen : Math.max(0, o.canSen - 1),
        bilgi: korundu ? { metin: "Sigorta canını korudu.", anahtar: Date.now() } : o.bilgi,
      };
    });
  };

  const skillKullan = (s) => {
    if (d.kullanilan[s.kod] || d.sonuc) return;
    const bilgi = { metin: `${s.ad}: ${s.aciklama}`, anahtar: Date.now() };
    if (s.kod === "yariyari") {
      const yanlislar = [0, 1, 2, 3].filter((i) => i !== soru.dogru && !d.denenen.includes(i));
      const kir = [yanlislar[0], yanlislar[yanlislar.length - 1]];
      setD((o) => ({ ...o, kirilan: kir, kullanilan: { ...o.kullanilan, yariyari: true }, bilgi }));
      sonra(760, () => setD((o) => ({ ...o, elenen: o.kirilan, kirilan: [] })));
      return;
    }
    if (s.kod === "eksure") {
      setD((o) => ({ ...o, sure: Math.min(SURE_UST, o.sure + 10), ekSure: Date.now(), kullanilan: { ...o.kullanilan, eksure: true }, bilgi }));
      return;
    }
    if (s.kod === "degistir") {
      setD((o) => ({ ...o, degisiyor: true, kullanilan: { ...o.kullanilan, degistir: true }, bilgi }));
      sonra(200, () =>
        setD((o) => ({ ...o, soruNo: 1 - o.soruNo, secim: null, elenen: [], kirilan: [], denenen: [], degisiyor: false })),
      );
      return;
    }
    if (s.kod === "baski") {
      setD((o) => ({ ...o, baski: Date.now(), kullanilan: { ...o.kullanilan, baski: true }, bilgi }));
      return;
    }
    setD((o) => ({ ...o, kullanilan: { ...o.kullanilan, [s.kod]: true }, bilgi }));
  };

  // Demo düğmeleri
  const dogruOynat = () => {
    if (d.sonuc) return;
    cevapla(soru.dogru);
  };
  const yanlisOynat = () => {
    if (d.sonuc) return;
    const yanlis = [0, 1, 2, 3].find((i) => i !== soru.dogru && !d.elenen.includes(i) && !d.denenen.includes(i));
    if (yanlis != null) cevapla(yanlis);
  };
  const son5 = () => setD((o) => (o.sonuc ? o : { ...o, sure: 5, geri: true }));
  const yariyariOynat = () => skillKullan(SKILLER[0]);

  const gerilim = d.sure <= 5 && !d.sonuc;
  const cevre = 2 * Math.PI * 21;
  const oran = d.sure / SURE_UST;

  return (
    <div className="ty-mac-kap">
      <div className="ty-demo" role="group" aria-label="Hareket örnekleri">
        <span className="ty-demo-baslik">Dokun ve dene:</span>
        <button type="button" className="ty-demo-dugme" onClick={dogruOynat}>Doğru cevap</button>
        <button type="button" className="ty-demo-dugme" onClick={yanlisOynat}>Yanlış cevap</button>
        <button type="button" className="ty-demo-dugme" onClick={son5}>Son 5 saniye</button>
        <button type="button" className="ty-demo-dugme" onClick={yariyariOynat}>50:50 kullan</button>
        <button type="button" className="ty-demo-dugme ty-demo-sifirla" onClick={sifirla} aria-label="Maçı sıfırla">
          <Ikon ad="yenile" boyut={20} /> Sıfırla
        </button>
      </div>

      <div className="ty-telefon">
        <div className={`ty-ekran ty-mac ${gerilim ? "gerilim" : ""} ${d.sonuc ? "sonuc-" + d.sonuc : ""}`}>
          <header className="ty-mac-ust">
            <div className="ty-oyuncu ty-oyuncu-sen">
              <img src={OYUNCU.avatar} alt="" width="44" height="44" />
              <div className="ty-oyuncu-yazi">
                <span className="ty-oyuncu-isim">Sen</span>
                <Kalpler dolu={d.canSen} etiket="Senin canın" />
              </div>
              {(d.kullanilan.sigorta || d.kullanilan.ikikat || d.kullanilan.ikincisans) && (
                <span className="ty-etkiler" aria-label="Aktif skill'ler">
                  {d.kullanilan.sigorta && <span className="ty-etki"><Ikon ad="sigorta" boyut={14} /></span>}
                  {d.kullanilan.ikikat && <span className="ty-etki ty-etki-yazi">2X</span>}
                  {d.kullanilan.ikincisans && !d.kullanilan.ikincisansHarcandi && (
                    <span className="ty-etki"><Ikon ad="ikincisans" boyut={14} /></span>
                  )}
                </span>
              )}
            </div>
            <div className="ty-skor" aria-label={`Skor: sen ${d.skorSen}, rakip ${d.skorRakip}`}>
              <span key={"s" + d.skorSen} className="ty-skor-sen">{d.skorSen}</span>
              <span className="ty-skor-ayrac">:</span>
              <span className="ty-skor-rakip">{d.skorRakip}</span>
            </div>
            <div key={"b" + d.baski} className={`ty-oyuncu ty-oyuncu-rakip ${d.baski ? "baski" : ""}`}>
              <div className="ty-oyuncu-yazi">
                <span className="ty-oyuncu-isim">{RAKIP.ad}</span>
                <Kalpler dolu={d.canRakip} etiket="Rakibin canı" />
              </div>
              <img src={RAKIP.avatar} alt="" width="44" height="44" />
            </div>
          </header>

          <div className="ty-soru-ust">
            <span className="ty-kategori">{soru.kategori}</span>
            <span className="ty-soru-no">Soru 4 / 10</span>
          </div>

          <div className={`ty-soru-kart ${d.degisiyor ? "degisiyor" : ""}`} key={"q" + d.soruNo}>
            <div className="ty-sayac" role="timer" aria-live="off" aria-label={`Kalan süre ${d.sure} saniye`}>
              <svg viewBox="0 0 50 50" aria-hidden="true">
                <circle className="ty-sayac-iz" cx="25" cy="25" r="21" />
                <circle
                  className="ty-sayac-dolu"
                  cx="25"
                  cy="25"
                  r="21"
                  strokeDasharray={cevre}
                  strokeDashoffset={cevre * (1 - oran)}
                />
              </svg>
              <span key={"t" + d.sure} className="ty-sayac-sayi">{d.sure}</span>
              {d.ekSure > 0 && (
                <span key={"e" + d.ekSure} className="ty-ek-balon" aria-hidden="true">+10</span>
              )}
            </div>
            <p className="ty-soru-metin">{soru.metin}</p>
          </div>

          <div className="ty-siklar" role="group" aria-label="Şıklar">
            {soru.siklar.map((sik, i) => {
              const elendi = d.elenen.includes(i);
              const kiriliyor = d.kirilan.includes(i);
              const denendi = d.denenen.includes(i);
              let durum = "";
              if (d.sonuc && i === soru.dogru) durum = d.secim === i ? "dogru" : "dogrusu";
              else if (d.sonuc === "yanlis" && d.secim === i) durum = "yanlis";
              else if (denendi) durum = "yanlis denendi";
              return (
                <div key={d.soruNo + "-" + i} className={`ty-sik-yuva ${elendi ? "elendi" : ""}`}>
                  <button
                    type="button"
                    className={`ty-sik ${durum} ${kiriliyor ? "kiriliyor" : ""}`}
                    onClick={() => cevapla(i)}
                    disabled={elendi || denendi}
                    aria-label={`${HARFLER[i]}: ${sik}${durum.startsWith("dogru") ? " — doğru" : ""}${durum.startsWith("yanlis") ? " — yanlış" : ""}`}
                  >
                    <span className="ty-sik-harf">{HARFLER[i]}</span>
                    <span className="ty-sik-metin">{sik}</span>
                    <span className="ty-sik-isaret" aria-hidden="true">
                      {durum.startsWith("dogru") && <Ikon ad="tik" boyut={22} />}
                      {durum.startsWith("yanlis") && <Ikon ad="carpi" boyut={22} />}
                    </span>
                  </button>
                  {kiriliyor && (
                    <span className="ty-kirik" aria-hidden="true">
                      <span className="ty-kirik-sol"><span className="ty-sik-harf">{HARFLER[i]}</span>{sik}</span>
                      <span className="ty-kirik-sag"><span className="ty-sik-harf">{HARFLER[i]}</span>{sik}</span>
                    </span>
                  )}
                  {elendi && <span className="ty-elendi-yazi" aria-hidden="true">Elendi</span>}
                </div>
              );
            })}
          </div>

          <div className="ty-bilgi-yuva" aria-live="polite">
            {d.sonuc === "dogru" && <div key="d" className="ty-bilgi ty-bilgi-dogru">Doğru! +{d.kullanilan.ikikat ? 2 : 1} puan</div>}
            {d.sonuc === "yanlis" && <div key="y" className="ty-bilgi ty-bilgi-yanlis">Yanlış — doğrusu {soru.siklar[soru.dogru]}</div>}
            {d.sonuc === "sure" && <div key="s" className="ty-bilgi ty-bilgi-yanlis">Süre doldu</div>}
            {!d.sonuc && d.bilgi && <div key={d.bilgi.anahtar} className="ty-bilgi">{d.bilgi.metin}</div>}
          </div>

          <div className="ty-skiller" role="group" aria-label="Skill'ler">
            {SKILLER.map((s) => {
              const kullanildi = Boolean(d.kullanilan[s.kod]);
              return (
                <button
                  key={s.kod}
                  type="button"
                  className={`ty-skill ${kullanildi ? "kullanildi" : ""}`}
                  onClick={() => skillKullan(s)}
                  aria-label={`${s.ad}${kullanildi ? " (kullanıldı)" : ""}`}
                  aria-disabled={kullanildi}
                  title={s.ad}
                >
                  <Ikon ad={s.kod} boyut={22} />
                  <span className="ty-skill-ad">{s.kisa}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
