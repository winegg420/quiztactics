// /duello-tahta-onizleme — yalnız tasarım prototipi.
// Production Düello, RPC, Supabase ve soru akışıyla bağlantısı yoktur.
import { useEffect, useMemo, useState } from "react";
import KategoriIkon from "../../components/KategoriIkon.jsx";
import { QtIkon } from "../index.js";
import { tt } from "../../lib/dil.js";
import { muzikAcikMi, muzikAyarla, sesAcikMi, sesAyarla } from "../../lib/ses.js";
import "./duello-tahta-onizleme.css";

const KATEGORILER = [
  { kod: "spor", ad: "Spor", puan: 6, ben: 52, rakip: 81, katman: "guclu" },
  { kod: "bilim", ad: "Bilim", puan: 6, ben: 63, rakip: 76, katman: "guclu" },
  { kod: "tarih", ad: "Tarih", puan: 6, ben: 44, rakip: 72, katman: "guclu" },
  { kod: "cografya", ad: "Coğrafya", puan: 3, ben: 61, rakip: 58, katman: "orta" },
  { kod: "sinema", ad: "Sinema", puan: 3, ben: 68, rakip: 55, katman: "orta" },
  { kod: "muzik", ad: "Müzik", puan: 3, ben: 57, rakip: 53, katman: "orta" },
  { kod: "sanat", ad: "Sanat", puan: 3, ben: 49, rakip: 51, katman: "orta" },
  { kod: "teknoloji", ad: "Teknoloji", puan: 1, ben: 74, rakip: 39, katman: "zayif" },
  { kod: "edebiyat", ad: "Edebiyat", puan: 1, ben: 66, rakip: 34, katman: "zayif" },
  { kod: "genel_kultur", ad: "Genel Kültür", puan: 1, ben: 71, rakip: 31, katman: "zayif" },
];

const DURUMLAR = {
  baslangic: { kisa: "Başlangıç", skor: [0, 0], sahip: {} },
  orta: { kisa: "Orta maç", skor: [42, 36], sahip: { bilim: "ben", cografya: "ben", sinema: "ben", spor: "rakip", tarih: "rakip" } },
  kritik: { kisa: "Kritik", skor: [78, 76], sahip: { bilim: "ben", cografya: "ben", sinema: "ben", teknoloji: "ben", spor: "rakip", tarih: "rakip", muzik: "rakip", sanat: "rakip" } },
};

const KATMANLAR = [
  { kod: "guclu", ad: "Rakibin güçlü alanları", kisa: "Güçlü", puan: 6 },
  { kod: "orta", ad: "Orta alanlar", kisa: "Orta", puan: 3 },
  { kod: "zayif", ad: "Rakibin zayıf alanları", kisa: "Zayıf", puan: 1 },
];

const sahiplik = (kod, durum) => durum.sahip[kod] ?? "bos";
const sahipAdi = (sahip) => sahip === "ben" ? tt("Sende") : sahip === "rakip" ? tt("Rakipte") : tt("Boş");
const sayilar = (durum) => ({ ben: Object.values(durum.sahip).filter((v) => v === "ben").length, rakip: Object.values(durum.sahip).filter((v) => v === "rakip").length });

function MacHud({ durum }) {
  const sayi = sayilar(durum);
  return <section className="dto3-hud" aria-label={tt("Örnek maç durumu")}>
    <div className="dto3-hud-oyuncu dto3-hud-oyuncu--ben"><span>{tt("SEN")}</span><b>{sayi.ben}<small>/5</small></b><i style={{ "--dto3-doluluk": `${sayi.ben * 20}%` }} /></div>
    <div className="dto3-hud-skor"><small>{tt("SKOR")}</small><b>{durum.skor[0]}<i>–</i>{durum.skor[1]}</b><span>{tt("5 kategori kazanır")}</span></div>
    <div className="dto3-hud-oyuncu dto3-hud-oyuncu--rakip"><span>{tt("RAKİP")}</span><b>{sayi.rakip}<small>/5</small></b><i style={{ "--dto3-doluluk": `${sayi.rakip * 20}%` }} /></div>
  </section>;
}

