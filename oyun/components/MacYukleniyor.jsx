import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { y } from "../lib/yol.js";
import { tt } from "../lib/dil.js";
import { QtBosDurum, QtDugme, QtIskelet } from "../tasarim/index.js";
import "../tasarim/ekranlar/m1-mac.css";

const ZAMAN_ASIMI_MS = 8000;

/**
 * Maç sayfalarının yükleme ekranı.
 *
 * NEDEN: "Hızlı Olan Kazanır" maçında sorgu RLS özyinelemesi yüzünden hata
 * veriyordu, sayfa da hatayı yutup sonsuza dek "Yükleniyor…" gösteriyordu
 * (konsolda bile iz yoktu). Artık 8 saniyede veri gelmezse kullanıcı Türkçe
 * bir açıklama, "Tekrar dene" ve "Maçı iptal et" görüyor.
 */
export default function MacYukleniyor({ hata, onTekrarDene, onIptal, donusYolu, donusMetni }) {
  const navigate = useNavigate();
  const [gecikti, setGecikti] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setGecikti(true), ZAMAN_ASIMI_MS);
    return () => window.clearTimeout(t);
  }, []);

  if (!gecikti && !hata) {
    return (
      <div className="m1-yukleniyor" aria-busy="true" aria-label={tt("Yükleniyor…")}>
        <QtIskelet tur="satir" />
        <QtIskelet tur="kart" yukseklik={140} />
        <QtIskelet tur="dugme" adet={4} />
      </div>
    );
  }

  return (
    <QtBosDurum
      ikon="uyari"
      ton="yanlis"
      baslik={tt("Maç açılamadı")}
      // Paket 41 G: ham sunucu metni oyuncuya gösterilmez (çağıran console'a yazar)
      metin={
        hata
          // D-503: çağıran hataMesaji ile sınıflanmış metin verdiyse (bağlantı yok / sunucu / zaman aşımı) o gösterilir
          ? typeof hata === "string" && hata !== tt("Maç bilgisi alınamadı.")
            ? hata
            : tt("Maç bilgisi alınamadı. Bağlantını kontrol edip tekrar dene.")
          : tt("Maç bilgisi gelmedi. Bağlantın kesilmiş olabilir ya da maç artık geçerli değil.")
      }
      eylem={
        <div className="m1-dugmeler">
          {onTekrarDene && (
            <QtDugme
              tamGenislik
              ikon="yenile"
              onClick={() => {
                setGecikti(false);
                onTekrarDene();
              }}
            >
              {tt("Tekrar dene")}
            </QtDugme>
          )}
          {onIptal && (
            <QtDugme tur="tehlike" tamGenislik onClick={onIptal}>
              {tt("Maçı iptal et")}
            </QtDugme>
          )}
          <QtDugme tur="ikincil" tamGenislik onClick={() => navigate(donusYolu ?? y("/meydan"))}>
            {donusMetni ?? tt("Meydan okumalara dön")}
          </QtDugme>
        </div>
      }
    />
  );
}
