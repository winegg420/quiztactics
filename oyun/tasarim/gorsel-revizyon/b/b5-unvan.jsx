// Bölüm 5 — Unvan görünümü: 2 yazı stili + ~20 örnek unvanlık liste (liste de onaylanacak; notlar bölüm notuna).
import CerceveliAvatar from "../../../components/CerceveliAvatar.jsx";
import { AltinIsim } from "../../../components/IsimEfekti.jsx";
import { LigAmblemiA } from "../a/cizim/lig.jsx";
import { GrBolum, GrAday } from "../secim.jsx";
import { Unvan, UNVAN_LISTESI, UNVAN_TURLERI } from "./cizim/unvan.jsx";
import { BEN, RAKIP } from "./b4-kart.jsx";
import { Alt, useIc } from "./ortak.jsx";

function Yerler({ stil }) {
  return (
    <div className="grb-kart-yer">
      <Alt baslik="Profil başı — isim altında">
        <div className="grb-un-profil">
          <CerceveliAvatar profile={BEN} boyut={88} cerceve={null} aura={null} premiumCerceve={BEN.pc} premiumAura={BEN.pa} />
          <div className="grb-un-profil-metin">
            <span className="grb-un-ad"><AltinIsim>{BEN.gorunen_ad}</AltinIsim><LigAmblemiA lig="altin" boyut={22} /></span>
            <Unvan tur="sehir" stil={stil} boy="b">Afyonkarahisar Şampiyonu</Unvan>
          </div>
        </div>
      </Alt>
      <Alt baslik="Koyu sahnede (VS / maç sonu)">
        <div className="qt-sahne-mac grb-un-koyu">
          <span className="grb-un-ad grb-un-ad--koyu">{RAKIP.gorunen_ad}</span>
          <Unvan tur="basari" stil={stil} koyu>Tarih Ustası</Unvan>
          <Unvan tur="sezon" stil={stil} koyu>Sezon 1 Efsanesi</Unvan>
          <Unvan tur="lig" stil={stil} koyu>Efsane Lig Şampiyonu</Unvan>
        </div>
      </Alt>
      <Alt baslik="Bütün liste bu stilde — liste boyu (11,5 px)">
        <div className="grb-un-liste">
          {UNVAN_LISTESI.map((u) => <Unvan key={u.metin} tur={u.tur} stil={stil} boy="k">{u.metin}</Unvan>)}
        </div>
      </Alt>
    </div>
  );
}

/** Onaya sunulan unvan listesi: tür · unvan · nasıl kazanılır. */
function Liste() {
  return (
    <article className="gr-aday gr-aday--genis grb-un-tablo-kap">
      <header className="gr-aday-bas"><h3 className="qt-baslik-3">Unvan listesi — onay için (20)</h3></header>
      <p className="qt-kucuk gr-fikir">Dört tür: şehir şampiyonu, lig, sezon, başarı. Eklemek, çıkarmak ya da adını değiştirmek istediklerini aşağıdaki "Bölüm 5 için not" alanına yaz.</p>
      <div className="grb-un-tablo" role="table" aria-label="Unvan listesi">
        <div role="row" className="grb-un-tr grb-un-th"><span role="columnheader">Tür</span><span role="columnheader">Unvan</span><span role="columnheader">Nasıl kazanılır</span></div>
        {UNVAN_LISTESI.map((u) => (
          <div role="row" key={u.metin} className="grb-un-tr">
            <span role="cell" className="grb-un-tur">{UNVAN_TURLERI[u.tur].ad}</span>
            <span role="cell"><b>{u.metin}</b></span>
            <span role="cell" className="grb-un-kaz">{u.kazanma}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

export default function B5Unvan() {
  const ic = useIc();
  return (
    <GrBolum no={5} baslik="Unvan görünümü" tur="sec"
             aciklama="Unvan isim altında duran, kazanılan yazı. Yazı her zaman lacivert (koyu zeminde krem) — kontrast ≥ 7; tür rengi yalnız simgede, kurdele ucunda ve çizgide. Uzun unvan tek satır, sığmazsa '…'. Aşağıda iki stil ve onaylanan unvan listesi."
             ic={4} gosterilen={2}
             elenen="C Koyu plaka (kutulu koyu levha: Premium önizlemede girmeyen 'isim plakası' dilinin aynısı, altın isimle yarıştı) · D Emoji önekli düz yazı (🏆 + metin: clip-art/stok ikon hissi, koyu zeminde emoji çamurlaştı)"
             zayif="Liste boyunda (11,5 px) kurdele stili 'Afyonkarahisar Şampiyonu'yu dar satırda '…' ile kısaltıyor.">
      <GrAday kod="kurdele" baslik="Stil 1 — Kurdele" genis
              fikir="Açık tonlu küçük kurdele, kalın lacivert kontur, çatal uçlar tür renginde; solda tür simgesi (şehir: iğne + taç · lig: defne + yıldız · sezon: bayrak · başarı: madalya)."
              testler={{ kucuk: true, avatar: true, hedef: true, mobil: true }}>
        <Yerler stil="kurdele" />
      </GrAday>
      <GrAday kod="isik" baslik="Stil 2 — Işık yazısı" genis
              fikir="Kutusuz: tür simgesi + küçük büyük harf lacivert yazı + altında tür renginde ince ışık çizgisi. Daha sakin; altın isimle yarışmaz."
              testler={{ kucuk: true, avatar: true, hedef: true, mobil: true }}>
        <Yerler stil="isik" />
      </GrAday>
      <Liste />
      {ic && (
        <GrAday kod="ic" baslik="(iç) C Koyu plaka · D Emoji önekli">
          <div className="grb-un-liste">
            <span className="grb-un-ic-plaka">Afyonkarahisar Şampiyonu</span>
            <span>🏆 Afyonkarahisar Şampiyonu</span>
          </div>
        </GrAday>
      )}
    </GrBolum>
  );
}
