import { useCallback, useEffect, useRef, useState } from "react";
import { QtSkill, QtSkillCubugu, QtDugme } from "../tasarim/index.js";
import "../tasarim/ekranlar/m1-mac.css";
import { hataMesaji } from "../lib/hata.js";
import { Link } from "react-router-dom";
import { supabase } from "../../src/lib/supabase.js";
import { macJokerleri, jokerBilgi, envanterNesne, skillSetiOku, skillSetiKaydet, skillSlotSayisi, skillLoadoutKapali, LOADOUT_MODLARI, AKTIF_MAC_SKILLERI } from "../lib/jokerler.js";
import { ayarlar } from "../lib/ayarlar.js";
import { coinTazele } from "../lib/coin.js";
import JokerSatinAlModal from "./JokerSatinAlModal.jsx";
import { y } from "../lib/yol.js";
import { sesSkill } from "../lib/ses.js";
import { titret } from "../lib/geriBildirim.js";
import { tt } from "../lib/dil.js";

/**
 * Maç içi joker çubuğu. Tüm kararlar sunucudadır (joker_kullan RPC);
 * burası yalnız adet rozetini, ücretsiz hakkı ve pasiflik nedenini gösterir.
 *
 * onEtki(sonuc): { tur, kapali? , uzatildi?, atlandi?, dogru_cevap?, sis_sn? }
 *
 * Paket 32 B — dört durum, hepsi marka turuncusu (renk değil ikon + metin ayırır):
 *   hazir      dolu turuncu, beyaz ikon, 0 4px 0 alt gölge, sağ üstte adet
 *   kullanildi soluk + onay işareti, basılamaz (sunucudan: kullanilan_turler)
 *   satilik    turuncu kenarlık, içi boş, sağ üstte altın "+" → satın alma penceresi
 *   pasif      gri; basınca SEBEBİNİ yazar (ör. "Son 6 saniyede Sis kullanılamaz.")
 * @param {number} [kalanSn] sorunun kalan saniyesi (Sis'in son-N-saniye kuralı için)
 */
