// Search pages: one per thing producers search for, each answering it and pointing to the
// free tag generator or sign-up. Guides and blog posts share one template
// (pages/TypeBeatSeoPage.js). The copy lives in lib/seoModel.js, which also feeds
// RouteMeta, the prerendered HTML and the sitemap.
import { BLOG_POSTS, GUIDES } from "@/lib/seoModel";

export const SEO_PAGES = { ...GUIDES, ...BLOG_POSTS };
export const SEO_PATHS = Object.keys(SEO_PAGES);
