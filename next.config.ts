import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "xnthbaghktauuxekkvse.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // This satisfies the "Proxy" requirement Next.js 16 is asking for
  async rewrites() {
    return [
      {
        source: '/admin/:path*',
        destination: '/admin/:path*',
      },
    ];
  },
};

export default nextConfig;