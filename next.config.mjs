/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ["ssh2", "better-sqlite3"],
  },
};

export default nextConfig;
