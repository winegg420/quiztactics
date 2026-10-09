// /sure-ayar sahneleri (9 Eki 2026, Ida): her süre GERÇEK oyun bileşeniyle, taklit maç verisiyle oynar.
// Ağ / Supabase / oturum yok: bileşenler yalnız prop alır. Oyunun kendi akışı bu dosyayı hiç yüklemez.
// Sunucu gösterim payına bağlı sahnelerde (v4 açılış, Hazine AÇ) taklit veri payı geniş verir → seçilen süre olduğu gibi görünür;
// canlıdaki üst sınır sahne notunda yazar.
//
// Sahne tanımı: { sure (ayarlanan kısım, ms), on (öncesi), kuyruk (sonrası), ciz(g, ctx), ses: [[ms, fn]], olcu (ölçülen öğe), canli }
// g: sahne başından geçen ms (on dahil). ses zamanları da sahne başına göre (seçilen süreyle ölçeklenmiş).
import { useEffect, useRef, useState } from "react";
import { tt } from "../../lib/dil.js";
import { sure, sureOlcek } from "../../lib/sureler.js";
import { sesCoin, sesRozet, sesSoruGeldi, sesTurGecis, sesJoker, sesXpDolma, sesYanlis, sesDogru, sesVsAni,
         sesKategoriSecildi, sesSkill, sesTik } from "../../lib/ses.js";
import { KasaAcAni, KasaRakipKarar, KasaFinalSahnesi, KasaCifteBandi, KasaSavunmaAni, KasaGirisSahnesi, UcanParcalar } from "../../components/KasaEfekt.jsx";
import { KasaKadran, KasaSkor, KasaUst, KasaSonucBandi, KasaJokerBilgi, KasaDevamOdul, KasaRakipJokerAn } from "../../components/KasaParcalari.jsx";
import { BanGirisAni, BanAciklama } from "../../components/DuelloBanAni.jsx";
import { HakimiyetBasliyor, SecimKonsol, SecimKartlar, SecimHalka, secimModel } from "../../components/DuelloSecim.jsx";
import { CalmaAni, HkYuvalar, hkModel, CALMA_INIS_MS } from "../../components/DuelloTahta.jsx";
import { V2Ust } from "../../components/DuelloV2.jsx";
import Duello4Arena from "../../components/duello4/Duello4Arena.jsx";
import AramaGunesHalkasi from "../../components/AramaGunesHalkasi.jsx";
import MacUstSerit from "../../components/MacUstSerit.jsx";
import KategoriIkon from "../../components/KategoriIkon.jsx";
import { QtSayac, QtSik, QtSikler, QtSoruKarti, sinif } from "../index.js";
import "../../pages/DuelloPage.a.css";
import "../../styles/kasa.css";
import "../../styles/duello-tahta.css";

const c = (a, d) => tt(a, d);
const bos = () => {};
/** Sahne bitti: oyunda bu noktada sonraki ekrana geçilir (önizlemede boş çerçeve yerine kısa not). */
const Son = ({ metin }) => <p className="sa-son">{metin}</p>;

// ---------------------------------------------------------------- taklit oyuncular / maç
const BEN = "5a0e0000-0000-4000-8000-0000000000aa";
const RAKIP = "5a0e0000-0000-4000-8000-0000000000bb";
const ORAN_BEN = { tarih: 74, sinema: 38, muzik: 66, bilim: 41, sanat: 52, spor: 61, cografya: 58, edebiyat: 47, genel_kultur: 63, teknoloji: 55 };
const ORAN_RAKIP = { tarih: 28, sinema: 72, muzik: 40, bilim: 55, sanat: 49, spor: 47, cografya: 60, edebiyat: 52, genel_kultur: 50, teknoloji: 66 };
const benP = { id: BEN, gorunen_ad: "Sen", username: "sen", gorunen_avatar: "/avatars/pro/tilki-k04.svg", avatar_url: "/avatars/pro/tilki-k04.svg", puan: 34, profil: { oranlar: ORAN_BEN } };
const rakipP = { id: RAKIP, gorunen_ad: "Deniz Yıldırımoğlu", username: "deniz", gorunen_avatar: "/avatars/pro2/samuray-y15.svg", avatar_url: "/avatars/pro2/samuray-y15.svg", puan: 41, profil: { oranlar: ORAN_RAKIP } };
// Oyuncu kartı elde: avatar/isim bileşenleri sunucudan kart okumaz (oyuncu_kartlari isteği yok)
const KART = { cerceve: null, aura: null, premium_cerceve: null, premium_aura: null, sezon_bp: false, isim_efekti: null, unvan: null, level: 14, lig: "altin", koleksiyon_puani: 0 };
const SEVIYELER = { [BEN]: KART, [RAKIP]: { ...KART, level: 17, lig: "elmas" } };
const K10 = ["bilim", "cografya", "edebiyat", "genel_kultur", "muzik", "sanat", "sinema", "spor", "tarih", "teknoloji"];
const SORU = { soru: "Hangi gezegen Güneş Sistemi'nin en büyüğüdür?", secenekler: ["Satürn", "Jüpiter", "Neptün", "Uranüs"], kategori: "bilim" };

