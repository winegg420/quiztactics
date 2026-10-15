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
const MOD_AD = { klasik: "Klasik", duello: "Düello", kasa: "Kasa", grup: "Grup", turnuva: "Turnuva", saf_bilgi: "Saf Bilgi" };
// 1107 Huni: adım etiketleri (hesap = kohort tabanı; D1/D7 kayda göre — tutundurma)
const HUNI_AD = { kurulum: "Kurulum", hesap: "Hesap / misafir", mac1: "İlk maçı bitirdi", mac2: "İkinci maçı bitirdi", d1: "Ertesi gün döndü (D1)", d7: "7. gün döndü (D7)" };

const tarih = (iso) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString(aktifDil() === "en" ? "en-GB" : "tr-TR", { dateStyle: "short", timeStyle: "medium" }); }
  catch { return String(iso); }
};

// Huni çubukları: mac1 ← hesap, mac2 ← mac1, d1/d7 ← kayıt gününden olgunlaşan kohort (taban).
// "En büyük düşüş" yalnız hesap → ilk maç → ikinci maç ve D1'de aranır (D7 doğal erime sayılır).
function huniSatirlari(h) {
  const n = (k) => h.adimlar.find((a) => a.k === k) ?? { n: 0 };
  const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : null);
  const hesap = n("hesap").n;
  const satirlar = [
    { k: "kurulum", n: n("kurulum").n, yuzde: pct(n("kurulum").n, hesap), etiket: "hesaba göre" },
    { k: "hesap", n: hesap, yuzde: hesap > 0 ? 100 : null, etiket: "kohort" },
    { k: "mac1", n: n("mac1").n, yuzde: pct(n("mac1").n, hesap), etiket: "hesaba göre" },
    { k: "mac2", n: n("mac2").n, yuzde: pct(n("mac2").n, n("mac1").n), etiket: "ilk maça göre" },
    { k: "d1", n: n("d1").n, taban: n("d1").taban, yuzde: pct(n("d1").n, n("d1").taban), etiket: "olgunlaşan kayda göre" },
    { k: "d7", n: n("d7").n, taban: n("d7").taban, yuzde: pct(n("d7").n, n("d7").taban), etiket: "olgunlaşan kayda göre" },
  ];
  let enBuyuk = null;
  for (const k of ["mac1", "mac2", "d1"]) {
    const r = satirlar.find((x) => x.k === k);
    if (r.yuzde == null) continue;
    const dusus = 100 - r.yuzde;
    if (dusus > 0 && (enBuyuk == null || dusus > enBuyuk.dusus)) enBuyuk = { k, dusus };
  }
  return { satirlar, enBuyuk: enBuyuk?.k ?? null };
}

function Huni({ gun, onGun }) {
  const [h, setH] = useState(null);
  const [hata, setHata] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  useEffect(() => {
    let iptal = false;
    (async () => {
      setYukleniyor(true);
      setHata(null);
      try {
        const { data, error } = await supabase.rpc("izleme_funnel", { p_gun: gun });
        if (error) throw error;
        if (!iptal) setH(data);
      } catch (e) {
        console.error("[İzleme] huni:", e?.message ?? e);
        if (!iptal) setHata(hataMesaji(e, tt("Yüklenemedi.")));
      } finally {
        if (!iptal) setYukleniyor(false);
      }
    })();
    return () => { iptal = true; };
  }, [gun]);
  const { satirlar, enBuyuk } = h ? huniSatirlari(h) : { satirlar: [], enBuyuk: null };
  const tavan = Math.max(1, ...satirlar.map((x) => x.n));
  const haric = h?.haric ?? {};
  return (
    <QtKart className="yi-bolum">
      <div className="yi-ust">
        <h2 className="qt-baslik-3">{tt("Huni")}</h2>
        <div className="yi-gun" role="group" aria-label={tt("Kohort")}>
          {[7, 30].map((g) => (
            <button key={g} type="button" className="yi-gun-dugme" aria-pressed={gun === g} onClick={() => onGun(g)}>
              {tt("Son {n} gün", { n: g })}
            </button>
          ))}
        </div>
      </div>
      {hata && <p className="yi-hata" role="alert">{hata}</p>}
      {!h && !hata && <QtIskelet tur="kart" adet={1} />}
      {h && (
        <div aria-busy={yukleniyor}>
          <p className="yi-alt">{tt("Kayıt gününe göre kohort")}: <strong>{h.kohort}</strong> {tt("kişi")}</p>
          <ol className="yi-huni">
            {satirlar.map((r) => (
              <li key={r.k} className="yi-huni-satir" data-vurgu={r.k === enBuyuk ? "1" : undefined}>
                <div className="yi-huni-ust">
                  <span>{tt(HUNI_AD[r.k])}{r.k === enBuyuk ? <b className="yi-huni-rozet">{tt("en büyük düşüş")}</b> : null}</span>
                  <span className="yi-huni-sayi">{r.n}{r.taban != null ? ` / ${r.taban}` : ""} · {r.yuzde != null ? `%${r.yuzde}` : "—"}</span>
                </div>
                <div className="yi-huni-cubuk" aria-hidden="true"><i style={{ width: `${Math.round((r.n / tavan) * 100)}%` }} /></div>
                <div className="yi-alt">{tt(r.etiket)}</div>
              </li>
            ))}
          </ol>
          <h3 className="yi-huni-alt-baslik">{tt("İlk maçın modu")}</h3>
          {h.ilk_mod.length === 0 ? <p className="yi-alt">{tt("Henüz maç yok.")}</p> : (
            <table className="yi-tablo">
              <thead><tr><th>{tt("Mod")}</th><th className="yi-sag">{tt("Kişi")}</th><th className="yi-sag">{tt("Terk")}</th></tr></thead>
              <tbody>{h.ilk_mod.map((m) => <tr key={m.mod}><td>{tt(MOD_AD[m.mod] ?? m.mod)}</td><td className="yi-sag">{m.n}</td><td className="yi-sag">{m.terk}</td></tr>)}</tbody>
            </table>
          )}
          <p className="yi-alt">
            {tt("İlk maçını terk eden")}: <strong>{h.ilk_terk}</strong> / {h.mac_oynayan}
            {h.mac_oynayan > 0 ? ` (%${Math.round((h.ilk_terk / h.mac_oynayan) * 100)})` : ""} · {tt("Toplam terk")}: {h.terk_toplam}
          </p>
          <p className="yi-alt">
            {tt("Hariç tutulan")}: {tt("bot")} {(haric.bot ?? 0) + (haric.acik_bot ?? 0)} · {tt("araç/test hesabı")} {(haric.arac_hesabi ?? 0) + (haric.test_adi ?? 0)} · {tt("sahip")} {haric.sahip ?? 0}. {tt("Bitirdi: maç bitti ve terk edilmedi. Kurulum olayı 14 Ekim'den beri kaydedilir; eski hesaplar kayıttan başlar.")}
          </p>
        </div>
      )}
    </QtKart>
  );
}

function Sayi({ ad, deger, ton }) {
  return <div className="yi-sayi" data-ton={ton}><dt>{ad}</dt><dd>{deger ?? "—"}</dd></div>;
}

export default function YonetimIzlemePage() {
  const [ozet, setOzet] = useState(null);
  const [pingMs, setPingMs] = useState(null);
  const [hata, setHata] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [huniGun, setHuniGun] = useState(7);

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
          <Huni gun={huniGun} onGun={setHuniGun} />

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
