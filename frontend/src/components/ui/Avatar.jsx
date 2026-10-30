import { useState } from "react";

export default function Avatar({ name = "", src = "", size = 44, rounded = false, className = "" }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const [failedSrc, setFailedSrc] = useState(null);

  return (
    <span
      className={`avatar${rounded ? " avatar--circle" : ""}${className ? ` ${className}` : ""}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {src && failedSrc !== src ? (
        <img src={src} alt={name ? `${name}'s avatar` : "Avatar"} onError={() => setFailedSrc(src)} />
      ) : (
        <span aria-hidden="true">{initials || "?"}</span>
      )}
    </span>
  );
}
