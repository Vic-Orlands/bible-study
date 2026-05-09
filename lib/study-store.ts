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
};

type Actions = {
  setPassage(p: PassageSelection): void;
  setVisibleVersions(v: string[]): void;
  patchSidebars(patch: Partial<StudySidebars>): void;
  setRightTab(t: RightTab): void;
  setCommentTarget(t: string): void;
};

export const useStudyStore = create<State & Actions>()(
  persist(
    (set) => ({
      selectedPassage: DEFAULT_PASSAGE,
      visibleVersions: DEFAULT_VERSIONS,
      sidebars: DEFAULT_SIDEBARS,
      rightTab: "Study" as RightTab,
      commentTarget: `${DEFAULT_PASSAGE.book} ${DEFAULT_PASSAGE.chapter}:${DEFAULT_PASSAGE.verse}`,

      setPassage(p: PassageSelection) {
        set({ selectedPassage: p, commentTarget: `${p.book} ${p.chapter}:${p.verse}` });
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
