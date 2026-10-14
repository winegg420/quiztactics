import { Link } from "react-router-dom";
import GeriDugmesi from "../components/GeriDugmesi.jsx";
import Icindekiler from "../components/Icindekiler.jsx";
import YasalDilSecici from "../components/YasalDilSecici.jsx";
import { y } from "../lib/yol.js";
import { tt } from "../lib/dil.js";
import { QtDugme, QtMarka } from "../tasarim/index.js";
import "../tasarim/ekranlar/g-yasal.css";

// Google Play (Veri güvenliği › hesap silme adresi) ve Meta (veri silme talimatları URL'si) için herkese açık sayfa.
// Giriş gerektirmez (src/BildimApp.jsx › bagimsizModul). Uygulama içi silme: Profil › Ayarlar › Hesabımı sil
// (ProfilePage.jsx › hesabimi_sil RPC). Silinen/saklanan veri listesi supabase/migrations 046 · 117 · 620 · 630'a göre.
const GUNCELLEME = tt("14 Ekim 2026");
const ILETISIM = "info@quiztactics.com";

export default function HesapSilPage() {
  return (
    <div className="qt-sayfa g-yasal">
      <div className="g-yasal-ic">
      <header className="g-yasal-ust">
        <GeriDugmesi />
        <YasalDilSecici />
        <QtMarka as={Link} to={y()} aria-label={tt("Quiz Tactics ana sayfa")} />
      </header>
      <article className="g-yasal-metin">
      <h1 className="qt-baslik-1">{tt("Hesap silme")}</h1>
      <div className="qt-kucuk qt-soluk g-yasal-tarih">
        {tt("Son güncelleme:")} {GUNCELLEME}
      </div>
      <Icindekiler />

      <h2>{tt("Kısaca")}</h2>
      <p>
        {tt("Quiz Tactics hesabını ve ona bağlı oyun verilerini istediğin zaman kalıcı olarak silebilirsin. Silme geri alınamaz. İki yol var: uygulama içinden (anında) ya da e-posta ile (30 gün içinde).")}
      </p>

      <h2>{tt("1. Uygulama içinden (anında)")}</h2>
      <ol>
        <li>{tt("Quiz Tactics'e giriş yap.")}</li>
        <li>{tt("Profil sayfasını aç ve Ayarlar sekmesine geç.")}</li>
        <li>{tt("Sayfanın en altındaki “Hesabımı sil” düğmesine dokun.")}</li>
        <li>{tt("Açılan pencerede hesap kimliğini (takma adını) yaz ve “Evet, hesabımı sil” ile onayla.")}</li>
      </ol>
      <p>
        {tt("İşlem tamamlanınca oturumun kapanır ve hesabın silinmiş olur.")}
      </p>

      <h2>{tt("2. E-posta ile (oturum açamıyorsan)")}</h2>
      <p>
        {tt("Uygulamaya giremiyorsan ya da cihazına erişimin yoksa, hesabına kayıtlı e-posta adresinden")} <b>{ILETISIM}</b> {tt("adresine şu konuyla bir e-posta gönder:")} <b>{tt("Hesap silme")}</b>.
      </p>
      <p>
        {tt("E-postaya takma adını yazman işimizi hızlandırır. Talebini doğrulayıp hesabını en geç")} <b>{tt("30 gün içinde")}</b> {tt("sileriz ve sana haber veririz.")}
      </p>
      <p>
        {tt("Facebook veya Google ile giriş yaptıysan aynı yöntem geçerlidir; Facebook'taki uygulama izinlerini ayrıca Facebook ayarlarından kaldırabilirsin.")}
      </p>

      <h2>{tt("Hangi veriler silinir")}</h2>
      <ul>
        <li>{tt("Giriş kaydın ve e-posta adresin.")}</li>
        <li>{tt("Profilin: takma ad, avatar, rütbe, puanlar, rozetler, koleksiyon ve satın alınmış kozmetikler, tercihlerin, şehir/ülke seçimin.")}</li>
        <li>{tt("Maç, turnuva ve grup maçı kayıtların, gördüğün soruların geçmişi.")}</li>
        <li>{tt("Arkadaşlıkların, arkadaş istekleri ve engellemelerin.")}</li>
        <li>{tt("Özel mesajların ve maç içi sohbet mesajların.")}</li>
        <li>{tt("Gönderdiğin şikâyetler.")}</li>
        <li>{tt("Bildirim aboneliğin (push) ve cihaz kayıtların.")}</li>
      </ul>

      <h2>{tt("Hangi veriler saklanır")}</h2>
      <ul>
        <li>
          <b>{tt("Hakkındaki şikâyet kayıtları:")}</b> {tt("başka oyuncuların senin hakkında gönderdiği şikâyetler (şikâyet edilen mesajın o anki metni dahil), kural ihlallerinin kanıtı olarak hesabın silindikten sonra 1 yıl saklanır ve sonra otomatik silinir. Bu kayıtları yalnız yöneticiler görür.")}
        </li>
        <li>
          <b>{tt("Ortak kayıtlar:")}</b> {tt("başka oyuncuları da ilgilendiren turnuva ve maç kayıtları silinmez; yalnız senin adınla olan bağı kopar (kazanan bilgisi boş kalır). Davet ettiğin oyuncuların hesapları etkilenmez.")}
        </li>
        <li>
          <b>{tt("Teknik kayıtlar:")}</b> {tt("hata izleme ve barındırma sağlayıcılarındaki kısa süreli teknik kayıtlar hesabına bağlı tutulmaz; e-posta ve kimlik benzeri bilgiler hata raporlarından temizlenir. Bu kayıtlar sağlayıcıların kendi saklama süresi sonunda silinir.")}
        </li>
        <li>
          <b>{tt("Yasal yükümlülük:")}</b> {tt("kanunen saklamamız gereken bir kayıt (ör. ödeme/fatura kaydı) doğarsa yalnız yasanın istediği süre kadar saklanır. Şu an uygulama içi ücretli satın alma kapalıdır.")}
        </li>
      </ul>

      <h2>{tt("İletişim")}</h2>
      <p>
        {tt("Hesap silme ve kişisel verilerinle ilgili her soru için:")} <b>{ILETISIM}</b>. {tt("Verilerin nasıl işlendiğini")} <Link to="/gizlilik">{tt("Gizlilik politikası")}</Link> {tt("sayfasında bulabilirsin.")}
      </p>

      <QtDugme as={Link} to={y()} tur="ikincil" ikon="ev" className="g-yasal-don">
        {tt("Ana sayfaya dön")}
      </QtDugme>
      </article>
      </div>
    </div>
  );
}
