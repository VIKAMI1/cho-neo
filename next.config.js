/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["https://cho.vikami.ca"],
  output: "export",
  images: { unoptimized: true },
};

module.exports = nextConfig;
