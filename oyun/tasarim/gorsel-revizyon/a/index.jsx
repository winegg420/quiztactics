// Ajan A bölümleri: 0 stil rehberi, 1 coin, 2 elmas, 3 nadirlik kenarı, 9 lig amblemleri, 10 rozet sistemi,
// 11 joker ikonları, 12 logo. Sözleşme: BOLUMLER = [{ no, baslik, tur, Bilesen }] (tur: "sec" | "karar" | "dil").
import B1Coin from "./b1-coin.jsx";
import B2Elmas from "./b2-elmas.jsx";
import B9LigAmblem from "./b9-lig-amblem.jsx";
import B10Rozet from "./b10-rozet.jsx";

export const BOLUMLER = [
  { no: 1, baslik: "Coin ikonu", tur: "sec", Bilesen: B1Coin },
  { no: 2, baslik: "Elmas ikonu", tur: "sec", Bilesen: B2Elmas },
  { no: 9, baslik: "Lig amblemleri", tur: "sec", Bilesen: B9LigAmblem },
  { no: 10, baslik: "Rozet sistemi", tur: "sec", Bilesen: B10Rozet },
];
