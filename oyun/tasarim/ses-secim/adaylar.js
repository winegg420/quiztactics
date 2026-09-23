// /ses-secim — ses anları ve adayları (Ajan F, 23 Eyl 2026).
// Dosyalar `public/ses/adaylar/` altında; YALNIZ bu sayfa açılınca istenir (ana pakete girmez).
// "Mevcut" aday oyunda bugün çalan dosyadır (`public/ses/`); null → o an bugün sessiz.
// Kaynak/lisans ayrıntısı: public/ses/adaylar/KAYNAKLAR.md (+ docs/VARLIK_LISANSLARI.md).
// Seçim oyuna hemen geçer (Ajan H: ses.js › AN eşlemesi + sesArkaPlan.js). Yeni aday/an: public/ses/adaylar/KAYNAKLAR.md başı.
// Aday id'si listedeki sıradan üretilir (adayKur) — yeni adayı listenin SONUNA ekle.

import { muzikOnizlemeUrl, muzikTamUrl } from "../../lib/muzikParcalari.js";

/** Kenney paketleri — hepsi CC0. */
export const KENNEY = {
  IS: { ad: "Interface Sounds", url: "https://kenney.nl/assets/interface-sounds" },
  UI: { ad: "UI Audio", url: "https://kenney.nl/assets/ui-audio" },
  IMP: { ad: "Impact Sounds", url: "https://kenney.nl/assets/impact-sounds" },
  DA: { ad: "Digital Audio", url: "https://kenney.nl/assets/digital-audio" },
  MJ: { ad: "Music Jingles", url: "https://kenney.nl/assets/music-jingles" },
  CAS: { ad: "Casino Audio", url: "https://kenney.nl/assets/casino-audio" },
  SF: { ad: "Sci-Fi Sounds", url: "https://kenney.nl/assets/sci-fi-sounds" },
  RPG: { ad: "RPG Audio", url: "https://kenney.nl/assets/rpg-audio" },
};

// k: [paket, parça] (Kenney, WAV'a çevrildi) · p: [pixabay id, yazar, sayfa yolu] (mp3, çerçeve sınırından kırpıldı)
const k = (paket, parca) => ({ kaynak: "kenney", paket, parca });
const p = (id, yazar, ad, yol) => ({ kaynak: "pixabay", id, yazar, ad, url: `https://pixabay.com/${yol}/` });

