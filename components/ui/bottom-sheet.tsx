import { ReactNode, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-[var(--ink)]/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={sheetRef}
            className="fixed bottom-0 left-0 right-0 z-50 mx-auto w-full max-w-[700px] overflow-hidden rounded-t-[24px] border border-[var(--line)] bg-[var(--sheet)]"
            style={{ height: "45vh" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 220 }}
          >
            <div className="flex h-[52px] items-center justify-between border-b border-[var(--line)] bg-[var(--sheet)] px-5">
              <h2 className="text-[length:var(--text-sm)] font-medium text-[var(--ink)]">{title}</h2>
              <button
                onClick={onClose}
                className="flex h-[30px] w-[30px] items-center justify-center text-[var(--mute)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="app-scroll h-[calc(100%-52px)] overflow-y-auto bg-[var(--paper)] p-4">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