function Avantaj({ kategori }) {
  const fark = kategori.ben - kategori.rakip;
  const taraf = fark > 0 ? "ben" : fark < 0 ? "rakip" : "denk";
  return <span className={`dto3-avantaj dto3-avantaj--${taraf}`} aria-label={fark > 0 ? tt("Sen {fark} puan öndesin", { fark: Math.abs(fark) }) : fark < 0 ? tt("Rakip {fark} puan önde", { fark: Math.abs(fark) }) : tt("Denk")}>
    <i />{Math.abs(fark)}
  </span>;
}

function KategoriIcerigi({ kategori, sahip, dar = false }) {
  return <>
    <span className="dto3-kat-ikon"><KategoriIkon anahtar={kategori.kod} boyut={dar ? 19 : 22} plaka /></span>
    <strong>{tt(kategori.ad)}</strong>
    <span className="dto3-sahip"><i />{sahipAdi(sahip)}</span>
    <span className="dto3-oran"><i><b>S</b> %{kategori.ben}</i><em>·</em><i><b>R</b> %{kategori.rakip}</i></span>
    <Avantaj kategori={kategori} />
  </>;
}

function Hucre({ kategori, durum, secili, onSec, sinif = "", dar = false }) {
  const sahip = sahiplik(kategori.kod, durum);
  return <button type="button" className={`dto3-hucre dto3-hucre--${sahip} ${sinif}${secili === kategori.kod ? " dto3-secili" : ""}`}
    aria-label={`${tt(kategori.ad)} · +${kategori.puan} · ${sahipAdi(sahip)} · ${tt("Sen %{ben}, Rakip %{rakip}", { ben: kategori.ben, rakip: kategori.rakip })}`}
    aria-pressed={secili === kategori.kod} onClick={() => onSec(kategori.kod)}>
    <KategoriIcerigi kategori={kategori} sahip={sahip} dar={dar} />
  </button>;
}

function KatmanRozeti({ katman, kisa = false }) {
  return <div className="dto3-katman-rozeti"><span>{tt(kisa ? katman.kisa : katman.ad)}</span><b>+{katman.puan}<small>/−{katman.puan}</small></b></div>;
}

function TahtaS1({ durum, secili, onSec }) {
  return <section className="dto3-tahta dto3-s1" aria-label={tt("S1 — Birbirine Geçen Tahta")}>
    <div className="dto3-s1-kabuk">
      <div className="dto3-s1-omurga" aria-hidden="true"><i /><i /><i /></div>
      {KATMANLAR.map((katman) => {
        const liste = KATEGORILER.filter((k) => k.katman === katman.kod);
        return <section className={`dto3-s1-kat dto3-s1-kat--${katman.kod}`} key={katman.kod}>
          <KatmanRozeti katman={katman} />
          <div className="dto3-s1-gecme" style={{ "--dto3-adet": liste.length }}>
            {liste.map((k) => <Hucre key={k.kod} kategori={k} durum={durum} secili={secili} onSec={onSec} dar sinif="dto3-s1-parca" />)}
          </div>
        </section>;
      })}
    </div>
  </section>;
}

function Cekirdek({ durum }) {
  const sayi = sayilar(durum);
  return <div className="dto3-s2-cekirdek" aria-label={tt("Kontrol çekirdeği")}>
    <span>{tt("KONTROL")}</span>
    <div><b>{sayi.ben}</b><i>5</i><b>{sayi.rakip}</b></div>
    <small>{tt("İLK ULAŞAN")}</small>
  </div>;
}

function TahtaS2({ durum, secili, onSec }) {
  const guclu = KATEGORILER.filter((k) => k.katman === "guclu");
  const orta = KATEGORILER.filter((k) => k.katman === "orta");
  const zayif = KATEGORILER.filter((k) => k.katman === "zayif");
  return <section className="dto3-tahta dto3-s2" aria-label={tt("S2 — Düello Çekirdeği Tahtası")}>
    <div className="dto3-s2-kabuk">
      <div className="dto3-s2-yay dto3-s2-yay--ust"><KatmanRozeti katman={KATMANLAR[0]} kisa />
        <div className="dto3-s2-uc"><i /><i /><i /></div>
      </div>
      <div className="dto3-s2-ust">{guclu.map((k) => <Hucre key={k.kod} kategori={k} durum={durum} secili={secili} onSec={onSec} sinif="dto3-s2-kanat" />)}</div>
      <div className="dto3-s2-orta">
        <div className="dto3-s2-sol">{orta.slice(0, 2).map((k) => <Hucre key={k.kod} kategori={k} durum={durum} secili={secili} onSec={onSec} dar sinif="dto3-s2-kanat" />)}</div>
        <Cekirdek durum={durum} />
        <div className="dto3-s2-sag">{orta.slice(2).map((k) => <Hucre key={k.kod} kategori={k} durum={durum} secili={secili} onSec={onSec} dar sinif="dto3-s2-kanat" />)}</div>
        <div className="dto3-s2-orta-rozet"><KatmanRozeti katman={KATMANLAR[1]} kisa /></div>
      </div>
      <div className="dto3-s2-alt">{zayif.map((k) => <Hucre key={k.kod} kategori={k} durum={durum} secili={secili} onSec={onSec} sinif="dto3-s2-kanat" />)}</div>
      <div className="dto3-s2-yay dto3-s2-yay--alt"><div className="dto3-s2-uc"><i /><i /><i /></div><KatmanRozeti katman={KATMANLAR[2]} kisa /></div>
    </div>
  </section>;
}

