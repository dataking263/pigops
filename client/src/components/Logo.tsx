// Custom inline SVG logo — minimal geometric pig silhouette in a rounded square
// Works at 24px and 200px. Monochrome — uses currentColor.

export function Logo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="PigOps"
      className={className}
    >
      {/* Rounded square mark */}
      <rect x="1" y="1" width="30" height="30" rx="8" fill="currentColor" />
      {/* Stylized pig silhouette inside (negative space) */}
      <g fill="none" stroke="hsl(var(--primary-foreground))" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {/* Body */}
        <path d="M8 17.5c0-3.6 3.1-6.5 7-6.5h3l2.5-2.2v3.4c1.6.9 2.7 2.3 3.1 4l1.4.5v3.2l-1.4.4c-.4 1.6-1.4 3-2.9 3.9v1.8h-2.2v-1.2H12v1.2H9.8v-2c-1.1-1.1-1.8-2.5-1.8-4.1Z" />
        {/* Snout */}
        <path d="M22 16.6h2.5" />
        <circle cx="20.6" cy="16.6" r="0.5" fill="hsl(var(--primary-foreground))" stroke="none" />
        {/* Eye */}
        <circle cx="17.5" cy="14" r="0.6" fill="hsl(var(--primary-foreground))" stroke="none" />
        {/* Ear */}
        <path d="M14.5 11.5l-1 -2 2.5 .8" />
        {/* Tail curl */}
        <path d="M8 18c-1.2 0-1.8.8-1.4 1.6.4.7 1.4.7 1.4-.2" />
      </g>
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-primary">
        <Logo size={28} />
      </span>
      <div className="flex flex-col leading-tight">
        <span className="font-semibold text-[15px] tracking-tight">PigOps</span>
        <span className="text-[10px] text-muted-foreground tracking-wide uppercase">Makina Family Piggery</span>
      </div>
    </div>
  );
}
