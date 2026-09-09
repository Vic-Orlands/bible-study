"use client";

import {
  type ButtonHTMLAttributes,
  type ReactNode,
  useEffect,
  useRef,
} from "react";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export function WorkspaceSurface({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "workspace-surface flex min-h-0 flex-1 overflow-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function WorkspaceCanvas({
  children,
  className,
  stacked = false,
}: {
  children: ReactNode;
  className?: string;
  stacked?: boolean;
}) {
  return (
    <div className="bible-app-scroll relative mx-auto flex min-h-0 w-full max-w-[760px] flex-1 flex-col overflow-y-auto px-3 py-4 md:px-6 md:py-8">
      {stacked ? (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-8 top-2 h-8 rounded-[28px] border border-black/[0.04] bg-white/70 md:inset-x-12"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-5 top-[18px] h-8 rounded-[28px] border border-black/[0.05] bg-white/85 md:inset-x-8"
          />
        </>
      ) : null}
      <div
        className={cn(
          "workspace-canvas relative z-[1] mt-4 flex min-h-0 flex-1 flex-col rounded-[28px] bg-white px-5 py-6 shadow-[0_24px_80px_rgba(37,20,11,0.08)] md:px-8 md:py-8",
          stacked && "mt-7",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function WorkspaceSection({
  action,
  children,
  label,
}: {
  action?: ReactNode;
  children: ReactNode;
  label: string;
}) {
  return (
    <section className="space-y-1">
      <div className="flex items-center justify-between gap-3 px-1 pb-2">
        <h2 className="text-[13px] font-medium text-[#8a8178]">{label}</h2>
        {action}
      </div>
      <div>{children}</div>
    </section>
  );
}

export function WorkspaceRow({
  active = false,
  icon,
  meta,
  onClick,
  title,
  trailing,
}: {
  active?: boolean;
  icon?: ReactNode;
  meta?: ReactNode;
  onClick?: () => void;
  title: ReactNode;
  trailing?: ReactNode;
}) {
  const interactive = Boolean(onClick);
  const className = cn(
    "group flex w-full items-center gap-3.5 rounded-2xl px-2 py-3.5 text-left transition-colors",
    interactive && "hover:bg-[#f7f5f2]",
    active && "bg-[#f7f5f2]",
  );

  const body = (
    <>
      {icon ? (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#f4f1ec] text-[#3a322c]">
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold tracking-[-0.01em] text-[#171412]">
          {title}
        </span>
        {meta ? (
          <span className="mt-0.5 block truncate text-[13px] text-[#8a8178]">
            {meta}
          </span>
        ) : null}
      </span>
      <span className="flex shrink-0 items-center gap-2 text-[#b4ada6]">
        {trailing}
        {interactive ? (
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        ) : null}
      </span>
    </>
  );

  if (interactive) {
    return (
      <button className={className} onClick={onClick} type="button">
        {body}
      </button>
    );
  }

  return <div className={className}>{body}</div>;
}

export function WorkspacePill({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-[#f3f0eb] px-2.5 py-1 text-[12px] font-medium text-[#5c564f]",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function WorkspaceIconButton({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full text-[#6f675f] transition-colors hover:bg-[#f4f1ec] hover:text-[#171412]",
        className,
      )}
      type="button"
      {...props}
    />
  );
}

export function WorkspaceMenu({
  align = "right",
  children,
  onClose,
  open,
  widthClassName = "w-[320px]",
}: {
  align?: "left" | "right";
  children: ReactNode;
  onClose: () => void;
  open: boolean;
  widthClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (ref.current?.contains(target)) return;
      if (target.closest("[data-workspace-menu-root]")) return;
      onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "absolute top-[calc(100%+10px)] z-30 overflow-hidden rounded-2xl border border-black/[0.06] bg-white py-2 shadow-[0_18px_50px_rgba(37,20,11,0.12)]",
        align === "right" ? "right-0" : "left-0",
        widthClassName,
      )}
      ref={ref}
    >
      {children}
    </div>
  );
}

export function WorkspaceMenuItem({
  active = false,
  description,
  icon,
  onClick,
  title,
}: {
  active?: boolean;
  description?: string;
  icon?: ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[#f7f5f2]",
        active && "bg-[#f7f5f2]",
      )}
      onClick={onClick}
      type="button"
    >
      {icon ? (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#f4f1ec] text-[#3a322c]">
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold text-[#171412]">
          {title}
        </span>
        {description ? (
          <span className="mt-0.5 block truncate text-[12px] text-[#8a8178]">
            {description}
          </span>
        ) : null}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#c5bfb8]" />
    </button>
  );
}
