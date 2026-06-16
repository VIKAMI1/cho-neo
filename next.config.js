/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["https://cho.vikami.ca", "127.0.0.1"],
  images: { unoptimized: true },
};

module.exports = nextConfig;
