import { useEffect, useState } from "react";
import DurumKutusu, { useZamanAsimi } from "../components/DurumKutusu.jsx";
import { sesAcikMi, sesAyarla, sesDinle, sesTik } from "../lib/ses.js";
import { hataMesaji } from "../lib/hata.js";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../../src/lib/supabase.js";
import { useAuth } from "../../src/context/AuthContext.jsx";
import AvatarCerceve from "../components/AvatarCerceve.jsx";
import LigCerceveSecici from "../components/LigCerceveSecici.jsx";
import LevelCubugu from "../components/LevelCubugu.jsx";
import SayanSayi from "../components/SayanSayi.jsx";
import KonumSecici from "../components/KonumSecici.jsx";
import ProfilAyarlari from "../components/ProfilAyarlari.jsx";
import TemaDugmesi from "../components/TemaDugmesi.jsx";
import { KOYU_TEMA_KAPALI } from "../lib/tema.js";
import UstalikIzgarasi from "../components/UstalikIzgarasi.jsx";
import KategoriProfili from "../components/KategoriProfili.jsx";
import { konumKilidiKalan, sureMetni } from "../lib/konum.js";
import Bayrak from "../components/Bayrak.jsx";
import { rutbeBul, sonrakiRutbe } from "../lib/ranks.js";
import { y } from "../lib/yol.js";
import { GARDIROP_ACIK } from "../lib/ozellikBayraklari.js";
import { ayarlar } from "../lib/ayarlar.js";
import {
  pushDestekleniyor,
  iosSekmesi,
  pushDurumu,
  bildirimleriAc,
  bildirimleriKapat,
} from "../lib/push.js";
import { DILLER, tt, ttSunucu } from "../lib/dil.js";
import { useDil } from "../lib/dilKanca.js";
import { HesapGuvenceKarti, misafirMi } from "../components/HesapGuvence.jsx";
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
} from "../tasarim/index.js";
import "../tasarim/ekranlar/dukkan-profil.css";

const SEKME_KODLARI = ["istatistik", "ayarlar", "rozet", "davet"];

