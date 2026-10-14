// ============================================================
// YÖNETİM › İZLEME (1097) — yalnız sahip (SahipKapisi + sunucu izleme_ozeti › sahip_mi).
// Menüde yok; adres: /yonetim/izleme. Son 24 saat: hata sayısı + en sık 10 hata, olaylar,
// maçlar (mod başına başladı/bitti), aktif kullanıcı, veritabanı sağlığı, uyarı kontrolü.
// Tek RPC + tek ping; otomatik yenileme YOK (nano DB) — "Yenile" düğmesiyle.
// ============================================================
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase.js";
import GeriDugmesi from "../components/GeriDugmesi.jsx";
import { hataMesaji } from "../lib/hata.js";
import { tt, aktifDil } from "../lib/dil.js";
import { QtDugme, QtIskelet, QtKart } from "../tasarim/index.js";
import "../tasarim/ekranlar/izleme.css";

const OLAY_AD = { kayit: "Kayıt", giris: "Giriş (oturum)", kurulum: "Kurulum", davet_eslesti: "Davet eşleşti" };
const MOD_AD = { klasik: "Klasik", duello: "Düello", kasa: "Kasa", grup: "Grup", turnuva: "Turnuva" };

const tarih = (iso) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString(aktifDil() === "en" ? "en-GB" : "tr-TR", { dateStyle: "short", timeStyle: "medium" }); }
  catch { return String(iso); }
};

function Sayi({ ad, deger, ton }) {
  return <div className="yi-sayi" data-ton={ton}><dt>{ad}</dt><dd>{deger ?? "—"}</dd></div>;
}

export default function YonetimIzlemePage() {
  const [ozet, setOzet] = useState(null);
  const [pingMs, setPingMs] = useState(null);
  const [hata, setHata] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    setHata(null);
    try {
      const t0 = performance.now();
      const ping = await supabase.rpc("saglik_ping");
      if (ping.error) throw ping.error;
      setPingMs(Math.round(performance.now() - t0));
      const { data, error } = await supabase.rpc("izleme_ozeti");
      if (error) throw error;
      setOzet(data);
    } catch (e) {
      console.error("[İzleme] özet:", e?.message ?? e);
      setHata(hataMesaji(e, tt("Yüklenemedi.")));
    } finally {
      setYukleniyor(false);
    }
  }, []);
  useEffect(() => { yukle(); }, [yukle]);

  const esikAsildi = ozet && ozet.hata_10dk >= ozet.esik;

  return (
    <div className="yi">
      <GeriDugmesi />
      <div className="yi-ust">
        <h1 className="qt-baslik-1">{tt("İzleme")}</h1>
        <QtDugme tur="ikincil" ikon="yenile" onClick={yukle} disabled={yukleniyor}>{tt("Yenile")}</QtDugme>
      </div>
      {hata && <p className="yi-hata" role="alert">{hata}</p>}
      {!ozet && !hata && <QtIskelet tur="kart" adet={3} />}
      {ozet && (
        <>
          <QtKart className="yi-bolum">
            <h2 className="qt-baslik-3">{tt("Son 24 saat")}</h2>
            <dl className="yi-sayilar">
              <Sayi ad={tt("Hata")} deger={ozet.hata_24s} />
              <Sayi ad={tt("Son 10 dk hata")} deger={`${ozet.hata_10dk} / ${ozet.esik}`} ton={esikAsildi ? "yanlis" : undefined} />
              <Sayi ad={tt("Hata gören kişi")} deger={ozet.hata_kisi_24s} />
              <Sayi ad={tt("Aktif kullanıcı")} deger={ozet.aktif_kullanici} />
            </dl>
          </QtKart>

          <QtKart className="yi-bolum">
            <h2 className="qt-baslik-3">{tt("En sık 10 hata")}</h2>
            {ozet.en_sik.length === 0 ? <p className="yi-alt">{tt("Son 24 saatte hata yok.")}</p> : (
              <table className="yi-tablo">
                <thead><tr><th className="yi-sag">{tt("Adet")}</th><th>{tt("Hata")}</th><th className="yi-sag">{tt("Kişi")}</th></tr></thead>
                <tbody>
                  {ozet.en_sik.map((h, i) => (
                    <tr key={i}>
                      <td className="yi-sag">{h.sayi}</td>
                      <td>
                        <div className="yi-mesaj">[{h.tur}] {h.mesaj}</div>
                        <div className="yi-alt">{h.sayfa} · {tarih(h.son)} · {h.surum || "—"}</div>
                      </td>
                      <td className="yi-sag">{h.kisi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </QtKart>

          <QtKart className="yi-bolum">
            <h2 className="qt-baslik-3">{tt("Olaylar")}</h2>
            <dl className="yi-sayilar">
              {Object.keys(OLAY_AD).map((k) => <Sayi key={k} ad={tt(OLAY_AD[k])} deger={ozet.olaylar?.[k] ?? 0} />)}
            </dl>
            <table className="yi-tablo">
              <thead><tr><th>{tt("Maç")}</th><th className="yi-sag">{tt("Başladı")}</th><th className="yi-sag">{tt("Bitti")}</th></tr></thead>
              <tbody>
                {ozet.maclar.map((m) => (
                  <tr key={m.mod}><td>{tt(MOD_AD[m.mod] ?? m.mod)}</td><td className="yi-sag">{m.basladi}</td><td className="yi-sag">{m.bitti}</td></tr>
                ))}
              </tbody>
            </table>
            <p className="yi-alt">{tt("Maçlar bot maçları dahil, maç tablolarından sayılır.")}</p>
          </QtKart>

          <QtKart className="yi-bolum">
            <h2 className="qt-baslik-3">{tt("Veritabanı ve uyarı")}</h2>
            <dl className="yi-sayilar">
              <Sayi ad={tt("Ping (gidiş-dönüş)")} deger={pingMs != null ? `${pingMs} ms` : "—"} />
              <Sayi ad={tt("Sunucu sorgusu")} deger={`${ozet.sunucu_ms} ms`} />
              <Sayi ad={tt("Veritabanı boyutu")} deger={`${ozet.db_boyut_mb} MB`} />
              <Sayi ad={tt("Bağlantı")} deger={ozet.baglanti} />
            </dl>
            <p className="yi-alt">{tt("Son başarılı uyarı kontrolü")}: <strong>{tarih(ozet.son_kontrol)}</strong> {tt("(5 dakikada bir)")}</p>
            <p className="yi-alt">
              {tt("Son uyarı e-postası")}: <strong>{tarih(ozet.son_uyari)}</strong>
              {ozet.son_uyari && <> · {ozet.son_uyari_sayi} {tt("hata")} · {tt("yanıt")} {ozet.son_uyari_kod ?? "—"}</>}
            </p>
          </QtKart>
        </>
      )}
    </div>
  );
}
