import { useState } from "react";
import { swipeProfiles, type Match } from "@/lib/data";
import { SwipeCard } from "@/components/SwipeCard";

interface SwipePageProps {
  onMatch: (match: Match) => void;
}

export default function SwipePage({ onMatch }: SwipePageProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  function handleSwipe(dir: "left" | "right") {
    const profile = swipeProfiles[currentIndex];
    if (dir === "right" && profile) {
      onMatch({ profile, source: "swipe", matchedAt: Date.now() });
    }
    setCurrentIndex((prev) => (prev + 1) % swipeProfiles.length);
  }

  const profile = swipeProfiles[currentIndex];
  if (!profile) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4">
      <SwipeCard
        key={profile.id}
        profile={profile}
        onSwipe={handleSwipe}
        progress={`${currentIndex + 1} / ${swipeProfiles.length}`}
      />
    </div>
  );
}
