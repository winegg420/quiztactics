import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { QtMarka, QtCip, QtKart, QtDugme, QtToast, QtBosDurum, QtIkon } from "../../oyun/tasarim/index.js";
import "../../oyun/tasarim/ekranlar/g-ortak.css";
import "../../oyun/tasarim/ekranlar/g-giris.css";
import { girisHedefiniKaydet } from "../lib/girisHedefi.js";
import { useDil } from "../../oyun/lib/dilKanca.js";
import { DILLER, girisDiliniKaydet } from "../../oyun/lib/dil.js";
import { turnuvaSaatleri } from "../../oyun/lib/zaman.js";

import { ACIK_SAGLAYICILAR, acikSaglayicilariOku } from "../lib/saglayicilar.js";

// Supabase'in İngilizce hata metinlerini oyuncuya anlaşılır Türkçeye çevirir.
// Sağlayıcı panelde kapalıysa dönen mesaj ("provider is not enabled") teknik
// kaçıyordu; oyuncu düğmenin bozuk olduğunu sanıyordu.
// `ceviri` = useDil()'den gelen t(); metinler oyuncunun dilinde döner.
function girisHatasi(e, saglayiciAd, ceviri) {
  const m = String(e?.message ?? e ?? "");
  if (/provider is not enabled|Unsupported provider/i.test(m)) {
    return ceviri("{ad} girişi şu an kapalı. Google veya e-posta ile devam edebilirsin.", { ad: saglayiciAd });
  }
  if (/Anonymous sign-ins are disabled/i.test(m)) {
    return ceviri("Misafir girişi şu an kapalı. Google veya e-posta ile devam edebilirsin.");
  }
  if (/rate limit|too many/i.test(m)) {
    return ceviri("Çok fazla deneme yapıldı. Birkaç dakika sonra tekrar dene.");
  }
  if (/redirect|not allowed/i.test(m)) {
    return ceviri("Giriş adresi doğrulanamadı. Sayfayı yenileyip tekrar dene.");
  }
  if (/network|fetch|Failed to fetch/i.test(m)) {
    return ceviri("Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.");
  }
  return m || ceviri("Giriş yapılamadı. Tekrar dene.");
}

const SAGLAYICI_AD = {
  google: "Google",
  facebook: "Facebook",
  twitter: "X (Twitter)",
};

