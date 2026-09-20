import { Fragment, useCallback, useEffect, useState } from "react";
import Ikon from "../components/Ikon.jsx";
import { hataMesaji } from "../lib/hata.js";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../src/lib/supabase.js";
import { useAuth } from "../../src/context/AuthContext.jsx";
import AvatarCerceve from "../components/AvatarCerceve.jsx";
import Maskot from "../components/Maskot.jsx";
import DurumKutusu from "../components/DurumKutusu.jsx";
import { y } from "../lib/yol.js";
import DavetKodu from "../components/DavetKodu.jsx";
import { facebookArkadasOnerileri, facebookDavetAc } from "../lib/facebookArkadas.js";
import { tt } from "../lib/dil.js";
import ModSecimPenceresi from "../components/ModSecimPenceresi.jsx";
import OyuncuKarti from "../components/OyuncuKarti.jsx";
import Modal from "../components/Modal.jsx";
import { useDmOkunmamis, rozetMetni } from "../lib/mesajlar.js";

const DOSTLUK_SECIMI = `id, requester, addressee, durum,
  req:profiles!friendships_requester_fkey(id, gorunen_ad, gorunen_avatar, gorunum, puan),
  add:profiles!friendships_addressee_fkey(id, gorunen_ad, gorunen_avatar, gorunum, puan)`;

