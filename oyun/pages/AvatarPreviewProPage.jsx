import { useEffect } from "react";
import { AVATAR_PRO } from "../components/AvatarProIllustrations.jsx";
import "../styles/avatar-preview-pro.css";

export default function AvatarPreviewProPage() {
  useEffect(() => {
    const oncekiBaslik = document.title;
    document.title = "Avatar Profil Seti | Quiz Tactics";
    return () => { document.title = oncekiBaslik; };
  }, []);

  return (
    <main className="avatar-pro">
      <header className="avatar-pro__baslik">
        <span>PROFİL GÖRSELİ ÇALIŞMASI</span>
        <h1>Avatar Seti</h1>
        <p>Mevcut Quiz Tactics ruhunun daha temiz, karakterli ve profesyonel yorumu.</p>
      </header>

      <section className="avatar-pro__grid" aria-label="On yeni avatar önizlemesi">
        {AVATAR_PRO.map(({ anahtar, Bilesen }) => (
          <article className="avatar-pro__kart" key={anahtar}>
            <Bilesen />
          </article>
        ))}
      </section>

      <footer>Yalnızca sanat yönü değerlendirmesi için hazırlanmıştır.</footer>
    </main>
  );
}
