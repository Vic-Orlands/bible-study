"use client";

import { toast } from "sonner";

export function CompletionCard({
  title,
  onClose,
  onViewCompleted,
}: {
  title: string;
  onClose: () => void;
  onViewCompleted: () => void;
}) {
  const shareText = `I completed the ${title} reading plan on Bible Study.`;

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Reading plan complete", text: shareText });
        return;
      }
      await navigator.clipboard.writeText(shareText);
      toast.success("Achievement copied");
    } catch (error) {
      console.error("Failed to share reading plan completion:", error);
      try {
        await navigator.clipboard.writeText(shareText);
        toast.success("Achievement copied");
      } catch (clipboardError) {
        console.error("Failed to copy reading plan completion:", clipboardError);
        toast.error("Could not share your achievement");
      }
    }
  };

  const savePng = async () => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 630;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is not supported");
      context.fillStyle = "#f7f4ef";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#161513";
      context.font = "600 42px Inter";
      context.fillText("Plan complete", 72, 180);
      context.font = "500 28px Inter";
      context.fillText(title.slice(0, 48), 72, 250);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((png) => {
          if (png) resolve(png);
          else reject(new Error("Could not create achievement image"));
        }, "image/png");
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-complete.png`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to save reading plan completion PNG:", error);
      toast.error("Could not save your achievement image");
    }
  };

  return (
    <div className="fixed bottom-20 left-1/2 z-40 w-[min(24rem,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-[var(--line)] bg-[var(--sheet)] p-4">
      <p className="text-[length:var(--text-lg)] font-medium">{title} complete</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="rounded-full bg-[var(--accent)] px-3 py-1.5 text-[length:var(--text-xs)] text-[var(--accent-ink)]" onClick={() => void share()} type="button">
          Share
        </button>
        <button className="rounded-full border border-[var(--line)] px-3 py-1.5 text-[length:var(--text-xs)]" onClick={() => void savePng()} type="button">
          Save image
        </button>
        <button className="rounded-full border border-[var(--line)] px-3 py-1.5 text-[length:var(--text-xs)]" onClick={onViewCompleted} type="button">
          View completed plans
        </button>
        <button className="text-[length:var(--text-xs)] text-[var(--mute)]" onClick={onClose} type="button">
          Close
        </button>
      </div>
    </div>
  );
}
