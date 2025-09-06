import type { NextConfig } from 'next';

const isVercel = !!process.env.VERCEL;
const isWin = process.platform === 'win32';

const nextConfig: NextConfig = {
  // Only use a custom distDir for local Windows dev; Vercel expects `.next`
  ...(isWin && !isVercel ? { distDir: '.next-win' } : {}),
  images: {
    // Avoid requiring sharp locally on Windows; allow optimization on Vercel
    unoptimized: isWin && !isVercel,
  },
  // Windows-only workarounds for sharp tracing; not needed on Vercel
  ...(isWin && !isVercel
    ? {
        serverExternalPackages: ['sharp' as const],
        outputFileTracingExcludes: {
          '*': [
            '**/@img/sharp-*',
            '**/@img/sharp-*/**',
            '**/.pnpm/sharp@*/node_modules/@img/**',
          ],
        },
      }
    : {}),
};

export default nextConfig;
