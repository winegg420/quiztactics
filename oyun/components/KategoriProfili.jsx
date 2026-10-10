/**
 * KATEGORİ PROFİLİ (Paket 14, 4.8 / 4.10) — oyuncu kartı ve profil.
 * Sunucu: oyuncu_kategori_profili (asgari örneklemin altında yüzde gelmez).
 * Hiç maçı yoksa "Hiç maç yapmadı, istatistiği yok"; varsa "N maçtan istatistik" yazar. En güçlü kategori unvan olur.
 * N = oyuncu_istatistik.istatistikli_mac: cevap kaydı olan maç sayısı (204: maç bitince +1, geri doldurma cevap
 * tablolarından). "Son N maç" DEĞİL — bütün geçmiş; toplam_mac'tan küçük olabilir (cevapsız/eski maçlar sayılmaz).
 * `ustalik` (yalnız Profil, tutarlılık turu 2 — 10 Eki 2026): ustalik_seviyelerim satırları verilirse "Kategori ustalığı" bu
 * listeyle birleşir — satır: ikon · ad · rütbe rozeti · doğru oranı çubuğu · yüzde; altında "N doğru · X için K kaldı".
 * Sıra ustalık sırası (en çok doğru üstte); verisi olmayan kategori (0 doğru, yüzde yok) çizilmez. Oyuncu kartı (`kucuk`)
 * ve `ustalik` verilmeyen her kullanım eski görünümde kalır.
 */
import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase.js";
import KategoriIkon, { KATEGORI_RENK } from "./KategoriIkon.jsx";
import { kategoriAdi, kategorileriSirala } from "../lib/kategoriler.js";
import { unvanAdi } from "../lib/unvanlar.js";
import { useDil } from "../lib/dilKanca.js";
import { QtIlerleme, QtIskelet, QtRozet, sayiBicim } from "../tasarim/index.js";
import { ttSunucu } from "../lib/dil.js";
import { SEVIYE_KOD } from "./UstalikIzgarasi.jsx";
import "../tasarim/ekranlar/dukkan-bilesen.css";

export default function KategoriProfili({ userId, profil: disaridan = null, kucuk = false, ustalik = null }) {
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

  if (Array.isArray(ustalik) && !kucuk) {
    const yuzdeler = new Map((profil.kategoriler ?? []).map((k) => [k.kategori, k.yuzde]));
    const gorulen = new Set();
    const birlesik = [];
    for (const u of ustalik) {
      if (u.kategori === "genel" || u.kategori === "karisik") continue;
      gorulen.add(u.kategori);
      const yuzde = yuzdeler.get(u.kategori);
      if (!(Number(u.dogru_sayisi) > 0) && (yuzde === null || yuzde === undefined)) continue;
      birlesik.push({ ...u, yuzde });
    }
    for (const k of profil.kategoriler ?? []) {
      if (gorulen.has(k.kategori) || k.kategori === "genel" || k.kategori === "karisik") continue;
      if (k.yuzde !== null && k.yuzde !== undefined) birlesik.push({ kategori: k.kategori, dogru_sayisi: 0, yuzde: k.yuzde });
    }
    const toplamDogru = ustalik.reduce((t, u) => t + (Number(u.dogru_sayisi) || 0), 0);
    return (
      <div className="qt-dk-kprofil qt-dk-kprofil--birlesik">
        <div className="qt-dk-kprofil-ust">
          {unvan && <QtRozet ton="coin" ikon="madalya" boyut="k">{ceviri(unvan)}</QtRozet>}
          <span className="qt-kucuk qt-soluk">
            {istatistikli > 0 && <>{ceviri("{n} maçtan istatistik", { n: istatistikli })} · </>}
            <b className="qt-dk-kpb-dogru">{ceviri("{n} doğru", { n: sayiBicim(toplamDogru) })}</b>
          </span>
        </div>
        {birlesik.length === 0 ? (
          <p className="qt-kucuk qt-soluk">{ceviri("Henüz kategori istatistiği yok")}</p>
        ) : (
          <ul className="qt-dk-kprofil-liste">
            {birlesik.map((k) => {
              const ad = ceviri(kategoriAdi(k.kategori));
              const yok = k.yuzde === null || k.yuzde === undefined;
              const sifir = !yok && Number(k.yuzde) === 0;
              return (
                <li key={k.kategori} className="qt-dk-kpb" style={{ "--kp-r": KATEGORI_RENK[k.kategori] ?? KATEGORI_RENK.karisik }}>
                  <span className="qt-dk-kpb-ik"><KategoriIkon anahtar={k.kategori} boyut={18} plaka /></span>
                  <span className="qt-dk-kpb-ad">
                    <span className="qt-dk-kprofil-ad">{ad}</span>
                    {k.seviye && <span className={`qt-dk-ustalik-seviye${SEVIYE_KOD[k.seviye] ? ` qt-dk-ustalik-seviye--${SEVIYE_KOD[k.seviye]}` : ""}`}>{ttSunucu(k.seviye)}</span>}
                  </span>
                  {yok || sifir ? (
                    <span className="qt-dk-kprofil-yok qt-dk-kpb-yz">{yok ? ceviri("veri yok") : ceviri("%{0}", { 0: k.yuzde })}</span>
                  ) : (
                    <>
                      <QtIlerleme deger={Number(k.yuzde)} en={100} ton="dogru" konturlu
                                  etiket={ceviri("{0}: doğru oranı", { 0: ad })} className="qt-dk-kprofil-bar qt-dk-kpb-cb" />
                      <span className="qt-dk-kprofil-yuzde qt-sayi qt-dk-kpb-yz">{ceviri("%{0}", { 0: k.yuzde })}</span>
                    </>
                  )}
                  <span className="qt-dk-ustalik-alt qt-dk-kpb-alt">
                    {ceviri("{n} doğru", { n: k.dogru_sayisi ?? 0 })}
                    {k.sonraki_esik
                      ? ceviri(" · {0} için {1} kaldı", { 0: ttSunucu(k.sonraki_seviye), 1: k.sonraki_esik - (k.dogru_sayisi ?? 0) })
                      : k.seviye ? ceviri(" · en üst seviye") : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
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
        {istatistikli > 0 && (
          <span className="qt-kucuk qt-soluk">{ceviri("{n} maçtan istatistik", { n: istatistikli })}</span>
        )}
      </div>
      {satirlar.length === 0 ? (
        <p className="qt-kucuk qt-soluk">{ceviri("Henüz kategori istatistiği yok")}</p>
      ) : (
        <ul className="qt-dk-kprofil-liste">
          {satirlar.map((k) => {
            const ad = ceviri(kategoriAdi(k.kategori));
            const yok = k.yuzde === null || k.yuzde === undefined;
            const sifir = !yok && Number(k.yuzde) === 0;   // %0 çubuğu çizilmez (boş iz gürültü); yüzde yazısı kalır
            return (
              <li key={k.kategori} className="qt-dk-kprofil-satir" style={{ "--kp-r": KATEGORI_RENK[k.kategori] ?? KATEGORI_RENK.karisik }}>
                <KategoriIkon anahtar={k.kategori} boyut={18} plaka />
                <span className="qt-dk-kprofil-ad">{ad}</span>
                {yok || sifir ? (
                  <span className="qt-dk-kprofil-yok">{yok ? ceviri("veri yok") : ceviri("%{0}", { 0: k.yuzde })}</span>
                ) : (
                  <>
                    <QtIlerleme deger={Number(k.yuzde)} en={100} ton="dogru" konturlu={!kucuk}
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