function KontrolPipleri({ adet, taraf }) {
  return <span className={`dto3-s2r-pipler dto3-s2r-pipler--${taraf}`} aria-hidden="true">
    {[0, 1, 2, 3, 4].map((i) => <i className={i < adet ? "dolu" : ""} key={i} />)}
  </span>;
}

const S2R_KANALLARI = {
  spor: "M 21.1 27.7 L 31 33.5 L 41.7 41.4",
  bilim: "M 50 27.9 L 50 37.4",
  tarih: "M 78.9 27.9 L 69 33.5 L 58.3 41.4",
  cografya: "M 35.3 40.2 L 39.8 44.3",
  sinema: "M 35.3 59.2 L 39.8 58.1",
  muzik: "M 64.7 40.2 L 60.2 44.3",
  sanat: "M 64.7 59.2 L 60.2 58.1",
  teknoloji: "M 21.1 71.5 L 31 66 L 41.7 61",
  edebiyat: "M 50 71.5 L 50 65",
  genel_kultur: "M 78.9 71.5 L 69 66 L 58.3 61",
};

function KategoriDugumu({ kategori, durum, secili, onSec, yon }) {
  const sahip = sahiplik(kategori.kod, durum);
  return <button type="button" className={`dto3-hucre dto3-hucre--${sahip} dto3-s2r-tas dto3-s2r-tas--${yon}${secili === kategori.kod ? " dto3-secili" : ""}`}
    aria-label={`${tt(kategori.ad)} · +${kategori.puan} · ${sahipAdi(sahip)} · ${tt("Sen %{ben}, Rakip %{rakip}", { ben: kategori.ben, rakip: kategori.rakip })}`}
    aria-pressed={secili === kategori.kod} onClick={() => onSec(kategori.kod)}>
    <span className="dto3-kat-ikon"><KategoriIkon anahtar={kategori.kod} boyut={23} plaka /></span>
    <strong>{tt(kategori.ad)}</strong>
    <span className="dto3-s2r-sahip" aria-label={sahipAdi(sahip)}><i /></span>
    <span className="dto3-s2r-risk">+{kategori.puan}</span>
  </button>;
}

function KontrolKollari({ durum }) {
  return <svg className="dto3-s2r-ag" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    {KATEGORILER.map((kategori, sira) => {
      const sahip = sahiplik(kategori.kod, durum);
      const yol = S2R_KANALLARI[kategori.kod];
      return <g className={`dto3-s2r-kanal dto3-s2r-kanal--${sahip}`} data-kategori={kategori.kod} key={kategori.kod} style={{ "--dto3-kanal-gecikme": `${sira * 18}ms` }}>
        <path className="dto3-s2r-kanal-yuva" d={yol} pathLength="1" />
        <path className="dto3-s2r-kanal-enerji" d={yol} pathLength="1" />
        <circle className="dto3-s2r-kanal-port" cx={yol.split(" ")[1]} cy={yol.split(" ")[2]} r="1.15" />
      </g>;
    })}
  </svg>;
}

