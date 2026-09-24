// ============================================================
// MAÇ İÇİ TEPKİ (emote, 542) — Klasik · Düello · Antrenman
//
// Yayın: sayfanın MEVCUT maç kanalı (Klasik `mac-<id>`, Düello `duello-<id>`) — sayfa kanala
//   .on("broadcast", { event: "tepki" }, (m) => tepki.al(m.payload)) ekler, gönderim tepki.gonder(k).
//   Veritabanına tepki yazılmaz. Bot tepkisi sunucudan aynı kanala aynı şekilde gelir.
// Açık mı: tepki_durumu(tür, maç) — maç başında tek okuma (mod oyun_ayarlari.tepki_acik_modlar'da mı,
//   kullanabileceğim tepkiler: bedava 4 + sahip olduğum paketler; sahip hesabı hepsi).
// Sınır (istemci + alıcı): aynı oyuncudan 3 sn'de en çok 1, maçta en çok 10. Alıcı yalnız rakipten
//   gelen, bilinen 12 tepkiyi çizer; fazlasını yok sayar. "Rakip tepkilerini gizle" (cihaz) açıksa
//   rakibinki çizilmez. Balon ~2 sn gönderenin avatarının yanında (kendinde de kendi avatarında).
// iOS: fixed yok; balon avatar yuvasında absolute, hareket yalnız transform/opacity.
// ============================================================
import { useCallback, useEffect, useRef, useState } from "react";
import { TEPKI_TANIMLARI, tepkiBilinen, tepkiDurumu, tepkiGorseli, useTepkiGizli } from "../lib/kozmetik.js";
import { tt } from "../lib/dil.js";
import "../tasarim/ekranlar/kozmetik.css";

