// Lig adları — sunucudaki `lig` kolonuyla birebir (bkz. migration 151).
// Arayüz Yenileme (20 Eyl 2026): LeaderboardPage.jsx'ten buraya taşındı;
// ana sayfadaki lig kartı da aynı adları kullanıyor ve sayfa dosyasını
// import etmek koca lider tablosunu ana sayfa paketine sokuyordu.
import { tt } from "./dil.js";

export const LIG_ADLARI = {
  bronz: tt("Bronz"),
  gumus: tt("Gümüş"),
  altin: tt("Altın"),
  elmas: tt("Elmas"),
  efsane: tt("Efsane"),
};
