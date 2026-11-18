import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Adani Institute of Higher Education and Research logo (transparent PNGs in /public/brand).
 * Two variants are rendered and switched with CSS so there is no flash when the theme changes:
 * the dark variant has brightened colours and light-grey text for dark backgrounds.
 */

export function BrandMark({ size = 40, className }: { size?: number; className?: string }) {
  const h = Math.round(size * (260 / 256));
  return (
    <span className={cn("relative inline-block shrink-0", className)} style={{ width: size, height: h }}>
      <Image src="/brand/adani-mark.png" alt="" width={256} height={260} sizes={`${size}px`} className="size-full object-contain dark:hidden" priority />
      <Image src="/brand/adani-mark-dark.png" alt="" width={256} height={260} sizes={`${size}px`} className="hidden size-full object-contain dark:block" priority />
    </span>
  );
}

export function BrandLockup({ width = 220, className }: { width?: number; className?: string }) {
  return (
    <span className={cn("relative inline-block", className)} style={{ width }}>
      <Image src="/brand/adani-logo.png" alt="Adani Institute of Higher Education and Research (Deemed to be University)" width={720} height={299} sizes={`${width}px`} className="h-auto w-full dark:hidden" priority />
      <Image src="/brand/adani-logo-dark.png" alt="" aria-hidden width={720} height={299} sizes={`${width}px`} className="hidden h-auto w-full dark:block" priority />
    </span>
  );
}
