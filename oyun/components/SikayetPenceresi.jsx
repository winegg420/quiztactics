// ============================================================
// ŞİKÂYET + ENGELLEME (620) — profil kartı ve sohbet ekranı ortak
//
// Kurallar sunucuda: sikayet_et (günde aynı kişiye 1, mesaj metni kanıt olarak kopyalanır),
// oyuncu_engelle / engel_kaldir, iletisim_durumu. Burası yalnız pencereleri çizer.
// ============================================================
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase.js";
import { QtModal, QtDugme, QtIkon } from "../tasarim/index.js";
import { hataMesaji } from "../lib/hata.js";
import { tt } from "../lib/dil.js";
import "../tasarim/ekranlar/sikayet.css";

export const SIKAYET_SEBEPLERI = [
  { kod: "hakaret", ad: "Hakaret / taciz" },
  { kod: "uygunsuz_ad", ad: "Uygunsuz kullanıcı adı veya avatar" },
  { kod: "spam", ad: "Spam" },
  { kod: "hile", ad: "Hile" },
  { kod: "diger", ad: "Diğer" },
];

/** Sunucudaki iletişim durumu: { arkadas, engelledim, iletisim, kosullar_kabul, mesaj_kapali } (null = bilinmiyor). */
export function useIletisimDurumu(kisiId, etkin = true) {
  const [durum, setDurum] = useState(null);
  const yenile = useCallback(async () => {
    if (!kisiId || !etkin) return;
    try {
      const { data, error } = await supabase.rpc("iletisim_durumu", { p_kisi: kisiId });
      if (error) throw error;
      setDurum(data ?? null);
    } catch (e) {
      // Okunamazsa düğmeler eskisi gibi kalır; kararı yine sunucu verir (tetikleyiciler reddeder).
      console.warn("[Bildim] iletişim durumu okunamadı:", e?.message ?? e);
    }
  }, [kisiId, etkin]);
  useEffect(() => { yenile(); }, [yenile]);
  return [durum, yenile];
}

/** Şikâyet penceresi. mesaj verilirse (sohbette uzun basma) şikâyet o mesajla kaydedilir. */
export default function SikayetPenceresi({ kisiId, kisiAd, mesaj = null, engelliMi = false, onKapat, onTamam }) {
  const [sebep, setSebep] = useState(mesaj ? "hakaret" : null);
  const [aciklama, setAciklama] = useState("");
  const [engelle, setEngelle] = useState(false);
  const [calisiyor, setCalisiyor] = useState(false);
  const [hata, setHata] = useState(null);
  const [bitti, setBitti] = useState(null);

  const gonder = async () => {
    if (!sebep || calisiyor) return;
    setCalisiyor(true);
    setHata(null);
    try {
      const { data, error } = await supabase.rpc("sikayet_et", {
        p_kisi: kisiId, p_sebep: sebep, p_aciklama: aciklama.trim() || null,
        p_mesaj_id: mesaj?.id ?? null, p_engelle: engelle && !engelliMi,
      });
      if (error) throw error;
      setBitti(data ?? {});
      onTamam?.(data ?? {});
    } catch (e) {
      setHata(hataMesaji(e, tt("Şikâyet gönderilemedi.")));
    } finally {
      setCalisiyor(false);
    }
  };

  if (bitti) {
    return (
      <QtModal acik onKapat={onKapat} baslik={tt("Teşekkürler")} className="sk-pencere"
               altlik={<QtDugme tamGenislik onClick={onKapat}>{tt("Tamam")}</QtDugme>}>
        <p className="sk-bilgi">
          {tt("Şikâyetin bize ulaştı. İnceleyip gerekeni yapacağız.")}
          {bitti.engellendi ? ` ${tt("{ad} engellendi.", { ad: kisiAd })}` : ""}
        </p>
      </QtModal>
    );
  }

  return (
    <QtModal
      acik
      onKapat={onKapat}
      baslik={mesaj ? tt("Mesajı şikâyet et") : tt("{ad} kullanıcısını şikâyet et", { ad: kisiAd })}
      className="sk-pencere"
      altlik={
        <div className="sk-altlik">
          {hata && <p className="sk-hata" role="alert"><QtIkon ad="uyari" boyut={16} /> <span>{hata}</span></p>}
          <QtDugme tamGenislik ikon="bayrak" devreDisi={!sebep} yukleniyor={calisiyor} onClick={gonder}>
            {tt("Şikâyet et")}
          </QtDugme>
          <QtDugme tur="ikincil" tamGenislik devreDisi={calisiyor} onClick={onKapat}>{tt("Vazgeç")}</QtDugme>
        </div>
      }
    >
      {mesaj && (
        <blockquote className="sk-mesaj" aria-label={tt("Şikâyet edilen mesaj")}>{mesaj.metin}</blockquote>
      )}
      <fieldset className="sk-sebepler">
        <legend className="sk-etiket">{tt("Sebep")}</legend>
        {SIKAYET_SEBEPLERI.map((s) => (
          <label key={s.kod} className={`sk-sebep${sebep === s.kod ? " sk-sebep--secili" : ""}`}>
            <input type="radio" name="sk-sebep" value={s.kod} checked={sebep === s.kod} onChange={() => setSebep(s.kod)} />
            <span>{tt(s.ad)}</span>
          </label>
        ))}
      </fieldset>
      <label className="sk-etiket" htmlFor="sk-aciklama">{tt("Açıklama (isteğe bağlı)")}</label>
      <textarea id="sk-aciklama" className="sk-aciklama" rows={3} maxLength={500} value={aciklama}
                onChange={(e) => setAciklama(e.target.value)} placeholder={tt("Ne oldu? Kısaca yaz.")} />
      {!engelliMi && (
        <label className="sk-engel">
          <input type="checkbox" checked={engelle} onChange={(e) => setEngelle(e.target.checked)} />
          <span>{tt("Bu kişiyi engelle")}</span>
        </label>
      )}
    </QtModal>
  );
}

