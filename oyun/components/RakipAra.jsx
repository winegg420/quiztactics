import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../src/lib/supabase.js";
import { useAuth } from "../../src/context/AuthContext.jsx";
import { kategoriEtiket } from "../lib/kategoriler.js";
import KarsilasmaSahnesi, { KARSILASMA_ANIM_MS } from "./KarsilasmaSahnesi.jsx";
import { tt } from "../lib/dil.js";
import { sesRakipBulundu } from "../lib/ses.js";
import { rpcDene } from "../lib/rpcDene.js";
import { ayar } from "../lib/ayarlar.js";
import { QtModal, QtDugme } from "../tasarim/index.js";
import "../tasarim/ekranlar/a-modlar.css";

// 370: gizli botun geliş süresi SUNUCUDA, aramaya özgü rastgele (üçgen, eslesme_bot_*_sn).
// İstemci süreyi bilmez; yalnız en fazla "max + pay" kadar kuyruğu yoklar, sonra son çareye geçer.
const BOT_MAX_VARSAYILAN_SN = 15;   // asıl değer oyun_ayarlari.eslesme_bot_max_sn
const BEKLEME_PAYI_SN = 5;
// Paket 41 F: "Maç hazırlanıyor…" hâlinin üst sınırı. Dolunca yoklama durur, oyuncuya
// Tekrar dene / Vazgeç sunulur (eskiden sonsuza dek bekliyordu).
const HAZIRLIK_SINIR_MS = 30000;
// A6: kuyruk yoklama aralığı varsayılanı; asıl değer oyun_ayarlari.rakip_ara_yoklama_ms (migration 337)
const YOKLAMA_VARSAYILAN_MS = 3000;
// Yoklama aralığı ±%25 oynar: bot hep 3 sn'nin katında gelmesin (sunucu hedefi yoklamaya yuvarlar).
const YOKLAMA_OYNAMA = 0.25;

/**
 * "Hemen Oyna" eşleştirme ekranı.
 * Tam ekran katman olarak `document.body`'ye portal ile basılır — daha önce
 * ana sayfanın içinde konumlandığı için hiç görünmüyordu.
 *
 * Akış: kuyruğa gir → ~3 sn'de bir yokla. Gerçek rakip varsa anında eşleşir;
 * yoksa sunucu aramaya özgü rastgele sürede (3–15 sn, çoğunlukla 4–9) rakip
 * kurar (migration 370). Rakip bulununca 1 sn "Rakip bulundu: X" gösterilip maça geçilir.
 *
 * "Beklemeden bot ile oyna" düğmesi KALKTI (Ajan E, E.2): açık botlarla oynamak
 * isteyen Meydan Oku › "Antrenman — Botlara meydan oku" bölümünü kullanır.
 *
 * Ekranda "bot" kelimesi GEÇMEZ: gizli botlar gerçek oyuncu gibi görünmeli
 * (bkz. migration 155).
 */
