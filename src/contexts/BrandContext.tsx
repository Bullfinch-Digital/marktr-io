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
import { useAuth } from "./AuthContext";

const ACTIVE_BRAND_STORAGE_KEY = "marktr_active_brand_id";

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

function readStoredActiveBrandId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_BRAND_STORAGE_KEY);
  } catch {
    return null;
  }
}

function pickActiveBrandId(brands: Brand[], preferredId: string | null): string | null {
  if (preferredId && brands.some((b) => b.id === preferredId)) {
    return preferredId;
  }
  const stored = readStoredActiveBrandId();
  if (stored && brands.some((b) => b.id === stored)) {
    return stored;
  }
  return brands[0]?.id ?? null;
}

export function BrandProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { brands, isLoading } = useBrands();
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);

  const resolvedActiveBrandId = useMemo(() => {
    if (!user?.id || isLoading) return null;
    return pickActiveBrandId(brands, selectedBrandId);
  }, [user?.id, isLoading, brands, selectedBrandId]);

  const activeBrand = useMemo(
    () => brands.find((b) => b.id === resolvedActiveBrandId) ?? null,
    [brands, resolvedActiveBrandId]
  );

  // Keep React state + localStorage aligned when we fall back to brands[0].
  useEffect(() => {
    if (!user?.id || isLoading || !resolvedActiveBrandId) return;

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
  }, [user?.id, isLoading, resolvedActiveBrandId, selectedBrandId]);

  useEffect(() => {
    if (!user?.id) {
      setSelectedBrandId(null);
    }
  }, [user?.id]);

  const setActiveBrand = useCallback(
    (id: string) => {
      if (!brands.some((b) => b.id === id)) return;
      setSelectedBrandId(id);
      try {
        localStorage.setItem(ACTIVE_BRAND_STORAGE_KEY, id);
      } catch {
        // ignore storage failures
      }
    },
    [brands]
  );

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
