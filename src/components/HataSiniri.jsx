import { Component } from "react";
import { hataBildir } from "../lib/hataIzleme.js";
import { tt } from "../../oyun/lib/dil.js";
import { parcaHatasiMi, tembelleriSifirla } from "../lib/tembelYukle.js";

/**
 * Uygulama genelinde hata sınırı.
 *
 * Neden: React'te render sırasında atılan bir hata, sınır yoksa TÜM ağacı
 * söker — kullanıcı beyaz ekranla kalır ve ne olduğunu anlamaz. Yayın öncesi
 * denetimde projede hiç hata sınırı olmadığı görüldü.
 *
 * Burada hata yutulmuyor: konsola basılıyor (Vercel/tarayıcı günlüğünde
 * görünsün diye) ve kullanıcıya Türkçe, eyleme dönük bir ekran gösteriliyor.
 */
//
// SAYFA İÇİ KİP (`sayfaIci`, D-103/D-201): Layout rota içeriğini (Outlet) sarar. Sayfa parçası
// inemezse yalnız içerik alanında kart çizilir — üst çubuk ve alt menü görünür kalır.
// "Tekrar dene" başarısız tembel sayfaları sıfırlayıp yeniden çizer; bağlantı gelince (`online`)
// aynısı kendiliğinden olur. `anahtar` (adres) değişince hata temizlenir: başka sekmeye geçmek
// takılı kalmaz.
export default class HataSiniri extends Component {
  constructor(props) {
    super(props);
    this.state = { hata: null };
    this.tekrarDene = this.tekrarDene.bind(this);
  }

  componentDidMount() {
    if (this.props.sayfaIci) window.addEventListener("online", this.tekrarDene);
  }

  componentWillUnmount() {
    if (this.props.sayfaIci) window.removeEventListener("online", this.tekrarDene);
  }

  componentDidUpdate(onceki) {
    if (this.props.sayfaIci && this.state.hata && onceki.anahtar !== this.props.anahtar) {
      tembelleriSifirla();
      this.setState({ hata: null });
    }
  }

  tekrarDene() {
    if (!this.state.hata) return;
    // Parça (chunk) hatası: Chromium başarısız import'u belge içinde önbelleğe alır, yumuşak
    // yeniden deneme parçayı bir daha istemez (ölçüldü) → çevrimiçiyken sayfa yenilenir.
    // Tek tetikleyici düğme ya da tek `online` olayı olduğu için döngü olmaz.
    if (parcaHatasiMi(this.state.hata) && !(typeof navigator !== "undefined" && navigator.onLine === false)) {
      window.location.reload();
      return;
    }
    tembelleriSifirla();
    this.setState({ hata: null });
  }

  static getDerivedStateFromError(hata) {
    return { hata };
  }

  componentDidCatch(hata, bilgi) {
    // eslint-disable-next-line no-console
    console.error("[Uygulama hatası]", hata, bilgi?.componentStack);
    // Sentry kuruluysa raporla. Kurulu değilse (VITE_SENTRY_DSN boşsa) bu
    // çağrı sessizce hiçbir şey yapmaz — ekran ve davranış aynı kalır.
    hataBildir(hata, bilgi);
  }

  render() {
    if (!this.state.hata) return this.props.children;

    if (this.props.sayfaIci) {
      const parca = parcaHatasiMi(this.state.hata);
      const cevrimdisi = typeof navigator !== "undefined" && navigator.onLine === false;
      return (
        <div className="qt-sayfa-hata" role="alert">
          <div className="qt-sayfa-hata-kart">
            <span className="qt-sayfa-hata-ikon" aria-hidden="true">!</span>
            <h1 className="qt-sayfa-hata-baslik">{parca ? tt("Sayfa yüklenemedi") : tt("Bir şeyler ters gitti")}</h1>
            <p className="qt-sayfa-hata-metin">
              {parca || cevrimdisi
                ? tt("Bağlantı yok. İnternetini kontrol edip tekrar dene.")
                : tt("Beklenmedik bir hata oluştu. Tekrar dene; sorun sürerse sayfayı yenile.")}
            </p>
            {parca && cevrimdisi && (
              <p className="qt-sayfa-hata-not">{tt("Bağlantı gelince sayfa kendiliğinden açılır.")}</p>
            )}
            <div className="qt-sayfa-hata-dugmeler">
              <button type="button" className="qt-dugme qt-dugme--birincil" onClick={this.tekrarDene}>
                {tt("Tekrar dene")}
              </button>
              <button type="button" className="qt-dugme qt-dugme--ikincil" onClick={() => window.location.reload()}>
                {tt("Sayfayı yenile")}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="hata-siniri">
        <div className="hata-siniri-kart">
          <h1>{tt("Bir şeyler ters gitti")}</h1>
          <p>
            {tt("Beklenmedik bir hata oluştu. Sayfayı yenilemek çoğu zaman yeterli oluyor; sorun sürerse ana sayfaya dönebilirsin.")}
          </p>
          <div className="hata-siniri-butonlar">
            <button className="btn" onClick={() => window.location.reload()}>
              {tt("Sayfayı yenile")}
            </button>
            <button
              className="btn ikincil"
              onClick={() => {
                window.location.href = "/";
              }}
            >
              {tt("Ana sayfa")}
            </button>
          </div>
          <details>
            <summary>{tt("Teknik ayrıntı")}</summary>
            <code>{String(this.state.hata?.message ?? this.state.hata)}</code>
          </details>
        </div>
      </div>
    );
  }
}
