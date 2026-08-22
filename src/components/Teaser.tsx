"use client";

import { useState, useEffect } from "react";

export default function Teaser() {
  const [gone, setGone] = useState(false);

  useEffect(() => {
    // Teaser nhẹ: tổng ~2.4s rồi biến mất
    const t = setTimeout(() => setGone(true), 2400);
    return () => clearTimeout(t);
  }, []);

  if (gone) return null;

  return (
    <div className="teaser" aria-hidden="true">
      <div className="teaser-inner">
        <div className="teaser-letters">
          {["M", "I", "A", "v", "n"].map((ch, i) => (
            <span
              key={i}
              className="teaser-letter"
              style={{ animationDelay: `${i * 0.12}s` }}
            >
              {ch}
            </span>
          ))}
        </div>
        <img src="/logo-miavn-white.png" alt="" className="teaser-logo" />
      </div>
    </div>
  );
}
