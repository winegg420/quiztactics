// Kazanılan çerçeve anahtarları → yeni çizim (KazanilanCerceve.jsx). Küçük dosya: CerceveliAvatar ana pakette
// bunu okuyup yalnız eşleşen çerçevede tembel parçayı ister. Anahtarlar sözleşmeden (docs/SOZLESME_ROZET_CERCEVE.md §4).
// lig_bronz katalogda YOK (Bronz başlangıç ligi, çerçevesi kazanılmıyor); çizimi hazır, satır eklenirse kendiliğinden çizilir.
export const KAZANILAN = {
  lig_bronz: { tur: "lig", lig: "bronz" },
  lig_gumus: { tur: "lig", lig: "gumus" },
  lig_altin: { tur: "lig", lig: "altin" },
  lig_elmas: { tur: "lig", lig: "elmas" },
  lig_efsane: { tur: "lig", lig: "efsane" },
  level_25: { tur: "level", lv: "25" },
  level_50: { tur: "level", lv: "50" },
  level_75: { tur: "level", lv: "75" },
  level_100: { tur: "level", lv: "100" },
  turnuva_sampiyon: { tur: "turnuva" },
};
export const kazanilanMi = (anahtar) => Boolean(anahtar && KAZANILAN[anahtar]);
