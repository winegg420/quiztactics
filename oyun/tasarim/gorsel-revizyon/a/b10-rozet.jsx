// Bölüm 10 — Rozet sistemi (tasarim/BRIEF_GORSEL_REVIZYON.md › B1.10). Kural + çizim: cizim/rozet.jsx › rozetCiz.
import { GrAday, GrBolum } from "../secim.jsx";
import { QtAvatar } from "../../index.js";
import { AMBLEMLER, Rozet, SEVIYE_AD } from "./cizim/rozet.jsx";
import { AvatarSirasi, Baslikcik } from "./yerinde.jsx";

const UC = ["galibiyet", "ustalik", "seri"];
const EK = ["level", "turnuva", "sosyal"];

function Stil({ stil }) {
  return (
    <div className="ga-kutu">
      <Baslikcik>3 örnek rozet × 4 seviye (64 px; seviye 4 hareketli)</Baslikcik>
      <div className="ga-rozet-izgara">
        {[1, 2, 3, 4].map((s) => <small key={s}>{SEVIYE_AD[s]}</small>)}
        {UC.map((a) => [1, 2, 3, 4].map((s) => <Rozet key={a + s} amblem={a} seviye={s} stil={stil} boyut={64} hareketli />))}
      </div>
      <Baslikcik>İsim yanında vitrin rozetleri (24 px)</Baslikcik>
      <div className="ga-rozet-profil">
        <QtAvatar src="/avatars/pro2/kedili-kiz-y37.svg" ad="Zeynep" boyut="b" />
        <div>
          <b>Zeynep_Karahisarlı</b>
          <span className="ga-rozet-sira"><Rozet amblem="galibiyet" seviye={4} stil={stil} boyut={24} /><Rozet amblem="ustalik" seviye={3} stil={stil} boyut={24} /><Rozet amblem="seri" seviye={2} stil={stil} boyut={24} /></span>
        </div>
      </div>
      <Baslikcik>24 px · siluet · gri ton (seviye 1→4)</Baslikcik>
      <div className="ga-lig-test">
        <span>{[1, 2, 3, 4].map((s) => <Rozet key={s} amblem="seri" seviye={s} stil={stil} boyut={24} />)}</span>
        <span className="ga-test--siluet">{[1, 2, 3, 4].map((s) => <Rozet key={s} amblem="seri" seviye={s} stil={stil} boyut={24} />)}</span>
        <span className="ga-test--gri">{[1, 2, 3, 4].map((s) => <Rozet key={s} amblem="galibiyet" seviye={s} stil={stil} boyut={24} />)}</span>
      </div>
      <Baslikcik>Kural aynı: başka amblemler (level, turnuva, sosyal)</Baslikcik>
      <div className="ga-yan">{EK.map((a, i) => <Rozet key={a} amblem={a} seviye={i + 2} stil={stil} boyut={56} />)}</div>
      <AvatarSirasi boyut={44}><Rozet amblem="galibiyet" seviye={3} stil={stil} boyut={48} /></AvatarSirasi>
      <pre className="ga-kod">{`rozetCiz({ amblem: "seri", seviye: 3, stil: "${stil}" })
// ${Object.keys(AMBLEMLER).length} amblem hazır; ~15 amblem × 4 seviye ≈ 100 rozet`}</pre>
    </div>
  );
}

export default function B10Rozet() {
  return (
    <GrBolum no={10} baslik="Rozet sistemi" tur="sec"
      aciklama="Rozet = temel amblem (ne için) × seviye (Bronz, Gümüş, Altın, Elmas) × stil. Her amblemin kendi zemin rengi var (bugünkü 101 rozetin birbirine benzemesi biter); seviye yalnız kenar metalini değil SİLUETİ de değiştirir. Aynı kuralla ~15 amblemden ~100 rozet çıkar."
      ic={4} gosterilen={2}
      elenen="Tek renk düz yıldız rozet (clip-art, A4) · kalkan zeminli rozet (lig amblemlerinin eski 'antivirüs kalkanı'na döndü)">
      <GrAday kod="rozet-madalyon" baslik="1 — Madalyon" fikir="Metal kenarlı yuvarlak madalyon. Seviye 2 kurdele kuyrukları, 3 defne dalları, 4 taç + kenar taşları + ışıltı." genis
        testler={{ siluet: true, kucuk: true, gri: true, set: true, avatar: true, hedef: true, mobil: true }}>
        <Stil stil="madalyon" />
      </GrAday>
      <GrAday kod="rozet-altigen" baslik="2 — Altıgen" fikir="Fasetli metal altıgen plaka. Seviye 2 yan kanatçıklar, 3 üst ve alt sivri tepe, 4 arkada dönen ışın yıldızı + tepe taşı + ışıltı." genis
        testler={{ siluet: true, kucuk: true, gri: true, set: true, avatar: true, hedef: true, mobil: true }}>
        <Stil stil="altigen" />
      </GrAday>
    </GrBolum>
  );
}
