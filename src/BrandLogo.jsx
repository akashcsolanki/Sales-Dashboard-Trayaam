import React from "react";
export default function BrandLogo({ caption }) {
  return (
    <span className="official-brand">
      <img
        src="/brand/trayaam-emblem.webp"
        width="37"
        height="44"
        alt="Trayaam column and lotus emblem"
      />
      <span>
        <span className="official-wordmark">Trayaam</span>
        {caption && <small>{caption}</small>}
      </span>
    </span>
  );
}