// Düello · seçim (draft): yılan sırası, ilk üç seçim yapılmış, sıra bende
const SIRASI = [BEN, RAKIP, RAKIP, BEN, BEN, RAKIP, RAKIP, BEN, BEN, RAKIP];
function secimMaci(secimler) {
  const sahiplik = Object.fromEntries(secimler.map((s) => [s.k, s.u]));
  return {
    id: "sa-secim", ben: BEN, rakip: RAKIP, faz: "secim", tur: 0, max_tur: 10, kategoriler: K10, saldiran: BEN,
    oyuncular: [benP, rakipP],
    hakimiyet: { acik: true, esik: 5, sahiplik, kilitler: {}, avantaj_esik: 10 },
    secim: { acik: true, toplam: 10, sirasi: SIRASI, secimler, sira: secimler.length, kalan: K10.filter((k) => !sahiplik[k]) },
  };
}
const SECIM_ONCE = [{ u: BEN, k: "bilim" }, { u: RAKIP, k: "sinema" }, { u: RAKIP, k: "spor" }];

// Düello · Plan A puan modu (sonuç): herkesin 5 kategorisi var
const BASLANGIC = { tarih: BEN, muzik: BEN, sanat: BEN, cografya: BEN, genel_kultur: BEN, sinema: RAKIP, spor: RAKIP, bilim: RAKIP, edebiyat: RAKIP, teknoloji: RAKIP };
function puanMaci(faz, puanlar) {
  return {
    id: "sa-puan", ben: BEN, rakip: RAKIP, faz, tur: 4, max_tur: 10, kategoriler: K10, kategori: "tarih", saldiran: BEN,
    oyuncular: [benP, rakipP],
    hakimiyet: { acik: true, esik: 5, sahiplik: { ...BASLANGIC }, kilitler: {}, avantaj_esik: 10 },
    puan: { acik: true, hedef: 12, kategori_yolu: 4, puanlar, alinan: { [BEN]: 0, [RAKIP]: 0 }, baslangic: BASLANGIC },
  };
}

function DuelloKabuk({ d, faz, sayac, children, tahta, ust = true, noktalar = null }) {
  return (
    <div className={sinif("m2-mac hk-mac", `hk-mac--${faz}`)}>
      <MacUstSerit onCik={bos} cikisEtiketi={c("Düellodan çık")} rozet={c("Düello · Taktik Maçı")} />
      {ust && <V2Ust d={d} ben={benP} rakip={rakipP} c={c} seviyeler={SEVIYELER} sayac={sayac} oran={0.6} noktalar={noktalar} />}
      <div className="hk-tahta-kap">{tahta}</div>
      {children}
    </div>
  );
}
const sayacKutu = (kalan, toplam, ekBalon = null) => (
  <span className="hk-sayac-kutu">
    <QtSayac kalan={kalan} toplam={toplam} esik={5} boyut="k" ekBalon={ekBalon} className="hk-sayac" />
    <small className="hk-sayac-birim" aria-hidden="true">{c("sn")}</small>
  </span>
);

// Ban fazı ekranı (ban anları sahnenin içinde, oyundaki gibi); ömürlerini bileşenler kendisi yönetir (sure())
function BanKabuk({ children }) {
  const d = puanMaci("ban", { [BEN]: 2, [RAKIP]: 3 });
  const hk = hkModel(d, benP, rakipP);
  return (
    <DuelloKabuk d={d} faz="ban" sayac={sayacKutu(6, 7)} tahta={<HkYuvalar d={d} hk={hk} c={c} />}>
      <div className="m2-sahne hk-sahne hk-sahne--ban">{children}</div>
    </DuelloKabuk>
  );
}

function SecimSahnesi({ secimler, sn = 4 }) {
  const d = secimMaci(secimler);
  const sm = secimModel(d);
  const hk = hkModel(d, benP, rakipP);
  const benSirada = sm.sirasi[sm.sira] === BEN;
  return (
    <DuelloKabuk d={d} faz="secim" sayac={<SecimHalka sn={sn} oran={sn / 5} ben={benSirada} c={c} />}
                 tahta={<HkYuvalar d={d} hk={hk} c={c} />}>
      <SecimKonsol d={d} sm={sm} benSirada={benSirada} sn={sn} c={c} />
      <div className="m2-sahne hk-sahne">
        <SecimKartlar d={d} hk={hk} sm={sm} ben={benP} rakip={rakipP} benSirada={benSirada} basilan={null} calisan={null} c={c} onSec={bos} />
      </div>
    </DuelloKabuk>
  );
}

