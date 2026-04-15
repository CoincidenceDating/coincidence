import type { Profile } from "@/lib/data";

interface ProfileAvatarProps {
  profile: Profile;
  size?: number;
  className?: string;
}

export function ProfileAvatar({ profile, size = 40, className = "" }: ProfileAvatarProps) {
  return (
    <div
      className={`relative rounded-full overflow-hidden shrink-0 ${className}`}
      style={{ width: size, height: size, background: profile.gradient }}
    >
      {profile.photo ? (
        <img
          src={`${import.meta.env.BASE_URL}${profile.photo}`}
          alt={profile.name}
          className="absolute inset-0 w-full h-full object-cover object-top"
          draggable={false}
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center text-white font-bold"
          style={{ fontSize: Math.round(size * 0.35) }}
        >
          {profile.avatar}
        </div>
      )}
    </div>
  );
}
