import Image from "next/image";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "auto" | "light" | "dark" | "white";
  showText?: boolean;
}

export function Logo({
  className = "",
  size = "md",
  variant = "auto",
  showText = true,
}: LogoProps) {
  // Height sizing
  const dimensions =
    size === "sm"
      ? { width: 140, height: 35, hClass: "h-7 sm:h-8" }
      : size === "lg"
      ? { width: 220, height: 55, hClass: "h-11 sm:h-12" }
      : { width: 176, height: 44, hClass: "h-9 sm:h-10" };

  if (!showText) {
    // Icon-only view (e.g. collapsed sidebar or favicon mark)
    const iconDim = size === "sm" ? 32 : size === "lg" ? 48 : 40;
    return (
      <div className={`relative inline-flex items-center shrink-0 ${className}`}>
        <Image
          src="/favicon.png"
          alt="Nirapode"
          width={iconDim}
          height={iconDim}
          priority
          className="rounded-xl object-contain drop-shadow-xs"
        />
      </div>
    );
  }

  if (variant === "dark" || variant === "white") {
    // Dedicated dark background version (white text)
    return (
      <div className={`relative inline-flex items-center shrink-0 ${className}`}>
        <Image
          src="/logo-dark.png"
          alt="Nirapode"
          width={dimensions.width}
          height={dimensions.height}
          priority
          className={`w-auto ${dimensions.hClass} object-contain`}
        />
      </div>
    );
  }

  if (variant === "light") {
    // Dedicated light background version (dark text)
    return (
      <div className={`relative inline-flex items-center shrink-0 ${className}`}>
        <Image
          src="/logo-light.png"
          alt="Nirapode"
          width={dimensions.width}
          height={dimensions.height}
          priority
          className={`w-auto ${dimensions.hClass} object-contain`}
        />
      </div>
    );
  }

  // "auto": displays logo-light on light theme, and logo-dark on dark theme
  return (
    <div className={`relative inline-flex items-center shrink-0 ${className}`}>
      {/* Light theme logo */}
      <Image
        src="/logo-light.png"
        alt="Nirapode"
        width={dimensions.width}
        height={dimensions.height}
        priority
        className={`w-auto ${dimensions.hClass} object-contain dark:hidden`}
      />
      {/* Dark theme logo */}
      <Image
        src="/logo-dark.png"
        alt="Nirapode"
        width={dimensions.width}
        height={dimensions.height}
        priority
        className={`w-auto ${dimensions.hClass} object-contain hidden dark:block`}
      />
    </div>
  );
}
