import { useEffect } from "react";
import { useEdition } from "../contexts/EditionContext";

type DocumentMetaKind = "healthCheck" | "healthCheckReport";

/** Apply the edition's title and description. Never hard-code document.title. */
export function useEditionDocumentMeta(kind: DocumentMetaKind) {
  const { config } = useEdition();
  const title =
    kind === "healthCheckReport" ? config.titles.healthCheckReport : config.titles.healthCheck;
  const description = config.titles.description;

  useEffect(() => {
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
