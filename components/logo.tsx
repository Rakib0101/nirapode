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
  // Height sizing: using exact aspect ratio of 349 x 88 (~3.96:1)
  const dimensions =
    size === "sm"
      ? { width: 124, height: 31, hClass: "h-7 sm:h-7.5" }
      : size === "lg"
      ? { width: 198, height: 50, hClass: "h-11 sm:h-12" }
      : { width: 158, height: 40, hClass: "h-8.5 sm:h-9" };

  if (!showText) {
    const iconDim = size === "sm" ? 28 : size === "lg" ? 44 : 36;
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
