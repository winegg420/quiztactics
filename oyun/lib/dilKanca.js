// ============================================================
// DİL KANCASI — React tarafı
//
// `dil.js` saf mantıktır (React/DOM bilmez). Burası onu bileşenlere bağlar:
// geçerli dili çözer, TR/EN değiştiricisini uygular ve seçimi kalıcılaştırır.
//
// Kalıcılık iki yerde:
//   • localStorage — giriş yapmamış ziyaretçi için (tek yer burası)
//   • profiles.dil — giriş yapmışsa, cihazdan bağımsız olsun diye
// ============================================================

import { Fragment, createElement, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../src/lib/supabase.js";
import { useAuth } from "../../src/context/AuthContext.jsx";
import { otomatikYenile } from "../../src/lib/yenilemeSigortasi.js";
import { DILLER, aktifDil, dilAboneOl, dilCoz, dilKaydet, dilUygula, girisDiliniAl, sozlukYukle, tYap } from "./dil.js";
import { dilUyarisiGoster } from "./dilUyari.js";

// Profil bu kadar yeniyse "yeni hesap" sayılır: giriş ekranındaki dil profile yazılır. Eski hesabın
// kayıtlı tercihi hiçbir zaman ezilmez (D-203).
const YENI_HESAP_MS = 30 * 60 * 1000;
// useDil birçok bileşende aynı anda çalışır: giriş dili yazılırken hiçbir örnek profilin eski dilini
// tarayıcıya yazıp sayfayı yenilemesin.
let girisDiliYaziliyor = false;

// DİL KAYNAĞI — TEK YÖN (Ida, 14 Eki 2026):
//   • Giriş yapmış oyuncuda kaynak `profiles.dil`. Açılışta profil dili tarayıcıdakinden farklıysa
//     localStorage'a yazılır ve SAYFA YENİLENMEDEN uygulanır (`dilUygula` + `DilKoku` ağacı yeniden kurar).
//   • Oyuncu dili uygulamada değiştirirse önce profil güncellenir, sonra tek bir yenileme (sigortalı).
//     Profil yazılamazsa dil DEĞİŞMEZ (kaynak profil; yenilemeden sonra eski dile dönülmesin).
// Eski hata: açılış eşitlemesi her seferinde sayfayı yeniliyordu; "aynı hedefe ikinci kez yenileme"
// koruması dilKaydet'ten SONRA bakıldığı için hiç çalışmıyordu → tarayıcı dili dışarıdan farklı
// yazıldığında sonsuz döngü (14 Eki 2026 olayı, 5 dk'da ~1.000 istek).

/**
 * @returns {{dil:string, ceviri:(a:string,d?:object)=>string, dilDegistir:(d:string)=>void}}
 */
/**
 * Elle dil değişiminden sonra tek yenileme — ortak sigortadan geçer (30 sn'de en çok 2).
 * Sigorta atarsa (ya da depolama kapalıysa) dil yenilemesiz uygulanır: oyuncu yine seçtiği dili görür.
 */
function sayfayiYenile(kaynak, dil) {
  if (!otomatikYenile(kaynak)) dilUygula(dil, true);
}

/**
 * Kök sarmalayıcı: dil yenilemesiz değişince (dilUygula) altındaki ağacı yeniden kurar; kancasız
 * `tt()` metinleri de yeni dilde çizilir. Oturum (AuthProvider) ve adres (BrowserRouter) üstte kalır.
 */
export function DilKoku({ children }) {
  const [anahtar, setAnahtar] = useState(aktifDil);
  useEffect(() => dilAboneOl((d) => setAnahtar(d)), []);
  return createElement(Fragment, { key: anahtar }, children);   // .js dosyası: JSX yok
}

export function useDil() {
  const { user, profile, refreshProfile } = useAuth();
  const [dil, setDil] = useState(() => dilCoz(profile));

  // Profil sonradan gelirse (giriş yapılmışsa) tercih onun.
  useEffect(() => {
    // D-203: yeni hesapta giriş ekranındaki dil profile bir kez yazılır (profil 'tr' doğup ezmesin).
    if (profile?.id && user?.id) {
      const giris = girisDiliniAl();
      const olustu = Date.parse(profile.created_at ?? "");
      if (giris && giris !== profile.dil && Number.isFinite(olustu) && Date.now() - olustu < YENI_HESAP_MS) {
        girisDiliYaziliyor = true;
        (async () => {
          try {
            const { error } = await supabase.from("profiles").update({ dil: giris }).eq("id", user.id);
            if (error) throw error;
            await refreshProfile?.(user.id);   // profil 'giris' diliyle döner; aşağıdaki kural yenilemez
          } catch (e) {
            console.error("[Dil] giriş dili profile yazılamadı:", e);
          } finally {
            girisDiliYaziliyor = false;
          }
        })();
        return;
      }
    }
    if (girisDiliYaziliyor) return;
    const yeni = dilCoz(profile);
    setDil((eski) => (eski === yeni ? eski : yeni));
    // Kancasız metinler (tt) sayfanın dilindedir; profil başka dil diyorsa tarayıcıya yazıp
    // YENİLEMEDEN uygula (DilKoku ağacı yeniden kurar). Yenileme olmadığı için döngü de olamaz.
    const p = profile?.dil;
    if (!DILLER.includes(p) || p === aktifDil()) return;
    // Sözlük (İngilizce tembel parça) inmeden dile geçilmez: inemezse sayfa bu açılışta eski dilde kalır.
    let iptal = false;
    sozlukYukle(p)
      .then(() => {
        if (iptal) return;
        dilUygula(p);
      })
      .catch((e) => console.error("[Dil] sözlük yüklenemedi:", e?.message ?? e));
    return () => { iptal = true; };
  }, [profile]);

  const dilDegistir = useCallback(
    (yeni) => {
      if (!DILLER.includes(yeni)) return;
      const eski = aktifDil();
      (async () => {
        // Önce sözlük, sonra dil: İngilizce parça inemezse (ağ hatası) Türkçede kalınır, kısa uyarı gösterilir.
        try {
          await sozlukYukle(yeni);
        } catch (e) {
          console.error("[Dil] sözlük yüklenemedi:", e?.message ?? e);
          dilUyarisiGoster();
          return;
        }
        if (!user?.id) {
          setDil(yeni);
          dilKaydet(yeni);
          if (eski !== yeni) sayfayiYenile("dil-secimi", yeni);
          return;
        }
        // Kaynak profil: ÖNCE profile yaz, sonra tarayıcıya. Yazılamazsa dil değişmez + kısa uyarı
        // (yenilemeden sonra açılış eşitlemesi profildeki eski dile döndürürdü).
        try {
          const { error } = await supabase
            .from("profiles")
            .update({ dil: yeni })
            .eq("id", user.id);
          if (error) throw error;
        } catch (e) {
          console.error("[Dil] profile yazilamadi:", e);
          dilUyarisiGoster("Language couldn't be saved — check your connection. · Dil kaydedilemedi, bağlantını kontrol et.");
          return;
        }
        setDil(yeni);
        dilKaydet(yeni);
        if (eski !== yeni) sayfayiYenile("dil-secimi", yeni);
        else {
          try { await refreshProfile?.(user.id); } catch { /* profil sonra tazelenir */ }
        }
      })();
    },
    [user?.id, refreshProfile]
  );

  // Dil değişmedikçe aynı fonksiyon: efekt bağımlılığında kullanılabilsin.
  const ceviri = useMemo(() => tYap(dil), [dil]);
  return { dil, ceviri, dilDegistir };
}