export default function FriendsPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [dostluklar, setDostluklar] = useState([]);
  const [kod, setKod] = useState("");
  const [hata, setHata] = useState(null);
  // Paket 41 A: liste okunamadıysa "Henüz arkadaşın yok" yerine hata + Tekrar dene
  const [listeDurum, setListeDurum] = useState("yukleniyor");   // yukleniyor | hata | hazir
  const [bilgi, setBilgi] = useState(null);
  const [kopyalandi, setKopyalandi] = useState(false);
  const [calisiyor, setCalisiyor] = useState(false);
  // Arkadaş silme geri alınamaz: tek dokunuşla değil, onaylı iki adımda.
  const [silOnay, setSilOnay] = useState(null);
  const [modHedef, setModHedef] = useState(null);   // Paket 30 B: mod penceresi açık olan arkadaş
  const [kartHedef, setKartHedef] = useState(null); // Paket 35 C: profil kartı açık olan arkadaş
  const dmOkunmamis = useDmOkunmamis(user?.id);     // Paket 35 E: Mesajlar düğmesindeki rozet
  // Paket 35 D: gönderdiğim, yanıt bekleyen meydan okumalar — rakip id → { tur, id }.
  // Sayfa açılınca sunucudan okunur (yenileyince kaybolmaz); kabul/red/geri çekme realtime ile düşer.
  const [bekleyenMeydan, setBekleyenMeydan] = useState(() => new Map());
  const [geriCekilen, setGeriCekilen] = useState(null);

  const bekleyenleriYukle = useCallback(async () => {
    try {
      // Klasik / Saf Bilgi: create_challenge → matches (durum 'bekliyor', kuran oyuncu1)
      // Düello: duello_davet_et → duello_davetleri (durum 'bekliyor', kuran)
      const [mac, duello] = await Promise.all([
        supabase.from("matches").select("id, oyuncu2")
          .eq("oyuncu1", user.id).eq("durum", "bekliyor").limit(50),
        supabase.from("duello_davetleri").select("id, rakip")
          .eq("kuran", user.id).eq("durum", "bekliyor").limit(50),
      ]);
      if (mac.error) throw mac.error;
      const m = new Map();
      for (const r of mac.data ?? []) m.set(r.oyuncu2, { tur: "klasik", id: r.id });
      // Düello tablosu okunamazsa klasik şeritler yine görünür
      if (!duello.error) for (const r of duello.data ?? []) m.set(r.rakip, { tur: "duello", id: r.id });
      setBekleyenMeydan(m);
    } catch (e) {
      console.warn("[Bildim] bekleyen meydan okumalar okunamadı:", e?.message ?? e);
    }
  }, [user.id]);

  useEffect(() => {
    bekleyenleriYukle();
    const kanal = supabase
      .channel("arkadas-meydan")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, bekleyenleriYukle)
      .on("postgres_changes", { event: "*", schema: "public", table: "duello_davetleri" }, bekleyenleriYukle)
      .subscribe();
    return () => supabase.removeChannel(kanal);
  }, [bekleyenleriYukle]);

  /** Bekleyen meydan okumayı geri çeker (Meydan sayfasındaki "Geri al" ile aynı RPC'ler). */
  const meydanGeriCek = async (b) => {
    setHata(null);
    setGeriCekilen(b.id);
    try {
      const { error } = b.tur === "duello"
        ? await supabase.rpc("duello_davet_iptal", { p_id: b.id })
        : await supabase.rpc("mac_iptal", { p_match_id: b.id });
      if (error) throw error;
      await bekleyenleriYukle();
    } catch (e) {
      setHata(hataMesaji(e, tt("Meydan okuma geri çekilemedi.")));
    } finally {
      setGeriCekilen(null);
    }
  };
  const BEKLEYEN_NEDEN = tt("Bu arkadaşına gönderdiğin meydan okuma yanıt bekliyor. Önce yanıtını bekle ya da geri çek.");

  const yukle = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("friendships")
        .select(DOSTLUK_SECIMI)
        .or(`requester.eq.${user.id},addressee.eq.${user.id}`);
      if (error) throw error;
      setDostluklar(data ?? []);
      setListeDurum("hazir");
    } catch (e) {
      console.error("[Bildim] arkadaş listesi alınamadı:", e);
      setListeDurum("hata");
    }
  }, [user.id]);

  useEffect(() => {
    yukle();
    const kanal = supabase
      .channel("dostluklar")
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, yukle)
      .subscribe();
    return () => supabase.removeChannel(kanal);
  }, [yukle]);

  // Kullanıcı adıyla arama KALDIRILDI (gerçek ad sızdırıyordu).
  // Facebook arkadaş önerileri. İzin/belirteç yoksa boş kalır, bölüm gizlenir.
  const [fbOnerileri, setFbOnerileri] = useState([]);
  useEffect(() => {
    let aktif = true;
    facebookArkadasOnerileri()
      .then((l) => { if (aktif) setFbOnerileri(l); })
      .catch((e) => console.error("[Bildim] facebook onerileri:", e));
    return () => { aktif = false; };
  }, []);

  /** Öneriden arkadaşlık isteği gönder. */
  const fbArkadasEkle = async (hedefId) => {
    setHata(null);
    setCalisiyor(true);
    try {
      const { error } = await supabase.rpc("send_friend_request", { p_target: hedefId });
      if (error) throw error;
      setFbOnerileri((l) => l.filter((o) => o.user_id !== hedefId));
      setBilgi(tt("Arkadaşlık isteği gönderildi."));
    } catch (e) {
      setHata(hataMesaji(e, tt("İstek gönderilemedi.")));
    } finally {
      setCalisiyor(false);
    }
  };

  // Arkadaş eklemenin tek yolu davet kodu / davet linki.
  const kodlaEkle = async (girilen) => {
    setHata(null);
    setBilgi(null);
    const temiz = (girilen ?? kod).trim().toUpperCase();
    if (temiz.length !== 8) {
      setHata(tt("Davet kodu 8 karakter olmalı."));
      return;
    }
    setCalisiyor(true);
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
      setBilgi(mesajlar[sonuc?.durum] ?? tt("İstek gönderildi"));
      setKod("");
      yukle();
    } catch (e) {
      setHata(hataMesaji(e, tt("Davet kodu kullanılamadı.")));
    } finally {
      setCalisiyor(false);
    }
  };

  const davetLinki = profile?.davet_kodu
    ? window.location.origin + y(`/davet/${profile.davet_kodu}`)
    : null;

  const linkPaylas = async () => {
    if (!davetLinki) return;
    const mesaj = tt("Quiz Tactics'te benimle yarış — bu linkle beni arkadaş ekleyebilirsin: {0}", { 0: davetLinki });
    try {
      if (navigator.share) {
        await navigator.share({ title: "Quiz Tactics", text: mesaj });
      } else {
        await navigator.clipboard.writeText(mesaj);
        setKopyalandi(true);
        setTimeout(() => setKopyalandi(false), 2500);
      }
    } catch {
      /* kullanıcı vazgeçti */
    }
  };

  const cevapla = async (fId, kabul) => {
    try {
      const { error } = await supabase.rpc("respond_friend_request", {
        p_id: fId,
        p_kabul: kabul,
      });
      if (error) throw error;
      yukle();
    } catch (e) {
      setHata(hataMesaji(e, tt("İşlem yapılamadı.")));
    }
  };

  const cikar = async (fId) => {
    try {
      const { error } = await supabase.rpc("remove_friend", { p_id: fId });
      if (error) throw error;
      yukle();
    } catch (e) {
      setHata(hataMesaji(e, tt("Arkadaş çıkarılamadı.")));
    }
  };

  /** Gönderdiğim, henüz cevaplanmamış arkadaşlık isteğini geri çeker (Paket 13). */
  const geriCek = async (fId) => {
    setHata(null);
    try {
      const { error } = await supabase.rpc("remove_friend", { p_id: fId });
      if (error) throw error;
      setBilgi(tt("Arkadaşlık isteği geri çekildi."));
      yukle();
    } catch (e) {
      setHata(hataMesaji(e, tt("İstek geri çekilemedi.")));
    }
  };

  // Paket 30 B: iki davet de mod seçim penceresinden çağrılır. Hata sayfanın üstüne
  // değil pencerenin İÇİNE düşsün diye metin olarak döner (null = başarılı).
  const meydanOku = async (hedefId, jokersiz = false) => {
    setHata(null);
    try {
      const { error, data } = await supabase.rpc("create_challenge", { p_rakip: hedefId, p_jokersiz: jokersiz });
      if (error) throw error;
      setModHedef(null);
      // Paket 35 D: sayfadan ÇIKMA — satırın altında bekleyen şerit görünür.
      // Rakip anında kabul ettiyse (açık bot) maç zaten başlamıştır → maça gir.
      if (data) {
        const { data: m } = await supabase.from("matches").select("durum").eq("id", data).maybeSingle();
        if (m?.durum === "aktif") { navigate(y(`/mac/${data}`)); return null; }
      }
      await bekleyenleriYukle();
      return null;
    } catch (e) {
      return hataMesaji(e, tt("Meydan okuma başlatılamadı."));
    }
  };

  // Paket 24 · A.1.5: düello daveti bugüne kadar yalnız Meydan Okuma sayfasındaydı.
  // Açık bot anında kabul eder ve doğrudan düelloya girilir; gerçek oyuncuda davet bekler.
  const duelloyaCagir = async (hedefId) => {
    setHata(null);
    setBilgi(null);
    try {
      const { data, error } = await supabase.rpc("duello_davet_et", { p_rakip: hedefId });
      if (error) throw error;
      setModHedef(null);
      if (data?.duello_id) {
        navigate(y(`/duello/${data.duello_id}`));
        return null;
      }
      setBilgi(tt("Düello daveti gönderildi — rakip kabul edince düello başlayacak."));
      await bekleyenleriYukle();   // Paket 35 D: şerit düello davetinde de görünür
      return null;
    } catch (e) {
      return hataMesaji(e, tt("Düello daveti gönderilemedi."));
    }
  };

  const digerProfil = (f) => (f.requester === user.id ? f.add : f.req);
  const gelenIstekler = dostluklar.filter(
    (f) => f.durum === "bekliyor" && f.addressee === user.id
  );
  const gidenIstekler = dostluklar.filter(
    (f) => f.durum === "bekliyor" && f.requester === user.id
  );
  const arkadaslar = dostluklar.filter((f) => f.durum === "arkadas");

  return (
    <div>
      {/* ---------- SAYFA BAŞLIĞI (Arayüz Yenileme, 20 Eyl 2026) ----------
          Prototipteki `page-heading` + `messages-button`.
          `social-stats` şeridi ALINMADI: prototipteki dört sayıdan
          (çevrimiçi · arkadaş · bu hafta maç · galibiyet) yalnız biri
          gerçek veriden gelebiliyor; sahte sayı yazılmaz. */}
      <section className="page-heading">
        <div>
          <span className="eyebrow">{tt("SOSYAL MERKEZ")}</span>
          <h1>{tt("Arkadaşlarınla yarış")}</h1>
          <p>{tt("Arkadaşlarını bul, meydan oku ve kimin daha bilgili olduğunu göster.")}</p>
        </div>
        {/* Paket 35 E: alt çubuğa yedinci sekme yerine buradan (okunmamış varsa rozet) */}
        <button
          type="button"
          className="btn ikincil bd-mesajlar-dugme messages-button"
          onClick={() => navigate(y("/mesajlar"))}
          aria-label={dmOkunmamis > 0 ? tt("Mesajlar, {0} okunmamış", { 0: dmOkunmamis }) : tt("Mesajlar")}
        >
          <Ikon ad="mesaj" boyut={18} /> <span>{tt("Mesajlar")}</span>
          {dmOkunmamis > 0 && <b aria-hidden="true">{rozetMetni(dmOkunmamis)}</b>}
        </button>
      </section>
      {hata && <div className="hata-kutu">{hata}</div>}
      {bilgi && <div className="bd-bilgi-kutu">{bilgi}</div>}
      {/* Paket 35 C: satıra dokununca profil kartı; kart yalnız verilen eylemleri çizer */}
      {kartHedef && (
        <OyuncuKarti
          userId={kartHedef.id}
          onIzleme={kartHedef}
          onKapat={() => setKartHedef(null)}
          onOyna={kartHedef.id === user.id ? undefined : () => { setKartHedef(null); setModHedef(kartHedef); }}
          oynaPasifNeden={bekleyenMeydan.has(kartHedef.id) ? BEKLEYEN_NEDEN : null}
          onMeydanOku={kartHedef.id === user.id ? undefined : async (id) => {
            const m = await meydanOku(id);
            if (m) throw new Error(m);
            setKartHedef(null);
          }}
          onMesaj={kartHedef.id === user.id ? undefined : (id) => { setKartHedef(null); navigate(y(`/mesajlar/${id}`)); }}
        />
      )}
      {silOnay && (() => {
        const sf = dostluklar.find((x) => x.id === silOnay);
        const sp = sf ? digerProfil(sf) : null;
        return (
          <Modal onKapat={() => setSilOnay(null)} etiket={tt("Arkadaşlıktan çıkar")}>
            <div className="bd-modal">
              <h2 className="bd-modal-baslik">
                {tt("{ad} arkadaşlıktan çıkarılsın mı?", { ad: sp?.gorunen_ad ?? tt("Arkadaşın") })}
              </h2>
              <p className="alt-yazi">{tt("Birbirinize artık doğrudan meydan okuyamaz ve mesaj atamazsınız. İstersen sonra yeniden ekleyebilirsin.")}</p>
              <div className="bd-joker-sat-dugmeler">
                <button type="button" className="btn ikincil" onClick={() => setSilOnay(null)}>{tt("Vazgeç")}</button>
                <button type="button" className="btn tehlike" onClick={() => { const id = silOnay; setSilOnay(null); cikar(id); }}>
                  {tt("Çıkar")}
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}
      {modHedef && (
        <ModSecimPenceresi
          profil={modHedef}
          onSec={(mod) => (mod === "duello" ? duelloyaCagir(modHedef.id) : meydanOku(modHedef.id, mod === "saf"))}
          onKapat={() => setModHedef(null)}
        />
      )}

      {/* SIRA (Paket 8): arkadaş listesi ve istekler ÜSTTE. Davet kartları
          sayfanın başındaydı; arkadaşı olan oyuncu her girişte onları
          geçiyordu. Kartlar AYNEN korundu, sayfanın sonuna taşındı. */}
      {gelenIstekler.length > 0 && (
        <>
          <div className="baslik">{tt("Gelen istekler")}</div>
          {gelenIstekler.map((f) => (
            <div key={f.id} className="liste-satir">
              <AvatarCerceve profile={f.req} />
              <div className="bilgi">
                <div className="isim">{f.req?.gorunen_ad}</div>
                <div className="detay">{tt("arkadaşlık isteği gönderdi")}</div>
              </div>
              <button className="btn kucuk" onClick={() => cevapla(f.id, true)}>
                {tt("Kabul")}
              </button>
              {/* Paket 42 A: arkadaşlık isteği/davet reddi her yerde "Reddet" (kayıt silme "Sil") */}
              <button className="btn kucuk tehlike" onClick={() => cevapla(f.id, false)}>
                {tt("Reddet")}
              </button>
            </div>
          ))}
        </>
      )}

      <div className="baslik">{tt("Arkadaşların")}{listeDurum === "hazir" ? ` (${arkadaslar.length})` : ""}</div>
      {listeDurum !== "hazir" && (
        <DurumKutusu durum={listeDurum} onTekrar={() => { setListeDurum("yukleniyor"); yukle(); }} />
      )}
      {listeDurum === "hazir" && arkadaslar.length === 0 && (
        <div className="bd-bos-durum">
          <Maskot poz="selam" boyut={86} />
          {/* Paket 42 I: paylaş düğmesi hemen alttaki "Arkadaş davet et" kartında da vardı (iki kez);
              burada yalnız yönlendirme metni kaldı */}
          <p>{tt("Henüz arkadaşın yok — aşağıdaki davet linkini paylaş, birlikte yarışın.")}</p>
        </div>
      )}
      {arkadaslar.map((f) => {
        const p = digerProfil(f);
        const bekleyen = bekleyenMeydan.get(p?.id);
        return (
          <Fragment key={f.id}>
          <div className="liste-satir">
            {/* Paket 35 C: satıra (avatar + ad) dokunmak profil kartını açar; "Oyna" kısayol olarak kalır */}
            <button
              type="button"
              className="bd-arkadas-ac"
              onClick={() => setKartHedef(p)}
              aria-haspopup="dialog"
              aria-label={tt("{ad} profilini aç", { ad: p?.gorunen_ad ?? tt("Arkadaşın") })}
            >
              <AvatarCerceve profile={p} />
              <div className="bilgi">
                <div className="isim">{p?.gorunen_ad}</div>
                <div className="detay"><Ikon ad="yildiz" boyut={13} /> {p?.puan} {tt("puan")}</div>
              </div>
            </button>
            {/* Paket 30 B: kılıç (Klasik) + kalkan (Düello) yerine tek düğme → mod seçim penceresi */}
            <button
              className="btn kucuk ikincil bd-oyna-dugme"
              onClick={() => setModHedef(p)}
              // Paket 35 D: bekleyen meydan okuma varken ikinci kez meydan okunamaz (sebep şeritte + title)
              disabled={Boolean(bekleyen)}
              title={bekleyen ? BEKLEYEN_NEDEN : undefined}
              aria-label={tt("{ad} ile oyna", { ad: p?.gorunen_ad ?? tt("Arkadaşın") })}
              aria-haspopup="dialog"
            >
              <Ikon ad="kilic" boyut={16} /> {tt("Oyna")}
            </button>
            {/* Paket 41 M.5: onay artık satır içinde değil, küçük pencerede (aşağıda) */}
            {(
              <button
                className="btn kucuk ikincil bd-arkadas-cikar"
                onClick={() => setSilOnay(f.id)}
                aria-label={(p?.gorunen_ad ?? tt("Arkadaşını")) + tt(" arkadaşlıktan çıkar")}
                title={tt("Arkadaşlıktan çıkar")}
              >
                <Ikon ad="carpi" boyut={16} />
              </button>
            )}
          </div>
          {bekleyen && (
            <div className="bd-meydan-serit" role="status">
              <span className="bd-meydan-serit-nokta" aria-hidden="true"><i /><i /><i /></span>
              <span className="bd-meydan-serit-metin">
                {bekleyen.tur === "duello"
                  ? tt("Düello daveti gönderildi · yanıt bekleniyor")
                  : tt("Meydan okuma gönderildi · yanıt bekleniyor")}
              </span>
              <button type="button" className="btn kucuk" onClick={() => navigate(y("/meydan"))}>
                {tt("Maça git")}
              </button>
              <button
                type="button"
                className="btn kucuk tehlike"
                disabled={geriCekilen === bekleyen.id}
                onClick={() => meydanGeriCek(bekleyen)}
              >
                {geriCekilen === bekleyen.id ? "…" : tt("Geri çek")}
              </button>
            </div>
          )}
          </Fragment>
        );
      })}

      {gidenIstekler.length > 0 && (
        <>
          <div className="baslik" style={{ marginTop: 14 }}>
            {tt("Bekleyen istekler")}
          </div>
          {gidenIstekler.map((f) => (
            <div key={f.id} className="liste-satir">
              <AvatarCerceve profile={f.add} />
              <div className="bilgi">
                <div className="isim">{f.add?.gorunen_ad}</div>
                <div className="detay">{tt("cevap bekleniyor…")}</div>
              </div>
              {/* Paket 13: meydan okumadaki "Geri çek" gibi, gönderilen istek de geri alınır. */}
              <button
                className="btn kucuk ikincil"
                onClick={() => geriCek(f.id)}
                aria-label={(f.add?.gorunen_ad ?? tt("Bu kişiye")) + tt(" gönderilen isteği geri çek")}
              >
                {tt("Geri çek")}
              </button>
            </div>
          ))}
        </>
      )}

      {/* ---------- Davet (listenin altında) ---------- */}
      <div className="baslik" style={{ marginTop: 18 }}>{tt("Arkadaş davet et")}</div>
      <div className="kart bd-davet-kart">
        <div className="bd-kat-baslik">
          <span>{tt("Davet kodun")}</span>
        </div>
        {/* Kodun kendisi düğme: dokununca YALNIZ kod panoya gider. */}
        <DavetKodu kod={profile?.davet_kodu} />
        <button className="btn" onClick={linkPaylas} disabled={!davetLinki}>
          {kopyalandi ? tt("Kopyalandı") : tt("Davet linkini paylaş")}
        </button>
        {/* Facebook'ta "tüm arkadaşlarını davet et" MÜMKÜN DEĞİL (2014'ten
            beri kapalı); onun yerine paylaşım diyaloğu açılır. */}
        <button
          className="btn ikincil"
          disabled={!davetLinki}
          onClick={() => facebookDavetAc(davetLinki)}
        >
          {tt("Facebook'ta paylaş")}
        </button>
      </div>

      {/* ---------- Facebook arkadaşların ----------
          `user_friends` izni App Review ister; onay yoksa liste boş döner
          ve bu bölüm HİÇ ÇİZİLMEZ (giriş akışı etkilenmez). */}
      {fbOnerileri.length > 0 && (
        <div className="kart">
          <div className="bd-kat-baslik">
            <span>{tt("Facebook arkadaşların Quiz Tactics'te")}</span>
          </div>
          {fbOnerileri.map((o) => (
            <div key={o.user_id} className="liste-satir">
              <AvatarCerceve profile={o} boyut={38} userId={o.user_id ?? o.id} />
              <div className="bilgi">
                <div className="isim">{o.gorunen_ad}</div>
                <div className="detay">{tt("Facebook arkadaşın")}</div>
              </div>
              <button
                className="btn kucuk"
                disabled={calisiyor}
                onClick={() => fbArkadasEkle(o.user_id)}
              >
                {tt("Ekle")}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="kart">
        <div className="bd-kat-baslik">
          <span>{tt("Davet koduyla ekle")}</span>
        </div>
        <div className="bd-kod-satir">
          <input
            type="text"
            className="bd-kod-giris"
            placeholder={tt("8 haneli kod")}
            maxLength={8}
            value={kod}
            onChange={(e) => setKod(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && kodlaEkle()}
          />
          <button
            className="btn kucuk"
            disabled={calisiyor || kod.trim().length !== 8}
            onClick={() => kodlaEkle()}
          >
            {calisiyor ? "…" : tt("Ekle")}
          </button>
        </div>
      </div>
    </div>
  );
}