// Düello v4 (tek arena) — araclar/duello-v4-ekran.mjs'teki taklit durumun kısaltılmışı
function v4Maci({ faz, kontrol, t0, pay = 60000, sonHamle = null, kart = null, gosterimBas = null, seri = 1 }) {
  const bitis = new Date(t0 + 15000 + 60000).toISOString();
  const soruFazi = ["notr", "cevap", "son"].includes(faz);
  return {
    surum: 4, id: "sa-v4", durum: "aktif", dereceli: true, faz, faz_bitis: bitis, sunucu_zamani: new Date(t0).toISOString(),
    ben: BEN, rakip: RAKIP, oyuncular: [{ ...benP, dogru: 3 }, { ...rakipP, dogru: 2 }],
    v4: { kontrol, seri, seri_hedef: 3, tur: 3, max_tur: 20, notr_seri: 0, notr_max: 5, son: false, soru_no: 5, kullanilan: [], ilk_mac: false,
          kart, benim_kategori: "muzik", rakip_kategori: "tarih", oto: false },
    soru: soruFazi ? { ...SORU, kategori: "muzik" } : null,
    cevap: soruFazi ? { benim_bitis: bitis, rakip_bitis: bitis, ben_cevapladim: false, benim_cevabim: null, rakip_cevapladi: false, elli_kapali: null, ikinci_sans_ilk_cevap: null } : null,
    son_hamle: sonHamle,
    skill: { kapali: false, set: ["elli", "sure", "zaman_baskisi"], izinli: ["elli", "sure", "soru_degistir", "zaman_baskisi", "ikinci_sans"], toplam_hak: 4, tur_basi_hak: 2,
             soru_basi_hak: 1, kullanilan: 0, sayilar: {}, bu_soruda: 0, rakip_bu_soruda: false, soru_degistir_kilit: null, envanter: { elli: 3, sure: 2, zaman_baskisi: 1 }, fiyatlar: {}, coin: 120 },
    // Taklit gösterim payı geniş (60 sn): açılış paneli tam seçilen süre kadar görünür (canlıda sunucu payı sınırlar)
    sureler: { kart: 7, cevap: 15, sonuc: 3, ek_sure: 5, zaman_baskisi_eksi: 5, nabiz: 10, kopuk: 25, gosterim_payi_ms: pay, gosterim_bas: new Date(gosterimBas ?? t0 + pay).toISOString() },
    kazanan: null, terk_eden: null, odul: null, ezeli: null, gecmis: null, rovans: { isteyen: null, id: null, gecerli: false },
  };
}
const v4Hamle = { surum: 4, tip: "saldiri", no: 4, tur: 3, kazanan: null, seri_hedef: 3, notr_seri: 0, gonderilen: "tarih", secilen: "muzik", oto: false,
  sonuc: "el_degisti", kontrol_once: BEN, kontrol_sonra: RAKIP, seri_once: 2, seri_sonra: 1,
  oyuncular: { [BEN]: { soru_id: "a", kategori: "muzik", cevap: 0, dogru: false, yanitsiz: false, dogru_cevap: 1 },
               [RAKIP]: { soru_id: "b", kategori: "tarih", cevap: 2, dogru: true, yanitsiz: false, dogru_cevap: 2 } } };
function Arena4({ d, simdi, sn = 15, ekBalon = null }) {
  return (
    <Duello4Arena d={d} ben={benP} rakip={rakipP} c={c} seviyeler={SEVIYELER} gosterSn={sn} oran={sn / 15} farkMs={0} simdi={simdi}
                  kopukBant={null} yenidenBant={false} hata={null} calisan={null} secim={null} ikinciSansElendi={[]} kiriliyor={[]}
                  ekBalon={ekBalon} jokerSerbest={false} sonKullanilan={null} skillDeger={{ ek: 5, baski: 5 }}
                  onCevap={bos} onKart={bos} onJoker={bos} onYenile={bos} onCik={bos} />
  );
}

