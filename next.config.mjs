/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverComponentsExternalPackages: ["ssh2", "better-sqlite3"],
    workerThreads: false,
    cpus: 1,
  },
};

export default nextConfig;
