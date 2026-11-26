// Search pages: one per thing producers search for, each answering it and pointing to the
// free tag generator or sign-up. The copy lives in lib/seoModel.js, which also feeds
// RouteMeta, the prerendered HTML and the sitemap.
import { GUIDES } from "@/lib/seoModel";

export const SEO_PAGES = GUIDES;
export const SEO_PATHS = Object.keys(SEO_PAGES);
