// Ortak Hazine MAÇ AKIŞI ölçümü (15 Eki 2026) — TAKLİT SUNUCUYLA tam maç, canlı veritabanına HİÇ istek gitmez.
//
// Ne yapar: tarayıcıda bütün Supabase istekleri taklit edilir; Node içindeki küçük bir Hazine sunucusu (faz makinesi,
// canlı kasa_ilerlet_ic ile aynı sıra ve süreler: başlangıç 4,5 sn (1105) · soru gösterim payı 1,5 sn · soru 15 sn ·
// sonuç 3 sn · karar 5 sn + pay · karardan sonra soru 1,5 sn ileri) maçı yürütür. Oto oyuncu şık seçer, karar sende ise
// AÇ/DEVAM'a basar. Ses dosyaları (Ida'nın /ses-secim seçimleri, Storage) bir kez indirilip diskte tutulur ve yavaş 4G
// hızında (150 ms + 1,6 Mbit/s ortak hat) verilir. CPU 6x yavaş · 390×844 · Android UA.
//
// Senaryolar: bot      — rakip insanın hemen ardından cevaplar, karar 1–2 sn; yanıtlar 150 ms gecikmeli
//             gecikmeli — rakip 3–9 sn sonra (bazen senden önce) cevaplar, karar 2,5–4 sn; kasa_durum yanıtları 150–900 ms gecikmeli
//             dalgali  — (16 Eki 2026, Ida'nın telefondaki takılması) CANLI kapanış kuralları: cevapsız oyuncu için soru
//                        bitiş + 5 sn (cevap_gec_varis_sn), karar payı 3 sn; oto oyuncu turların ~%40'ında CEVAPLAMAZ (süre
//                        dolar); kasa_durum asimetrik dalgalı ağ (gidiş 30–150 ms, dönüş 60–1400 ms → saat örneği oynar);
//                        telefonun saati 70. sn'de +1,5 sn, 140. sn'de −1 sn atlar; 4. turda sayfa 4 sn arka plana gidip
//                        döner (görünürlük + yaşam döngüsü dondurma). Eski taklit (1 sn kapanış, hep cevap) bu takılmayı
//                        hiç üretmiyordu → "çakışma 0".
//             aski     — (16 Eki 2026) bot kuralları + her 15 kasa_durum okumasından biri 9,5 sn yanıtsız (takılan bağlantı)
//             yavas_sunucu — (16 Eki 2026, canlı 14:04:40–14:05:20 UTC: bütün RPC'ler 1,7–4,2 sn) dalgalı kurallar + maçın
//                        50.–110. sn'si arasında kasa_durum/cevap/karar satır kilidinde sıraya girer, 1–3,5 sn işlenir,
//                        sunucu_zamani yanıtın sonunda (saat örneği ileri kayar → erken "süre doldu" bildirimi)
//   Faz geçişi (bütün senaryolar): sunucunun fazı değiştirdiği an → istemcinin o fazı gördüğü yanıt; erken süre bildirimi
//   ('Süre dolmadı' reddi) sayısı.
//   Sayaç ölçüsü (bütün senaryolar): sayaç 0'da (ya da "•••") kalma süresi, ileri/geri sıçrama, rakam süreleri.
//
// Sürümden bağımsız ölçüm (sayfaya enjekte edilir; eski sürüm de ölçülebilir):
//   · sunucu faz anları (Node) · istemcinin fazı gördüğü an (kasa_durum yanıtı)
//   · istenen ses (window.__sesKayit, bd_ses_tani=1) · GERÇEKTEN çalan ses (AudioBufferSourceNode.start / OscillatorNode.start;
//     AudioContext askıdaysa çalma anı = yeniden çalışmaya geçtiği an)
//   · CSS animasyonları (document.getAnimations, 100 ms örnek): bitmeden sökülen animasyon = "kesildi"
//   · soru metni / sayaç / giriş sahnesi / efekt katmanı değişimleri; uygulamanın kendi günlüğü varsa window.__akis
// Çakışma tanımları: FAZ TAŞMASI (ses istendiği fazdan sonraki fazda çaldı) · GEÇ ÇALMA (istekten > 250 ms sonra; maç sonu
// hariç) · EŞZAMANLI (iki ayrı ses < 150 ms arayla başladı; dokunuş hariç) · KESİLEN ANİMASYON (≥ 150 ms erken söküldü) ·
// 3-2-1 aralığı · sayaç ilk değeri (tam süre = 15).
//
// Kullanım: npm run build && npx vite preview --port 5199 --strictPort
//           node araclar/hazine-akis-olcum.mjs --adres=http://localhost:5199 --etiket=sonra [--mac=3] [--senaryo=bot,gecikmeli]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = String(ARG.adres || "http://localhost:5199").replace(/\/$/, "");
const ETIKET = typeof ARG.etiket === "string" ? ARG.etiket : "olcum";
const MAC_SAYISI = Math.max(1, Number(ARG.mac) || 3);
const SENARYOLAR = String(ARG.senaryo || "bot,gecikmeli").split(",");
const CIKTI = path.resolve("tasarim/hazine-akis");
const ONBELLEK = path.resolve(".tmp/hazine-akis-ses");
fs.mkdirSync(CIKTI, { recursive: true });
fs.mkdirSync(ONBELLEK, { recursive: true });