export default function Login() {
  // DİL: profil tercihi > bu tarayıcıdaki seçim > tarayıcı dili (IP'ye bakılmaz)
  const { dil, ceviri, dilDegistir } = useDil();
  const [email, setEmail] = useState("");
  const [gonderildi, setGonderildi] = useState(false);
  const [hata, setHata] = useState(null);
  // Paket 42 S.2: hata basılan düğmenin yanında açılır (eskiden formun en üstünde, sayfayı ~46 px itiyordu)
  const [hataYeri, setHataYeri] = useState("sosyal");   // sosyal | eposta | misafir
  const [bekleyen, setBekleyen] = useState(null); // hangi düğme çalışıyor
  // Supabase'de gerçekten açık olan sağlayıcılar (null = henüz bilinmiyor)
  const [acikListe, setAcikListe] = useState(null);

  useEffect(() => {
    let aktif = true;
    acikSaglayicilariOku().then((d) => { if (aktif) setAcikListe(d); });
    return () => { aktif = false; };
  }, []);

  /** Düğme çizilsin mi? Panelden bilgi gelmediyse .env kararı geçerli. */
  const saglayiciAcik = (ad) =>
    acikListe ? Boolean(acikListe[ad]) : ACIK_SAGLAYICILAR.has(ad);

  /**
   * Facebook düğmesi HER ZAMAN görünür (oyuncu seçeneği görsün), ama
   * sağlayıcı Supabase'de henüz açılmadıysa tarayıcı yönlendirilmez:
   * `signInWithOAuth` sağlayıcıyı doğrulamadan gittiği için oyuncu ham
   * JSON hata sayfasında kalıyordu. Bunun yerine Türkçe açıklama.
   */
  // Bilgi notu (hata değil): kapalı Facebook düğmesine basınca kısa, kibar açıklama.
  const [fbBilgi, setFbBilgi] = useState(false);
  const facebookGiris = async () => {
    setHata(null);
    // Liste henüz gelmediyse (ya da okunamadıysa) şimdi sor; hâlâ bilinmiyorsa
    // yönlendirme YAPILMAZ — kapalı sağlayıcı ham JSON sayfasına düşürür.
    let liste = acikListe;
    if (!liste) {
      liste = await acikSaglayicilariOku();
      if (liste) setAcikListe(liste);
    }
    if (!liste?.facebook) {
      setFbBilgi(true);
      return;
    }
    setFbBilgi(false);
    sosyalGiris("facebook");
  };

  const sosyalGiris = async (provider) => {
    setHata(null);
    if (provider !== "facebook") setFbBilgi(false);
    setBekleyen(provider);
    // Supabase izin listesi redirectTo'yu reddederse Site URL'ine düşer;
    // hedefi burada saklarız ki derin bağlantı kaybolmasın.
    girisHedefiniKaydet();
    girisDiliniKaydet(dil);   // D-203: yeni profil bu dille başlasın (yönlendirme sonrası useDil yazar)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          // Girişten sonra kullanıcı geldiği sayfaya dönsün (davet linki vb.)
          redirectTo: `${window.location.origin}${window.location.pathname}`,
          // X ve Facebook e-posta iznini ayrıca ister; istemezsek profil adı boş kalır.
          //
          // `user_friends` App Review ONAYI ister. Onay gelmeden istenirse
          // Facebook girişi hata verir, o yüzden varsayılan olarak İSTENMEZ.
          // Onay geldiğinde .env'e VITE_FB_ARKADAS=1 yazmak yeterli:
          // izin istenir ve arkadaş önerisi bölümü kendiliğinden dolar.
          scopes:
            provider === "facebook"
              ? (import.meta.env.VITE_FB_ARKADAS === "1"
                  ? "public_profile,email,user_friends"
                  : "public_profile,email")
              : undefined,
        },
      });
      if (error) throw error;
    } catch (e) {
      setHataYeri("sosyal");
      setHata(girisHatasi(e, SAGLAYICI_AD[provider] ?? provider, ceviri));
    } finally {
      setBekleyen(null);
    }
  };

  // Misafir girişi: Supabase anonim oturumu. Profil tetikleyicisi e-postası
  // olmayan kullanıcıya da "oyuncu_xxxx" takma adı üretir; oyuncu daha sonra
  // sosyal hesap bağlayarak kalıcı hesaba geçebilir.
  const misafirGiris = async () => {
    setHata(null);
    setBekleyen("misafir");
    try {
      girisDiliniKaydet(dil);
      // D-203: yeni profil (handle_new_user) giriş ekranındaki dille doğar
      const { error } = await supabase.auth.signInAnonymously({ options: { data: { dil } } });
      if (error) throw error;
    } catch (e) {
      setHataYeri("misafir");
      setHata(girisHatasi(e, "Misafir", ceviri));
    } finally {
      setBekleyen(null);
    }
  };

  // Paket 41 K.2: tarayıcının kendi (tarayıcı dilindeki) balonu yerine uygulama içi mesaj
  const [epostaHata, setEpostaHata] = useState(null);
  // Ters bölüler bir ara kaybolmuştu (/^[^s@]+…/): "s" harfi içeren her adres reddediliyordu.
  const epostaGecerli = (x) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(x).trim());

  const epostaGiris = async (e) => {
    e.preventDefault();
    setHata(null);
    if (!epostaGecerli(email)) {
      setEpostaHata(ceviri("Geçerli bir e-posta adresi yaz (ör. ad@ornek.com)."));
      return;
    }
    setEpostaHata(null);
    setBekleyen("eposta");
    girisHedefiniKaydet();
    girisDiliniKaydet(dil);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        // D-203: yeni hesapsa profil bu dille doğar (mevcut hesapta veri yok sayılır)
        options: { emailRedirectTo: window.location.origin, data: { dil } },
      });
      if (error) throw error;
      setGonderildi(true);
    } catch (err) {
      setHataYeri("eposta");
      setHata(girisHatasi(err, "E-posta", ceviri));
    } finally {
      setBekleyen(null);
    }
  };

  // Hata/bilgi notu basılan düğmenin hemen altında (Paket 42 S.2 kuralı korunur).
  const hataNotu = (yer) =>
    hata && hataYeri === yer ? <QtToast ton="yanlis" metin={hata} className="g-giris-not" /> : null;

  // Tasarım Adım 2 (Yön A): noktalı açık zemin, üstte kısa vitrin, altında (masaüstünde
  // sağında) giriş kartı. Sağlayıcılar, e-posta akışı ve misafir girişi AYNEN korundu.
  return (
    <div className="qt-sayfa g-giris">
      <div className="g-giris-ic">
        <header className="g-giris-ust">
          <QtMarka boyut="b" />
          {/* TR / EN değiştirici — giriş yapmadan da erişilebilir.
              Seçim localStorage'a, giriş yapılmışsa profile de yazılır. */}
          <div className="g-giris-dil" role="group" aria-label={ceviri("Dil")}>
            {DILLER.map((d) => (
              <QtCip key={d} secili={dil === d} onClick={() => dilDegistir(d)}>
                {d.toUpperCase()}
              </QtCip>
            ))}
          </div>
        </header>

        <main className="g-giris-izgara">
          <section className="g-giris-vitrin">
            {/* İlk ekranda oyunun yüzü: baykuş maskot kaldırıldı (Ida, 24 Eyl 2026) — yerine mevcut profil avatarlarından üçlü */}
            <span className="g-giris-avatarlar" aria-hidden="true">
              {["/avatars/pro/tilki-k04.svg", "/avatars/pro/kedi-k01.svg", "/avatars/pro/robot-k15.svg"].map((src) => (
                <img key={src} src={src} alt="" width="64" height="64" decoding="async" draggable="false" />
              ))}
            </span>
            <h1 className="g-giris-baslik">
              {ceviri("Bilgini oyuna")} <span className="g-giris-baslik-vurgu">{ceviri("dönüştür.")}</span>
            </h1>
            <p className="g-giris-slogan">
              {/* Saatler oyunun kullandığı tek listeden (oyun_ayarlari.turnuva_saatleri → zaman.js).
                  Giriş öncesi ayar okunamazsa kod varsayılanı. */}
              {(() => {
                const s = turnuvaSaatleri();
                return s.length === 1
                  ? ceviri("Her gün {saat}'de (Türkiye saati) turnuva.", { saat: s[0] })
                  : ceviri("Her gün {n} turnuva: ilki {ilk}, sonuncusu {son} (Türkiye saati).", { n: s.length, ilk: s[0], son: s[s.length - 1] });
              })()}{" "}
              {ceviri("7/24 meydan okumalar. Sen de yerini al.")}
            </p>
          </section>

          <section className="g-giris-panel" aria-labelledby="g-giris-baslik">
            <QtKart dolgu="b" className="g-giris-kart">
              <h2 id="g-giris-baslik" className="qt-baslik-2">{ceviri("Oyuna giriş yap")}</h2>
              <p className="qt-kucuk qt-soluk g-giris-alt">{ceviri("Kaldığın yerden devam et.")}</p>

              <div className="g-giris-yontemler">
                <QtDugme
                  tur="birincil"
                  tamGenislik
                  className="g-giris-sosyal"
                  yukleniyor={bekleyen === "google"}
                  devreDisi={bekleyen !== null}
                  onClick={() => sosyalGiris("google")}
                >
                  <span className="g-giris-logo" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.49 12c0-.73.13-1.43.35-2.1V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.96 10.96 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg></span>
                  {bekleyen === "google" ? ceviri("Yönlendiriliyor…") : ceviri("Google ile devam et")}
                </QtDugme>
                <QtDugme
                  tur="ikincil"
                  tamGenislik
                  className="g-giris-sosyal"
                  yukleniyor={bekleyen === "facebook"}
                  devreDisi={bekleyen !== null}
                  onClick={facebookGiris}
                >
                  <span className="g-giris-logo" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24"><path fill="#1877F2" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.69.24 2.69.24v2.97h-1.52c-1.49 0-1.95.93-1.95 1.89v2.26h3.32l-.53 3.49h-2.79V24C19.61 23.09 24 18.1 24 12.07z"/></svg></span>
                  {bekleyen === "facebook" ? ceviri("Yönlendiriliyor…") : ceviri("Facebook ile devam et")}
                </QtDugme>
                {saglayiciAcik("twitter") && (
                  <QtDugme
                    tur="ikincil"
                    tamGenislik
                    className="g-giris-sosyal"
                    yukleniyor={bekleyen === "twitter"}
                    devreDisi={bekleyen !== null}
                    onClick={() => sosyalGiris("twitter")}
                  >
                    <span className="g-giris-logo" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.24 2.25h3.31l-7.23 8.26L22.83 21.75h-6.66l-5.22-6.82-5.97 6.82H1.66l7.73-8.84L1.17 2.25h6.83l4.72 6.24 5.52-6.24zm-1.16 17.52h1.83L7.02 4.13H5.06l12.02 15.64z"/></svg></span>
                    {bekleyen === "twitter" ? ceviri("Yönlendiriliyor…") : ceviri("X (Twitter) ile devam et")}
                  </QtDugme>
                )}
              </div>

              {fbBilgi && !hata && (
                <QtToast
                  ton="bilgi"
                  metin={ceviri("Facebook ile giriş yakında. Şimdilik Google, e-posta ya da misafir girişiyle devam edebilirsin.")}
                  className="g-giris-not"
                />
              )}
              {hataNotu("sosyal")}

              <div className="g-giris-ayrac"><span>{ceviri("veya")}</span></div>

              {gonderildi ? (
                <QtBosDurum
                  ikon="mesaj"
                  ton="dogru"
                  className="g-giris-gonderildi"
                  metin={ceviri("Giriş bağlantısı {eposta} adresine gönderildi. E-postanı kontrol et.", { eposta: email })}
                  eylem={
                    <div className="g-giris-gonderildi-eylem">
                      <QtDugme tur="ikincil" boyut="k" yukleniyor={bekleyen === "eposta"} devreDisi={bekleyen !== null} onClick={epostaGiris}>
                        {bekleyen === "eposta" ? ceviri("Gönderiliyor…") : ceviri("Yeniden gönder")}
                      </QtDugme>
                      <QtDugme tur="hayalet" boyut="k" onClick={() => { setGonderildi(false); setHata(null); }}>
                        {ceviri("Adresi değiştir")}
                      </QtDugme>
                    </div>
                  }
                />
              ) : (
                <form className="g-giris-form" onSubmit={epostaGiris} noValidate>
                  <label className="qt-gizli" htmlFor="g-giris-eposta">{ceviri("E-posta adresin")}</label>
                  <input
                    id="g-giris-eposta"
                    className="g-girdi"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder={ceviri("E-posta adresin")}
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (epostaHata) setEpostaHata(null); }}
                    aria-invalid={Boolean(epostaHata)}
                    aria-describedby={epostaHata ? "giris-eposta-hata" : undefined}
                  />
                  {epostaHata && (
                    <p className="g-alan-hata" id="giris-eposta-hata" role="alert">
                      <QtIkon ad="uyari" boyut={18} />
                      {epostaHata}
                    </p>
                  )}
                  <QtDugme
                    type="submit"
                    tur="ikincil"
                    tamGenislik
                    className="g-giris-kaydir"
                    ikon="mesaj"
                    yukleniyor={bekleyen === "eposta"}
                    devreDisi={bekleyen !== null}
                  >
                    {bekleyen === "eposta" ? ceviri("Gönderiliyor…") : ceviri("E-posta ile giriş bağlantısı al")}
                  </QtDugme>
                </form>
              )}
              {hataNotu("eposta")}

              <div className="g-giris-ayrac"><span>{ceviri("hesap açmadan")}</span></div>

              <QtDugme
                tur="ikincil"
                tamGenislik
                ikon="oyna"
                yukleniyor={bekleyen === "misafir"}
                devreDisi={bekleyen !== null}
                onClick={misafirGiris}
              >
                {bekleyen === "misafir" ? ceviri("Giriş yapılıyor…") : ceviri("Misafir olarak dene")}
              </QtDugme>
              {hataNotu("misafir")}
              {/* Kapalı sağlayıcıyı vaat etmeyelim: liste GERÇEKTEN açık olan
                  sağlayıcılardan üretilir (panelden okunur). */}
              <p className="qt-kucuk qt-soluk g-giris-misafir-not">
                {ceviri(
                  "Misafir hesabı bu cihaza bağlıdır. Puanların kaybolmasın diye daha sonra {liste} veya e-posta hesabını bağlayabilirsin.",
                  {
                    liste: ["google", "facebook", "twitter"]
                      .filter(saglayiciAcik)
                      .map((s) => SAGLAYICI_AD[s] ?? s)
                      .join(", "),
                  }
                )}
              </p>
            </QtKart>

            {/* Yasal metinler giriş duvarının ÖNÜNDE erişilebilir olmalı
                (Google Play ve reklam ağları şartı). */}
            <nav className="g-giris-yasal" aria-label={ceviri("Yasal metinler")}>
              <a href="/gizlilik">{ceviri("Gizlilik politikası")}</a>
              <span aria-hidden="true">·</span>
              <a href="/kosullar">{ceviri("Kullanım koşulları")}</a>
            </nav>
          </section>
        </main>
      </div>
    </div>
  );
}
