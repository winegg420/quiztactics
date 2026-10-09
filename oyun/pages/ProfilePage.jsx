import { useEffect, useState } from "react";
import DurumKutusu, { useZamanAsimi } from "../components/DurumKutusu.jsx";
import { muzikAcikMi, muzikAyarla, muzikDinle, sesAcikMi, sesAyarla, sesDinle, sesTik } from "../lib/ses.js";
import { kozmetikTemasi, tepkiGizleAyarla, useTepkiGizli } from "../lib/kozmetik.js";
import IsimEfekti, { useKartAlani } from "../components/IsimEfekti.jsx";
import { sesMetni } from "../lib/ceviri/ses.js";
import { hataMesaji } from "../lib/hata.js";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../src/lib/supabase.js";
import { useAuth } from "../../src/context/AuthContext.jsx";
import AvatarCerceve from "../components/AvatarCerceve.jsx";
import OyuncuLigAmblemi from "../components/OyuncuLigAmblemi.jsx";
import RozetlerPaneli from "../components/RozetlerPaneli.jsx";
import Koleksiyon from "../components/Koleksiyon.jsx";
import OyuncuVitrinKarti from "../components/OyuncuVitrinKarti.jsx";
import KoleksiyonDokumu from "../components/KoleksiyonDokumu.jsx";
import VitrinRozetleri from "../components/VitrinRozetleri.jsx";
import DavetKarti from "../components/DavetKarti.jsx";
import OyuncuAdiDugmesi from "../components/OyuncuAdiDugmesi.jsx";
import LevelCubugu from "../components/LevelCubugu.jsx";
import LevelOdulleri from "../components/LevelOdulleri.jsx";
import SayanSayi from "../components/SayanSayi.jsx";
import KonumSecici from "../components/KonumSecici.jsx";
import ProfilAyarlari from "../components/ProfilAyarlari.jsx";
import TemaDugmesi from "../components/TemaDugmesi.jsx";
import { KOYU_TEMA_KAPALI } from "../lib/tema.js";
import UstalikIzgarasi from "../components/UstalikIzgarasi.jsx";
import KategoriProfili from "../components/KategoriProfili.jsx";
import { konumHaftaKilitli, konumKilidiKalan, sureMetni } from "../lib/konum.js";
import Bayrak from "../components/Bayrak.jsx";
import { rutbeBul, sonrakiRutbe } from "../lib/ranks.js";
import { y } from "../lib/yol.js";
import { GARDIROP_ACIK } from "../lib/ozellikBayraklari.js";
import {
  pushDestekleniyor,
  iosSekmesi,
  pushDurumu,
  bildirimleriAc,
  bildirimleriKapat,
} from "../lib/push.js";
import { DILLER, tt } from "../lib/dil.js";
import { useDil } from "../lib/dilKanca.js";
import { HesapGuvenceKarti, misafirMi } from "../components/HesapGuvence.jsx";
import CikisOnayi from "../components/CikisOnayi.jsx";
import {
  QtAnahtar,
  QtCip,
  QtDugme,
  QtIkon,
  QtIlerleme,
  QtKart,
  QtListe,
  QtListeSatiri,
  QtModal,
  QtRozet,
  QtSekmeler,
  sayiBicim,
  sinif,
  siraStili,
  useSiraliGiris,
} from "../tasarim/index.js";
import "../tasarim/ekranlar/dukkan-profil.css";


const SEKME_KODLARI = ["istatistik", "ayarlar", "rozet", "koleksiyon", "davet"];

