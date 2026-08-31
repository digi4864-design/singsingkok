export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 font-bold text-2xl text-primary whitespace-nowrap ${className}`}
    >
      <svg width="30" height="30" viewBox="0 0 512 512" aria-hidden="true">
        <g transform="translate(256,300)">
          <path
            d="M -8,-30 A 78,78 0 0 1 -96,-96 A 78,78 0 0 1 -8,-30 Z"
            fill="currentColor"
          />
          <path
            d="M 6,-46 A 66,66 0 0 1 92,-104 A 66,66 0 0 1 6,-46 Z"
            fill="currentColor"
            opacity="0.55"
          />
          <path
            d="M -2,-20 C -2,20 2,55 2,80"
            stroke="currentColor"
            strokeWidth="20"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="2" cy="104" r="26" fill="#ffbb00" />
        </g>
      </svg>
      싱싱콕
    </span>
  );
}