function CekirdekR({ durum }) {
  const sayi = sayilar(durum);
  const [gosterilen, setGosterilen] = useState(sayi);
  useEffect(() => {
    if (gosterilen.ben === sayi.ben && gosterilen.rakip === sayi.rakip) return undefined;
    const zaman = window.setTimeout(() => setGosterilen(sayi), 520);
    return () => window.clearTimeout(zaman);
  }, [gosterilen.ben, gosterilen.rakip, sayi.ben, sayi.rakip]);
  const bos = KATEGORILER.length - sayi.ben - sayi.rakip;
  return <div className="dto3-s2r-ring" aria-label={`${tt("Kontrol çekirdeği")}: ${sayi.ben} ${tt("Sende")}, ${sayi.rakip} ${tt("Rakipte")}, ${bos} ${tt("Boş")}`}>
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <circle className="dto3-s2r-ring-notr" cx="50" cy="50" r="45" pathLength="100" />
      <circle className="dto3-s2r-ring-ben" cx="50" cy="50" r="45" pathLength="100" style={{ strokeDasharray: `${sayi.ben * 10} ${100 - sayi.ben * 10}` }} />
      <circle className="dto3-s2r-ring-rakip" cx="50" cy="50" r="45" pathLength="100" style={{ strokeDasharray: `${sayi.rakip * 10} ${100 - sayi.rakip * 10}`, strokeDashoffset: -sayi.ben * 10 }} />
      <circle className="dto3-s2r-ring-ayrac" cx="50" cy="50" r="45" pathLength="100" strokeDasharray="0.75 9.25" />
    </svg>
    <div className="dto3-s2r-cekirdek" key={`${gosterilen.ben}-${gosterilen.rakip}`}>
      <div className="dto3-s2r-sayac dto3-s2r-sayac--ben"><span>{tt("SEN")}</span><b>{gosterilen.ben}<small>/5</small></b><KontrolPipleri adet={gosterilen.ben} taraf="ben" /></div>
      <div className="dto3-s2r-hedef"><small>{tt("İLK")}</small><b>5</b></div>
      <div className="dto3-s2r-sayac dto3-s2r-sayac--rakip"><span>{tt("RAKİP")}</span><b>{gosterilen.rakip}<small>/5</small></b><KontrolPipleri adet={gosterilen.rakip} taraf="rakip" /></div>
    </div>
  </div>;
}

function TahtaS2R({ durum, secili, onSec }) {
  const guclu = KATEGORILER.filter((k) => k.katman === "guclu");
  const orta = KATEGORILER.filter((k) => k.katman === "orta");
  const zayif = KATEGORILER.filter((k) => k.katman === "zayif");
  const sayi = sayilar(durum);
  const kritik = sayi.ben === 4 && sayi.rakip === 4;
  return <section className={`dto3-tahta dto3-s2r${kritik ? " dto3-s2r--kritik" : ""}`} aria-label={tt("S2-R — Rafine Kontrol Arenası")}>
    <div className="dto3-s2r-arena">
      <KontrolKollari durum={durum} />
      <section className="dto3-s2r-kat dto3-s2r-kat--guclu">
        <KatmanRozeti katman={KATMANLAR[0]} />
        <div className="dto3-s2r-uclu">{guclu.map((k) => <KategoriDugumu key={k.kod} kategori={k} durum={durum} secili={secili} onSec={onSec} yon="ust" />)}</div>
      </section>
      <section className="dto3-s2r-orta">
        <div className="dto3-s2r-kanat dto3-s2r-kanat--sol">{orta.slice(0, 2).map((k) => <KategoriDugumu key={k.kod} kategori={k} durum={durum} secili={secili} onSec={onSec} yon="sol" />)}</div>
        <div className="dto3-s2r-merkez"><div className="dto3-s2r-orta-rozet"><KatmanRozeti katman={KATMANLAR[1]} kisa /></div><CekirdekR durum={durum} /></div>
        <div className="dto3-s2r-kanat dto3-s2r-kanat--sag">{orta.slice(2).map((k) => <KategoriDugumu key={k.kod} kategori={k} durum={durum} secili={secili} onSec={onSec} yon="sag" />)}</div>
      </section>
      <section className="dto3-s2r-kat dto3-s2r-kat--zayif">
        <div className="dto3-s2r-uclu">{zayif.map((k) => <KategoriDugumu key={k.kod} kategori={k} durum={durum} secili={secili} onSec={onSec} yon="alt" />)}</div>
        <KatmanRozeti katman={KATMANLAR[2]} />
      </section>
    </div>
  </section>;
}

