// ============================================================
// 404 (Paket 41 I) — bilinmeyen adres artık sessizce ana sayfaya atılmıyor.
// `kapaliMod` verilirse dondurulmuş bir modun eski bağlantısıdır: kısa not + kendiliğinden yönlendirme.
// ============================================================
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Maskot from "../components/Maskot.jsx";
import { y } from "../lib/yol.js";
import { tt } from "../lib/dil.js";

// `kapaliOzellik` (Arayüz Yenileme, 20 Eyl 2026): dondurulmuş bir MOD değil,
// dondurulmuş bir BÖLÜM (meydan / gardırop). Metin ona göre değişir.
export default function BulunamadiPage({ kapaliMod = false, kapaliOzellik = false }) {
  const navigate = useNavigate();
  useEffect(() => {
    if (!kapaliMod) return undefined;
    const t = setTimeout(() => navigate(y(), { replace: true }), 2500);
    return () => clearTimeout(t);
  }, [kapaliMod, navigate]);
  return (
    <div className="kart bd-bos-durum" role="status">
      <Maskot poz="dusunuyor" boyut={86} />
      <h1 className="baslik" style={{ marginTop: 8 }}>
        {kapaliOzellik
          ? tt("Bu bölüm şu an kapalı.")
          : kapaliMod
            ? tt("Bu mod şu an kapalı.")
            : tt("Bu sayfa yok.")}
      </h1>
      <p>
        {kapaliMod
          ? tt("Seni ana sayfaya götürüyoruz…")
          : tt("Adres yanlış yazılmış ya da sayfa kaldırılmış olabilir.")}
      </p>
      <button type="button" className="btn" onClick={() => navigate(y(), { replace: true })}>
        {tt("Ana sayfaya dön")}
      </button>
    </div>
  );
}
