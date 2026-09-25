// Ajan A bölümleri: 0 stil rehberi, 1 coin, 2 elmas, 3 nadirlik kenarı, 9 lig amblemleri, 10 rozet sistemi,
// 11 joker ikonları, 12 logo. Sözleşme: BOLUMLER = [{ no, baslik, tur, Bilesen }] (tur: "sec" | "karar" | "dil").
import B1Coin from "./b1-coin.jsx";
import B2Elmas from "./b2-elmas.jsx";

export const BOLUMLER = [
  { no: 1, baslik: "Coin ikonu", tur: "sec", Bilesen: B1Coin },
  { no: 2, baslik: "Elmas ikonu", tur: "sec", Bilesen: B2Elmas },
];
