/** Calm, decorative scene: sun, plant, a big friendly tooth. No people, so no stock faces posing as patients. */
export default function HeroIllustration() {
  return (
    <svg className="site-hero-art" viewBox="0 0 480 400" aria-hidden="true" focusable="false">
      <rect width="480" height="400" fill="#F0FDFA" />
      <circle cx="372" cy="92" r="52" fill="#FDE7C8" />
      <path d="M0 330 C120 300 340 300 480 330 V400 H0 Z" fill="#CCEBE6" />

      {/* plant */}
      <path d="M78 344 C66 292 88 246 128 226 C122 278 112 318 78 344 Z" fill="#0F766E" opacity=".85" />
      <path d="M74 344 C52 312 34 280 26 242 C62 252 86 292 74 344 Z" fill="#5EB8AE" />
      <path d="M76 344 C80 300 96 262 120 236" stroke="#115E59" strokeWidth="3" fill="none" strokeLinecap="round" />
      <rect x="52" y="338" width="50" height="34" rx="8" fill="#B45309" opacity=".75" />

      {/* tooth */}
      <ellipse cx="240" cy="340" rx="92" ry="12" fill="#0F766E" opacity=".12" />
      <path
        d="M240 118 C212 96 160 92 146 130 C134 164 146 206 160 236 C172 262 174 300 184 322 C190 338 210 336 212 318 C216 292 224 270 240 270 C256 270 264 292 268 318 C270 336 290 338 296 322 C306 300 308 262 320 236 C334 206 346 164 334 130 C320 92 268 96 240 118 Z"
        fill="#FFFFFF"
        stroke="#99D5CD"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path d="M176 142 C184 126 200 120 214 122" stroke="#CCEBE6" strokeWidth="8" fill="none" strokeLinecap="round" />

      {/* sparkles */}
      <path d="M352 196 Q352 214 370 214 Q352 214 352 232 Q352 214 334 214 Q352 214 352 196 Z" fill="#0F766E" />
      <path d="M118 120 Q118 132 130 132 Q118 132 118 144 Q118 132 106 132 Q118 132 118 120 Z" fill="#B45309" />
      <path d="M392 280 Q392 288 400 288 Q392 288 392 296 Q392 288 384 288 Q392 288 392 280 Z" fill="#5EB8AE" />
    </svg>
  );
}
