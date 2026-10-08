import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useBrands, type Brand } from "../hooks/useBrands";
import {
  ACTIVE_BRAND_SET_EVENT,
  ACTIVE_BRAND_STORAGE_KEY,
  persistActiveBrandId,
  pickActiveBrandId,
  readStoredActiveBrandId,
} from "../lib/brandScopedReads";
import { useAuth } from "./AuthContext";

type BrandContextType = {
  brands: Brand[];
  /** Resolved active brand id (state, storage, or brands[0]) — safe for scoped reads. */
  activeBrandId: string | null;
  activeBrand: Brand | null;
  setActiveBrand: (id: string) => void;
  loading: boolean;
};

const noopSetActiveBrand = () => {};

const defaultBrandContext: BrandContextType = {
  brands: [],
  activeBrandId: null,
  activeBrand: null,
  setActiveBrand: noopSetActiveBrand,
  loading: false,
};

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export function BrandProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { brands, isLoading } = useBrands();
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);

  const resolvedActiveBrandId = useMemo(() => {
    if (!user?.id) return null;
    if (isLoading && brands.length === 0 && !selectedBrandId) return null;
    return pickActiveBrandId(brands, selectedBrandId);
  }, [user?.id, isLoading, brands, selectedBrandId]);

  const activeBrand = useMemo(
    () => brands.find((b) => b.id === resolvedActiveBrandId) ?? null,
    [brands, resolvedActiveBrandId]
  );

  useEffect(() => {
    const handler = (event: Event) => {
      const id = (event as CustomEvent<{ id?: string | null }>).detail?.id;
      setSelectedBrandId(typeof id === "string" && id ? id : null);
    };
    window.addEventListener(ACTIVE_BRAND_SET_EVENT, handler);
    return () => window.removeEventListener(ACTIVE_BRAND_SET_EVENT, handler);
  }, []);

  // Keep React state + localStorage aligned when we fall back to brands[0].
  useEffect(() => {
    if (!user?.id || isLoading || !resolvedActiveBrandId) return;

    const pendingSelection =
      !!selectedBrandId &&
      selectedBrandId === readStoredActiveBrandId() &&
      !brands.some((b) => b.id === selectedBrandId);

    if (pendingSelection) return;

    if (selectedBrandId !== resolvedActiveBrandId) {
      setSelectedBrandId(resolvedActiveBrandId);
    }

    try {
      if (readStoredActiveBrandId() !== resolvedActiveBrandId) {
        localStorage.setItem(ACTIVE_BRAND_STORAGE_KEY, resolvedActiveBrandId);
      }
    } catch {
      // ignore storage failures
    }
  }, [user?.id, isLoading, resolvedActiveBrandId, selectedBrandId, brands]);

  useEffect(() => {
    if (!user?.id) {
      setSelectedBrandId(null);
    }
  }, [user?.id]);

  const setActiveBrand = useCallback((id: string) => {
    setSelectedBrandId(id);
    persistActiveBrandId(id);
  }, []);

  const value = useMemo(
    () => ({
      brands,
      activeBrandId: resolvedActiveBrandId,
      activeBrand,
      setActiveBrand,
      loading: isLoading,
    }),
    [brands, resolvedActiveBrandId, activeBrand, setActiveBrand, isLoading]
  );

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

export function useBrand(): BrandContextType {
  const context = useContext(BrandContext);
  return context ?? defaultBrandContext;
}