// Ortak Hazine maç kabuğu (KasaPage ile aynı katmanlar)
function kasaMaci(faz, ek = {}) {
  return {
    id: "sa-kasa", ben: BEN, durum: "aktif", faz, tur: 6, max_tur: 12, hedef: 80, kasa: 14, tavan: 0, sahip: BEN, altin: false,
    oyuncular: [benP, rakipP], soru: SORU, savunma_hak: [], rakip_joker: [], jokerli: true, ikisi_artis: 6, ...ek,
  };
}
function KasaKabuk({ d, kadran, anahtar = null, sars = false, sahne = null, ust = null, efekt = null, kokRef }) {
  const sonucMu = d.faz === "sonuc";
  return (
    <div ref={kokRef} className={sinif("m2-mac ks-mac qt-sahne-mac qt-sahne-gok", `ks-mac--${d.faz}`, sars && "ks-mac--sars")}>
      <MacUstSerit onCik={bos} cikisEtiketi={c("Maçtan çık")} rozet={c("Ortak Hazine")} />
      <KasaUst d={d} ben={benP} rakip={rakipP} c={c} seviyeler={SEVIYELER} anahtar={anahtar}
               sayac={<QtSayac kalan={sonucMu ? 0 : 11} toplam={15} esik={5} boyut="k" durdu className="ks-sayac" />}
               rakipJoker={Array.isArray(d.rakip_joker) ? d.rakip_joker : []} />
      <div className="ks-serit">
        <KasaSkor d={d} ben={benP} rakip={rakipP} c={c} orta={kadran ?? <KasaKadran d={d} c={c} kucuk />} />
      </div>
      <div className="ks-sahne">
        {sahne}
        <QtSoruKarti className="m2-soru ks-soru" kategori={<><KategoriIkon anahtar={SORU.kategori} boyut={16} /> {c("Bilim")}</>}
                     sira={c("Aynı soru · aynı anda")} metin={SORU.soru} />
        <QtSikler etiket={c("Şıklar")}>
          {SORU.secenekler.map((s, i) => (
            <QtSik key={s} harf={"ABCD"[i]} metin={s} durum={sonucMu ? (i === 1 ? "dogru" : "solgun") : "kilitli"} />
          ))}
        </QtSikler>
        {ust}
      </div>
      {efekt && <div className="ks-efekt" aria-hidden="true">{efekt}</div>}
    </div>
  );
}
// UcanParcalar kökü ve hedefleri ilk çizimde ölçer: kök ref'i bağlandıktan SONRA (bir sonraki kare) çizilir.
// Canlıda kök zaten çizili olduğu için bu bekleme orada yok; taşıdığı gecikme parçacıkların kendi gecikmesinin içinde kalır.
function useKokHazir() {
  const [hazir, setHazir] = useState(false);
  useEffect(() => { setHazir(true); }, []);
  return hazir;
}
// UcanParcalar ölçüm için kök ref'i ister: sahne başına bir ref (bileşen ömrü = sahne)
function KasaSonucUcus({ g, ac }) {
  const kokRef = useRef(null);
  const hazir = useKokHazir();
  const o = sureOlcek("kasa_sonuc_ucus");
  const su = (ms) => Math.round(ms * o);
  const varis = g >= su(950);
  const anahtarVaris = g >= su(1900);
  const bitti = g >= su(2600);
  const d = kasaMaci("sonuc", { kasa: varis ? 20 : 14, sahip: anahtarVaris ? BEN : RAKIP,
    sonuc: { ben_dogru: true, rakip_dogru: false, artis: 6, kasa_once: 14, kasa_sonra: 20, sahip_once: RAKIP, sahip_sonra: BEN, dogru_cevap: 1 } });
  const hareket = varis && !bitti ? ["vardi", "patla"].concat(anahtarVaris ? ["yeni-sahip"] : []) : [];
  return (
    <KasaKabuk d={d} kokRef={kokRef} anahtar={anahtarVaris && !bitti ? "ben" : null}
               kadran={<KasaKadran d={d} c={c} kucuk goster={varis ? undefined : 14} sahipGoster={anahtarVaris ? undefined : RAKIP} hareket={hareket}
                                   artis={varis && !bitti ? { anahtar: ac.id, n: 6, buyuk: true } : null} />}
               sahne={<KasaSonucBandi d={d} c={c} />}
               efekt={hazir && !bitti && (
                 <>
                   <UcanParcalar kokRef={kokRef} kaynak="bant" hedef="kasa" adet={14} gecikme={su(180)} sure={su(760)} dagilim={70} />
                   <UcanParcalar kokRef={kokRef} kaynak="avatar-rakip" hedef="avatar-ben" adet={1} tur="anahtar" gecikme={su(1050)} sure={su(850)} dagilim={0} />
                 </>
               )} />
  );
}
function KasaAcSahnesi({ g, olcek, s }) {
  const bitti = g >= s;
  const hazir = useKokHazir();
  const kokRef = useRef(null);
  const m = (ms) => Math.round(ms * olcek);
  const varis = g >= m(980);
  const d = kasaMaci("cevap", { kasa: 0, sahip: null, oyuncular: [{ ...benP, puan: varis ? 46 : 34 }, rakipP] });
  const ben = { ...benP, puan: varis ? 46 : 34 };
  return (
    <div ref={kokRef} className={sinif("m2-mac ks-mac qt-sahne-mac qt-sahne-gok ks-mac--cevap", g >= m(340) && g < m(690) && "ks-mac--sars")}>
      <MacUstSerit onCik={bos} cikisEtiketi={c("Maçtan çık")} rozet={c("Ortak Hazine")} />
      <KasaUst d={d} ben={ben} rakip={rakipP} c={c} seviyeler={SEVIYELER} sayac={<span className="ks-sayac ks-sayac--yok ks-sayac--bekle" aria-hidden="true">·</span>} />
      <div className="ks-serit">
        <KasaSkor d={{ ...d, kasa: 12, sahip: BEN }} ben={ben} rakip={rakipP} c={c} parla={varis ? "ben" : null}
                  orta={<KasaKadran d={d} c={c} kucuk />} />
      </div>
      <div className="ks-sahne">
        {!bitti && <KasaAcAni deger={12} benim seviye="dolu" olcek={olcek} c={c} />}
      </div>
      <div className="ks-efekt" aria-hidden="true">
        {hazir && !bitti && <UcanParcalar kokRef={kokRef} kaynak="ac-kasa" hedef="skor-ben" adet={16} gecikme={m(420)} sure={m(580)} dagilim={80} />}
      </div>
    </div>
  );
}
const acSesleri = (olcek) => [[340 * olcek, sesRozet], [980 * olcek, sesCoin], [1280 * olcek, sesSoruGeldi]];

// ---------------------------------------------------------------- sahneler
const CANLI_PAY_V4 = "Canlıda sunucu gösterim payı (≈1,5–2 sn) içinde kalır: ölçümde panel ≈0,96 sn görünüyordu; payı aşan kısım görünmez.";
const CANLI_PAY_KASA = "Canlıda soru gösterim payı 1,5 sn: veri geç gelirse an bu paya sığacak kadar hızlanır (en az \"AÇ/DEVAM en kısa hâli\").";

