// ============================================================
// ÇEVRİMİÇİ DURUMU — yalnız ARKADAŞ LİSTESİNDE gösterilir (migration 590)
//
// Supabase Realtime Presence; DB'ye hiçbir şey yazılmaz (tablo/kolon/heartbeat yok).
//   • Her oyuncunun ÖZEL kanalı: `cevrimici-<uid>` (config.private: true).
//   • Kanala yalnız SAHİBİ track eder: payload { durum: "cevrimici" | "mac" }.
//     Kanca: useCevrimiciDurumum() — Layout'ta bir kez çağrılır.
//   • Kabul edilmiş arkadaşlar o kanala abone olup YALNIZ DİNLER (track etmez).
//     Kanca: useArkadasCevrimici(idler) — yalnız FriendsPage kullanır.
//   • Yetki sunucuda: realtime.messages RLS (590) — sahibi yazar, sahibi + kabul edilmiş
//     arkadaşları okur. Bekleyen istek / yabancı kanala katılamaz.
//
// Migration uygulanmadıysa özel kanala katılım reddedilir (CHANNEL_ERROR): sessizce vazgeçilir,
// konsola TEK uyarı düşer, yeniden deneme döngüsü kurulmaz; liste bugünkü gibi görünür.
// Uygulama arka plana alınınca (visibilitychange hidden / pagehide) untrack + kanaldan çıkılır,
// geri gelince yeniden katılınır — arkadaşlar oyuncuyu çevrimdışı görür.
// Gizli botlar gerçek istemci olmadığından hiç track etmez → onlarda gösterge çıkmaz.
// ============================================================
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../../src/lib/supabase.js";

export const CEVRIMICI_ONEK = "cevrimici-";
// Arkadaş listesi açıkken dinlenen kanal sayısının üst sınırı. Her arkadaş bir kanal demek;
// Realtime'da bağlantı başına kanal sınırı (plan) ve telefonda gereksiz trafik olmasın diye.
// Liste sırası (sunucudan gelen) korunur; ilk 50 arkadaş dinlenir, gerisinde gösterge çıkmaz.
export const DINLEME_UST_SINIR = 50;

const kanalAdi = (uid) => `${CEVRIMICI_ONEK}${uid}`;

// Oturum boyunca: sunucu özel kanalı YETKİ yüzünden reddettiyse (migration yok) bir daha denenmez.
let reddedildi = false;
let uyariVerildi = false;
function tekUyari(neden) {
  if (uyariVerildi) return;
  uyariVerildi = true;
  console.warn("[Bildim] çevrimiçi durumu kapalı (Realtime özel kanal açılamadı):", neden?.message ?? neden ?? "");
}
function yetkiReddiMi(hata) {
  return /unauthori|permission|not allowed|yetki/i.test(String(hata?.message ?? hata ?? ""));
}

// Kapanmakta olan kanallar: konu → removeChannel sözü. supabase.channel() aynı konudaki kanalı
// listeden çıkana dek (sunucu ayrılmayı onaylayınca) GERİ VERİR; hızlı gizle/göster'de kapanan
// kanal yeniden kullanılmasın diye yeni katılım önce bu sözü bekler.
const kapanan = new Map();
function kanalKapat(kanal) {
  if (!kanal) return;
  const konu = kanal.topic;
  let soz;
  try {
    soz = Promise.resolve(supabase.removeChannel(kanal)).catch(() => null);
  } catch {
    soz = Promise.resolve(null);
  }
  const bitti = soz.then(() => { if (kapanan.get(konu) === bitti) kapanan.delete(konu); });
  kapanan.set(konu, bitti);
}
// DİKKAT: kanal nesnesi, sahibi aynı anda subscribe edecekse OLUŞTURULUR — araya await girmez.
// Yoksa (ör. React StrictMode'da iki kez çalışan etki) iki sahip aynı nesneyi alır, biri kapatır.
function kapanmaSozu(ad) {
  return kapanan.get(`realtime:${ad}`) ?? null;
}

