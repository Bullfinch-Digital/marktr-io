import { useLayoutEffect } from "react";
import { useEdition } from "../contexts/EditionContext";
import { bullfinchDocumentTitle } from "../lib/editionDocumentTitle";

type DocumentMetaKind = "healthCheck" | "healthCheckReport";

/** Apply the edition's title and description. Never hard-code document.title. */
export function useEditionDocumentMeta(kind: DocumentMetaKind) {
  const { edition, config } = useEdition();
  const title =
    edition === "bullfinch"
      ? bullfinchDocumentTitle(window.location.pathname)
      : kind === "healthCheckReport"
        ? config.titles.healthCheckReport
        : config.titles.healthCheck;
  const description = config.titles.description;

  useLayoutEffect(() => {
    document.title = title;
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = description;
  }, [title, description]);
}
