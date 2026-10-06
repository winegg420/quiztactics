// KASA (deneysel, 950) — arayüz metinlerinin İngilizcesi. Anahtar = Türkçe metin (dil.js kuralı).
// Kaynak: oyun/pages/KasaPage.jsx, oyun/components/KasaParcalari.jsx, ana sayfa / Modlar / Antrenman kartları.
// 980: oyuncunun gördüğü ad "Ortak Hazine" (EN "Shared Treasure"); ortadaki puan "hazine" (EN "treasure").
// Kod ve veritabanı adları (kasa_*) değişmedi. Eski sunucu metinleri ("Kasa" geçen) anahtar olarak durur: EN'de yeni adla çevrilir.
export default {
  // mod adı ve etiketler
  "Ortak Hazine": "Shared Treasure",
  "Deneysel": "Experimental",
  "Ortak Hazine · Deneysel": "Shared Treasure · Experimental",
  "Hazine senin!": "The treasure is yours!",
  "Ortak Hazine'ye dön": "Back to Shared Treasure",
  "Yeni Ortak Hazine maçı": "New Shared Treasure match",
  "Maçtan çık": "Leave match",
  "Maç iptal edildi": "Match cancelled",
  "Maçtan çıkarsan hükmen kaybedersin. Emin misin?": "If you leave, you lose by forfeit. Are you sure?",
  "Bu mod şu an kapalı.": "This mode is currently closed.",
  "Turlar": "Rounds",
  "Altın": "Golden",
  "Altın Soru": "Golden Question",
  "ALTIN SORU": "GOLDEN QUESTION",

  // giriş
  "Ortada bir hazine büyür. Tek başına bilen hazineyi alır; hazine sendeyse soru gelmeden AÇ ya da DEVAM de. {h} puana ilk ulaşan kazanır.":
    "A treasure grows in the middle. Answer alone to take it; if the treasure is yours, choose OPEN or KEEP before the question. First to {h} points wins.",
  "Her soru hazineye +{n} ekler; ikiniz de bilirseniz +{m}.": "Every question adds +{n} to the treasure; +{m} if you both get it right.",
  "Soruyu tek başına bilen hazinenin sahibi olur.": "Whoever alone answers correctly takes the treasure.",
  "AÇ: hazine puanına yazılır, hazine sıfırlanır. DEVAM: hazine büyür ama kaybedebilirsin.":
    "OPEN: the treasure goes to your score and resets. KEEP: the treasure grows, but you may lose it.",
  "{t} tur sonunda hazine sahibine yazılır; eşitlikte Altın Soru.": "After {t} rounds the treasure goes to its owner; a tie goes to the Golden Question.",
  "Tek başına bil, hazineyi al; doğru anda aç. {h} puana ilk ulaşan kazanır.": "Answer alone, take the treasure, open it at the right time. First to {h} points wins.",

  // arama ipuçları
  "Tek başına bilen hazinenin sahibi olur.": "Answer alone and the treasure is yours.",
  "İkiniz de bilirseniz hazine daha çok büyür.": "If you both answer correctly, the treasure grows more.",
  "Hazine sendeyse soru gelmeden AÇ ya da DEVAM de.": "If the treasure is yours, choose OPEN or KEEP before the question.",

  // kadran + skor
  "HAZİNE": "TREASURE",
  "HAZİNE AÇILDI!": "TREASURE OPENED!",
  "Rakip hazineyi açtı!": "Opponent opened the treasure!",
  "Sende": "Yours",
  "Rakipte": "Opponent's",
  "Sahipsiz": "Unclaimed",
  "Hazine {k} · {s}": "Treasure {k} · {s}",
  "SEN": "YOU",
  "RAKİP": "OPPONENT",
  "Skor: sen {a}, rakip {b}, hedef {h}": "Score: you {a}, opponent {b}, target {h}",

  // karar
  "Rakip karar veriyor…": "Opponent is deciding…",
  "Açarsa {k} puan alır, hazine sıfırlanır.": "If they open, they get {k} points and the treasure resets.",
  "Hazine sende: {k} puan": "The treasure is yours: {k} points",
  "AÇ · +{k} puan": "OPEN · +{k} points",
  "DEVAM · hazine büyüsün": "KEEP · let it grow",
  "Süre dolarsa DEVAM sayılır.": "If time runs out, it counts as KEEP.",
  "Hazineyi açtın: +{k} puan": "You opened the treasure: +{k} points",
  "Rakip hazineyi açtı: +{k} puan": "Opponent opened the treasure: +{k} points",
  "Süre doldu: devam": "Time's up: keep",
  "Rakibin süresi doldu: devam": "Opponent ran out of time: keep",
  "Devam ettin: hazine büyüyor": "You kept it: the treasure grows",
  "Rakip devam etti: hazine büyüyor": "Opponent kept it: the treasure grows",
  "Son tur: hazine sana yazıldı +{k}": "Last round: the treasure goes to you +{k}",
  "Son tur: hazine rakibe yazıldı +{k}": "Last round: the treasure goes to your opponent +{k}",

  // sonuç bandı
  "İkiniz de bildiniz +{n}": "You both got it +{n}",
  "Tek başına bildin: hazine sende": "Only you got it: the treasure is yours",
  "Rakip tek başına bildi: hazine rakipte": "Only your opponent got it: the treasure is theirs",
  "İkiniz de bilemediniz +{n}": "Neither of you got it +{n}",
  "Hazine {k}": "Treasure {k}",
  "+{n} · Hazine {k}": "+{n} · Treasure {k}",
  "Altın Soru'yu sen bildin!": "You got the Golden Question!",
  "Altın Soru'yu rakip bildi": "Your opponent got the Golden Question",
  "Kimse tek başına bilemedi": "Nobody got it alone",
  "Yeni Altın Soru geliyor": "Another Golden Question is coming",

  // maç sonu
  "Hazineyi açtın, {h} puana ulaştın!": "You opened the treasure and reached {h} points!",
  "Rakip {h} puana ulaştı": "Your opponent reached {h} points",
  "Eşit — Altın Soru'yu sen bildin": "Tied — you got the Golden Question",
  "Eşit — Altın Soru'yu rakip bildi": "Tied — your opponent got the Golden Question",

  // 951: uzunluk, AÇ alt sınırı, jokerler, anlar
  "Hazine en az {m} olunca açılabilir.": "The treasure can be opened once it holds at least {m}.",
  "Hazine en az {m} olunca açılabilir": "The treasure can be opened once it holds at least {m}",
  "Jokerler: 50:50, Ek Süre, Zaman Baskısı, İkinci Şans.": "Jokers: 50:50, Extra Time, Time Pressure, Second Chance.",
  "Hedef": "Target",
  "HEDEF": "TARGET",   // 990: şerit ortası (karar/başlangıç)
  "AÇ": "OPEN",
  "En az {m} hazine": "Treasure min. {m}",
  "AÇ · En az {m} hazine": "OPEN · Treasure min. {m}",
  "AÇ kilitli: en az {m} hazine": "OPEN locked: the treasure needs at least {m}",
  "Hazine rakibe açıldı": "Your opponent opened the treasure",
  "{a} / {h} puan": "{a} / {h} points",
  "ÇİFTE!": "DOUBLE!",
  "Rakip joker kullandı: {j}": "Opponent used a joker: {j}",
  "Rakip {j} kullandı": "Opponent used {j}",
  "Rakip süreni kısalttı!": "Opponent cut your time!",
  "İkinci Şans: bir kez daha dene!": "Second Chance: try once more!",

  // 953: DEVAM ödülü
  "DEVAM · %{p} joker şansı": "KEEP · {p}% joker chance",
  "Bilerek DEVAM dersen %{p} ihtimalle sonraki soru için ücretsiz joker (50:50 ya da Ek Süre).": "Choose KEEP yourself for a {p}% chance at a free joker for the next question (50:50 or Extra Time).",
  "Joker kazandın!": "You won a joker!",
  "{j} · bu soru için ücretsiz": "{j} · free for this question",
  "Bu sefer yok": "Not this time",
  "ÜCRETSİZ": "FREE",
  "DEVAM ödülü: yalnız bu soru için ücretsiz": "KEEP reward: free for this question only",

  // 954: DEVAM sahipliği bırakır + ücretsiz 50:50
  "DEVAM · ÜCRETSİZ 50:50": "KEEP · FREE 50:50",
  "DEVAM: hazine sahipsiz kalır. Süre dolarsa DEVAM sayılır.": "KEEP: the treasure becomes unclaimed. If time runs out, it counts as KEEP.",
  "AÇ: hazine puanına yazılır, hazine sıfırlanır. DEVAM: hazine büyür ama sahipsiz kalır; tek başına bilen alır.":
    "OPEN: the treasure goes to your score and resets. KEEP: the treasure grows but becomes unclaimed; whoever alone answers correctly takes it.",
  "Bilerek DEVAM dersen hazine açılana kadar her soruda ücretsiz 50:50.": "Choose KEEP yourself and get a free 50:50 on every question until the treasure is opened.",
  "SAHİPSİZ": "UNCLAIMED",
  "ÜCRETSİZ 50:50": "FREE 50:50",
  "Hazine açılana kadar her soruda": "Every question until the treasure is opened",

  // 955: tavan + DEVAM çarpanı + hedef 60 + karar 5 sn; hazine sandığı
  "Hazine {k}/{t} · {s}": "Treasure {k}/{t} · {s}",
  "DOLU": "FULL",
  "DEVAM {x} · ÜCRETSİZ 50:50": "KEEP {x} · FREE 50:50",
  "DEVAM {x}": "KEEP {x}",
  "Hazine dolu ({t}): DEVAM büyütmez, sahipsiz bırakır.": "The treasure is full ({t}): KEEP won't grow it, it becomes unclaimed.",
  "DEVAM: hazine {x} büyür (en çok {t}) ve sahipsiz kalır. Süre dolarsa DEVAM sayılır.": "KEEP: the treasure grows {x} (up to {t}) and becomes unclaimed. If time runs out, it counts as KEEP.",
  "DEVAM: hazine {x} büyür ve sahipsiz kalır. Süre dolarsa DEVAM sayılır.": "KEEP: the treasure grows {x} and becomes unclaimed. If time runs out, it counts as KEEP.",
  "Hazine dolu: {k}": "Treasure full: {k}",
  "Hazine en çok {t} · DEVAM {x}": "Treasure max {t} · KEEP {x}",
  "Hazine en çok {t}": "Treasure max {t}",
  "AÇ: hazine puanına yazılır, hazine sıfırlanır. DEVAM: hazine {x} büyür ama sahipsiz kalır; tek başına bilen alır.":
    "OPEN: the treasure goes to your score and resets. KEEP: the treasure grows {x} but becomes unclaimed; whoever alone answers correctly takes it.",
  "Hazine en çok {t} olur: tek AÇ maçı bitirmez.": "The treasure caps at {t}: a single OPEN can't win the match.",
  // 956: tavan 60 = hedef 60 (tek AÇ maçı bitirebilir)
  "Hazine en çok {t} olur.": "The treasure caps at {t}.",
  "Karar süresi {s} sn; dolarsa DEVAM sayılır.": "Decision time is {s}s; if it runs out, it counts as KEEP.",

  // bağlantı
  "Bağlantın koptu — maç bekliyor.": "You're disconnected — the match is waiting.",
  "Rakibin bağlantısı koptu — maç durduruldu.": "Your opponent disconnected — the match is paused.",

  // 957: Kasa ortak özellikler — arkadaş daveti, rövanş, lobi
  "Klasik jokerlerin geçer": "Your Classic jokers apply",
  "Ortak Hazine daveti gönderildi — rakip kabul edince maç başlayacak.": "Shared Treasure invite sent — the match starts when your opponent accepts.",
  "Ortak Hazine daveti gönderilemedi.": "Couldn’t send the Shared Treasure invite.",
  "Ortak Hazine daveti yanıtlanamadı.": "Couldn’t answer the Shared Treasure invite.",
  "seni Ortak Hazine maçına çağırdı": "challenged you to a Shared Treasure match",
  "Ortak Hazine · yanıt bekleniyor": "Shared Treasure · waiting for reply",
  "Ortak Hazine daveti gönderildi · yanıt bekleniyor": "Shared Treasure invite sent · waiting for reply",
  "Ortak Hazine daveti kabul edildi": "Shared Treasure invite accepted",
  "{0} Ortak Hazine daveti": "{0} Shared Treasure invite(s)",
  "Devam eden bir Ortak Hazine maçın var.": "You have a Shared Treasure match in progress.",
  "Maça dön": "Back to match",
  // 957: sunucu hataları (kasa_davet_et / kasa_davet_cevap / kasa_rovans_*)
  "Devam eden bir Kasa maçı var": "There’s already a Shared Treasure match in progress",
  "Bu oyuncuyla bekleyen bir Kasa davetin zaten var": "You already have a pending Shared Treasure invite with this player",
  "Oyunculardan birinin devam eden Kasa maçı var": "One of the players already has a Shared Treasure match in progress",
  // 980: sunucunun yeni metinleri (migration 980) + yeni ada çevrilmiş eski metinler (dil.js › TR_DUZELTME)
  "Devam eden bir Ortak Hazine maçı var": "There’s already a Shared Treasure match in progress",
  "Bu oyuncuyla bekleyen bir Ortak Hazine davetin zaten var": "You already have a pending Shared Treasure invite with this player",
  "Oyunculardan birinin devam eden Ortak Hazine maçı var": "One of the players already has a Shared Treasure match in progress",
  "Bu joker Ortak Hazine modunda kullanılamaz": "This joker can't be used in Shared Treasure mode",
  "Karar kasanın sahibinde": "Only the treasure's owner can decide",
  "Karar hazinenin sahibinde": "Only the treasure's owner can decide",
  "Hazine en az % olmalı": "The treasure must hold at least %",
  // bildirim metinleri (eski ve yeni)
  "% seni Kasa maçına çağırdı!": "% challenged you to a Shared Treasure match!",
  "% seni Ortak Hazine maçına çağırdı!": "% challenged you to a Shared Treasure match!",
  "% Kasa davetini kabul etti - maç başlıyor!": "% accepted your Shared Treasure invite — the match is starting!",
  "% Ortak Hazine davetini kabul etti - maç başlıyor!": "% accepted your Shared Treasure invite — the match is starting!",
  "Bu oyuncuyla oynayamazsın": "You can’t play with this player",

  // 990: lobi kısa özeti + açılır tam kurallar
  "Ortada ikinizin ortak hazinesi büyür.": "A treasure you both share grows in the middle.",
  "Soruyu tek başına bilen hazineyi alır.": "Answer alone to take the treasure.",
  "Hazine sendeyse AÇ: puanına yaz · DEVAM: hazine büyür, sahipsiz kalır.": "Treasure is yours? OPEN: add it to your score · KEEP: it grows and is up for grabs.",
  "{h} puana ilk ulaşan kazanır.": "First to {h} points wins.",
  "Tüm kurallar": "All rules",
  // 990 · rakibin kararı: kapalı kart → vuruş
  "Rakip karar verdi": "Opponent has decided",
  "AÇTI!": "OPENED!",
  "DEVAM ETTİ": "KEPT IT",
  "Hazine {x}": "Treasure {x}",
};
