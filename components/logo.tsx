import Image from "next/image";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "auto" | "light" | "dark" | "white";
  showText?: boolean;
}

export function Logo({
  className = "",
  size = "md",
  variant = "auto",
  showText = true,
}: LogoProps) {
  // Height sizing: using exact aspect ratio of 349 x 88 (~3.96:1)
  // Significantly increased to be prominent, bold and readable across all devices
  const dimensions =
    size === "sm"
      ? { width: 150, height: 38, hClass: "h-8 sm:h-9" }
      : size === "lg"
      ? { width: 250, height: 63, hClass: "h-13 sm:h-14 md:h-16" }
      : size === "xl"
      ? { width: 300, height: 76, hClass: "h-16 sm:h-18 md:h-20" }
      : { width: 198, height: 50, hClass: "h-10 sm:h-11 md:h-12" };

  if (!showText) {
    const iconDim = size === "sm" ? 34 : size === "lg" ? 54 : 42;
    return (
      <div className={`relative inline-flex items-center shrink-0 ${className}`}>
        <Image
          src="/favicon.png"
          alt="Nirapode"
          width={iconDim}
          height={iconDim}
          priority
          className="w-auto h-auto object-contain drop-shadow-xs"
        />
      </div>
    );
  }

  if (variant === "dark" || variant === "white") {
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
      <Image
        src="/logo-light.png"
        alt="Nirapode"
        width={dimensions.width}
        height={dimensions.height}
        priority
        className={`w-auto ${dimensions.hClass} object-contain dark:hidden`}
      />
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
