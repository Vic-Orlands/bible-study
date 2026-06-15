import { ConvexHttpClient } from "convex/browser";
import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  fetchCustomTranslationChapter,
  fetchCustomTranslationIndex,
} from "@/lib/custom-translation-source";

function getConvexClient() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    console.error("Missing NEXT_PUBLIC_CONVEX_URL for custom translation route.");
    throw new Error("Missing Convex URL.");
  }
  return new ConvexHttpClient(convexUrl);
}

function parseCustomTranslationId(rawId: string) {
  if (!rawId.startsWith("custom:")) return null;
  return rawId.slice("custom:".length) as Id<"customTranslations">;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind");

  try {
    const client = getConvexClient();

    if (kind === "enabled") {
      try {
        const data = await client.query(api.customTranslations.listEnabled, {});
        return NextResponse.json({ data });
      } catch (error) {
        console.error(
          "Custom translations enabled-list unavailable, returning empty list:",
          error,
        );
        return NextResponse.json({ data: [] });
      }
    }

    const translationId = searchParams.get("translationId");
    if (!translationId) {
      return NextResponse.json(
        { error: "translationId is required." },
        { status: 400 },
      );
    }

    const customId = parseCustomTranslationId(translationId);
    if (!customId) {
      return NextResponse.json(
        { error: "Invalid custom translation id." },
        { status: 400 },
      );
    }

    const translation = await client.query(api.customTranslations.getEnabledById, {
      id: customId,
    });

    if (!translation) {
      return NextResponse.json(
        { error: "Custom translation not found." },
        { status: 404 },
      );
    }

    if (kind === "index") {
      const data = await fetchCustomTranslationIndex({
        indexUrl: translation.indexUrl,
      });
      return NextResponse.json({ data });
    }

    if (kind === "chapter") {
      const book = searchParams.get("book");
      const bookId = searchParams.get("bookId");
      const chapter = Number(searchParams.get("chapter"));
      if (!book || !bookId || !Number.isFinite(chapter) || chapter < 1) {
        return NextResponse.json(
          { error: "book, bookId, and chapter are required." },
          { status: 400 },
        );
      }

      const data = await fetchCustomTranslationChapter(
        {
          chapterUrlTemplate: translation.chapterUrlTemplate,
        },
        {
          book,
          bookId,
          chapter,
        },
      );
      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: "Unsupported kind." }, { status: 400 });
  } catch (error) {
    console.error("Custom translations route error:", error);
    return NextResponse.json(
      { error: "Failed to resolve custom translation data." },
      { status: 500 },
    );
  }
}
