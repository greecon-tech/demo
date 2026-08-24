/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@greecon/shared"],
  agentRules: false
};

export default nextConfig;
