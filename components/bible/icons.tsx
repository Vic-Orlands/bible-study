export function Icon({
  name,
  size = 20,
}: {
  name: "search" | "aa" | "more" | "note" | "link" | "share" | "chev" | "check" | "compare" | "swap";
  size?: number;
}) {
  const paths: Record<string, string> = {
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    aa: '<path d="M3.5 18L8 6l4.5 12M5.2 13.8h5.6"/><path d="M14.5 13.2c.5-1.2 1.6-1.9 3-1.9 1.9 0 3 1 3 2.9V18M20.5 15.2c-3.6 0-5.6.5-5.6 1.7 0 .8.7 1.3 1.8 1.3 2.1 0 3.8-1.2 3.8-3"/>',
    more: "",
    note: '<rect x="5" y="4" width="14" height="16" rx="2.5"/><path d="M9 9h6M9 12.5h6M9 16h3.5"/>',
    link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
    share: '<path d="M12 4v11M8 8l4-4 4 4"/><path d="M6 12v6.5c0 .8.7 1.5 1.5 1.5h9c.8 0 1.5-.7 1.5-1.5V12"/>',
    chev: '<path d="M6 9l6 6 6-6"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    compare: '<rect x="3.5" y="5" width="7" height="14" rx="1.8"/><rect x="13.5" y="5" width="7" height="14" rx="1.8"/>',
    swap: '<path d="M4 9h15M15 5l4 4-4 4M20 15H5M9 11l-4 4 4 4"/>',
  };
  if (name === "more") {
    return (
      <svg className="i" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <circle cx="6" cy="12" r="1.2" />
        <circle cx="12" cy="12" r="1.2" />
        <circle cx="18" cy="12" r="1.2" />
      </svg>
    );
  }
  return (
    <svg
      className="i"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: paths[name] }}
    />
  );
}
