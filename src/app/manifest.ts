import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chợ Neo",
    short_name: "Chợ Neo",
    start_url: "/cho-neo",
    display: "standalone",
    background_color: "#8b1f17",
    theme_color: "#d7a33a",
    icons: [
      {
        src: "/icon.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/favicon.ico",
        sizes: "32x32",
        type: "image/x-icon",
      },
    ],
  };
}
