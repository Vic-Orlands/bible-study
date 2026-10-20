"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  getBookId,
  preferredVisibleVersions,
  resolveBibleVersion,
  toPassageSelection,
  useBibleBooks,
  useBibleChapters,
  useBibleVersions,
} from "@/lib/bible-queries";
import { useStudyStore } from "@/lib/study-store";

export function useScripture() {
  const booksQuery = useBibleBooks();
  const versionsQuery = useBibleVersions();
  const passage = useStudyStore((state) => state.selectedPassage);
  const visibleVersions = useStudyStore((state) => state.visibleVersions);
  const setPassage = useStudyStore((state) => state.setPassage);
  const setVisibleVersions = useStudyStore((state) => state.setVisibleVersions);
  const setHighlightedVerse = useStudyStore((state) => state.setHighlightedVerse);
  const books = useMemo(() => booksQuery.data ?? [], [booksQuery.data]);
  const versions = useMemo(() => versionsQuery.data ?? [], [versionsQuery.data]);

  const normalizedVersions = useMemo(
    () =>
      versions.length > 0
        ? preferredVisibleVersions(visibleVersions, versions)
        : visibleVersions.slice(0, 2),
    [versions, visibleVersions],
  );

  useEffect(() => {
    if (versions.length === 0) return;
    const next = preferredVisibleVersions(visibleVersions, versions);
    const changed =
      next.length !== visibleVersions.length ||
      next.some((id, index) => visibleVersions[index] !== id);
    if (changed) setVisibleVersions(next);
  }, [setVisibleVersions, versions, visibleVersions]);

  const hydratedPassage = useRef(false);
  useEffect(() => {
    if (books.length === 0 || hydratedPassage.current) return;
    hydratedPassage.current = true;
    const next = toPassageSelection(new URLSearchParams(window.location.search), books);
    if (!next) return;
    setPassage(next);
    setHighlightedVerse(`${next.book}-${next.chapter}-${next.verse}`);
  }, [books, setHighlightedVerse, setPassage]);

  const bookId = useMemo(() => getBookId(books, passage.book), [books, passage.book]);
  const chapterQueries = useBibleChapters(normalizedVersions, bookId, passage.chapter);

  const columns = normalizedVersions.map((id, index) => {
    const version = resolveBibleVersion(id, versions);
    const query = chapterQueries[index];
    return {
      id,
      abbreviation: version?.abbreviation ?? id,
      title: version?.title ?? id,
      verses: query?.data?.verses ?? [],
      loading: Boolean(query?.isLoading || query?.isFetching),
      error: query?.error ? "Unable to load this translation right now." : null,
    };
  });

  return {
    books,
    booksError: booksQuery.error ? "Unable to load the Bible index." : null,
    booksLoading: booksQuery.isLoading,
    columns,
    passage,
    setPassage,
    setVisibleVersions,
    versions,
    versionsError: versionsQuery.error ? "Unable to load Bible versions." : null,
    versionsLoading: versionsQuery.isLoading,
    visibleVersions: normalizedVersions,
  };
}
