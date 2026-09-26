import { useCallback, useEffect, useState } from "react";
import { hataMesaji, hataTuru, hataTuruMesaji } from "../lib/hata.js";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../src/lib/supabase.js";
import { useAuth } from "../../src/context/AuthContext.jsx";
import AvatarCerceve from "../components/AvatarCerceve.jsx";
import OyuncuLigAmblemi from "../components/OyuncuLigAmblemi.jsx";
import { y } from "../lib/yol.js";
import DavetKarti from "../components/DavetKarti.jsx";
import { facebookArkadasOnerileri, facebookDavetAc } from "../lib/facebookArkadas.js";
import { tt } from "../lib/dil.js";
import ModSecimPenceresi from "../components/ModSecimPenceresi.jsx";
import OyuncuKarti from "../components/OyuncuKarti.jsx";
import OyuncuAdiDugmesi from "../components/OyuncuAdiDugmesi.jsx";
import IsimEfekti from "../components/IsimEfekti.jsx";
import { useDmOkunmamis } from "../lib/mesajlar.js";
import {
  QtIkon, QtDugme, QtIkonDugme, QtKart, QtListe, QtListeSatiri, QtBosDurum,
  QtIskelet, QtModal, QtSayiRozeti, sayiBicim,
} from "../tasarim/index.js";
// Tasarım A (Faz 2, şerit L): Arkadaşlar · Davet · Mesajlar ortak stilleri
import "../tasarim/ekranlar/l-sosyal.css";
// 590: çevrimiçi durumu YALNIZ bu listede (Realtime Presence; oyunun başka yerinde gösterilmez)
import { useArkadasCevrimici } from "../lib/cevrimici.js";
import "./arkadasCevrimici.css";

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
  const [listeHataMetni, setListeHataMetni] = useState(null);   // D-503: hata türüne göre metin (yoksa genel)
  const [bilgi, setBilgi] = useState(null);
  const [calisiyor, setCalisiyor] = useState(false);
  // Arkadaş silme geri alınamaz: tek dokunuşla değil, onaylı iki adımda.
  const [silOnay, setSilOnay] = useState(null);
  const [modHedef, setModHedef] = useState(null);   // Paket 30 B: mod penceresi açık olan arkadaş
  const [kartHedef, setKartHedef] = useState(null); // Paket 35 C: profil kartı açık olan arkadaş
  const dmOkunmamis = useDmOkunmamis(user?.id);     // Paket 35 E: Mesajlar düğmesindeki rozet
  // Paket 35 D: gönderdiğim, yanıt bekleyen meydan okumalar — rakip id → { tur, id }.
  // Sayfa açılınca sunucudan okunur (yenileyince kaybolmaz); kabul/red/geri çekme realtime ile düşer.
  const [bekleyenMeydan, setBekleyenMeydan] = useState(() => new Map());
  // D-455: kabul edilip BAŞLAYAN maçlar — rakip id → { tur, id }. Satırda "Maça gir" şeridi (bildirimi kaçıran için).
  const [aktifMaclar, setAktifMaclar] = useState(() => new Map());
  const [geriCekilen, setGeriCekilen] = useState(null);

  const bekleyenleriYukle = useCallback(async () => {
    try {
      // Klasik / Saf Bilgi: create_challenge → matches (durum 'bekliyor', kuran oyuncu1)
      // Düello: duello_davet_et → duello_davetleri (durum 'bekliyor', kuran)
      const [mac, duello, aktifMac, aktifDuello] = await Promise.all([
        supabase.from("matches").select("id, oyuncu2")
          .eq("oyuncu1", user.id).eq("durum", "bekliyor").limit(50),
        supabase.from("duello_davetleri").select("id, rakip")
          .eq("kuran", user.id).eq("durum", "bekliyor").limit(50),
        supabase.from("matches").select("id, oyuncu1, oyuncu2")
          .or(`oyuncu1.eq.${user.id},oyuncu2.eq.${user.id}`).eq("durum", "aktif").limit(50),
        // duellolar tablosu istemciye kapalı (403) → dar okuma RPC'si
        supabase.rpc("duello_aktif_benim"),
      ]);
      if (mac.error) throw mac.error;
      const m = new Map();
      for (const r of mac.data ?? []) m.set(r.oyuncu2, { tur: "klasik", id: r.id });
      // Düello tablosu okunamazsa klasik şeritler yine görünür
      if (!duello.error) for (const r of duello.data ?? []) m.set(r.rakip, { tur: "duello", id: r.id });
      setBekleyenMeydan(m);
      // Aktif maç okunamazsa şerit yalnız çıkmaz; bekleyen şeritler etkilenmez
      const a = new Map();
      const digeri = (r) => (r.oyuncu1 === user.id ? r.oyuncu2 : r.oyuncu1);
      if (!aktifMac.error) for (const r of aktifMac.data ?? []) a.set(digeri(r), { tur: "klasik", id: r.id });
      if (!aktifDuello.error) for (const r of aktifDuello.data ?? []) a.set(digeri(r), { tur: "duello", id: r.id });
      setAktifMaclar(a);
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
      .on("postgres_changes", { event: "*", schema: "public", table: "duellolar" }, bekleyenleriYukle)
      // D-455: kabul bildirimi geldiği anda satır tazelenir (matches olayı geç/kaçarsa "yanıt bekleniyor" bayat kalmasın)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bildirimler", filter: `user_id=eq.${user.id}` }, bekleyenleriYukle)
      .subscribe();
    return () => supabase.removeChannel(kanal);
  }, [bekleyenleriYukle, user.id]);

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
      setListeHataMetni(hataTuruMesaji(hataTuru(e)));
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
  const arkadaslarHam = dostluklar.filter((f) => f.durum === "arkadas");
  // 590: kabul edilmiş arkadaşların Presence kanalları dinlenir (ilk DINLEME_UST_SINIR kişi).
  // Çevrimdışı arkadaş haritada yoktur → satırda hiçbir şey çizilmez.
  const cevrimici = useArkadasCevrimici(arkadaslarHam.map((f) => digerProfil(f)?.id));
  // Sıra: çevrimiçi → maçta → çevrimdışı; grup içinde sunucudan gelen sıra korunur.
  const DURUM_SIRA = { cevrimici: 0, mac: 1 };
  const arkadaslar = arkadaslarHam
    .map((f, i) => ({ f, i, s: DURUM_SIRA[cevrimici.get(digerProfil(f)?.id)] ?? 2 }))
    .sort((a, b) => a.s - b.s || a.i - b.i)
    .map((x) => x.f);


  const silinecek = silOnay ? dostluklar.find((x) => x.id === silOnay) : null;
  const silinecekProfil = silinecek ? digerProfil(silinecek) : null;

  return (
    <div className="ls-sayfa ar-sayfa">
      {/* ---------- SAYFA BAŞLIĞI (Tasarım A) ----------
          Sahte sayı yok: çevrimiçi / haftalık maç gibi şeritler gerçek veriden
          gelmediği için çizilmez. Mesajlar alt menüde değil, buradan açılır. */}
      <header className="ls-baslik">
        <div className="ls-baslik-metin">
          <h1 className="qt-baslik-1">{tt("Arkadaşlar")}</h1>
          <p className="qt-soluk-zemin">{tt("Arkadaşlarını bul, meydan oku ve kimin daha bilgili olduğunu göster.")}</p>
        </div>
        {/* Paket 35 E: alt çubuğa yedinci sekme yerine buradan (okunmamış varsa rozet) */}
        <QtDugme
          tur="ikincil"
          boyut="k"
          ikon="mesaj"
          className="ls-mesaj-dugme"
          onClick={() => navigate(y("/mesajlar"))}
          aria-label={dmOkunmamis > 0 ? tt("Mesajlar, {0} okunmamış", { 0: dmOkunmamis }) : tt("Mesajlar")}
        >
          {tt("Mesajlar")}
          <QtSayiRozeti sayi={dmOkunmamis} />
        </QtDugme>
      </header>

      {hata && (
        <p className="ls-uyari ls-uyari-hata" role="alert">
          <QtIkon ad="uyari" boyut={18} /> <span>{hata}</span>
        </p>
      )}
      {bilgi && (
        <p className="ls-uyari ls-uyari-bilgi" role="status">
          <QtIkon ad="onay" boyut={18} /> <span>{bilgi}</span>
        </p>
      )}

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

      {/* Arkadaş silme geri alınamaz: onaylı iki adım (Paket 41 M.5) */}
      <QtModal
        acik={Boolean(silOnay)}
        onKapat={() => setSilOnay(null)}
        baslik={tt("{ad} arkadaşlıktan çıkarılsın mı?", { ad: silinecekProfil?.gorunen_ad ?? tt("Arkadaşın") })}
        aciklama={tt("Birbirinize artık doğrudan meydan okuyamaz ve mesaj atamazsınız. İstersen sonra yeniden ekleyebilirsin.")}
        altlik={
          <div className="ls-modal-dugmeler">
            <QtDugme tur="ikincil" data-qt-ilk-odak onClick={() => setSilOnay(null)}>{tt("Vazgeç")}</QtDugme>
            <QtDugme tur="tehlike" ikon="carpi" onClick={() => { const id = silOnay; setSilOnay(null); cikar(id); }}>
              {tt("Çıkar")}
            </QtDugme>
          </div>
        }
      />

      {modHedef && (
        <ModSecimPenceresi
          profil={modHedef}
          onSec={(mod) => (mod === "duello" ? duelloyaCagir(modHedef.id) : meydanOku(modHedef.id, mod === "saf"))}
          onKapat={() => setModHedef(null)}
        />
      )}

      {/* SIRA (Paket 8): arkadaş listesi ve istekler ÜSTTE, davet kartları sonda. */}
      {gelenIstekler.length > 0 && (
        <section className="ls-bolum" aria-labelledby="ar-gelen">
          <h2 id="ar-gelen" className="qt-baslik-3 ls-bolum-baslik">
            {tt("Gelen istekler")} <span className="ls-sayi">{gelenIstekler.length}</span>
          </h2>
          <QtListe etiket={tt("Gelen istekler")}>
            {gelenIstekler.map((f) => (
              <QtListeSatiri
                key={f.id}
                bas={<AvatarCerceve profile={f.req} boyut={44} />}
                baslik={<OyuncuAdiDugmesi userId={f.req?.id} profil={f.req} className="ls-ad">{f.req?.gorunen_ad}</OyuncuAdiDugmesi>}
                alt={tt("arkadaşlık isteği gönderdi")}
                sag={
                  <>
                    <QtDugme tur="mor" boyut="k" ikon="onay" onClick={() => cevapla(f.id, true)}>
                      {tt("Kabul")}
                    </QtDugme>
                    {/* Paket 42 A: arkadaşlık isteği/davet reddi her yerde "Reddet" (kayıt silme "Sil") */}
                    <QtIkonDugme
                      ikon="carpi"
                      tur="saydam"
                      className="ls-reddet"
                      etiket={tt("{ad} isteğini reddet", { ad: f.req?.gorunen_ad ?? tt("Oyuncu") })}
                      onClick={() => cevapla(f.id, false)}
                    />
                  </>
                }
              />
            ))}
          </QtListe>
        </section>
      )}

      <section className="ls-bolum" aria-labelledby="ar-arkadaslar">
        <h2 id="ar-arkadaslar" className="qt-baslik-3 ls-bolum-baslik">
          {tt("Arkadaşların")}
          {listeDurum === "hazir" && arkadaslar.length > 0 && (
            <span className="ls-sayi">{sayiBicim(arkadaslar.length)}</span>
          )}
        </h2>

        {listeDurum === "yukleniyor" && (
          <div className="qt-liste ls-iskelet" role="status" aria-busy="true">
            <span className="qt-gizli">{tt("Yükleniyor…")}</span>
            <QtIskelet tur="satir" adet={4} />
          </div>
        )}
        {listeDurum === "hata" && (
          <QtKart>
            <QtBosDurum
              ikon="uyari"
              ton="yanlis"
              baslik={tt("Yüklenemedi.")}
              metin={listeHataMetni ?? tt("Bağlantını kontrol edip tekrar dene.")}
              eylem={
                <QtDugme tur="ikincil" ikon="yenile" onClick={() => { setListeDurum("yukleniyor"); yukle(); }}>
                  {tt("Tekrar dene")}
                </QtDugme>
              }
            />
          </QtKart>
        )}
        {listeDurum === "hazir" && arkadaslar.length === 0 && (
          <QtKart>
            {/* Paket 42 I: paylaş düğmesi alttaki davet kartında; burada yönlendirme var */}
            <QtBosDurum
              ikon="kisiler"
              baslik={tt("Henüz arkadaşın yok")}
              metin={tt("Aşağıdaki davet linkini paylaş, birlikte yarışın.")}
            />
          </QtKart>
        )}

        {listeDurum === "hazir" && arkadaslar.length > 0 && (
          <QtListe etiket={tt("Arkadaşların")}>
            {arkadaslar.map((f) => {
              const p = digerProfil(f);
              const bekleyen = bekleyenMeydan.get(p?.id);
              const aktifMac = !bekleyen ? aktifMaclar.get(p?.id) : null;
              const durum = cevrimici.get(p?.id) ?? null;   // "cevrimici" | "mac" | null
              const durumEtiket = durum === "mac" ? tt("Maçta") : durum === "cevrimici" ? tt("Çevrimiçi") : null;
              return (
                <div key={f.id} role="listitem" className="qt-satir-kap ar-kap">
                  <div className="ar-satir">
                    {/* Paket 35 C: satıra (avatar + ad) dokunmak profil kartını açar; "Oyna" kısayol olarak kalır */}
                    <button
                      type="button"
                      className="ar-ac"
                      onClick={() => setKartHedef(p)}
                      aria-haspopup="dialog"
                      aria-label={tt("{ad} profilini aç", { ad: p?.gorunen_ad ?? tt("Arkadaşın") }) + (durumEtiket ? `, ${durumEtiket}` : "")}
                    >
                      <span className="ar-avatar-kap">
                        <AvatarCerceve profile={p} boyut={44} />
                        {durum && <span className={`ar-durum-nokta ar-durum-nokta--${durum}`} aria-hidden="true" />}
                      </span>
                      <span className="ar-bilgi">
                        {/* 560: lig amblemi isim yanında (oyuncu kartından; toplu + önbellekli) */}
                        <span className="qt-ad-amblem">
                          {/* Takılı isim efekti (altın isim) — satır zaten kartı açan düğme, OyuncuAdiDugmesi yok */}
                          <span className="ls-ad"><IsimEfekti userId={p?.id}>{p?.gorunen_ad}</IsimEfekti></span>
                          {p?.id && <OyuncuLigAmblemi userId={p.id} lig={p?.lig} boyut={20} />}
                        </span>
                        <span className="ar-detay">
                          <QtIkon ad="yildiz" boyut={14} /> {tt("{n} puan", { n: sayiBicim(p?.puan ?? 0) })}
                        </span>
                        {durumEtiket && (
                          <span className={`ar-durum-etiket ar-durum-etiket--${durum}`} aria-hidden="true">{durumEtiket}</span>
                        )}
                      </span>
                    </button>
                    {/* Paket 30 B: tek "Oyna" düğmesi → mod seçim penceresi.
                        Paket 35 D: bekleyen meydan okuma varken ikinci kez meydan okunamaz. */}
                    <QtDugme
                      tur="mor"
                      boyut="k"
                      ikon="oyna"
                      className={durum === "cevrimici" && !bekleyen ? "ar-oyna ar-oyna--cevrimici" : "ar-oyna"}
                      onClick={() => setModHedef(p)}
                      devreDisi={Boolean(bekleyen)}
                      title={bekleyen ? BEKLEYEN_NEDEN : undefined}
                      aria-label={tt("{ad} ile oyna", { ad: p?.gorunen_ad ?? tt("Arkadaşın") })}
                      aria-haspopup="dialog"
                    >
                      {tt("Oyna")}
                    </QtDugme>
                    <QtIkonDugme
                      ikon="carpi"
                      tur="saydam"
                      className="ar-cikar"
                      etiket={tt("{ad} arkadaşlıktan çıkar", { ad: p?.gorunen_ad ?? tt("Arkadaşını") })}
                      onClick={() => setSilOnay(f.id)}
                    />
                  </div>
                  {aktifMac && (
                    <div className="ar-bekleyen" role="status">
                      <span className="ar-bekleyen-metin">{tt("Maç başladı")}</span>
                      <span className="ar-bekleyen-dugmeler">
                        <QtDugme tur="birincil" boyut="k" onClick={() => navigate(y(aktifMac.tur === "duello" ? "/duello/" : "/mac/") + aktifMac.id)}>
                          {tt("Maça gir")}
                        </QtDugme>
                      </span>
                    </div>
                  )}
                  {bekleyen && (
                    <div className="ar-bekleyen" role="status">
                      <span className="ar-noktalar" aria-hidden="true"><i /><i /><i /></span>
                      <span className="ar-bekleyen-metin">
                        {bekleyen.tur === "duello"
                          ? tt("Düello daveti gönderildi · yanıt bekleniyor")
                          : tt("Meydan okuma gönderildi · yanıt bekleniyor")}
                      </span>
                      <span className="ar-bekleyen-dugmeler">
                        <QtDugme tur="ikincil" boyut="k" onClick={() => navigate(y("/meydan"))}>
                          {tt("Maça git")}
                        </QtDugme>
                        <QtDugme
                          tur="hayalet"
                          boyut="k"
                          className="ar-geri-cek"
                          yukleniyor={geriCekilen === bekleyen.id}
                          onClick={() => meydanGeriCek(bekleyen)}
                        >
                          {tt("Geri çek")}
                        </QtDugme>
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </QtListe>
        )}
      </section>

      {gidenIstekler.length > 0 && (
        <section className="ls-bolum" aria-labelledby="ar-giden">
          <h2 id="ar-giden" className="qt-baslik-3 ls-bolum-baslik">{tt("Bekleyen istekler")}</h2>
          <QtListe etiket={tt("Bekleyen istekler")}>
            {gidenIstekler.map((f) => (
              <QtListeSatiri
                key={f.id}
                bas={<AvatarCerceve profile={f.add} boyut={44} />}
                baslik={<OyuncuAdiDugmesi userId={f.add?.id} profil={f.add} className="ls-ad">{f.add?.gorunen_ad}</OyuncuAdiDugmesi>}
                alt={tt("cevap bekleniyor…")}
                sag={
                  /* Paket 13: meydan okumadaki "Geri çek" gibi, gönderilen istek de geri alınır. */
                  <QtDugme
                    tur="ikincil"
                    boyut="k"
                    onClick={() => geriCek(f.id)}
                    aria-label={tt("{ad} kişisine gönderilen isteği geri çek", { ad: f.add?.gorunen_ad ?? tt("Oyuncu") })}
                  >
                    {tt("Geri çek")}
                  </QtDugme>
                }
              />
            ))}
          </QtListe>
        </section>
      )}

      {/* ---------- Davet (listenin altında) ---------- */}
      <section className="ls-bolum" aria-labelledby="ar-davet">
        <h2 id="ar-davet" className="qt-baslik-3 ls-bolum-baslik">{tt("Arkadaş davet et")}</h2>
        {/* Rozet + çerçeve paketi: kod, bağlantı paylaşımı, ödül (300 / +100) ve davet durumu tek kartta */}
        <DavetKarti ekDugmeler={
          /* Facebook'ta "tüm arkadaşlarını davet et" MÜMKÜN DEĞİL (2014'ten
             beri kapalı); onun yerine paylaşım diyaloğu açılır. */
          <QtDugme tur="ikincil" tamGenislik devreDisi={!davetLinki} onClick={() => facebookDavetAc(davetLinki)}>
            {tt("Facebook'ta paylaş")}
          </QtDugme>
        } />
      </section>

      {/* ---------- Facebook arkadaşların ----------
          `user_friends` izni App Review ister; onay yoksa liste boş döner
          ve bu bölüm HİÇ ÇİZİLMEZ (giriş akışı etkilenmez). */}
      {fbOnerileri.length > 0 && (
        <section className="ls-bolum" aria-labelledby="ar-fb">
          <h2 id="ar-fb" className="qt-baslik-3 ls-bolum-baslik">{tt("Facebook arkadaşların Quiz Tactics'te")}</h2>
          <QtListe etiket={tt("Facebook arkadaşların Quiz Tactics'te")}>
            {fbOnerileri.map((o) => (
              <QtListeSatiri
                key={o.user_id}
                bas={<AvatarCerceve profile={o} boyut={44} userId={o.user_id ?? o.id} />}
                baslik={<OyuncuAdiDugmesi userId={o.user_id ?? o.id} profil={o} className="ls-ad">{o.gorunen_ad}</OyuncuAdiDugmesi>}
                alt={tt("Facebook arkadaşın")}
                sag={
                  <QtDugme tur="mor" boyut="k" ikon="kisiEkle" devreDisi={calisiyor} onClick={() => fbArkadasEkle(o.user_id)}>
                    {tt("Ekle")}
                  </QtDugme>
                }
              />
            ))}
          </QtListe>
        </section>
      )}

      <section className="ls-bolum" aria-labelledby="ar-kodla">
        <h2 id="ar-kodla" className="qt-baslik-3 ls-bolum-baslik">{tt("Davet koduyla ekle")}</h2>
        <QtKart>
          <form
            className="ar-kod-satir"
            onSubmit={(e) => { e.preventDefault(); kodlaEkle(); }}
          >
            <label className="qt-gizli" htmlFor="ar-kod-giris">{tt("Arkadaşının davet kodu")}</label>
            <input
              id="ar-kod-giris"
              type="text"
              className="ar-kod-giris"
              placeholder={tt("8 haneli kod")}
              maxLength={8}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={kod}
              onChange={(e) => setKod(e.target.value.toUpperCase())}
            />
            <QtDugme
              type="submit"
              tur="mor"
              ikon="kisiEkle"
              yukleniyor={calisiyor}
              devreDisi={kod.trim().length !== 8}
            >
              {tt("Ekle")}
            </QtDugme>
          </form>
        </QtKart>
      </section>
    </div>
  );
}