/** Görünür mü (arka plandaki sekme / uygulama çevrimdışı sayılır). */
function gorunur() {
  return typeof document === "undefined" || document.visibilityState !== "hidden";
}

/**
 * Bu rota bir maç mı? Rotalar src/BildimApp.jsx'ten:
 *   /mac/:id · /grup-mac/:id · /duello/:id (düello lobisi `/duello` DEĞİL)
 *   /turnuva — turnuva maçı aynı sayfada oynanır; soru ekranı açıkken sayfa gövdeye
 *   `bd-oyun-modu` koyar (useOyunModu), maç yalnız o sırada sayılır.
 */
export function macRotasiMi(yol, oyunModu = false) {
  if (/^\/(mac|grup-mac|duello)\/[^/]+/.test(yol)) return true;
  return /^\/turnuva\/?$/.test(yol) && oyunModu;
}

/** Turnuva sayfasında gövdedeki `bd-oyun-modu` sınıfını izler (yalnız o rotadayken). */
function useTurnuvaOyunModu(aktif) {
  const [oyunModu, setOyunModu] = useState(false);
  useEffect(() => {
    if (!aktif || typeof document === "undefined") { setOyunModu(false); return; }
    const oku = () => setOyunModu(document.body.classList.contains("bd-oyun-modu"));
    oku();
    const g = new MutationObserver(oku);
    g.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => g.disconnect();
  }, [aktif]);
  return oyunModu;
}

/**
 * Kendi durumunu yayınlar. Layout'ta bir kez çağrılır; oturum yoksa hiçbir şey açmaz.
 * Rota değişince yalnız track payload'ı güncellenir (kanal yeniden açılmaz).
 */
export function useCevrimiciDurumum(uid) {
  const { pathname } = useLocation();
  const turnuvaOyunModu = useTurnuvaOyunModu(/^\/turnuva\/?$/.test(pathname));
  const durum = macRotasiMi(pathname, turnuvaOyunModu) ? "mac" : "cevrimici";
  const durumRef = useRef(durum);
  const kanalRef = useRef(null);      // { kanal, bagli }

  // Kanal yaşam döngüsü: oturum + görünürlük
  useEffect(() => {
    if (!uid || reddedildi) return;
    let iptal = false;
    let aciliyor = false;

    const katil = async () => {
      if (iptal || reddedildi || aciliyor || kanalRef.current || !gorunur()) return;
      const soz = kapanmaSozu(kanalAdi(uid));
      if (soz) {
        // Önceki kanal hâlâ kapanıyor (hızlı gizle/göster): bitmesini bekle, sonra yeniden bak
        aciliyor = true;
        try { await soz; } finally { aciliyor = false; }
        if (iptal || reddedildi || kanalRef.current || !gorunur()) return;
      }
      let kanal;
      try {
        // enabled: true şart — sahip kanalında presence dinleyicisi yok; realtime-js o zaman presence'ı kapalı
        // katıldığından sunucu katılımı broadcast okuma iznine göre denetler ve 590'ın yalnız 'presence'
        // politikası yüzünden "Unauthorized" döner (canlı ölçüm 24 Eyl: kimse kendi durumunu yayınlayamıyordu).
        kanal = supabase.channel(kanalAdi(uid), { config: { private: true, presence: { key: uid, enabled: true } } });
      } catch (e) {
        tekUyari(e);
        return;
      }
      const kayit = { kanal, bagli: false };
      kanalRef.current = kayit;
      try {
        kanal.subscribe((st, hata) => {
          if (kanalRef.current !== kayit) return;
          if (st === "SUBSCRIBED") {
            kayit.bagli = true;
            // Yeniden bağlanınca da (ağ kopması → realtime-js yeniden katılır) track yenilenir.
            kanal.track({ durum: durumRef.current }).catch(() => { /* bir sonraki SUBSCRIBED'da yeniden */ });
            return;
          }
          // İlk katılım olmadıysa (red / zaman aşımı): kanal kapatılır, döngü kurulmaz.
          if (!kayit.bagli && (st === "CHANNEL_ERROR" || st === "TIMED_OUT")) {
            if (st === "CHANNEL_ERROR" && yetkiReddiMi(hata)) reddedildi = true;
            tekUyari(hata ?? st);
            kanalRef.current = null;
            kanalKapat(kanal);
          }
        });
      } catch (e) {
        tekUyari(e);
        kanalRef.current = null;
        kanalKapat(kanal);
      }
    };

    const ayril = () => {
      const kayit = kanalRef.current;
      if (!kayit) return;
      kanalRef.current = null;
      try {
        if (kayit.bagli) kayit.kanal.untrack().catch(() => { /* kanal zaten kapanıyor */ });
      } catch { /* yut */ }
      kanalKapat(kayit.kanal);
    };

    const gorunurlukDegisti = () => (gorunur() ? katil() : ayril());
    const sayfaGitti = () => ayril();
    const sayfaGeldi = () => katil();

    katil();
    document.addEventListener("visibilitychange", gorunurlukDegisti);
    window.addEventListener("pagehide", sayfaGitti);
    window.addEventListener("pageshow", sayfaGeldi);
    return () => {
      iptal = true;
      document.removeEventListener("visibilitychange", gorunurlukDegisti);
      window.removeEventListener("pagehide", sayfaGitti);
      window.removeEventListener("pageshow", sayfaGeldi);
      ayril();
    };
  }, [uid]);

  // Rota değişti: yalnız payload güncellenir
  useEffect(() => {
    if (durumRef.current === durum) return;
    durumRef.current = durum;
    const kayit = kanalRef.current;
    if (kayit?.bagli) kayit.kanal.track({ durum }).catch(() => { /* yut */ });
  }, [durum]);
}

