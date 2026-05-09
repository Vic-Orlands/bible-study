import re

with open("app/study/page.tsx", "r") as f:
    content = f.read()

new_publicstudy = """function PublicStudy({
  commentTarget,
  selectedPassage,
}: {
  commentTarget: string;
  selectedPassage: PassageSelection;
}) {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const toggle = (name: string) =>
    setReplyingTo((c) => (c === name ? null : name));

  const guestId = useStudyStore((s) => s.guestId);
  const comments = useQuery(api.comments.listForPassage, {
    passageBook: selectedPassage.book,
    passageChapter: selectedPassage.chapter,
  });

  const toggleLike = useMutation(api.comments.toggleLike);

  return (
    <div className="flex h-full min-h-0 flex-col px-4 py-4">
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <div>
          <span className="text-[13px] font-semibold text-[#25140b]">
            Public Study
          </span>
          <span className="ml-2 text-[11px] text-[#9b8878]">
            {comments?.length ?? 0} comments
          </span>
        </div>
        <button
          className="cta-button flex items-center gap-1.5 border border-[#e5d6c9] px-2.5 py-1.5 text-[11px] font-semibold text-[#3a2218] hover:bg-[#fbf7f2]"
          type="button"
        >
          <Share2 className="h-3 w-3" />
          Share
        </button>
      </div>

      <div className="mb-4 flex shrink-0 items-center">
        {[
          "https://i.pravatar.cc/96?u=bible-grace",
          "https://i.pravatar.cc/96?u=bible-ethan",
        ].map((src, i) => (
          <img
            alt=""
            className={cn(
              "h-8 w-8 rounded-full border-2 border-white object-cover shadow-sm",
              i > 0 && "-ml-3",
            )}
            key={src}
            src={src}
          />
        ))}
        <div className="-ml-3 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#fbf7f2] text-[11px] font-semibold text-[#7a6758] shadow-sm">
          +8
        </div>
      </div>

      <div className="bible-app-scroll min-h-0 flex-1 overflow-y-auto pr-1">
        {comments === undefined ? (
          <p className="text-[12px] text-[#7a6758]">Loading feed...</p>
        ) : comments.length === 0 ? (
          <p className="text-[12px] text-[#7a6758]">Be the first to comment on this chapter.</p>
        ) : (
          comments.map((comment) => (
            <ChatMessage
              key={comment._id}
              avatar={`https://ui-avatars.com/api/?name=${comment.guestName}&background=random`}
              isReplying={replyingTo === comment._id}
              likeIcon={comment.likes.includes(guestId) ? "heart" : "thumb"}
              likes={comment.likes.length}
              name={comment.guestName}
              onReply={() => toggle(comment._id)}
              onLike={() => toggleLike({ id: comment._id, guestId })}
              reference={`${comment.passageBook} ${comment.passageChapter}:${comment.passageVerse}`}
              time={new Date(comment._creationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            >
              <p className="font-serif text-[13px] leading-relaxed text-[#3a2218]">
                {comment.content}
              </p>
            </ChatMessage>
          ))
        )}
      </div>

      <Composer target={commentTarget} selectedPassage={selectedPassage} />
    </div>
  );
}"""

content = re.sub(r'function PublicStudy\(\{.*?<Composer target=\{commentTarget\} selectedPassage=\{selectedPassage\} />\n    </div>\n  \);\n\}', new_publicstudy, content, flags=re.DOTALL)

old_chatmsg = """function ChatMessage({
  avatar,
  children,
  isReplying,
  likeIcon = "thumb",
  likes,
  name,
  onReply,
  reference,
  time,
}: {
  avatar: string;
  children: React.ReactNode;
  isReplying: boolean;
  likeIcon?: "heart" | "thumb";
  likes: number;
  name: string;
  onReply: () => void;
  reference: string;
  time: string;
}) {"""

new_chatmsg = """function ChatMessage({
  avatar,
  children,
  isReplying,
  likeIcon = "thumb",
  likes,
  name,
  onReply,
  onLike,
  reference,
  time,
}: {
  avatar: string;
  children: React.ReactNode;
  isReplying: boolean;
  likeIcon?: "heart" | "thumb";
  likes: number;
  name: string;
  onReply: () => void;
  onLike?: () => void;
  reference: string;
  time: string;
}) {"""
content = content.replace(old_chatmsg, new_chatmsg)

old_like_btn = """        <button
          className="flex items-center gap-1.5 text-[11px] font-semibold text-[#7a6758] hover:text-[#3a2218]"
          type="button"
        >
          <LikeIcon className="h-3.5 w-3.5" />
          {likes}
        </button>"""

new_like_btn = """        <button
          className={cn("flex items-center gap-1.5 text-[11px] font-semibold hover:text-[#f6823c]", likeIcon === "heart" ? "text-[#f6823c]" : "text-[#7a6758]")}
          type="button"
          onClick={onLike}
        >
          <LikeIcon className={cn("h-3.5 w-3.5", likeIcon === "heart" && "fill-current")} />
          {likes}
        </button>"""
content = content.replace(old_like_btn, new_like_btn)

old_handle_send = """  const handleSend = async () => {
    if (!content.trim()) return;
    try {
      await createNote({
        guestId,
        guestName,
        passageBook: selectedPassage.book,
        passageChapter: selectedPassage.chapter,
        passageVerse: selectedPassage.verse,
        content: content.trim(),
        type: "observation",
      });
      setContent("");
      toast.success("Note added!");
    } catch (e) {
      toast.error("Failed to add note.");
    }
  };"""

new_handle_send = """  const rightTab = useStudyStore(s => s.rightTab);
  const createComment = useMutation(api.comments.create);

  const handleSend = async () => {
    if (!content.trim()) return;
    try {
      if (rightTab === "Study") {
        await createComment({
          guestId,
          guestName,
          passageBook: selectedPassage.book,
          passageChapter: selectedPassage.chapter,
          passageVerse: selectedPassage.verse,
          translationLabel: "BSB",
          content: content.trim(),
        });
        toast.success("Comment added!");
      } else {
        await createNote({
          guestId,
          guestName,
          passageBook: selectedPassage.book,
          passageChapter: selectedPassage.chapter,
          passageVerse: selectedPassage.verse,
          content: content.trim(),
          type: "observation",
        });
        toast.success("Note added!");
      }
      setContent("");
    } catch (e) {
      toast.error("Failed to add.");
    }
  };"""
content = content.replace(old_handle_send, new_handle_send)

with open("app/study/page.tsx", "w") as f:
    f.write(content)
