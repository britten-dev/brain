/** Server-side: read BW_PUBLIC_MODE (API routes, middleware). */
export function isPublicModeServer(): boolean {
  return process.env.BW_PUBLIC_MODE === "1";
}

/** Client-side: read NEXT_PUBLIC_BW_PUBLIC_MODE. */
export function isPublicModeClient(): boolean {
  return process.env.NEXT_PUBLIC_BW_PUBLIC_MODE === "1";
}
