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
//   /logo.png       — wordmark + slogan "Where passion belongs" (no icon, transparent bg)
//   /logo-icon.png  — icon-only (paddle + swoosh + pickleball, transparent bg)
// Legacy SVG variants kept under /brand/logos/ for tone overrides.
const SRC: Record<Variant, Record<Tone, string>> = {
  full: {
    color: "/logo.png",
    white: "/brand/logos/matchup-logo-white.svg",
    black: "/brand/logos/matchup-logo-black.svg",
    green: "/brand/logos/matchup-logo-green.svg",
  },
  icon: {
    color: "/logo-icon.png",
    white: "/brand/logos/matchup-icon-white.svg",
    black: "/brand/logos/matchup-icon-black.svg",
    green: "/logo-icon.png",
  },
  wordmark: {
    color: "/brand/logos/matchup-wordmark.svg",
    white: "/brand/logos/matchup-wordmark.svg",
    black: "/brand/logos/matchup-wordmark.svg",
    green: "/brand/logos/matchup-wordmark.svg",
  },
};

const BrandLogo = ({ variant = "full", tone = "color", className, alt = "MatchUp" }: BrandLogoProps) => (
  <img
    src={SRC[variant][tone]}
    alt={alt}
    className={cn("select-none", className)}
    draggable={false}
  />
);

export default BrandLogo;
