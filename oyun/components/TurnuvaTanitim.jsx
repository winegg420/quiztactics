import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase.js";
import { QtKart, QtListe, QtListeSatiri, QtRozet } from "../tasarim/index.js";
import CerceveliAvatar from "./CerceveliAvatar.jsx";
import "../tasarim/ekranlar/m1-turnuva.css";
import { turnuvaSaatleri } from "../lib/zaman.js";
import { tt } from "../lib/dil.js";

/**
 * Turnuva sayfasındaki boş ekranı dolduran tanıtım bloğu:
 * nasıl oynanır (3 madde) + son turnuvanın ilk 3'ü + katılımcı sayısı.
 */
export default function TurnuvaTanitim() {
  const [sonTurnuva, setSonTurnuva] = useState(null);
  const [ilkUc, setIlkUc] = useState([]);
  const [katilan, setKatilan] = useState(0);

  useEffect(() => {
    let aktif = true;
    (async () => {
      try {
        const { data: tlar, error } = await supabase
          .from("tournaments")
          .select("id, tarih, seans, durum, kazanan")
          .eq("durum", "bitti")
          .order("tarih", { ascending: false })
          // Aynı gün birden çok turnuva biter (günde 7): en son biten.
          .order("bitis", { ascending: false, nullsFirst: false })
          .limit(1);
        if (error) throw error;
        const t = (tlar ?? [])[0];
        if (!t || !aktif) return;
        setSonTurnuva(t);

        const { data: oyuncular, error: hata2 } = await supabase
          .from("tournament_players")
          .select("user_id, dogru_sayisi, elendi, profil:profiles(gorunen_ad, gorunen_avatar)")
          .eq("tournament_id", t.id)
          .order("dogru_sayisi", { ascending: false })
          .limit(50);
        if (hata2) throw hata2;
        if (!aktif) return;

        setKatilan((oyuncular ?? []).length);
        // Kazanan en üstte, sonra doğru sayısına göre
        const sirali = [...(oyuncular ?? [])].sort((a, b) => {
          if (a.user_id === t.kazanan) return -1;
          if (b.user_id === t.kazanan) return 1;
          return (b.dogru_sayisi ?? 0) - (a.dogru_sayisi ?? 0);
        });
        setIlkUc(sirali.slice(0, 3));
      } catch (e) {
        console.warn("[Bildim] son turnuva okunamadı:", e?.message ?? e);
        /* turnuva geçmişi yoksa blok sadece "nasıl oynanır" gösterir */
      }
    })();
    return () => {
      aktif = false;
    };
  }, []);

  return (
    <>
      <QtKart className="m1-tv-nasil">
        <h2 className="qt-baslik-2">{tt("Nasıl oynanır?")}</h2>
        <ol>
          <li>
            <span className="m1-tv-no" aria-hidden="true">1</span>
            <span>
              <b>{tt("Lobiye katıl.")}</b>{" "}
              {tt("Turnuvalar her gün {saatler} saatlerinde başlar (Türkiye saati); başlamadan lobide olman gerekir.", { saatler: turnuvaSaatleri().join(", ") })}
            </span>
          </li>
          <li>
            <span className="m1-tv-no" aria-hidden="true">2</span>
            <span>
              <b>{tt("Yanlış cevap elenmektir.")}</b> {tt("Herkese aynı soru aynı anda gelir, bir soruyu kaçıran turnuvadan çıkar.")}
            </span>
          </li>
          <li>
            <span className="m1-tv-no" aria-hidden="true">3</span>
            <span>
              <b>{tt("Son kalan kazanır ve +150 lig puanı alır;")}</b>{" "}
              {tt("ilk 10'a giren ve katılan herkes de puan kazanır. Finalde skill kullanılamaz — sadece bilgi.")}
            </span>
          </li>
        </ol>
      </QtKart>

      {sonTurnuva && ilkUc.length > 0 && (
        <section className="m1-tv-lobi">
          <div className="m1-tv-lobi-ust">
            <h2 className="qt-baslik-2">{tt("Son turnuva")}</h2>
            <QtRozet ton="notr" boyut="k" ikon="kisiler">{tt("{n} katılımcı", { n: katilan })}</QtRozet>
          </div>
          <QtListe etiket={tt("Son turnuvanın ilk üçü")}>
            {ilkUc.map((o, i) => (
              <QtListeSatiri
                key={o.user_id}
                vurgulu={i === 0}
                bas={<CerceveliAvatar profile={o.profil} userId={o.user_id} boyut={40} />}
                baslik={`${i + 1}. ${o.profil?.gorunen_ad ?? tt("Oyuncu")}`}
                sag={<QtRozet ton={i === 0 ? "coin" : "dogru"} boyut="k" ikon="onay">{o.dogru_sayisi ?? 0}</QtRozet>}
              />
            ))}
          </QtListe>
        </section>
      )}
    </>
  );
}
