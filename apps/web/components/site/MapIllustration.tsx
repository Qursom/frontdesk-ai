/**
 * Static map drawing instead of a Google Maps embed: no third-party cookies before consent.
 */
export default function MapIllustration() {
  return (
    <svg
      className="site-map-art"
      viewBox="0 0 400 260"
      role="img"
      aria-label="Map illustration: the clinic on Upper Street, a 5-minute walk north of Angel station."
    >
      <rect width="400" height="260" fill="#F0FDFA" />
      <path d="M0 210 C90 196 170 230 400 200 V260 H0 Z" fill="#CCEBE6" />
      {/* blocks */}
      <g fill="#FFFFFF" stroke="#E2E8F0">
        <rect x="24" y="24" width="120" height="70" rx="8" />
        <rect x="24" y="118" width="120" height="70" rx="8" />
        <rect x="248" y="24" width="128" height="70" rx="8" />
        <rect x="248" y="118" width="128" height="70" rx="8" />
      </g>
      {/* roads */}
      <path d="M196 0 V260" stroke="#FFFFFF" strokeWidth="34" />
      <path d="M0 106 H400" stroke="#FFFFFF" strokeWidth="18" />
      <path d="M196 0 V260" stroke="#E2E8F0" strokeWidth="2" strokeDasharray="8 8" />
      <text x="208" y="250" fontSize="12" fill="#475569" fontFamily="system-ui, sans-serif">Upper Street</text>
      {/* station */}
      <circle cx="196" cy="214" r="13" fill="#B91C1C" />
      <rect x="185" y="211" width="22" height="6" fill="#FFFFFF" />
      <text x="216" y="219" fontSize="13" fontWeight="600" fill="#0F172A" fontFamily="system-ui, sans-serif">Angel</text>
      {/* walking route */}
      <path d="M196 198 V88" stroke="#0F766E" strokeWidth="3" strokeDasharray="2 7" strokeLinecap="round" />
      {/* clinic pin */}
      <path d="M196 30 C182 30 172 40 172 53 C172 70 196 88 196 88 C196 88 220 70 220 53 C220 40 210 30 196 30 Z" fill="#0F766E" />
      <circle cx="196" cy="53" r="8" fill="#FFFFFF" />
      <text x="228" y="56" fontSize="13" fontWeight="600" fill="#0F172A" fontFamily="system-ui, sans-serif">Bright Smile Dental</text>
      <text x="228" y="72" fontSize="12" fill="#475569" fontFamily="system-ui, sans-serif">5-minute walk</text>
    </svg>
  );
}
