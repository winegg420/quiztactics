// Ajan B bölümleri: 4 tek oyuncu kartı, 5 unvan, 6 lig çerçeveleri, 7 level çerçeveleri, 8 turnuva şampiyonu,
// 13 premium çerçeve + arka plan hizalaması. Sözleşme: BOLUMLER = [{ no, baslik, tur, Bilesen }].
import B4Kart from "./b4-kart.jsx";
import B5Unvan from "./b5-unvan.jsx";
import B6Lig from "./b6-lig.jsx";
import B7Level from "./b7-level.jsx";
import B8Turnuva from "./b8-turnuva.jsx";
import B13Hizalama from "./b13-hizalama.jsx";

export const BOLUMLER = [
  { no: 4, baslik: "Tek oyuncu kartı", tur: "sec", Bilesen: B4Kart },
  { no: 5, baslik: "Unvan görünümü", tur: "sec", Bilesen: B5Unvan },
  { no: 6, baslik: "Lig çerçeveleri", tur: "sec", Bilesen: B6Lig },
  { no: 7, baslik: "Level çerçeveleri", tur: "sec", Bilesen: B7Level },
  { no: 8, baslik: "Turnuva Şampiyonu çerçevesi", tur: "sec", Bilesen: B8Turnuva },
  { no: 13, baslik: "Premium çerçeve + arka plan hizalaması", tur: "karar", Bilesen: B13Hizalama },
];
