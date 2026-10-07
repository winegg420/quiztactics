import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { tt } from "../../oyun/lib/dil.js";
import { supabase, supabaseHazir } from "../lib/supabase.js";
import { fbBelirteciSakla, fbKimligiKaydet, facebookOturumuMu } from "../../oyun/lib/facebookArkadas.js";

const AuthContext = createContext(null);

// ============================================================
// SOĞUK AÇILIŞ (7 Eki 2026) — oturum + profil önceden.
//
// Eskiden ilk çizim iki ağ turunu bekliyordu: getSession (erişim belirteci eskiyse
// supabase-js önce yeniler, ~0,5 sn) → profilim (~0,4 sn). Ana sayfa ancak ondan sonra
// çiziliyordu. Şimdi:
//   · cihazda kayıtlı oturum (supabase-js'in kendi anahtarı) varsa ilk çizimde kullanılır;
//     belirteç yenilemesi arka planda sürer — supabase-js her isteği yenileme bitene kadar
//     bekletir, yani sorgular yine geçerli belirteçle gider;
//   · son okunan profil aynı kullanıcı için cihazda saklanır, ilk çizim onunla yapılır,
//     profilim gelince güncellenir (önce kayıtlı, sonra taze).
// Yenileme başarısız olursa supabase-js SIGNED_OUT yayınlar → oturum/profil temizlenir,
// giriş ekranı gelir (eski davranış). OAuth dönüşünde (adreste kod/belirteç) kayıtlı oturum
// KULLANILMAZ: yeni giriş beklenir.
// ============================================================
const PROFIL_ANAHTAR = "qt_profil_onbellek";

