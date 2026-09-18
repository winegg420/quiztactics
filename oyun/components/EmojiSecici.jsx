import { useEffect, useRef, useState } from "react";
import { tt } from "../lib/dil.js";

// ============================================================
// EMOJİ SEÇİCİ — mesajlaşma (Paket 35 E.3.3)
//
// Hazır kütüphane YOK (yeni paket yasak): 60 emoji, altı kategori, düz Unicode.
// Emojiye dokunmak onEkle'yi çağırır, seçici KAPANMAZ (arka arkaya eklenebilsin).
// Dışarı dokununca ya da Esc ile kapanır. `haricRef`: emoji düğmesi — ona basmak
// "dışarı" sayılmaz (düğme zaten aç/kapa yapıyor).
// ============================================================
const KATEGORILER = [
  { kod: "yuz", ad: tt("Yüzler"), simge: "😀",
    liste: ["😀", "😂", "🤣", "😊", "😍", "😎", "🤔", "😅", "😢", "😡"] },
  { kod: "el", ad: tt("El hareketleri"), simge: "👍",
    liste: ["👍", "👎", "👏", "🙌", "👋", "🤝", "✌️", "🤞", "💪", "🙏"] },
  { kod: "kalp", ad: tt("Kalpler"), simge: "❤️",
    liste: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💔", "💖"] },
  { kod: "oyun", ad: tt("Oyun"), simge: "🎮",
    liste: ["🎮", "🏆", "🥇", "🎯", "⚔️", "🛡️", "🧠", "❓", "💡", "⏱️"] },
  { kod: "hayvan", ad: tt("Hayvanlar"), simge: "🐱",
    liste: ["🐱", "🐶", "🦊", "🐼", "🐯", "🦁", "🐸", "🐵", "🦉", "🐢"] },
  { kod: "kutlama", ad: tt("Kutlama"), simge: "🎉",
    liste: ["🎉", "🎊", "🥳", "🎈", "🎁", "✨", "🔥", "⭐", "🌟", "💯"] },
];

export default function EmojiSecici({ onEkle, onKapat, haricRef }) {
  const [kat, setKat] = useState(KATEGORILER[0].kod);
  const kutuRef = useRef(null);

  useEffect(() => {
    const disari = (e) => {
      const hedef = e.target;
      if (kutuRef.current?.contains(hedef)) return;
      if (haricRef?.current?.contains(hedef)) return;
      onKapat();
    };
    const tus = (e) => { if (e.key === "Escape") onKapat(); };
    document.addEventListener("pointerdown", disari);
    document.addEventListener("keydown", tus);
    return () => {
      document.removeEventListener("pointerdown", disari);
      document.removeEventListener("keydown", tus);
    };
  }, [onKapat, haricRef]);

  const secili = KATEGORILER.find((k) => k.kod === kat) ?? KATEGORILER[0];

  return (
    <div className="bd-emoji-secici" ref={kutuRef} role="dialog" aria-label={tt("Emoji seç")}>
      <div className="bd-emoji-sekmeler" role="tablist">
        {KATEGORILER.map((k) => (
          <button
            key={k.kod}
            type="button"
            role="tab"
            aria-selected={k.kod === kat}
            aria-label={k.ad}
            className={`bd-emoji-sekme${k.kod === kat ? " aktif" : ""}`}
            // Odağı metin kutusundan çalmasın (mobilde klavye kapanmasın)
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => setKat(k.kod)}
          >
            {k.simge}
          </button>
        ))}
      </div>
      <div className="bd-emoji-izgara" role="tabpanel" aria-label={secili.ad}>
        {secili.liste.map((em) => (
          <button
            key={em}
            type="button"
            className="bd-emoji"
            aria-label={em}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => onEkle(em)}
          >
            {em}
          </button>
        ))}
      </div>
    </div>
  );
}
