import { Link } from "react-router-dom";
import GeriDugmesi from "../components/GeriDugmesi.jsx";
import Icindekiler from "../components/Icindekiler.jsx";
import YasalDilSecici from "../components/YasalDilSecici.jsx";
import { y } from "../lib/yol.js";
import { tt } from "../lib/dil.js";
import { QtDugme, QtMarka } from "../tasarim/index.js";
import "../tasarim/ekranlar/g-yasal.css";

// Google Play zorunluluğu: mağaza kaydında gösterilecek gizlilik politikası.
// Veri sorumlusu için şahıs/şirket unvanı ve adres henüz yok (Ida kararı bekliyor): "Quiz Tactics" + e-posta.
// Veri akışı değişince (ör. olay kaydı/analitik, ödeme) bu metin AYRICA güncellenir.
const GUNCELLEME = tt("14 Ekim 2026");
const ILETISIM = "info@quiztactics.com";

export default function GizlilikPage() {
  return (
    // Tasarım Adım 2 (Yön A): noktalı sayfa + okunaklı tek sütun metin kartı. Metin içeriği aynı.
    <div className="qt-sayfa g-yasal">
      <div className="g-yasal-ic">
      <header className="g-yasal-ust">
        <GeriDugmesi />
        <YasalDilSecici />
        <QtMarka as={Link} to={y()} aria-label={tt("Quiz Tactics ana sayfa")} />
      </header>
      <article className="g-yasal-metin">
      <h1 className="qt-baslik-1">{tt("Gizlilik politikası")}</h1>
      <div className="qt-kucuk qt-soluk g-yasal-tarih">
        {tt("Son güncelleme:")} {GUNCELLEME}
      </div>
      <Icindekiler />

      <h2>{tt("Kısaca")}</h2>
      <p>
        {tt("Quiz Tactics, oyunu oynayabilmen için gereken en az veriyi toplar:")}{" "}
        <b>{tt("e-posta adresin")}</b>, <b>{tt("seçtiğin takma ad")}</b> {tt("ve")} <b>{tt("avatarın")}</b>{tt(", ayrıca oyun içi")} <b>{tt("puan, sıralama ve şehir/ülke")}</b> {tt("bilgin. Verilerini satmıyoruz, reklam ağlarıyla paylaşmıyoruz.")}
      </p>
      <p>
        {tt("Veri sorumlusu: Quiz Tactics. İletişim:")} <b>{ILETISIM}</b>. {tt("Hesabını silmek için")} <Link to="/hesap-sil">{tt("Hesap silme")}</Link> {tt("sayfasına bak.")}
      </p>

      <h2>{tt("Topladığımız veriler")}</h2>
      <ul>
        <li>
          <b>{tt("Hesap bilgileri:")}</b> {tt("e-posta adresi (yalnız giriş için; hiçbir zaman başka oyunculara gösterilmez) ve")} <b>{tt("senin seçtiğin takma ad")}</b>{tt(". Diğer oyuncular yalnızca bu takma adı görür — gerçek adın ve e-postan gizlidir.")}
        </li>
        <li>
          <b>{tt("Google ile giriş:")}</b> {tt("bu yöntemi seçersen sağlayıcıdan yalnız hesabını tanımak için gereken temel bilgiyi (e-posta adresi ve hesap kimliği) alırız. Şifreni görmeyiz. Misafir olarak da oynayabilirsin; misafir hesabında e-posta tutulmaz.")} {tt("Facebook ile giriş şu an sunulmuyor.")}
        </li>
        <li>
          <b>{tt("Avatar:")}</b> {tt("hazır avatarlardan seçtiğin görsel. Google hesabının fotoğrafı")} <b>{tt("otomatik olarak alınmaz")}</b>{tt("; yalnız sen onaylarsan kullanılır.")}
        </li>
        <li>
          <b>{tt("Oyun verileri:")}</b> {tt("puan, haftalık puan, rütbe, rozetler, maç sonuçları, gördüğün sorular, arkadaşlıklar ve maç içi sohbet mesajları.")}
        </li>
        <li>
          <b>{tt("Özel mesajlar:")}</b> {tt("arkadaşlarınla yazıştığın mesajlar. Yalnız sen ve arkadaşın görürsünüz; konuşmayı göstermek ve bir şikâyet olursa incelemek için saklanır. Küfür ve argo kelimeler gönderilirken otomatik olarak maskelenir.")}
        </li>
        <li>
          <b>{tt("Engellemeler:")}</b> {tt("engellediğin oyuncuların listesi — engellediğin kişinin sana ulaşmasını önlemek için.")}
        </li>
        <li>
          <b>{tt("Şikâyetler:")}</b> {tt("gönderdiğin şikâyetler (kimi, hangi sebeple, açıklaman ve şikâyet ettiğin mesajın o anki metni) — kural ihlallerini incelemek ve oyuncuları korumak için. Şikâyetleri yalnız yöneticiler görür; şikâyet edilen kişiye kimin şikâyet ettiği söylenmez.")}
        </li>
        <li>
          <b>{tt("Kullanım Koşulları kabulü:")}</b> {tt("mesajlaşmadan önce koşulları kabul ettiğin tarih.")}
        </li>
        <li>
          <b>{tt("Konum bilgisi:")}</b> {tt("yalnızca kendi seçtiğin")} <b>{tt("şehir ve ülke")}</b>{tt(". Cihazının GPS konumunu")} <b>{tt("almıyoruz")}</b>{tt(". Bu bilgi şehir/ülke liglerinde herkese görünür.")}
        </li>
        <li>
          <b>{tt("Bildirim izni:")}</b> {tt("bildirimleri açarsan tarayıcının verdiği abonelik anahtarı. İstediğin an profil sayfasından kapatabilirsin.")}
        </li>
        <li>
          <b>{tt("Teknik kayıtlar:")}</b> {tt("oturum açıklık bilgisi (son görülme) ve hata kayıtları. Uygulama bir hatayla karşılaşınca hata izleme hizmetine (Sentry) teknik bir rapor gider; IP adresi ve çerez gönderilmez, e-posta ve kimlik benzeri bilgiler rapordan temizlenir, ekran kaydı alınmaz.")}
        </li>
      </ul>

      <h2>{tt("Verileri neden kullanıyoruz")}</h2>
      <ul>
        <li>{tt("Hesabını oluşturmak, seni tanımak ve oturumunu sürdürmek.")}</li>
        <li>{tt("Maç, turnuva, sıralama ve lig özelliklerini çalıştırmak.")}</li>
        <li>{tt("Sana daha önce görmediğin soruları göstermek.")}</li>
        <li>{tt("Kötüye kullanımı (puan kasma, sahte hesap) tespit etmek.")}</li>
        <li>{tt("İzin verdiysen turnuva ve haftalık sonuç bildirimleri göndermek.")}</li>
      </ul>

      <h2>{tt("Sesli sohbet")}</h2>
      <p>
        {tt("1v1 maçlarda,")} <b>{tt("yalnızca arkadaş olduğun")}</b> {tt("bir oyuncuyla ve")}
        <b> {tt("iki taraf da açıkça kabul ederse")}</b> {tt("sesli sohbet açılabilir. Kapalı gelir; sen başlatmadan mikrofonun açılmaz.")}
      </p>
      <ul>
        <li>
          <b>{tt("Konuşma kaydedilmez.")}</b> {tt("Ses doğrudan iki cihaz arasında gider (WebRTC); sunucularımızdan geçmez, saklanmaz, dinlenmez.")}
        </li>
        <li>
          <b>{tt("IP adresi:")}</b> {tt("bu teknoloji doğrudan bağlantı kurduğu için, görüşme sırasında cihazlarınızın IP adresleri karşı tarafa görünebilir. Bu, sesli sohbetin yalnız arkadaşlarla açılmasının başlıca sebebidir.")}
        </li>
        <li>
          {tt("Mikrofon izni tarayıcından istenir ve istediğin an geri alabilirsin. Görüşmeyi tek dokunuşla kapatabilir ya da mikrofonunu susturabilirsin.")}
        </li>
        <li>
          {tt("Sesli sohbet tamamen isteğe bağlıdır; hiç kullanmadan da oyunun tamamını oynayabilirsin.")}
        </li>
      </ul>

      <h2>{tt("Paylaşım")}</h2>
      <p>
        {tt("Verilerini üçüncü taraflara satmıyoruz. Yalnızca hizmeti çalıştırmak için kullandığımız hizmet sağlayıcılar verileri bizim adımıza işler:")}
      </p>
      <ul>
        <li><b>Supabase</b> {tt("— veritabanı, kimlik doğrulama ve gerçek zamanlı bağlantı. Sunucular AB'de (Frankfurt) bulunur.")}</li>
        <li><b>Vercel</b> {tt("— uygulamanın barındırılması; erişim kayıtlarında IP adresi geçici olarak işlenir.")}</li>
        <li><b>Resend</b> {tt("— giriş e-postalarının (bağlantı/kod) gönderimi; yalnız e-posta adresin ve mesaj içeriği işlenir.")}</li>
        <li><b>Cloudflare</b> {tt("— alan adının DNS hizmeti ve info@ adresine gelen e-postaların yönlendirilmesi.")}</li>
        <li><b>Sentry</b> {tt("— hata izleme (yukarıda anlatılan sınırlarla; sunucuları Frankfurt'ta).")}</li>
        <li><b>Google</b> {tt("— yalnız bu yöntemle giriş yaparsan, kendi gizlilik politikalarına tabi olarak.")}</li>
        <li><b>Google Play</b> {tt("— uygulama içi satın alma açıldığında ödeme işlemleri için; kart bilgilerin bize ulaşmaz.")}</li>
      </ul>
      <p>
        <b>{tt("Takma adın")}</b>{tt(", seçtiğin")} <b>{tt("avatar")}</b>{tt(", puanın ve şehir/ülke bilgin, oyunun doğası gereği diğer oyunculara görünür. Gerçek adın ve e-posta adresin")} <b>{tt("hiçbir zaman")}</b> {tt("başka oyunculara gösterilmez.")} {tt("Yasal bir zorunluluk dışında verilerini bu sağlayıcıların dışında kimseyle paylaşmayız.")}
      </p>

      <h2>{tt("Saklama ve silme")}</h2>
      <p>
        {tt("Verilerini hesabın açık olduğu sürece saklarız. Hesabını")}{" "}
        <Link to={y("/profil")}>{tt("Profil")}</Link> {tt("sayfasındaki")} <b>{tt("Hesabımı Sil")}</b> {tt("düğmesiyle kalıcı olarak silebilirsin; profilin, maç kayıtların, rozetlerin, mesajların, engellemelerin ve gönderdiğin şikâyetler silinir. Bu işlem geri alınamaz. Dilersen")} {ILETISIM} {tt("adresine yazarak da silme talebinde bulunabilirsin.")} {tt("Ayrıntılar için")} <Link to="/hesap-sil">{tt("Hesap silme")}</Link> {tt("sayfasına bak.")}
      </p>
      <p>
        {tt("İstisna: başka oyuncuların senin hakkında gönderdiği şikâyet kayıtları (şikâyet edilen mesajın o anki metni dahil), kural ihlallerinin kanıtı olarak hesabın silindikten sonra 1 yıl saklanır ve bu sürenin sonunda otomatik olarak silinir. Bu kayıtları yalnız yöneticiler görür.")}
      </p>

      <h2>{tt("Hakların")}</h2>
      <p>
        {tt("KVKK madde 11 ve GDPR kapsamında şu haklara sahipsin: verilerinin işlenip işlenmediğini ve bir kopyasını öğrenme (erişim), yanlış veya eksik verinin düzeltilmesini isteme, verilerinin silinmesini isteme, işlenmesine itiraz etme ve (GDPR) verini taşıma. Başvuru için")} <b>{ILETISIM}</b> {tt("adresine yaz; hesabına bağlı e-posta adresinden yazman kimliğini doğrulamamıza yardımcı olur. Başvurunu en geç 30 gün içinde yanıtlarız. Şikâyet hakkın olan veri koruma otoritesine (Türkiye'de KVKK Kurumu) başvurma hakkın saklıdır.")}
      </p>

      <h2>{tt("Çocuklar")}</h2>
      <p>
        {tt("Quiz Tactics 13 yaş altındaki çocuklara yönelik değildir ve bilerek 13 yaş altından veri toplamayız.")}
      </p>

      <h2>{tt("Çerezler ve yerel depolama")}</h2>
      <p>
        {tt("Oturumunu açık tutmak ve bazı tercihlerini (ör. kapattığın bilgilendirme şeritleri) hatırlamak için tarayıcının yerel depolamasını kullanırız. Reklam veya izleme çerezi kullanmıyoruz.")}
      </p>

      <h2>{tt("Değişiklikler")}</h2>
      <p>
        {tt("Bu politikayı güncellersek bu sayfadaki tarihi değiştiririz. Önemli değişikliklerde uygulama içinde bilgilendirme yaparız.")}
      </p>

      <h2>{tt("İletişim")}</h2>
      <p>
        {tt("Sorular ve veri talepleri için:")} <b>{ILETISIM}</b>
      </p>

      <QtDugme as={Link} to={y()} tur="ikincil" ikon="ev" className="g-yasal-don">
        {tt("Ana sayfaya dön")}
      </QtDugme>
      </article>
      </div>
    </div>
  );
}
