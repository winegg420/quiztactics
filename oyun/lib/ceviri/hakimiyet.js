// İngilizce çeviri eki — Düello Hâkimiyet (680), metinler — tanıtım, lobi, rozet (Alt Ajan C). Anahtar Türkçe metnin kendisidir.
// dil.js en sonda katar: buradaki karşılık eski dosyalardakini ezer.
export default {
  "Aynı soru, aynı anda": "Same question, same time",
  "Her turda soru ikinize aynı anda açılır, ikiniz de cevaplarsınız (süre dolarsa yanlış sayılır). Saldıran kategoriyi seçer (15 sn; dolarsa rastgele). Savunan beklemez: saldıranın dokunduğu kartı canlı görür ve sıradaki saldırısına şimdiden hazırlanır.": "Every round the question opens for both of you at once and you both answer (running out of time counts as wrong). The attacker picks the category (15 s; random if time runs out). The defender doesn't wait: they see the card the attacker touched live and can prepare their next attack right away.",
  "{n} yuva: ilk dolduran kazanır": "{n} slots: first to fill wins",
  "Herkes 0-0 başlar, 10 kategorinin hepsi boştur. Kazandığın kategoriler senin yuvandır. {n} yuvaya ilk ulaşan maçı anında kazanır.": "Everyone starts 0-0 and all 10 categories are empty. The categories you win are your slots. Whoever reaches {n} slots first wins the match instantly.",
  "Hamle kuralı": "The move rule",
  "Hamlenin tutması için saldıran doğru, savunan yanlış bilmelidir. Boş kategoride kural biraz farklı: sen yanlış, rakip doğru bilirse kategoriyi rakip alır. Yani boşta bilen alır.": "A move lands only if the attacker is right and the defender is wrong. Empty categories work a little differently: if you are wrong and your opponent is right, your opponent takes it. So whoever knows it takes an empty category.",
  "Elinden al · Al · Pekiştir": "Take · Claim · Reinforce",
  "Rakibin kategorisi: hamle tutarsa \"Elinden al\" ile sana geçer. Boş kategori: tutarsa \"Al\" ile yuvan olur. Kendi kategorin: tutarsa \"Pekiştir\" ile kilitlenir. Sahibi değişen ya da pekiştirilen kategori 2 tur kimse tarafından seçilemez; tutmayan hamlede kilit yok.": "Opponent's category: if the move lands, you take it (\"Take\"). Empty category: if it lands, it becomes your slot (\"Claim\"). Your own category: if it lands, it locks (\"Reinforce\"). A category that changes owner or is reinforced can't be picked by anyone for 2 rounds; a move that doesn't land causes no lock.",
  "{t} tur ve Altın Soru": "{t} rounds and the Golden Question",
  "Maç en çok {t} tur sürer; her tur bir hamledir ve saldıran/savunan her tur el değiştirir. {t}. tur sonunda kimse {n} yuvaya ulaşamadıysa yuvası çok olan kazanır. Yuvalar eşitse Altın Soru gelir: zor soru, joker yok, yalnız biriniz bilene kadar sürer. Sahiplik değişmez.": "A match lasts at most {t} rounds; each round is one move, and attacker/defender swap every round. If nobody has reached {n} slots after round {t}, whoever holds more slots wins. If slots are tied, the Golden Question comes: a hard question, no jokers, until only one of you knows it. Ownership doesn't change.",
  "Baskın ve Kalkan": "Ambush and Shield",
  "Baskın (saldırırken, soru ekranında): bu hamlede rakibin cevabı sayılmaz; sen doğruysan hamle tutar. Kalkan (savunurken, kendi kategorine saldırılırken): rakibin hamlesi tutmaz, kategori sende kalır. Her biri maçta 1 kez. Basılan joker tur sonuna kadar rakipten gizlidir; ikisi aynı hamlede basılırsa birbirini götürür ve ikisi de harcanır.": "Ambush (when attacking, on the question screen): your opponent's answer doesn't count for this move; if you're right, the move lands. Shield (when defending, while your category is attacked): your opponent's move doesn't land and the category stays yours. Each can be used once per match. A played joker stays hidden from your opponent until the end of the round; if both are played on the same move they cancel out and both are spent.",
  // 900: tanıtım — soru ekranı çerçeve renkleri + savunma banı; arama ipuçları
  "Soru ekranında çerçeve rengi": "Frame colour on the question screen",
  "Sorulan kategori renkli çerçeveyle gösterilir. Kırmızı: rakip senin kategorine saldırıyor; yanlış bilirsen ve rakip bilirse kaybedersin. Mavi: fırsat; saldırıyorsan hamlen tutabilir, savunurken boş kategoride rakip yanlış yapar ve sen bilirsen kategori senin olur. Gri: rakip kendi kategorisini pekiştiriyor; kategori el değiştirmez, doğru bilirsen kilitlenmesini önlersin.": "The category being asked is shown with a coloured frame. Red: your opponent is attacking your category; if you get it wrong and they get it right, you lose it. Blue: a chance; when attacking your move can land, and when defending an empty category it becomes yours if your opponent is wrong and you are right. Grey: your opponent is reinforcing their own category; it doesn't change hands, and a right answer from you stops it from being locked.",
  "Kalkan kırmızı çerçevedeki hamleyi durdurur. Rakip Baskın kullandıysa cevabın sayılmaz.": "Shield stops the move in a red frame. If your opponent used Ambush, your answer doesn't count.",
  "Savunma banı": "Defence ban",
  "Her turda saldıran seçmeden önce savunan 1 kategoriyi banlar ({b} sn). Banladığın an tur ilerler; süre dolarsa ban kullanılmaz. Rakip o tur banlı kategoriyi seçemez. Aynı kategoriyi arka arkaya banlayamazsın.": "Every round, before the attacker picks, the defender bans 1 category ({b} s). The round moves on the moment you ban; if time runs out, no ban is used. Your opponent can't pick the banned category that round. You can't ban the same category twice in a row.",
  "Kırmızı çerçeve: kategorin tehlikede. Yanlış bilirsen ve rakip bilirse kaybedersin.": "Red frame: your category is at risk. Get it wrong while your opponent gets it right and you lose it.",
  "Mavi çerçeve: fırsat. Boş kategoride rakip yanlış yapar ve sen bilirsen senin olur.": "Blue frame: a chance. In an empty category, if your opponent is wrong and you are right, it's yours.",
  "Joker sınırları": "Joker limits",
  "Maçta toplam 4 joker kullanımın var; aynı joker en çok 2 kez, bir soruda en çok 1. Baskın ve Kalkan dükkândan alınır, Düello joker setine seçilir.": "You have 4 joker uses in total per match; the same joker at most 2 times, and at most 1 per question. Ambush and Shield are bought in the shop and chosen for your Duel joker set.",
  "{n} yuvayı ilk dolduran kazanır. Hamle için sen doğru, rakip yanlış bilmelisin. {t} tur, eşitlikte Altın Soru.": "Whoever fills {n} slots first wins. For a move to land you must be right and your opponent wrong. {t} rounds, Golden Question on a tie.",
  "{n} yuvayı ilk dolduran kazanır.": "Whoever fills {n} slots first wins.",
  // 870: boşta ikisi de doğru → saldıran alır (maç içi satırın İngilizcesi hakimiyet-ekran.js ile aynı)
  "Boş kategoride ikiniz de bilirseniz saldıran alır.": "Empty category: if you both know it, the attacker takes it.",
  "Hamlen tutması için sen doğru, rakip yanlış bilmelisin.": "For your move to land you must be right and your opponent wrong.",
  "Boş kategoride bilen alır.": "Whoever knows an empty category takes it.",
  "Tutan hamle kategoriyi 2 tur kilitler.": "A move that lands locks the category for 2 rounds.",
  "{t} tur sonunda yuvalar eşitse Altın Soru.": "If slots are tied after {t} rounds, it's the Golden Question.",
  // 1 Eki 2026: tur sayısı ayardan (duello_max_tur, 16) — sabit "10 tur" metinleri yerine
  "{t} tur": "{t} rounds",
  "{t} tur · aynı soru, aynı anda": "{t} rounds · same question, same time",
  "{n} joker türü · {t} tur": "{n} joker types · {t} rounds",
  // 760: durum okuması hata verince / faz geç gelince maç ekranı bandı
  "Bağlantı yeniden kuruluyor…": "Reconnecting…",
};