export function sahneOlustur(anahtar) {
  switch (anahtar) {
    // ---------------- ortak
    case "ortak_arama_gecis": {
      const s = sure(anahtar);
      return { sure: s, on: 0, kuyruk: 300, olcu: ".gh-vs", yontem: "gerçek bileşen (AramaGunesHalkasi)",
        ses: [[450, sesVsAni]],
        ciz: (g) => g >= s ? <Son metin="Oyun burada maç ekranına geçer." /> : (
          <AramaGunesHalkasi mod="duello" dereceli gecen={9} durum="bulundu" rakip={rakipP} baslik={c("Rakip bulundu!")}
                             ben={benP} kartlar={SEVIYELER} gecisMs={s} onIptal={bos} onTekrar={bos} />
        ) };
    }
    // ---------------- düello · ban
    case "duello_ban_giris": return { sure: sure(anahtar), kuyruk: 200, olcu: ".hk-banan--giris .hk-banan-panel", yontem: "gerçek bileşen (BanGirisAni)",
      ciz: (g, ctx) => <BanKabuk><BanGirisAni anahtar={`sa-${ctx.id}`} tur={3} maxTur={10} c={c} /></BanKabuk> };
    case "duello_ban_aciklama": case "duello_ban_sira":
      return { sure: sure("duello_ban_aciklama") + sure("duello_ban_sira"), kuyruk: 200, olcu: ".hk-banan-panel, .hk-bansira > span", yontem: "gerçek bileşen (BanAciklama)",
        ciz: (g, ctx) => <BanKabuk><BanAciklama anahtar={`sa-${ctx.id}`} benSaldiran kategori="tarih" c={c} /></BanKabuk> };
    case "duello_ban_onay": return { sure: sure(anahtar), kuyruk: 200, olcu: ".hk-banan-panel, .hk-bansira > span", yontem: "gerçek bileşen (BanAciklama)",
      ciz: (g, ctx) => <BanKabuk><BanAciklama anahtar={`sa-${ctx.id}`} benSaldiran={false} kategori="tarih" c={c} /></BanKabuk> };
    case "duello_ban_bilgi": return { sure: sure(anahtar), kuyruk: 200, olcu: ".hk-banan-panel, .hk-bansira > span", yontem: "gerçek bileşen (BanAciklama)",
      ciz: (g, ctx) => <BanKabuk><BanAciklama anahtar={`sa-${ctx.id}`} benSaldiran={false} kategori={null} c={c} /></BanKabuk> };
    case "duello_ban_sira_bilgi": return { sure: sure(anahtar), kuyruk: 200, olcu: ".hk-banan-panel, .hk-bansira > span", yontem: "gerçek bileşen (BanAciklama)",
      ciz: (g, ctx) => <BanKabuk><BanAciklama anahtar={`sa-${ctx.id}`} benSaldiran kategori={null} c={c} /></BanKabuk> };
    // ---------------- düello · seçim
    case "duello_secim_oto": {
      const on = 120;
      return { sure: sure(anahtar), on, kuyruk: 400, olcu: ".dsc-konsol--oto", yontem: "gerçek bileşen (SecimKonsol + seçim ekranı)",
        ciz: (g) => <SecimSahnesi secimler={g < on ? SECIM_ONCE : [...SECIM_ONCE, { u: BEN, k: "tarih", oto: true }]} sn={g < on ? 1 : 5} /> };
    }
    case "duello_kart_ucus": {
      const on = 500;
      return { sure: sure(anahtar), on, kuyruk: 900, olcu: ".dsc-ucan", yontem: "gerçek bileşen (SecimKartlar → HkYuvalar)",
        ciz: (g) => <SecimSahnesi secimler={g < on ? SECIM_ONCE : [...SECIM_ONCE, { u: BEN, k: "tarih" }]} sn={g < on ? 3 : 5} /> };
    }
    case "duello_hakimiyet_gecis": return { sure: sure(anahtar), kuyruk: 200, olcu: ".dsc-basla", yontem: "gerçek bileşen (HakimiyetBasliyor)",
      ciz: (g) => {
        const d = puanMaci("ban", { [BEN]: 0, [RAKIP]: 0 });
        const hk = hkModel(d, benP, rakipP);
        return (
          <DuelloKabuk d={d} faz="ban" sayac={sayacKutu(7, 7)} tahta={<HkYuvalar d={d} hk={hk} c={c} />}>
            {g < sure(anahtar) && <HakimiyetBasliyor hk={{ benY: 5, rakipY: 5, puan: true, hedef: 12, yol: 4 }} c={c} />}
          </DuelloKabuk>
        );
      } };
    // ---------------- düello · tahta
    case "duello_calma": {
      const s = sure(anahtar);
      const inis = Math.round(CALMA_INIS_MS * sureOlcek(anahtar));
      return { sure: s, kuyruk: 300, olcu: ".hk-calma", yontem: "gerçek bileşen (CalmaAni + puan şeridi)",
        ses: [[inis, sesKategoriSecildi], [inis, sesCoin]],
        ciz: (g) => {
          const indi = g >= inis;
          const d = puanMaci("sonuc", { [BEN]: indi ? 7 : 5, [RAKIP]: 3 });
          if (!indi) d.hakimiyet.sahiplik.sinema = RAKIP; else d.hakimiyet.sahiplik.sinema = BEN;
          if (indi) d.puan.alinan[BEN] = 1;
          const hk = hkModel(d, benP, rakipP);
          return (
            <DuelloKabuk d={d} faz="sonuc" sayac={<span className="hk-sayac hk-sayac--sonuc" aria-hidden="true">·</span>}
                         tahta={<><HkYuvalar d={d} hk={hk} c={c} vurus={indi && g < s ? { [BEN]: 2, anahtar: "sa-calma" } : null} />
                                  {g < s && <CalmaAni kat="sinema" once="rakip" sonra="ben" inis={indi} c={c} />}</>} />
          );
        } };
    }
    case "duello_vurus": {
      const s = sure(anahtar);
      return { sure: s, kuyruk: 300, olcu: ".hk-vurus", yontem: "gerçek bileşen (HkYuvalar puan vuruşu)",
        ses: [[0, sesDogru], [220, sesCoin]],
        ciz: (g) => {
          const d = puanMaci("sonuc", { [BEN]: 7, [RAKIP]: 3 });
          const hk = hkModel(d, benP, rakipP);
          return (
            <DuelloKabuk d={d} faz="sonuc" sayac={<span className="hk-sayac hk-sayac--sonuc" aria-hidden="true">·</span>}
                         tahta={<HkYuvalar d={d} hk={hk} c={c} vurus={g < s ? { [BEN]: 2, anahtar: "sa-vurus" } : null} />} />
          );
        } };
    }
    case "duello_skill_efekt": {
      const s = sure(anahtar);
      return { sure: s, on: 150, kuyruk: 400, olcu: ".qt-sayac-balon", yontem: "gerçek bileşen (Duello4Arena, sayaç ek süre balonu)",
        ses: [[150, () => sesSkill("sure")]],
        ciz: (g, ctx) => {
          const acik = g >= 150 && g < 150 + s;
          return <Arena4 d={v4Maci({ faz: "notr", kontrol: null, t0: ctx.t0 })} simdi={ctx.t0 + g} sn={acik || g >= 150 + s ? 14 : 9}
                         ekBalon={acik ? { anahtar: "sa-ek", metin: "+5" } : null} />;
        } };
    }
    // ---------------- düello v4
    case "duello4_acilis": return { sure: sure(anahtar), kuyruk: 700, olcu: ".d4-acilis", yontem: "gerçek bileşen (Duello4Arena, taklit gösterim payı)",
      canli: CANLI_PAY_V4,
      ciz: (g, ctx) => <Arena4 d={v4Maci({ faz: "cevap", kontrol: RAKIP, t0: ctx.t0 })} simdi={ctx.t0 + g} /> };
    case "duello4_sarsinti": {
      const on = 120;
      return { sure: sure(anahtar), on, kuyruk: 500, olcu: ".d4-sahne--sarsinti", yontem: "gerçek bileşen (Duello4Arena, kontrol el değiştirir)",
        ciz: (g, ctx) => <Arena4 d={v4Maci({ faz: "sonuc", kontrol: g < on ? BEN : RAKIP, t0: ctx.t0, sonHamle: v4Hamle })} simdi={ctx.t0 + g} /> };
    }
    case "duello4_baski": {
      const s = sure(anahtar);
      return { sure: s, kuyruk: 500, olcu: ".d4-baski", yontem: "gerçek bileşen (Duello4Arena sonuç paneli, seri 2/3)",
        ciz: (g, ctx) => <Arena4 d={v4Maci({ faz: "sonuc", kontrol: BEN, t0: ctx.t0, seri: 2, sonHamle: { ...v4Hamle, sonuc: "basarili", kontrol_once: BEN, kontrol_sonra: BEN, seri_once: 1, seri_sonra: 2,
          oyuncular: { [BEN]: { ...v4Hamle.oyuncular[BEN], dogru: true, dogru_cevap: 0 }, [RAKIP]: { ...v4Hamle.oyuncular[RAKIP], dogru: false, dogru_cevap: 0, cevap: 2 } } } })} simdi={ctx.t0 + g} /> };
    }
    case "duello4_konfeti": {
      const s = sure(anahtar);
      return { sure: Math.round(s * 2460 / 1800), kuyruk: 500, olcu: ".d4-konfeti", yontem: "gerçek bileşen (Duello4Arena sonuç paneli, 3/3 düello kazanıldı)",
        ciz: (g, ctx) => <Arena4 d={v4Maci({ faz: "sonuc", kontrol: BEN, t0: ctx.t0, seri: 3, sonHamle: { ...v4Hamle, sonuc: "basarili", kontrol_once: BEN, kontrol_sonra: BEN, seri_once: 2, seri_sonra: 3, kazanan: BEN,
          oyuncular: { [BEN]: { ...v4Hamle.oyuncular[BEN], dogru: true, dogru_cevap: 0 }, [RAKIP]: { ...v4Hamle.oyuncular[RAKIP], dogru: false, dogru_cevap: 0, cevap: 2 } } } })} simdi={ctx.t0 + g} /> };
    }
    // ---------------- hazine
    case "kasa_ac_an": {
      const olcek = sureOlcek(anahtar);
      return { sure: sure(anahtar), kuyruk: 300, olcu: ".ks-ac-an", yontem: "gerçek bileşen (KasaAcAni + altın uçuşu)", canli: CANLI_PAY_KASA,
        ses: acSesleri(olcek), ciz: (g) => <KasaAcSahnesi g={g} olcek={olcek} s={sure(anahtar)} /> };
    }
    case "kasa_an_taban": {
      // canlıda geç gelen veride AÇ anı en çok bu kadar kısalır: ölçek = taban / bugünkü AÇ (1280)
      const olcek = sure(anahtar) / 1280;
      return { sure: sure(anahtar), kuyruk: 300, olcu: ".ks-ac-an", yontem: "gerçek bileşen (KasaAcAni en kısa hâliyle)",
        canli: "Canlıda yalnız veri geç geldiğinde (gösterim payı azaldığında) görülür; normalde AÇ anı tam süresiyle oynar.",
        ses: acSesleri(olcek), ciz: (g) => <KasaAcSahnesi g={g} olcek={olcek} s={sure(anahtar)} /> };
    }
    case "kasa_devam_an": {
      const s = sure(anahtar);
      const olcek = sureOlcek(anahtar);
      const m = (ms) => Math.round(ms * olcek);
      return { sure: s, kuyruk: 300, olcu: ".ks-carpan-etiket", yontem: "gerçek bileşen (KasaKadran DEVAM anı)", canli: CANLI_PAY_KASA,
        ses: [[m(60), sesRozet], [m(560), sesCoin]],
        ciz: (g, ctx) => {
          const varis = g >= m(560);
          const bitti = g >= s;
          const d = kasaMaci("cevap", { kasa: 18, sahip: null });
          return (
            <KasaKabuk d={d} sahne={<p className="ks-karar-satir qt-h-gir" role="status">{c("Hazine büyüdü")}</p>}
                       kadran={<KasaKadran d={d} c={c} kucuk goster={varis ? 18 : 14} sayiSure={Math.round(900 * olcek)}
                                           hareket={bitti ? [] : varis ? ["vardi"] : ["devam-sars"]}
                                           carpan={bitti ? null : { anahtar: ctx.id, metin: "×1,25", olcek }} />} />
          );
        } };
    }
    case "kasa_kapali_karar": case "kasa_devam_vurus": {
      const kapali = sure("kasa_kapali_karar");
      return { sure: kapali + sure("kasa_devam_vurus"), kuyruk: 200, olcu: ".ks-rk", yontem: "gerçek bileşen (KasaRakipKarar)",
        ses: [[0, sesTurGecis], [kapali, sesJoker]],
        ciz: (g) => <KasaKabuk d={kasaMaci("cevap", { sahip: null })}
                               ust={g < kapali + sure("kasa_devam_vurus") && <KasaRakipKarar asama={g < kapali ? "kapali" : "acik"} ac={false} deger={14} carpan="×1,25" c={c} />} /> };
    }
    case "kasa_sonuc_ucus": return { sure: sure(anahtar), kuyruk: 300, olcu: ".ks-ucan", yontem: "gerçek bileşen (sonuç bandı → mini hazine, anahtar uçuşu)",
      canli: "Sonuç fazı sunucuda 3 sn: 3 sn'yi aşan kısım bir sonraki faza taşar.",
      ses: [[1, sesDogru], [950 * sureOlcek(anahtar), sesCoin], [1180 * sureOlcek(anahtar), sesXpDolma], [1900 * sureOlcek(anahtar), sesJoker]],
      ciz: (g, ctx) => <KasaSonucUcus g={g} ac={ctx} /> };
    case "kasa_final_sahne": {
      const o = sureOlcek(anahtar);
      return { sure: sure(anahtar), kuyruk: 200, olcu: ".ks-final", yontem: "gerçek bileşen (KasaFinalSahnesi)",
        ses: [[150 * o, sesJoker], [1150 * o, sesRozet], [2300 * o, sesCoin], [2450 * o, sesXpDolma], [2900 * o, sesCoin]],
        ciz: (g) => g >= sure(anahtar) ? <Son metin="Oyun burada maç sonu ekranına geçer." /> : <KasaFinalSahnesi kazandim puanOnce={66} puanSonra={80} hedef={80} deger={14} c={c} /> };
    }
    case "kasa_final_kapanis": {
      const o = sureOlcek(anahtar);
      return { sure: sure(anahtar), kuyruk: 200, olcu: ".ks-final", yontem: "gerçek bileşen (KasaFinalSahnesi kaybeden)",
        ses: [[200 * o, sesTurGecis], [1350 * o, sesYanlis]],
        ciz: (g) => g >= sure(anahtar) ? <Son metin="Oyun burada maç sonu ekranına geçer." /> : <KasaFinalSahnesi kazandim={false} puanOnce={31} puanSonra={31} hedef={80} deger={14} c={c} /> };
    }
    case "kasa_cifte": {
      const s = sure(anahtar);
      return { sure: s, kuyruk: 300, olcu: ".ks-cifte", yontem: "gerçek bileşen (KasaCifteBandi)", ses: [[0, sesDogru]],
        ciz: (g) => {
          const d = kasaMaci("sonuc", { kasa: 20, sonuc: { ben_dogru: true, rakip_dogru: true, artis: 6, kasa_once: 14, kasa_sonra: 20, sahip_once: BEN, sahip_sonra: BEN, dogru_cevap: 1 } });
          return <KasaKabuk d={d} sahne={<KasaSonucBandi d={d} c={c} />} ust={g < s ? <KasaCifteBandi artis={6} c={c} /> : null} />;
        } };
    }
    case "kasa_savunma": {
      const s = sure(anahtar);
      return { sure: s, kuyruk: 300, olcu: ".ks-savunma-an", yontem: "gerçek bileşen (KasaSavunmaAni)", ses: [[0, sesYanlis], [0, sesJoker]],
        ciz: (g) => {
          const d = kasaMaci("sonuc", { savunma_hak: [BEN], savunma: { durum: "bekliyor", sahip: BEN },
            sonuc: { ben_dogru: false, rakip_dogru: true, artis: 2, kasa_once: 14, kasa_sonra: 16, sahip_once: BEN, sahip_sonra: BEN, dogru_cevap: 1, savunma: { durum: "bekliyor", sahip: BEN } } });
          return <KasaKabuk d={d} sahne={<KasaSonucBandi d={d} c={c} />} ust={g < s ? <KasaSavunmaAni tip="tetik" benim c={c} /> : null} />;
        } };
    }
    case "kasa_joker_bilgi": {
      const s = sure(anahtar);
      return { sure: s, kuyruk: 300, olcu: ".ks-joker-bilgi", yontem: "gerçek bileşen (KasaJokerBilgi)", ses: [[0, () => sesSkill("ikinci_sans")]],
        ciz: (g) => <KasaKabuk d={kasaMaci("cevap")} ust={g < s ? <KasaJokerBilgi bilgi={{ metin: c("İkinci Şans: bir kez daha dene!") }} /> : null} /> };
    }
    case "kasa_devam_odul": {
      const s = sure(anahtar);
      return { sure: s, kuyruk: 300, olcu: ".ks-devam-an--kazandi", yontem: "gerçek bileşen (KasaDevamOdul)", ses: [[0, sesJoker]],
        canli: "Ödül kaybedilince \"Bu sefer yok\" notu seçilen sürenin 0,6 katı kalır.",
        ciz: (g) => <KasaKabuk d={kasaMaci("cevap", { sahip: null })} ust={g < s ? <KasaDevamOdul an={{ kazandi: true, joker: "elli" }} c={c} /> : null} /> };
    }
    case "kasa_tur_bant": {
      const s = sure(anahtar);
      const sars = Math.round(650 * sureOlcek(anahtar));
      return { sure: s, kuyruk: 300, olcu: ".m2-gecis > span", yontem: "gerçek bileşen (Tur bandı + KasaKadran tur sarsıntısı)", ses: [[0, sesSoruGeldi]],
        ciz: (g) => {
          const d = kasaMaci("cevap");
          return <KasaKabuk d={d} sahne={g < s ? <span className="m2-gecis" aria-hidden="true"><span>{c("Tur {n}/{t}", { n: d.tur, t: d.max_tur })}</span></span> : null}
                            kadran={<KasaKadran d={d} c={c} kucuk hareket={g < sars ? ["tur-sars"] : []} />} />;
        } };
    }
    case "kasa_rakip_joker": {
      const s = sure(anahtar);
      return { sure: s, kuyruk: 300, olcu: ".ks-rakip-joker-an", yontem: "gerçek bileşen (KasaRakipJokerAn + avatar ikonu)", ses: [[0, sesJoker]],
        ciz: (g) => <KasaKabuk d={kasaMaci("cevap", { rakip_joker: ["elli"] })} ust={g < s ? <KasaRakipJokerAn an={{ tur: "elli" }} c={c} /> : null} /> };
    }
    default: return null;
  }
}

