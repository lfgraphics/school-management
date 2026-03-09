import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define public paths that don't require license check
const PUBLIC_PATHS = [
  "/activate",
  "/expired",
  "/api/license", // Allow license API calls
  "/api/auth", // Allow auth API calls
  "/_next",
  "/favicon.ico",
  "/static",
  "/images",
  "/public"
];

// Helper to check if license is valid
async function checkLicense(req: NextRequest) {
  // Check cookie cache first
  const licenseStatus = req.cookies.get("license_status")?.value;
  const licenseExpiry = req.cookies.get("license_expiry")?.value;
  const licenseVerifiedAt = req.cookies.get("license_verified_at")?.value;

  if (licenseStatus === 'active' && licenseExpiry) {
    const expiryDate = new Date(parseInt(licenseExpiry));
    
    // Check if cookie is expired
    if (expiryDate <= new Date()) {
        return { valid: false, needsValidation: true };
    }

    // Check if verification is stale (Force re-check every 5 minutes)
    // This allows admin updates (revoke/expire) to propagate reasonably fast
    if (!licenseVerifiedAt || (Date.now() - parseInt(licenseVerifiedAt) > 5 * 60 * 1000)) {
        return { valid: false, needsValidation: true };
    }

    return { valid: true };
  }

  return { valid: false, needsValidation: true };
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip public paths
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check License
  const licenseCheck = await checkLicense(req);

  if (licenseCheck.valid) {
    return NextResponse.next();
  }

  if (licenseCheck.needsValidation) {
    // Redirect to validation endpoint
    const url = new URL("/api/license/validate", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // If license is missing/invalid but NOT needing validation (e.g. cookie check failed explicitly)
  // Check if expired cookie is present
  const licenseStatus = req.cookies.get("license_status")?.value;
  if (licenseStatus === 'expired') {
      return NextResponse.redirect(new URL("/expired", req.url));
  }

  // If validation failed or no license, redirect to activate
  return NextResponse.redirect(new URL("/activate", req.url));
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes) -> We handle specific API routes in PUBLIC_PATHS, others should be protected?
     *   Actually, let's protect everything and allowlist specific APIs.
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
