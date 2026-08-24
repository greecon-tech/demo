const staticExport = process.env.NEXT_OUTPUT_EXPORT === "1";
const basePath = process.env.NEXT_BASE_PATH ?? "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@greecon/shared"],
  agentRules: false,
  ...(staticExport ? { output: "export", basePath, images: { unoptimized: true } } : {})
};

export default nextConfig;
