// Bölüm 8 — Turnuva Şampiyonu çerçevesi: 2 aday, kupa/defne kimliği; Altın Lig'e benzemez (yan yana gösterilir).
import Avatar from "../../../../src/components/Avatar.jsx";
import Cerceve2 from "../../premium/tur2/Cerceve2.jsx";
import { GrBolum, GrAday } from "../secim.jsx";
import GrCerceve from "./GrCerceve.jsx";
import { TURNUVA, TURNUVA_EFEKT } from "./cizim/turnuva.js";
import { profil, AVATARLAR, Sahne, Boy, Alt, useIc } from "./ortak.jsx";

function T({ t, boyut, hareketli = false, i = 0 }) {
  return (
    <GrCerceve cizim={(k) => TURNUVA[t](k)} anahtar={`tr:${t}`} efekt={TURNUVA_EFEKT[t]} boyut={boyut} hareketli={hareketli} etiket="Turnuva Şampiyonu çerçevesi">
      <Avatar profile={profil(i)} boyut={boyut} />
    </GrCerceve>
  );
}

function Goster({ t, ic = false }) {
  return (
    <div className="grb-kart-yer">
      <Sahne className="grb-sahne--vitrin"><T t={t} boyut={132} hareketli i={0} /></Sahne>
      <Alt baslik="Gerçek boylar — 88 profil · 76 maç sonu · 64 ana sayfa · 48 maç şeridi · 40 lig tablosu">
        <Sahne className="grb-sahne--sikisik">
          {[88, 76, 64, 48, 40].map((b, j) => <Boy key={b} px={b}><T t={t} boyut={b} i={j} /></Boy>)}
        </Sahne>
      </Alt>
      {!ic && (
        <>
          <Alt baslik="6 avatarla — 64 px, açık zeminde">
            <Sahne koyu={false} className="grb-sahne--sikisik">{AVATARLAR.map((_, j) => <T key={j} t={t} boyut={64} i={j} />)}</Sahne>
          </Alt>
          <Alt baslik="Altın Lig ile karışıyor mu? — 76 px">
            <Sahne className="grb-sahne--sikisik">
              <Boy etiket="Turnuva Şampiyonu"><T t={t} boyut={76} i={2} /></Boy>
              <Boy etiket="Altın Lig (oyundaki)"><Cerceve2 tur="altinlig" boyut={76}><Avatar profile={profil(2)} boyut={76} /></Cerceve2></Boy>
            </Sahne>
          </Alt>
          <Alt baslik="Siluet ve gri — 64 · 40 px">
            <Sahne koyu={false} className="grb-sahne--sikisik grb-siluet"><T t={t} boyut={64} /><T t={t} boyut={40} /></Sahne>
            <Sahne className="grb-sahne--sikisik grb-gri"><T t={t} boyut={64} /><T t={t} boyut={40} /></Sahne>
          </Alt>
        </>
      )}
    </div>
  );
}

export default function B8Turnuva() {
  const ic = useIc();
  return (
    <GrBolum no={8} baslik="Turnuva Şampiyonu çerçevesi" tur="sec"
             aciklama="Turnuva birincisinin kazandığı çerçeve (satılmaz). Kimlik: kupa + zümrüt defne + kırmızı kurdele ve '1'. Altın Lig'deki altın halka, altın defne ve taç kullanılmadı; yan yana karşılaştırma içeride. Büyük gösterimde altın yansıması, yıldız parıltısı ve yükselen altın tozu."
             ic={4} gosterilen={2}
             elenen="C Kürsü (altta 1-2-3 basamağı: 40 px'te dikdörtgen yığın, kupa kimliği yok) · D Madalya Kurdelesi (tepede V kurdele + altın halka: Altın Lig ve level çerçeveleriyle karıştı)"
             zayif="40 px'te kupa küçük kalıyor; kimliği lacivert halka + tepedeki kupa silueti (A) ya da yan kulplar (B) taşıyor.">
      <GrAday kod="kupa-tepesi" baslik="A — Kupa Tepesi" genis
              fikir="Lacivert mine halka, çevresinde altın çiviler; iki yandan yükselen zümrüt defne; tepede büyük altın kupa (yıldızlı), altta kırmızı kurdele üstünde altın '1' madalyonu."
              testler={{ siluet: true, kucuk: true, gri: true, avatar: true, hedef: true, mobil: true }}>
        <Goster t="a" />
      </GrAday>
      <GrAday kod="kupa-ici" baslik="B — Kupanın İçinde" genis
              fikir="Çerçeve kupanın kendisi: avatar kupanın ağzında, yanlarda büyük kulplar, altta kase + kırmızı şerit, ayak ve lacivert kaide üstünde '1' plakası; tepede üç yıldız. Arkada dönen altın hüzme."
              testler={{ siluet: true, kucuk: true, gri: true, avatar: true, hedef: true, mobil: true }}>
        <Goster t="b" />
      </GrAday>
      {ic && (
        <>
          <GrAday kod="ic-c" baslik="(iç) C — Kürsü" genis><Goster t="c" ic /></GrAday>
          <GrAday kod="ic-d" baslik="(iç) D — Madalya Kurdelesi" genis><Goster t="d" ic /></GrAday>
        </>
      )}
    </GrBolum>
  );
}
