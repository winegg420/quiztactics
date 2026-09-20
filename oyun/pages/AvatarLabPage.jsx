import { useEffect } from "react";
import "../styles/avatar-lab.css";

const AVATARLAR = [
  { ad: "Panda", dosya: "panda.webp" },
  { ad: "Lina", dosya: "kadin.webp" },
  { ad: "Aras", dosya: "erkek.webp" },
  { ad: "Nova", dosya: "robot.webp" },
  { ad: "Rex", dosya: "t-rex.webp" },
  { ad: "Zuzu", dosya: "zurafa.webp" },
  { ad: "Dr. Mira", dosya: "doktor.webp" },
  { ad: "Karpuz", dosya: "karpuz.webp" },
  { ad: "Efe", dosya: "cocuk.webp" },
  { ad: "Lumi", dosya: "uzayli.webp" },
];

export default function AvatarLabPage() {
  useEffect(() => {
    const oncekiBaslik = document.title;
    document.title = "Avatar Preview Lab | Quiz Tactics";
    return () => { document.title = oncekiBaslik; };
  }, []);

  return (
    <main className="avatar-lab">
      <div className="avatar-lab__isik avatar-lab__isik--sol" aria-hidden="true" />
      <div className="avatar-lab__isik avatar-lab__isik--sag" aria-hidden="true" />

      <header className="avatar-lab__baslik">
        <span className="avatar-lab__etiket">PREVIEW LAB</span>
        <h1>Avatar Koleksiyonu</h1>
        <p>Quiz Tactics için hazırlanan 10 özgün profil karakteri.</p>
      </header>

      <section className="avatar-lab__grid" aria-label="Avatar önizlemeleri">
        {AVATARLAR.map((avatar, index) => (
          <article className="avatar-lab__kart" key={avatar.dosya}>
            <img
              src={`/avatar-lab/${avatar.dosya}`}
              alt={`${avatar.ad} profil avatarı`}
              width="768"
              height="768"
              loading={index < 4 ? "eager" : "lazy"}
              decoding="async"
            />
            <h2>{avatar.ad}</h2>
          </article>
        ))}
      </section>

      <p className="avatar-lab__dipnot">Yalnızca görsel değerlendirme içindir.</p>
    </main>
  );
}
