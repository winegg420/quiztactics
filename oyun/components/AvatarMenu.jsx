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
import Avatar from "../../src/components/Avatar.jsx";
import Ikon from "./Ikon.jsx";
import { sesAcikMi, sesAyarla, sesDinle } from "../lib/ses.js";
import { useDil } from "../lib/dilKanca.js";
import { DILLER, tt } from "../lib/dil.js";
import { y } from "../lib/yol.js";

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

  return (
    <div className="bd-avatar-menu-kap" ref={kapRef}>
      <button type="button" ref={dugmeRef} className="bd-profil-link bd-avatar-menu-dugme avatar-button"
              aria-haspopup="menu" aria-expanded={acik} aria-label={tt("Profilim ve ayarlar")}
              onClick={() => setAcik((a) => !a)}>
        <Avatar profile={profile} boyut={34} />
      </button>
      {acik && (
        <div className="bd-avatar-menu" role="menu" ref={menuRef} aria-label={tt("Profilim ve ayarlar")}>
          <button type="button" role="menuitem" onClick={() => git(y("/profil"))}>
            <Ikon ad="kisi" boyut={18} /> {tt("Profilim")}
          </button>
          <button type="button" role="menuitem" onClick={() => git(y("/profil?sekme=ayarlar"))}>
            <Ikon ad="ayar" boyut={18} /> {tt("Ayarlar")}
          </button>
          <button type="button" role="menuitemcheckbox" aria-checked={ses} onClick={sesDegistir}>
            <Ikon ad={ses ? "sesAcik" : "sesKapali"} boyut={18} /> {tt("Ses")}
            <span className="bd-avatar-menu-durum">{ses ? tt("Açık") : tt("Kapalı")}</span>
          </button>
          <div className="bd-avatar-menu-dil" role="group" aria-label={tt("Dil")}>
            <Ikon ad="dunya" boyut={18} />
            {DILLER.map((d) => (
              <button key={d} type="button" role="menuitemradio" aria-checked={dil === d}
                      className={dil === d ? "aktif" : ""} onClick={() => dilDegistir(d)}>
                {d.toUpperCase()}
              </button>
            ))}
          </div>
          <button type="button" role="menuitem" className="cikis" onClick={cikis}>
            <Ikon ad="cikis" boyut={18} /> {tt("Çıkış Yap")}
          </button>
        </div>
      )}
    </div>
  );
}
