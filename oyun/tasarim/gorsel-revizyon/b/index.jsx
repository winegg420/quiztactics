// Ajan B bölümleri: 4 tek oyuncu kartı, 5 unvan, 6 lig çerçeveleri, 7 level çerçeveleri, 8 turnuva şampiyonu,
// 13 premium çerçeve + arka plan hizalaması. Sözleşme: BOLUMLER = [{ no, baslik, tur, Bilesen }].
import B4Kart from "./b4-kart.jsx";
import B6Lig from "./b6-lig.jsx";

export const BOLUMLER = [
  { no: 4, baslik: "Tek oyuncu kartı", tur: "sec", Bilesen: B4Kart },
  { no: 6, baslik: "Lig çerçeveleri", tur: "sec", Bilesen: B6Lig },
];