const rastgeleKimlik = () => {
  try { return crypto.randomUUID(); } catch { return `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
};

/**
 * @param {{ macTur:"klasik"|"duello", macId:string, benId:string, rakipId:string|null,
 *           kanal:() => any, etkin?:boolean }} p   etkin=false → okuma yapılmaz (ör. maç bitti)
 */
export function useMacTepki({ macTur, macId, benId, rakipId, kanal, etkin = true }) {
  const [durum, setDurum] = useState(null);            // tepki_durumu yanıtı
  const [balonlar, setBalonlar] = useState({});        // { [userId]: { k, n } }
  const [bekle, setBekle] = useState(false);           // gönderim aralığı dolmadı
  const [gonderilen, setGonderilen] = useState(0);
  const gizli = useTepkiGizli();
  const zamanlar = useRef({});                          // balon zamanlayıcıları
  const sonGonderim = useRef(0);
  const alinan = useRef({});                            // { [userId]: { son, sayi } }
  const kanalRef = useRef(kanal);
  kanalRef.current = kanal;
  const rakipRef = useRef(rakipId);
  rakipRef.current = rakipId;
  const gizliRef = useRef(gizli);
  gizliRef.current = gizli;
  const durumRef = useRef(durum);
  durumRef.current = durum;

  useEffect(() => {
    if (!etkin || !macId || !benId) return undefined;
    let aktif = true;
    tepkiDurumu(macTur, macId).then((d) => { if (aktif) setDurum(d ?? { acik: false }); });
    return () => { aktif = false; };
  }, [etkin, macTur, macId, benId]);

  useEffect(() => () => { Object.values(zamanlar.current).forEach(clearTimeout); }, []);

  const aralikMs = Math.max(1, Number(durum?.aralik_sn ?? 3)) * 1000;
  const macMax = Math.max(0, Number(durum?.mac_max ?? 10));
  const balonMs = Math.max(800, Number(durum?.balon_ms ?? 2000));

  const balonGoster = useCallback((kim, k) => {
    clearTimeout(zamanlar.current[kim]);
    setBalonlar((b) => ({ ...b, [kim]: { k, n: (b[kim]?.n ?? 0) + 1 } }));
    zamanlar.current[kim] = setTimeout(() => {
      setBalonlar((b) => { const y = { ...b }; delete y[kim]; return y; });
    }, balonMs);
  }, [balonMs]);

  /** Kanal "tepki" yayını geldi. */
  const al = useCallback((yuk) => {
    const d = durumRef.current;
    if (!d?.acik || !yuk) return;
    const kim = String(yuk.u ?? "");
    const k = yuk.k;
    if (!kim || kim !== String(rakipRef.current ?? "") || !tepkiBilinen(k)) return;
    const simdi = Date.now();
    const a = alinan.current[kim] ?? { son: 0, sayi: 0 };
    const aralik = Math.max(1, Number(d.aralik_sn ?? 3)) * 1000;
    // Alıcı sınırı: gönderen başına 3 sn'de 1 (küçük ağ sapması payı), maçta 10 — fazlası yok sayılır.
    if (simdi - a.son < aralik - 250 || a.sayi >= Math.max(0, Number(d.mac_max ?? 10))) return;
    alinan.current[kim] = { son: simdi, sayi: a.sayi + 1 };
    if (gizliRef.current) return;
    balonGoster(kim, k);
  }, [balonGoster]);

  /** Tepki gönder (yalnız sahip olunanlar; sınırlar istemcide). Dönüş: gönderildi mi. */
  const gonder = useCallback((k) => {
    const d = durumRef.current;
    if (!d?.acik || !tepkiBilinen(k) || !(d.tepkiler ?? []).includes(k)) return false;
    const simdi = Date.now();
    if (simdi - sonGonderim.current < aralikMs || gonderilen >= macMax) return false;
    const ch = kanalRef.current?.();
    if (!ch) return false;
    sonGonderim.current = simdi;
    setGonderilen((n) => n + 1);
    setBekle(true);
    setTimeout(() => setBekle(false), aralikMs);
    balonGoster(benId, k);
    try {
      Promise.resolve(ch.send({ type: "broadcast", event: "tepki", payload: { id: rastgeleKimlik(), k, u: benId } }))
        .catch((e) => console.warn("[Bildim] tepki gönderilemedi:", e?.message ?? e));
    } catch (e) {
      console.warn("[Bildim] tepki gönderilemedi:", e?.message ?? e);
    }
    return true;
  }, [aralikMs, macMax, gonderilen, balonGoster, benId]);

  return {
    acik: Boolean(durum?.acik),
    tepkiler: (durum?.tepkiler ?? []).filter(tepkiBilinen),
    balonlar,
    al,
    gonder,
    bekle,
    kalan: Math.max(0, macMax - gonderilen),
  };
}

/** Avatarın yanında ~2 sn balon. `yan`: "sen" | "rakip" (rakipte ayna). */
export function TepkiBalonu({ balon, yan = "sen" }) {
  if (!balon?.k || !tepkiBilinen(balon.k)) return null;
  const t = TEPKI_TANIMLARI[balon.k];
  return (
    <span key={balon.n} className={`qt-tepki-balon qt-tepki-balon--${yan}`} role="img" aria-label={tt(t.ad)}>
      <img src={tepkiGorseli(balon.k)} alt="" width="30" height="30" decoding="async" />
    </span>
  );
}

/** Avatar + balon yuvası (balon avatarın köşesinde, akışı itmez). */
export function TepkiAvatar({ balon, yan, children }) {
  return (
    <span className="qt-tepki-yuva">
      {children}
      <TepkiBalonu balon={balon} yan={yan} />
    </span>
  );
}

/** Küçük tepki düğmesi + açılan seçim (yalnız kullanabildiğin tepkiler). */
export function TepkiCubugu({ tepki, className = "" }) {
  const [acik, setAcik] = useState(false);
  if (!tepki?.acik || !tepki.tepkiler.length) return null;
  const bitti = tepki.kalan <= 0;
  return (
    <div className={`qt-tepki ${className}`}>
      {/* QtIkonDugme görünümü; ikon Noto 3D (sistem emojisi yerine, her cihazda aynı) */}
      <button type="button" className={`qt-ikon-dugme qt-ikon-dugme--${acik ? "mor" : "yuzey"} qt-ikon-dugme--o qt-tepki-dugme`}
              aria-label={bitti ? tt("Bu maçta tepki hakkın bitti") : tt("Tepki gönder")}
              title={bitti ? tt("Bu maçta tepki hakkın bitti") : tt("Tepki gönder")}
              aria-expanded={acik} disabled={bitti} onClick={() => setAcik((a) => !a)}>
        <img src={tepkiGorseli("havali")} alt="" width="24" height="24" decoding="async" />
      </button>
      {acik && !bitti && (
        <div className="qt-tepki-panel" role="group" aria-label={tt("Tepkiler")}>
          {tepki.tepkiler.map((k) => (
            <button key={k} type="button" className="qt-tepki-sec" disabled={tepki.bekle}
                    aria-label={tt(TEPKI_TANIMLARI[k].ad)}
                    onClick={() => { if (tepki.gonder(k)) setAcik(false); }}>
              <img src={tepkiGorseli(k)} alt="" width="32" height="32" loading="lazy" decoding="async" />
            </button>
          ))}
          <span className="qt-tepki-kalan qt-sayi" aria-label={tt("{n} tepki hakkın kaldı", { n: tepki.kalan })}>{tepki.kalan}</span>
        </div>
      )}
    </div>
  );
}
