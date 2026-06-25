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
  activeBrandId: string | null;
  activeBrand: Brand | null;
  setActiveBrand: (id: string) => void;
  loading: boolean;
};

const BrandContext = createContext<BrandContextType | undefined>(undefined);

function resolveActiveBrandId(brands: Brand[], storedId: string | null): string | null {
  if (storedId && brands.some((b) => b.id === storedId)) return storedId;
  return brands[0]?.id ?? null;
}

export function BrandProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { brands, isLoading } = useBrands();
  const [activeBrandId, setActiveBrandId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setActiveBrandId(null);
      return;
    }
    if (isLoading) return;

    setActiveBrandId((prev) => {
      if (prev && brands.some((b) => b.id === prev)) return prev;

      let stored: string | null = null;
      try {
        stored = localStorage.getItem(ACTIVE_BRAND_STORAGE_KEY);
      } catch {
        stored = null;
      }

      return resolveActiveBrandId(brands, stored);
    });
  }, [user?.id, isLoading, brands]);

  const setActiveBrand = useCallback(
    (id: string) => {
      if (!brands.some((b) => b.id === id)) return;
      setActiveBrandId(id);
      try {
        localStorage.setItem(ACTIVE_BRAND_STORAGE_KEY, id);
      } catch {
        // ignore storage failures
      }
    },
    [brands]
  );

  const activeBrand = useMemo(
    () => brands.find((b) => b.id === activeBrandId) ?? null,
    [brands, activeBrandId]
  );

  const value = useMemo(
    () => ({
      brands,
      activeBrandId,
      activeBrand,
      setActiveBrand,
      loading: isLoading,
    }),
    [brands, activeBrandId, activeBrand, setActiveBrand, isLoading]
  );

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

export function useBrand() {
  const context = useContext(BrandContext);
  if (context === undefined) {
    throw new Error("useBrand must be used within a BrandProvider");
  }
  return context;
}
