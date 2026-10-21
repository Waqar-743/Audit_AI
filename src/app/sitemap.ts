import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/assistant", "/assistant/privacy"].map((path) => ({
    url: new URL(path, SITE_URL).href,
  }));
}
