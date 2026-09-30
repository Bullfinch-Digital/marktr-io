import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getEdition, type Edition } from "../lib/edition";
import { editionConfig, type EditionConfig } from "../lib/editionConfig";
import { captureLandingUtms } from "../lib/utmCapture";

type EditionContextValue = {
  edition: Edition;
  config: EditionConfig;
};

const EditionContext = createContext<EditionContextValue | undefined>(undefined);

export function EditionProvider({
  children,
  edition: forced,
}: {
  children: ReactNode;
  edition?: Edition;
}) {
  const [edition] = useState<Edition>(() => forced ?? getEdition());
  const value = useMemo<EditionContextValue>(
    () => ({ edition, config: editionConfig[edition] }),
    [edition],
  );

  useEffect(() => {
    document.documentElement.dataset.edition = edition;
    captureLandingUtms();
  }, [edition]);

  return (
    <EditionContext.Provider value={value}>{children}</EditionContext.Provider>
  );
}

export function useEdition(): EditionContextValue {
  const ctx = useContext(EditionContext);
  if (!ctx) {
    throw new Error("useEdition must be used within EditionProvider");
  }
  return ctx;
}
