import { useState } from "react";
import { swipeProfiles, type Match } from "@/lib/data";
import { SwipeCard } from "@/components/SwipeCard";

interface SwipePageProps {
  onMatch: (match: Match) => void;
  onMaybe: (match: Match) => void;
}

export default function SwipePage({ onMatch, onMaybe }: SwipePageProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  function handleSwipe(dir: "left" | "right" | "maybe") {
    const profile = swipeProfiles[currentIndex];
    if (profile) {
      if (dir === "right") {
        onMatch({ profile, source: "swipe", matchedAt: Date.now() });
      } else if (dir === "maybe") {
        onMaybe({ profile, source: "swipe", matchedAt: Date.now() });
      }
    }
    setCurrentIndex((prev) => (prev + 1) % swipeProfiles.length);
  }

  const profile = swipeProfiles[currentIndex];
  if (!profile) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 py-4">
      <SwipeCard
        key={profile.id}
        profile={profile}
        onSwipe={handleSwipe}
        progress={`${currentIndex + 1} / ${swipeProfiles.length}`}
      />
    </div>
  );
}