function kayitliOturum() {
  try {
    if (!supabase) return null;
    const { search, hash } = window.location;
    if (/[?&#](code|access_token|refresh_token|error)=/.test(search + hash)) return null;
    const anahtar = supabase.auth?.storageKey;
    if (!anahtar) return null;
    const ham = localStorage.getItem(anahtar);
    if (!ham) return null;
    const o = JSON.parse(ham);
    return o?.user?.id && o.refresh_token ? o : null;
  } catch {
    return null;   // depolama kapalı / bozuk kayıt: normal yol (getSession)
  }
}

function kayitliProfil(userId) {
  try {
    if (!userId) return null;
    const o = JSON.parse(localStorage.getItem(PROFIL_ANAHTAR) ?? "null");
    return o?.id === userId && o.profil ? o.profil : null;
  } catch {
    return null;
  }
}

function profilSakla(userId, profil) {
  try {
    if (!userId || !profil) localStorage.removeItem(PROFIL_ANAHTAR);
    else localStorage.setItem(PROFIL_ANAHTAR, JSON.stringify({ id: userId, profil }));
  } catch { /* depolama kapalı: önbelleksiz devam */ }
}

export function AuthProvider({ children }) {
  // (Facebook yardımcıları: arkadaş önerisi için belirteç + kimlik)
  const [ilk] = useState(() => {
    const oturum = supabaseHazir ? kayitliOturum() : null;
    return { oturum, profil: kayitliProfil(oturum?.user?.id) };
  });
  const [session, setSession] = useState(ilk.oturum);
  const [profile, setProfile] = useState(ilk.profil);
  const [loading, setLoading] = useState(!ilk.oturum);
  // Paket 41 A: profil okunamadıysa sayfalar sahte "0 puan" yerine hata durumu çizsin
  const [profilHata, setProfilHata] = useState(false);

  // Kendi profilimiz RPC ile gelir. Tablodan `select("*")` çekmek, gerçek addan
  // türeyen `username` ve Google fotoğrafı gibi özel alanları istemciye açmak
  // demekti; o sütunlar artık başkasına kapalı (migration 081).
  const refreshProfile = useCallback(async (userId) => {
    if (!supabase || !userId) return;
    try {
      const { data, error } = await supabase.rpc("profilim");
      if (error) throw error;
      // Takma ad seçilmeden önce sunucu görünen adı "Oyuncu" üretir → oyuncunun dilinde göster (EN: Player)
      if (data) {
        const profil = data.takma_ad_secildi === false && data.gorunen_ad === "Oyuncu" ? { ...data, gorunen_ad: tt("Oyuncu") } : data;
        setProfile(profil);
        profilSakla(userId, profil);
      }
      setProfilHata(false);
    } catch (e) { console.warn("[Auth] profilim başarısız:", e?.message ?? e);
      setProfilHata(true);
      /* ağ hatası ya da RPC yoksa profil önceki hâlinde kalır */
    }
  }, []);

  useEffect(() => {
    if (!supabaseHazir) {
      setLoading(false);
      return;
    }
    const davetTalep = async (userId) => {
      const davetEden = localStorage.getItem("bildim_davet");
      if (!davetEden) return;
      if (
        davetEden === userId ||
        !/^[0-9a-f-]{36}$/i.test(davetEden)
      ) {
        localStorage.removeItem("bildim_davet");
        return;
      }
      const { data, error } = await supabase.rpc("claim_referral", {
        p_davet_eden: davetEden,
      });
      if (!error) {
        localStorage.removeItem("bildim_davet");
        if (data) refreshProfile(userId);
      }
    };

    // Davet linkiyle gelindiyse (/oyun/davet/:kod) kod saklanır; giriş
    // yapılınca arkadaşlık isteği otomatik gönderilir.
    const davetKoduUygula = async (userId) => {
      let kod = null;
      try { kod = localStorage.getItem('bildim_davet_kodu'); } catch { return; }
      if (!kod || kod.length !== 8) return;
      try {
        const { error } = await supabase.rpc('arkadas_davet_kodu_ile_ekle', { p_kod: kod });
        if (!error) {
          try { localStorage.removeItem('bildim_davet_kodu'); } catch { /* özel mod */ }
          refreshProfile(userId);
        }
      } catch (e) { console.warn("[Auth] arkadas_davet_kodu_ile_ekle başarısız:", e?.message ?? e);
        /* profil henüz tamamlanmamış olabilir — sonraki girişte tekrar denenir */
      }
    };

    // getSession YALNIZ oturumu kurar ve yüklemeyi kapatır.
    // Profil yükleme ve davet işleri burada DEĞİL, aşağıdaki
    // onAuthStateChange'de yapılır: supabase-js abone olunduğu anda
    // INITIAL_SESSION olayını yayınlıyor, dolayısıyla iki yol da çalışınca
    // profilim RPC'si her sayfa yüklemesinde iki kez çağrılıyordu
    // (canlı ağ denetimi). Tek kaynak onAuthStateChange.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (olay, session) => {
        setSession(session);
        // Belirteç yenilemesi profili/davetleri değiştirmez: açılışta eskimiş belirteçle
        // TOKEN_REFRESHED + INITIAL_SESSION art arda geliyor, profilim iki kez çağrılıyordu.
        if (session && olay === "TOKEN_REFRESHED") {
          setLoading(false);
          return;
        }
        if (session) {
          refreshProfile(session.user.id);
          davetTalep(session.user.id);
          davetKoduUygula(session.user.id);
          // Facebook ile girildiyse: belirteci oturumluk sakla (arkadaş
          // önerisi için gerekli) ve FB kimliğini profile yaz. Belirteç
          // YALNIZ girişin hemen ardından geliyor, sonra kayboluyor.
          if (session.provider_token && facebookOturumuMu(session.user)) {
            fbBelirteciSakla(session.provider_token);
          }
          if (facebookOturumuMu(session.user)) fbKimligiKaydet(session.user);
        } else {
          setProfile(null);
          profilSakla(null);
        }
        // Oturum yoksa da yükleme kapanmalı: kapalı oturumla açılışta
        // "Yükleniyor…" ekranında takılı kalınmasın.
        setLoading(false);
      }
    );
    return () => subscription.unsubscribe();
  }, [refreshProfile]);

  // Online takibi (Faz 5): oturum açıkken ~60 sn'de bir kalp_at() → profiles.last_seen.
  // Kimliğe bağlı: belirteç yenilemesi (yeni session nesnesi) kalp_at'ı yeniden başlatmasın.
  const oturumKimlik = session?.user?.id ?? null;
  // Tüm oyunlar bu paylaşılan kabuğu kullandığı için tek yerde yapılır.
  useEffect(() => {
    if (!supabaseHazir || !oturumKimlik) return;
    let durdu = false;
    const at = async () => {
      if (durdu || document.visibilityState !== "visible") return;
      try {
        await supabase.rpc("kalp_at");
      } catch (e) { console.warn("[Auth] kalp_at başarısız:", e?.message ?? e);
        /* RPC yoksa (migration bekliyor) veya ağ hatası — sessiz geç */
      }
    };
    at();
    const id = setInterval(at, 60000);
    document.addEventListener("visibilitychange", at);
    return () => {
      durdu = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", at);
    };
  }, [oturumKimlik]);

  const signOut = () => supabase?.auth.signOut();

  // Belirteç yenilenince supabase-js yeni bir `user` nesnesi verir; içerik aynıysa eski nesne
  // korunur — `[user]`a bağlı etkiler (Realtime abonelikleri, sayımlar) boşuna yeniden kurulmasın.
  const kullaniciRef = useRef(null);
  const yeniKullanici = session?.user ?? null;
  if (!yeniKullanici) kullaniciRef.current = null;
  else if (kullaniciRef.current !== yeniKullanici
    && (kullaniciRef.current?.id !== yeniKullanici.id || JSON.stringify(kullaniciRef.current) !== JSON.stringify(yeniKullanici)))
    kullaniciRef.current = yeniKullanici;

  return (
    <AuthContext.Provider
      value={{
        session,
        user: kullaniciRef.current,
        profile,
        loading,
        refreshProfile,
        signOut,
        profilHata,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
