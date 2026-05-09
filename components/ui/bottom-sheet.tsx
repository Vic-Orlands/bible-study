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
            className="fixed inset-0 z-50 bg-[#25140b]/10 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={sheetRef}
            className="fixed bottom-0 left-0 right-0 z-50 mx-auto w-full max-w-[700px] overflow-hidden rounded-t-[24px] border border-[#e5d6c9] bg-white shadow-[0_-12px_44px_rgba(31,18,9,0.12)]"
            style={{ height: "45vh" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 220 }}
          >
            <div className="flex h-[52px] items-center justify-between border-b border-[#f1e8df] bg-white px-5">
              <h2 className="text-[14px] font-semibold text-[#25140b]">{title}</h2>
              <button
                onClick={onClose}
                className="icon-button flex h-[30px] w-[30px] items-center justify-center text-[#7a6758] hover:bg-[#fbf7f2]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="bible-app-scroll h-[calc(100%-52px)] overflow-y-auto bg-[#fbf7f2] p-4">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
