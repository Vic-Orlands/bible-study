import { DeepgramClient } from "@deepgram/sdk";
import { NextRequest, NextResponse } from "next/server";

const deepgram = new DeepgramClient({ apiKey: process.env.DEEPGRAM_API_KEY! } as any);

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json(
        { error: "No audio url provided" },
        { status: 400 },
      );
    }

    const response = await (deepgram.listen as any).v1.transcribeUrl(
      { url },
      {
        model: "nova-3",
        smart_format: true,
        language: "en",
      }
    );

    const transcript =
      response?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";

    return NextResponse.json({ transcript });
  } catch (err) {
    console.error("Transcribe route error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
