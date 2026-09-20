import { useEffect } from "react";
import { AVATAR_V2 } from "../components/AvatarLabV2Illustrations.jsx";
import "../styles/avatar-lab-v2.css";

export default function AvatarLabV2Page() {
  useEffect(() => {
    const oncekiBaslik = document.title;
    document.title = "Avatar Stil Denemesi | Quiz Tactics";
    return () => { document.title = oncekiBaslik; };
  }, []);

  return (
    <main className="avatar-v2">
      <header className="avatar-v2__baslik">
        <span>QUIZ TACTICS · ART LAB 02</span>
        <h1>Avatar Stil Denemesi</h1>
        <p>Parlak 3D yerine çizgisi, kusuru ve kişiliği olan dört illüstratif karakter.</p>
      </header>

      <section className="avatar-v2__grid" aria-label="İllüstratif avatar stil denemeleri">
        {AVATAR_V2.map(({ ad, tur, etiket, Bilesen }) => (
          <article className="avatar-v2__kart" key={ad}>
            <div className="avatar-v2__gorsel"><Bilesen /></div>
            <div className="avatar-v2__bilgi">
              <div>
                <h2>{ad}</h2>
                <p>{tur}</p>
              </div>
              <span>{etiket}</span>
            </div>
          </article>
        ))}
      </section>

      <footer className="avatar-v2__not">
        Amaç final görsel değil, doğru sanat yönünü seçmek.
      </footer>
    </main>
  );
}
