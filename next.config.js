/** @type {import('next').NextConfig} */
const nextConfig = {
  // mapbox-gl uses browser-only APIs — must be transpiled to avoid SSR errors
  transpilePackages: ["mapbox-gl"],

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  experimental: {
    serverActions: { allowedOrigins: ["localhost:3000"] },
  },
};

module.exports = nextConfig;