/** Efekt anları — sıra oyundaki akışa göre. */
const EFEKT_TANIM = [
  ["dokunus", "Dokunuş", "Tap", "Her düğmeye basışta (çok kısa, kısık).", "Every button press (very short, quiet).", "dokunus.mp3",
    [k("IS", "click_002"), k("IS", "select_001"), k("UI", "click3")]],
  ["sayfa_gecis", "Sayfa geçişi", "Page change", "Alt menüden sekme/sayfa değişince.", "When switching tabs/pages from the bottom menu.", null,
    [k("IS", "switch_004"), k("IS", "scroll_003"), k("IS", "maximize_001")]],
  ["rakip_bulundu", "Rakip bulundu", "Opponent found", "Rakip arama katmanı kapanıp maç açılırken.", "When the search overlay closes and the match opens.", "rakip_bulundu.mp3",
    [k("IS", "confirmation_002"), k("DA", "threeTone2"), k("MJ", "jingles_HIT02"), p(6104, "freesound_community", "Game Start", "sound-effects/film-special-effects-game-start-6104")]],
  ["vs_ani", "VS anı", "VS moment", "İki oyuncunun karşı karşıya geldiği VS kartı.", "The VS card where both players face off.", null,
    [k("IMP", "impactBell_heavy_000"), k("IMP", "impactPunch_heavy_000"), k("MJ", "jingles_HIT05"), p(454860, "Universfield", "Boom Swoosh Impact", "sound-effects/boom-swoosh-impact-454860")]],
  ["soru_geldi", "Soru geldi", "Question appears", "Yeni soru kartı ekrana geldiği an.", "The moment a new question card appears.", "soru_geldi.wav",
    [k("IS", "question_001"), k("IS", "question_004"), k("DA", "pepSound3")]],
  ["geri_sayim_tik", "Geri sayım tik", "Countdown tick", "Soru süresinin son 5 saniyesinde her saniye.", "Every second in the last 5 seconds of a question.", "tik.mp3",
    [k("IS", "tick_001"), k("IS", "tick_004"), k("IS", "click_005")]],
  ["son_3_saniye", "Son 3 saniye", "Last 3 seconds", "Geri sayımın son 3 saniyesi (Düello kategori seçimi dahil).", "Last 3 seconds of a countdown (incl. Duel category pick).", "sayim_son.wav",
    [k("IS", "glass_005"), k("IMP", "impactBell_heavy_002"), k("DA", "tone1")]],
  ["sure_doldu", "Süre doldu", "Time's up", "Soru süresi bittiğinde.", "When the question timer runs out.", "sure_doldu.mp3",
    [k("IS", "error_004"), k("DA", "lowDown"), k("IS", "glitch_001"), p(20582, "eritnhut1992", "Buzzer or Wrong Answer", "sound-effects/film-special-effects-buzzer-or-wrong-answer-20582")]],
  ["dogru", "Doğru", "Correct", "Doğru cevap verince.", "On a correct answer.", "dogru.mp3",
    [k("IS", "confirmation_001"), k("IS", "confirmation_003"), k("DA", "twoTone1"), p(6033, "freesound_community", "Correct", "sound-effects/film-special-effects-correct-6033")]],
  ["yanlis", "Yanlış", "Wrong", "Yanlış cevap verince.", "On a wrong answer.", "yanlis.mp3",
    [k("IS", "error_006"), k("IS", "error_008"), k("DA", "lowThreeTone"), p(126515, "Universfield", "Wrong Answer", "sound-effects/film-special-effects-wrong-answer-126515")]],
  ["skill", "Skill kullanıldı (genel)", "Skill used (general)", "Genel ses: Düello saldırı/savunma jokerleri ve tanınmayan skill. 7 skill'in kendi sesi aşağıda.", "General sound: Duel attack/defence jokers and unknown skills. Each of the 7 skills has its own sound below.", "joker.mp3",
    [k("DA", "powerUp2"), k("DA", "powerUp7"), k("DA", "phaserUp3"), p(177983, "floraphonic", "Power Up Sparkle 1", "sound-effects/film-special-effects-power-up-sparkle-1-177983")]],
  // Ajan K (24 Eyl 2026): her skill'in kendi anı. An adı = ses.js rolü; "Mevcut" = skill'e özel eski dosya.
  ["skill_elli", "Skill: 50:50", "Skill: 50:50", "50:50 kullanılınca — iki yanlış şık gider (ikiye bölünme/kırılma).", "When 50:50 is used — two wrong options vanish (split/break).", "skill_elli.wav",
    [k("RPG", "knifeSlice"), k("IMP", "impactGlass_medium_001"), k("DA", "phaserDown1"), p(454859, "Universfield", "Broken Glass Impact", "sound-effects/broken-glass-impact-454859")]],
  ["skill_ek_sure", "Skill: Ek Süre", "Skill: Extra Time", "Ek Süre kullanılınca — saat/zaman uzar.", "When Extra Time is used — the clock is extended.", "skill_ek_sure.wav",
    [k("IS", "maximize_004"), k("DA", "powerUp5"), k("IS", "glass_004"), p(83013, "freesound_community", "alarm-bonus", "sound-effects/film-special-effects-alarm-bonus-83013")]],
  ["skill_soru_degistir", "Skill: Soru Değiştir", "Skill: Swap Question", "Soru Değiştir kullanılınca — kart karışır, yeni soru gelir.", "When Swap Question is used — cards shuffle, a new question comes.", "skill_soru_degistir.wav",
    [k("CAS", "card-shuffle"), k("CAS", "card-fan-1"), k("CAS", "card-slide-5"), p(104313, "freesound_community", "Riffle Card Shuffle", "sound-effects/film-special-effects-riffle-card-shuffle-104313")]],
  ["skill_zaman_baskisi", "Skill: Zaman Baskısı", "Skill: Time Pressure", "Zaman Baskısı atılınca/yenince — gergin tik, uyarı.", "When Time Pressure is cast/received — tense tick, warning.", "skill_zaman_baskisi.wav",
    [k("IS", "error_005"), k("DA", "zapTwoTone2"), k("IS", "bong_001"), p(376897, "DRAGON-STUDIO", "Clock Ticking Down", "sound-effects/film-special-effects-clock-ticking-down-376897")]],
  ["skill_ikinci_sans", "Skill: İkinci Şans", "Skill: Second Chance", "İkinci Şans kullanılınca — kalp, yeniden deneme.", "When Second Chance is used — heart, try again.", "skill_ikinci_sans.wav",
    [k("DA", "phaseJump1"), k("MJ", "jingles_NES10"), k("IMP", "impactSoft_medium_000"), p(153317, "Universfield", "Game Respawn", "sound-effects/film-special-effects-game-respawn-153317")]],
  ["skill_sigorta", "Skill: Sigorta", "Skill: Insurance", "Sigorta (ve Seri Koruma, biraz tiz) — kalkan, metalik koruma.", "Insurance (and Streak Shield, a bit higher) — shield, metallic guard.", "skill_sigorta.wav",
    [k("SF", "forceField_000"), k("IMP", "impactMetal_heavy_001"), k("RPG", "metalLatch"), p(333827, "Epic_Stock_Media", "Impact Magic Earth Shield Up Game Sound", "sound-effects/film-special-effects-impact-magic-earth-shield-up-game-sound-333827")]],
  ["skill_2x", "Skill: 2X", "Skill: 2X", "2X (çifte puan) kullanılınca — güçlenme, parıltı.", "When 2X (double points) is used — power-up, sparkle.", "skill_2x.wav",
    [k("DA", "powerUp12"), k("DA", "zapThreeToneUp"), k("IS", "glass_002"), p(484722, "EdR", "Power Up 01A", "sound-effects/film-special-effects-power-up-01a-484722")]],
  ["can_kaybi", "Düello can kaybı", "Duel life lost", "Düelloda bir kalp söndüğünde.", "When a heart goes out in a Duel.", "can_kaybi.mp3",
    [k("IMP", "impactPunch_medium_002"), k("IMP", "impactSoft_heavy_001"), k("DA", "phaserDown2")]],
  ["kategori_secildi", "Düello kategori seçildi", "Duel category picked", "Düelloda kategori seçimi kesinleşince.", "When the Duel category pick is locked in.", null,
    [k("IS", "select_006"), k("IS", "toggle_003"), k("CAS", "card-place-2"), p(395763, "Emilianodleon", "Select Button UI", "sound-effects/film-special-effects-select-button-ui-395763")]],
  ["tur_gecis", "Düello tur geçişi", "Duel round change", "Düelloda bir turdan diğerine geçerken.", "Between rounds in a Duel.", "tur_gecis.wav",
    [k("IS", "maximize_008"), k("CAS", "card-slide-3"), k("DA", "phaseJump2"), p(382724, "DRAGON-STUDIO", "Simple Whoosh", "sound-effects/film-special-effects-simple-whoosh-382724")]],
  ["rakip_cevapladi", "Rakip cevapladı", "Opponent answered", "Rakip cevabını verdiği an (sen hâlâ düşünürken).", "When the opponent answers (while you are still thinking).", null,
    [k("IS", "pluck_001"), k("IS", "drop_003"), k("CAS", "chip-lay-1"), p(402324, "DRAGON-STUDIO", "Pop", "sound-effects/film-special-effects-pop-402324")]],
  ["galibiyet", "Galibiyet", "Victory", "Maç sonu — kazandın ekranı.", "Match end — victory screen.", "kazandin.wav",
    [k("MJ", "jingles_STEEL00"), k("MJ", "jingles_NES08"), k("MJ", "jingles_SAX03"), p(6346, "freesound_community", "Short Success Sound Glockenspiel", "sound-effects/film-special-effects-short-success-sound-glockenspiel-treasure-video-game-6346")]],
  ["maglubiyet", "Mağlubiyet", "Defeat", "Maç sonu — kaybettin ekranı.", "Match end — defeat screen.", "kaybettin.wav",
    [k("MJ", "jingles_PIZZI02"), k("MJ", "jingles_SAX09"), k("MJ", "jingles_NES14"), p(90322, "freesound_community", "game fail", "sound-effects/film-special-effects-game-fail-90322")]],
  ["beraberlik", "Beraberlik", "Draw", "Maç sonu — berabere ekranı.", "Match end — draw screen.", null,
    [k("MJ", "jingles_PIZZI05"), k("MJ", "jingles_STEEL06"), k("MJ", "jingles_HIT08")]],
  ["coin", "Coin kazanma", "Coins earned", "Coin sayacı artmaya başladığında (bir kez).", "When the coin counter starts rising (once).", "coin.wav",
    [k("CAS", "chips-collide-2"), k("CAS", "chips-stack-1"), k("DA", "pepSound1"), p(190037, "Liecio", "Collect Points", "sound-effects/film-special-effects-collect-points-190037")]],
  ["satin_alma", "Satın alma", "Purchase", "Dükkânda bir şey satın alınınca.", "When something is bought in the shop.", null,
    [k("CAS", "chips-handle-3"), k("MJ", "jingles_NES05"), k("DA", "threeTone1"), p(376867, "DRAGON-STUDIO", "Cash Register Kaching", "sound-effects/film-special-effects-cash-register-kaching-376867")]],
  ["xp_dolma", "XP dolma", "XP filling", "Maç sonunda XP çubuğu dolarken.", "While the XP bar fills after a match.", null,
    [k("DA", "phaserUp1"), k("DA", "powerUp4"), k("IS", "scroll_004")]],
  ["level", "Level atlama", "Level up", "XP seviyesi arttığında.", "When your XP level goes up.", "level.wav",
    [k("MJ", "jingles_NES06"), k("DA", "powerUp11"), k("MJ", "jingles_STEEL04"), p(370051, "Universfield", "Level Up 06", "sound-effects/film-special-effects-level-up-06-370051")]],
  ["rozet", "Rozet kazanıldı", "Badge earned", "Yeni rozet kartı açılınca.", "When a new badge card opens.", null,
    [k("IS", "glass_006"), k("MJ", "jingles_HIT03"), k("DA", "powerUp9"), p(243762, "Universfield", "Achievement Unlock", "sound-effects/film-special-effects-achievement-unlock-243762")]],
  ["lig_atlama", "Lig atlama", "League promotion", "Haftalık ligde üst lige çıkınca.", "When promoted to a higher weekly league.", "rutbe.mp3",
    [k("MJ", "jingles_STEEL08"), k("MJ", "jingles_SAX05"), k("MJ", "jingles_NES01"), p(84543, "freesound_community", "Army Rank Up 2", "sound-effects/musical-army-rank-up-2-84543")]],
  ["turnuva", "Turnuva başlıyor", "Tournament starts", "Turnuva başlangıç ekranı.", "Tournament start screen.", "turnuva.wav",
    [k("MJ", "jingles_STEEL12"), k("MJ", "jingles_HIT13"), k("IMP", "impactBell_heavy_003"), p(6185, "freesound_community", "Success Fanfare Trumpets", "sound-effects/film-special-effects-success-fanfare-trumpets-6185")]],
  ["bildirim", "Bildirim geldi", "Notification", "Uygulama içi bildirim (davet, mesaj) geldiğinde.", "When an in-app notification (invite, message) arrives.", null,
    [k("IS", "glass_001"), k("IS", "pluck_002"), k("DA", "twoTone2"), p(493469, "Universfield", "New Notification 040", "sound-effects/technology-new-notification-040-493469")]],
  ["hata_uyari", "Hata / uyarı", "Error / warning", "Bir işlem başarısız olunca ya da uyarı çıkınca.", "When an action fails or a warning appears.", null,
    [k("IS", "error_001"), k("IS", "error_003"), k("IS", "glitch_002"), p(132113, "Universfield", "Error Alert", "sound-effects/film-special-effects-error-alert-132113")]],
];

