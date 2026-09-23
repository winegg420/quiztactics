// /ses-secim — ses anları ve adayları (Ajan F, 23 Eyl 2026).
// Dosyalar `public/ses/adaylar/` altında; YALNIZ bu sayfa açılınca istenir (ana pakete girmez).
// "Mevcut" aday oyunda bugün çalan dosyadır (`public/ses/`); null → o an bugün sessiz.
// Kaynak/lisans ayrıntısı: public/ses/adaylar/KAYNAKLAR.md (+ docs/VARLIK_LISANSLARI.md).
// Seçim oyuna hemen geçer (Ajan H: ses.js › AN eşlemesi + sesArkaPlan.js). Yeni aday/an: public/ses/adaylar/KAYNAKLAR.md başı.
// Aday id'si listedeki sıradan üretilir (adayKur) — yeni adayı listenin SONUNA ekle.

/** Kenney paketleri — hepsi CC0. */
export const KENNEY = {
  IS: { ad: "Interface Sounds", url: "https://kenney.nl/assets/interface-sounds" },
  UI: { ad: "UI Audio", url: "https://kenney.nl/assets/ui-audio" },
  IMP: { ad: "Impact Sounds", url: "https://kenney.nl/assets/impact-sounds" },
  DA: { ad: "Digital Audio", url: "https://kenney.nl/assets/digital-audio" },
  MJ: { ad: "Music Jingles", url: "https://kenney.nl/assets/music-jingles" },
  CAS: { ad: "Casino Audio", url: "https://kenney.nl/assets/casino-audio" },
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
  ["skill", "Skill kullanıldı", "Skill used", "Bir skill (50:50, Ek Süre…) kullanılınca — genel ses.", "When a skill (50:50, Extra Time…) is used — general sound.", "joker.mp3",
    [k("DA", "powerUp2"), k("DA", "powerUp7"), k("DA", "phaserUp3"), p(177983, "floraphonic", "Power Up Sparkle 1", "sound-effects/film-special-effects-power-up-sparkle-1-177983")]],
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

/** Müzik anları — Pixabay Music (Pixabay İçerik Lisansı), 30 sn'lik önizleme. */
const MUZIK_TANIM = [
  ["muzik_menu", "Menü / lobi müziği", "Menu / lobby music", "Ana sayfa ve menülerde döngü (neşeli).", "Loop on home and menus (cheerful).",
    [p(490551, "BombinSound", "Happy - Happy Music", "music/happy-childrens-tunes-happy-happy-music-490551"),
      p(146738, "Ivantraveso", "Music for Puzzle Game", "music/video-games-music-for-puzzle-game-146738"),
      p(144037, "XtremeFreddy", "Game Music Loop 2", "music/beats-game-music-loop-2-144037"),
      p(153393, "XtremeFreddy", "Game Music Loop 19", "music/video-games-game-music-loop-19-153393")]],
  ["muzik_mac", "Maç müziği", "Match music", "Maç sırasında döngü (sakin gerilim).", "Loop during a match (calm tension).",
    [p(442839, "DELOSound", "Tense Suspense Background Music", "music/suspense-tense-suspense-background-music-442839"),
      p(191716, "WaffleMusic", "Thinking Music", "music/pulses-thinking-music-191716"),
      p(219722, "Kaden_Cook", "Countdown", "music/electronic-countdown-219722"),
      p(433787, "Kuzu420", "Calm Suspenseful Background Music [loop]", "music/suspense-calm-suspenseful-background-music-loop-433787")]],
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
  return { id, dosya: `${KLASOR}${id}.${muzik ? "aac" : "mp3"}`, kaynak: "Pixabay", baslik: a.ad, yazar: a.yazar, url: a.url, lisans: "Pixabay İçerik Lisansı" };
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
