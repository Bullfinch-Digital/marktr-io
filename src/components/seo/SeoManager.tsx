import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { applyDocumentSeo } from "../../lib/documentSeo";
import {
  getMarketingPage,
  isNoIndexPath,
  isResourcePostPath,
} from "../../lib/seo";

/**
 * Keeps robots + marketing-page tags in sync on client navigations.
 * Resource posts set their own title/description/canonical in ResourcePost.
 */
export function SeoManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (isNoIndexPath(pathname)) {
      applyDocumentSeo({
        robots: "noindex, nofollow",
        canonicalPath: pathname,
      });
      return;
    }

    applyDocumentSeo({ robots: "index, follow" });

    if (isResourcePostPath(pathname)) return;

    const page = getMarketingPage(pathname);
    if (page) {
      applyDocumentSeo({
        title: page.title,
        description: page.description,
        canonicalPath: page.path,
        robots: "index, follow",
      });
    }
  }, [pathname]);

  return null;
}
