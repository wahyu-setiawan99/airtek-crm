import { presetIndex } from "@/lib/avatar";
import { cn } from "@/lib/utils";

type Preset = { bg: string; skin: string; hair: string; shirt: string; style: "short" | "long" | "hijab" | "helmet" | "curly" | "bun" };

/** Built-in avatars: small inline drawings, so they cost no request and no image file. */
const PRESETS: Preset[] = [
  { bg: "#9a1b4b", skin: "#f1c7a3", hair: "#2a1b12", shirt: "#f6dde7", style: "short" },
  { bg: "#0f766e", skin: "#d9a27a", hair: "#115e59", shirt: "#ccfbf1", style: "hijab" },
  { bg: "#c2410c", skin: "#e8b48c", hair: "#facc15", shirt: "#fed7aa", style: "helmet" },
  { bg: "#4338ca", skin: "#8d5a3b", hair: "#1c1410", shirt: "#e0e7ff", style: "curly" },
  { bg: "#be185d", skin: "#f3cfb0", hair: "#3b2416", shirt: "#fce7f3", style: "long" },
  { bg: "#15803d", skin: "#c68b5e", hair: "#231711", shirt: "#dcfce7", style: "bun" },
  { bg: "#0369a1", skin: "#e2a97f", hair: "#7c2d12", shirt: "#e0f2fe", style: "hijab" },
  { bg: "#57534e", skin: "#f0c09a", hair: "#f8fafc", shirt: "#e7e5e4", style: "helmet" },
];

function PresetArt({ preset }: { preset: Preset }) {
  const { bg, skin, hair, shirt, style } = preset;
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden focusable="false">
      <rect width="64" height="64" fill={bg} />
      {style === "long" ? <path d="M19 29C19 17 25 12 32 12s13 5 13 17v16c-4 2-22 2-26 0Z" fill={hair} /> : null}
      {style === "hijab" ? <path d="M17 31c0-12 6-19 15-19s15 7 15 19c0 9-5 16-15 18-10-2-15-9-15-18Z" fill={hair} /> : null}
      <path d="M11 64c0-13 9-21 21-21s21 8 21 21Z" fill={style === "hijab" ? hair : shirt} />
      {style === "hijab" ? <ellipse cx="32" cy="29" rx="9" ry="10" fill={skin} /> : <circle cx="32" cy="28" r="11" fill={skin} />}
      {style === "short" ? <path d="M21 27c0-9 5-14 11-14 7 0 11 5 11 14-2-5-6-8-11-8s-9 3-11 8Z" fill={hair} /> : null}
      {style === "long" ? <path d="M21 26c1-7 6-10 11-10s10 3 11 10c-4-4-18-4-22 0Z" fill={hair} /> : null}
      {style === "curly" ? (
        <g fill={hair}>
          <circle cx="23" cy="20" r="5" />
          <circle cx="30" cy="16" r="5.5" />
          <circle cx="37" cy="17" r="5" />
          <circle cx="42" cy="22" r="4.5" />
        </g>
      ) : null}
      {style === "bun" ? (
        <g fill={hair}>
          <circle cx="32" cy="12" r="5" />
          <path d="M21 26c0-8 5-12 11-12s11 4 11 12c-3-4-7-6-11-6s-8 2-11 6Z" />
        </g>
      ) : null}
      {style === "helmet" ? (
        <g fill={hair}>
          <path d="M20 24c0-8 5-13 12-13s12 5 12 13Z" />
          <rect x="17" y="23" width="30" height="3.5" rx="1.75" />
        </g>
      ) : null}
      <circle cx="28" cy="29" r="1.4" fill="#1f1611" />
      <circle cx="36" cy="29" r="1.4" fill="#1f1611" />
      <path d="M29 34c2 1.6 4 1.6 6 0" stroke="#1f1611" strokeWidth="1.3" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/** A person's picture: an uploaded photo or one of the built-in drawings. */
export function UserAvatar({ avatar, className, label }: { avatar: string; className?: string; label?: string }) {
  const preset = presetIndex(avatar);
  return (
    <span
      className={cn("inline-block shrink-0 overflow-hidden rounded-full bg-muted", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {preset !== null ? (
        <PresetArt preset={PRESETS[preset]} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- a 256px photo, already compressed
        <img src={avatar} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
      )}
    </span>
  );
}
