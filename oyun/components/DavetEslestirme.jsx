import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase.js";
import { useAuth } from "../../src/context/AuthContext.jsx";
import { uygulamaIcindeMi, cihazTipi } from "../../src/lib/uygulamaKipi.js";
import { QtModal, QtDugme, QtAvatar, QtToast, QtToastYuvasi } from "../tasarim/index.js";
import "../tasarim/ekranlar/hata-kurtarma.css";   // .qt-cikis-dugmeler (iki düğme yan yana)
import { hataMesaji } from "../lib/hata.js";
import { tt } from "../lib/dil.js";

// ============================================================
// Bekleyen davet eşleştirme (Yalnız uygulama, Aşama 4 · migration 1096).
//
// iOS'ta (ve uygulama içi tarayıcıdan gelince) tarayıcıda açılan davet linki uygulamaya geçmez.
// Kurulum sayfası daveti sunucuya "bekleyen" olarak yazar (davet_bekle_kaydet). Burada, uygulamada
// giriş yapan YENİ hesap (≤ 48 saat) için sunucu aynı ağ + cihaz tipinde TEK bekleyen davet bulursa
// "X seni davet etti, doğru mu?" diye sorulur. Ödül/arkadaşlık YALNIZ "Evet"ten sonra verilir.
// Paylaşılan ağda (birden fazla bekleyen) sunucu hiçbir şey döndürmez → oyuncu Arkadaşlar ›
// "Davet koduyla ekle"yi kullanır.
//
// Oturum başına bir kez sorulur. Tarayıcıdan taşınan kod zaten varsa (Android/masaüstü ortak depo,
// AuthContext uygular) sunucuya hiç gidilmez.
// ============================================================

const YENI_HESAP_MS = 48 * 60 * 60 * 1000;
const OTURUM_ANAHTAR = "qt_davet_eslestirme_bakildi";

function yerelDavetVar() {
  try {
    return Boolean(localStorage.getItem("bildim_davet") || localStorage.getItem("bildim_davet_kodu"));
  } catch {
    return false;
  }
}

export default function DavetEslestirme() {
  const { user } = useAuth();
  const [davet, setDavet] = useState(null);   // { id, tur, gorunen_ad, avatar_url }
  const [calisiyor, setCalisiyor] = useState(false);
  const [sonuc, setSonuc] = useState(null);   // { ton, metin }

  useEffect(() => {
    if (!user?.id || !uygulamaIcindeMi()) return undefined;
    const yas = Date.now() - new Date(user.created_at ?? 0).getTime();
    if (!(yas >= 0 && yas < YENI_HESAP_MS)) return undefined;
    try {
      if (sessionStorage.getItem(OTURUM_ANAHTAR) === user.id) return undefined;
      sessionStorage.setItem(OTURUM_ANAHTAR, user.id);
    } catch { /* özel mod: bu açılışta bir kez */ }
    if (yerelDavetVar()) return undefined;

    let aktif = true;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("davet_bekleyen_bul", { p_cihaz: cihazTipi() });
        if (error) throw error;
        const ilk = Array.isArray(data) ? data[0] : null;
        if (aktif && ilk?.id) setDavet(ilk);
      } catch (e) {
        // Eşleştirme kritik değil: oyuncu elle kod girebilir.
        console.warn("[Davet] bekleyen davet okunamadı:", e?.message ?? e);
      }
    })();
    return () => { aktif = false; };
  }, [user?.id, user?.created_at]);

  const cevapla = async (kabul) => {
    if (!davet || calisiyor) return;
    setCalisiyor(true);
    try {
      const { data, error } = await supabase.rpc("davet_bekleyen_cevapla", { p_id: davet.id, p_kabul: kabul });
      if (error) throw error;
      const durum = (Array.isArray(data) ? data[0] : data)?.durum;
      setDavet(null);
      if (!kabul) return;
      const ad = davet.gorunen_ad || tt("Arkadaşın");
      if (durum === "arkadas_oldu" || durum === "zaten_arkadas") setSonuc({ ton: "dogru", metin: tt("{ad} ile artık arkadaşsınız.", { ad }) });
      else if (durum === "istek_gonderildi") setSonuc({ ton: "dogru", metin: tt("{ad} kişisine arkadaşlık isteği gönderildi.", { ad }) });
      else if (durum === "baglandi") setSonuc({ ton: "dogru", metin: tt("{ad} adlı oyuncunun daveti hesabına bağlandı.", { ad }) });
      else setSonuc({ ton: "bilgi", metin: tt("Davet bu hesaba bağlanamadı.") });
    } catch (e) {
      console.warn("[Davet] cevap gönderilemedi:", e?.message ?? e);
      setDavet(null);
      setSonuc({ ton: "yanlis", metin: hataMesaji(e, tt("Davet işlenemedi. Arkadaşlar sayfasından davet koduyla ekleyebilirsin.")) });
    } finally {
      setCalisiyor(false);
    }
  };

  if (sonuc) {
    return (
      <QtToastYuvasi konum="ust">
        <QtToast ton={sonuc.ton} metin={sonuc.metin} onKapat={() => setSonuc(null)} />
      </QtToastYuvasi>
    );
  }
  if (!davet) return null;

  const ad = davet.gorunen_ad || tt("Bir oyuncu");
  return (
    <QtModal
      acik
      onKapat={calisiyor ? undefined : () => cevapla(false)}
      ortuKapatir={false}
      kapatDugmesi={false}
      baslik={tt("{ad} seni davet etti, doğru mu?", { ad })}
      aciklama={davet.tur === "arkadas"
        ? tt("Evet dersen arkadaş olursunuz. Tanımıyorsan Hayır de.")
        : tt("Evet dersen davet hesabına bağlanır. Tanımıyorsan Hayır de.")}
      altlik={
        <div className="qt-cikis-dugmeler">
          <QtDugme tur="ikincil" tamGenislik onClick={() => cevapla(false)} devreDisi={calisiyor}>{tt("Hayır")}</QtDugme>
          <QtDugme tamGenislik onClick={() => cevapla(true)} yukleniyor={calisiyor} data-qt-ilk-odak>{tt("Evet")}</QtDugme>
        </div>
      }
    >
      <div style={{ display: "flex", justifyContent: "center", padding: "4px 0 8px" }}>
        <QtAvatar src={davet.avatar_url || undefined} ad={ad} boyut="l" />
      </div>
    </QtModal>
  );
}