// Paket 31 B: jokersiz = Saf Bilgi. Kuyruk ve bot maçı bayrağı taşır; jokerli ile eşleşmez.
export default function RakipAra({ kategori, dereceli = true, jokersiz = false, onBulundu, onIptal }) {
  const { user } = useAuth();
  // Geçen süre (yukarı sayar) — hedef süre sunucuda olduğundan geri sayım gösterilmez
  const [gecen, setGecen] = useState(0);
  const [hata, setHata] = useState(null);
  const [botaDusuldu, setBotaDusuldu] = useState(false);
  const [rakipAdi, setRakipAdi] = useState(null);
  const [rakipProfil, setRakipProfil] = useState(null);
  const [bulundu, setBulundu] = useState(false);
  const bittiRef = useRef(false);
  const zamanlayiciRef = useRef(null);
  const yoklamaRef = useRef(null);
  // Paket 41 F: "Tekrar dene" aramayı baştan başlatır (effect bu sayaca bağlı)
  const [deneme, setDeneme] = useState(0);
  // Ebeveyn her çizimde yeni onBulundu verir (satır içi ok fonksiyonu). Etkiye bağımlılık
  // olursa arama her çizimde baştan başlar, kuyruk kaydı silinip yeniden yazılır ve sunucunun
  // aramaya özgü süresi (migration 370) sıfırlanırdı. Ref ile sabit tutulur.
  const bulunduRef = useRef(onBulundu);
  bulunduRef.current = onBulundu;

  const temizle = useCallback(async () => {
    clearInterval(zamanlayiciRef.current);
    clearTimeout(yoklamaRef.current);
    try {
      await supabase.rpc("kuyruktan_cik");
    } catch (e) { console.warn("[Bildim] kuyruktan_cik başarısız:", e?.message ?? e);
      /* ağ hatası — kuyruk kaydı 90 sn'de kendiliğinden düşer */
    }
  }, []);

  // Maça geçmeden önce rakibin adını 1 sn göster
  const bitir = useCallback(
    async (macId) => {
      if (bittiRef.current) return;
      bittiRef.current = true;
      clearInterval(zamanlayiciRef.current);
      try {
        const { data, error } = await supabase
          .from("matches")
          .select(
            `oyuncu1, oyuncu2,
             p1:profiles!matches_oyuncu1_fkey(id, gorunen_ad, gorunen_avatar, puan),
             p2:profiles!matches_oyuncu2_fkey(id, gorunen_ad, gorunen_avatar, puan)`
          )
          .eq("id", macId)
          .maybeSingle();
        if (error) throw error;
        if (data) {
          const rakip = data.oyuncu1 === user?.id ? data.p2 : data.p1;
          setRakipAdi(rakip?.gorunen_ad ?? null);
          setRakipProfil(rakip ?? null);   // Paket 30 E: karşılaşma sahnesinin sağ kartı
        }
      } catch (e) {
        // Ad alınamadı — maça yine de geçilir, ama sebep sessizce yutulmasın.
        console.error("[Bildim] rakip adı alınamadı:", e);
      }
      setBulundu(true);
      sesRakipBulundu();   // Paket 29 E.2: "Rakip bulundu" yazısıyla aynı an
      window.setTimeout(() => bulunduRef.current(macId), KARSILASMA_ANIM_MS);
    },
    [user?.id]
  );

  // Son çare: normalde kuyruga_gir sunucudaki süre dolunca rakibi kendisi kurar
  // (migration 370). Yoklamalar bir sebeple sonuç vermediyse "max + pay" sn sonunda
  // doğrudan quick_match yoklanır.
  //
  // `quick_match` BOŞ dönebilir: sunucu, aramaya özgü süre dolmadan rakibi
  // kurmaz (bkz. migration 370). Bu yüzden tek seferlik değil, id gelene kadar
  // saniyede bir yokluyoruz.
  // Bu yolda ekranda "bot" kelimesi GEÇMEZ — gizli botun gizli kalması bu
  // ekrandan başlıyor.
  const sonCare = useCallback(async () => {
    if (bittiRef.current) return;
    setBotaDusuldu(true);
    clearInterval(zamanlayiciRef.current);

    const dene = async () => {
      if (bittiRef.current) return true;
      try {
        const { data, error } = await supabase.rpc("quick_match", {
          p_kategori: kategori ?? null,
          p_dereceli: dereceli,
          p_jokersiz: jokersiz,
        });
        if (error) throw error;
        if (data) { bitir(data); return true; }
        return false;                       // sunucu hâlâ arıyor
      } catch (e) {
        setHata(tt("Maç başlatılamadı. Bağlantını kontrol edip tekrar dene."));
        console.error("[Bildim] quick_match:", e);
        return true;                        // hata: yoklamayı durdur
      }
    };

    if (await dene()) return;
    const baslangic = Date.now();
    zamanlayiciRef.current = setInterval(async () => {
      if (Date.now() - baslangic > HAZIRLIK_SINIR_MS) {
        clearInterval(zamanlayiciRef.current);
        if (!bittiRef.current) {
          console.error("[Bildim] quick_match: üst sınır doldu, maç kimliği gelmedi");
          setHata(tt("Maç başlatılamadı. Bağlantını kontrol edip tekrar dene."));
        }
        return;
      }
      if (await dene()) clearInterval(zamanlayiciRef.current);
    }, 1000);
  }, [kategori, dereceli, jokersiz, bitir]);

  const yenidenDene = useCallback(() => {
    clearInterval(zamanlayiciRef.current);
    clearTimeout(yoklamaRef.current);
    bittiRef.current = false;
    setHata(null);
    setBotaDusuldu(false);
    setGecen(0);
    setDeneme((n) => n + 1);
  }, []);

  useEffect(() => {
    let iptal = false;
    // A6: kuyruk yoklaması saniyede bir değil ~3 sn'de bir (oyun_ayarlari.rakip_ara_yoklama_ms).
    // Saniyede birken tek arama 15 kuyruga_gir çağrısı yapıyordu; art arda iki arama sunucudaki
    // dakikada 30 sınırına (hiz_siniri) takılıp "Rakip aranamadı" hatası veriyordu.
    let yoklamaMs = YOKLAMA_VARSAYILAN_MS;
    ayar("rakip_ara_yoklama_ms", YOKLAMA_VARSAYILAN_MS).then((v) => {
      if (Number.isFinite(v) && v >= 1000) yoklamaMs = v;
    });
    // İstemci en fazla "max + pay" sn yoklar (sunucunun seçtiği süre bunu aşmaz).
    let sinirSn = BOT_MAX_VARSAYILAN_SN + BEKLEME_PAYI_SN;
    ayar("eslesme_bot_max_sn", BOT_MAX_VARSAYILAN_SN).then((v) => {
      if (Number.isFinite(v) && v > 0) sinirSn = Math.ceil(v) + BEKLEME_PAYI_SN;
    });

    // Sonraki yoklamayı ±%25 oynayan aralıkla kur (bitene/iptale kadar)
    const sonrakiniKur = () => {
      if (iptal || bittiRef.current) return;
      const aralik = yoklamaMs * (1 - YOKLAMA_OYNAMA + Math.random() * 2 * YOKLAMA_OYNAMA);
      yoklamaRef.current = window.setTimeout(async () => {
        await dene();
        sonrakiniKur();
      }, aralik);
    };

    const dene = async () => {
      if (iptal || bittiRef.current) return;
      try {
        const { data, error } = await supabase.rpc("kuyruga_gir", {
          p_kategori: kategori ?? null,
          p_dereceli: dereceli,
          p_jokersiz: jokersiz,
        });
        if (error) throw error;
        if (data) bitir(data);
      } catch (e) {
        // Hız sınırı geçici: bu yoklama atlanır, arama sürer (sonraki yoklama ya da sınırdaki son çare).
        if (/Çok hızlı/i.test(e?.message ?? "")) {
          console.warn("[Bildim] kuyruga_gir hız sınırı — yoklama atlandı:", e?.message);
          return;
        }
        setHata(tt("Rakip aranamadı. Bağlantını kontrol edip tekrar dene."));
        console.error("[Bildim] kuyruga_gir:", e);
        iptal = true;   // hata: yoklama ve sayaç durur
        clearInterval(zamanlayiciRef.current);
      }
    };

    dene().then(sonrakiniKur);
    // Sayaç saniyede bir yukarı sayar; sınır dolunca son çare (quick_match) devreye girer.
    let sn = 0;
    zamanlayiciRef.current = setInterval(() => {
      sn += 1;
      setGecen(sn);
      if (sn >= sinirSn) {
        clearInterval(zamanlayiciRef.current);
        clearTimeout(yoklamaRef.current);
        iptal = true;
        sonCare();
      }
    }, 1000);

    return () => {
      iptal = true;
      clearInterval(zamanlayiciRef.current);
      clearTimeout(yoklamaRef.current);
      // supabase.rpc() bir PostgrestFilterBuilder döndürür: thenable ama Promise
      // DEĞİL, .catch() metodu yok. Doğrudan .catch çağrısı TypeError atıp
      // ekranı boş bırakıyordu. then'in ikinci argümanı hatayı güvenle yutar.
      if (!bittiRef.current) rpcDene("kuyruktan_cik");
    };
  }, [kategori, dereceli, jokersiz, bitir, sonCare, deneme]);

  const vazgec = async () => {
    await temizle();
    onIptal();
  };

  // Yön A: QtModal (body'ye portal — sayfa içindeki yığılma bağlamına takılmaz).
  // Arama sürerken Esc / örtü "Vazgeç" gibi davranır; eşleşme anında kapatılamaz.
  return (
    <QtModal
      acik
      className="a-arama"
      kapatDugmesi={false}
      ortuKapatir={false}
      onKapat={rakipAdi || bulundu ? undefined : vazgec}
    >
      {/* Paket 30 E: maskot yerine karşılaşma sahnesi (sol: sen · VS · sağ: rakip) */}
      <KarsilasmaSahnesi
        rakip={rakipProfil}
        bulundu={bulundu}
        bosEtiket={hata ? tt("Rakip bulunamadı")
          : botaDusuldu ? tt("Hazırlanıyor…") : undefined}
        baslik={rakipAdi
          ? `${tt("Rakip bulundu:")} ${rakipAdi}`
          : bulundu
            ? tt("Rakip bulundu!")
            : hata
              ? tt("Maç başlatılamadı")
              : botaDusuldu ? tt("Maç hazırlanıyor…") : tt("Rakip aranıyor…")}
      >
        <p className="a-arama-alt">
          {kategori ? kategoriEtiket(kategori) : tt("Karışık")} {tt("kategorisinde")}
          {botaDusuldu
            ? tt(" seviyene yakın bir rakiple eşleştiriyoruz.")
            : tt(" seninle aynı seviyede birini arıyoruz.")}
        </p>

        {/* Geçen süre (yukarı sayar): hedef süre sunucuda, geri sayım gösterilmez */}
        {!botaDusuldu && !rakipAdi && !hata && (
          <p className="a-arama-sayac qt-sayi" role="timer" aria-live="off">{gecen} {tt("sn")}</p>
        )}

        {hata && <p className="a-modsecim-hata" role="alert">{hata}</p>}

        {!rakipAdi && (
          <div className="a-arama-eylem">
            {/* Paket 41 F: hata/sınır dolunca Tekrar dene birincil. Bot düğmesi E.2 ile kalktı. */}
            {hata && (
              <QtDugme tamGenislik onClick={yenidenDene}>{tt("Tekrar dene")}</QtDugme>
            )}
            <QtDugme tur="ikincil" tamGenislik onClick={vazgec}>{tt("Vazgeç")}</QtDugme>
          </div>
        )}
      </KarsilasmaSahnesi>
    </QtModal>
  );
}
