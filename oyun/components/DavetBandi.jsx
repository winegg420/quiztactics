import { useCallback, useEffect, useState } from "react";
import { hataMesaji } from "../lib/hata.js";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../src/lib/supabase.js";
import { useAuth } from "../../src/context/AuthContext.jsx";
import { QtIkon, QtDugme, QtIkonDugme, sinif } from "../tasarim/index.js";
import CerceveliAvatar from "./CerceveliAvatar.jsx";
import { kategoriEtiket } from "../lib/kategoriler.js";
import { y } from "../lib/yol.js";
import { tt } from "../lib/dil.js";

const TUR_BILGI = {
  mac: { etiket: tt("sana meydan okudu"), ikon: "kilic", sinif: "tur-mac", yol: "mac" },
  rovans: { etiket: tt("rövanş istiyor"), ikon: "kilic", sinif: "tur-rovans", yol: "mac" },
  grup: { etiket: tt("grup maçına çağırdı"), ikon: "kisiler", sinif: "tur-grup", yol: "grup-mac" },
  hizli: { etiket: tt("hızlı maça çağırdı"), ikon: "hizli", sinif: "tur-hizli", yol: "hizli-mac" },
  duello: { etiket: tt("seni düelloya çağırdı"), ikon: "kilic", sinif: "tur-duello", yol: "duello" },
};

const CEVAP_RPC = {
  mac: ["respond_challenge", "p_match_id"],
  rovans: ["respond_challenge", "p_match_id"],
  grup: ["respond_group_challenge", "p_group_match_id"],
  hizli: ["respond_hizli_davet", "p_hizli_mac_id"],
  duello: ["duello_davet_cevap", "p_id"],
};

// Düelloda kabul RPC'si DAVET id'sini alır ama DÜELLO id'sini döndürür; yönlendirme
// dönen değerle yapılır (kayit_id ile gidilirse var olmayan düelloya gidilir).
const DONEN_ID_ILE_GIT = new Set(["duello"]);

/**
 * Üst davet bandı — üst çubuğun hemen altında, sayfa kaydırılsa da görünür.
 * Meydan okuma alt menüde küçük bir rozette kaybolmasın diye en üstte durur.
 */
export default function DavetBandi() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [davetler, setDavetler] = useState([]);
  const [islemde, setIslemde] = useState(false);
  const [hata, setHata] = useState(null);

  const yukle = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.rpc("bekleyen_davetlerim");
      if (error) throw error;
      setDavetler(data ?? []);
    } catch (e) { console.warn("[Bildim] bekleyen_davetlerim başarısız:", e?.message ?? e);
      setDavetler([]); // RPC henüz uygulanmamış olabilir — bandı hiç gösterme
    }
  }, [user]);

  useEffect(() => {
    yukle();
    if (!user) return;
    const kanal = supabase
      .channel("davet-bandi")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `oyuncu2=eq.${user.id}` }, yukle)
      .on("postgres_changes", { event: "*", schema: "public", table: "group_match_players", filter: `user_id=eq.${user.id}` }, yukle)
      .on("postgres_changes", { event: "*", schema: "public", table: "hizli_oyuncular", filter: `user_id=eq.${user.id}` }, yukle)
      .on("postgres_changes", { event: "*", schema: "public", table: "duello_davetleri", filter: `rakip=eq.${user.id}` }, yukle)
      .subscribe();
    return () => supabase.removeChannel(kanal);
  }, [user, yukle]);

  if (davetler.length === 0) return null;

  const d = davetler[0];
  const bilgi = TUR_BILGI[d.tur] ?? TUR_BILGI.mac;

  const cevapla = async (kabul) => {
    const [rpc, param] = CEVAP_RPC[d.tur] ?? CEVAP_RPC.mac;
    setIslemde(true);
    setHata(null);
    try {
      const { data, error } = await supabase.rpc(rpc, { [param]: d.kayit_id, p_kabul: kabul });
      if (error) throw error;
      setDavetler((l) => l.filter((x) => x.kayit_id !== d.kayit_id));
      if (kabul) {
        const hedef = DONEN_ID_ILE_GIT.has(d.tur) ? data : d.kayit_id;
        navigate(y(hedef ? `/${bilgi.yol}/${hedef}` : `/${bilgi.yol}`));
      }
    } catch (e) {
      setHata(hataMesaji(e, tt("İşlem başarısız")));
    } finally {
      setIslemde(false);
    }
  };

  // Yön A: üst bloğun altında mor şerit. Maç ekranlarında üst blokla birlikte gizlenir.
  return (
    <div className={sinif("a-davet", `a-davet--${d.tur}`)} role="alert">
      <div className="a-davet-ic">
        <span className="a-davet-avatar">
          <CerceveliAvatar profile={d} userId={d.davet_eden} boyut={40} />
          <span className="a-davet-rozet" aria-hidden="true"><QtIkon ad={bilgi.ikon} boyut={12} /></span>
        </span>

        <span className="a-davet-metin">
          <span className="a-davet-satir">
            <b>{d.gorunen_ad ?? tt("Bir oyuncu")}</b> {bilgi.etiket}!
          </span>
          <span className="a-davet-alt">
            {d.kategori ? kategoriEtiket(d.kategori) : tt("Karışık")}
            {d.tur !== "mac" && d.tur !== "rovans" && d.kisi_sayisi
              ? tt(" · {0} kişi", { 0: d.kisi_sayisi })
              : ""}
            {davetler.length > 1 ? tt(" · +{0} davet daha", { 0: davetler.length - 1 }) : ""}
          </span>
        </span>

        <QtDugme boyut="k" tur="ikincil" devreDisi={islemde} onClick={() => cevapla(true)} className="a-davet-kabul">
          {tt("Kabul Et")}
        </QtDugme>
        <QtIkonDugme
          ikon="carpi"
          tur="saydam"
          etiket={tt("Daveti reddet")}
          disabled={islemde}
          onClick={() => cevapla(false)}
          className="a-davet-ret"
        />
      </div>

      {hata && <p className="a-davet-hata">{hata}</p>}
    </div>
  );
}