/** Defterden tek değer: herhangi bir cihazı maçtaysa "mac", yoksa "cevrimici"; kimse yoksa null. */
function durumCoz(defter) {
  let sonuc = null;
  for (const d of defter.values()) {
    if (d === "mac") return "mac";
    sonuc = "cevrimici";
  }
  return sonuc;
}

// NEDEN presenceState() OKUNMUYOR: realtime-js 2.108'in presence bağdaştırıcısı join/leave
// olaylarını üretirken durumdaki (state) meta nesnelerinin `phx_ref`'ini SİLİYOR
// (presenceAdapter.js › transformState, currentPresence üzerinde yerinde değişiklik). Sahip
// payload'ı güncelleyince (rota değişimi = aynı anahtarla yeniden track → joins + leaves) eski meta
// artık ref ile eşleşmediği için durumdan hiç düşmüyor: "Maçta" sonsuza dek kalıyordu (sahte
// Realtime ile ölçüldü). Çözüm: join/leave olaylarının KENDİ yükleri (diff'in kopyası, ref'leri
// sağlam) ile presence_ref → durum defteri tutulur. Yeniden bağlanmada (ağ kopması) kanal baştan
// açılır; taze kanalın ilk presence_state'i yalnız join üretir.

/**
 * Arkadaşların durumunu dinler (track ETMEZ). Dönüş: Map<uid, "cevrimici" | "mac">;
 * çevrimdışı arkadaş haritada yoktur. Liste değişince yalnız eklenen/çıkan arkadaşın kanalı
 * açılır/kapanır; sayfa gizlenince ya da sayfadan çıkınca bütün kanallar kapanır.
 */
