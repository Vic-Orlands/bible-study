import re
import sys

with open("app/study/page.tsx", "r") as f:
    content = f.read()

# 1. Update Bookmark Button
old_bookmark_btn = """          <button
            aria-label={`Bookmark ${formatPassage(selectedPassage)}`}
            className={cn("icon-button flex h-8 w-8 items-center justify-center border text-[#7a6758] hover:border-[#f6823c] hover:bg-[#fbf7f2] hover:text-[#3a2218]", isBookmarked ? "border-[#f6823c] text-[#f6823c] bg-[#fff3e8]" : "border-[#e5d6c9]")}
            onClick={onBookmark}
            type="button"
          >
            <Bookmark className={cn("h-4 w-4", isBookmarked && "fill-current")} />
          </button>"""

new_bookmark_btn = """          <motion.button
            aria-label={`Bookmark ${formatPassage(selectedPassage)}`}
            className={cn("icon-button flex h-8 w-8 items-center justify-center border text-[#7a6758] hover:border-[#f6823c] hover:bg-[#fbf7f2] hover:text-[#3a2218]")}
            onClick={onBookmark}
            type="button"
            whileTap={{ scale: 0.8 }}
            animate={isBookmarked ? { scale: [1, 1.2, 1], backgroundColor: "#fff3e8", borderColor: "#f6823c", color: "#f6823c" } : { backgroundColor: "transparent", borderColor: "#e5d6c9", color: "#7a6758" }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Bookmark className={cn("h-4 w-4", isBookmarked && "fill-current")} />
          </motion.button>"""

content = content.replace(old_bookmark_btn, new_bookmark_btn)

# 2. Update Like Button in ChatMessage
old_like_btn = """        <button
          className={cn("flex items-center gap-1.5 text-[11px] font-semibold hover:text-[#f6823c]", likeIcon === "heart" ? "text-[#f6823c]" : "text-[#7a6758]")}
          type="button"
          onClick={onLike}
        >
          <LikeIcon className={cn("h-3.5 w-3.5", likeIcon === "heart" && "fill-current")} />
          {likes}
        </button>"""

new_like_btn = """        <motion.button
          className={cn("flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-semibold hover:text-[#f6823c]", likeIcon === "heart" ? "text-[#f6823c] bg-[#fff3e8]" : "text-[#7a6758]")}
          type="button"
          onClick={onLike}
          whileTap={{ scale: 0.8 }}
          animate={likeIcon === "heart" ? { scale: [1, 1.2, 1] } : {}}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <LikeIcon className={cn("h-3.5 w-3.5", likeIcon === "heart" && "fill-current")} />
          {likes}
        </motion.button>"""
content = content.replace(old_like_btn, new_like_btn)


# 3. AudioNotesPanel using R2 and Optimistic UI

