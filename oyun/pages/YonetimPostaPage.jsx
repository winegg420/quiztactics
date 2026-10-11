// ============================================================
// YÖNETİM › POSTA GÖNDER (1060) — yalnız kurucu hesap (istemci: SahipKapisi · sunucu: sahip_mi()).
// Adres: /yonetim/posta (menüde yok). Tür (Ödüllü / Duyuru) · hedef (tek oyuncu / herkes / lig) ·
// başlık + metin TR/EN · ödül kalemleri · bitiş (varsayılan 7 gün). Gönder'den önce oyuncunun göreceği
// önizleme; "herkese" gönderimde ayrıca onay. Altta gönderilmiş postalar: okuyan · alan · Bitir.
// ============================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import GeriDugmesi from "../components/GeriDugmesi.jsx";
import PostaDetay from "../components/PostaDetay.jsx";
import { OdulGorsel } from "../tasarim/sezon-yolu/OdulGorsel.jsx";
import { QtBosDurum, QtDugme, QtKart, QtModal } from "../tasarim/index.js";
import { tt, aktifDil } from "../lib/dil.js";
import { hataMesaji } from "../lib/hata.js";
import { SKILL_TANIMLARI } from "../lib/jokerler.js";
import { supabase } from "../../src/lib/supabase.js";
import {
  odulAdi, odulGorselVeri, postaOyuncuAra, postaGonder, postaGonderilenler, postaBitir,
} from "../lib/posta.js";
import "../tasarim/ekranlar/posta.css";

const LIGLER = [
  { id: "bronz", ad: "Bronz" }, { id: "gumus", ad: "Gümüş" }, { id: "altin", ad: "Altın" },
  { id: "elmas", ad: "Elmas" }, { id: "efsane", ad: "Efsane" },
];
const JOKERLER = Object.values(SKILL_TANIMLARI).filter((s) => s.aktif);

// datetime-local değeri (yerel saat) ↔ ISO
const yerelDeger = (d) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const yediGunSonra = () => yerelDeger(new Date(Date.now() + 7 * 86400000));
const tarih = (iso) => {
  try { return new Date(iso).toLocaleString(aktifDil() === "en" ? "en-GB" : "tr-TR", { dateStyle: "short", timeStyle: "short" }); }
  catch { return ""; }
};

const BOS_FORM = () => ({
  tur: "odullu", hedef: "oyuncu", oyuncu: null, lig: "bronz",
  baslikTr: "", baslikEn: "", metinTr: "", metinEn: "",
  oduller: [{ tur: "coin", miktar: 100 }], bitis: yediGunSonra(),
});

