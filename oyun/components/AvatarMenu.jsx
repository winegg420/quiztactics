// ============================================================
// AVATAR MENÜSÜ (Paket 41 C) — üst çubuktaki avatara dokununca açılır.
// Profil › Ayarlar'a ulaşmak 3 adımdı (sekme → kaydır → Ayarlar). Bu menü KISAYOL;
// Profil › Ayarlar sekmesi yerinde duruyor.
//   Profilim · Ayarlar · Ses (bildim_ses, maç şeridi ve Ayarlar ile ortak) · Dil (TR/EN) · Çıkış Yap
// Erişilebilirlik: aria-haspopup/expanded, açılınca ilk öğeye odak, ↑/↓ gezinme,
// Esc ve dışarı dokunma kapatır, bütün öğeler ≥ 44 px.
// ============================================================
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../src/context/AuthContext.jsx";
import { QtAvatar, QtIkon, sinif } from "../tasarim/index.js";
import { sesAcikMi, sesAyarla, sesDinle } from "../lib/ses.js";
import { useDil } from "../lib/dilKanca.js";
import { DILLER, tt } from "../lib/dil.js";
import { y } from "../lib/yol.js";

// Profil görseli: gizlilik sonrası gorunen_* alanları, diğerlerinde avatar_url (Avatar.jsx ile aynı kural)
const gorsel = (p) => (p?.gorunen_avatar !== undefined ? p.gorunen_avatar : p?.avatar_url) || undefined;
const adi = (p) => p?.gorunen_ad ?? p?.username ?? "";

export default function AvatarMenu({ profile }) {
  const { signOut } = useAuth();
  const { dil, dilDegistir } = useDil();
  const navigate = useNavigate();
  const [acik, setAcik] = useState(false);
  const [ses, setSes] = useState(() => sesAcikMi());
  const kapRef = useRef(null);
  const menuRef = useRef(null);
  const dugmeRef = useRef(null);

  useEffect(() => sesDinle(setSes), []);

  // Dışarı dokunma + Esc kapatır; açılınca ilk öğeye odak
  useEffect(() => {
    if (!acik) return undefined;
    const disari = (e) => { if (kapRef.current && !kapRef.current.contains(e.target)) setAcik(false); };
    const tus = (e) => {
      if (e.key === "Escape") { setAcik(false); dugmeRef.current?.focus(); return; }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const ogeler = [...(menuRef.current?.querySelectorAll("[role=menuitem], [role=menuitemcheckbox], [role=menuitemradio]") ?? [])];
      if (!ogeler.length) return;
      e.preventDefault();
      const i = ogeler.indexOf(document.activeElement);
      const s = e.key === "ArrowDown" ? (i + 1) % ogeler.length : (i - 1 + ogeler.length) % ogeler.length;
      ogeler[s].focus();
    };
    document.addEventListener("pointerdown", disari);
    document.addEventListener("keydown", tus);
    menuRef.current?.querySelector("[role=menuitem]")?.focus();
    return () => { document.removeEventListener("pointerdown", disari); document.removeEventListener("keydown", tus); };
  }, [acik]);

  const git = (yol) => { setAcik(false); navigate(yol); };
  const sesDegistir = () => { const yeni = !ses; sesAyarla(yeni); setSes(yeni); };
  const cikis = async () => {
    setAcik(false);
    try { await signOut(); } catch (e) { console.error("[Bildim] çıkış yapılamadı:", e); }
  };

  // Menü öğesi: ikon + yazı (+ sağda durum). Hepsi ≥ 44 px, qt- düzeninde.
  return (
    <div className="a-avatar-menu-kap" ref={kapRef}>
      <button type="button" ref={dugmeRef} className="qt-avatar-dugme"
              aria-haspopup="menu" aria-expanded={acik} aria-label={tt("Profilim ve ayarlar")}
              onClick={() => setAcik((a) => !a)}>
        <QtAvatar src={gorsel(profile)} ad={adi(profile)} boyut="m" />
      </button>
      {acik && (
        <div className="a-avatar-menu" role="menu" ref={menuRef} aria-label={tt("Profilim ve ayarlar")}>
          <button type="button" role="menuitem" className="a-avatar-menu-oge" onClick={() => git(y("/profil"))}>
            <QtIkon ad="kisi" boyut={20} /> <span>{tt("Profilim")}</span>
          </button>
          <button type="button" role="menuitem" className="a-avatar-menu-oge" onClick={() => git(y("/profil?sekme=ayarlar"))}>
            <QtIkon ad="ayar" boyut={20} /> <span>{tt("Ayarlar")}</span>
          </button>
          <button type="button" role="menuitemcheckbox" aria-checked={ses} className="a-avatar-menu-oge" onClick={sesDegistir}>
            <QtIkon ad={ses ? "sesAcik" : "sesKapali"} boyut={20} /> <span>{tt("Ses")}</span>
            <span className={sinif("a-avatar-menu-durum", ses && "a-avatar-menu-durum--acik")}>{ses ? tt("Açık") : tt("Kapalı")}</span>
          </button>
          <div className="a-avatar-menu-dil" role="group" aria-label={tt("Dil")}>
            <QtIkon ad="dunya" boyut={20} />
            {DILLER.map((d) => (
              <button key={d} type="button" role="menuitemradio" aria-checked={dil === d}
                      className={sinif("a-avatar-menu-dil-dugme", dil === d && "a-avatar-menu-dil-dugme--secili")}
                      onClick={() => dilDegistir(d)}>
                {d.toUpperCase()}
              </button>
            ))}
          </div>
          <button type="button" role="menuitem" className="a-avatar-menu-oge a-avatar-menu-oge--cikis" onClick={cikis}>
            <QtIkon ad="cikis" boyut={20} /> <span>{tt("Çıkış Yap")}</span>
          </button>
        </div>
      )}
    </div>
  );
}
