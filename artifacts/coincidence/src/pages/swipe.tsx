import { useState } from "react";
import { swipeProfiles } from "@/lib/data";
import { SwipeCard } from "@/components/SwipeCard";

export default function SwipePage() {
  const [currentIndex, setCurrentIndex] = useState(0);

  function handleSwipe(_dir: "left" | "right") {
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