export default function YonetimPostaPage() {
  const [f, setF] = useState(BOS_FORM);
  const [arama, setArama] = useState("");
  const [sonuclar, setSonuclar] = useState([]);
  const [aramaHata, setAramaHata] = useState(null);
  const [avatarlar, setAvatarlar] = useState([]);
  const [onizleme, setOnizleme] = useState(null);   // null | "tr" | "en"
  const [onay, setOnay] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState(null);
  const [basari, setBasari] = useState(null);
  const [gonderilen, setGonderilen] = useState(null);
  const [listeHata, setListeHata] = useState(null);
  const [bitiriliyor, setBitiriliyor] = useState(null);

  const guncelle = (alan, deger) => setF((o) => ({ ...o, [alan]: deger }));

  // Avatar ödülü için katalog (anahtar + ad); bir kez
  useEffect(() => {
    let aktif = true;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("avatar_katalogu_oyun");
        if (error) throw error;
        if (aktif) setAvatarlar((data ?? []).filter((a) => a?.anahtar && !a.kapali));
      } catch (e) {
        console.warn("[Bildim] avatar kataloğu (posta):", e?.message ?? e);
      }
    })();
    return () => { aktif = false; };
  }, []);

  const listeYukle = useCallback(async () => {
    setListeHata(null);
    try {
      setGonderilen(await postaGonderilenler());
    } catch (e) {
      setListeHata(hataMesaji(e, tt("Gönderilen postalar yüklenemedi.")));
    }
  }, []);
  useEffect(() => { listeYukle(); }, [listeYukle]);

  // Oyuncu araması (yazmayı bırakınca bir kez)
  useEffect(() => {
    const q = arama.trim();
    if (f.hedef !== "oyuncu" || q.length < 2) { setSonuclar([]); return undefined; }
    let aktif = true;
    const t = setTimeout(async () => {
      try {
        const r = await postaOyuncuAra(q);
        if (aktif) { setSonuclar(r); setAramaHata(null); }
      } catch (e) {
        if (aktif) setAramaHata(hataMesaji(e, tt("Arama yapılamadı.")));
      }
    }, 350);
    return () => { aktif = false; clearTimeout(t); };
  }, [arama, f.hedef]);

  const turSec = (tur) => setF((o) => ({
    ...o, tur,
    hedef: tur === "duyuru" && o.hedef === "oyuncu" ? "herkes" : o.hedef,
    oduller: tur === "odullu" && o.oduller.length === 0 ? [{ tur: "coin", miktar: 100 }] : o.oduller,
  }));

  const kalemEkle = (tur) => {
    setF((o) => {
      if (o.oduller.length >= 8) return o;
      let yeni;
      if (tur === "joker") yeni = { tur, anahtar: JOKERLER.find((j) => !o.oduller.some((k) => k.anahtar === j.id))?.id ?? JOKERLER[0]?.id, miktar: 1 };
      else if (tur === "avatar") {
        const a = avatarlar.find((x) => !o.oduller.some((k) => k.anahtar === x.anahtar));
        if (!a) return o;
        yeni = { tur, anahtar: a.anahtar };
      } else yeni = { tur, miktar: tur === "coin" ? 100 : 10 };
      return { ...o, oduller: [...o.oduller, yeni] };
    });
  };
  const kalemGuncelle = (i, alan, deger) => setF((o) => ({ ...o, oduller: o.oduller.map((k, j) => (j === i ? { ...k, [alan]: deger } : k)) }));
  const kalemSil = (i) => setF((o) => ({ ...o, oduller: o.oduller.filter((_, j) => j !== i) }));

  // Önizleme ve gönderim için ödül kalemleri (avatar adı/görseli katalogdan)
  const kalemler = useMemo(() => f.oduller.map((k) => {
    if (k.tur !== "avatar") return { ...k, miktar: Number(k.miktar) || 0 };
    const a = avatarlar.find((x) => x.anahtar === k.anahtar);
    return { tur: "avatar", anahtar: k.anahtar, miktar: 1, url: a?.url, ad_tr: a?.ad_tr, ad_en: a?.ad_en };
  }), [f.oduller, avatarlar]);

  const kontrolHatasi = () => {
    if (!f.baslikTr.trim() || !f.metinTr.trim()) return tt("Türkçe başlık ve metin gerekli.");
    if (f.hedef === "oyuncu" && !f.oyuncu) return tt("Oyuncu seç.");
    if (f.tur === "odullu" && kalemler.length === 0) return tt("Ödüllü postaya en az bir ödül ekle.");
    if (kalemler.some((k) => k.tur !== "avatar" && !(k.miktar >= 1))) return tt("Ödül miktarı geçersiz.");
    const anahtarlar = kalemler.map((k) => `${k.tur}:${k.anahtar ?? ""}`);
    if (new Set(anahtarlar).size !== anahtarlar.length) return tt("Aynı ödül iki kez eklenmiş.");
    const b = new Date(f.bitis);
    if (!Number.isFinite(b.getTime()) || b.getTime() <= Date.now() + 5 * 60000) return tt("Bitiş tarihi ileride olmalı.");
    return null;
  };

  const onizle = () => {
    setBasari(null);
    const h = kontrolHatasi();
    setHata(h);
    if (!h) setOnizleme(aktifDil() === "en" ? "en" : "tr");
  };

  const gonder = async () => {
    if (gonderiliyor) return;
    if (f.hedef === "herkes" && !onay) { setOnay(true); return; }
    setOnay(false);
    setGonderiliyor(true);
    setHata(null);
    try {
      await postaGonder({
        tur: f.tur, hedef: f.hedef, hedefOyuncu: f.oyuncu?.id, hedefLig: f.lig,
        baslikTr: f.baslikTr, baslikEn: f.baslikEn, metinTr: f.metinTr, metinEn: f.metinEn,
        oduller: kalemler.map(({ tur, anahtar, miktar }) => (tur === "avatar" ? { tur, anahtar } : tur === "joker" ? { tur, anahtar, miktar } : { tur, miktar })),
        bitis: new Date(f.bitis).toISOString(),
      });
      setOnizleme(null);
      setBasari(tt("Posta gönderildi."));
      setF(BOS_FORM());
      setArama("");
      listeYukle();
    } catch (e) {
      setOnizleme(null);
      setHata(hataMesaji(e, tt("Posta gönderilemedi. Tekrar dene.")));
    } finally {
      setGonderiliyor(false);
    }
  };

  const bitir = async (id) => {
    if (bitiriliyor) return;
    setBitiriliyor(id);
    try {
      await postaBitir(id);
      await listeYukle();
    } catch (e) {
      setListeHata(hataMesaji(e, tt("Posta bitirilemedi.")));
    } finally {
      setBitiriliyor(null);
    }
  };

  // Önizlemede gösterilecek posta: seçili dilin metni (EN boşsa TR — oyuncunun göreceği gibi)
  const onizlemePosta = onizleme && {
    id: "onizleme", tur: f.tur, oduller: kalemler, alindi: null, verilen: null, okundu: false,
    baslik_tr: f.baslikTr.trim(), baslik_en: onizleme === "en" ? f.baslikEn.trim() : "",
    metin_tr: f.metinTr.trim(), metin_en: onizleme === "en" ? f.metinEn.trim() : "",
    bitis: new Date(f.bitis).toISOString(), olusturuldu: new Date().toISOString(),
  };
  // PostaDetay metni aktif dile göre seçer; önizlemede dil düğmesi metni değiştirir, arayüz dili aynı kalır.
  const onizlemeDilde = onizlemePosta && aktifDil() !== onizleme
    ? { ...onizlemePosta, baslik_tr: onizleme === "en" ? (f.baslikEn.trim() || f.baslikTr.trim()) : f.baslikTr.trim(),
        metin_tr: onizleme === "en" ? (f.metinEn.trim() || f.metinTr.trim()) : f.metinTr.trim(), baslik_en: "", metin_en: "" }
    : onizlemePosta;

  const hedefMetni = (p) => (p.hedef === "herkes" ? tt("Herkes")
    : p.hedef === "lig" ? tt("{0} ligi", { 0: tt(LIGLER.find((l) => l.id === p.hedef_lig)?.ad ?? p.hedef_lig) })
    : p.hedef_ad ?? tt("Oyuncu"));

  return (
    <div className="yp">
      <GeriDugmesi />
      <h1 className="qt-baslik-1">{tt("Posta gönder")}</h1>

      <QtKart className="yp-bolum">
        <h2 className="qt-baslik-3">{tt("Tür")}</h2>
        <div className="yp-secenekler" role="group" aria-label={tt("Tür")}>
          <button type="button" className="yp-secenek" aria-pressed={f.tur === "odullu"} onClick={() => turSec("odullu")}>{tt("Ödüllü")}</button>
          <button type="button" className="yp-secenek" aria-pressed={f.tur === "duyuru"} onClick={() => turSec("duyuru")}>{tt("Duyuru")}</button>
        </div>

        <h2 className="qt-baslik-3">{tt("Kime")}</h2>
        <div className="yp-secenekler" role="group" aria-label={tt("Kime")}>
          <button type="button" className="yp-secenek" aria-pressed={f.hedef === "oyuncu"} disabled={f.tur === "duyuru"} onClick={() => guncelle("hedef", "oyuncu")}>{tt("Tek oyuncu")}</button>
          <button type="button" className="yp-secenek" aria-pressed={f.hedef === "herkes"} onClick={() => guncelle("hedef", "herkes")}>{tt("Herkes")}</button>
          <button type="button" className="yp-secenek" aria-pressed={f.hedef === "lig"} onClick={() => guncelle("hedef", "lig")}>{tt("Lige göre")}</button>
        </div>
        {f.hedef === "oyuncu" && (
          <>
            <label className="yp-etiket">{tt("Takma adla ara")}
              <input className="yp-girdi" type="search" value={arama} onChange={(e) => setArama(e.target.value)}
                     placeholder={tt("En az 2 harf")} autoComplete="off" />
            </label>
            {aramaHata && <p className="yp-hata" role="alert">{aramaHata}</p>}
            {f.oyuncu && !sonuclar.some((s) => s.id === f.oyuncu.id) && (
              <p className="yp-basari">{tt("Seçili: {0}", { 0: f.oyuncu.ad })}</p>
            )}
            {sonuclar.length > 0 && (
              <ul className="yp-sonuclar">
                {sonuclar.map((o) => (
                  <li key={o.id}>
                    <button type="button" className="yp-oyuncu" aria-pressed={f.oyuncu?.id === o.id} onClick={() => guncelle("oyuncu", o)}>
                      {o.avatar_url ? <img src={o.avatar_url} alt="" /> : null}
                      <span className="yp-oyuncu-ad">{o.ad}</span>
                      <span className="yp-oyuncu-lig">{tt(LIGLER.find((l) => l.id === o.lig)?.ad ?? "")}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        {f.hedef === "lig" && (
          <div className="yp-secenekler" role="group" aria-label={tt("Lig")}>
            {LIGLER.map((l) => (
              <button key={l.id} type="button" className="yp-secenek" aria-pressed={f.lig === l.id} onClick={() => guncelle("lig", l.id)}>{tt(l.ad)}</button>
            ))}
          </div>
        )}
      </QtKart>

      <QtKart className="yp-bolum">
        <h2 className="qt-baslik-3">{tt("Mesaj")}</h2>
        <div className="yp-iki">
          <label className="yp-etiket">{tt("Başlık (TR)")}
            <input className="yp-girdi" value={f.baslikTr} maxLength={80} onChange={(e) => guncelle("baslikTr", e.target.value)} />
          </label>
          <label className="yp-etiket">{tt("Başlık (EN)")} <small>{tt("Boşsa Türkçesi gösterilir")}</small>
            <input className="yp-girdi" value={f.baslikEn} maxLength={80} onChange={(e) => guncelle("baslikEn", e.target.value)} />
          </label>
          <label className="yp-etiket">{tt("Metin (TR)")}
            <textarea className="yp-girdi" value={f.metinTr} maxLength={1000} onChange={(e) => guncelle("metinTr", e.target.value)} />
          </label>
          <label className="yp-etiket">{tt("Metin (EN)")}
            <textarea className="yp-girdi" value={f.metinEn} maxLength={1000} onChange={(e) => guncelle("metinEn", e.target.value)} />
          </label>
        </div>
      </QtKart>

      <QtKart className="yp-bolum">
        <h2 className="qt-baslik-3">{tt("Ödüller")}</h2>
        {kalemler.length === 0 && <p className="yp-gonderilen-alt">{tt("Ödülsüz duyuru.")}</p>}
        {f.oduller.map((k, i) => (
          <div key={i} className="yp-odul-satir">
            <span className="yp-odul-gorsel"><OdulGorsel odul={odulGorselVeri(kalemler[i])} boyut={30} /></span>
            <div className="yp-odul-alan">
              {k.tur === "joker" && (
                <select className="yp-girdi" aria-label={tt("Joker")} value={k.anahtar} onChange={(e) => kalemGuncelle(i, "anahtar", e.target.value)}>
                  {JOKERLER.map((j) => <option key={j.id} value={j.id}>{j.ad}</option>)}
                </select>
              )}
              {k.tur === "avatar" ? (
                <select className="yp-girdi" aria-label={tt("Avatar")} value={k.anahtar} onChange={(e) => kalemGuncelle(i, "anahtar", e.target.value)}>
                  {avatarlar.map((a) => <option key={a.anahtar} value={a.anahtar}>{aktifDil() === "en" ? a.ad_en : a.ad_tr}</option>)}
                </select>
              ) : (
                <input className="yp-girdi" type="number" inputMode="numeric" min={1}
                       aria-label={tt("{0} miktarı", { 0: odulAdi({ ...k, miktar: 1 }) })}
                       value={k.miktar} onChange={(e) => kalemGuncelle(i, "miktar", e.target.value)} />
              )}
            </div>
            <QtDugme tur="ikincil" boyut="k" ikon="cop" onClick={() => kalemSil(i)} aria-label={tt("Ödülü kaldır")} />
          </div>
        ))}
        <div className="yp-secenekler">
          {["coin", "elmas", "joker", "avatar"].map((t) => (
            <button key={t} type="button" className="yp-secenek" disabled={f.oduller.length >= 8 || (t !== "joker" && t !== "avatar" && f.oduller.some((k) => k.tur === t)) || (t === "avatar" && avatarlar.length === 0)}
                    onClick={() => kalemEkle(t)}>
              + {t === "coin" ? tt("Coin") : t === "elmas" ? tt("Elmas") : t === "joker" ? tt("Joker") : tt("Avatar")}
            </button>
          ))}
        </div>
      </QtKart>

      <QtKart className="yp-bolum">
        <label className="yp-etiket">{tt("Bitiş tarihi")} <small>{tt("Tarih geçince posta listeden kalkar, alınmamış ödül geçersiz olur.")}</small>
          <input className="yp-girdi" type="datetime-local" value={f.bitis} onChange={(e) => guncelle("bitis", e.target.value)} />
        </label>
      </QtKart>

      {hata && <p className="yp-hata" role="alert">{hata}</p>}
      {basari && <p className="yp-basari" role="status">{basari}</p>}
      <div className="yp-cubuk">
        <QtDugme tur="birincil" ikon="gonder" onClick={onizle}>{tt("Önizle ve gönder")}</QtDugme>
      </div>

      <section className="yp-bolum" aria-labelledby="yp-gonderilen-baslik">
        <h2 id="yp-gonderilen-baslik" className="qt-baslik-3">{tt("Gönderilen postalar")}</h2>
        {listeHata && (
          <p className="yp-hata" role="alert">{listeHata} <QtDugme tur="ikincil" boyut="k" ikon="yenile" onClick={listeYukle}>{tt("Tekrar dene")}</QtDugme></p>
        )}
        {gonderilen && gonderilen.length === 0 && <QtBosDurum ikon="bildirim" baslik={tt("Henüz posta gönderilmedi")} />}
        {(gonderilen ?? []).map((p) => {
          const bitti = Boolean(p.bitirildi) || new Date(p.bitis).getTime() <= Date.now();
          return (
            <article key={p.id} className="yp-gonderilen">
              <div className="yp-gonderilen-ust">
                <p className="yp-gonderilen-baslik">{p.baslik_tr}</p>
                <span className={`yp-durum${bitti ? " yp-durum--bitti" : ""}`}>{bitti ? tt("Bitti") : tt("Aktif")}</span>
              </div>
              <p className="yp-gonderilen-alt">
                {p.tur === "odullu" ? tt("Ödüllü") : tt("Duyuru")} · {hedefMetni(p)} · {tarih(p.olusturuldu)} → {tarih(p.bitirildi ?? p.bitis)}
              </p>
              {Array.isArray(p.oduller) && p.oduller.length > 0 && (
                <p className="yp-gonderilen-alt">{p.oduller.map((k) => odulAdi(k)).join(" · ")}</p>
              )}
              <div className="yp-sayilar">
                <span className="yp-sayi">{tt("{0} kişi okudu", { 0: p.okuyan })}</span>
                {Array.isArray(p.oduller) && p.oduller.length > 0 && <span className="yp-sayi yp-sayi--alan">{tt("{0} kişi aldı", { 0: p.alan })}</span>}
              </div>
              {!bitti && (
                <QtDugme tur="ikincil" boyut="k" ikon="carpi" yukleniyor={bitiriliyor === p.id} onClick={() => bitir(p.id)}>{tt("Bitir")}</QtDugme>
              )}
            </article>
          );
        })}
      </section>

      {onizlemeDilde && !onay && (
        <PostaDetay
          posta={onizlemeDilde}
          onizleme
          onKapat={() => setOnizleme(null)}
          onizlemeUst={
            <div className="yp-onizleme-dil" role="group" aria-label={tt("Önizleme dili")}>
              <button type="button" className="yp-secenek" aria-pressed={onizleme === "tr"} onClick={() => setOnizleme("tr")}>TR</button>
              <button type="button" className="yp-secenek" aria-pressed={onizleme === "en"} onClick={() => setOnizleme("en")}>EN</button>
            </div>
          }
          onizlemeAltlik={<>
            <QtDugme tur="ikincil" onClick={() => setOnizleme(null)}>{tt("Düzenle")}</QtDugme>
            <QtDugme tur="birincil" ikon="gonder" yukleniyor={gonderiliyor} onClick={gonder}>
              {f.hedef === "herkes" ? tt("Herkese gönder") : tt("Gönder")}
            </QtDugme>
          </>}
        />
      )}
      {onay && (
        <QtModal acik baslik={tt("Herkese gönderilsin mi?")} aciklama={tt("Bu posta bütün oyunculara gidecek. Geri alınamaz; yalnız Bitir ile kapatılabilir.")}
                 onKapat={() => setOnay(false)}
                 altlik={<>
                   <QtDugme tur="ikincil" onClick={() => setOnay(false)}>{tt("Vazgeç")}</QtDugme>
                   <QtDugme tur="birincil" ikon="gonder" yukleniyor={gonderiliyor} onClick={gonder}>{tt("Evet, herkese gönder")}</QtDugme>
                 </>} />
      )}
    </div>
  );
}
