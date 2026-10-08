// İngilizce çeviri eki — Düello 970: yeni puan kuralı (yalnız rakibin kategorisine saldırı, +1 / +2, hedef puan ya da
// kategori yolu). Anahtar Türkçe metnin kendisidir. Sözlük: saldır = attack · savun = defend · çalınan = stolen ·
// kategori al = take a category (oyunda "fetih" geçmez).
export default {
  // Puan tahtası (DuelloTahta › PuanTahtasi)
  "Puan durumu": "Score",
  "{ad}: {p}/{h} puan": "{ad}: {p}/{h} points",
  "Çalınan": "Stolen",
  "Çalınan kategori {n}/{y}": "Stolen categories {n}/{y}",
  // Mesaj satırı
  "{h} puan ya da {y} kategori alan kazanır": "First to {h} points or {y} categories wins",
  // 8 Eki 2026 · TEK kural cümlesi (lobi, perde, puan şeridi, arama ipucu, tanıtım). Sunucu (970): hedef puana ilk
  // ulaşan ya da rakibin başlangıçtaki kategorilerinden kategori_yolu kadarını elinde tutan kazanır.
  "{h} puan ya da rakibin {y} kategorisini alan kazanır": "First to {h} points or {y} of the opponent's categories wins",
  "{h} puan ya da rakibin {y} kategorisini alan kazanır.": "First to {h} points or {y} of the opponent's categories wins.",
  "{h} puan ya da rakibin {y} kategorisini alan kazanır. Aynı anda olursa Altın Soru.":
    "First to {h} points or {y} of the opponent's categories wins. If both happen at once: Golden Question.",
  "{h} puan ya da rakibin {y} kategorisini alan kazanır. {t} tur bitince puanı çok olan; eşitlikte Altın Soru.":
    "First to {h} points or {y} of the opponent's categories wins. After {t} turns, most points wins; a tie goes to a Golden Question.",
  "Doğru +1 · kategoriyi alırsan +2": "Right +1 · take the category for +2",
  "Rakip bitişe yakın: {p}/{h} puan · {a}/{y} kategori": "Opponent is close: {p}/{h} pts · {a}/{y} categories",
  "Bitişe yakınsın: {p}/{h} puan · {a}/{y} kategori": "You're close: {p}/{h} pts · {a}/{y} categories",
  // Tur sonucu
  "{kat} el değiştirdi": "{kat} changed hands",
  "kategori el değiştirmedi": "category stays",
  "Sen +{b} · Rakip +{r}": "You +{b} · Opponent +{r}",
  "{kat} artık senin! +{n}": "{kat} is yours! +{n}",
  "Kalkan kategoriyi korudu": "Shield protected the category",
  "İkiniz de bildiniz": "You both got it",
  "İkiniz de bilemediniz": "You both missed",
  "Baskın tutmadı": "Ambush didn't land",
  "Baskın: cevabın sayılmadı": "Ambush: your answer didn't count",
  "Rakip savundu": "Opponent defended",
  "Savundun! +{n}": "You defended! +{n}",
  "Kategoriyi aldın": "You took it",
  "Rakip kategoriyi aldı": "Opponent took it",
  // Kartlar + alt çubuk
  "Rakibin kategorileri · saldır": "Opponent's categories · attack",
  "Senin kategorilerin · savun": "Your categories · defend",
  "saldırılamaz": "can't be attacked",
  "banlanamaz": "can't be banned",
  "Rakibin bir kategorisini seç": "Pick an opponent's category",
  "tutarsa kategori senin · {a}→{b}": "if it lands it's yours · {a}→{b}",
  "Saldır": "Attack",
  // Savunan ipuçları (ilk 3 Düello)
  "Kırmızı çerçeve = kategorine saldırı. Sen bilirsen +1; sen yanlış, rakip doğruysa kategoriyi alır ve +2 kazanır.": "Red frame = your category is under attack. Get it right for +1; if you're wrong and your opponent is right, they take it and score +2.",
  "Bildiğin her soru +1 puan. Saldırırken rakip yanlış yaparsa kategori senin olur: +2.": "Every right answer is +1. When you attack and your opponent misses, the category is yours: +2.",
  "Kalkan kategorini korur: rakip bilse de kategori sende kalır, rakip yalnız +1 alır.": "Shield protects your category: even if your opponent is right, it stays yours and they only get +1.",
  // Maç sonu
  "Altın Soru'yu sen bildin ({a}-{b})": "You got the Golden Question ({a}-{b})",
  "Altın Soru'yu rakip bildi ({a}-{b})": "Opponent got the Golden Question ({a}-{b})",
  "{n} puana ulaştın!": "You reached {n} points!",
  "Rakip {n} puana ulaştı": "Opponent reached {n} points",
  "Rakibin {n} kategorisini aldın!": "You took {n} of your opponent's categories!",
  "Rakip {n} kategorini aldı": "Opponent took {n} of your categories",
  // Lobi, mod kartı, arama ipuçları
  "Yalnız rakibin kategorisine saldırırsın. Bildiğin her soru +1; rakip bilemezse kategori senin, +2.": "You only attack your opponent's categories. Every right answer is +1; if your opponent misses, the category is yours, +2.",
  "{h} puana ya da rakibin {y} kategorisine ilk ulaşan kazanır.": "First to {h} points or {y} of the opponent's categories wins.",
  "Kategorileri sırayla seçin; yalnız rakibin kategorisine saldırırsın. Doğru +1, kategoriyi alırsan +2. {h} puan ya da {y} kategori alan kazanır.": "Take turns picking categories; you only attack your opponent's. Right +1, take the category for +2. First to {h} points or {y} categories wins.",
  "Yalnız rakibin kategorisine saldırabilirsin.": "You can only attack your opponent's categories.",
  "Bildiğin her soru +1 puan.": "Every right answer is +1 point.",
  "Sen bilir, rakip bilemezse kategori senin: +2.": "If you're right and your opponent misses, the category is yours: +2.",
  "{t} tur sonunda puanlar eşitse Altın Soru.": "Golden Question if points are tied after {t} rounds.",
  // Tanıtım (DuelloTanitim, pBaslik / pMetin)
  "Her turda soru ikinize aynı anda açılır, ikiniz de cevaplarsınız (süre dolarsa yanlış sayılır). Saldıran rakibin kategorilerinden birini seçer (15 sn; dolarsa rastgele). Savunan beklemez: saldıranın dokunduğu kartı canlı görür.": "Every round the question opens for both of you at once and you both answer (running out of time counts as wrong). The attacker picks one of the opponent's categories (15 s; random if time runs out). The defender sees the card the attacker touches live.",
  "Maç başında 10 kategori ortadadır. Sırayla seçersiniz (A-B-B-A-A…), her biriniz {k} kategori; seçtiğin kategori anında senin olur. Her seçim için {s} sn var; süre dolarsa en iyi bildiğin kalan kategori otomatik seçilir. İlk seçmeyen ilk saldırır.": "At the start, 10 categories are on the table. You pick in turns (A-B-B-A-A…), {k} categories each; a category you pick is yours at once. Each pick has {s} s; if time runs out, your best remaining category is picked for you. Whoever didn't pick first attacks first.",
  "{h} puan ya da {y} kategori": "{h} points or {y} categories",
  "Seçimden sonra 0-0 başlarsınız. {h} puana ilk ulaşan ya da rakibin başlangıçtaki kategorilerinden {y} tanesini elinde tutan maçı anında kazanır. İkiniz aynı turda ulaşırsanız Altın Soru gelir.": "After the draft you start 0-0. Whoever first reaches {h} points, or holds {y} of the opponent's starting categories, wins instantly. If you both get there in the same round, the Golden Question decides.",
  "Puan kuralı": "Scoring rule",
  "Yalnız rakibin kategorisine saldırırsın; kendi kategorine saldıramazsın. İkiniz de bilirseniz ikiniz de +1. Saldıran bilir, savunan bilemezse saldıran +2 alır ve kategori ona geçer. Saldıran bilemez, savunan bilirse savunan +1. İkiniz de bilemezseniz kimse puan almaz.": "You only attack your opponent's categories, never your own. Both right: +1 each. Attacker right, defender wrong: the attacker scores +2 and takes the category. Attacker wrong, defender right: the defender scores +1. Both wrong: no points.",
  "Sorulan kategori renkli çerçeveyle gösterilir. Kırmızı: rakip senin kategorine saldırıyor; sen bilirsen +1, sen yanlış ve rakip doğruysa kategoriyi alır. Mavi: saldırıyorsun; doğru bilirsen +1, rakip de yanlış yaparsa +2 ve kategori senin.": "The category being asked has a coloured frame. Red: your opponent is attacking your category; get it right for +1, but if you're wrong and they're right, they take it. Blue: you're attacking; a right answer is +1, and if your opponent misses it's +2 and the category is yours.",
  "Her turda saldıran seçmeden önce savunan kendi kategorilerinden 1 tanesini banlar ({b} sn). Banladığın an tur ilerler; süre dolarsa ban kullanılmaz. Rakip o tur banlı kategoriye saldıramaz. Aynı kategoriyi arka arkaya banlayamazsın.": "Every round, before the attacker picks, the defender bans 1 of their own categories ({b} s). The round moves on the moment you ban; if time runs out, no ban is used. Your opponent can't attack the banned category that round. You can't ban the same category twice in a row.",
  "Kilit": "Lock",
  "El değiştiren kategori 2 tur kimse tarafından seçilemez; el değiştirmeyen hamlede kilit yok. Savunanın bütün kategorileri kilitliyse kilit o tur sayılmaz.": "A category that changes hands can't be picked by anyone for 2 rounds; no lock if it doesn't change hands. If all of the defender's categories are locked, the lock is ignored that round.",
  "Maç en çok {t} tur sürer; her tur bir hamledir ve saldıran/savunan her tur el değiştirir. {t}. tur sonunda puanı çok olan kazanır. Puanlar eşitse Altın Soru gelir: zor soru, joker yok, yalnız biriniz bilene kadar sürer.": "A match lasts at most {t} rounds; each round is one move and attacker/defender swap every round. After round {t}, whoever has more points wins. If points are tied, the Golden Question comes: a hard question, no jokers, until only one of you knows it.",
  "Baskın (saldırırken, soru ekranında): bu hamlede rakibin cevabı sayılmaz, puan da almaz; sen doğruysan +2 ve kategori senin. Kalkan (savunurken): kategori sende kalır; rakip doğru bilse de yalnız +1 alır. Her biri maçta 1 kez. Basılan joker tur sonuna kadar rakipten gizlidir; ikisi aynı hamlede basılırsa birbirini götürür ve ikisi de harcanır.": "Ambush (when attacking, on the question screen): your opponent's answer doesn't count and scores nothing; if you're right it's +2 and the category is yours. Shield (when defending): the category stays yours; even if your opponent is right they only get +1. Each once per match. A played joker stays hidden until the end of the round; if both are played on the same move they cancel out and both are spent.",
  // Plan A (7 Eki 2026) · puan şeridi + tur sonu tek cümle ({kat} Türkçede belirtme hâlinde: "Bilim'i")
  "{h} puan ya da {nE} {yE} al": "{h} points or take {y} of {n}",
  "{kat} çaldın!": "You stole {kat}!",
  "{kat} kaybettin": "You lost {kat}",
  "kaybedildi": "lost",
  "Sen {n}": "You {n}",
  "Rakip {n}": "Opp {n}",
  "çalındı": "stolen",
  // 990 · kategori çalma anı (tek güçlü cümle + uçan kart)
  "{kat} rakipten sana geçti!": "{kat} moved from your opponent to you!",
  "{kat} senden rakibe geçti": "{kat} moved from you to your opponent",
  "Rakipten sana": "From opponent to you",
  "Senden rakibe": "From you to opponent",
  // Maç sonu özeti (7 Eki 2026): ele geçirilen kategoriler
  "Ele geçirilen kategoriler": "Captured categories",
  "Ele geçirilen {n}/{y}": "Captured {n}/{y}",
  "Hiçbir kategori el değiştirmedi.": "No category changed hands.",
};
