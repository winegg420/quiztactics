// İngilizce çeviri eki — Düello 960: sırayla kategori seçimi (draft), 7 yuva, 20 tur. Anahtar Türkçe metnin kendisidir.
// Sözlük (hakimiyet-ekran.js ile aynı): yuva = slot · Elinden al = Take · Pekiştir = Reinforce · seçim = pick / draft.
export default {
  // Başlık + konsol (DuelloSecim.jsx, DuelloV2 › V2Ust)
  "SEÇİM": "DRAFT",
  "Seçim {n}/{t}": "Pick {n}/{t}",
  "SENİN SIRAN": "YOUR PICK",
  "RAKİP SEÇİYOR…": "OPPONENT PICKING…",
  "Senin sıran": "Your pick",
  "Rakip seçiyor…": "Opponent picking…",
  "Sen {a}/{n} · Rakip {b}/{n}": "You {a}/{n} · Opponent {b}/{n}",
  "sonra yine sen": "then you again",
  "sonra sen": "then you",
  "Süre doldu · otomatik seçildi": "Time's up · auto-picked",
  "Süre doldu · {k} otomatik seçildi": "Time's up · {k} auto-picked",
  "Rakibin süresi doldu": "Opponent ran out of time",
  "Otomatik seçildi: {kat}": "Auto-picked: {kat}",

  // Kartlar
  "Yeni": "New",
  "Aldın": "Yours",
  "Rakip aldı": "Taken",
  "En iyi bildiğin kategorileri seç, onları sen savunursun.": "Pick the categories you know best — you'll defend them.",

  // Geçiş
  "Seçim tamam": "Draft complete",
  "HÂKİMİYET BAŞLIYOR": "THE BATTLE FOR CONTROL BEGINS",
  "Sen {a} · Rakip {b}": "You {a} · Opponent {b}",
  "{n} yuvaya ulaşan kazanır": "First to {n} slots wins",

  // Tanıtım (DuelloTanitim v12)
  "Önce sırayla seçim": "First, take turns picking",
  "Maç başında 10 kategori ortadadır. Sırayla seçersiniz (A-B-B-A-A…), her biriniz {k} kategori; seçtiğin kategori anında senin yuvan olur. Her seçim için {s} sn var; süre dolarsa en iyi bildiğin kalan kategori otomatik seçilir. İlk seçmeyen ilk saldırır.":
    "At the start, all 10 categories are up for grabs. You take turns picking (A-B-B-A-A…), {k} categories each; a picked category instantly fills one of your slots. Each pick has {s} s; if time runs out, your best remaining category is picked for you. Whoever didn't pick first attacks first.",
  "Seçimden sonra {k}-{k} başlarsınız, boş kategori yoktur. Yuva kazanmanın tek yolu rakibin kategorisini elinden almaktır. {n} yuvaya ilk ulaşan maçı anında kazanır.":
    "After the draft you start {k}-{k}; there are no empty categories. The only way to gain a slot is to take one of your opponent's categories. First to {n} slots wins instantly.",
  "Hamlenin tutması için saldıran doğru, savunan yanlış bilmelidir. Tutarsa rakibin kategorisi sana geçer; tutmazsa kategori savunanda kalır.":
    "For a move to land, the attacker must be right and the defender wrong. If it lands, the opponent's category becomes yours; otherwise it stays with the defender.",
  "Sorulan kategori renkli çerçeveyle gösterilir. Kırmızı: rakip senin kategorine saldırıyor; yanlış bilirsen ve rakip bilirse kaybedersin. Mavi: saldırıyorsun; doğru bilirsen ve rakip yanlış yaparsa hamlen tutar. Gri: rakip kendi kategorisini pekiştiriyor; kategori el değiştirmez, doğru bilirsen kilitlenmesini önlersin.":
    "The category in play gets a colored frame. Red: your opponent is attacking your category; if you're wrong and they're right, you lose it. Blue: you're attacking; if you're right and they're wrong, your move lands. Grey: your opponent is reinforcing their own category; it won't change hands, and answering right stops it from locking.",
  "Elinden al · Pekiştir": "Take · Reinforce",
  "Rakibin kategorisi: hamle tutarsa \"Elinden al\" ile sana geçer. Kendi kategorin: tutarsa \"Pekiştir\" ile kilitlenir. Sahibi değişen ya da pekiştirilen kategori 2 tur kimse tarafından seçilemez; tutmayan hamlede kilit yok.":
    "Opponent's category: if the move lands, \"Take\" makes it yours. Your own category: if it lands, \"Reinforce\" locks it. A category that changes hands or is reinforced can't be picked by anyone for 2 rounds; a move that doesn't land locks nothing.",

  // Lobi + arama + mod kartı
  "Maç başında 10 kategoriyi sırayla seçersiniz, 5'er tane.": "At the start you take turns picking the 10 categories, 5 each.",
  "Rakibin kategorisini almak için sen doğru, rakip yanlış bilmelisin.": "To take your opponent's category, you must be right and they must be wrong.",
  "Maç sırayla kategori seçimiyle başlar: en iyi bildiklerini seç.": "The match opens with a category draft: pick the ones you know best.",
  "Her seçim için {s} sn; süre dolarsa en iyi bildiğin kalan kategori seçilir.": "{s} s per pick; if time runs out, your best remaining category is picked.",
  "Kategorileri sırayla seçin, {n} yuvayı ilk dolduran kazanır. Rakibin kategorisini almak için sen doğru, rakip yanlış bilmelisin. {t} tur, eşitlikte Altın Soru.":
    "Take turns picking categories; first to fill {n} slots wins. To take your opponent's category, you must be right and they must be wrong. {t} rounds, Golden Question on a tie.",

  // Sunucu hataları (duello_kategori_sec, seçim fazı)
  "Şu an seçim sırası sende değil": "It's not your pick right now",
  "Bu kategori zaten alındı": "That category is already taken",
  // Draft revizesi (7 Eki 2026): yılan sırası blokları
  "{n} seçim yap": "Make {n} picks",
  "1 seçim yap": "Make 1 pick",
  "rakip ×{n}": "opponent ×{n}",
  "sonra sen ×{n}": "then you ×{n}",
  "sonra rakip ×{n}": "then opponent ×{n}",
  "son seçim": "last pick",
};
