import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AirtekCRM",
    short_name: "AirtekCRM",
    description: "CRM for PT. Airtek Solusi Nusantara",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#fcf6f8",
    theme_color: "#9a1b4b",
    lang: "en",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
