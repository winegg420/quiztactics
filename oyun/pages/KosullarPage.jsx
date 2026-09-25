import { Link } from "react-router-dom";
import GeriDugmesi from "../components/GeriDugmesi.jsx";
import Icindekiler from "../components/Icindekiler.jsx";
import { y } from "../lib/yol.js";
import { tt } from "../lib/dil.js";
import { QtDugme, QtMarka } from "../tasarim/index.js";
import "../tasarim/ekranlar/g-yasal.css";

// Google Play, reklam ağları ve uygulama içi satın alma için zorunlu:
// Kullanım Koşulları. Gizlilik politikasıyla aynı biçimde, girişsiz erişilir.
// Bu bir TASLAKTIR; yayına almadan önce hizmet sağlayıcı kimliği (şahıs mı
// şirket mi, unvan, adres) ve uygulanacak hukuk maddesi doldurulmalıdır.
const GUNCELLEME = tt("25 Eylül 2026");
const ILETISIM = "idagureli@gmail.com";

export default function KosullarPage() {
  return (
    // Tasarım Adım 2 (Yön A): noktalı sayfa + okunaklı tek sütun metin kartı. Metin içeriği aynı.
    <div className="qt-sayfa g-yasal">
      <div className="g-yasal-ic">
      <header className="g-yasal-ust">
        <GeriDugmesi />
        <QtMarka as={Link} to={y()} aria-label={tt("Quiz Tactics ana sayfa")} />
      </header>
      <article className="g-yasal-metin">
      <h1 className="qt-baslik-1">{tt("Kullanım koşulları")}</h1>
      <div className="qt-kucuk qt-soluk g-yasal-tarih">
        {tt("Son güncelleme:")} {GUNCELLEME}
      </div>
      <Icindekiler />

      <h2>{tt("Kısaca")}</h2>
      <p>
        <b>Quiz Tactics</b> {tt("bilgi yarışması ücretsiz olarak sunulur. Oyun hem kendi adresinde hem de Quiz Tactics oyun portalı içinde oynanabilir; bu koşullar ikisi için de geçerlidir. Oyunu kullanarak bu koşulları kabul etmiş olursun. Kurallara uyduğun sürece hesabın senindir; hile, taciz veya kötüye kullanım durumunda hesabın kısıtlanabilir.")}
      </p>

      <h2>{tt("1. Taraflar ve kapsam")}</h2>
      <p>
        {tt("Bu koşullar, hizmeti işleten (bundan sonra \"biz\") ile hizmeti kullanan kişi (bundan sonra \"sen\") arasındaki sözleşmedir. Kapsam, Quiz Tactics sitesi ve portalı ile içindeki tüm oyunlardır.")}
      </p>

      <h2>{tt("2. Hesap")}</h2>
      <ul>
        <li>{tt("Hesap açmak için geçerli bir e-posta adresi veya desteklenen bir sosyal hesap gerekir.")}</li>
        <li>
          {tt("Hesabının güvenliğinden sen sorumlusun. Hesabını başkasıyla paylaşma; paylaşırsan doğacak sonuçlardan sen sorumlu olursun.")}
        </li>
        <li>{tt("Bir kişinin birden çok hesap açarak sıralamayı etkilemesi yasaktır.")}</li>
        <li>
          {tt("Hesabını istediğin an profil sayfasından silebilirsin. Silme işlemi geri alınamaz.")}
        </li>
      </ul>

      <h2>{tt("3. Yaş sınırı")}</h2>
      <p>
        {tt("Hizmet 13 yaş altındaki çocuklara yönelik değildir. 13-18 yaş arasındaysan veli veya vasinin izniyle kullanabilirsin.")}
      </p>

      <h2>{tt("4. Kabul edilebilir kullanım")}</h2>
      <p>{tt("Aşağıdakiler yasaktır ve hesabın kapatılmasıyla sonuçlanabilir:")}</p>
      <ul>
        <li>
          <b>{tt("Hile:")}</b> {tt("otomasyon/bot kullanmak, oyunu tersine mühendislikle değiştirmek, sunucuya sahte istek göndermek, puan veya sıralamayı hile ile etkilemek.")}
        </li>
        <li>
          <b>{tt("Taciz:")}</b> {tt("takma ad, avatar, maç içi yazılı sohbet veya")}{" "}
          <b>{tt("sesli sohbette")}</b> {tt("hakaret, nefret söylemi, tehdit, cinsel içerik veya spam.")}
        </li>
        <li>
          <b>{tt("Sesli sohbette izinsiz kayıt:")}</b> {tt("karşı tarafın rızası olmadan görüşmeyi kaydetmek, yayınlamak veya başkalarına dinletmek yasaktır ve ayrıca hukuki sorumluluk doğurabilir.")}
        </li>
        <li>{tt("Başkasının kimliğine bürünmek; yanıltıcı takma ad kullanmak.")}</li>
        <li>{tt("Hizmete aşırı yük bindirmek, güvenlik önlemlerini aşmaya çalışmak.")}</li>
        <li>{tt("İçeriği izinsiz kopyalayıp başka bir yerde yayımlamak.")}</li>
      </ul>

      <h3>{tt("Mesajlaşma: yasaklı içerik ve davranışlar")}</h3>
      <p>
        {tt("Özel mesajlaşma yalnız arkadaşlar arasındadır ve ilk mesajdan önce bu koşulları kabul etmen gerekir. Mesajlarda, takma adda, avatarda ve maç içi sohbette şunlar yasaktır:")}
      </p>
      <ul>
        <li><b>{tt("Hakaret ve nefret söylemi:")}</b> {tt("küfür, aşağılama, bir kişiyi ya da grubu hedef alan nefret içeriği.")}</li>
        <li><b>{tt("Taciz:")}</b> {tt("tehdit, zorbalık, istenmeyen mesajları ısrarla göndermek.")}</li>
        <li><b>{tt("Cinsel içerik:")}</b> {tt("müstehcen metin veya görsel; reşit olmayanlara yönelik her türlü cinsel içerik kesinlikle yasaktır ve yetkililere bildirilir.")}</li>
        <li><b>{tt("Spam:")}</b> {tt("reklam, zincir mesaj, dolandırıcılık ya da zararlı bağlantı göndermek.")}</li>
        <li><b>{tt("Hile:")}</b> {tt("hesap, coin veya elmas alım-satımı teklif etmek, hile aracı paylaşmak.")}</li>
        <li><b>{tt("Kişisel bilgi paylaşımı:")}</b> {tt("kendinin veya başkasının telefonunu, adresini, okulunu, şifresini ya da benzeri kişisel bilgisini paylaşmak veya istemek.")}</li>
      </ul>
      <p>
        {tt("Rahatsız edildiğinde oyuncuyu profil kartından ya da sohbet ekranından engelleyebilir, şikâyet edebilirsin; bir mesaja uzun basarak o mesajı şikâyet edebilirsin. Küfür ve argo kelimeler otomatik olarak maskelenir. Kuralları çiğneyen oyuncunun mesajlaşması kapatılabilir veya hesabı askıya alınabilir.")}
      </p>

      <h2>{tt("5. Kullanıcı içeriği")}</h2>
      <p>
        {tt("Takma adın, avatar seçimin ve maç içi mesajların senin içeriğindir. Bunları hizmet içinde göstermemiz için bize sınırlı ve ücretsiz bir kullanım izni vermiş olursun. Kurallara aykırı içeriği bildirim üzerine veya kendiliğimizden kaldırabiliriz.")}
      </p>
      <p>
        <b>{tt("Sesli sohbet bunun dışındadır:")}</b> {tt("ses doğrudan iki cihaz arasında gider, bize hiç ulaşmaz ve kaydedilmez. Bu yüzden sesli sohbet içeriğini göremez, denetleyemez ve şikâyet hâlinde inceleyemeyiz. Sesli sohbeti yalnız arkadaş olduğun ve güvendiğin kişilerle aç; rahatsız edilirsen görüşmeyi kapat ve kişiyi arkadaşlıktan çıkar.")}
      </p>

      <h2>{tt("6. Sanal öğeler, skiller ve satın almalar")}</h2>
      <ul>
        <li>
          {tt("Puan, rütbe, rozet ve skiller")} <b>{tt("sanal öğelerdir")}</b>{tt("; gerçek para değeri taşımaz, nakde çevrilemez, devredilemez ve hesap dışında kullanılamaz.")}
        </li>
        <li>
          {tt("Uygulama içi satın alma yalnızca Android uygulamasında ve Google Play faturalandırması üzerinden yapılır. İade talepleri Google Play'in iade politikasına tabidir.")}
        </li>
        <li>
          {tt("Ödüllü reklam izleyerek kazanılan öğeler reklam ağının o an reklam sunabilmesine bağlıdır; sürekli erişim garanti edilmez.")}
        </li>
        <li>
          {tt("Hizmeti sonlandırmamız hâlinde sanal öğeler için bedel iadesi yapılmaz.")}
        </li>
      </ul>

      <h2>{tt("7. Reklamlar")}</h2>
      <p>
        {tt("Hizmette Google H5 Games Ads (AdSense) üzerinden ödüllü video ve maç arası reklam gösterilebilir. Reklam içeriği reklam ağı tarafından belirlenir ve bizim denetimimizde değildir.")}
      </p>

      <h2>{tt("8. Sorular ve içerik doğruluğu")}</h2>
      <p>
        {tt("Soru havuzu insan denetiminden geçse de hata içerebilir. Hatalı bulduğun soruyu oyun içinden bildirebilirsin; bildirimler değerlendirilip soru havuzdan çıkarılabilir. Sorular genel kültür amaçlıdır; profesyonel tavsiye yerine geçmez.")}
      </p>

      <h2>{tt("9. Hizmetteki değişiklikler")}</h2>
      <p>
        {tt("Oyun kurallarını, puanlama formüllerini, ödülleri ve özellikleri geliştirmek için değiştirebiliriz. Önemli değişiklikleri uygulama içinde duyururuz. Hizmeti tamamen durdurmamız hâlinde makul bir süre önce bilgilendirme yaparız.")}
      </p>

      <h2>{tt("10. Askıya alma ve fesih")}</h2>
      <p>
        {tt("Bu koşulları ihlal etmen hâlinde hesabını uyarı yaparak veya ağır durumlarda doğrudan askıya alabilir ya da kapatabiliriz. Kararı haksız buluyorsan aşağıdaki adresten itiraz edebilirsin.")}
      </p>

      <h2>{tt("11. Garanti reddi")}</h2>
      <p>
        {tt("Hizmet \"olduğu gibi\" sunulur. Kesintisiz veya hatasız çalışacağını garanti etmeyiz. Sunucu, ağ veya üçüncü taraf hizmetlerinden kaynaklanan kesintiler olabilir.")}
      </p>

      <h2>{tt("12. Sorumluluk sınırı")}</h2>
      <p>
        {tt("Yürürlükteki hukukun izin verdiği ölçüde; dolaylı zararlardan, veri kaybından veya kâr kaybından sorumlu değiliz. Hizmet ücretsiz olduğundan, doğrudan zararlara ilişkin toplam sorumluluğumuz son 12 ayda bize ödediğin tutarla (yoksa sıfırla) sınırlıdır.")}
      </p>

      <h2>{tt("13. Fikri mülkiyet")}</h2>
      <p>
        {tt("Oyunun adı, logosu, arayüz tasarımı, maskotu ve soru havuzu bize aittir. Kişisel kullanım dışında çoğaltılamaz, dağıtılamaz veya ticari amaçla kullanılamaz.")}
      </p>

      <h2>{tt("14. Gizlilik")}</h2>
      <p>
        {tt("Kişisel verilerinin nasıl işlendiğini")}{" "}
        <Link to="/gizlilik">{tt("Gizlilik Politikası")}</Link> {tt("sayfasında bulabilirsin. Gizlilik politikası bu koşulların ayrılmaz parçasıdır.")}
      </p>

      <h2>{tt("15. Uygulanacak hukuk")}</h2>
      <p>
        {tt("Bu koşullara Türkiye Cumhuriyeti hukuku uygulanır. Tüketici olarak sahip olduğun yasal haklar saklıdır; tüketici hakem heyetlerine ve tüketici mahkemelerine başvuru hakkın etkilenmez.")}
      </p>

      <h2>{tt("16. Değişiklikler")}</h2>
      <p>
        {tt("Bu koşulları güncellersek bu sayfadaki tarihi değiştiririz. Değişiklikten sonra hizmeti kullanmaya devam etmen güncel koşulları kabul ettiğin anlamına gelir.")}
      </p>

      <h2>{tt("17. İletişim")}</h2>
      <p>
        {tt("Sorular, itirazlar ve bildirimler için:")} <b>{ILETISIM}</b>
      </p>

      <h2>{tt("18. Üçüncü taraf verileri ve lisanslar")}</h2>
      <p>
        {tt("Türkiye dışındaki ülkelerin şehir listesi GeoNames verisinden alınmıştır ve Creative Commons Atıf 4.0 lisansıyla kullanılır:")}{" "}
        <a href="https://www.geonames.org" target="_blank" rel="noopener noreferrer">GeoNames</a>
        {" · "}
        <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>.{" "}
        {tt("Listeyi oyuna uyarlarken nüfusu 100.000'in altındaki yerleri çıkardık ve aynı ülkede aynı adı taşıyan şehirlere bölge adını ekledik.")}
      </p>

      <QtDugme as={Link} to={y()} tur="ikincil" ikon="ev" className="g-yasal-don">
        {tt("Ana sayfaya dön")}
      </QtDugme>
      </article>
      </div>
    </div>
  );
}
