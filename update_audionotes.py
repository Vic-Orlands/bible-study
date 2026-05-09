import re

with open("app/study/page.tsx", "r") as f:
    content = f.read()

new_audionotes_panel = """function AudioNotesPanel({
  selectedPassage,
}: {
  selectedPassage: PassageSelection;
}) {
  const guestId = useStudyStore(s => s.guestId);
  const guestName = useStudyStore(s => s.guestName);
  const notes = useQuery(api.audioNotes.listForPassage, { passageBook: selectedPassage.book, passageChapter: selectedPassage.chapter });
  const generateUploadUrl = useMutation(api.audioNotes.generateUploadUrl);
  const createAudioNote = useMutation(api.audioNotes.create);
  const updateTranscript = useMutation(api.audioNotes.updateTranscript);
  const deleteAudioNote = useMutation(api.audioNotes.remove);
  
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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
        setIsUploading(true);
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        chunksRef.current = [];
        
        try {
          // 1. Upload to Convex
          const uploadUrl = await generateUploadUrl();
          const result = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": blob.type },
            body: blob,
          });
          const { storageId } = await result.json();
          
          // 2. Create DB record
          const noteId = await createAudioNote({
            guestId,
            guestName,
            passageBook: selectedPassage.book,
            passageChapter: selectedPassage.chapter,
            passageVerse: selectedPassage.verse,
            storageId,
            duration: 0, // Mock duration for now
          });
          
          // 3. Trigger Deepgram transcript
          const formData = new FormData();
          formData.append("audio", blob);
          const trRes = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          });
          const { transcript } = await trRes.json();
          if (transcript) {
            await updateTranscript({ id: noteId, transcript });
          }
          toast.success("Audio note added");
        } catch (e) {
          toast.error("Failed to upload audio");
        } finally {
          setIsUploading(false);
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
        <button
          className={cn("cta-button flex items-center gap-1.5 border border-[#e5d6c9] px-2.5 py-1.5 text-[11px] font-semibold", isRecording ? "bg-[#fff3e8] text-[#f6823c]" : "bg-white text-[#3a2218] hover:bg-[#fbf7f2]")}
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isUploading}
        >
          {isUploading ? <span className="h-3 w-3 border-2 border-[#f6823c] border-t-transparent rounded-full animate-spin" /> : <Mic className="h-3 w-3" />}
          {isUploading ? "Uploading..." : isRecording ? "Stop" : "Record"}
        </button>
      </div>
      <div className="space-y-3">
        {notes === undefined ? (
          <p className="text-[12px] text-[#7a6758]">Loading audio notes...</p>
        ) : notes.length === 0 ? (
          <p className="text-[12px] text-[#7a6758]">No audio notes yet.</p>
        ) : (
          notes.map(n => (
            <AudioNote key={n._id} note={n} onDelete={() => deleteAudioNote({ id: n._id, guestId })} />
          ))
        )}
      </div>
    </div>
  );
}"""

content = re.sub(r'function AudioNotesPanel\(\{.*?<AudioNote />\n      </div>\n    </div>\n  \);\n\}', new_audionotes_panel, content, flags=re.DOTALL)

old_audionote = """function AudioNote({ compact = false }: { compact?: boolean }) {"""
new_audionote = """function AudioNote({ note, compact = false, onDelete }: { note: any, compact?: boolean, onDelete?: () => void }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (note.url) {
      audioRef.current = new Audio(note.url);
      audioRef.current.onended = () => setIsPlaying(false);
    }
    return () => {
      if (audioRef.current) audioRef.current.pause();
    };
  }, [note.url]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };
"""
content = content.replace(old_audionote, new_audionote)

# Update AudioNote UI to use the real data
old_pa = """        <div className="flex h-6 w-6 items-center justify-center bg-[#3a2218] text-[10px] font-semibold text-[#f6823c]">
          PA
        </div>
        <span className="text-[11px] font-medium text-[#3a2218]">
          Pastor Aaron
        </span>
        <span className="text-[10px] text-[#9b8878]">· Today, 9:41 AM</span>"""

new_pa = """        <div className="flex h-6 w-6 items-center justify-center bg-[#3a2218] text-[10px] font-semibold text-[#f6823c]">
          {note.guestName.startsWith("Anonymous-") ? "AN" : note.guestName.slice(0, 2).toUpperCase()}
        </div>
        <span className="text-[11px] font-medium text-[#3a2218]">
          {note.guestName}
        </span>
        <span className="text-[10px] text-[#9b8878]">· {new Date(note._creationTime).toLocaleDateString()}</span>
        {onDelete && (
          <button className="ml-auto text-[#9b8878] hover:text-[#f6823c]" onClick={onDelete}>
            <X className="h-3 w-3" />
          </button>
        )}"""
content = content.replace(old_pa, new_pa)

old_play = """          <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />"""
new_play = """          {isPlaying ? <span className="h-2 w-2 bg-current" /> : <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />}"""
content = content.replace(old_play, new_play)

content = content.replace('onClick={togglePlay}', '') # just in case
content = content.replace('type="button"\n        >\n          {isPlaying', 'type="button"\n          onClick={togglePlay}\n        >\n          {isPlaying')


old_transcript = """      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] text-[#9b8878]">00:00</span>
        <button
          className="cta-button border border-[#e5d6c9] px-2 py-0.5 text-[11px] font-semibold text-[#3a2218]"
          type="button"
        >
          1.25x
        </button>
        <span className="font-mono text-[11px] text-[#9b8878]">03:42</span>
      </div>"""

new_transcript = """      <div className="flex items-center justify-between mt-2">
        {note.isProcessing ? (
          <span className="font-mono text-[11px] text-[#9b8878] animate-pulse">Transcribing...</span>
        ) : note.transcript ? (
          <p className="text-[12px] text-[#3a2218] italic bg-white p-2 border border-[#f1e8df] w-full">"{note.transcript}"</p>
        ) : (
          <span className="font-mono text-[11px] text-[#9b8878]">No transcript available</span>
        )}
      </div>"""
content = content.replace(old_transcript, new_transcript)


with open("app/study/page.tsx", "w") as f:
    f.write(content)