// ---------------------------------------------------------------- Hazine giriş sahnesi (sunucuya bağlı; sureler.js'te değil)
export const GIRIS_VARSAYILAN = 6000;
export const GIRIS_SINIR = { min: 3000, max: 8000, oneri: 4000 };
export function girisSahnesi(ms) {
  // Animasyon 6 sn'lik CSS akışı: kısa seçimde baştan kırpılır (canlıda geç gelen istemci de böyle görür), 3-2-1 bitişe göre.
  return { sure: ms, kuyruk: 300, olcu: ".ks-giris-an", yontem: "gerçek bileşen (KasaGirisSahnesi, sunucu süresi yerine seçilen süre)",
    canli: "Canlıda süreyi sunucu belirler (maç başı → ilk soru gösterimi ≈6 sn); bu kaydırıcı yalnız önizlemedir, oyuna yazılmaz.",
    ses: [[650, sesCoin], [1300, sesRozet], [ms - 3000, () => sesTik(3)], [ms - 2000, () => sesTik(2)], [ms - 1000, () => sesTik(1)]].filter(([t]) => t >= 0),
    ciz: (g, ctx) => (
      <div className="m2-mac ks-mac qt-sahne-mac qt-sahne-gok ks-mac--giris">
        <KasaGirisSahnesi hedef={80} acmaMin={10} gecenMs={Math.max(0, GIRIS_VARSAYILAN - ms)} bitisMs={ctx.t0 + ms} c={c} />
      </div>
    ) };
}

