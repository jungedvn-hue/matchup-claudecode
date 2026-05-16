import { cn } from "@/lib/utils";

type Variant = "full" | "icon" | "wordmark";
type Tone = "color" | "white" | "black" | "green";

interface BrandLogoProps {
  variant?: Variant;
  tone?: Tone;
  className?: string;
  alt?: string;
}

// Primary brand assets uploaded to /public:
//   /logo.png       — full lockup (icon + wordmark + slogan "Where passion belongs")
//   /Logo-icon.png  — icon-only (paddle + swoosh + pickleball)
// Legacy SVG variants kept under /brand/logos/ for tone overrides.
const SRC: Record<Variant, Record<Tone, string>> = {
  full: {
    color: "/logo.png",
    white: "/brand/logos/matchup-logo-white.svg",
    black: "/brand/logos/matchup-logo-black.svg",
    green: "/brand/logos/matchup-logo-green.svg",
  },
  icon: {
    color: "/Logo-icon.png",
    white: "/brand/logos/matchup-icon-white.svg",
    black: "/brand/logos/matchup-icon-black.svg",
    green: "/Logo-icon.png",
  },
  wordmark: {
    color: "/brand/logos/matchup-wordmark.svg",
    white: "/brand/logos/matchup-wordmark.svg",
    black: "/brand/logos/matchup-wordmark.svg",
    green: "/brand/logos/matchup-wordmark.svg",
  },
};

const BrandLogo = ({ variant = "full", tone = "color", className, alt = "MatchUp" }: BrandLogoProps) => {
  // The official PNG assets ship with a white background. Using mix-blend-multiply
  // makes that white tile blend into any light surface (only the artwork remains
  // visible). For dark surfaces, pass tone="white" to get the SVG variant instead.
  const blendsWhite = tone === "color" || tone === "green";
  return (
    <img
      src={SRC[variant][tone]}
      alt={alt}
      className={cn("select-none", blendsWhite && "mix-blend-multiply", className)}
      draggable={false}
    />
  );
};

export default BrandLogo;
