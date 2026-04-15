export interface Profile {
  id: string;
  name: string;
  age: number;
  bio: string;
  avatar: string;
}

export interface LocationData {
  id: string;
  name: string;
  icon: string;
  users: Profile[];
}

export const swipeProfiles: Profile[] = [
  { id: "p1", name: "Alex Rivera", age: 28, bio: "Coffee enthusiast and weekend hiker", avatar: "AR" },
  { id: "p2", name: "Jordan Lee", age: 25, bio: "Bookworm who loves live music", avatar: "JL" },
  { id: "p3", name: "Sam Taylor", age: 31, bio: "Dog parent, amateur chef, sunset chaser", avatar: "ST" },
  { id: "p4", name: "Casey Morgan", age: 27, bio: "Freelance designer with a thing for vinyl", avatar: "CM" },
  { id: "p5", name: "Riley Chen", age: 29, bio: "Runner, podcast addict, plant collector", avatar: "RC" },
  { id: "p6", name: "Dakota James", age: 26, bio: "Aspiring filmmaker and trivia champion", avatar: "DJ" },
];

export const locations: LocationData[] = [
  {
    id: "bar",
    name: "The Rusty Nail Bar",
    icon: "wine",
    users: [
      { id: "u1", name: "Morgan Blake", age: 27, bio: "Mixology nerd", avatar: "MB" },
      { id: "u2", name: "Avery Quinn", age: 30, bio: "Karaoke regular", avatar: "AQ" },
      { id: "u3", name: "Jamie Frost", age: 24, bio: "Just vibing", avatar: "JF" },
    ],
  },
  {
    id: "pub",
    name: "The Golden Pint Pub",
    icon: "beer",
    users: [
      { id: "u4", name: "Charlie Dunn", age: 32, bio: "Craft beer connoisseur", avatar: "CD" },
      { id: "u5", name: "Taylor West", age: 26, bio: "Trivia night champion", avatar: "TW" },
    ],
  },
  {
    id: "cafe",
    name: "Bloom Cafe",
    icon: "coffee",
    users: [
      { id: "u6", name: "Sage Ito", age: 23, bio: "Oat latte loyalist", avatar: "SI" },
      { id: "u7", name: "Drew Patel", age: 29, bio: "Laptop warrior", avatar: "DP" },
      { id: "u8", name: "Quinn Abara", age: 25, bio: "Sketch artist", avatar: "QA" },
      { id: "u9", name: "Ellis Grant", age: 28, bio: "People-watching pro", avatar: "EG" },
    ],
  },
  {
    id: "lounge",
    name: "Velvet Lounge",
    icon: "sparkles",
    users: [
      { id: "u10", name: "Nico Vasquez", age: 30, bio: "Jazz fan", avatar: "NV" },
      { id: "u11", name: "Reese Kim", age: 27, bio: "Night owl", avatar: "RK" },
    ],
  },
];