/** Müzik anları — Pixabay Music (Pixabay İçerik Lisansı). Sayfa 30 sn önizleme, oyun tam parça (Storage) çalar.
 *  Müzik anında 1–4 aday SIRALI seçilir (çalma listesi, migration 450). */
const MUZIK_TANIM = [
  ["muzik_menu", "Menü / lobi müziği", "Menu / lobby music", "Ana sayfa ve menülerde döngü (neşeli).", "Loop on home and menus (cheerful).",
    [p(490551, "BombinSound", "Happy - Happy Music", "music/happy-childrens-tunes-happy-happy-music-490551"),
      p(146738, "Ivantraveso", "Music for Puzzle Game", "music/video-games-music-for-puzzle-game-146738"),
      p(144037, "XtremeFreddy", "Game Music Loop 2", "music/beats-game-music-loop-2-144037"),
      p(153393, "XtremeFreddy", "Game Music Loop 19", "music/video-games-game-music-loop-19-153393"),
      // Ajan M (24 Eyl 2026): Ida'nın lobi seçimine (Aday 2, zen havası) benzer 5 parça — tam parçalar Storage'da.
      p(275645, "MMAudio", "A Leaf On the Wind", "music/beats-a-leaf-on-the-wind-275645"),
      p(275157, "MMAudio", "Lost Under the Cherry Blossom Tree", "music/beats-lost-under-the-cherry-blossom-tree-275157"),
      p(140474, "NourishedByMusic", "Japanese Relaxing Koto", "music/meditationspiritual-japanese-relaxing-koto-140474"),
      p(120669, "NourishedByMusic", "Chinese Dizi Flute", "music/china-chinese-dizi-flute-120669"),
      p(414817, "bradfordhines", "京都琴 (Kyoto Koto)", "music/world-%E4%BA%AC%E9%83%BD%E7%90%B4-kyoto-koto-414817")]],
  ["muzik_mac", "Maç müziği", "Match music", "Maç sırasında döngü (sakin gerilim).", "Loop during a match (calm tension).",
    [p(442839, "DELOSound", "Tense Suspense Background Music", "music/suspense-tense-suspense-background-music-442839"),
      p(191716, "WaffleMusic", "Thinking Music", "music/pulses-thinking-music-191716"),
      p(219722, "Kaden_Cook", "Countdown", "music/electronic-countdown-219722"),
      p(433787, "Kuzu420", "Calm Suspenseful Background Music [loop]", "music/suspense-calm-suspenseful-background-music-loop-433787"),
      // Ajan M (24 Eyl 2026): aynı Doğu havası ama hızlı/adrenalinli (taiko, koto trap, Asya aksiyon) — sözsüz.
      p(491389, "DesiFreeMusic", "Primitive Battle Groove (Taiko Drums)", "music/percussion-primitive-battle-groove-with-rhythmic-taiko-drums-handclaps-491389"),
      p(562795, "alexrockbeat", "Dramatic Asian Cinematic Trailer", "music/action-alexrockbeat-dramatic-asian-cinematic-trailer-562795"),
      p(287090, "47643651", "Japanese Chinese Trap | Dark | Temple (Geisha)", "music/beats-japanese-chinese-trap-dark-temple-geisha-287090"),
      p(192734, "onesevenbeatxs", "Cool Japanese Hard Groovy Trap Beat", "music/trap-cool-japanese-hard-groovy-trap-beat-prod-by-onesevenbeatxs-192734"),
      p(434227, "ZhenyaVegasMusic", "Action Percussion Stomp Intro", "music/upbeat-action-percussion-stomp-intro-434227")]],
  ["muzik_turnuva", "Turnuva lobisi teması", "Tournament lobby theme", "Turnuva bekleme/başlangıç ekranı.", "Tournament waiting/start screen.",
    [p(484392, "prettyjohn1", "Sport - Sport Music", "music/rock-sport-sport-music-484392"),
      p(512484, "BombinSound", "Epic Action", "music/orchestral-epic-action-512484"),
      p(184602, "Rockot", "Pink Lemon", "music/corporate-pink-lemon-positive-happy-motivational-commercial-anthem-184602"),
      p(549132, "ShtakalBerry", "Champions Anthem", "music/world-champions-anthem-549132")]],
];

