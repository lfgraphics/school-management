import * as jose from 'jose';

// This public key should be provided via environment variables in production
// It corresponds to the PRIVATE_KEY used in the FeeEase marketing platform
const PUBLIC_KEY_RAW = process.env.LICENSE_PUBLIC_KEY?.replace(/\\n/g, '\n') || '';

// Ensure it has PEM headers
const PUBLIC_KEY_PEM = PUBLIC_KEY_RAW.startsWith('-----BEGIN PUBLIC KEY-----')
  ? PUBLIC_KEY_RAW
  : `-----BEGIN PUBLIC KEY-----\n${PUBLIC_KEY_RAW}\n-----END PUBLIC KEY-----`;

if (!PUBLIC_KEY_RAW) {
  console.warn('LICENSE_PUBLIC_KEY is missing. License verification will fail.');
}

export interface LicensePayload {
  schoolId: string;
  plan: string;
  exp: number;
  iat: number;
}

export async function verifyLicense(token: string): Promise<LicensePayload | null> {
  try {
    if (!PUBLIC_KEY_PEM) {
      throw new Error('Public Key missing');
    }

    const publicKey = await jose.importSPKI(PUBLIC_KEY_PEM, 'RS256');
    
    const { payload } = await jose.jwtVerify(token, publicKey, {
      algorithms: ['RS256'],
    });

    return payload as unknown as LicensePayload;
  } catch (error) {
    console.error('License verification failed:', error);
    return null;
  }
}

// Global cache for license expiry to avoid DB hits on every request
// We use global to persist across hot reloads in dev
const globalCache = global as unknown as { licenseCache: { expiry: number | null } };
if (!globalCache.licenseCache) {
  globalCache.licenseCache = { expiry: null };
}

export const licenseCache = globalCache.licenseCache;
