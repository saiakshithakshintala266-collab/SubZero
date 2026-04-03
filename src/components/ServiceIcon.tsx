import {
  Tv,
  Palette,
  Brain,
  Newspaper,
  Music,
  Gamepad2,
  Cloud,
  ShoppingBag,
  Dumbbell,
  Zap,
} from "lucide-react";

interface ServiceIconProps {
  name: string;
  size?: "sm" | "md";
}

const SERVICE_MAP: Record<string, { icon: typeof Tv; color: string; bg: string }> = {
  netflix:   { icon: Tv,         color: "#E50914", bg: "rgba(229,9,20,0.12)" },
  spotify:   { icon: Music,      color: "#1ed760", bg: "rgba(30,215,96,0.12)" },
  adobe:     { icon: Palette,    color: "#FF0000", bg: "rgba(255,0,0,0.10)" },
  chatgpt:   { icon: Brain,      color: "#10A37F", bg: "rgba(16,163,127,0.12)" },
  openai:    { icon: Brain,      color: "#10A37F", bg: "rgba(16,163,127,0.12)" },
  "ny times":{ icon: Newspaper,  color: "#aaa",    bg: "rgba(170,170,170,0.10)" },
  nytimes:   { icon: Newspaper,  color: "#aaa",    bg: "rgba(170,170,170,0.10)" },
  apple:     { icon: Cloud,      color: "#c5c4dc", bg: "rgba(197,196,220,0.12)" },
  amazon:    { icon: ShoppingBag,color: "#FF9900", bg: "rgba(255,153,0,0.12)" },
  equinox:   { icon: Dumbbell,   color: "#c8c6c1", bg: "rgba(200,198,193,0.10)" },
  steam:     { icon: Gamepad2,   color: "#66c0f4", bg: "rgba(102,192,244,0.12)" },
  creative:  { icon: Palette,    color: "#FF0000", bg: "rgba(255,0,0,0.10)" },
};



export default function ServiceIcon({ name, size = "md" }: ServiceIconProps) {
  const key = name.toLowerCase().split(" ")[0];
  const cfg =
    SERVICE_MAP[key] ||
    SERVICE_MAP[Object.keys(SERVICE_MAP).find((k) => key.includes(k)) ?? ""] ||
    { icon: Zap, color: "var(--sz-primary)", bg: "rgba(255,180,169,0.10)" };

  const { icon: Icon, color, bg } = cfg;
  const sz = size === "sm" ? "w-8 h-8" : "w-10 h-10";
  const iconSz = size === "sm" ? "w-4 h-4" : "w-5 h-5";

  return (
    <div
      className={`${sz} rounded-xl flex items-center justify-center shrink-0`}
      style={{ background: bg }}
    >
      <Icon className={iconSz} style={{ color }} />
    </div>
  );
}
