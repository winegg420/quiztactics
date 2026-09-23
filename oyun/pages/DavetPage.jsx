import { useEffect, useRef, useState } from "react";
import { QtKart, QtBosDurum, QtDugme } from "../tasarim/index.js";
import "../tasarim/ekranlar/l-sosyal.css";
import { hataMesaji } from "../lib/hata.js";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../src/lib/supabase.js";
import { useAuth } from "../../src/context/AuthContext.jsx";
import { y } from "../lib/yol.js";
import { tt } from "../lib/dil.js";

const DEPO_ANAHTAR = "bildim_davet_kodu";

/**
 * /oyun/davet/:kod — davet linkiyle arkadaş ekleme.
 * Giriş yoksa kod hatırlanır; kullanıcı giriş yapınca otomatik istek gönderilir
 * (bkz. AuthContext oturum açılışında da aynı anahtar okunur).
 */
export default function DavetPage() {
  const { kod } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [durum, setDurum] = useState("bekliyor"); // bekliyor | basarili | hata
  const [mesaj, setMesaj] = useState(tt("Davet işleniyor…"));
  const calistiRef = useRef(false);

  useEffect(() => {
    const temiz = (kod ?? "").trim().toUpperCase();

    if (!temiz || temiz.length !== 8) {
      setDurum("hata");
      setMesaj(tt("Bu davet linki geçersiz görünüyor."));
      return;
    }

    // Giriş yoksa kodu sakla; giriş sonrası burada tekrar denenecek
    if (!user) {
      try {
        localStorage.setItem(DEPO_ANAHTAR, temiz);
      } catch {
        /* özel mod */
      }
      setMesaj(tt("Devam etmek için giriş yapman gerekiyor…"));
      return;
    }

    // Kurulum (takma ad/avatar/şehir) bitmeden istek göndermeyelim;
    // Layout zaten sihirbazı gösteriyor, biz bekleyelim.
    if (profile && (!profile.takma_ad_secildi || !profile.ulke)) {
      setMesaj(tt("Önce profilini tamamla, sonra davet otomatik uygulanacak."));
      try {
        localStorage.setItem(DEPO_ANAHTAR, temiz);
      } catch {
        /* özel mod */
      }
      return;
    }

    if (calistiRef.current) return;
    calistiRef.current = true;

    (async () => {
      try {
        const { data, error } = await supabase.rpc("arkadas_davet_kodu_ile_ekle", {
          p_kod: temiz,
        });
        if (error) throw error;
        const sonuc = Array.isArray(data) ? data[0] : data;
        const ad = sonuc?.gorunen_ad ?? tt("Oyuncu");
        const mesajlar = {
          istek_gonderildi: tt("{0} kişisine arkadaşlık isteği gönderildi", { 0: ad }),
          arkadas_oldu: tt("{0} artık arkadaşın!", { 0: ad }),
          zaten_arkadas: tt("{0} zaten arkadaşın.", { 0: ad }),
        };
        setDurum("basarili");
        setMesaj(mesajlar[sonuc?.durum] ?? tt("İstek gönderildi"));
        try {
          localStorage.removeItem(DEPO_ANAHTAR);
        } catch {
          /* özel mod */
        }
        setTimeout(() => navigate(y("/arkadaslar")), 1800);
      } catch (e) {
        setDurum("hata");
        setMesaj(hataMesaji(e, tt("Davet uygulanamadı.")));
      }
    })();
  }, [kod, user, profile, navigate]);

  const ikon = durum === "basarili" ? "onay" : durum === "hata" ? "uyari" : "hediye";
  const ton = durum === "basarili" ? "dogru" : durum === "hata" ? "yanlis" : "mor";
  return (
    <div className="ls-sayfa dv-sayfa">
      <QtKart dolgu="b" className="dv-kart">
        <div role={durum === "hata" ? "alert" : "status"} aria-live="polite">
          <QtBosDurum
            ikon={ikon}
            ton={ton}
            baslik={durum === "basarili" ? tt("Davet uygulandı") : tt("Arkadaş daveti")}
            metin={mesaj}
            eylem={
              <QtDugme tur={durum === "hata" ? "birincil" : "ikincil"} ikon="kisiler" onClick={() => navigate(y("/arkadaslar"))}>
                {tt("Arkadaşlara git")}
              </QtDugme>
            }
          />
        </div>
      </QtKart>
    </div>
  );
}
