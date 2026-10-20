"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Appearance,
  DEFAULT_APPEARANCE,
  Direction,
  Scheme,
  ScriptureSize,
  readAppearance,
  readScriptureSize,
  writeAppearance,
  writeScriptureSize,
} from "@/lib/appearance";
import { identityArgs } from "@/lib/identity";
import { useStudyStore } from "@/lib/study-store";

type AppearanceContextValue = {
  direction: Direction;
  scheme: Scheme;
  scriptureSize: ScriptureSize;
  setDirection: (direction: Direction) => void;
  setScheme: (scheme: Scheme) => void;
  setScriptureSize: (size: ScriptureSize) => void;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const identityId = useStudyStore((state) => state.identityId);
  const isAnonymous = useStudyStore((state) => state.isAnonymous);
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE);
  const [scriptureSize, setScriptureSizeState] = useState<ScriptureSize>(18);
  const save = useMutation(api.appearance.save);
  const remote = useQuery(
    api.appearance.get,
    identityId && !isAnonymous ? identityArgs(identityId) : "skip",
  );
  const appliedRemote = useRef<string | null>(null);

  useEffect(() => {
    const stored = readAppearance();
    setAppearance(stored);
    writeAppearance(stored);
    const size = readScriptureSize();
    setScriptureSizeState(size);
    writeScriptureSize(size);
  }, []);

  useEffect(() => {
    if (!remote) return;
    const key = `${remote.direction}:${remote.scheme}`;
    if (appliedRemote.current === key) return;
    appliedRemote.current = key;
    const next = { direction: remote.direction, scheme: remote.scheme };
    setAppearance(next);
    writeAppearance(next);
  }, [remote]);

  const persist = useCallback(
    (next: Appearance) => {
      setAppearance(next);
      writeAppearance(next);
      appliedRemote.current = `${next.direction}:${next.scheme}`;
      if (!identityId || isAnonymous) return;
      void save({ ...identityArgs(identityId), ...next }).catch((error) => {
        console.error("Failed to save appearance:", error);
      });
    },
    [identityId, isAnonymous, save],
  );

  const value = useMemo<AppearanceContextValue>(
    () => ({
      direction: appearance.direction,
      scheme: appearance.scheme,
      scriptureSize,
      setDirection: (direction) => persist({ ...appearance, direction }),
      setScheme: (scheme) => persist({ ...appearance, scheme }),
      setScriptureSize: (size) => {
        setScriptureSizeState(size);
        writeScriptureSize(size);
      },
    }),
    [appearance, persist, scriptureSize],
  );

  return (
    <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const value = useContext(AppearanceContext);
  if (!value) throw new Error("AppearanceProvider is missing");
  return value;
}
