/**
 * KATEGORİ PROFİLİ (Paket 14, 4.8 / 4.10) — oyuncu kartı ve profil.
 * Sunucu: oyuncu_kategori_profili (asgari örneklemin altında yüzde gelmez).
 * Hiç maçı yoksa "Hiç maç yapmadı, istatistiği yok"; varsa kaç maç yaptığı
 * ve kaç maçın istatistiği olduğu yazar. En güçlü kategori unvan olur.
 */
import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase.js";
import KategoriIkon from "./KategoriIkon.jsx";
import { kategoriAdi, kategorileriSirala } from "../lib/kategoriler.js";
import { unvanAdi } from "../lib/unvanlar.js";
import { useDil } from "../lib/dilKanca.js";
import { QtIlerleme, QtIskelet, QtRozet } from "../tasarim/index.js";
import "../tasarim/ekranlar/dukkan-bilesen.css";

export default function KategoriProfili({ userId, profil: disaridan = null, kucuk = false }) {
  const { ceviri } = useDil();
  // Paket 42 K.1: undefined = yükleniyor, null = veri yok. Eskiden RPC boş dönünce iskelet
  // (60 px + kenar boşlukları ≈ 90 px) sonsuza dek yer tutuyordu; artık blok hiç çizilmez.
  const [profil, setProfil] = useState(disaridan ?? undefined);
  const [hata, setHata] = useState(false);

  useEffect(() => {
    if (disaridan) { setProfil(disaridan); return; }
    if (!userId) return;
    let aktif = true;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("oyuncu_kategori_profili", { p_user: userId });
        if (error) throw error;
        if (aktif) setProfil(data ?? null);
      } catch (e) {
        console.error("[Bildim] kategori profili alinamadi:", e);
        if (aktif) setHata(true);
      }
    })();
    return () => { aktif = false; };
  }, [userId, disaridan]);

  if (hata || (!userId && !disaridan)) return null;
  if (profil === undefined) {
    return (
      <div className={"qt-dk-kprofil" + (kucuk ? " qt-dk-kprofil--kucuk" : "")} aria-busy="true">
        <QtIskelet tur="metin" adet={kucuk ? 2 : 4} />
      </div>
    );
  }
  if (!profil) return null;

  const toplamMac = Number(profil.toplam_mac ?? 0);
  const istatistikli = Number(profil.istatistikli_mac ?? 0);
  const unvan = unvanAdi(profil.unvan);

  if (toplamMac === 0 && istatistikli === 0) {
    return (
      <div className={"qt-dk-kprofil" + (kucuk ? " qt-dk-kprofil--kucuk" : "")}>
        <p className="qt-kucuk qt-soluk">{ceviri("Hiç maç yapmadı, istatistiği yok")}</p>
      </div>
    );
  }

  const satirlar = kategorileriSirala(
    (profil.kategoriler ?? []).filter((k) => k.kategori !== "genel" && k.kategori !== "karisik")
  );

  return (
    <div className={"qt-dk-kprofil" + (kucuk ? " qt-dk-kprofil--kucuk" : "")}>
      <div className="qt-dk-kprofil-ust">
        {unvan && <QtRozet ton="coin" ikon="madalya" boyut="k">{ceviri(unvan)}</QtRozet>}
        <span className="qt-kucuk qt-soluk">
          {ceviri("{mac} maç · {istatistikli} maçın istatistiği", { mac: toplamMac, istatistikli })}
        </span>
      </div>
      {satirlar.length === 0 ? (
        <p className="qt-kucuk qt-soluk">{ceviri("Henüz kategori istatistiği yok")}</p>
      ) : (
        <ul className="qt-dk-kprofil-liste">
          {satirlar.map((k) => {
            const ad = ceviri(kategoriAdi(k.kategori));
            const yok = k.yuzde === null || k.yuzde === undefined;
            return (
              <li key={k.kategori} className="qt-dk-kprofil-satir">
                <KategoriIkon anahtar={k.kategori} boyut={18} plaka />
                <span className="qt-dk-kprofil-ad">{ad}</span>
                {yok ? (
                  <span className="qt-dk-kprofil-yok">{ceviri("veri yok")}</span>
                ) : (
                  <>
                    <QtIlerleme deger={Number(k.yuzde)} en={100} ton="dogru"
                                etiket={ceviri("{0}: doğru oranı", { 0: ad })} className="qt-dk-kprofil-bar" />
                    <span className="qt-dk-kprofil-yuzde qt-sayi">{ceviri("%{0}", { 0: k.yuzde })}</span>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