export default function ProfilePage() {
  const { user, profile, refreshProfile, signOut, profilHata } = useAuth();
  // Paket 41 A: profil hiç gelmezse sonsuza dek "Yükleniyor…" kalınmaz
  const profilGecikti = useZamanAsimi(!profile);
  const { dil, dilDegistir } = useDil();
  // Profil dört sekmeye ayrıldı; varsayılan İstatistiklerim.
  const [sekme, setSekme] = useState("istatistik");
  const [cikisOnay, setCikisOnay] = useState(false);
  // Paket 41 C: avatar menüsündeki "Ayarlar" → /profil?sekme=ayarlar doğrudan Ayarlar sekmesini açar
  const konum = useLocation();
  const git = useNavigate();
  // Madde 8: sekme tıklanınca adres satırı ?sekme=… olur (replace: geri tuşu profilden çıkar, sekme geçmişi şişmez);
  // yenilemede aynı sekme açılır. state.sekmeTik: aşağıdaki kaydırma yalnız dışarıdan gelen bağlantılarda çalışır.
  const sekmeSec = (k) => {
    setSekme(k);
    try {
      const p = new URLSearchParams(konum.search);
      p.set("sekme", k); p.delete("bagla");
      git({ pathname: konum.pathname, search: `?${p.toString()}` }, { replace: true, state: { sekmeTik: true } });
    } catch (e) { console.error("[Bildim] sekme adresi yazılamadı:", e); }
  };
  useEffect(() => {
    const s = new URLSearchParams(konum.search).get("sekme");
    if (!s || !SEKME_KODLARI.includes(s)) return;
    setSekme(s);
    if (konum.state?.sekmeTik) return undefined;
    const bagla = new URLSearchParams(konum.search).get("bagla") === "1";
    const t = setTimeout(() => {
      // Üst çubuk yapışkan: sekmeler onun hemen altına gelsin
      // D-202: çıkış onayındaki "Önce hesabımı bağla" → "Hesabımı güvenceye al" kartına kaydır
      const el = (bagla && document.querySelector(".qt-pf-guvence")) || document.getElementById("profil-sekmeler");
      if (!el) return;
      const ust = document.querySelector(".qt-ustcubuk, .bd-ust-blok")?.getBoundingClientRect().height ?? 0;
      window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - ust - 8), behavior: "auto" });
    }, 150);
    return () => clearTimeout(t);
  }, [konum.search, konum.key]);
  const [bildirim, setBildirim] = useState("kapali");
  const [bildirimCalisiyor, setBildirimCalisiyor] = useState(false);
  const [ses, setSes] = useState(() => sesAcikMi());
  useEffect(() => sesDinle(setSes), []);   // Paket 41 B: maç şeridi/avatar menüsüyle eşit
  const [muzik, setMuzik] = useState(() => muzikAcikMi());
  useEffect(() => muzikDinle(setMuzik), []);
  const [bildirimHata, setBildirimHata] = useState(null);
  const [konumDuzenle, setKonumDuzenle] = useState(false);
  const [silOnay, setSilOnay] = useState(false);
  const [silMetin, setSilMetin] = useState("");
  const [silHata, setSilHata] = useState(null);
  const [siliniyor, setSiliniyor] = useState(false);
  // Hatalarım bankası özeti
  const [banka, setBanka] = useState(null);
  const vsTema = kozmetikTemasi(useKartAlani(user?.id, "vs_karti"));   // 540: profil başlığı VS kartı teması
  // Oyun hissi: ilk ekran blokları sıralı girer (6 öğe ≤ 360 ms); yalnız ilk açılışta, sekme değişiminde yeniden oynamaz.
  const sirali = useSiraliGiris(Boolean(profile));

  useEffect(() => {
    pushDurumu().then(setBildirim).catch((e) => console.error("[Bildim] bildirim durumu okunamadı:", e));
  }, []);

  // Hatalarım: öğrenilen / bankada bekleyen
  useEffect(() => {
    let aktif = true;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("yanlis_bankam");
        if (error) throw error;
        const ilk = (data ?? [])[0];
        if (aktif && ilk) setBanka({ ogrenilen: ilk.ogrenilen ?? 0, bekleyen: ilk.bekleyen ?? 0 });
      } catch (e) { console.warn("[Bildim] yanlis_bankam başarısız:", e?.message ?? e);
        /* migration bekliyor olabilir — bölüm gizli kalır */
      }
    })();
    return () => {
      aktif = false;
    };
  }, []);

  // Dar ekranda etiketsiz kalan sekme ikonlarına erişilebilir ad + ipucu (QtSekmeler ortak; burada öznitelik eklenir)
  const sekmeAdlari = { istatistik: tt("İstatistiklerim"), ayarlar: tt("Ayarlar"), rozet: tt("Rozetler"), koleksiyon: tt("Koleksiyon"), davet: tt("Davet") };
  useEffect(() => {
    try {
      document.querySelectorAll("#profil-sekmeler [role=tab][data-kod]").forEach((el) => {
        const ad = sekmeAdlari[el.getAttribute("data-kod")];
        if (!ad) return;
        el.setAttribute("aria-label", ad);
        el.setAttribute("title", ad);
      });
    } catch (e) { console.error("[Bildim] sekme adları yazılamadı:", e); }
  }, [sekme, !!profile]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!profile) {
    return (
      <div className="qt-pf">
        <QtKart>
          <DurumKutusu durum={profilHata || profilGecikti ? "hata" : "yukleniyor"} satir={4}
                       onTekrar={() => refreshProfile(user?.id)} />
        </QtKart>
      </div>
    );
  }

  // P2A: rütbe LEVEL'e bağlı (lig puanı ayrı: "Puan" plakası ve Lig sayfası).
  const level = Number(profile.level) || 1;
  const r = rutbeBul(level);
  const sonraki = sonrakiRutbe(level);

  const bildirimDegistir = async () => {
    setBildirimHata(null);
    setBildirimCalisiyor(true);
    try {
      if (bildirim === "acik") {
        await bildirimleriKapat();
        setBildirim("kapali");
      } else {
        await bildirimleriAc();
        setBildirim("acik");
      }
    } catch (e) {
      setBildirimHata(hataMesaji(e));
      try { setBildirim(await pushDurumu()); } catch (e2) { console.error("[Bildim] bildirim durumu okunamadı:", e2); }
    } finally {
      setBildirimCalisiyor(false);
    }
  };

  // Paket 19 §F: kapalıysa NEDEN kapalı olduğunu söyler (engelli / iPhone ana ekran / henüz sorulmadı).
  const bildirimAciklama = bildirim === "acik"
    ? tt("Maç sırası ve davetler için haber veririz.")
    : bildirim === "engelli"
      ? tt("Kapalı. Tarayıcı bildirimleri engellemiş; site ayarlarından izin ver.")
      : bildirim === "desteklenmiyor"
        ? (iosSekmesi()
          ? tt("Kapalı. iPhone'da önce Paylaş → Ana Ekrana Ekle, sonra uygulamayı oradan aç.")
          : tt("Kapalı. Bu tarayıcı bildirimleri desteklemiyor."))
        : pushDestekleniyor() && Notification.permission === "granted"
          ? tt("Kapalı. Açmak için dokun.")
          : tt("Kapalı. Açınca tarayıcı izin isteyecek.");


  const silKapat = () => { setSilOnay(false); setSilMetin(""); };
  const hesabiSil = async () => {
    setSilHata(null);
    setSiliniyor(true);
    try {
      const { error } = await supabase.rpc("hesabimi_sil");
      if (error) throw error;
      await signOut();
    } catch (e) {
      setSilHata(hataMesaji(e, tt("Hesap silinemedi.")));
      setSiliniyor(false);
    }
  };

  const sekmeler = [
    // Dar ekranda aktif sekmeye sığsın diye kısa etiket (CSS: dukkan-profil.css › .qt-pf-sek-kisa); ekran okuyucu tam adı okur
    { kod: "istatistik", ad: <><span className="qt-pf-sek-uzun">{tt("İstatistiklerim")}</span><span className="qt-pf-sek-kisa" aria-hidden="true">{tt("İstatistik")}</span></>, ikon: "grafik" },
    { kod: "ayarlar", ad: tt("Ayarlar"), ikon: "ayar" },
    { kod: "rozet", ad: tt("Rozetler"), ikon: "madalya" },
    { kod: "koleksiyon", ad: tt("Koleksiyon"), ikon: "palet" },
    { kod: "davet", ad: tt("Davet"), ikon: "kisiEkle" },
  ];

  return (
    <div className="qt-pf">
      <h1 className="qt-gizli">{tt("Profil")}</h1>

      {/* ---------- Kimlik: avatar (lig çerçevesiyle), takma ad, rütbe, level ---------- */}
      {/* Oyun hissi: kart içinde kart yok — oyuncu kartı tek afiş, rütbe + level çubuğu ona bitişik şerit.
          Lig sahnesi (2 Eki 2026): koyu levha yerine ligin açık zemini — bkz. OyuncuVitrinKarti `ligSahnesi`. */}
      <section className={sinif("qt-pf-kimlik", sirali)} style={siraStili(0)} aria-label={tt("Oyuncu kimliği")}>
        {/* Görsel revizyon (25 Eyl): tek oyuncu kartı — başkalarının gördüğü kartın aynısı (avatar + çerçeve + arka plan,
            isim, unvan, lig + level, vitrin rozetleri). */}
        <OyuncuVitrinKarti userId={user?.id} profile={profile} boyut={88} hareketli arkaPlan ligSahnesi koleksiyonCipi={false} className="qt-pf-ok" />
        <div className="qt-pf-serit">
          {/* Rütbe etiketi kaldırıldı (2 Eki 2026): LevelCubugu zaten "Level N · {rütbe}" gösteriyor, tekrardı. */}
          {misafirMi(user) && (
            <div className="qt-pf-rozetler">
              <QtRozet ton="uyari" ikon="kisi">{tt("Misafir")}</QtRozet>
            </div>
          )}
          <LevelCubugu profile={profile} canli levelYok />
          {/* 1039: sıradaki 3 level ödülü (avatar · skill · rütbe) */}
          <LevelOdulleri level={profile?.level} />
        </div>
      </section>

      {/* 646: Koleksiyon Puanı özeti (rozet · unvan · puan + nadirlik dağılımı); tam döküm Koleksiyon sekmesinde */}
      <KoleksiyonDokumu sirali={sirali} sira={1} />

      {/* ---------- Üç sayı: puan mor · kupa altın · seri turuncu (oyun kartı dili); hedefi olan kart soluk ---------- */}
      <ul className="qt-pf-sayilar">
        <li className={sirali} style={siraStili(2)}>
          <div className="qt-pf-sayi qt-pf-sayi--mor">
            {/* D-504: lig puanı coin ikonuyla karışıyordu → lig (kalkan) ikonu */}
            <span className="qt-pf-sayi-ikon" aria-hidden="true"><QtIkon ad="lig" boyut={20} /></span>
            <b className="qt-sayi"><SayanSayi deger={profile.puan} bicim={(n) => sayiBicim(n)} /></b>
            <span>{tt("Toplam puan")}</span>
          </div>
        </li>
        {/* Boş durum: kocaman bir "0" yerine hedefi göster. */}
        <li className={sirali} style={siraStili(3)}>
          <div className={sinif("qt-pf-sayi qt-pf-sayi--altin", !(profile.sampiyonluk > 0) && "qt-pf-sayi--bos")}>
            <span className="qt-pf-sayi-ikon" aria-hidden="true"><QtIkon ad="kupa" boyut={20} /></span>
            {profile.sampiyonluk > 0 ? (
              <>
                <b className="qt-sayi"><SayanSayi deger={profile.sampiyonluk} /></b>
                <span>{tt("Şampiyonluk")}</span>
              </>
            ) : (
              <span className="qt-pf-sayi-hedef">{tt("Turnuva kazan, ilk kupan gelsin")}</span>
            )}
          </div>
        </li>
        <li className={sirali} style={siraStili(4)}>
          <div className={sinif("qt-pf-sayi qt-pf-sayi--vurgu", !((profile.seri ?? 0) > 0) && "qt-pf-sayi--bos")}>
            <span className={sinif("qt-pf-sayi-ikon", (profile.seri ?? 0) > 0 && "qt-h-salla-ara")} aria-hidden="true"><QtIkon ad="ates" boyut={20} /></span>
            {(profile.seri ?? 0) > 0 ? (
              <>
                <b className="qt-sayi">{profile.seri}</b>
                <span>{tt("Günlük Seri")}</span>
              </>
            ) : (
              <span className="qt-pf-sayi-hedef">{tt("Maç oyna, serin başlasın")}</span>
            )}
          </div>
        </li>
      </ul>

      {/* ---------- SEKMELER ---------- */}
      <div id="profil-sekmeler" className={sinif("qt-pf-sekmeler", sirali)} style={siraStili(5)}>
        <QtSekmeler etiket={tt("Profil bölümleri")} sekmeler={sekmeler} aktif={sekme} onSec={sekmeSec} />
      </div>

      <div id={`qt-panel-${sekme}`} role="tabpanel" className="qt-pf-panel">
        {sekme === "istatistik" && (<>
          {/* Kategori başarısı + unvan (Paket 14, 4.8/4.10) */}
          <QtKart as="section" className={sinif("qt-pf-bolum", sirali)} style={siraStili(6)} aria-labelledby="qt-pf-kategori">
            <h2 id="qt-pf-kategori" className="qt-baslik-3 qt-plaka">{tt("Kategori başarın")}</h2>
            <KategoriProfili userId={user?.id} />
          </QtKart>
          <UstalikIzgarasi sirali={sirali} sira={7} />

          {/* ---------- Hatalarım bankası ---------- */}
          {banka && (
            <QtListe etiket={tt("Hatalarım")}>
              <QtListeSatiri
                as={Link}
                to={y("/calisma")}
                ikon="kitap"
                ikonTon="dogru"
                baslik={tt("Hatalarım")}
                alt={tt("Öğrenilen soru: {0} · Bankada: {1}", { 0: banka.ogrenilen, 1: banka.bekleyen })}
                ok
              />
            </QtListe>
          )}

          {sonraki && (
            <QtKart as="section" className="qt-pf-bolum" aria-labelledby="qt-pf-rutbe">
              <div className="qt-pf-bolum-baslik">
                <h2 id="qt-pf-rutbe" className="qt-baslik-3">
                  {tt("Sonraki rütbe:")} <QtIkon ad={sonraki.ikon} boyut={18} /> {sonraki.ad}
                </h2>
                <span className="qt-kucuk qt-soluk">{tt("Level {n}", { n: level })}/{sonraki.min}</span>
              </div>
              <QtIlerleme
                deger={level - r.min}
                en={Math.max(1, sonraki.min - r.min)}
                ton="vurgu"
                canli
                etiket={tt("{0} rütbesine ilerleme", { 0: sonraki.ad })}
              />
            </QtKart>
          )}
        </>)}

        {sekme === "ayarlar" && (<>
          {/* Paket 20 III: misafir hesabı güvenceye alma — ayarların en üstünde */}
          <HesapGuvenceKarti />

          {/* ---------- Oyun ayarları: ses, dil, bildirim, tema ---------- */}
          <QtKart as="section" className="qt-pf-bolum" aria-labelledby="qt-pf-oyun-ayar">
            <h2 id="qt-pf-oyun-ayar" className="qt-baslik-3">{tt("Oyun ayarları")}</h2>
            {/* Maç sesleri: son 5 saniye tik'i, doğru/yanlış vuruşu, bitiş tonu (varsayılan açık) */}
            {/* Ajan H: müzik ayrı anahtar (bildim_muzik); efektler eski bildim_ses anahtarında */}
            <QtAnahtar
              acik={muzik}
              etiket={sesMetni("Müzik")}
              aciklama={sesMetni("Arka plan müziği (menü, maç, turnuva)")}
              onDegis={(yeniDurum) => { muzikAyarla(yeniDurum); setMuzik(yeniDurum); }}
            />
            <QtAnahtar
              acik={ses}
              etiket={sesMetni("Efektler")}
              aciklama={sesMetni("Sayaç, doğru/yanlış ve maç sonu sesleri")}
              onDegis={(yeniDurum) => {
                sesAyarla(yeniDurum);
                setSes(yeniDurum);
                if (yeniDurum) sesTik(3); // örnek ses
              }}
            />
            {/* 542: rakibin maç içi tepkileri (emote) — cihazda saklanır (bkz. lib/kozmetik.js) */}
            <TepkiGizleAnahtari />
            <QtAnahtar
              acik={bildirim === "acik"}
              etiket={tt("Bildirimler")}
              aciklama={bildirimAciklama}
              devreDisi={bildirimCalisiyor || bildirim === "engelli" || bildirim === "desteklenmiyor"}
              onDegis={bildirimDegistir}
            />
            {bildirimHata && <p className="qt-pf-hata" role="alert">{bildirimHata}</p>}

            {/* Dil: arayüz + soru dili. Seçim profile yazılır, sayfa bir kez yenilenir. */}
            <div className="qt-pf-ayar-satir">
              <div className="qt-pf-ayar-metin">
                <span className="qt-pf-ayar-ad">{tt("Dil")}</span>
                <span className="qt-kucuk qt-soluk">{tt("Arayüzün ve soruların dili")}</span>
              </div>
              <div className="qt-pf-dil" role="group" aria-label={tt("Dil")}>
                {DILLER.map((d) => (
                  <QtCip key={d} secili={dil === d} onClick={() => dilDegistir(d)}>
                    {d.toUpperCase()}
                  </QtCip>
                ))}
              </div>
            </div>

            {/* Koyu tema geçici olarak kapalı (lib/tema.js › KOYU_TEMA_KAPALI) */}
            {!KOYU_TEMA_KAPALI && (
              <div className="qt-pf-ayar-satir">
                <div className="qt-pf-ayar-metin">
                  <span className="qt-pf-ayar-ad">{tt("Tema")}</span>
                  <span className="qt-kucuk qt-soluk">{tt("Açık ve koyu tema arasında geç")}</span>
                </div>
                <TemaDugmesi />
              </div>
            )}
          </QtKart>

          {/* ---------- Görünüm (3B karakter) — DONDURULDU (GARDIROP_ACIK) ---------- */}
          {GARDIROP_ACIK && (
            <QtListe etiket={tt("Görünüm")}>
              <QtListeSatiri
                as={Link}
                to={y("/gorunum")}
                ikon="tisort"
                ikonTon="vurgu"
                baslik={tt("Görünüm")}
                alt={tt("Türünü seç, kozmetiklerini tak. Meydanda böyle görünürsün.")}
                ok
              />
            </QtListe>
          )}

          <ProfilAyarlari />

          {/* ---------- Konum (şehir/ülke ligi) ---------- */}
          {konumDuzenle ? (
            <KonumSecici mod="kart" onKapat={() => setKonumDuzenle(false)} />
          ) : (
            <QtKart as="section" className="qt-pf-bolum" aria-labelledby="qt-pf-konum">
              <div className="qt-pf-ayar-satir">
                <div className="qt-pf-ayar-metin">
                  <h2 id="qt-pf-konum" className="qt-pf-ayar-ad">{tt("Yarıştığın şehir")}</h2>
                  <span className="qt-kucuk qt-soluk">
                    {profile.ulke
                      ? <><Bayrak kod={profile.ulke} /> {profile.sehir ?? "—"}</>
                      : tt("Henüz seçmedin — şehir ve ülke liglerine giremezsin.")}
                  </span>
                  {konumHaftaKilitli(profile) ? (
                    <span className="qt-kucuk qt-soluk">
                      {tt("Bu hafta puan kazandığın için şehrini yeni hafta başlayana kadar değiştiremezsin.")}
                    </span>
                  ) : konumKilidiKalan(profile.konum_degisti_at) > 0 && (
                    <span className="qt-kucuk qt-soluk">
                      {tt("Bir sonraki değişiklik için {0} var.", { 0: sureMetni(konumKilidiKalan(profile.konum_degisti_at)) })}
                    </span>
                  )}
                </div>
                <QtDugme tur="ikincil" boyut="k" onClick={() => setKonumDuzenle(true)}>
                  {profile.ulke ? tt("Değiştir") : tt("Seç")}
                </QtDugme>
              </div>
            </QtKart>
          )}

          {/* ---------- Yasal / hesap ---------- */}
          <section className="qt-pf-bolum qt-pf-hesap" aria-labelledby="qt-pf-hesap">
            <h2 id="qt-pf-hesap" className="qt-baslik-3 qt-pf-zemin-baslik">{tt("Hesap")}</h2>
            <QtListe etiket={tt("Hesap")}>
              <QtListeSatiri as={Link} to="/gizlilik" ikon="kalkan" baslik={tt("Gizlilik politikası")} ok />
              <QtListeSatiri as={Link} to="/kosullar" ikon="liste" baslik={tt("Kullanım koşulları")} ok />
            </QtListe>
            {/* Paket 42 A: çıkış geri alınabilir — ikincil */}
            <QtDugme tur="ikincil" ikon="cikis" tamGenislik onClick={() => setCikisOnay(true)}>
              {tt("Çıkış Yap")}
            </QtDugme>
            {/* D-102/D-202: misafirde geri alınamaz uyarısı + "Önce hesabımı bağla"; normalde kısa onay */}
            <CikisOnayi acik={cikisOnay} onKapat={() => setCikisOnay(false)} />
            {/* Paket 42 A: geri alınamaz eylem küçük ve en altta; sayfanın en belirgin öğesi değil */}
            <div className="qt-pf-sil">
              <QtDugme tur="tehlike" boyut="k" ikon="cop" onClick={() => { setSilHata(null); setSilOnay(true); }}>
                {tt("Hesabımı sil")}
              </QtDugme>
              <p className="qt-kucuk qt-soluk-zemin">
                {tt("Profilin, puanların, rozetlerin ve tüm oyun kayıtların kalıcı olarak silinir. Bu işlem geri alınamaz.")}
              </p>
            </div>
          </section>
        </>)}

        {sekme === "rozet" && (<>
          {/* Rozet paketi: gruplu madalyonlar, ilerleme, vitrin (çerçeveler Koleksiyon'a taşındı) */}
          {user?.id && <RozetlerPaneli userId={user.id} />}
        </>)}

        {/* 481: çerçeveler (kazanılan + kilitli), auralar, avatarlar tek yerde */}
        {sekme === "koleksiyon" && user?.id && <Koleksiyon />}

        {sekme === "davet" && (
          /* Rozet + çerçeve paketi: yeni davet sistemi (300 / +100, Level 5, durum listesi) */
          <DavetKarti />
        )}
      </div>

      <QtModal
        acik={silOnay}
        onKapat={siliniyor ? () => {} : silKapat}
        kapatDugmesi={!siliniyor}
        ortuKapatir={!siliniyor}
        baslik={tt("Hesabını silmek üzeresin")}
        aciklama={tt("Bu işlem geri alınamaz. Onaylamak için aşağıya hesap kimliğini ({0}) yaz.", { 0: profile.username })}
        altlik={
          <div className="qt-pf-modal-dugmeler">
            <QtDugme
              tur="tehlike"
              tamGenislik
              yukleniyor={siliniyor}
              devreDisi={silMetin.trim() !== profile.username}
              onClick={hesabiSil}
            >
              {siliniyor ? tt("Siliniyor…") : tt("Evet, hesabımı sil")}
            </QtDugme>
            <QtDugme tur="ikincil" tamGenislik devreDisi={siliniyor} onClick={silKapat}>
              {tt("Vazgeç")}
            </QtDugme>
          </div>
        }
      >
        <label className="qt-pf-alan">
          <span>{tt("Hesap kimliğin")}</span>
          <input
            type="text"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            value={silMetin}
            onChange={(e) => setSilMetin(e.target.value)}
            placeholder={profile.username}
            data-qt-ilk-odak
          />
        </label>
        {silHata && <p className="qt-pf-hata" role="alert">{silHata}</p>}
      </QtModal>
    </div>
  );
}

/** Profil › Ayarlar: "Rakip tepkilerini gizle" (cihazda; maç ekranı anında uyar). */
function TepkiGizleAnahtari() {
  const gizli = useTepkiGizli();
  return (
    <QtAnahtar
      acik={gizli}
      etiket={tt("Rakip tepkilerini gizle")}
      aciklama={tt("Maçta rakibinin gönderdiği tepkiler (emoji) ekranında görünmez. Bu cihazda saklanır.")}
      onDegis={(yeni) => tepkiGizleAyarla(yeni)}
    />
  );
}