/** Engelleme onayı (engelliyse "Engeli kaldır"). */
export function EngelPenceresi({ kisiId, kisiAd, engelliMi, onKapat, onTamam }) {
  const [calisiyor, setCalisiyor] = useState(false);
  const [hata, setHata] = useState(null);
  const onayla = async () => {
    setCalisiyor(true);
    setHata(null);
    try {
      const { error } = await supabase.rpc(engelliMi ? "engel_kaldir" : "oyuncu_engelle", { p_kisi: kisiId });
      if (error) throw error;
      onTamam?.(!engelliMi);
      onKapat();
    } catch (e) {
      setHata(hataMesaji(e, tt("İşlem yapılamadı.")));
    } finally {
      setCalisiyor(false);
    }
  };
  return (
    <QtModal
      acik
      onKapat={onKapat}
      baslik={engelliMi ? tt("{ad} kullanıcısının engelini kaldır", { ad: kisiAd }) : tt("{ad} engellensin mi?", { ad: kisiAd })}
      className="sk-pencere"
      altlik={
        <div className="sk-altlik">
          {hata && <p className="sk-hata" role="alert"><QtIkon ad="uyari" boyut={16} /> <span>{hata}</span></p>}
          <QtDugme tamGenislik ikon={engelliMi ? "onay" : "kilit"} yukleniyor={calisiyor} onClick={onayla}>
            {engelliMi ? tt("Engeli kaldır") : tt("Engelle")}
          </QtDugme>
          <QtDugme tur="ikincil" tamGenislik devreDisi={calisiyor} onClick={onKapat}>{tt("Vazgeç")}</QtDugme>
        </div>
      }
    >
      <p className="sk-bilgi">
        {engelliMi
          ? tt("Engeli kaldırınca yeniden mesaj ve davet gönderebilirsiniz. Arkadaşlık geri gelmez.")
          : tt("Engellenen kişi sana mesaj, arkadaşlık isteği, maç daveti, meydan okuma ve tepki gönderemez. Arkadaşlığınız biter. Eski mesajlar kalır.")}
      </p>
    </QtModal>
  );
}
