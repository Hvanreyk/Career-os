import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // @trajectoryos/core (the lib/ workspace package) ships TypeScript source,
  // so Next must transpile + bundle it rather than treating it as precompiled.
  // The monorepo root is auto-detected via the root package-lock.json, which
  // lets Turbopack resolve the package from outside web/.
  transpilePackages: ['@trajectoryos/core'],
};

export default nextConfig;