export default function JokerCubugu({ macTur, macId, soruIndex, onEtki, onBilgi, kilit, surum = 0, kalanSn = 15 }) {
  const [envanter, setEnvanter] = useState({
    elli: 0, sure: 0, soru_degistir: 0, zaman_baskisi: 0,
    sigorta: 0, cifte_puan: 0, ikinci_sans: 0, seri_koruma: 0,
  });
  const [durum, setDurum] = useState(null); // { sinir, kullanilan, ucretsiz_elli_kaldi }
  const [hata, setHata] = useState(null);
  const [yuklemeHatasi, setYuklemeHatasi] = useState(null);
  const [calisan, setCalisan] = useState(null);
  // İstek sürerken çift basmayı ve aynı soruda ikinci skill'i önlemek için yerel iz.
  const [kullandigim, setKullandigim] = useState([]);
  // Paket 27 C: maç içi satın alma — fiyatlar ve coin sunucudan.
  const [fiyatlar, setFiyatlar] = useState(null);
  const [coin, setCoin] = useState(null);
  const [satinAlinacak, setSatinAlinacak] = useState(null);
  const hataRef = useRef(null);
  // Paket 32: açıklamalardaki sayılar ve Sis eşiği oyun_ayarlari'ndan
  const [ayar, setAyar] = useState(null);
  // 327: loadout yalnız Klasik (1v1) ve Düello'da; Grup/Turnuva'da mod için açık bütün skill'ler.
  const loadoutModu = LOADOUT_MODLARI.includes(macTur);
  const [skillSeti, setSkillSeti] = useState(() => (loadoutModu ? skillSetiOku(undefined, macTur) : AKTIF_MAC_SKILLERI));
  const sonRakipBaskisi = useRef(null);
  useEffect(() => {
    let aktif = true;
    (async () => {
      try {
        const a = await ayarlar();
        if (!aktif) return;
        setAyar(a);
        // Çubuk sunucudaki seti gösterir (yetkili kaynak; kapı da onu kontrol eder). Loadout
        // kapalıyken bu bütün açık skill'lerdir. Grup/Turnuva'da set yok (327).
        if (!loadoutModu) return;
        const { data, error } = await supabase.rpc("skill_setim", { p_mod: macTur });
        if (error) throw error;
        if (aktif && Array.isArray(data)) setSkillSeti(skillSetiKaydet(data, skillLoadoutKapali(a) ? data.length : skillSlotSayisi(a), macTur));
      } catch (e) {
        console.error("[Bildim] skill seti alınamadı:", e);   // yerel setle devam edilir
      }
    })();
    return () => { aktif = false; };
  }, []);
  useEffect(() => {
    const yenile = () => { if (loadoutModu) setSkillSeti(skillSetiOku(undefined, macTur)); };
    window.addEventListener("skill-seti-degisti", yenile);
    return () => window.removeEventListener("skill-seti-degisti", yenile);
  }, []);
  useEffect(() => { setKullandigim([]); }, [soruIndex]);
  // B.4: kullanım anı — düğme parlaması + ekran ortasında şerit (≈850 ms)
  const [parlayan, setParlayan] = useState(null);
  // Tasarım A: kullanım şeridi artık ayrı katman değil — QuestionCard'ın sonuç bandında
  // (QtSonucBandi) yazılır: onBilgi({ metin, anahtar }).
  useEffect(() => {
    if (!parlayan) return undefined;
    const t = setTimeout(() => setParlayan(null), 650);
    return () => clearTimeout(t);
  }, [parlayan]);

  // Joker çubuğu ekranın EN ALTINDA duruyor; hata notu düğmelerin altına
  // düştüğü için görünür alanın dışında kalıyordu (ölçüm: not y=817, pencere
  // 791). Oyuncu sessiz bir başarısızlık görüyordu. Not artık göze sokuluyor.
  useEffect(() => {
    if (!hata) return;
    try {
      hataRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    } catch {
      /* eski tarayıcı: notu kaydıramadıysak da metin yerinde duruyor */
    }
  }, [hata]);

  const yukle = useCallback(async () => {
    try {
      setYuklemeHatasi(null);
      const [env, mac, fiy, bak] = await Promise.all([
        supabase.rpc("envanterim"),
        supabase.rpc("joker_mac_durumu", { p_mac_tur: macTur, p_mac_id: macId }),
        supabase.rpc("joker_fiyatlari"),
        supabase.rpc("coin_bakiyem"),
      ]);
      if (env.error) throw env.error;
      if (mac.error) throw mac.error;
      setEnvanter(envanterNesne(env.data));
      setDurum(Array.isArray(mac.data) ? (mac.data[0] ?? null) : (mac.data ?? null));
      // Fiyat/coin alınamazsa satın alma gizlenir, oyun akışı bozulmaz.
      if (!fiy.error) setFiyatlar(fiy.data ?? null);
      // Paket 33: coin_bakiyem TABLO döndürür → [{ bakiye, hareketler }]. Nesneyi state'e
      // yazmak satın alma penceresinde React #31 ile ekranı beyaza düşürüyordu. Hep sayı ya da null.
      if (!bak.error) {
        const satir = Array.isArray(bak.data) ? bak.data[0] : bak.data;
        setCoin(typeof satir === "number" ? satir : (satir?.bakiye ?? null));
      }
    } catch (e) {
      setDurum(null);
      setYuklemeHatasi(hataMesaji(e, tt("Skill bilgileri alınamadı. Tekrar dene.")));
    }
  }, [macTur, macId]);

  useEffect(() => {
    yukle();
    // Paket 31 A: rakibin jokeri (surum) kilit/kısaltma durumunu değiştirir → yeniden oku
  }, [yukle, soruIndex, surum]);

  const rakipKisaltti = Boolean(durum?.kisaltildi);
  useEffect(() => {
    const anahtar = rakipKisaltti ? `${soruIndex}:${surum}` : null;
    if (anahtar && sonRakipBaskisi.current !== anahtar) {
      sonRakipBaskisi.current = anahtar;
      onEtki?.({ tur: "zaman_baskisi", rakip: true,
        azaltildi: Number(ayar?.klasik_zaman_baskisi_sn ?? 5) });
    }
  }, [rakipKisaltti, soruIndex, surum, ayar, onEtki]);

  if (!durum) return yuklemeHatasi ? (
    <div className="m1-bant m1-bant--hata" role="alert">
      <span>{yuklemeHatasi}</span>
      <QtDugme tur="ikincil" boyut="k" ikon="yenile" onClick={yukle}>{tt("Tekrar dene")}</QtDugme>
    </div>
  ) : null;

  // Paket 34: jokerler geçici olarak ücretsiz (oyun_ayarlari.jokerler_ucretsiz; Paket 35'ten beri 0).
  // Açıkken yalnız STOK/COIN serbest; maç içi hak kuralları (Paket 35 A.3) her zaman geçerli.
  const serbestMod = Number(ayar?.jokerler_ucretsiz ?? 0) > 0;
  const sinirDoldu =
    durum.sinir !== null && durum.sinir !== undefined && durum.kullanilan >= durum.sinir;
  const finalYasak = durum.sinir === 0;
  // Paket 31 A.3: rakip bu soruda Savunma Kilidi bastı — sessiz düğme olmasın, açık mesaj
  const rakipKilitledi = Boolean(durum.kilitli);
  const turSayilari = durum.kullanim_sayilari ?? {};
  const turSiniri = Number(durum.tur_basi_sinir ?? 1);
  const sorudaKullanildi = Boolean(durum.soruda_kullanildi) || kullandigim.length > 0;
  const turKullanimi = (tur) => Number(turSayilari?.[tur] ?? 0);
  const turDoldu = (tur) => turKullanimi(tur) >= turSiniri;

  /**
   * Joker kullan. `satinAl` true ise satın alma + kullanım TEK RPC'de yapılır
   * (joker_al_ve_kullan): araya girip coin düşüp jokerin kullanılmaması diye
   * bir durum oluşmaz, kullanım reddedilirse coin de geri gelir.
   */
  const kullan = async (tur, satinAl = false) => {
    setHata(null);
    setCalisan(tur);
    try {
      const yeniSkill = ["sigorta", "cifte_puan", "ikinci_sans"].includes(tur);
      const { data, error } = await supabase.rpc(
        yeniSkill
          ? (satinAl ? "skill_al_ve_hazirla" : "skill_hazirla")
          : (satinAl ? "joker_al_ve_kullan" : "joker_kullan"),
        { p_mac_tur: macTur, p_mac_id: macId, p_soru_index: soruIndex, p_tur: tur }
      );
      if (error) throw error;
      sesSkill(tur);
      titret(10);
      setKullandigim((k) => (k.includes(tur) ? k : [...k, tur]));
      setParlayan(tur);
      onBilgi?.({ metin: `${jokerBilgi(tur, macTur, ayar).ad}: ${etkiMetni(tur)}`, anahtar: Date.now() });
      if (data && typeof data.coin === "number") setCoin(data.coin);
      // Paket 35 A: satın alma sonrası üst çubuktaki bakiye de anında yenilensin
      if (satinAl) coinTazele();
      onEtki?.(data?.tur === "sure" && data.eklenen_sn == null
        ? { ...data, eklenen_sn: jokerBilgi("sure", macTur, ayar).etkiDegeri }
        : data);
      await yukle();
    } catch (e) {
      setHata(hataMesaji(e, tt("Skill kullanılamadı.")));
      throw e;   // satın alma penceresi hatayı kendi içinde göstersin
    } finally {
      setCalisan(null);
    }
  };

  /** Envanterde 0 varken düğmeye basılınca: önce onay penceresi. */
  const bas = (tur) => {
    if (satinAlinabilir(tur)) setSatinAlinacak(tur);
    else kullan(tur).catch((e) => console.error("[Bildim] skill kullanılamadı:", e?.message ?? e));
  };

  /** Envanterde yok, ücretsiz hakkı da yok ama maç içinde satın alınabilir mi? (coin'e bakmadan) */
  const alinabilirMi = (tur) => {
    if (serbestMod || kilit || finalYasak || sinirDoldu || rakipKilitledi) return false;
    if (macTur === "turnuva" && tur === "soru_degistir") return false;
    if (turDoldu(tur) || (macTur === "1v1" && sorudaKullanildi)) return false;
    if (tur === "elli" && durum?.ucretsiz_elli_kaldi) return false;
    if ((envanter[tur] ?? 0) > 0) return false;
    return Number(fiyatlar?.[tur] ?? 0) > 0;
  };
  /** Paket 35 A.2: alınabilir ama bakiye fiyata yetmiyor → pencere açılmaz, "Yetersiz coin" */
  const coinYetmez = (tur) =>
    alinabilirMi(tur) && coin !== null && coin !== undefined && Number(coin) < Number(fiyatlar?.[tur] ?? 0);
  const satinAlinabilir = (tur) => alinabilirMi(tur) && !coinYetmez(tur);

  /** B.4: ekranda ne olduğu yazsın (sayılar ayardan). */
  const etkiMetni = (tur) => {
    const a = ayar ?? {};
    if (tur === "elli") return tt("İki yanlış şık silindi.");
    if (tur === "sure") return tt("Sürene {0} saniye eklendi.", { 0: jokerBilgi(tur, macTur, a).etkiDegeri });
    if (tur === "soru_degistir") return tt("Sorun değişti.");
    if (tur === "zaman_baskisi")
      return tt("Rakibin süresi {0} saniye kısaldı.", { 0: Number(a.klasik_zaman_baskisi_sn ?? 5) });
    if (tur === "sigorta") return tt("Sigorta aktif — yanlışta 5 puan korunur.");
    if (tur === "cifte_puan") return tt("2X aktif — doğru cevap 20 puan.");
    if (tur === "ikinci_sans") return tt("İkinci Şans aktif.");
    return jokerBilgi(tur, macTur, a).ad;
  };

  // Sis'in son-N-saniye kuralı (YALNIZ Sis) — sunucu da reddediyor, düğme önceden söylesin

  const neden = (tur) => {
    if (kilit) return tt("Bu soruyu zaten cevapladın");
    if (rakipKilitledi) return tt("Bu soruda skill kullanılamaz.");
    if (finalYasak) return tt("Turnuva finalinde skill kullanılamaz");
    if (sinirDoldu) return tt("Bu maçta en fazla {0} skill", { 0: durum.sinir });
    if (macTur === "1v1" && sorudaKullanildi) return tt("Bu sorudaki skill hakkını kullandın");
    // Turnuva herkese AYNI soruyu sorar ve elemelidir: soru değiştirilemez.
    if (macTur === "turnuva" && tur === "soru_degistir") return tt("Turnuvada soru değiştirilemez");
    // Paket 27 B: aynı joker maç başına bir kez — her tür için. Sunucu da aynı kuralı uygular.
    if (turDoldu(tur)) return tt("Bu skill için maç hakkın doldu");
    const ucretsiz = tur === "elli" && durum.ucretsiz_elli_kaldi;
    if (!serbestMod && !ucretsiz && (envanter[tur] ?? 0) <= 0 && coinYetmez(tur)) return tt("Yetersiz coin");
    // Envanterde yoksa artık "kalmadı" demiyoruz: maç içinde satın alınabiliyor.
    if (!serbestMod && !ucretsiz && (envanter[tur] ?? 0) <= 0 && !satinAlinabilir(tur)) return tt("Skill'in kalmadı");
    return null;
  };

  const skiller = macJokerleri(macTur, skillSeti);
  return (
    <div className={`m1-skill${skiller.length > 5 ? " m1-skill--cok" : ""}`}>
      {rakipKilitledi && (
        <div className="m1-bant" role="status">
          <span>{tt("Bu soruda skill kullanılamaz.")}</span>
        </div>
      )}
      {rakipKisaltti && (
        <div className="m1-bant m1-bant--hata" role="status">
          <span>{tt("Rakibin süreni kısalttı!")}</span>
        </div>
      )}
      {/* B.5: kaç hak kaldığı tek satırda görünür */}
      {!finalYasak && (
        <div className="m1-skill-hak" aria-live="polite">
          {serbestMod
            ? tt("Skiller şimdilik ücretsiz ve sınırsız")
            : durum.sinir === null || durum.sinir === undefined
            ? tt("Arkadaş maçı: skill hakkın sınırsız")
            : tt("Bu maçta {0} skill hakkın kaldı", { 0: Math.max(0, durum.sinir - durum.kullanilan) })}
        </div>
      )}
      {skiller.length > 0 && (
        <QtSkillCubugu etiket={tt("Skill'ler")}>
          {skiller.map((tur) => {
            const bilgi = jokerBilgi(tur, macTur, ayar);
            const ucretsiz = tur === "elli" && durum.ucretsiz_elli_kaldi;
            const engel = neden(tur);
            const adet = envanter[tur] ?? 0;
            const satilik = satinAlinabilir(tur);
            const fiyat = Number(fiyatlar?.[tur] ?? 0);
            const kullanildi = turDoldu(tur);
            const macHakKaldi = Math.max(0, turSiniri - turKullanimi(tur));
            // Paket 35 A.2: stok yoksa fiyat rozeti HER ZAMAN görünür
            const fiyatRozeti = !serbestMod && !ucretsiz && adet <= 0 && fiyat > 0;
            // Etkisi soru boyunca süren skill'ler (Sigorta, 2X, İkinci Şans) bu soruda "aktif".
            const surenEtki = ["sigorta", "cifte_puan", "ikinci_sans"].includes(tur) && kullandigim.includes(tur);
            const durumAdi = surenEtki ? "aktif" : kullanildi ? "kullanildi" : engel && !satilik ? "kilitli" : "hazir";
            const aciklama = engel ?? (satilik ? tt("{0} coin — dokun, al ve kullan", { 0: fiyat }) : bilgi.aciklama);
            const etiket = [bilgi.ad, aciklama, ucretsiz ? tt("Ücretsiz") : null,
              macTur === "1v1" ? tt("Maç hakkı: {0}", { 0: macHakKaldi }) : null].filter(Boolean).join(" — ");
            return (
              <QtSkill
                key={tur}
                ikon={bilgi.ikon}
                ad={bilgi.ad}
                adet={serbestMod || ucretsiz || fiyatRozeti ? undefined : adet}
                fiyat={fiyatRozeti ? fiyat : undefined}
                durum={durumAdi}
                className={`${parlayan === tur ? "m1-skill--parla" : ""} ${calisan === tur ? "qt-skill--calisiyor" : ""}`}
                // Pasif düğme BASILABİLİR kalır ama skill kullanmaz: sebebini yazar (B.2.4).
                aria-disabled={Boolean(engel) || calisan !== null || durumAdi !== "hazir" || undefined}
                aria-busy={calisan === tur || undefined}
                aria-label={etiket}
                title={aciklama}
                onClick={() => {
                  if (calisan !== null) return;
                  if (engel) { setHata(engel); return; }
                  bas(tur);
                }}
              />
            );
          })}
        </QtSkillCubugu>
      )}

      {(sinirDoldu || finalYasak) && (
        <div className="m1-skill-hak">
          {finalYasak
            ? tt("Finalde skill yok — sadece bilgi.")
            : tt("Bu maçta skill hakkın doldu ({0}/{1}).", { 0: durum.kullanilan, 1: durum.sinir })}
        </div>
      )}

      {hata && (
        <div className="m1-bant m1-bant--hata m1-skill-not" ref={hataRef} role="alert">
          <span>
            {hata}
            {/kalmadı/i.test(hata) && (
              <>
                {" "}
                <Link to={y("/joker")}>{tt("Skill al")}</Link>
              </>
            )}
          </span>
        </div>
      )}

      {satinAlinacak && (
        <JokerSatinAlModal
          tur={satinAlinacak}
          fiyat={Number(fiyatlar?.[satinAlinacak] ?? 0)}
          coin={coin}
          onKapat={() => setSatinAlinacak(null)}
          onOnay={() => kullan(satinAlinacak, true)}
        />
      )}
    </div>
  );
}
