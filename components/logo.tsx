import Link from "next/link";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "brand" | "white";
  showText?: boolean;
}

export function Logo({
  className = "",
  size = "md",
  variant = "brand",
  showText = true,
}: LogoProps) {
  // Dimensions
  const iconSize = size === "sm" ? "w-7 h-7" : size === "lg" ? "w-10 h-10" : "w-8 h-8";
  const textSize = size === "sm" ? "text-lg" : size === "lg" ? "text-2xl" : "text-xl";
  const isWhite = variant === "white";

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Nirapode Shield Icon */}
      <div
        className={`${iconSize} rounded-xl flex items-center justify-center shrink-0 transition-transform hover:scale-105 ${
          isWhite
            ? "bg-white text-brand shadow-sm"
            : "bg-linear-to-tr from-brand via-purple-600 to-indigo-600 text-white shadow-md shadow-brand/20"
        }`}
      >
        <svg
          className="w-4/5 h-4/5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Shield Base */}
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          {/* Inner Safety Checkmark */}
          <path d="m9 12 2 2 4-4" strokeWidth="2.5" />
        </svg>
      </div>

      {/* Brand Name Typography */}
      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center tracking-tight">
            <span
              className={`font-black ${textSize} tracking-tight ${
                isWhite
                  ? "text-white"
                  : "bg-linear-to-r from-brand via-purple-700 to-indigo-800 bg-clip-text text-transparent"
              }`}
              style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
            >
              nirapode
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-0.5 mb-1 shrink-0" />
          </div>
          {size === "lg" && (
            <span
              className={`text-[10px] font-semibold tracking-wider uppercase mt-1 ${
                isWhite ? "text-white/80" : "text-muted-foreground"
              }`}
            >
              Expatriate Platform
            </span>
          )}
        </div>
      )}
    </div>
  );
}
