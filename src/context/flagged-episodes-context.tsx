"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";

const STORAGE_KEY = "flagged-episodes";

export function storageKeyFor(repoId?: string): string {
  return repoId ? `${STORAGE_KEY}:${repoId}` : STORAGE_KEY;
}

export function getFlaggedEpisodesForRepo(repoId: string): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw =
      localStorage.getItem(storageKeyFor(repoId)) ??
      sessionStorage.getItem(storageKeyFor(repoId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is number => typeof x === "number")
      : [];
  } catch {
    return [];
  }
}

export function saveToStorage(s: Set<number>, repoId?: string) {
  try {
    const serialized = JSON.stringify([...s]);
    const key = storageKeyFor(repoId);
    sessionStorage.setItem(key, serialized);
    if (repoId) {
      localStorage.setItem(key, serialized);
    }
  } catch {
    /* ignore */
  }
}

type FlaggedEpisodesContextType = {
  flagged: Set<number>;
  count: number;
  has: (id: number) => boolean;
  toggle: (id: number) => void;
  addMany: (ids: number[]) => void;
  clear: () => void;
};

const FlaggedEpisodesContext = createContext<
  FlaggedEpisodesContextType | undefined
>(undefined);

export function useFlaggedEpisodes() {
  const ctx = useContext(FlaggedEpisodesContext);
  if (!ctx)
    throw new Error(
      "useFlaggedEpisodes must be used within FlaggedEpisodesProvider",
    );
  return ctx;
}

export const FlaggedEpisodesProvider: React.FC<{
  repoId?: string;
  children: React.ReactNode;
}> = ({ repoId, children }) => {
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);
  const currentKey = storageKeyFor(repoId);
  const hydrated = hydratedKey === currentKey;

  // Hydrate from localStorage/sessionStorage after mount (avoids SSR/client mismatch)
  useEffect(() => {
    try {
      const key = storageKeyFor(repoId);
      const raw =
        (repoId ? localStorage.getItem(key) : null) ??
        sessionStorage.getItem(key);
      if (raw) setFlagged(new Set(JSON.parse(raw) as number[]));
      else setFlagged(new Set());
    } catch {
      /* ignore */
    }
    setHydratedKey(storageKeyFor(repoId));
  }, [repoId]);

  // Only persist after hydration so the initial empty set doesn't
  // overwrite stored flags when the component remounts.
  useEffect(() => {
    if (!hydrated) return;
    saveToStorage(flagged, repoId);
  }, [flagged, hydrated, repoId]);

  const toggle = useCallback((id: number) => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const addMany = useCallback((ids: number[]) => {
    setFlagged((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });
  }, []);

  const clear = useCallback(() => setFlagged(new Set()), []);

  const has = useCallback((id: number) => flagged.has(id), [flagged]);

  const value = useMemo(
    () => ({
      flagged,
      count: flagged.size,
      has,
      toggle,
      addMany,
      clear,
    }),
    [flagged, has, toggle, addMany, clear],
  );

  return (
    <FlaggedEpisodesContext.Provider value={value}>
      {children}
    </FlaggedEpisodesContext.Provider>
  );
};
