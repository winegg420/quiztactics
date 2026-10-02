/**
 * KATEGORİ SEÇİCİ (860 — kategoriye göre maç, 2 Eki 2026)
 *
 * Klasik ve Saf Bilgi başlatma ekranlarında (ana sayfa OYNA / Saf Bilgi penceresi, Modlar)
 * AYNI bileşen. "Karışık" başta ve varsayılan (kategori seçilmedi = eski davranış); bir kategori
 * seçilirse maçın bütün soruları o kategoriden gelir, rakip de aynı kategoriyi seçenlerden aranır.
 *
 * Liste `get_categories`'ten gelir ("genel" / "karisik" orada yok). Hangi kategorinin
 * seçilebildiğini sunucu söyler (`kategori_mac_uygunlar`: yeterli sorusu olmayan kategori soluk
 * ve seçilemez); asıl kapı yine sunucudadır — arama çağrısı kategoriyi yeniden doğrular.
 *
 * Renk rolü: seçili = mavi (`--qt-ikinci`). Yeni animasyon yok.
 *
 * @param {object} props
 * @param {string|null} props.deger          seçili kategori; null = Karışık
 * @param {(k: string|null) => void} props.onDegistir
 * @param {string} [props.aciklama]          başlığın yanındaki kısa not
 * @param {boolean} [props.devreDisi]
 * @param {string} [props.className]
 */
import { useEffect, useId, useRef, useState } from "react";
import KategoriIkon from "./KategoriIkon.jsx";
import { kategoriAdi, kategorileriSirala } from "../lib/kategoriler.js";
import { rpcDene } from "../lib/rpcDene.js";
import { useAuth } from "../../src/context/AuthContext.jsx";
import { tt } from "../lib/dil.js";
import { sinif } from "../tasarim/index.js";
import "../tasarim/ekranlar/a-kategori-secici.css";

// Pencere her açılışta iki RPC atmasın: liste oturum boyunca (oyuncu + dil başına) bir kez okunur.
const onbellek = new Map();   // anahtar → Promise<{ kategoriler, uygunlar }>
function listeyiOku(anahtar) {
  if (!onbellek.has(anahtar)) {
    const soz = (async () => {
      const [kat, uyg] = await Promise.all([rpcDene("get_categories"), rpcDene("kategori_mac_uygunlar")]);
      // Liste okunamadıysa önbelleğe yazılmaz: bir sonraki açılış yeniden dener.
      if (kat.error) onbellek.delete(anahtar);
      return {
        kategoriler: kat.data ?? [],
        // null = bilinmiyor (RPC okunamadı): hiçbir kategori soluk çizilmez, sunucu yine doğrular.
        uygunlar: Array.isArray(uyg.data) ? uyg.data : null,
      };
    })();
    onbellek.set(anahtar, soz);
  }
  return onbellek.get(anahtar);
}

export default function KategoriSecici({ deger = null, onDegistir, aciklama, devreDisi = false, className = "" }) {
  const { user, profile } = useAuth();
  const [liste, setListe] = useState(null);   // null = yükleniyor
  const seritRef = useRef(null);
  const baslikId = useId();
  const anahtar = `${user?.id ?? ""}:${profile?.dil ?? ""}:${profile?.ulke ?? ""}`;

  useEffect(() => {
    if (!user?.id) return undefined;
    let aktif = true;
    listeyiOku(anahtar).then((v) => { if (aktif) setListe(v); });
    return () => { aktif = false; };
  }, [anahtar, user?.id]);

  const secilebilir = (k) => !liste?.uygunlar || liste.uygunlar.includes(k);
  const kategoriler = kategorileriSirala(liste?.kategoriler ?? []);

  // Hatırlanan kategori artık seçilemiyorsa (soru azaldı, dil değişti) sessizce Karışık'a döner.
  useEffect(() => {
    if (!liste || !deger) return;
    const listede = liste.kategoriler.some((k) => k.kategori === deger);
    const uygun = !liste.uygunlar || liste.uygunlar.includes(deger);
    if (liste.kategoriler.length > 0 && (!listede || !uygun)) onDegistir?.(null);
  }, [liste, deger]); // eslint-disable-line react-hooks/exhaustive-deps

  // Seçili kategori şeritte görünür kalsın — yalnız ŞERİT yatay kayar (sayfa/pencere oynamaz), animasyonsuz.
  useEffect(() => {
    const e = seritRef.current;
    const secili = e?.querySelector('[aria-checked="true"]');
    if (!e || !secili) return;
    const s = secili.getBoundingClientRect();
    const k = e.getBoundingClientRect();
    if (s.left < k.left || s.right > k.right) e.scrollLeft += s.left + s.width / 2 - (k.left + k.width / 2);
  }, [deger, liste]);

  const secenek = (k, ad, uygun) => {
    const secili = (deger ?? null) === k;
    return (
      <button
        key={k ?? "karisik"}
        type="button"
        role="radio"
        aria-checked={secili}
        aria-disabled={!uygun || undefined}
        disabled={devreDisi || !uygun}
        title={uygun ? undefined : tt("Yeterli soru yok")}
        className={sinif("a-katsec-secenek", secili && "a-katsec-secenek--secili", !uygun && "a-katsec-secenek--kapali")}
        onClick={() => { if (!secili) onDegistir?.(k); }}
      >
        <KategoriIkon anahtar={k ?? "karisik"} boyut={26} plaka />
        <span className="a-katsec-ad">{ad}</span>
      </button>
    );
  };

  return (
    <div className={sinif("a-katsec", className)}>
      <p className="a-katsec-baslik" id={baslikId}>
        <b>{tt("Kategori")}</b>
        <span>{deger ? tt("Bütün sorular {ad} kategorisinden", { ad: kategoriAdi(deger) }) : (aciklama ?? tt("Tüm kategoriler"))}</span>
      </p>
      <div className="a-katsec-serit" ref={seritRef} role="radiogroup" aria-labelledby={baslikId}>
        {secenek(null, tt("Karışık"), true)}
        {kategoriler.map((k) => secenek(k.kategori, kategoriAdi(k.kategori), secilebilir(k.kategori)))}
      </div>
    </div>
  );
}
