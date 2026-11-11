/** Lucide has no tooth icon, so this is a small hand-drawn one in the same 24px, 2px-stroke style. */
export default function ToothLogo({ className = 'icon' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 5.5C10.5 4 7.5 3.5 6 5c-1.8 1.8-1.2 5 0 7 .9 1.6 1 3.8 1.5 6 .4 1.7 2 1.8 2.4.2.4-1.6.8-3.7 2.1-3.7s1.7 2.1 2.1 3.7c.4 1.6 2 1.5 2.4-.2.5-2.2.6-4.4 1.5-6 1.2-2 1.8-5.2 0-7-1.5-1.5-4.5-1-6 .5Z" />
    </svg>
  );
}
