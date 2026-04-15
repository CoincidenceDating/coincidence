interface StringIconProps {
  className?: string;
}

export function StringIcon({ className = "w-5 h-5" }: StringIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path
        d="M3 15 C 5 11, 7 9, 9 11 C 11 13, 11 17, 13 17 C 15 17, 15 13, 17 11 C 19 9, 21 11, 21 14"
        strokeWidth="2"
      />
      <path
        d="M3 15 C 5 11, 7 9, 9 11 C 11 13, 11 17, 13 17 C 15 17, 15 13, 17 11 C 19 9, 21 11, 21 14"
        strokeWidth="1"
        strokeOpacity="0.3"
        style={{ transform: "translateY(1px)" }}
      />
    </svg>
  );
}