// ---------------------------------------------------------------- Düello v4 · sunucuya bağlı sahneler (sureler.js'te yok; yalnız önizleme)
export const D4_KART_VARSAYILAN = 900;
export const D4_SONUC_VARSAYILAN = 3000;
const KATLAR = [{ k: "tarih", ben: 74, rakip: 28 }, { k: "sinema", ben: 38, rakip: 72 }, { k: "muzik", ben: 66, rakip: 40 }, { k: "bilim", ben: 41, rakip: 55 }];
/** Kart gönder (1/2) → kendine seç (2/2): her adımın başında sunucunun duyuru süresi (sayaç durur, kartlar kilitli). */
export function d4KartSahnesi(ms) {
  const bekle = 700;   // duyurudan sonra oyuncunun dokunuşuna kadar
  const adim = ms + bekle;
  return { sure: 2 * adim, kuyruk: 500, olcu: ".d4-kart-yazi", yontem: "gerçek bileşen (Duello4Arena kart fazı, 1/2 ve 2/2)",
    canli: "Duyuru süresi sunucuda (duello4_kart_duyuru_ms): bu kaydırıcı yalnız önizlemeyi değiştirir, oyuna yazılmaz ve kopyalanan seçimlere girmez.",
    ses: [[0, sesTurGecis], [adim, sesTurGecis]],
    ciz: (g, ctx) => {
      const ikinci = g >= adim;
      const bas = ikinci ? adim : 0;
      const d = v4Maci({ faz: "kart", kontrol: BEN, t0: ctx.t0, gosterimBas: ctx.t0 + bas + ms,
        kart: { adim: ikinci ? 1 : 0, kartlar: KATLAR, gonderilen: ikinci ? "tarih" : null } });
      return <Arena4 d={d} simdi={ctx.t0 + g} sn={7} />;
    } };
}
/** Sonuç paneli (seri artışı): sunucu sonuç fazı kadar görünür, sonra sıradaki soru. */
export function d4SonucSahnesi(ms) {
  return { sure: ms, kuyruk: 400, olcu: ".d4-sonuc", yontem: "gerçek bileşen (Duello4Arena sonuç paneli, seri 1/3)",
    canli: "Sonuç fazı süresi sunucuda (sureler.sonuc): bu kaydırıcı yalnız önizlemeyi değiştirir, oyuna yazılmaz ve kopyalanan seçimlere girmez.",
    ciz: (g, ctx) => g >= ms ? <Son metin="Oyun burada sıradaki soruya geçer." /> : (
      <Arena4 d={v4Maci({ faz: "sonuc", kontrol: BEN, t0: ctx.t0, seri: 1, sonHamle: { ...v4Hamle, sonuc: "basarili", kontrol_once: BEN, kontrol_sonra: BEN, seri_once: 0, seri_sonra: 1,
        oyuncular: { [BEN]: { ...v4Hamle.oyuncular[BEN], dogru: true, dogru_cevap: 0 }, [RAKIP]: { ...v4Hamle.oyuncular[RAKIP], dogru: false, dogru_cevap: 0, cevap: 2 } } } })} simdi={ctx.t0 + g} />
    ) };
}
