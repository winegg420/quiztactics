// /ana-sayfa-secim — üç ana sayfa seçeneğine büyük bağlantılar (menüde yok).
import { Link } from "react-router-dom";
import { QtIkon } from "../../tasarim/index.js";
import { tt } from "../../lib/dil.js";
import { y } from "../../lib/yol.js";
import "./anasayfa.css";

const SECENEKLER = [
  { yol: "/ana-sayfa-a", harf: "A", ad: "Zengin tek ekran (lobi)", ikon: "oyunKolu",
    tarif: "Kaydırmasız lobi: ortada büyük avatar sahnesi, etrafında lig/coin/rütbe, altta dev Oyna ve Düello." },
  { yol: "/ana-sayfa-b", harf: "B", ad: "Bölümlü kaydırmalı", ikon: "liste",
    tarif: "Üstte oyuncu vitrini, yatay kaydırılan mod kartları, altında davetler, turnuva, görevler ve lig akışı." },
  { yol: "/ana-sayfa-c", harf: "C", ad: "Merkez düzen", ikon: "yildiz",
    tarif: "Oyuncu ortada, modlar etrafında yörüngede; mobilde kendi alt sekme çubuğu, masaüstünde üç panel." },
];

export default function AnaSayfaSecim() {
  return (
    <div className="as-sayfa as-secim">
      <h1 className="as-secim-baslik">{tt("Ana sayfa seçenekleri")}</h1>
      <p className="as-secim-not">{tt("Üçü de gerçek verinle çalışır; beğendiğini seç, asıl ana sayfaya o taşınacak.")}</p>
      <div className="as-secim-liste">
        {SECENEKLER.map((s) => (
          <Link key={s.harf} to={y(s.yol)} className={`as-secim-kart as-secim-kart--${s.harf.toLowerCase()}`}>
            <span className="as-secim-harf" aria-hidden="true">{s.harf}</span>
            <span className="as-secim-metin"><b>{tt(s.ad)}</b><small>{tt(s.tarif)}</small></span>
            <QtIkon ad="ileri" boyut={24} className="as-secim-ok" />
          </Link>
        ))}
      </div>
    </div>
  );
}
