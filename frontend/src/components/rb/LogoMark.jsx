export default function LogoMark({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="rb_p_g" x1="10" y1="8" x2="62" y2="66" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4F46E5" />
          <stop offset="0.55" stopColor="#7C3AED" />
          <stop offset="1" stopColor="#0F172A" />
        </linearGradient>
        <linearGradient id="rb_p_hi" x1="18" y1="22" x2="58" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.55" />
        </linearGradient>
      </defs>

      <rect x="8" y="8" width="56" height="56" rx="20" fill="url(#rb_p_g)" />
      <rect
        x="14"
        y="14"
        width="44"
        height="44"
        rx="16"
        fill="rgba(255,255,255,0.10)"
        stroke="rgba(255,255,255,0.18)"
      />
      <path
        d="M26 48V24h13.3c4.1 0 6.9 2.4 6.9 6.1 0 2.7-1.3 4.7-3.5 5.6 2.8.8 4.5 3 4.5 6 0 4.2-3.1 6.8-7.9 6.8H26Zm6.6-14.0h6.1c2.1 0 3.2-1.0 3.2-2.6 0-1.6-1.2-2.6-3.2-2.6h-6.1V34Zm0 9.0h6.7c2.3 0 3.6-1.1 3.6-2.9 0-1.8-1.3-2.9-3.6-2.9h-6.7V43Z"
        fill="url(#rb_p_hi)"
      />
    </svg>
  );
}