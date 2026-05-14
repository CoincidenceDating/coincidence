export type Gender = "man" | "woman" | "non-binary";

export interface Profile {
  id: string;
  name: string;
  age: number;
  bio: string;
  avatar: string;
  distance: string;
  gradient: string;
  gender: Gender;
  photo?: string;
  photos?: string[];
  hobbies?: string[];
  visitedLocations?: string[];
}

export function filterByLookingFor(profiles: Profile[], lookingFor: string): Profile[] {
  if (lookingFor === "Everyone") return profiles;
  if (lookingFor === "Women")    return profiles.filter(p => p.gender === "woman");
  if (lookingFor === "Men")      return profiles.filter(p => p.gender === "man");
  if (lookingFor === "Non-binary") return profiles.filter(p => p.gender === "non-binary");
  return profiles;
}

export interface LocationData {
  id: string;
  name: string;
  icon: string;
  users: Profile[];
  lat?: number;
  lng?: number;
}

export interface Match {
  profile: Profile;
  source: "swipe" | string;
  locationName?: string;
  locationIcon?: string;
  matchedAt: number;
  superLike?: boolean;
}

export interface CheckIn {
  locationId: string;
  locationName: string;
  locationIcon: string;
  checkedInAt: number;
}

export const myProfile = {
  name: "Jamie Parker",
  age: 27,
  bio: "Living in the moment, one coincidence at a time",
  avatar: "JP",
  interests: ["Music", "Coffee", "Travel", "Books", "Hiking"],
};

export const locations: LocationData[] = [
  { id: "bar",    name: "The Rusty Nail Bar",    icon: "wine",     users: [] },
  { id: "pub",    name: "The Golden Pint Pub",   icon: "beer",     users: [] },
  { id: "cafe",   name: "Bloom Cafe",            icon: "coffee",   users: [] },
  { id: "lounge", name: "Velvet Lounge",         icon: "sparkles", users: [] },
];