function TahtaS3({ durum, secili, onSec }) {
  return <section className="dto3-tahta dto3-s3" aria-label={tt("S3 — Katlanan Taktik Şerit")}>
    <div className="dto3-s3-kabuk">
      {KATMANLAR.map((katman, sira) => {
        const liste = KATEGORILER.filter((k) => k.katman === katman.kod);
        return <section className={`dto3-s3-serit dto3-s3-serit--${katman.kod}`} key={katman.kod}>
          <KatmanRozeti katman={katman} />
          <div className="dto3-s3-yuvalar" style={{ "--dto3-adet": liste.length }}>
            {liste.map((k) => <Hucre key={k.kod} kategori={k} durum={durum} secili={secili} onSec={onSec} dar sinif="dto3-s3-yuva" />)}
          </div>
          {sira < 2 && <span className="dto3-s3-donus" aria-hidden="true"><i /></span>}
        </section>;
      })}
    </div>
  </section>;
}

function S3RKontrolPipleri({ adet, taraf }) {
  return <span className={`dto3-s3r-pipler dto3-s3r-pipler--${taraf}`} aria-hidden="true">
    {[0, 1, 2, 3, 4].map((i) => <i className={i < adet ? "dolu" : ""} key={i} />)}
  </span>;
}

function HudS3R({ durum }) {
  const sayi = sayilar(durum);
  const [gosterilen, setGosterilen] = useState(sayi);
  useEffect(() => {
    if (gosterilen.ben === sayi.ben && gosterilen.rakip === sayi.rakip) return undefined;
    const zaman = window.setTimeout(() => setGosterilen(sayi), 380);
    return () => window.clearTimeout(zaman);
  }, [gosterilen.ben, gosterilen.rakip, sayi.ben, sayi.rakip]);
  return <section className="dto3-s3r-hud" aria-label={tt("Kategori kontrol yarışı")}>
    <div className="dto3-s3r-hud-oyuncu dto3-s3r-hud-oyuncu--ben" key={`ben-${gosterilen.ben}`}>
      <span>{tt("SEN")}</span><b>{gosterilen.ben}<small>/5</small></b><S3RKontrolPipleri adet={gosterilen.ben} taraf="ben" />
    </div>
    <div className="dto3-s3r-hud-skor"><small>{tt("SKOR")}</small><b>{durum.skor[0]}<i>–</i>{durum.skor[1]}</b><span>{tt("5 KATEGORİ KAZANIR")}</span></div>
    <div className="dto3-s3r-hud-oyuncu dto3-s3r-hud-oyuncu--rakip" key={`rakip-${gosterilen.rakip}`}>
      <span>{tt("RAKİP")}</span><b>{gosterilen.rakip}<small>/5</small></b><S3RKontrolPipleri adet={gosterilen.rakip} taraf="rakip" />
    </div>
  </section>;
}

function KategoriTasiS3R({ kategori, durum, secili, onSec }) {
  const sahip = sahiplik(kategori.kod, durum);
  return <button type="button" className={`dto3-hucre dto3-hucre--${sahip} dto3-s3r-tas${secili === kategori.kod ? " dto3-secili" : ""}`}
    aria-label={`${tt(kategori.ad)} · +${kategori.puan}/−${kategori.puan} · ${sahipAdi(sahip)} · ${tt("Sen %{ben}, Rakip %{rakip}", { ben: kategori.ben, rakip: kategori.rakip })}`}
    aria-pressed={secili === kategori.kod} onClick={() => onSec(kategori.kod)}>
    <span className="dto3-kat-ikon"><KategoriIkon anahtar={kategori.kod} boyut={22} plaka /></span>
    <strong>{tt(kategori.ad)}</strong>
    <span className="dto3-s3r-sahip" aria-label={sahipAdi(sahip)}><i /></span>
    <span className="dto3-s3r-odul">+{kategori.puan}</span>
  </button>;
}

function TahtaS3R({ durum, secili, onSec }) {
  const sayi = sayilar(durum);
  const kritik = sayi.ben === 4 && sayi.rakip === 4;
  return <section className={`dto3-tahta dto3-s3r${kritik ? " dto3-s3r--kritik" : ""}`} aria-label={tt("S3-R — Tek Parça Düello Tahtası")}>
    <div className="dto3-s3r-kabuk">
      <span className="dto3-s3r-ray dto3-s3r-ray--sol" aria-hidden="true" /><span className="dto3-s3r-ray dto3-s3r-ray--sag" aria-hidden="true" />
      {KATMANLAR.map((katman) => {
        const liste = KATEGORILER.filter((k) => k.katman === katman.kod);
        return <section className={`dto3-s3r-kat dto3-s3r-kat--${katman.kod}`} key={katman.kod}>
          <div className="dto3-s3r-kat-baslik"><span>{tt(katman.ad)}</span><b>+{katman.puan}<small>/−{katman.puan}</small></b></div>
          <div className="dto3-s3r-taslar" style={{ "--dto3-adet": liste.length }}>
            {liste.map((k) => <KategoriTasiS3R key={k.kod} kategori={k} durum={durum} secili={secili} onSec={onSec} />)}
          </div>
        </section>;
      })}
    </div>
  </section>;
}

