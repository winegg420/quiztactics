// Kısa mod anlatımları (7 Eki 2026, Sekme B — Ida: "hiçbir oyunda bu kadar detay anlatılmaz").
// Mod giriş/tanıtım ekranları ve maç içi açıklama satırları: bir kısa başlık + en çok 2-3 kısa satır.
// Kural mantığı DEĞİŞMEDİ, yalnız anlatım kısaldı. Anahtar = Türkçe metin (dil.js ile aynı düzen).
export default {
  // Mod seçim penceresi
  "Aynı sorular, en çok bilen kazanır.": "Same questions, most correct wins.",
  "Kategorileri seç, rakibinkine saldır. {h} puan ya da {y} kategori kazanır.": "Pick categories, attack theirs. {h} points or {y} categories wins.",
  "Tek bilen hazineyi alır, doğru anda aç.": "Answer alone to take the treasure, open it at the right time.",
  // Düello lobisi
  "Kategorileri sırayla seçersiniz.": "You take turns picking categories.",
  "Rakibin kategorisine saldır: bilirsen +1, alırsan +2.": "Attack their category: +1 if right, +2 if you take it.",
  "{h} puan ya da {y} kategori kazandırır.": "{h} points or {y} categories wins.",
  // Düello tanıtımı (puan kuralı)
  "Soru ikinize aynı anda gelir. Saldıran, rakibin bir kategorisini seçer. Süre dolarsa yanlış sayılır.":
    "The question reaches you both at once. The attacker picks one of the opponent's categories. Running out of time counts as wrong.",
  "Önce 10 kategoriyi sırayla seçersiniz. Herkes {k} kategori alır. Süre dolarsa en iyi bildiğin seçilir.":
    "First you take turns picking the 10 categories. You each get {k}. If time runs out, your best one is picked.",
  "{h} puana ilk ulaşan kazanır. Ya da rakibin {y} kategorisini al. Aynı anda olursa Altın Soru.":
    "First to {h} points wins. Or take {y} of the opponent's categories. If both happen at once: Golden Question.",
  "Bildiğin her soru +1. Sen bilip rakip bilemezse +2 ve kategori senin. Kendi kategorine saldıramazsın.":
    "Every correct answer is +1. You right, they wrong: +2 and the category is yours. You can't attack your own categories.",
  "Kırmızı: kategorin saldırı altında. Mavi: sen saldırıyorsun, fırsat.": "Red: your category is under attack. Blue: you're attacking, your chance.",
  "El değiştiren kategori 2 tur seçilemez.": "A category that changes hands is locked for 2 turns.",
  "Maç en çok {t} tur sürer. Sonunda puanı çok olan kazanır. Eşitlikte Altın Soru.":
    "The match lasts up to {t} turns. Most points then wins. A tie brings a Golden Question.",
  "Baskın: rakibin cevabı sayılmaz. Kalkan: kategori sende kalır. Her biri maçta 1 kez.":
    "Ambush: the opponent's answer doesn't count. Shield: your category stays yours. Each once per match.",
  "Maçta 4 joker, aynısı en çok 2 kez. Soru başına 1 joker.": "4 jokers per match, the same one at most twice. 1 per question.",
  // Ortak Hazine lobisi
  "AÇ: puanına yaz. DEVAM: hazine büyür, sahipsiz kalır.": "OPEN: add it to your score. KEEP: it grows and is up for grabs.",
  "AÇ: hazine puanına yazılır. DEVAM: hazine {x} büyür, sahipsiz kalır.": "OPEN: the treasure goes to your score. KEEP: it grows {x} and is up for grabs.",
  "AÇ: hazine puanına yazılır. DEVAM: hazine büyür, sahipsiz kalır.": "OPEN: the treasure goes to your score. KEEP: it grows and is up for grabs.",
  "AÇ: hazine puanına yazılır. DEVAM: hazine büyür ama kaybedebilirsin.": "OPEN: the treasure goes to your score. KEEP: it grows, but you may lose it.",
  "Bilerek DEVAM dersen {h} kazanırsın: hazine rakibe geçecekken sana {s} gelir.":
    "Choose KEEP to earn a {h}: when the treasure would go to your opponent, you get a {s}.",
  // Ortak Hazine karar notu
  "DEVAM: hazine {x} büyür, sahipsiz kalır.": "KEEP: the treasure grows {x} and is up for grabs.",
  "DEVAM: hazine sahipsiz kalır.": "KEEP: the treasure is up for grabs.",
  "Hazine dolu ({t}): DEVAM büyütmez.": "Treasure full ({t}): KEEP won't grow it.",
  // Turnuva
  "Her gün {saatler} saatlerinde başlar.": "Starts every day at {saatler}.",
  "Her gün {saatler} saatlerinde başlar (Türkiye saati).": "Starts every day at {saatler} (Turkey time).",
  "Herkese aynı soru gelir.": "Everyone gets the same question.",
  "Son kalan kazanır, +150 lig puanı alır.": "Last one standing wins +150 league points.",
  "İlk 10 ve katılan herkes de puan alır.": "Top 10 and everyone who joins also score.",
  "Herkese aynı soru gelir. Yanlış ya da süre aşımı eler; son kalan kazanır.": "Everyone gets the same question. A wrong answer or timeout knocks you out; last one standing wins.",
};
