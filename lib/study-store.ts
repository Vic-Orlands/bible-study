"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type RightTab = "Study" | "Notes" | "Audio Notes" | "Activity";
export type PassageSelection = { book: string; chapter: number; verse: number };
export type StudySidebars = { leftOpen: boolean; rightOpen: boolean };

export const DEFAULT_PASSAGE: PassageSelection = { book: "Genesis", chapter: 1, verse: 1 };
export const DEFAULT_VERSIONS = ["KJV"];
export const DEFAULT_SIDEBARS: StudySidebars = { leftOpen: true, rightOpen: true };

type State = {
  selectedPassage: PassageSelection;
  visibleVersions: string[];
  sidebars: StudySidebars;
  rightTab: RightTab;
  commentTarget: string;
  flashingVerse: string | null;
  versePrefill: string | null;
  highlightedVerse: string | null;
  identityId: string | null;
  displayName: string;
  isAnonymous: boolean;
};

type Actions = {
  setPassage(p: PassageSelection): void;
  setVisibleVersions(v: string[]): void;
  patchSidebars(patch: Partial<StudySidebars>): void;
  setRightTab(t: RightTab): void;
  setCommentTarget(t: string): void;
  setFlashingVerse(v: string | null): void;
  setVersePrefill(v: string | null): void;
  setHighlightedVerse(v: string | null): void;
  setIdentity(id: string | null, displayName: string, isAnonymous: boolean): void;
};

export const useStudyStore = create<State & Actions>()(
  persist(
    (set) => ({
      selectedPassage: DEFAULT_PASSAGE,
      visibleVersions: DEFAULT_VERSIONS,
      sidebars: DEFAULT_SIDEBARS,
      rightTab: "Study" as RightTab,
      commentTarget: `${DEFAULT_PASSAGE.book} ${DEFAULT_PASSAGE.chapter}:${DEFAULT_PASSAGE.verse}`,
      flashingVerse: null,
      versePrefill: null,
      highlightedVerse: null,
      identityId: null,
      displayName: "Anonymous",
      isAnonymous: true,

      setPassage(p: PassageSelection) {
        set({ selectedPassage: p, commentTarget: `${p.book} ${p.chapter}:${p.verse}` });
      },
      setFlashingVerse(v: string | null) {
        set({ flashingVerse: v });
        if (v) setTimeout(() => set({ flashingVerse: null }), 2000);
      },
      setVersePrefill(v: string | null) {
        set({ versePrefill: v });
      },
      setHighlightedVerse(v: string | null) {
        set({ highlightedVerse: v });
      },
      setVisibleVersions(v: string[]) {
        set({ visibleVersions: v });
      },
      patchSidebars(patch: Partial<StudySidebars>) {
        set((state) => ({ sidebars: { ...state.sidebars, ...patch } }));
      },
      setRightTab(t: RightTab) {
        set({ rightTab: t });
      },
      setCommentTarget(t: string) {
        set({ commentTarget: t });
      },
      setIdentity(id: string | null, displayName: string, isAnonymous: boolean) {
        set({ identityId: id, displayName, isAnonymous });
      },
    }),
    {
      name: "bible-study:study",
      partialize: (state) => ({
        selectedPassage: state.selectedPassage,
        visibleVersions: state.visibleVersions,
        sidebars: state.sidebars,
      }),
    },
  ),
);

export const useSelectedPassage = () => useStudyStore((s) => s.selectedPassage);
export const useVisibleVersions = () => useStudyStore((s) => s.visibleVersions);
