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
}

export interface Match {
  profile: Profile;
  source: "swipe" | string;
  locationName?: string;
  locationIcon?: string;
  matchedAt: number;
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

export const swipeProfiles: Profile[] = [
  {
    id: "p1", name: "Alex Rivera", age: 28, avatar: "AR", distance: "0.4 mi away", gender: "man",
    bio: "Coffee enthusiast and weekend hiker",
    gradient: "linear-gradient(160deg,#141e30 0%,#243b55 100%)",
    photo: "profiles/p1.png",
  },
  {
    id: "p2", name: "Jordan Lee", age: 25, avatar: "JL", distance: "1.1 mi away", gender: "woman",
    bio: "Bookworm who loves live music",
    gradient: "linear-gradient(160deg,#0f2027 0%,#203a43 50%,#2c5364 100%)",
    photo: "profiles/p2.png",
  },
  {
    id: "p3", name: "Sam Taylor", age: 31, avatar: "ST", distance: "0.8 mi away", gender: "non-binary",
    bio: "Dog parent, amateur chef, sunset chaser",
    gradient: "linear-gradient(160deg,#232526 0%,#414345 100%)",
    photo: "profiles/p3.png",
  },
  {
    id: "p4", name: "Casey Morgan", age: 27, avatar: "CM", distance: "2.3 mi away", gender: "woman",
    bio: "Freelance designer with a thing for vinyl",
    gradient: "linear-gradient(160deg,#1a1a2e 0%,#16213e 100%)",
    photo: "profiles/p4.png",
  },
  {
    id: "p5", name: "Riley Chen", age: 29, avatar: "RC", distance: "0.2 mi away", gender: "woman",
    bio: "Runner, podcast addict, plant collector",
    gradient: "linear-gradient(160deg,#2c3e50 0%,#4ca1af 100%)",
    photo: "profiles/p5.png",
  },
  {
    id: "p6", name: "Dakota James", age: 26, avatar: "DJ", distance: "1.6 mi away", gender: "man",
    bio: "Aspiring filmmaker and trivia champion",
    gradient: "linear-gradient(160deg,#1c1c2e 0%,#3d3d5c 100%)",
    photo: "profiles/p6.png",
  },
];

export const locations: LocationData[] = [
  {
    id: "bar",
    name: "The Rusty Nail Bar",
    icon: "wine",
    users: [
      { id: "u1", name: "Morgan Blake", age: 27, avatar: "MB", distance: "Here now", bio: "Mixology nerd", gender: "woman", gradient: "linear-gradient(160deg,#1a1a2e 0%,#2d1b69 100%)" },
      { id: "u2", name: "Avery Quinn", age: 30, avatar: "AQ", distance: "Here now", bio: "Karaoke regular", gender: "non-binary", gradient: "linear-gradient(160deg,#0d0d0d 0%,#434343 100%)" },
      { id: "u3", name: "Jamie Frost", age: 24, avatar: "JF", distance: "Here now", bio: "Just vibing", gender: "man", gradient: "linear-gradient(160deg,#141e30 0%,#243b55 100%)" },
    ],
  },
  {
    id: "pub",
    name: "The Golden Pint Pub",
    icon: "beer",
    users: [
      { id: "u4", name: "Charlie Dunn", age: 32, avatar: "CD", distance: "Here now", bio: "Craft beer connoisseur", gender: "man", gradient: "linear-gradient(160deg,#232526 0%,#414345 100%)" },
      { id: "u5", name: "Taylor West", age: 26, avatar: "TW", distance: "Here now", bio: "Trivia night champion", gender: "woman", gradient: "linear-gradient(160deg,#2c3e50 0%,#3d3d3d 100%)" },
    ],
  },
  {
    id: "cafe",
    name: "Bloom Cafe",
    icon: "coffee",
    users: [
      { id: "u6", name: "Sage Ito", age: 23, avatar: "SI", distance: "Here now", bio: "Oat latte loyalist", gender: "non-binary", gradient: "linear-gradient(160deg,#1c1c2e 0%,#3a3a5c 100%)" },
      { id: "u7", name: "Drew Patel", age: 29, avatar: "DP", distance: "Here now", bio: "Laptop warrior", gender: "man", gradient: "linear-gradient(160deg,#0f2027 0%,#2c5364 100%)" },
      { id: "u8", name: "Quinn Abara", age: 25, avatar: "QA", distance: "Here now", bio: "Sketch artist", gender: "woman", gradient: "linear-gradient(160deg,#1a1a1a 0%,#3d3d3d 100%)" },
      { id: "u9", name: "Ellis Grant", age: 28, avatar: "EG", distance: "Here now", bio: "People-watching pro", gender: "man", gradient: "linear-gradient(160deg,#141e30 0%,#4ca1af 100%)" },
    ],
  },
  {
    id: "lounge",
    name: "Velvet Lounge",
    icon: "sparkles",
    users: [
      { id: "u10", name: "Nico Vasquez", age: 30, avatar: "NV", distance: "Here now", bio: "Jazz fan", gender: "man", gradient: "linear-gradient(160deg,#0d0d0d 0%,#2d1b69 100%)" },
      { id: "u11", name: "Reese Kim", age: 27, avatar: "RK", distance: "Here now", bio: "Night owl", gender: "woman", gradient: "linear-gradient(160deg,#232526 0%,#243b55 100%)" },
    ],
  },
];