const KLASOR = "/ses/adaylar/";

function adayKur(an, a, i, sayac) {
  if (a.kaynak === "kenney") {
    sayac.k += 1;
    const id = `${an}-k${sayac.k}`;
    const pk = KENNEY[a.paket];
    return { id, dosya: `${KLASOR}${id}.wav`, kaynak: "Kenney", baslik: `${pk.ad} › ${a.parca}`, yazar: "Kenney", url: pk.url, lisans: "CC0" };
  }
  sayac.p += 1;
  // Müzik: ilk 30 sn, AAC (ADTS) 96 kbps stereo — iOS dahil çalar, 10 MB sınırına sığar.
  const muzik = an.startsWith("muzik_");
  const id = muzik ? `${an}-${i + 1}` : `${an}-p${sayac.p}`;
  // Müzik: `dosya` = 30 sn önizleme (yeni adaylarınki Storage'da), `tam` = oyunun çaldığı tam parça (Storage).
  const dosya = (muzik && muzikOnizlemeUrl(id)) || `${KLASOR}${id}.${muzik ? "aac" : "mp3"}`;
  return { id, dosya, tam: muzik ? muzikTamUrl(id) : null, kaynak: "Pixabay", baslik: a.ad, yazar: a.yazar, url: a.url, lisans: "Pixabay İçerik Lisansı" };
}

export const EFEKTLER = EFEKT_TANIM.map(([an, ad, adEn, yer, yerEn, mevcut, liste]) => {
  const sayac = { k: 0, p: 0 };
  return { an, ad, adEn, yer, yerEn, tur: "efekt", mevcut: mevcut ? `/ses/${mevcut}` : null, adaylar: liste.map((a, i) => adayKur(an, a, i, sayac)) };
});

export const MUZIKLER = MUZIK_TANIM.map(([an, ad, adEn, yer, yerEn, liste]) => {
  const sayac = { k: 0, p: 0 };
  return { an, ad, adEn, yer, yerEn, tur: "muzik", mevcut: null, adaylar: liste.map((a, i) => adayKur(an, a, i, sayac)) };
});

export const TUM_ANLAR = [...EFEKTLER, ...MUZIKLER];

/** Kenney kaynak listesi (dönüştürme betiği için): [hedef id, paket, parça] */
export const KENNEY_ISLERI = EFEKT_TANIM.flatMap(([an, , , , , , liste]) => {
  let n = 0;
  return liste.filter((a) => a.kaynak === "kenney").map((a) => [`${an}-k${++n}`, a.paket, a.parca]);
});
