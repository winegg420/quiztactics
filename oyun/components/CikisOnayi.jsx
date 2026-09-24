// ============================================================
// ÇIKIŞ ONAYI (D-102/D-202) — Avatar menüsü ve Profil › Ayarlar'daki "Çıkış Yap" aynı pencereyi açar.
// Misafir (anonim) hesapta çıkış GERİ ALINAMAZ: aynı hesaba bir daha girilemez, coin ve ilerleme
// kaybolur → uyarı + vurgulu "Önce hesabımı bağla" (Profil › Ayarlar › Hesabımı güvenceye al kartı)
// + "Yine de çık". Normal hesapta kısa onay: "Çıkış yapılsın mı?" Vazgeç / Çıkış yap.
// Pencere: QtModal (Turnuva / Grup çıkış onayıyla aynı bileşen). Çıkış akışı aynı (signOut).
// ============================================================
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../src/context/AuthContext.jsx";
import { QtDugme, QtModal } from "../tasarim/index.js";
import { misafirMi } from "./HesapGuvence.jsx";
import { tt } from "../lib/dil.js";
import { y } from "../lib/yol.js";

export default function CikisOnayi({ acik, onKapat }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [calisiyor, setCalisiyor] = useState(false);
  const misafir = misafirMi(user);

  const cik = async () => {
    if (calisiyor) return;
    setCalisiyor(true);
    try {
      await signOut();
    } catch (e) {
      console.error("[Bildim] çıkış yapılamadı:", e);
    } finally {
      setCalisiyor(false);
      onKapat?.();
    }
  };
  const bagla = () => {
    onKapat?.();
    // Profil › Ayarlar açılır ve "Hesabımı güvenceye al" kartına kaydırılır (ProfilePage › bagla=1)
    navigate(y("/profil?sekme=ayarlar&bagla=1"));
  };

  return (
    <QtModal
      acik={acik}
      onKapat={calisiyor ? undefined : onKapat}
      ortuKapatir={!calisiyor}
      kapatDugmesi={!calisiyor}
      baslik={misafir ? tt("Misafir hesabından çıkılsın mı?") : tt("Çıkış yapılsın mı?")}
      aciklama={misafir
        ? tt("Çıkarsan bu hesaba bir daha giremezsin; coinlerin ve ilerlemen kaybolur.")
        : tt("Tekrar giriş yapınca kaldığın yerden devam edersin.")}
      altlik={misafir ? (
        <div className="qt-cikis-dugmeler qt-cikis-dugmeler--dikey">
          <QtDugme ikon="kalkan" tamGenislik onClick={bagla} devreDisi={calisiyor} data-qt-ilk-odak>
            {tt("Önce hesabımı bağla")}
          </QtDugme>
          <QtDugme tur="ikincil" tamGenislik onClick={cik} yukleniyor={calisiyor}>
            {tt("Yine de çık")}
          </QtDugme>
        </div>
      ) : (
        <div className="qt-cikis-dugmeler">
          <QtDugme tur="ikincil" onClick={onKapat} devreDisi={calisiyor} data-qt-ilk-odak>{tt("Vazgeç")}</QtDugme>
          <QtDugme ikon="cikis" onClick={cik} yukleniyor={calisiyor}>{tt("Çıkış yap")}</QtDugme>
        </div>
      )}
    />
  );
}