const BEN = "0e0e1100-0000-4000-8000-0000000000aa";
const RAKIP = "0e0e1100-0000-4000-8000-0000000000bb";
const REF = "etezccrifaetzrgfvawl";
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const JWT = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: BEN, role: "authenticated", aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 36000, is_anonymous: false })}.sahte`;
const KULLANICI = { id: BEN, aud: "authenticated", role: "authenticated", email: "olcum@ornek.invalid", phone: "", is_anonymous: false,
  app_metadata: { provider: "email", providers: ["email"] }, user_metadata: {}, created_at: "2026-10-01T10:00:00Z" };
// --kozmetik=ida: oyuncu_kartlari yanıtları (16 Eki 2026 canlı salt okuma; kimlikler taklit oyunculara takılır)
const KART_IDA = (id) => ({ id, ad: "idagg", avatar: "/avatars/pro2/balkabagi-adam-y43.svg", level: 34, lig: "altin", cerceve: "lig_altin", cerceve_nadirlik: "nadir",
  vitrin: [{ grup: "level", ikon: "star", kademe: "bronz", anahtar: "level_5" }, { grup: "ustalik", ikon: "kategori:cografya", kademe: "bronz", anahtar: "ustalik_cografya_25" },
    { grup: "lig", ikon: "crown", kademe: "altin", anahtar: "lig_sehir_sampiyonu" }], aura: null, vs_karti: null, isim_efekti: "isim_altin", zafer_efekti: null,
  premium_cerceve: null, premium_aura: null, sehir_sampiyonu: { ulke: "TR", hafta: "2026-10-05", sehir: "Balıkesir" }, unvan: { tur: "sehir", ulke: "TR", sehir: "Balıkesir" },
  koleksiyon_puani: 250, sezon_bp: true, bp_parlama: true });
const KART_LUNA = (id) => ({ id, ad: "Luna", avatar: "/avatars/pro2/kizil-y03.svg", level: 30, lig: "gumus", cerceve: "lig_gumus", cerceve_nadirlik: "nadir",
  vitrin: [{ grup: "level", ikon: "star", kademe: "gumus", anahtar: "level_30" }, { grup: "seri", ikon: "fire", kademe: "bronz", anahtar: "seri_7" },
    { grup: "turnuva", ikon: "medal", kademe: "bronz", anahtar: "turnuva_ilk10" }], aura: null, vs_karti: null, isim_efekti: null, zafer_efekti: null,
  premium_cerceve: null, premium_aura: null, sehir_sampiyonu: null, unvan: null, koleksiyon_puani: 22, sezon_bp: false, bp_parlama: false });
const OTURUM = { access_token: JWT, token_type: "bearer", expires_in: 36000, expires_at: Math.floor(Date.now() / 1000) + 36000, refresh_token: "sahte", user: KULLANICI };
// --dil=en · --genislik=360: arayüz dili / ekran genişliği (15 Eki, skor şeridi ölçümü) · --skor_cekim=<ad>: ilk soru
// ekranında skor şeridi etiketlerini ölçer (kesik mi) ve ekran görüntüsünü tasarim/duzeltme-codex-15eki/<ad>.png'ye alır
const DIL = ARG.dil === "en" ? "en" : "tr", GENISLIK = Number(ARG.genislik) || 390, YUKSEKLIK = GENISLIK < 390 ? 740 : 844;
const PROFIL = { id: BEN, xp: 1240, dil: DIL, lig: "gumus", coin: 1480, puan: 320, seri: 3, ulke: "TR", elmas: 40, level: 7, askida: false, is_bot: false,
  gorunum: null, acik_bot: false, level_xp: 140, seri_gun: 3, takma_ad: "Deniz", username: "olcum", lig_gizli: false,
  avatar_url: "/avatars/pro/tilki-k04.svg", gorunen_avatar: "/avatars/pro/tilki-k04.svg", gorunen_ad: "Deniz", created_at: "2026-10-01T10:00:00Z",
  davet_kodu: "QT7K2M", toplam_mac: 42, arac_hesabi: true, hile_yetkisi: false, mesaj_kapali: false, avatar_onayli: true, rahatsiz_etme: false,
  dereceli_tercih: true, takma_ad_secildi: true, vitrin_rozetleri: [], kosullar_kabul_at: "2026-10-01T10:00:00Z", level_gereken: 400,
  // 15 Eki 2026 (perf): Ida'nın hesabındaki gibi takılı Cevap İmzası (canvas Bilgi Ampulü) — doğru cevapta oynar; --imza=yok kapatır
  takili_cevap_imzasi: ARG.imza === "yok" ? null : String(typeof ARG.imza === "string" ? ARG.imza : "imza_ampul") };
// --canli_sure (15 Eki 2026 perf): canlıdaki ayarlar — gösterim payı 2000 ms, giriş faz_bitis = kasa_giris + 4000 (1105) → ilk soru
// verisi tam "2" anında gelir (madde 4: rakam uzaması). Varsayılan eski taklit değerleri (1500 / 4500).
const HEDEF = 24, SORU_SN = 15, SONUC_MS = 3000, KARAR_MS = 5000, PAY_MS = ARG.canli_sure ? 2000 : 1500, KARAR_AN_MS = 1500, BASLANGIC_MS = ARG.canli_sure ? 4000 : 4500, CARPAN = 1.25;
const AYAR = { kasa_modu_acik: 1, kasa_odul_acik: 1, kasa_odul_carpani: 1, kasa_artis: 2, kasa_ikisi_dogru_artis: 6, kasa_hedef_puan: HEDEF,
  kasa_max_tur: 36, kasa_soru_sn: SORU_SN, kasa_karar_sn: 5, kasa_sonuc_sn: 3, kasa_tavan: 60, kasa_devam_carpan: CARPAN, kasa_acma_min: 0,
  kasa_giris_sahne_ms: 4000, kasa_gosterim_payi_ms: PAY_MS, kasa_karar_an_ms: KARAR_AN_MS };
const SECIMLER = (() => {
  try { return JSON.parse(fs.readFileSync(path.resolve(String(ARG.secimler || ".tmp/hazine-akis-ses/secimler.json")), "utf8")); } catch { return null; }
})();
const OZET = (kazandim) => ({ hazir: true, kazanan: kazandim ? BEN : RAKIP, terk: { ben: false, rakip: false },
  dokum: { hazir: true, toplam: { coin: kazandim ? 30 : 5, lig: kazandim ? 25 : -10 }, kalemler: [], rozetler: [], gorevler: [] },
  lig: { puan: kazandim ? 25 : -10 }, level: null, gorevler: [], rozetler: [] });
const SORULAR = ["Türkiye'nin başkenti neresidir?", "Güneş sistemindeki en büyük gezegen hangisidir?", "Mona Lisa'yı kim yaptı?",
  "Suyun kimyasal formülü nedir?", "En uzun nehir hangisidir?", "İstanbul hangi yıl fethedildi?", "Bir yılda kaç gün vardır?"];

// ---------------- tohumlu rastgele (aynı maç planı iki sürümde aynı) ----------------
function rastgele(tohum) { let s = tohum >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }

// ---------------- taklit Hazine sunucusu ----------------
class Sunucu {
  constructor(tohum, senaryo) {
    this.r = rastgele(tohum);
    this.senaryo = senaryo;
    this.t0 = Date.now();
    // faz_bitis giriş kapısında (kasa_giris = iki taraf maç ekranında) kurulur — canlıdaki gibi (1105)
    this.k = { durum: "aktif", faz: "baslangic", tur: 0, faz_bitis: null, kasa: 0, sahip: null, puan: { [BEN]: 0, [RAKIP]: 0 },
      acma: { [BEN]: 0, [RAKIP]: 0 }, cevaplar: {}, son_karar: null, sonuc: null, karar: null, soru_bas: null, gosterim_bas: null,
      kazanan: null, sonuc_neden: null };
    this.log = [{ t: this.t0, olay: "acildi" }];
    this.plan = {};   // tur → { benDogru, rakipDogru, rakipMs, benMs }
  }
  turPlani(tur) {
    if (!this.plan[tur]) {
      const g = this.senaryo === "gecikmeli";
      this.plan[tur] = { benDogru: this.r() < 0.7, rakipDogru: this.r() < 0.6, cevapsiz: (this.senaryo === "dalgali" || this.senaryo === "yavas_sunucu") && this.r() < 0.4,
        benMs: 1800 + Math.round(this.r() * 3200),
        rakipMs: g ? 3000 + Math.round(this.r() * 6000) : null,
        botKararMs: g ? 2500 + Math.round(this.r() * 1500) : 1000 + Math.round(this.r() * 1000), botAc: this.r() < 0.5 };
      // 16 Eki 2026 (Ida: rakip 2x işaretleyince ses bitmeden yeni ekran geliyor): turların ~%40'ında rakip joker kullanır —
      // çoğunlukla oyuncunun cevabından hemen önce (joker sesi çalarken soru kapanır), bazen sorunun başında
      const p = this.plan[tur];
      p.rakipJoker = this.r() < 0.4 ? ["cifte_puan", "elli", "sure"][Math.floor(this.r() * 3)] : null;
      p.rakipJokerMs = p.rakipJoker ? (this.r() < 0.7 ? Math.max(300, (p.rakipMs ?? p.benMs) - 250 - Math.round(this.r() * 600)) : 400) : null;
    }
    return this.plan[tur];
  }
  giris() {
    if (this.k.faz_bitis != null || this.k.faz !== "baslangic") return;
    this.k.faz_bitis = Date.now() + BASLANGIC_MS;
    this.kaydet("baslangic", { faz_bitis: this.k.faz_bitis });
  }
  kaydet(olay, ek = {}) { this.log.push({ t: Date.now(), olay, tur: this.k.tur, ...ek }); }
  // yavas_sunucu (16 Eki 2026, canlı 14:04:40–14:05:20 UTC yavaşlaması): maçın 50.–110. sn'si arasında her kasa_durum /
  // kasa_cevap / kasa_karar satır kilidinde sıraya girer ve 1–3,5 sn işlenir; sunucu_zamani yanıtın SONUNDA (clock_timestamp)
  yavasMi() { const g = Date.now() - this.t0; return this.senaryo === "yavas_sunucu" && g > 50000 && g < 110000; }
  kilitli(f) {
    const onceki = this.kilit ?? Promise.resolve();
    let birak;
    this.kilit = new Promise((c) => { birak = c; });
    return onceki.then(async () => { try { return await f(); } finally { birak(); } });
  }
  soruAc(kararSonrasi) {
    const k = this.k, now = Date.now();
    k.faz = "cevap"; k.cevaplar = {}; k.sonuc = null; k.karar = null;
    k.soru_bas = now + (kararSonrasi ? KARAR_AN_MS : 0);
    k.gosterim_bas = k.soru_bas + PAY_MS;
    k.faz_bitis = k.gosterim_bas + SORU_SN * 1000;
    const p = this.turPlani(k.tur);
    if (p.rakipMs != null) p.rakipAt = k.gosterim_bas + p.rakipMs;
    this.kaydet("cevap", { gosterim_bas: k.gosterim_bas, faz_bitis: k.faz_bitis });
  }
  cevapla(kim, cevap) {
    const k = this.k;
    if (k.faz !== "cevap" || k.cevaplar[kim]) return;
    k.cevaplar[kim] = { cevap: cevap === -1 ? null : cevap, at: cevap === -1 ? null : Date.now() };   // -1: süre doldu (1114)
    if (kim === BEN && this.turPlani(k.tur).rakipMs == null && !k.cevaplar[RAKIP]) {
      // bot: insan cevaplayınca hemen (1088)
      const p = this.turPlani(k.tur);
      k.cevaplar[RAKIP] = { cevap: p.rakipDogru ? 1 : 2, at: Date.now() + 1 };
    }
    this.kaydet(`cevap:${kim === BEN ? "ben" : "rakip"}`);
  }
  cozumle() {
    const k = this.k, now = Date.now();
    const bd = k.cevaplar[BEN]?.cevap === 1, rd = k.cevaplar[RAKIP]?.cevap === 1;
    const once = k.kasa, sahipOnce = k.sahip;
    let artis = 0;
    if (bd && rd) { artis = 6; k.sahip = (k.cevaplar[BEN].at <= k.cevaplar[RAKIP].at) ? BEN : RAKIP; }
    else if (bd || rd) { artis = 2; k.sahip = bd ? BEN : RAKIP; }
    k.kasa = once + artis;
    k.sonuc = { tur: k.tur, altin: false, dogru_cevap: 1, artis, kasa_once: once, kasa_sonra: k.kasa, sahip_once: sahipOnce, sahip_sonra: k.sahip,
      benim_cevabim: k.cevaplar[BEN]?.cevap ?? null, ben_dogru: bd, rakip_dogru: k.cevaplar[RAKIP] ? rd : false,
      rakip_cevabi: k.cevaplar[RAKIP]?.cevap ?? null };   // 1062: rakibin seçtiği şık (canlıdaki gibi avatar çizilir)
    k.faz = "sonuc"; k.faz_bitis = now + SONUC_MS;
    this.kaydet("sonuc", { faz_bitis: k.faz_bitis, artis });
  }
  kararUygula(ac, sureDoldu = false) {
    const k = this.k;
    const veren = k.sahip;
    const deger = k.kasa;
    if (ac) {
      k.puan[veren] += deger; k.acma[veren] += 1;
      k.son_karar = { veren, ac: true, deger, son: false };
      k.kasa = 0; k.sahip = null;
      if (k.puan[veren] >= HEDEF) {
        k.durum = "bitti"; k.kazanan = veren; k.sonuc_neden = "hedef"; k.son_karar.son = true;
        this.kaydet("bitti", { kazanan: veren === BEN ? "ben" : "rakip" });
        return;
      }
    } else {
      const yeni = Math.ceil(deger * CARPAN);
      k.son_karar = { veren, ac: false, deger, yeni, carpan: CARPAN, son: false, sure_doldu: sureDoldu };
      k.kasa = yeni;
    }
    this.kaydet(ac ? "karar:ac" : "karar:devam", { veren: veren === BEN ? "ben" : "rakip" });
    this.soruAc(true);
  }
  ilerlet() {
    const k = this.k;
    for (let i = 0; i < 6 && k.durum === "aktif"; i++) {
      const now = Date.now();
      if (k.faz === "baslangic") {
        if (k.faz_bitis == null || now < k.faz_bitis) return;
        k.tur = 1; k.son_karar = null; this.soruAc(false);
      } else if (k.faz === "cevap") {
        const p = this.turPlani(k.tur);
        if (p.rakipAt != null && now >= p.rakipAt && !k.cevaplar[RAKIP]) this.cevapla(RAKIP, p.rakipDogru ? 1 : 2);
        const bitti = now > k.faz_bitis + ((this.senaryo === "dalgali" || this.senaryo === "yavas_sunucu") ? 5000 : 1000);   // canlı: cevap_gec_varis_sn 5
        if (!((k.cevaplar[BEN] || bitti) && (k.cevaplar[RAKIP] || bitti))) return;
        this.cozumle();
      } else if (k.faz === "sonuc") {
        if (now < k.faz_bitis) return;
        if (k.tur >= 14) {   // güvenlik: maç uzarsa önde olan kazanır
          k.durum = "bitti"; k.kazanan = k.puan[BEN] >= k.puan[RAKIP] ? BEN : RAKIP; k.sonuc_neden = "tur"; this.kaydet("bitti"); return;
        }
        k.tur += 1; k.son_karar = null;
        if (k.sahip && k.kasa > 0) {
          k.faz = "karar"; k.karar = { veren: k.sahip, deger: k.kasa };
          k.gosterim_bas = now + PAY_MS; k.faz_bitis = now + KARAR_MS + PAY_MS;
          const p = this.turPlani(k.tur);
          if (k.sahip === RAKIP) { p.botKararAt = now + PAY_MS + p.botKararMs; p.botAcKarar = k.kasa >= 10 || p.botAc; }
          this.kaydet("karar", { veren: k.sahip === BEN ? "ben" : "rakip", faz_bitis: k.faz_bitis });
        } else this.soruAc(false);
      } else if (k.faz === "karar") {
        const p = this.turPlani(k.tur);
        if (k.karar.veren === RAKIP && p.botKararAt != null && now >= p.botKararAt) this.kararUygula(p.botAcKarar);
        else if (now >= k.faz_bitis + ((this.senaryo === "dalgali" || this.senaryo === "yavas_sunucu") ? 3000 : 1000)) this.kararUygula(false, true);   // canlı: secim_gec_varis_sn 3
        else return;
      } else return;
    }
  }
  durumJson() {
    this.ilerlet();
    const k = this.k, now = Date.now(), iso = (ms) => (ms == null ? null : new Date(ms).toISOString());
    const oyuncu = (id, ad) => ({ id, gorunen_ad: ad, gorunen_avatar: ARG.kozmetik === "ida" ? (id === RAKIP ? "/avatars/pro2/kizil-y03.svg" : "/avatars/pro2/balkabagi-adam-y43.svg")
      : id === RAKIP ? "/avatars/pro2/basortulu-y04.svg" : "/avatars/pro/tilki-k04.svg",
      gorunum: null, unvan: null, puan: k.puan[id], acma: k.acma[id] });
    const soru = k.faz === "cevap" || k.faz === "sonuc"
      ? { soru: SORULAR[(k.tur - 1) % SORULAR.length], secenekler: ["Birinci şık", "Doğru şık", "Üçüncü şık", "Dördüncü şık"], kategori: "genel" } : null;
    const d = { id: this.id, durum: k.durum, dereceli: true, faz: k.faz, faz_bitis: iso(k.faz_bitis), sunucu_zamani: iso(now), ben: BEN, tur: k.tur,
      max_tur: 36, hedef: HEDEF, altin: false, artis: 2, ikisi_artis: 6, kasa: k.kasa, sahip: k.sahip, tavan: 60, devam_carpan: CARPAN, acma_min: 0,
      oyuncular: [oyuncu(BEN, "Deniz"), oyuncu(RAKIP, "Ayşe Yıldırım")], karar: k.faz === "karar" ? k.karar : null, son_karar: k.son_karar,
      soru, cevap: k.faz === "cevap" ? { ben_cevapladim: Boolean(k.cevaplar[BEN]), benim_cevabim: k.cevaplar[BEN]?.cevap ?? null, rakip_cevapladi: Boolean(k.cevaplar[RAKIP]) } : null,
      sonuc: k.faz === "sonuc" || k.durum === "bitti" ? k.sonuc : null,
      rakip_joker: (k.faz === "cevap" || k.faz === "sonuc") && this.plan[k.tur]?.rakipJoker && k.gosterim_bas != null
        && (k.faz === "sonuc" || now >= k.gosterim_bas + this.plan[k.tur].rakipJokerMs) ? [this.plan[k.tur].rakipJoker] : [], devam_odul: null, savunma: null, rehber: false,
      sureler: { soru: SORU_SN, karar: KARAR_MS / 1000, sonuc: SONUC_MS / 1000, nabiz: 10, kopuk: 25, gosterim_payi_ms: PAY_MS,
        gosterim_bas: ["cevap", "karar"].includes(k.faz) ? iso(k.gosterim_bas) : null, benim_bitis: k.faz === "cevap" ? iso(k.faz_bitis) : null,
        faz_son: k.faz === "cevap" ? iso(k.faz_bitis) : null },
      kopuk: null, kazanan: k.kazanan, sonuc_neden: k.sonuc_neden, terk: k.durum === "bitti" ? { ben: false, rakip: false } : null, baglanmayan: null,
      gecmis: k.durum === "bitti" ? [] : null, rovans: { isteyen: null, id: null, gecerli: false }, devam_carpan_yazi: null };
    return d;
  }
}

// ---------------- ses dosyası vekili (disk önbelleği + yavaş 4G ortak hat) ----------------
let hatBos = 0;
const HAT_BPS = 1_600_000 / 8, RTT = 150;
async function sesDosyasi(url) {
  const ad = crypto.createHash("sha1").update(url).digest("hex").slice(0, 16) + path.extname(new URL(url).pathname);
  const yol = path.join(ONBELLEK, ad);
  if (!fs.existsSync(yol)) {
    const y = await fetch(url);
    if (!y.ok) throw new Error(`ses indirilemedi ${y.status}`);
    fs.writeFileSync(yol, Buffer.from(await y.arrayBuffer()));
  }
  const veri = fs.readFileSync(yol);
  const bas = Math.max(Date.now() + RTT, hatBos);
  hatBos = bas + Math.round((veri.length / HAT_BPS) * 1000);
  return { veri, beklemeMs: hatBos - Date.now() };
}
const uyu = (ms) => new Promise((c) => setTimeout(c, Math.max(0, ms)));

// ---------------- sayfaya enjekte edilen ölçüm ----------------
function enjekte() {
  // ölçüm GERÇEK saatle (dalgali senaryosu sayfanın Date.now'unu atlatır; ölçüm onu kullanmaz)
  const asilNow = Date.now.bind(Date);
  const O = (window.__olc = { faz: [], ses: [], ton: [], ctx: [], kesik: [], ui: [], bitenAnim: 0, kare: [], uzun: [], sayi: [] });
  try { sessionStorage.setItem("bd_ses_tani", "1"); } catch { /* */ }
  // 15 Eki 2026 (perf paketi): her karenin zamanı (rAF, performance.now) + uzun görevler + giriş 3-2-1 rakamının değiştiği an
  // (MutationObserver — 100 ms örneklemeden kesin). Çözümleme faz pencerelerine göre kare hızı / en uzun kare verir.
  const kareYaz = (t) => { O.kare.push(Math.round(t * 10) / 10); requestAnimationFrame(kareYaz); };
  requestAnimationFrame(kareYaz);
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) O.uzun.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: "longtask", buffered: true }); } catch { /* yok */ }
  let sonSayi = null;
  const sayiBak = () => { const v = document.querySelector(".ks-giris-sayi, .m1-sayim-sayi")?.textContent?.trim() ?? null; if (v !== sonSayi) { sonSayi = v; O.sayi.push([Math.round(performance.now()), v]); } };
  const sayiIzle = () => new MutationObserver(sayiBak).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  if (document.documentElement) sayiIzle(); else addEventListener("DOMContentLoaded", sayiIzle);
  const urlTampon = new WeakMap(), tamponUrl = new WeakMap();
  const of = window.fetch;
  window.fetch = async function (...a) {
    const u = String(a[0]?.url ?? a[0]);
    const r = await of.apply(this, a);
    try {
      if (/\.(mp3|wav|ogg|m4a)(\?|$)/.test(u)) {
        const ab = r.arrayBuffer.bind(r);
        r.arrayBuffer = async () => { const b = await ab(); urlTampon.set(b, u); return b; };
      }
      if (u.includes("/rpc/kasa_durum")) {
        const t = asilNow();
        r.clone().json().then((j) => { if (j) { O.faz.push({ t, faz: j.faz, tur: j.tur, durum: j.durum, faz_bitis: j.faz_bitis, gb: j.sureler?.gosterim_bas ?? null }); try { console.timeStamp(`faz:${j.tur}-${j.faz}`); } catch { /* */ } } }).catch(() => {});
      }
    } catch { /* ölçüm */ }
    return r;
  };
  const BAC = window.BaseAudioContext || window.AudioContext;
  const od = BAC.prototype.decodeAudioData;
  BAC.prototype.decodeAudioData = function (buf, ok, err) {
    const u = urlTampon.get(buf);
    const p = od.call(this, buf, (b) => { if (u) tamponUrl.set(b, u); ok?.(b); }, err);
    p?.then?.((b) => { if (u) tamponUrl.set(b, u); }, () => {});
    return p;
  };
  const AC0 = window.AudioContext;
  const sonDurum = new WeakMap();
  window.AudioContext = class extends AC0 {
    constructor(...a) {
      super(...a);
      O.ctx.push({ t: asilNow(), s: this.state });
      this.addEventListener("statechange", () => O.ctx.push({ t: asilNow(), s: this.state }));
    }
  };
  // 16 Eki 2026 (ses kesilmesi): kaynağın ÖMRÜ — gerçek bitiş (ended), stop çağrısı (an + ne kadar önce kurulduğu = fade payı +
  // çağıran yığın), böylece "sonuna kadar çaldı mı / kim kesti / yeni faz geldiğinde kalan ms" sürümden bağımsız ölçülür.
  const os = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (when = 0, ...r) {
    try {
      const c = this.context, u = tamponUrl.get(this.buffer);
      if (u || (this.buffer?.duration ?? 0) > 0.05) {
        const k = { t: asilNow(), dosya: u ? decodeURIComponent(u.split("/").pop().split("?")[0]) : "(üretilmiş)",
          sure: Math.round(((this.buffer?.duration || 0) * 1000) / (this.playbackRate?.value || 1)), ctx: c.state,
          gec: Math.round(Math.max(0, (when || 0) - c.currentTime) * 1000) };
        O.ses.push(k);
        this.__olcKayit = k;
        this.addEventListener("ended", () => { k.bitti = asilNow(); });
      }
    } catch { /* */ }
    return os.call(this, when, ...r);
  };
  const ost = AudioBufferSourceNode.prototype.stop;
  AudioBufferSourceNode.prototype.stop = function (when = 0, ...r) {
    try {
      const k = this.__olcKayit;
      if (k) {
        // her stop çağrısı tutulur: başlangıçtaki = ses.js'in pencereye kısaltması (plan), sonradan gelen = kesme
        const once = Math.round(Math.max(0, (when || 0) - this.context.currentTime) * 1000);
        const yigin = String(new Error().stack || "").split("\n").slice(2, 6).map((s) => s.trim().replace(/^at /, "").replace(/\(?https?:\/\/[^/]+\//, "(").slice(0, 70));
        (k.stoplar ||= []).push({ t: asilNow(), once, yigin });
      }
    } catch { /* */ }
    return ost.call(this, when, ...r);
  };
  // frekans setValueAtTime ile ileri tarihli kurulur (.value henüz 440): son kurulan değeri tut
  const osv = AudioParam.prototype.setValueAtTime;
  AudioParam.prototype.setValueAtTime = function (v, t) { try { this.__son = v; } catch { /* */ } return osv.call(this, v, t); };
  const oo = OscillatorNode.prototype.start;
  OscillatorNode.prototype.start = function (when = 0, ...r) {
    try { O.ton.push({ t: asilNow() + Math.round(Math.max(0, (when || 0) - this.context.currentTime) * 1000), f: Math.round(this.frequency.__son ?? this.frequency.value), ctx: this.context.state }); } catch { /* */ }
    return oo.call(this, when, ...r);
  };
  // animasyon örnekleme: bitmeden sökülen sonlu animasyon = kesildi
  const izlenen = new Map();
  const kok = (el) => { const s = []; let e = el; for (let i = 0; i < 4 && e && e.classList; i++, e = e.parentElement) s.push([...e.classList].slice(0, 2).join(".")); return s.filter(Boolean).join(" < "); };
  setInterval(() => {
    const now = asilNow(), canli = new Set();
    let liste = [];
    try { liste = document.getAnimations(); } catch { return; }
    for (const a of liste) {
      if (typeof CSSAnimation === "undefined" || !(a instanceof CSSAnimation)) continue;
      const tm = a.effect?.getComputedTiming?.();
      if (!tm || !Number.isFinite(tm.endTime) || tm.endTime <= 0 || tm.endTime > 20000) continue;
      const hedef = a.effect.target;
      if (!hedef?.closest?.(".ks-mac, .ks-giris-an, .ks-efekt, .m2-mac")) continue;
      canli.add(a);
      let r = izlenen.get(a);
      if (!r) { r = { ad: a.animationName, el: kok(hedef), bas: now, son: 0, sure: Math.round(tm.endTime), ornek: now }; izlenen.set(a, r); }
      r.son = a.playState === "finished" ? r.sure : Math.round(Number(a.currentTime) || 0);
      r.ornek = now;
      if (a.playState === "paused") r.duraklatildi = true;
    }
    for (const [a, r] of izlenen) {
      if (canli.has(a)) continue;
      izlenen.delete(a);
      // söküldüğü an en geç şimdi; en iyi tahminle bile ≥ 150 ms eksik kaldıysa kesildi
      const kalan = r.sure - (r.son + (now - r.ornek));
      if (kalan >= 150 && !r.duraklatildi) O.kesik.push({ t: now, ad: r.ad, el: r.el, sure: r.sure, oynadi: r.son, kalan: Math.round(kalan) });
      else O.bitenAnim++;
    }
  }, 100);
  // ekran: soru metni, sayaç, giriş sahnesi, efekt katmanı
  let onceki = {};
  setInterval(() => {
    const q = (s) => document.querySelector(s);
    const simdi = {
      soru: q(".qt-soru-metin")?.textContent?.slice(0, 40) ?? null,
      sayac: q(".ks-sayac")?.textContent?.trim() ?? null,
      giris: q(".ks-giris-an") ? (q(".ks-giris-an").className.includes("bekle") ? "bekle" : (q(".ks-giris-sayi")?.textContent ?? "sahne")) : null,
      efekt: q(".ks-efekt") ? [...q(".ks-efekt").querySelectorAll("[class*='ks-']")].slice(0, 1).map((e) => e.className.split(" ")[0]).join() || "efekt" : null,
      sonu: Boolean(q(".msk-baslik, .mac-sonu, .bd-mac-sonu")),
    };
    for (const k of Object.keys(simdi)) if (simdi[k] !== onceki[k]) { O.ui.push({ t: asilNow(), k, v: simdi[k] }); try { console.timeStamp(`ui:${k}=${simdi[k]}`); } catch { /* */ } }
    onceki = simdi;
  }, 100);
}

// ---------------- çözümleme ----------------
const ANA_ROLLER = new Set(["soru_geldi", "dogru", "yanlis", "tur_gecis", "rozet", "coin", "xp_dolma", "can_kaybi", "rakip_cevapladi", "sure_doldu",
  "kazandin", "kaybettin", "beraberlik", "joker", "skill", "level", "rutbe", "turnuva", "vs_ani", "rakip_bulundu"]);
const MAC_SONU = new Set(["kazandin", "kaybettin", "beraberlik", "level", "rutbe", "turnuva"]);
function cozumle(veri) {
  const { olc, sesKayit, akis, timeOrigin, sunucuLog, bitisT } = veri;
  // istemcinin gördüğü faz pencereleri (ilk görüş)
  const pencereler = [];
  for (const f of olc.faz) {
    const anahtar = f.durum === "bitti" ? "bitti" : `${f.tur}-${f.faz}`;
    if (!pencereler.length || pencereler[pencereler.length - 1].anahtar !== anahtar) {
      if (!pencereler.some((p) => p.anahtar === anahtar)) pencereler.push({ anahtar, t: f.t });
    }
  }
  const pencere = (t) => { let p = null; for (const w of pencereler) if (w.t <= t) p = w; return p?.anahtar ?? "önce"; };
  // 16 Eki 2026: faz geçiş gecikmesi — sunucunun fazı değiştirdiği an → istemcinin o fazı ilk gördüğü kasa_durum yanıtı;
  // erken "süre doldu" bildirimi ('Süre dolmadı' reddi) sayısı
  const fazGec = [];
  for (const x of sunucuLog) if (["cevap", "sonuc", "karar", "bitti"].includes(x.olay)) {
    const an = x.olay === "bitti" ? "bitti" : `${x.tur}-${x.olay}`;
    const p = pencereler.find((w) => w.anahtar === an);
    if (p && p.t >= x.t - 50) fazGec.push({ olay: x.olay, tur: x.tur, ms: p.t - x.t });
  }
  const erkenBildirim = sunucuLog.filter((x) => /^erken:/.test(x.olay)).map((x) => ({ olay: x.olay, tur: x.tur }));
  // istek kayıtları (epoch)
  const istekler = sesKayit.map((k) => ({ ...k, te: Math.round(timeOrigin + k.t) }));
  const dosyaRol = new Map();
  for (const k of istekler) if (k.dosya && typeof k.dosya === "string") dosyaRol.set(decodeURIComponent(k.dosya.split("/").pop()), k.rol);
  // ctx askıdayken başlayan kaynak, çalışmaya geçtiği an çalar
  const calismaAni = (t) => { const c = olc.ctx.find((x) => x.t >= t && x.s === "running"); return c ? c.t : t; };
  const calanlar = olc.ses.map((s) => ({ rol: dosyaRol.get(s.dosya) ?? s.dosya, t: (s.ctx === "suspended" ? calismaAni(s.t) : s.t) + s.gec, sure: s.sure, askida: s.ctx === "suspended" }));
  // tonlar: 400 ms içindekiler tek ses
  const tonlar = [];
  for (const t of [...olc.ton].sort((a, b) => a.t - b.t)) {
    const son = tonlar[tonlar.length - 1];
    if (son && t.t - son.bas < 400) continue;
    tonlar.push({ bas: t.t, f: t.f });
  }
  const tamponlu = calanlar.slice();
  for (const t of tonlar) {
    // kalp atışı (≈ 120 Hz, dosyasız) ayrı; öteki ton: 350 ms içinde istenip dosyası çalmamış bir rolün yedeği
    if (t.f < 160) { calanlar.push({ rol: "kalp", t: t.bas, sure: 320, ton: true }); continue; }
    const i = [...istekler].reverse().find((k) => Math.abs(k.te - t.bas) < 350 && !tamponlu.some((c) => c.rol === k.rol && Math.abs(c.t - k.te) < 400));
    calanlar.push({ rol: i ? `${i.rol}(ton)` : "ton", t: t.bas, sure: 200, ton: true, istekTe: i?.te ?? null });
  }
  calanlar.sort((a, b) => a.t - b.t);
  const kok = (r) => r.replace(/\(ton\)$/, "");
  const tasma = [], gec = [], eszaman = [];
  const kullanilan = new Set();
  for (const c of calanlar) {
    // isteği: aynı rolün çalmadan önceki son kullanılmamış isteği
    // isteği: tonda eşleşen istek; dosyada aynı rolün çalmadan önceki (en çok 6 sn) son kullanılmamış isteği
    const adaylar = c.ton ? istekler.filter((k) => k.te === c.istekTe && k.rol === kok(c.rol))
      : istekler.filter((k, i) => k.rol === kok(c.rol) && k.te <= c.t + 5 && c.t - k.te < 6000 && !kullanilan.has(i));
    const ist = adaylar[adaylar.length - 1];
    if (ist) kullanilan.add(istekler.indexOf(ist));
    c.istek = ist?.te ?? null;
    c.faz = pencere(c.t);
    c.istekFaz = ist ? pencere(ist.te) : null;
    if (c.t > bitisT) c.macSonu = true;
    if (ist && c.istekFaz !== c.faz && !c.macSonu) tasma.push({ rol: c.rol, istekFaz: c.istekFaz, calmaFaz: c.faz, gecMs: c.t - ist.te });
    if (ist && c.t - ist.te > 250 && !MAC_SONU.has(kok(c.rol)) && !c.macSonu) gec.push({ rol: c.rol, faz: c.faz, gecMs: c.t - ist.te });
  }
  for (let i = 0; i < calanlar.length; i++) for (let j = i + 1; j < calanlar.length && calanlar[j].t - calanlar[i].t < 150; j++) {
    const a = calanlar[i], b = calanlar[j];
    if ([a, b].some((x) => /dokunus/.test(x.rol))) continue;
    if (!ANA_ROLLER.has(kok(a.rol)) && !ANA_ROLLER.has(kok(b.rol)) && kok(a.rol) === kok(b.rol)) continue;
    eszaman.push({ a: a.rol, b: b.rol, faz: b.faz, farkMs: b.t - a.t });
  }
  // 3-2-1 (giriş): ilk "cevap" penceresinden önce çalan tikler
  const ilkCevap = pencereler.find((p) => p.anahtar.endsWith("-cevap"))?.t ?? Infinity;
  const girisTik = calanlar.filter((c) => /^tik|sayim/.test(kok(c.rol)) && c.t < ilkCevap + 1500 && c.faz.startsWith("1-") || /^tik/.test(kok(c.rol)) && c.faz === "önce");
  const girisTikT = calanlar.filter((c) => /^(tik|sayim_son)/.test(kok(c.rol)) && c.t < ilkCevap + 2500).map((c) => c.t);
  const tikAralik = girisTikT.slice(1).map((t, i) => t - girisTikT[i]);
  // sayaç ilk değeri her soru penceresinde
  const sayacIlk = [];
  for (const w of pencereler.filter((p) => p.anahtar.endsWith("-cevap"))) {
    const sonraki = pencereler[pencereler.indexOf(w) + 1]?.t ?? Infinity;
    const v = olc.ui.find((u) => u.k === "sayac" && u.t >= w.t && u.t < sonraki && /^\d+$/.test(u.v ?? ""));
    sayacIlk.push({ faz: w.anahtar, ilk: v ? Number(v.v) : null });
  }
  // oyuncunun dokunuşuyla (≤ 900 ms önce dokunuş sesi istendi) kapanan panel ayrı sayılır — akış çakışması değil
  const dokunuslar = istekler.filter((k) => k.rol === "dokunus").map((k) => k.te);
  const tumKesik = olc.kesik.map((k) => ({ ...k, faz: pencere(k.t), etkilesim: dokunuslar.some((t) => k.t - (k.oynadi + 100) - t < 900 && k.t >= t) }));
  // sayacın saniye vuruşu (qt-h-tik, her saniye yeniden başlar) faz bitince sayaçla kalkar — kesinti sayılmaz, ayrı sayılır
  const kesik = tumKesik.filter((k) => !k.etkilesim && k.ad !== "qt-h-tik");
  const sayacTiki = tumKesik.filter((k) => !k.etkilesim && k.ad === "qt-h-tik").length;
  const kesikEtkilesim = tumKesik.filter((k) => k.etkilesim);
  // soru metninin ekrana geldiği an ile soru_geldi sesi
  const soruSes = [];
  for (const u of olc.ui.filter((x) => x.k === "soru" && x.v)) {
    const ses = calanlar.find((c) => kok(c.rol) === "soru_geldi" && Math.abs(c.t - u.t) < 4000);
    soruSes.push({ faz: pencere(u.t), farkMs: ses ? ses.t - u.t : null });
  }
  // 16 Eki 2026: sayaç ölçüsü — 0'da (ya da "•••") kalma, ileri/geri sıçrama, rakam süreleri (arka plan penceresi hariç)
  const arka = veri.arkaPlanlar ?? [];
  const arkadaMi = (t) => arka.some(([a, b]) => t >= a - 300 && t <= b + 1500);
  const say = olc.ui.filter((u) => u.k === "sayac");
  const sayi = (v) => (/^\d+/.test(v ?? "") ? Number(/^\d+/.exec(v)[0]) : null);
  const sifirMi = (v) => v != null && (/^0(\D|$)/.test(v) || v.startsWith("•••"));
  const sifir = [], sicrama = [], rakam = [];
  for (let i = 0; i < say.length; i++) {
    const u = say[i];
    if (sifirMi(u.v) && !(i > 0 && sifirMi(say[i - 1].v))) {
      const j = say.findIndex((x, n) => n > i && !sifirMi(x.v));
      const bit = j >= 0 ? say[j].t : null;
      if (bit != null && !arkadaMi(u.t) && !arkadaMi(bit)) sifir.push({ faz: pencere(u.t), ms: bit - u.t });
    }
    const o = say[i - 1];
    if (o && sayi(o.v) != null && sayi(u.v) != null && pencere(o.t) === pencere(u.t) && !arkadaMi(u.t) && u.t - o.t < 1500) {
      const fark = sayi(o.v) - sayi(u.v);
      if (fark < 0 || fark >= 2) sicrama.push({ faz: pencere(u.t), once: o.v, sonra: u.v, ms: u.t - o.t });
      else if (fark === 1 && say[i - 2] && sayi(say[i - 2].v) === sayi(o.v) + 1 && !arkadaMi(o.t)) rakam.push(u.t - o.t);
    }
  }
  const sayacOlcu = { sifir_bekleme: sifir, sifir_uzun: sifir.filter((x) => x.ms > 1000), sicrama,
    rakam_ms: rakam.length ? { en_kisa: Math.min(...rakam), en_uzun: Math.max(...rakam), adet: rakam.length } : null };
  // 16 Eki 2026 — SES ÖMRÜ (sürümden bağımsız; docs/TEST-KAPSAMI.md › 4): her çalan dosya için planlanan süre, gerçek çalma,
  // kesildi mi + kesen, ses çalarken yeni ekran/faz geldi mi + kalan ms, çakıştığı ses.
  const sesOmru = sesOmruCoz({ olc, pencereler, dosyaRol, calismaAni, sesOmur: veri.sesOmur, timeOrigin, bitisT });
  return {
    sesOmru,
    sayac: sayacOlcu,
    fazGec, erkenBildirim,
    perf: perfOzet(veri),
    soruSes, kesikEtkilesim, sayacTiki,
    pencere: pencereler.length, calan: calanlar.length, istek: istekler.length,
    tasma, gec, eszaman, kesik, bitenAnim: olc.bitenAnim, tikAralik, sayacIlk,
    askidaCalan: calanlar.filter((c) => c.askida).length, girisTik: girisTik.length,
    calanlar: calanlar.map((c) => ({ t: c.t - sunucuLog[0].t, rol: c.rol, faz: c.faz, istekFaz: c.istekFaz, gecMs: c.istek ? c.t - c.istek : null })),
    akis: akis ?? null,
  };
}

// ---------------- ses ömrü (16 Eki 2026) ----------------
// Anlam taşıyan sesler (Ida kuralı: yarıda ANİ kesilmez) — oyun/lib/ses.js › ANLAMLI ile aynı liste.
const ANLAMLI_ROLLER = new Set(["joker", "skill_elli", "skill_ek_sure", "skill_soru_degistir", "skill_zaman_baskisi", "skill_sigorta", "skill_2x",
  "skill_ikinci_sans", "sis", "rakip_bulundu", "vs_ani", "dogru", "yanlis", "sure_doldu", "kategori_secildi", "tur_gecis", "kazandin", "kaybettin",
  "beraberlik", "xp_dolma", "level", "rutbe", "rozet", "coin", "turnuva", "can_kaybi", "rakip_cevapladi"]);
// ses-secim aday dosya adı (ör. "skill-n1.wav") → an; an → rol (ses.js › AN tersi; joker = "skill" anı)
const AN_ROL = { skill: "joker", galibiyet: "kazandin", maglubiyet: "kaybettin", lig_atlama: "rutbe", geri_sayim_tik: "tik", son_3_saniye: "sayim_son" };
const dosyadanRol = (dosya) => { const an = String(dosya || "").replace(/\.(wav|mp3)$/, "").replace(/-[0-9a-f]{10}$/, "").replace(/-[a-z]?\d+$/, ""); return AN_ROL[an] ?? an; };
function sesOmruCoz({ olc, pencereler, dosyaRol, calismaAni, sesOmur, timeOrigin, bitisT }) {
  // GÖRÜNÜR ekran değişimleri: yeni soru metni, sonuç / karar fazı, giriş sahnesinin kalkışı, maç sonu ekranı. Giriş sahnesi
  // sürerken ilk sorunun açılması ve "bitti" (final sahnesi zaten oynuyor) ekranı değiştirmez — sayılmaz.
  const giris = (olc.ui ?? []).filter((u) => u.k === "giris");
  const giristeMi = (t) => { let v = null; for (const u of giris) if (u.t <= t) v = u.v; return v != null; };
  // "yeni soru": soru metni DOM'a AÇ/DEVAM anının altında erken girer; görünür an = soru sesinin başladığı an (sayfa soru
  // görünür olunca çalar). Soru sesi çalmadıysa metnin değiştiği an.
  const soruSesleri = (olc.ses ?? []).filter((k) => dosyadanRol(k.dosya) === "soru_geldi").map((k) => k.t);
  const ekranOlaylari = [
    ...pencereler.filter((p) => /-(sonuc|karar)$/.test(p.anahtar) && !giristeMi(p.t)).map((p) => ({ t: p.t, ad: `faz ${p.anahtar}` })),
    ...soruSesleri.map((t) => ({ t, ad: "yeni soru" })),
    ...(olc.ui ?? []).filter((u) => (u.k === "soru" && u.v && !soruSesleri.some((t) => t >= u.t - 300 && t - u.t < 3000)) || (u.k === "sonu" && u.v) || (u.k === "giris" && u.v == null))
      .map((u) => ({ t: u.t, ad: u.k === "soru" ? "yeni soru" : u.k === "sonu" ? "maç sonu ekranı" : "giriş sahnesi kalktı" })),
  ].sort((a, b) => a.t - b.t);
  const liste = (olc.ses ?? []).map((k0) => {
    const bas = (k0.ctx === "suspended" ? calismaAni(k0.t) : k0.t) + (k0.gec ?? 0);
    const rol = dosyaRol.get(k0.dosya) ?? dosyadanRol(k0.dosya);
    let plan = k0.sure, planli = false;
    // ses.js çalma süresini başlarken kısalttıysa (pencereye sığdırma: stop başlangıçta kurulur) bu bir kesinti değil, plandır
    const stoplar = k0.stoplar ?? (k0.stop ? [k0.stop] : []);
    const planStop = stoplar.find((x) => x.t - k0.t < 30 && x.once <= k0.sure + 25);
    if (planStop) { plan = planStop.once; planli = true; }
    const k = { ...k0, stop: stoplar.find((x) => x !== planStop) ?? null };
    const planBitis = bas + plan;
    const stopBitis = k.stop ? k.stop.t + k.stop.once : null;
    const gercekBitis = Math.min(planBitis, stopBitis ?? Infinity, k.bitti ?? Infinity);
    const kesildi = stopBitis != null && stopBitis < planBitis - 40;
    const fade = kesildi ? Math.max(0, k.stop.once - 20) : null;
    const yigin = k.stop?.yigin?.join(" ← ") ?? "";
    const kesen = !kesildi ? null
      : /kisVeDurdur/.test(yigin) ? "kisVeDurdur" : /fazKes|sesFazDegisti/.test(yigin) ? "faz değişimi" : /MacSonuKapat/.test(yigin) ? "maç sonu ekranı kapandı"
      : k.stop.once <= 60 ? "ES_ZAMANLI (aynı rolün yeni kopyası, 30 ms)" : k.stop.once <= 160 ? "kisVeDurdur / fade (120 ms)" : `stop (${k.stop.once} ms sonra)`;
    const yeni = ekranOlaylari.find((e) => e.t > bas + 30 && e.t < gercekBitis - 20);
    const cakisan = (olc.ses ?? []).filter((o) => o !== k && o.t > bas + 20 && o.t < gercekBitis - 50)
      .map((o) => dosyaRol.get(o.dosya) ?? dosyadanRol(o.dosya)).filter((r) => !/^(dokunus|tik|sayim_tik)$/.test(r));
    return { rol, anlamli: ANLAMLI_ROLLER.has(rol), t: Math.round(bas - (pencereler[0]?.t ?? bas)), dosyaMs: k.sure, planMs: Math.round(plan), planli,
      calmaMs: Math.round(gercekBitis - bas), kesildi, ani: kesildi && fade < 80, fadeMs: fade, kesen, yigin: kesildi ? yigin : null,
      yeniEkran: yeni ? { ad: yeni.ad, kalanMs: Math.round(planBitis - yeni.t) } : null, cakisan: [...new Set(cakisan)], macSonu: bas > bitisT };
  });
  const anl = liste.filter((x) => x.anlamli);
  return {
    liste,
    anlamli: anl.length,
    ani_kesilen: anl.filter((x) => x.ani).length,
    yumusak_biten: anl.filter((x) => x.kesildi && !x.ani).length,
    calarken_yeni_ekran: anl.filter((x) => x.yeniEkran && x.yeniEkran.kalanMs > 150 && !(x.kesildi && !x.ani)).length,
    kisaltilan: anl.filter((x) => x.planli).length,
    // ses.js'in kendi kaydı (yeni sürüm): kesen + faz adı doğrudan oradan
    uygulama: Array.isArray(sesOmur) ? sesOmur.filter((x) => x.kesildi || x.yeniFaz).map((x) => ({ rol: x.rol, kesen: x.kesen, yeniFaz: x.yeniFaz, planMs: x.planMs, calmaMs: x.calmaMs })) : null,
  };
}

// ---------------- kare hızı (15 Eki 2026 perf paketi) ----------------
// Pencere: giriş sahnesi (ekranda sahne → kalkış) · her sonuç fazı · AÇ anı (karar:ac → sonraki sorunun gösterimi) ·
// DEVAM anı · soru fazları. Her pencere: ort kare/sn, en kötü 500 ms dilimin kare/sn'si, en uzun kare, ≥ 100 ms kare, uzun görev.
function perfOzet({ olc, timeOrigin, sunucuLog }) {
  if (!olc?.kare?.length) return null;
  const kare = olc.kare.map((t) => timeOrigin + t);
  const uzun = (olc.uzun ?? []).map(([s, d]) => [timeOrigin + s, d]);
  const olcPencere = (a, b) => {
    if (!(b > a)) return null;
    const k = kare.filter((t) => t >= a && t <= b);
    if (k.length < 2) return { sure: Math.round(b - a), kare: k.length, ort: 0, en_kotu_dilim: 0, en_uzun_kare: Math.round(b - a), kare_100: 1, uzun_gorev: 0 };
    const dt = k.slice(1).map((t, i) => t - k[i]);
    dt.push(k[0] - a, b - k.at(-1));
    let enKotu = Infinity;
    for (let s = a; s + 500 <= b; s += 250) enKotu = Math.min(enKotu, k.filter((t) => t >= s && t < s + 500).length * 2);
    return { sure: Math.round(b - a), kare: k.length, ort: Math.round((k.length / (b - a)) * 1000), en_kotu_dilim: Number.isFinite(enKotu) ? enKotu : null,
      en_uzun_kare: Math.round(Math.max(...dt)), kare_100: dt.filter((x) => x >= 100).length,
      uzun_gorev: uzun.filter(([s]) => s >= a && s < b).length, en_uzun_gorev: Math.max(0, ...uzun.filter(([s]) => s >= a && s < b).map((x) => x[1])) };
  };
  const ui = olc.ui ?? [];
  const girisBas = ui.find((u) => u.k === "giris" && u.v && u.v !== "bekle")?.t ?? null;
  const girisSon = girisBas != null ? ui.find((u) => u.k === "giris" && u.v == null && u.t > girisBas)?.t ?? null : null;
  const log = sunucuLog ?? [];
  const sonraki = (i) => log.slice(i + 1).find((x) => ["cevap", "sonuc", "karar", "karar:ac", "karar:devam", "bitti"].includes(x.olay))?.t ?? null;
  const sonuc = [], ac = [], devam = [], soru = [];
  log.forEach((x, i) => {
    if (x.olay === "sonuc") sonuc.push({ tur: x.tur, artis: x.artis, ...olcPencere(x.t, sonraki(i)) });
    if (x.olay === "karar:ac" || x.olay === "karar:devam") {
      const c = log.slice(i + 1).find((y) => y.olay === "cevap");
      (x.olay === "karar:ac" ? ac : devam).push({ tur: x.tur, ...olcPencere(x.t, c?.gosterim_bas ?? sonraki(i)) });
    }
    if (x.olay === "cevap") soru.push({ tur: x.tur, ...olcPencere(x.gosterim_bas, log.slice(i + 1).find((y) => y.olay === "sonuc")?.t ?? null) });
  });
  // giriş 3-2-1: rakamların ekranda kalma süresi (MutationObserver)
  const sayi = (olc.sayi ?? []).map(([t, v]) => [timeOrigin + t, v]);
  const rakam = sayi.map(([t, v], i) => (/^\d$/.test(v ?? "") ? { v, ms: Math.round((sayi[i + 1]?.[0] ?? t) - t) } : null)).filter(Boolean);
  const topla = (l) => {
    const g = l.filter((x) => x && x.kare != null);
    if (!g.length) return null;
    return { adet: g.length, ort: Math.round(g.reduce((a, x) => a + x.ort, 0) / g.length), en_kotu_dilim: Math.min(...g.map((x) => x.en_kotu_dilim ?? 999)),
      en_uzun_kare: Math.max(...g.map((x) => x.en_uzun_kare)), kare_100: g.reduce((a, x) => a + x.kare_100, 0), uzun_gorev: g.reduce((a, x) => a + x.uzun_gorev, 0) };
  };
  return { giris: girisBas != null ? olcPencere(girisBas - 300, girisSon ?? girisBas + 5000) : null, rakam,
    sonuc: topla(sonuc), ac: topla(ac), devam: topla(devam), soru: topla(soru), sonuc_liste: sonuc, ac_liste: ac,
    // 15 Eki (Codex taraması): maç sonu — sunucu bitişinden ölçümün sonuna (final sahnesi + maç sonu ekranı + Paylaş kartı)
    mac_sonu: (() => { const b = log.find((x) => x.olay === "bitti")?.t; return b ? { ...olcPencere(b, kare.at(-1)), uzun_liste: uzun.filter(([t]) => t >= b).map(([t, d]) => [Math.round(t - b), d]) } : null; })(),
    mac: olcPencere(kare[0], kare.at(-1)) };
}

// ---------------- yeniden çözümleme (--yeniden=<etiket>: kayıtlı ham veriden, tarayıcısız) ----------------
if (ARG.yeniden) {
  const f = path.join(CIKTI, `olcum-${ARG.yeniden}.json`);
  const liste = JSON.parse(fs.readFileSync(f, "utf8"));
  for (const x of liste) {
    const { ham, sunucu } = x;
    Object.assign(x, cozumle({ ...ham, sunucuLog: sunucu, bitisT: sunucu.find((y) => y.olay === "bitti")?.t ?? Infinity }), { ham });
  }
  fs.writeFileSync(f, JSON.stringify(liste, null, 1));
  const top = (g) => liste.reduce((n, x) => n + g(x), 0);
  console.log(`${ARG.yeniden}: maç ${liste.length} · faz taşması ${top((x) => x.tasma.length)} · geç çalma ${top((x) => x.gec.length)} · eşzamanlı ${top((x) => x.eszaman.length)} · kesilen animasyon ${top((x) => x.kesik.length)} (+ dokunuşla kapanan ${top((x) => x.kesikEtkilesim.length)})`);
  process.exit(0);
}

// ---------------- koşu ----------------
const tarayici = await chromium.launch({ channel: "chrome", headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const kok = new URL(ADRES).origin;
const sonuclar = [];
try {
  for (const senaryo of SENARYOLAR) for (let m = 1; m <= MAC_SAYISI; m++) {
    const tohum = senaryo.length * 1000 + m * 7919;
    const sunucu = new Sunucu(tohum, senaryo);
    const ID = `0e0e1100-0000-4000-8000-${String(tohum).padStart(12, "0")}`;
    sunucu.id = ID;
    const ls = [{ name: `sb-${REF}-auth-token`, value: JSON.stringify(OTURUM) }, { name: "bildim_dil", value: DIL }, { name: "bildim_tanitim", value: "1" }];
    if (SECIMLER) ls.push({ name: "bildim_ses_secim", value: JSON.stringify(SECIMLER) });
    const b = await tarayici.newContext({ storageState: { cookies: [], origins: [{ origin: kok, localStorage: ls }] },
      ...(ARG.azalt ? { reducedMotion: "reduce" } : {}),   // --azalt: prefers-reduced-motion: reduce (TEST-KAPSAMI › 0)
      viewport: { width: GENISLIK, height: YUKSEKLIK }, locale: DIL === "en" ? "en-US" : "tr-TR", hasTouch: true, serviceWorkers: "block", isMobile: true, deviceScaleFactor: 2,
      userAgent: "Mozilla/5.0 (Linux; Android 11; SM-A125F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
      recordVideo: ARG.video ? { dir: path.join(CIKTI, "video"), size: { width: 390, height: 844 } } : undefined });
    await b.addInitScript(enjekte);
    if (senaryo === "dalgali") {
      // telefonun saati atlar (NTP düzeltmesi): 70. sn'de +1,5 sn, 140. sn'de −1 sn (Date.now; tekdüze saat etkilenmez)
      await b.addInitScript(() => {
        const asil = Date.now.bind(Date), bas = asil();
        Date.now = () => { const t = asil(); const g = t - bas; return t + (g > 140000 ? 500 : g > 70000 ? 1500 : 0); };
        // görünürlük taklidi: window.__gizle = true iken sayfa "hidden"
        Object.defineProperty(document, "visibilityState", { configurable: true, get: () => (window.__gizle ? "hidden" : "visible") });
        Object.defineProperty(document, "hidden", { configurable: true, get: () => Boolean(window.__gizle) });
      });
    }
    // --paylas_yok: tanı deneyi — navigator.share yokmuş gibi (Paylaş kartı tuvali hiç hazırlanmaz); ürün koduna dokunmaz
    if (ARG.paylas_yok) await b.addInitScript(() => { try { delete Navigator.prototype.share; } catch { /* yok */ } });
    // --css="<kural>": tanı deneyi — sayfaya ek stil (ör. bir katmanı kapatıp maliyetini ölçmek); ürün koduna dokunmaz
    if (typeof ARG.css === "string") await b.addInitScript((css) => { addEventListener("DOMContentLoaded", () => { const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st); }); }, ARG.css);
    // --tani_has=<düzenli ifade>: tanı deneyi — seçicisi :has( içeren VE bu ifadeye uyan CSS kurallarını sayfadan siler
    // (geç yüklenen parça stilleri için 400 ms'de bir); ürün koduna dokunmaz. ".*" = bütün :has kuralları.
    if (typeof ARG.tani_has === "string") await b.addInitScript((desen) => {
      const re = new RegExp(desen);
      const sil = (liste) => { for (let i = liste.length - 1; i >= 0; i--) { const r = liste[i];
        if (r.cssRules && !r.selectorText) { try { sil(r.cssRules); } catch { /* */ } continue; }
        if (r.selectorText && r.selectorText.includes(":has(") && re.test(r.selectorText)) { try { (r.parentRule ?? r.parentStyleSheet).deleteRule(i); window.__hasSilinen = (window.__hasSilinen ?? 0) + 1; } catch { /* */ } } } };
      const tara = () => { for (const ss of document.styleSheets) { try { sil(ss.cssRules); } catch { /* çapraz köken */ } } };
      setInterval(tara, 400); addEventListener("DOMContentLoaded", tara);
    }, ARG.tani_has);
    const s = await b.newPage();
    const hatalar = [];
    s.on("pageerror", (e) => hatalar.push(String(e).slice(0, 200)));
    const cdp = await b.newCDPSession(s);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: Number(ARG.cpu) || 6 });
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: RTT, downloadThroughput: HAT_BPS, uploadThroughput: 750_000 / 8 });
    hatBos = 0;
    let askiSayac = 0;
    const gecikme = () => (senaryo === "gecikmeli" ? 150 + Math.round(Math.random() * 750) : RTT);
    await s.route(/supabase\.co\//, async (r) => {
      const req = r.request(); const u = req.url();
      const json = (veri, ms = RTT) => uyu(ms).then(() => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(veri) })).catch(() => {});
      if (u.includes("/storage/v1/object/public/ses-adaylar/")) {
        try {
          const { veri, beklemeMs } = await sesDosyasi(u);
          await uyu(beklemeMs);
          return r.fulfill({ status: 200, body: veri, headers: { "content-type": /\.wav/.test(u) ? "audio/wav" : "audio/mpeg", "access-control-allow-origin": "*" } }).catch(() => {});
        } catch { return r.fulfill({ status: 404, body: "" }).catch(() => {}); }
      }
      if (u.includes("/storage/v1/")) return r.fulfill({ status: 404, body: "" }).catch(() => {});
      const nesne = /vnd\.pgrst\.object/.test(req.headers()["accept"] || "");
      if (u.includes("/auth/v1/user")) return json(KULLANICI);
      if (u.includes("/auth/v1/token")) return json(OTURUM);
      if (u.includes("/auth/v1/")) return json({});
      if (u.includes("/rpc/profilim")) return json(PROFIL);
      if (u.includes("/rpc/ses_secimleri_oyun")) return json(SECIMLER ?? {});
      if (u.includes("/rpc/mac_sonu_ozet")) return json(OZET(sunucu.k.kazanan === BEN));
      if (u.includes("/rpc/kasa_durum")) {
        if (sunucu.yavasMi()) {
          await uyu(RTT / 2);
          const d = await sunucu.kilitli(async () => { const v = sunucu.durumJson(); await uyu(1000 + Math.random() * 2500); v.sunucu_zamani = new Date().toISOString(); return v; });
          return json(d, RTT / 2);
        }
        if (senaryo === "dalgali") { await uyu(30 + Math.random() * 120); const d = sunucu.durumJson(); return json(d, 60 + Math.random() * 1340); }
        // aski (16 Eki 2026, Ida'nın 19:53 maçı: 9,25 sn hiç kasa_durum yok): bot kuralları, ama her 15 okumadan biri yanıtsız kalır
        // (yanıt ancak 9,5 sn sonra döner — yolda kaybolan yanıt / takılan bağlantı). İstemci yoldaki okuma bitmeden yenisini atmaz.
        if (senaryo === "aski" && ++askiSayac % 15 === 7) { const d = sunucu.durumJson(); sunucu.kaydet("aski"); return json(d, 9500); }
        const ms = gecikme(); await uyu(ms / 2); const d = sunucu.durumJson(); return json(d, ms / 2);
      }
      if (u.includes("/rpc/kasa_giris")) sunucu.giris();
      if (u.includes("/rpc/kasa_giris")) return json({ durum: "aktif", rakip_geldi: true, kalan_sn: 0, baglanmayan: null });
      if (u.includes("/rpc/kasa_cevap")) {
        await uyu(RTT / 2);
        let red = null;
        const isle = () => { try {
          const p = JSON.parse(req.postData() || "{}"); sunucu.ilerlet();
          // 1114: "cevabım yok" yalnız süre gerçekten dolduysa (erken → 'Süre dolmadı', istemci yeniden dener)
          if (Number(p.p_cevap) === -1 && sunucu.k.faz === "cevap" && Date.now() < sunucu.k.faz_bitis) { red = "Süre dolmadı"; sunucu.kaydet("erken:cevap"); }
          else { sunucu.cevapla(BEN, Number(p.p_cevap)); if (Number(p.p_cevap) === -1) sunucu.kaydet("cevap:ben-suredoldu"); }
          sunucu.ilerlet();
        } catch { /* */ } };
        if (sunucu.yavasMi()) await sunucu.kilitli(async () => { isle(); await uyu(1000 + Math.random() * 2500); }); else isle();
        if (red) return uyu(RTT / 2).then(() => r.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ code: "P0001", message: red }) })).catch(() => {});
        return json(null, RTT / 2);
      }
      if (u.includes("/rpc/kasa_karar")) {
        await uyu(RTT / 2);
        let red = null;
        const isle = () => { try {
          const p = JSON.parse(req.postData() || "{}");
          sunucu.ilerlet();
          // 1063: "karar vermedim" (p_ac null) yalnız süre gerçekten dolduysa (erken → 'Süre dolmadı')
          if (p.p_ac == null && sunucu.k.faz === "karar" && Date.now() < sunucu.k.faz_bitis) { red = "Süre dolmadı"; sunucu.kaydet("erken:karar"); }
          else if (sunucu.k.faz === "karar" && sunucu.k.karar?.veren === BEN) sunucu.kararUygula(p.p_ac === true, p.p_ac == null);
        } catch { /* */ } };
        if (sunucu.yavasMi()) await sunucu.kilitli(async () => { isle(); await uyu(1000 + Math.random() * 2500); }); else isle();
        if (red) return uyu(RTT / 2).then(() => r.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ code: "P0001", message: red }) })).catch(() => {});
        return json(null, RTT / 2);
      }
      // --kozmetik=ida (16 Eki 2026): oyuncu kartları Ida'nın gerçek kartıyla (canlıdan salt okuma: lig_altin çerçeve, isim_altin,
      // sezon_bp + bp_parlama, şehir unvanı) ve 16 Eki 19:53 maçındaki gizli botun kartıyla (Luna, lig_gumus). Taklitte kozmetik yoktu;
      // canlı Ida koşularında > 100 ms kare 23, taklitte 0–3 idi.
      if (u.includes("/rpc/oyuncu_kartlari") && ARG.kozmetik === "ida") return json([KART_IDA(BEN), KART_LUNA(RAKIP)]);
      if (u.includes("/rpc/kasa_joker_durumu")) return json([{ sinir: null, kullanilan: 0, ucretsiz_elli_kaldi: false, kilitli: false, soruda_kullanildi: false, kullanim_sayilari: {}, tur_basi_sinir: 1 }]);
      if (u.includes("/rest/v1/oyun_ayarlari")) return json(Object.entries(AYAR).map(([anahtar, deger]) => ({ anahtar, deger })));
      if (u.includes("/rest/v1/rpc/")) return json(null);
      if (u.includes("/rest/v1/")) return json(nesne ? null : []);
      return json({});
    });
    await s.route(/\/realtime\//, (r) => r.abort());
    // --iz=giris | ac | sonuc:N | mac (bütün maç) — o pencerenin Chrome izi (ana iş parçacığı + boyama/raster/GPU) → .tmp/hazine-iz/<etiket>-<senaryo><maç>-<iz>.json
    const IZ = typeof ARG.iz === "string" ? ARG.iz : null;
    let izDurum = 0;
    // --hafif (15 Eki 2026, perf 2): yalnız zaman çizelgesi (JS profilcisi/GPU yok) — iz yükü JS sürelerini şişirmesin
    const izBas = async () => { izDurum = 1; await tarayici.startTracing(s, { categories: ARG.hafif ? ["devtools.timeline", "disabled-by-default-devtools.timeline", "disabled-by-default-devtools.timeline.frame", "toplevel", ...(ARG.gecersiz ? ["disabled-by-default-devtools.timeline.invalidationTracking"] : [])] : ["devtools.timeline", "disabled-by-default-devtools.timeline", "disabled-by-default-devtools.timeline.frame", "toplevel", "cc", "gpu", "viz", "blink", "loading", "benchmark", "disabled-by-default-v8.cpu_profiler", ...(ARG.gecersiz ? ["disabled-by-default-devtools.timeline.invalidationTracking"] : [])] }).catch((e) => { console.log("iz başlamadı", e.message); }); };
    const izBitir = async () => {
      izDurum = 2;
      const iz = await tarayici.stopTracing().catch(() => null);
      if (iz) { const d = path.resolve(".tmp/hazine-iz"); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, `${ETIKET}-${senaryo}${m}-${IZ.replace(":", "")}.json`), iz); }
    };
    // --spa (16 Eki 2026): gerçek oyuncu gibi maça uygulama İÇİNDEN girilir — önce ana sayfa açılır, dokunulur (AudioContext lobide
    // kurulur), sonra adres history.pushState + popstate ile değişir (React Router SPA geçişi; sayfa yeniden yüklenmez).
    if (ARG.spa) {
      await s.goto(`${ADRES}/?dev=1`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await s.waitForSelector("#root *", { timeout: 60000 }).catch(() => {});
      await uyu(6000); await s.mouse.click(195, 300).catch(() => {}); await uyu(3000);
    }
    if (IZ === "giris" || IZ === "mac") await izBas();
    // --profil: bütün maçın JS profili (CDP, 1 ms örnek; izden hafif) → .tmp/hazine-iz/<etiket>-<senaryo><maç>.cpuprofile
    if (ARG.profil) { await cdp.send("Profiler.enable"); await cdp.send("Profiler.setSamplingInterval", { interval: 1000 }); }
    if (ARG.spa) await s.evaluate((yol) => { history.pushState(null, "", yol); dispatchEvent(new PopStateEvent("popstate")); }, `/kasa/${ID}`);
    else await s.goto(`${ADRES}/kasa/${ID}?dev=1`, { waitUntil: "domcontentloaded", timeout: 60000 });
    // --dom_svg=<ms>: gezinmeden bu kadar sonra (giriş sahnesi) satır içi SVG / görsel dökümü
    // --anim_dokum=<ms>[,<ms>…] (16 Eki 2026): gezinmeden bu anlarda süren CSS animasyonları/geçişleri — hedef öğe, ad, canlandırılan
    // özellikler (transform/opacity dışı = her karede stil + boyama), süre, tekrar. Sürekli boyamanın sorumlusunu adıyla bulmak için.
    if (typeof ARG.anim_dokum === "string") {
      const anlar = ARG.anim_dokum.split(",").map(Number);
      (async () => { let gecen = 0; for (const an of anlar) { await uyu(an - gecen); gecen = an;
        const l = await s.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").map((a) => {
          const h = a.effect?.target; const k = a.effect?.getKeyframes?.() ?? [];
          const oz = [...new Set(k.flatMap((f) => Object.keys(f).filter((x) => !["offset", "easing", "composite", "computedOffset"].includes(x))))];
          const t = a.effect?.getTiming?.() ?? {};
          const sinif = h ? `${h.tagName?.toLowerCase()}.${String(h.className?.baseVal ?? h.className ?? "").trim().split(/\s+/).slice(0, 3).join(".")}` : "?";
          return { ad: a.animationName ?? a.transitionProperty ?? a.constructor.name, hedef: sinif.slice(0, 70), oz: oz.join(","), sure: t.duration, tekrar: t.iterations };
        })).catch(() => []);
        const grup = new Map(); for (const x of l) { const k = `${x.ad} | ${x.oz} | ${x.hedef} | ${x.sure}ms×${x.tekrar}`; grup.set(k, (grup.get(k) ?? 0) + 1); }
        console.log(`ANİM @${an}ms: ${l.length} süren`); for (const [k, n] of [...grup].sort((a, b) => b[1] - a[1])) console.log(`   ${n} × ${k}`);
      } })();
    }
    if (typeof ARG.dom_svg === "string") { await uyu(Number(ARG.dom_svg)); console.log("SVG", JSON.stringify(await s.evaluate(() => [...document.querySelectorAll("svg, img")].map((v) => {
      let a = v.parentElement, iz = []; for (let i = 0; i < 4 && a; i++, a = a.parentElement) iz.push((a.className?.baseVal ?? a.className) || a.tagName);
      return { tag: v.tagName, sinif: v.getAttribute("class"), src: v.getAttribute("src")?.slice(-50), ata: iz.join(" < ").slice(0, 110), oge: v.querySelectorAll("*").length, d: [...v.querySelectorAll("path")].reduce((n, p) => n + (p.getAttribute("d")?.length ?? 0), 0) };
    }).filter((x) => x.tag === "IMG" || x.d > 0 || x.oge > 5)))); }
    // profil zamanı ↔ sayfa saati eşlemesi (performance.now, ms): örnek ts (µs) − startTime → + perfBas
    let perfBas = null;
    if (ARG.profil) { await cdp.send("Profiler.start"); perfBas = await s.evaluate(() => performance.now()).catch(() => null); }
    // ilk dokunuş: AudioContext açılsın. Gerçekte oyuncu "Rakip ara"ya lobide basmıştı (bağlam maçtan çok önce kurulur) —
    // 15 Eki 2026: dokunuş sayfa çizilir çizilmez (eskiden .m2-mac'ten sonra: new AudioContext() ~180 ms, CPU 6x, giriş sahnesine
    // denk gelip taklitte olmayan bir takılma üretiyordu)
    await s.waitForSelector("#root *", { timeout: 60000 }).catch(() => {});
    await s.mouse.click(195, 300).catch(() => {});
    await s.waitForSelector(".m2-mac", { timeout: 60000 }).catch(() => {});
    let bitisT = null, sonEylem = "", skorCekildi = false, arkaPlanYapildi = false;
    const arkaPlanlar = [];
    const bas = Date.now();
    while (Date.now() - bas < 6 * 60 * 1000) {
      const k = sunucu.k;
      if (k.durum === "bitti") {
        bitisT = bitisT ?? Date.now();
        // --mac_sonu_cekim=<ad> (16 Eki 2026): maç sonu sahnesinin bitişten 7 sn sonraki görüntüsü (önce/sonra görünüm karşılaştırması)
        if (typeof ARG.mac_sonu_cekim === "string" && !skorCekildi && Date.now() - bitisT > 7000) {
          skorCekildi = true;
          await s.screenshot({ path: path.join(CIKTI, `${ARG.mac_sonu_cekim}-${senaryo}${m}.png`) }).catch(() => {});
        }
        if (Date.now() - bitisT > 9000) break; await uyu(300); continue;
      }
      // --sadece_giris: giriş sahnesi + ilk sorunun 2 sn'si ölçülür, maç orada bırakılır (giriş deneyleri için)
      if (ARG.sadece_giris && k.tur >= 1 && k.gosterim_bas && Date.now() > k.gosterim_bas + 2000) break;
      const now = Date.now();
      if (k.faz === "cevap" && !k.cevaplar[BEN] && !sunucu.turPlani(k.tur).cevapsiz) {
        const p = sunucu.turPlani(k.tur);
        const an = `c${k.tur}`;
        if (now >= k.gosterim_bas + p.benMs && sonEylem !== an) {
          const sik = s.locator(".qt-sik");
          if (await sik.count() >= 4) {
            const ok = await sik.nth(p.benDogru ? 1 : 2).click({ timeout: 1500 }).then(() => true).catch(() => false);
            if (ok) sonEylem = an;
          }
        }
      } else if (k.faz === "karar" && k.karar?.veren === BEN) {
        const an = `k${k.tur}`;
        if (now >= k.gosterim_bas + 1200 && sonEylem !== an) {
          const ac = k.kasa >= 8 || k.puan[BEN] + k.kasa >= HEDEF;
          const dugme = s.locator(".ks-karar-dugme").filter({ hasText: ac ? /AÇ/ : /DEVAM/ }).first();
          const ok = await dugme.click({ timeout: 1500 }).then(() => true).catch(() => false);
          if (ok) sonEylem = an;
        }
      }
      if (ARG.skor_cekim && !skorCekildi && k.faz === "cevap" && k.gosterim_bas && now > k.gosterim_bas + 2500) {
        skorCekildi = true;
        const olc = await s.evaluate(() => [...document.querySelectorAll(".ks-skor-ad")].map((e) => ({ t: e.innerText, kesik: e.scrollWidth > e.clientWidth + 0.5, w: Math.round(e.clientWidth), sw: e.scrollWidth })).concat([{ tasma: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, serit: Math.round(document.querySelector(".ks-serit")?.getBoundingClientRect().width ?? 0) }])).catch((e) => String(e));
        const d = path.resolve("tasarim/duzeltme-codex-15eki"); fs.mkdirSync(d, { recursive: true });
        await s.screenshot({ path: path.join(d, `${ARG.skor_cekim}.png`) }).catch(() => {});
        console.log("SKOR", ARG.skor_cekim, JSON.stringify(olc));
      }
      // dalgali: 4. turun sorusunda sayfa 4 sn arka plana gider (görünürlük + yaşam döngüsü dondurma), sonra döner
      if (senaryo === "dalgali" && !arkaPlanYapildi && k.tur === 4 && k.faz === "cevap" && k.gosterim_bas && now > k.gosterim_bas + 3000) {
        arkaPlanYapildi = true;
        const t0 = Date.now();
        await s.evaluate(() => { window.__gizle = true; document.dispatchEvent(new Event("visibilitychange")); }).catch(() => {});
        await cdp.send("Page.setWebLifecycleState", { state: "frozen" }).catch(() => {});
        await uyu(4000);
        await cdp.send("Page.setWebLifecycleState", { state: "active" }).catch(() => {});
        await s.evaluate(() => { window.__gizle = false; document.dispatchEvent(new Event("visibilitychange")); }).catch(() => {});
        arkaPlanlar.push([t0, Date.now()]);
        sunucu.kaydet("arka_plan", { ms: Date.now() - t0 });
      }
      sunucu.ilerlet();
      if (IZ && izDurum < 2) {
        const L = sunucu.log;
        if (IZ === "giris" && k.tur >= 1 && k.gosterim_bas && now > k.gosterim_bas + 1000) await izBitir();
        if (IZ === "ac") {
          const i = L.findIndex((x) => x.olay === "karar:ac");
          if (izDurum === 0 && k.faz === "karar") await izBas();
          if (izDurum === 1 && i < 0 && k.faz === "cevap" && L.at(-2)?.olay === "karar:devam" && now > k.gosterim_bas + 500) { await tarayici.stopTracing().catch(() => null); izDurum = 0; }
          if (izDurum === 1 && i >= 0 && now > (L.slice(i).find((x) => x.olay === "cevap")?.gosterim_bas ?? Infinity) + 500) await izBitir();
        }
        if (IZ.startsWith("sonuc:")) {
          const n = Number(IZ.split(":")[1]);
          if (izDurum === 0 && k.tur === n && k.faz === "cevap") await izBas();
          if (izDurum === 1 && (k.tur > n || k.faz === "karar" || k.durum === "bitti")) await izBitir();
        }
      }
      await uyu(120);
    }
    if (izDurum === 1) await izBitir();
    if (ARG.profil) {
      const { profile } = await cdp.send("Profiler.stop");
      const d = path.resolve(".tmp/hazine-iz"); fs.mkdirSync(d, { recursive: true });
      fs.writeFileSync(path.join(d, `${ETIKET}-${senaryo}${m}.cpuprofile`), JSON.stringify({ ...profile, perfBas }));
    }
    // --dom_svg: tanı — sayfadaki satır içi SVG'ler (ata sınıfı, öğe sayısı, yol uzunluğu toplamı)
    if (ARG.dom_svg === true) console.log("SVG", JSON.stringify(await s.evaluate(() => [...document.querySelectorAll("svg")].map((v) => {
      let a = v.parentElement, iz = []; for (let i = 0; i < 4 && a; i++, a = a.parentElement) iz.push((a.className?.baseVal ?? a.className) || a.tagName);
      return { sinif: v.getAttribute("class"), ata: iz.join(" < ").slice(0, 120), oge: v.querySelectorAll("*").length, d: [...v.querySelectorAll("path")].reduce((n, p) => n + (p.getAttribute("d")?.length ?? 0), 0), filtre: v.querySelectorAll("filter,mask,clipPath,pattern").length };
    }).sort((x, y) => y.d - x.d).slice(0, 15))));
    const veri = await s.evaluate(() => ({ olc: window.__olc, sesKayit: window.__sesKayit ?? [], sesOmur: window.__sesOmur ?? null, akis: window.__akis ?? null, timeOrigin: performance.timeOrigin }));
    veri.arkaPlanlar = arkaPlanlar;
    const c = cozumle({ ...veri, sunucuLog: sunucu.log, bitisT: sunucu.log.find((x) => x.olay === "bitti")?.t ?? Infinity });
    sonuclar.push({ senaryo, mac: m, tur: sunucu.k.tur, kazanan: sunucu.k.kazanan === BEN ? "ben" : "rakip", hatalar, sunucu: sunucu.log, ...c, ham: veri });
    if (c.perf) {
      const f = (x) => (x ? `ort ${x.ort} · en kötü dilim ${x.en_kotu_dilim} kare/sn · en uzun kare ${x.en_uzun_kare} ms · ≥100 ms kare ${x.kare_100} · uzun görev ${x.uzun_gorev}` : "—");
      console.log(`   kare: giriş ${f(c.perf.giris)} · rakamlar ${JSON.stringify(c.perf.rakam.map((x) => `${x.v}:${x.ms}`))}`);
      console.log(`   maç sonu: ${f(c.perf.mac_sonu)} · uzun görevler (bitişten ms, süre) ${JSON.stringify(c.perf.mac_sonu?.uzun_liste ?? [])}`);
      console.log(`         sonuç ${f(c.perf.sonuc)} · AÇ anı ${f(c.perf.ac)} · DEVAM anı ${f(c.perf.devam)} · soru ${f(c.perf.soru)}`);
    }
    { const g = (o) => { const v = c.fazGec.filter((x) => x.olay === o).map((x) => x.ms); return v.length ? `${o} ort ${Math.round(v.reduce((a, b) => a + b, 0) / v.length)} / en kötü ${Math.max(...v)} ms` : `${o} —`; };
      console.log(`   faz geçişi (sunucu → istemci): ${["sonuc", "karar", "cevap", "bitti"].map(g).join(" · ")} · erken süre bildirimi ${c.erkenBildirim.length} ${JSON.stringify(c.erkenBildirim)}`); }
    { const so = c.sayac; console.log(`   sayaç: 0'da bekleme ${so.sifir_bekleme.length} kez, > 1 sn ${so.sifir_uzun.length} (en uzun ${Math.max(0, ...so.sifir_bekleme.map((x) => x.ms))} ms) · sıçrama ${so.sicrama.length} ${JSON.stringify(so.sicrama.slice(0, 4))} · rakam ${JSON.stringify(so.rakam_ms)}`); }
    console.log(`${ETIKET} · ${senaryo} #${m}: tur ${sunucu.k.tur}, ses ${c.calan} (istek ${c.istek}) · taşma ${c.tasma.length} · geç ${c.gec.length} · eşzamanlı ${c.eszaman.length} · kesik anim ${c.kesik.length}/${c.kesik.length + c.bitenAnim} · 3-2-1 ${JSON.stringify(c.tikAralik)} · soru↔ses ${JSON.stringify(c.soruSes.map((x) => x.farkMs))} · sayaç ilk ${JSON.stringify(c.sayacIlk.map((x) => x.ilk))} · hata ${hatalar.length}`);
    { const so = c.sesOmru; console.log(`   ses ömrü: anlamlı ${so.anlamli} · ANİ kesilen ${so.ani_kesilen} · yumuşak biten ${so.yumusak_biten} · çalarken yeni ekran (>150 ms kaldı) ${so.calarken_yeni_ekran} · pencereye kısaltılan ${so.kisaltilan}`);
      for (const x of so.liste.filter((y) => y.anlamli && (y.kesildi || (y.yeniEkran && y.yeniEkran.kalanMs > 150))).slice(0, 12))
        console.log(`     · ${x.rol} @${x.t} ms: plan ${x.planMs} / çaldı ${x.calmaMs} ms${x.kesildi ? ` · KESİLDİ (${x.ani ? "ani" : "fade " + x.fadeMs + " ms"}) — ${x.kesen}` : ""}${x.yeniEkran ? ` · çalarken ${x.yeniEkran.ad}, kalan ${x.yeniEkran.kalanMs} ms` : ""}${x.cakisan.length ? " · çakışan " + x.cakisan.join(",") : ""}`); }
    await b.close();
  }
} catch (e) {
  console.error("HATA:", e.stack || e.message);
  process.exitCode = 1;
} finally {
  await tarayici.close();
  fs.writeFileSync(path.join(CIKTI, `olcum-${ETIKET}.json`), JSON.stringify(sonuclar, null, 1));
  // çakışma tablosu (markdown): hangi ses/animasyon hangi anın üstüne biniyor
  const satir = [];
  for (const x of sonuclar) {
    const m = `${x.senaryo} #${x.mac}`;
    for (const t of x.tasma) satir.push(`| ${m} | faz taşması | ${t.rol} | istendi ${t.istekFaz} → çaldı ${t.calmaFaz} | +${t.gecMs} ms |`);
    for (const g of x.gec) satir.push(`| ${m} | geç çalma | ${g.rol} | ${g.faz} | +${g.gecMs} ms |`);
    for (const e of x.eszaman) satir.push(`| ${m} | eşzamanlı ses | ${e.a} + ${e.b} | ${e.faz} | ${e.farkMs} ms arayla |`);
    for (const y of x.sesOmru?.liste ?? []) if (y.anlamli && (y.kesildi || (y.yeniEkran && y.yeniEkran.kalanMs > 150)))
      satir.push(`| ${m} | ses ${y.kesildi ? (y.ani ? "ANİ kesildi" : "yumuşak bitti") : "çalarken yeni ekran"} | ${y.rol} | ${y.yeniEkran?.ad ?? "-"} | plan ${y.planMs} / çaldı ${y.calmaMs} ms${y.yeniEkran ? `, kalan ${y.yeniEkran.kalanMs} ms` : ""}${y.kesen ? " · " + y.kesen : ""} |`);
    for (const k of x.kesik) satir.push(`| ${m} | kesilen animasyon | ${k.ad} (${k.el.split(" < ")[0]}) | ${k.faz} | ${k.oynadi}/${k.sure} ms oynadı |`);
  }
  // 16 Eki 2026: her ses için tek satır (rol, istendi→başladı, plan/gerçek süre, kesildi + kesen, yeni ekranda kalan, çakışan)
  fs.writeFileSync(path.join(CIKTI, `ses-omru-${ETIKET}.md`), `# Ses ömrü — ${ETIKET}\n\n` + sonuclar.map((x) => `## ${x.senaryo} #${x.mac}\n\n| t ms | rol | anlamlı | plan/dosya ms | çaldı ms | kesildi / kesen | yeni ekran · kalan | çakışan |\n|---|---|---|---|---|---|---|---|\n`
    + (x.sesOmru?.liste ?? []).map((y) => `| ${y.t} | ${y.rol} | ${y.anlamli ? "★" : ""} | ${y.planMs}/${y.dosyaMs}${y.planli ? " (kısaltıldı)" : ""} | ${y.calmaMs} | ${y.kesildi ? `${y.ani ? "ANİ" : `fade ${y.fadeMs} ms`} — ${y.kesen}` : "sonuna kadar"} | ${y.yeniEkran ? `${y.yeniEkran.ad} · ${y.yeniEkran.kalanMs} ms` : "—"} | ${y.cakisan.join(", ") || "—"} |`).join("\n")).join("\n\n") + "\n");
  fs.writeFileSync(path.join(CIKTI, `tablo-${ETIKET}.md`), `# Hazine akış ölçümü — ${ETIKET}\n\n| maç | tür | ses / animasyon | an | ölçü |\n|---|---|---|---|---|\n${satir.join("\n")}\n`);
  const top = (f) => sonuclar.reduce((n, x) => n + f(x), 0);
  console.log(`\nSAYAÇ ${ETIKET}: 0'da > 1 sn ${top((x) => x.sayac?.sifir_uzun.length ?? 0)} kez (en uzun ${Math.max(0, ...sonuclar.flatMap((x) => (x.sayac?.sifir_bekleme ?? []).map((y) => y.ms)))} ms) · ileri/geri sıçrama ${top((x) => x.sayac?.sicrama.length ?? 0)} · rakam en kısa/uzun ${Math.min(...sonuclar.map((x) => x.sayac?.rakam_ms?.en_kisa ?? 9999))}/${Math.max(0, ...sonuclar.map((x) => x.sayac?.rakam_ms?.en_uzun ?? 0))} ms`);
  { const v = (o) => sonuclar.flatMap((x) => (x.fazGec ?? []).filter((y) => y.olay === o).map((y) => y.ms));
    const oz = (o) => { const a = v(o); return a.length ? `${o} ort ${Math.round(a.reduce((p, q) => p + q, 0) / a.length)} · en kötü ${Math.max(...a)} · > 1 sn ${a.filter((x) => x > 1000).length}/${a.length}` : `${o} —`; };
    console.log(`\nFAZ GEÇİŞİ ${ETIKET} (sunucu → istemci, ms): ${["sonuc", "karar", "cevap", "bitti"].map(oz).join(" | ")} · erken süre bildirimi ${top((x) => x.erkenBildirim?.length ?? 0)}`); }
  console.log(`\nSES ÖMRÜ ${ETIKET}: anlamlı ${top((x) => x.sesOmru?.anlamli ?? 0)} · ANİ kesilen ${top((x) => x.sesOmru?.ani_kesilen ?? 0)} · yumuşak biten ${top((x) => x.sesOmru?.yumusak_biten ?? 0)} · çalarken yeni ekran (>150 ms kaldı) ${top((x) => x.sesOmru?.calarken_yeni_ekran ?? 0)} · pencereye kısaltılan ${top((x) => x.sesOmru?.kisaltilan ?? 0)}`);
  console.log(`\nTOPLAM ${ETIKET}: maç ${sonuclar.length} · faz taşması ${top((x) => x.tasma.length)} · geç çalma ${top((x) => x.gec.length)} · eşzamanlı ${top((x) => x.eszaman.length)} · kesilen animasyon ${top((x) => x.kesik.length)} · askıda başlayan ${top((x) => x.askidaCalan)}`);
}
