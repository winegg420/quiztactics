// ============================================================
// 404 (Paket 41 I) — bilinmeyen adres artık sessizce ana sayfaya atılmıyor.
// `kapaliMod` verilirse dondurulmuş bir modun eski bağlantısıdır: kısa not + kendiliğinden yönlendirme.
// Tasarım Adım 2 (Yön A): QtBosDurum + QtDugme; davranış aynı.
// ============================================================
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { y } from "../lib/yol.js";
import { tt } from "../lib/dil.js";
import { QtBosDurum, QtDugme, QtKart } from "../tasarim/index.js";
import "../tasarim/ekranlar/g-sayfalar.css";

// Kendiliğinden yönlendirme süresi (kapalı mod notu).
const YONLENDIRME_MS = 2500;

// `kapaliOzellik` (Arayüz Yenileme, 20 Eyl 2026): dondurulmuş bir MOD değil,
// dondurulmuş bir BÖLÜM (meydan / gardırop). Metin ona göre değişir.
export default function BulunamadiPage({ kapaliMod = false, kapaliOzellik = false }) {
  const navigate = useNavigate();
  useEffect(() => {
    if (!kapaliMod) return undefined;
    const t = setTimeout(() => navigate(y(), { replace: true }), YONLENDIRME_MS);
    return () => clearTimeout(t);
  }, [kapaliMod, navigate]);

  const baslik = kapaliOzellik
    ? tt("Bu bölüm şu an kapalı.")
    : kapaliMod
      ? tt("Bu mod şu an kapalı.")
      : tt("Bu sayfa yok.");

  return (
    <div className="g-bulunamadi" role="status">
      <QtKart dolgu="b" className="g-bulunamadi-kart">
        <QtBosDurum
          ikon={kapaliMod ? "kilit" : "haritaPini"}
          ton={kapaliMod ? "vurgu" : "mor"}
          baslik={<span role="heading" aria-level={1}>{baslik}</span>}
          metin={
            kapaliMod
              ? tt("Seni ana sayfaya götürüyoruz…")
              : tt("Adres yanlış yazılmış ya da sayfa kaldırılmış olabilir.")
          }
          eylem={
            <QtDugme ikon="ev" onClick={() => navigate(y(), { replace: true })}>
              {tt("Ana sayfaya dön")}
            </QtDugme>
          }
        />
        {kapaliMod && (
          <span className="g-bulunamadi-sure" aria-hidden="true">
            <span className="g-bulunamadi-sure-dolgu" style={{ animationDuration: `${YONLENDIRME_MS}ms` }} />
          </span>
        )}
      </QtKart>
    </div>
  );
}