export function useArkadasCevrimici(idler) {
  const [durumlar, setDurumlar] = useState(() => new Map());
  // Kimlik listesi değişmedikçe etki yeniden çalışmasın (yalnız anahtar karşılaştırılır)
  const anahtar = (idler ?? []).filter(Boolean).slice(0, DINLEME_UST_SINIR).join(",");
  const [gorunurMu, setGorunurMu] = useState(gorunur);
  const kanallarRef = useRef(new Map());   // uid → { kanal, bagli } | { aciliyor: true }
  const oturumRef = useRef({ basariVar: false });

  useEffect(() => {
    const d = () => setGorunurMu(gorunur());
    document.addEventListener("visibilitychange", d);
    window.addEventListener("pageshow", d);
    window.addEventListener("pagehide", d);
    return () => {
      document.removeEventListener("visibilitychange", d);
      window.removeEventListener("pageshow", d);
      window.removeEventListener("pagehide", d);
    };
  }, []);

  const yaz = (uid, deger) => {
    setDurumlar((m) => {
      if ((m.get(uid) ?? null) === (deger ?? null)) return m;
      const y = new Map(m);
      if (deger) y.set(uid, deger); else y.delete(uid);
      return y;
    });
  };

  // Liste / görünürlük değişti: istenen kümeyle açık kanalları eşitle
  useEffect(() => {
    const kanallar = kanallarRef.current;
    const istenen = new Set(anahtar && gorunurMu && !reddedildi ? anahtar.split(",") : []);

    const kapat = (uid) => {
      const k = kanallar.get(uid);
      if (!k) return;
      kanallar.delete(uid);
      if (k.kanal) kanalKapat(k.kanal);
      yaz(uid, null);
    };
    const hepsiniKapat = () => { for (const uid of [...kanallar.keys()]) kapat(uid); };

    for (const uid of [...kanallar.keys()]) if (!istenen.has(uid)) kapat(uid);

    function ac(uid) {
      if (kanallar.has(uid)) return;
      const kayit = { aciliyor: true, kanal: null, bagli: false };
      kanallar.set(uid, kayit);
      (async () => {
        const soz = kapanmaSozu(kanalAdi(uid));
        if (soz) {
          await soz;
          // Beklerken bu arkadaş istenmez olduysa hiç açma
          if (kanallar.get(uid) !== kayit || reddedildi) return;
        }
        let kanal;
        try {
          kanal = supabase.channel(kanalAdi(uid), { config: { private: true } });
        } catch (e) {
          tekUyari(e);
          if (kanallar.get(uid) === kayit) kanallar.delete(uid);
          return;
        }
        kayit.kanal = kanal;
        kayit.aciliyor = false;
        const defter = new Map();   // presence_ref → "cevrimici" | "mac"
        const guncelle = () => { if (kanallar.get(uid) === kayit) yaz(uid, durumCoz(defter)); };
        try {
          kanal
            .on("presence", { event: "join" }, ({ newPresences }) => {
              for (const m of newPresences ?? []) {
                if (m?.presence_ref) defter.set(m.presence_ref, m.durum === "mac" ? "mac" : "cevrimici");
              }
              guncelle();
            })
            .on("presence", { event: "leave" }, ({ leftPresences }) => {
              for (const m of leftPresences ?? []) if (m?.presence_ref) defter.delete(m.presence_ref);
              guncelle();
            })
            .subscribe((st, hata) => {
              if (kanallar.get(uid) !== kayit) return;
              if (st === "SUBSCRIBED") {
                if (kayit.bagli) {
                  // Yeniden katılım (ağ kopması): presence durumu bozuk olabilir → kanalı baştan aç
                  kapat(uid);
                  ac(uid);
                  return;
                }
                kayit.bagli = true;
                oturumRef.current.basariVar = true;
                return;
              }
              if (!kayit.bagli && (st === "CHANNEL_ERROR" || st === "TIMED_OUT")) {
                // Bu arkadaşın kanalı açılamadı: yalnız o kapanır, yeniden denenmez (liste değişene dek).
                kapat(uid);
                // Hiçbiri açılmadan yetki reddi → sunucuda 590 yok: hepsi kapanır, oturumda bir daha denenmez.
                if (st === "CHANNEL_ERROR" && !oturumRef.current.basariVar && yetkiReddiMi(hata)) {
                  reddedildi = true;
                  tekUyari(hata);
                  hepsiniKapat();
                }
              }
            });
        } catch (e) {
          tekUyari(e);
          kapat(uid);
        }
      })();
    }
    for (const uid of istenen) ac(uid);
  }, [anahtar, gorunurMu]);

  // Sayfadan çıkınca hepsi kapanır
  useEffect(() => () => {
    const kanallar = kanallarRef.current;
    for (const [uid, k] of [...kanallar]) {
      kanallar.delete(uid);
      if (k.kanal) kanalKapat(k.kanal);
    }
  }, []);

  return durumlar;
}
