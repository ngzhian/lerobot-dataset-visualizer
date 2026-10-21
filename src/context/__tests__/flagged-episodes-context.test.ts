import { describe, expect, test } from "bun:test";
import {
  getFlaggedEpisodesForRepo,
  saveToStorage,
  storageKeyFor,
} from "@/context/flagged-episodes-context";

function makeMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (k: string) => store.get(k) ?? null,
    key: (idx: number) => [...store.keys()][idx] ?? null,
    removeItem: (k: string) => {
      store.delete(k);
    },
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
  };
}

describe("flagged-episodes-context storage scoping", () => {
  test("storageKeyFor scopes by repoId when provided", () => {
    expect(storageKeyFor()).toBe("flagged-episodes");
    expect(storageKeyFor("")).toBe("flagged-episodes");
    expect(storageKeyFor("lerobot/pusht")).toBe(
      "flagged-episodes:lerobot/pusht",
    );
  });

  test("saveToStorage and getFlaggedEpisodesForRepo isolate flags per dataset", () => {
    const origWindow = globalThis.window;
    const origLocal = globalThis.localStorage;
    const origSession = globalThis.sessionStorage;

    const memLocal = makeMemoryStorage();
    const memSession = makeMemoryStorage();

    globalThis.window = {} as Window & typeof globalThis;
    globalThis.localStorage = memLocal;
    globalThis.sessionStorage = memSession;

    try {
      saveToStorage(new Set([2, 5]), "orgA/dataset1");
      expect(memLocal.getItem("flagged-episodes:orgA/dataset1")).toBe("[2,5]");
      expect(memSession.getItem("flagged-episodes:orgA/dataset1")).toBe(
        "[2,5]",
      );

      expect(getFlaggedEpisodesForRepo("orgA/dataset1")).toEqual([2, 5]);
      expect(getFlaggedEpisodesForRepo("orgB/dataset2")).toEqual([]);
    } finally {
      globalThis.window = origWindow;
      globalThis.localStorage = origLocal;
      globalThis.sessionStorage = origSession;
    }
  });
});