function SecimSeridi({ secili, detayli = false }) {
  const kategori = KATEGORILER.find((k) => k.kod === secili) ?? KATEGORILER[0];
  return <div className={`dto3-secim${detayli ? " dto3-secim--detayli" : ""}`} aria-live="polite">
    <span><KategoriIkon anahtar={kategori.kod} boyut={22} plaka /><i><small>{tt("SEÇİLİ KATEGORİ")}</small><b>{tt(kategori.ad)}</b></i></span>
    {detayli && <div className="dto3-secim-oranlar"><span>{tt("SEN")} <b>%{kategori.ben}</b></span><i>·</i><span>{tt("RAKİP")} <b>%{kategori.rakip}</b></span></div>}
    <strong>+{kategori.puan}<small>/−{kategori.puan}</small></strong>
    <button type="button" aria-disabled="true">{tt("SALDIR")}<QtIkon ad="ileri" boyut={14} /></button>
  </div>;
}

export default function DuelloTahtaOnizlemePage() {
  const [konsept, setKonsept] = useState("s1");
  const [durumKodu, setDurumKodu] = useState("orta");
  const [secili, setSecili] = useState("spor");
  const durum = DURUMLAR[durumKodu];
  const Tahta = useMemo(() => ({ s1: TahtaS1, s2: TahtaS2, "s2-r": TahtaS2R, s3: TahtaS3, "s3-r": TahtaS3R })[konsept], [konsept]);
  useEffect(() => { document.title = `Quiz Tactics — ${tt("Düello tahta önizleme")}`; }, []);
  useEffect(() => {
    const onceki = { efekt: sesAcikMi(), muzik: muzikAcikMi() };
    sesAyarla(false);
    muzikAyarla(false);
    return () => { sesAyarla(onceki.efekt); muzikAyarla(onceki.muzik); };
  }, []);

  return <div className="qt-sayfa dto3-sayfa"><main className="dto3-telefon">
    <header className="dto3-ust">
      <span><QtIkon ad="duello" boyut={14} /> {tt("DÜELLO · İMZA FORMU")}</span>
      <div className="dto3-araclar">
        <div className="dto3-segment" role="tablist" aria-label={tt("Tasarım konsepti")}>
          {["s1", "s2", "s2-r", "s3", "s3-r"].map((kod) => <button key={kod} type="button" role="tab" aria-selected={konsept === kod} className={konsept === kod ? "aktif" : ""} onClick={() => setKonsept(kod)}>{kod.toUpperCase()}</button>)}
        </div>
        <div className="dto3-segment dto3-segment--durum" role="group" aria-label={tt("Örnek maç durumu")}>
          {Object.entries(DURUMLAR).map(([kod, d]) => <button key={kod} type="button" aria-pressed={durumKodu === kod} className={durumKodu === kod ? "aktif" : ""} onClick={() => setDurumKodu(kod)}>{tt(d.kisa)}</button>)}
        </div>
      </div>
    </header>
    {konsept === "s3-r" ? <HudS3R durum={durum} /> : <MacHud durum={durum} />}
    <Tahta durum={durum} secili={secili} onSec={setSecili} />
    <SecimSeridi secili={secili} detayli={konsept === "s2-r" || konsept === "s3-r"} />
    <footer className="dto3-efsane">
      <span><i className="dto3-renk dto3-renk--ben" />{tt("Sende")}</span><span><i className="dto3-renk dto3-renk--rakip" />{tt("Rakipte")}</span><span><i className="dto3-renk" />{tt("Boş")}</span>
      <small><i className="dto3-ok dto3-ok--sol" />{tt("Sen üstün")}</small><small>{tt("Rakip üstün")}<i className="dto3-ok" /></small>
    </footer>
  </main></div>;
}
