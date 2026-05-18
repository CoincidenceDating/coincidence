import { createContext, useContext, useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import type { Profile } from "@/lib/data";
import { ProfilePreviewSheet } from "@/components/ProfilePreviewSheet";

type OpenPreviewOptions = {
  blurName?: boolean;
  onSwipe?: (dir: "left" | "right" | "maybe") => void;
  onMessage?: () => void;
};

type ProfilePreviewContextValue = {
  openPreview: (profile: Profile, opts?: OpenPreviewOptions) => void;
  closePreview: () => void;
};

const ProfilePreviewContext = createContext<ProfilePreviewContextValue>({
  openPreview: () => {},
  closePreview: () => {},
});

export function useProfilePreview() {
  return useContext(ProfilePreviewContext);
}

export function ProfilePreviewProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ profile: Profile; opts: OpenPreviewOptions } | null>(null);

  const openPreview = useCallback((profile: Profile, opts: OpenPreviewOptions = {}) => {
    setState({ profile, opts });
  }, []);

  const closePreview = useCallback(() => {
    setState(null);
  }, []);

  return (
    <ProfilePreviewContext.Provider value={{ openPreview, closePreview }}>
      {children}
      <AnimatePresence>
        {state && (
          <ProfilePreviewSheet
            key={state.profile.id}
            profile={state.profile}
            blurName={state.opts.blurName}
            onClose={closePreview}
            onSwipe={state.opts.onSwipe}
            onMessage={state.opts.onMessage}
          />
        )}
      </AnimatePresence>
    </ProfilePreviewContext.Provider>
  );
}
