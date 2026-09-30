// Sezon Yolu'na özel iki küçük simge (QtIkon setinde taç ve sonsuz yok). QtIkon ile aynı çizgi dili: currentColor, yuvarlak uç.
export function TacIkon({ boyut = 20, className = "" }) {
  return (
    <svg className={`qt-ikon ${className}`} width={boyut} height={boyut} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path className="qt-ikon-d" d="M3.5 8l4.5 4 4-6.5 4 6.5 4.5-4-1.5 10h-14z" />
      <path d="M3.5 8l4.5 4 4-6.5 4 6.5 4.5-4-1.5 10h-14z" />
      <path d="M6 21h12" />
    </svg>
  );
}

export function SonsuzIkon({ boyut = 24, className = "" }) {
  return (
    <svg className={`qt-ikon ${className}`} width={boyut} height={boyut} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 12c-1.8-2.6-3.4-4-5.2-4a4 4 0 1 0 0 8c1.8 0 3.4-1.4 5.2-4zm0 0c1.8 2.6 3.4 4 5.2 4a4 4 0 1 0 0-8c-1.8 0-3.4 1.4-5.2 4z" strokeWidth="2.8" />
    </svg>
  );
}