new_audionotes_panel = """function AudioNotesPanel({
  selectedPassage,
}: {
  selectedPassage: PassageSelection;
}) {
  const guestId = useStudyStore(s => s.guestId);
  const guestName = useStudyStore(s => s.guestName);
  const notes = useQuery(api.audioNotes.listForPassage, { passageBook: selectedPassage.book, passageChapter: selectedPassage.chapter });
  const createAudioNote = useMutation(api.audioNotes.create);
  const updateTranscript = useMutation(api.audioNotes.updateTranscript);
  const deleteAudioNote = useMutation(api.audioNotes.remove);

  const [isRecording, setIsRecording] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<any[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        chunksRef.current = [];

        // Optimistic UI: Immediately show processing note
        const tempId = Date.now().toString();
        const optimisticNote = {
          _id: tempId,
          guestName,
          _creationTime: Date.now(),
          isProcessing: true,
          transcript: "Uploading...",
        };
        setPendingUploads(prev => [optimisticNote, ...prev]);

        try {
          // 1. Get signed URL from our Next.js API
          const presignRes = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filename: "audio-note.webm", contentType: "audio/webm" }),
          });
          const { uploadUrl, publicUrl, key } = await presignRes.json();

          // 2. Upload to Cloudflare R2 via PUT (wait for it before proceeding)
          setPendingUploads(prev => prev.map(p => p._id === tempId ? { ...p, transcript: "Saving to R2..." } : p));
          await fetch(uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": "audio/webm" },
            body: blob,
          });

          setPendingUploads(prev => prev.map(p => p._id === tempId ? { ...p, transcript: "Transcribing..." } : p));

          // 3. Create DB record with R2 URL
          const noteId = await createAudioNote({
            guestId,
            guestName,
            passageBook: selectedPassage.book,
            passageChapter: selectedPassage.chapter,
            passageVerse: selectedPassage.verse,
            audioUrl: publicUrl,
            audioKey: key,
            size: blob.size,
            mimeType: "audio/webm",
            duration: 0,
          });

          // Remove from pending since Convex will now show it as isProcessing=true
          setPendingUploads(prev => prev.filter(p => p._id !== tempId));

          // 4. Trigger Deepgram transcript with R2 URL
          const trRes = await fetch("/api/transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: publicUrl }),
          });
          const { transcript } = await trRes.json();

          if (transcript) {
            await updateTranscript({ id: noteId, transcript });
          } else {
            await updateTranscript({ id: noteId, transcript: "Transcription failed." });
          }
        } catch (e) {
          toast.error("Failed to process audio");
          setPendingUploads(prev => prev.filter(p => p._id !== tempId));
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
    setIsRecording(false);
  };

  const allNotes = [...pendingUploads, ...(notes || [])];

  return (
    <div className="bible-app-scroll h-full overflow-y-auto px-4 py-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-[13px] font-semibold text-[#25140b]">
            Audio Notes
          </h2>
          <p className="mt-0.5 text-[11px] text-[#9b8878]">
            Recordings, uploads, playback, and transcripts
          </p>
        </div>
        <motion.button
          className={cn("cta-button flex items-center gap-1.5 border border-[#e5d6c9] px-2.5 py-1.5 text-[11px] font-semibold", isRecording ? "bg-[#fff3e8] text-[#f6823c]" : "bg-white text-[#3a2218] hover:bg-[#fbf7f2]")}
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          whileTap={{ scale: 0.9 }}
        >
          {isRecording ? <span className="h-2 w-2 bg-[#f6823c] rounded-full animate-pulse" /> : <Mic className="h-3 w-3" />}
          {isRecording ? "Stop" : "Record"}
        </motion.button>
      </div>
      <div className="space-y-3">
        {notes === undefined && pendingUploads.length === 0 ? (
          <p className="text-[12px] text-[#7a6758]">Loading audio notes...</p>
        ) : allNotes.length === 0 ? (
          <p className="text-[12px] text-[#7a6758]">No audio notes yet.</p>
        ) : (
          allNotes.map(n => (
            <AudioNote key={n._id} note={n} onDelete={() => deleteAudioNote({ id: n._id, guestId })} />
          ))
        )}
      </div>
    </div>
  );
}"""

content = re.sub(
    r'function AudioNotesPanel\(\{.*?<div className="space-y-3">.*?</div>\n    </div>\n  \);\n\}',
    new_audionotes_panel,
    content,
    flags=re.DOTALL,
)


# Fix the ChatInput / SendButton optimistic animation

old_send_btn = """      <button
        aria-label="Send message"
        className="icon-button flex h-7 w-7 items-center justify-center bg-[#3a2218] text-white hover:bg-[#1f1209]"
        type="button"
        onClick={onSend}
      >"""

new_send_btn = """      <motion.button
        aria-label="Send message"
        className="icon-button flex h-7 w-7 items-center justify-center bg-[#3a2218] text-white hover:bg-[#1f1209]"
        type="button"
        onClick={onSend}
        whileTap={{ scale: 0.8 }}
      >"""

old_send_icon = """        <SendHorizontal className="h-3.5 w-3.5" />
      </button>"""
new_send_icon = """        <SendHorizontal className="h-3.5 w-3.5" />
      </motion.button>"""

content = content.replace(old_send_btn, new_send_btn).replace(
    old_send_icon, new_send_icon
)

with open("app/study/page.tsx", "w") as f:
    f.write(content)