export default function ProfilePage() {
  const { user, profile, refreshProfile, signOut, profilHata } = useAuth();
  // Paket 41 A: profil hiç gelmezse sonsuza dek "Yükleniyor…" kalınmaz
  const profilGecikti = useZamanAsimi(!profile);
  const { dil, dilDegistir } = useDil();
  const [rozetler, setRozetler] = useState([]);
  const [kazanilan, setKazanilan] = useState(new Set());
  const [kopyalandi, setKopyalandi] = useState(false);
  // Profil dört sekmeye ayrıldı; varsayılan İstatistiklerim.
  const [sekme, setSekme] = useState("istatistik");
  // Paket 41 C: avatar menüsündeki "Ayarlar" → /profil?sekme=ayarlar doğrudan Ayarlar sekmesini açar
  const konum = useLocation();
  useEffect(() => {
    const s = new URLSearchParams(konum.search).get("sekme");
    if (!s || !SEKME_KODLARI.includes(s)) return;
    setSekme(s);
    const t = setTimeout(() => {
      // Üst çubuk yapışkan: sekmeler onun hemen altına gelsin
      const el = document.getElementById("profil-sekmeler");
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
  const [bildirimHata, setBildirimHata] = useState(null);
  const [konumDuzenle, setKonumDuzenle] = useState(false);
  const [silOnay, setSilOnay] = useState(false);
  const [silMetin, setSilMetin] = useState("");
  const [silHata, setSilHata] = useState(null);
  const [siliniyor, setSiliniyor] = useState(false);
  // Hatalarım bankası özeti
  const [banka, setBanka] = useState(null);
  // Davet ödülü koda gömülmez: oyun_ayarlari.davet_coin
  const [davetCoin, setDavetCoin] = useState(null);

  useEffect(() => {
    pushDurumu().then(setBildirim).catch((e) => console.error("[Bildim] bildirim durumu okunamadı:", e));
  }, []);

  useEffect(() => {
    let aktif = true;
    ayarlar()
      .then((o) => {
        if (aktif && Number(o?.davet_coin) > 0) setDavetCoin(Number(o.davet_coin));
      })
      .catch((e) => console.error("[Bildim] oyun ayarları okunamadı:", e));
    return () => { aktif = false; };
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

  useEffect(() => {
    supabase.from("badges").select("*").then(({ data, error }) => {
      if (error) console.error("[Bildim] rozetler okunamadı:", error.message);
      setRozetler(data ?? []);
    });
    supabase
      .from("user_badges")
      .select("badge_id")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (error) console.error("[Bildim] kazanılan rozetler okunamadı:", error.message);
        setKazanilan(new Set((data ?? []).map((b) => b.badge_id)));
      });
  }, [user.id]);

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
      ? tt("Kapalı — tarayıcı ayarlarından engellenmiş. Açmak için adres çubuğundaki site ayarlarından bildirimlere izin ver.")
      : bildirim === "desteklenmiyor"
        ? (iosSekmesi()
          ? tt("Kapalı — iPhone'da bildirimler yalnız ana ekrandaki uygulamada çalışır. Paylaş → Ana Ekrana Ekle, sonra oradan aç.")
          : tt("Kapalı — bu tarayıcı bildirimleri desteklemiyor."))
        : pushDestekleniyor() && Notification.permission === "granted"
          ? tt("Kapalı — izin var ama bu cihaz bağlı değil. Açmak için dokun.")
          : tt("Kapalı — henüz izin verilmedi. Açınca tarayıcı izin isteyecek.");

  const davetPaylas = async () => {
    const link = `${window.location.origin}/?davet=${user.id}`;
    const mesaj = davetCoin
      ? tt("Quiz Tactics'te benimle yarışmaya var mısın? Bu linkle gel, ikimiz de {n} coin kazanalım: {link}", { n: davetCoin, link })
      : tt("Quiz Tactics'te benimle yarışmaya var mısın? Bu linkle gel, ikimiz de coin kazanalım: {link}", { link });
    if (navigator.share) {
      try {
        await navigator.share({ title: "Quiz Tactics", text: mesaj });
      } catch { /* vazgeçti */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(mesaj);
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 2500);
    } catch (e) {
      console.error("[Bildim] davet linki kopyalanamadı:", e);
    }
  };

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
    { kod: "istatistik", ad: tt("İstatistiklerim"), ikon: "grafik" },
    { kod: "ayarlar", ad: tt("Ayarlar"), ikon: "ayar" },
    { kod: "rozet", ad: tt("Rozetler"), ikon: "madalya" },
    { kod: "davet", ad: tt("Davet"), ikon: "kisiEkle" },
  ];

  return (
    <div className="qt-pf">
      <h1 className="qt-gizli">{tt("Profil")}</h1>

      {/* ---------- Kimlik: avatar (lig çerçevesiyle), takma ad, rütbe, level ---------- */}
      <QtKart className="qt-pf-kimlik">
        <span className="qt-pf-avatar">
          <AvatarCerceve profile={profile} boyut={88} userId={user?.id} />
        </span>
        <div className="qt-pf-kimlik-metin">
          {/* Görünen ad takma addır; gerçek kullanıcı adı gösterilmez. */}
          <p className="qt-baslik-2 qt-pf-ad">{profile.gorunen_ad}</p>
          <div className="qt-pf-rozetler">
            <QtRozet ton="mor" ikon={r.ikon}>{r.ad}</QtRozet>
            {/* Paket 20 III: misafir hesabı her yerde belli olsun */}
            {misafirMi(user) && <QtRozet ton="uyari" ikon="kisi">{tt("Misafir")}</QtRozet>}
          </div>
        </div>
        <div className="qt-pf-level">
          <LevelCubugu profile={profile} />
        </div>
      </QtKart>

      {/* ---------- Üç sayı ---------- */}
      <ul className="qt-pf-sayilar">
        <li>
          <QtKart dolgu="k" className="qt-pf-sayi">
            <QtIkon ad="coin" boyut={22} className="qt-pf-sayi-ikon qt-pf-sayi-ikon--coin" />
            <b className="qt-sayi"><SayanSayi deger={profile.puan} bicim={(n) => sayiBicim(n)} /></b>
            <span>{tt("Puan")}</span>
          </QtKart>
        </li>
        {/* Boş durum: kocaman bir "0" yerine hedefi göster. */}
        <li>
          <QtKart dolgu="k" className="qt-pf-sayi">
            <QtIkon ad="kupa" boyut={22} className="qt-pf-sayi-ikon" />
            {profile.sampiyonluk > 0 ? (
              <>
                <b className="qt-sayi"><SayanSayi deger={profile.sampiyonluk} /></b>
                <span>{tt("Şampiyonluk")}</span>
              </>
            ) : (
              <span className="qt-pf-sayi-hedef">{tt("Turnuva kazan, ilk kupan gelsin")}</span>
            )}
          </QtKart>
        </li>
        <li>
          <QtKart dolgu="k" className="qt-pf-sayi">
            <QtIkon ad="ates" boyut={22} className="qt-pf-sayi-ikon qt-pf-sayi-ikon--vurgu" />
            {(profile.seri ?? 0) > 0 ? (
              <>
                <b className="qt-sayi">{profile.seri}</b>
                <span>{tt("Günlük Seri")}</span>
              </>
            ) : (
              <span className="qt-pf-sayi-hedef">{tt("Maç oyna, serin başlasın")}</span>
            )}
          </QtKart>
        </li>
      </ul>

      {/* ---------- SEKMELER ---------- */}
      <div id="profil-sekmeler" className="qt-pf-sekmeler">
        <QtSekmeler etiket={tt("Profil bölümleri")} sekmeler={sekmeler} aktif={sekme} onSec={setSekme} />
      </div>

      <div id={`qt-panel-${sekme}`} role="tabpanel" className="qt-pf-panel">
        {sekme === "istatistik" && (<>
          {/* Kategori başarısı + unvan (Paket 14, 4.8/4.10) */}
          <QtKart as="section" className="qt-pf-bolum" aria-labelledby="qt-pf-kategori">
            <h2 id="qt-pf-kategori" className="qt-baslik-3">{tt("Kategori başarın")}</h2>
            <KategoriProfili userId={user?.id} />
          </QtKart>
          <UstalikIzgarasi />

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
            <QtAnahtar
              acik={ses}
              etiket={tt("Oyun sesleri")}
              aciklama={tt("Sayaç, doğru/yanlış ve maç sonu sesleri")}
              onDegis={(yeniDurum) => {
                sesAyarla(yeniDurum);
                setSes(yeniDurum);
                if (yeniDurum) sesTik(3); // örnek ses
              }}
            />
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
                  {konumKilidiKalan(profile.konum_degisti_at) > 0 && (
                    <span className="qt-kucuk qt-soluk">
                      {tt("Değiştirmek için {0} kaldı.", { 0: sureMetni(konumKilidiKalan(profile.konum_degisti_at)) })}
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
            <QtDugme tur="ikincil" ikon="cikis" tamGenislik onClick={signOut}>
              {tt("Çıkış Yap")}
            </QtDugme>
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
          <QtKart as="section" className="qt-pf-bolum" aria-labelledby="qt-pf-rozetler">
            <div className="qt-pf-bolum-baslik">
              <h2 id="qt-pf-rozetler" className="qt-baslik-3">{tt("Rozetler")}</h2>
              <QtRozet ton="coin" boyut="k">{kazanilan.size}/{rozetler.length}</QtRozet>
            </div>
            <ul className="qt-pf-rozet-izgara">
              {rozetler.map((b) => {
                const var_mi = kazanilan.has(b.id);
                return (
                  <li key={b.id} className={"qt-pf-rozet" + (var_mi ? "" : " qt-pf-rozet--kilitli")}>
                    <span className="qt-pf-rozet-ikon" aria-hidden="true">
                      <span className="qt-pf-rozet-simge">{b.ikon}</span>
                      {!var_mi && <span className="qt-pf-rozet-kilit"><QtIkon ad="kilit" boyut={12} /></span>}
                    </span>
                    <span className="qt-pf-rozet-ad">{ttSunucu(b.ad)}</span>
                    <span className="qt-pf-rozet-aciklama">{ttSunucu(b.aciklama)}</span>
                    {!var_mi && <span className="qt-gizli">{tt("Kilitli")}</span>}
                  </li>
                );
              })}
            </ul>
          </QtKart>
          {/* 2D-E: lig çerçeveleri (lig atlayınca kazanılır, kalıcı) */}
          {user?.id && <LigCerceveSecici profile={profile} userId={user.id} />}
        </>)}

        {sekme === "davet" && (
          <QtKart as="section" className="qt-pf-davet" aria-labelledby="qt-pf-davet">
            <span className="qt-pf-davet-ikon" aria-hidden="true"><QtIkon ad="hediye" boyut={36} /></span>
            <h2 id="qt-pf-davet" className="qt-baslik-2">{tt("Arkadaşını davet et")}</h2>
            <p className="qt-govde qt-soluk">
              {davetCoin
                ? tt("Her davet için ikiniz de {n} coin kazanırsınız.", { n: sayiBicim(davetCoin) })
                : tt("Her davet için ikiniz de coin kazanırsınız.")}
              {profile.davet_sayisi > 0 && (
                <> {tt("Şu ana kadar {n} kişi davet ettin.", { n: profile.davet_sayisi })}</>
              )}
            </p>
            <QtDugme ikon={kopyalandi ? "onay" : "paylas"} tamGenislik onClick={davetPaylas}>
              {kopyalandi ? tt("Kopyalandı") : tt("Davet linkini paylaş")}
            </QtDugme>
          </QtKart>
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
