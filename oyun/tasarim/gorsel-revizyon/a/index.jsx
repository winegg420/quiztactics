// Ajan A bölümleri: 0 stil rehberi, 1 coin, 2 elmas, 3 nadirlik kenarı, 9 lig amblemleri, 10 rozet sistemi,
// 11 joker ikonları, 12 logo. Sözleşme: BOLUMLER = [{ no, baslik, tur, Bilesen }] (tur: "sec" | "karar" | "dil").
import B0Stil from "./b0-stil.jsx";
import B1Coin from "./b1-coin.jsx";
import B2Elmas from "./b2-elmas.jsx";
import B3Nadirlik from "./b3-nadirlik.jsx";
import B9LigAmblem from "./b9-lig-amblem.jsx";
import B10Rozet from "./b10-rozet.jsx";
import B11Joker from "./b11-joker.jsx";
import B12Logo from "./b12-logo.jsx";

export const BOLUMLER = [
  { no: 0, baslik: "Stil rehberi", tur: "dil", Bilesen: B0Stil },
  { no: 1, baslik: "Coin ikonu", tur: "sec", Bilesen: B1Coin },
  { no: 2, baslik: "Elmas ikonu", tur: "sec", Bilesen: B2Elmas },
  { no: 3, baslik: "Nadirlik kart kenarı", tur: "sec", Bilesen: B3Nadirlik },
  { no: 9, baslik: "Lig amblemleri", tur: "sec", Bilesen: B9LigAmblem },
  { no: 10, baslik: "Rozet sistemi", tur: "sec", Bilesen: B10Rozet },
  { no: 11, baslik: "Joker ikonları — hizalama", tur: "karar", Bilesen: B11Joker },
  { no: 12, baslik: "Logo", tur: "sec", Bilesen: B12Logo },
];
