"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Mic } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { identityArgs } from "@/lib/identity";
import { PassageSelection, useStudyStore } from "@/lib/study-store";

export function AudioRecorder({ passage }: { passage: PassageSelection }) {
  const identityId = useStudyStore((state) => state.identityId);
  const notes = useQuery(api.audioNotes.listForPassage, {
    ...identityArgs(identityId),
    passageBook: passage.book,
    passageChapter: passage.chapter,
  });
  const createAudioNote = useMutation(api.audioNotes.create);
  const updateTranscript = useMutation(api.audioNotes.updateTranscript);
  const removeAudioNote = useMutation(api.audioNotes.remove);
  const [recording, setRecording] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAt = useRef<number | null>(null);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        void finish(new Blob(chunksRef.current, { type: "audio/webm" }));
      };
      chunksRef.current = [];
      startedAt.current = Date.now();
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (error) {
      console.error("Audio recording failed:", error);
      toast.error("Microphone access denied");
    }
  };

  const finish = async (blob: Blob) => {
    const duration = startedAt.current
      ? Math.max(1, Math.round((Date.now() - startedAt.current) / 1000))
      : 1;
    startedAt.current = null;
    chunksRef.current = [];
    setPending("Uploading");
    try {
      const formData = new FormData();
      formData.append("file", blob, "audio-note.webm");
      const upload = await fetch("/api/upload", { method: "POST", body: formData });
      if (!upload.ok) throw new Error(`Audio upload failed: ${upload.status}`);
      const { publicUrl, key } = await upload.json();
      const noteId = await createAudioNote({
        ...identityArgs(identityId),
        passageBook: passage.book,
        passageChapter: passage.chapter,
        passageVerse: passage.verse,
        audioUrl: publicUrl,
        audioKey: key,
        size: blob.size,
        mimeType: "audio/webm",
        duration,
      });
      setPending("Transcribing");
      const transcriptResponse = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: publicUrl }),
      });
      if (!transcriptResponse.ok) {
        throw new Error(`Transcription failed: ${transcriptResponse.status}`);
      }
      const { transcript } = await transcriptResponse.json();
      await updateTranscript({
        id: noteId,
        ...identityArgs(identityId),
        transcript: transcript || "Transcription failed.",
      });
      setPending(null);
    } catch (error) {
      console.error("Audio note processing failed:", error);
      toast.error("Could not process the recording");
      setPending(null);
    }
  };

  const stop = () => {
    recorderRef.current?.stop();
    recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    setRecording(false);
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[length:var(--text-lg)] font-medium">Audio</h2>
        <button
          className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-3 py-1.5 text-[length:var(--text-xs)]"
          onClick={() => (recording ? stop() : void start())}
          type="button"
        >
          <Mic className="h-3.5 w-3.5" />
          {recording ? "Stop" : "Record"}
        </button>
      </div>
      {pending ? <p className="text-[length:var(--text-sm)] text-[var(--mute)]">{pending}</p> : null}
      {(notes ?? []).map((note) => (
        <article className="rounded-2xl border border-[var(--line)] bg-[var(--sheet)] p-3" key={note._id}>
          <audio controls preload="none" src={note.audioUrl} className="w-full" />
          <p className="mt-2 text-[length:var(--text-sm)]">
            {note.isProcessing ? "Transcribing" : note.transcript || "No transcript"}
          </p>
          <button
            className="mt-2 text-[length:var(--text-xs)] text-[var(--mute)]"
            onClick={() => {
              void removeAudioNote({
                id: note._id as Id<"audioNotes">,
                ...identityArgs(identityId),
              }).catch((error) => {
                console.error(error);
                toast.error("Could not delete audio note");
              });
            }}
            type="button"
          >
            Delete
          </button>
        </article>
      ))}
    </section>
  );
}
