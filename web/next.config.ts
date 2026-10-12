import type { NextConfig } from "next";

// The web app is a client-rendered dashboard that talks to the Express API with a
// bearer token, so every page renders in the browser and deploys to any edge host.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
