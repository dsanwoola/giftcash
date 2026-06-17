import type { OccasionId, ThemeId } from "./types";

export interface Occasion {
  id: OccasionId;
  label: string;
  emoji: string;
  tagline: string;
  /** Gradient used on cards & reveal backdrops (CSS color stops). */
  gradient: [string, string];
  defaultTheme: ThemeId;
  suggestedThemes: ThemeId[];
}

export interface Theme {
  id: ThemeId;
  label: string;
  emoji: string;
  premium: boolean;
  /** The reveal animation component key (see components/reveal). */
  animation: ThemeId;
  blurb: string;
}

export const OCCASIONS: Occasion[] = [
  {
    id: "birthday",
    label: "Birthday",
    emoji: "🎂",
    tagline: "Make their day unforgettable",
    gradient: ["#6429c9", "#f25c9e"],
    defaultTheme: "birthday_cake",
    suggestedThemes: ["birthday_cake", "confetti", "luxury_box", "fireworks"],
  },
  {
    id: "wedding",
    label: "Wedding",
    emoji: "💍",
    tagline: "Bless the happy couple",
    gradient: ["#2e1065", "#e6b143"],
    defaultTheme: "ring_box",
    suggestedThemes: ["ring_box", "bouquet", "luxury_box", "minimal_card"],
  },
  {
    id: "valentine",
    label: "Valentine's Day",
    emoji: "❤️",
    tagline: "Send the love",
    gradient: ["#f25c9e", "#6429c9"],
    defaultTheme: "heart_burst",
    suggestedThemes: ["heart_burst", "bouquet", "luxury_box", "minimal_card"],
  },
  {
    id: "graduation",
    label: "Graduation",
    emoji: "🎓",
    tagline: "Celebrate the achievement",
    gradient: ["#0ea271", "#2e1065"],
    defaultTheme: "graduation_cap",
    suggestedThemes: ["graduation_cap", "confetti", "fireworks", "corporate"],
  },
  {
    id: "anniversary",
    label: "Anniversary",
    emoji: "🥂",
    tagline: "Toast to many more years",
    gradient: ["#6429c9", "#e6b143"],
    defaultTheme: "luxury_box",
    suggestedThemes: ["luxury_box", "heart_burst", "bouquet", "fireworks"],
  },
  {
    id: "baby_shower",
    label: "Baby Shower",
    emoji: "🍼",
    tagline: "Welcome the little one",
    gradient: ["#f25c9e", "#e6b143"],
    defaultTheme: "bouquet",
    suggestedThemes: ["bouquet", "confetti", "luxury_box", "minimal_card"],
  },
  {
    id: "naming",
    label: "Naming Ceremony",
    emoji: "👶",
    tagline: "Honour the new name",
    gradient: ["#0ea271", "#e6b143"],
    defaultTheme: "african",
    suggestedThemes: ["african", "digital_envelope", "confetti", "luxury_box"],
  },
  {
    id: "housewarming",
    label: "Housewarming",
    emoji: "🏡",
    tagline: "Bless the new home",
    gradient: ["#0ea271", "#6429c9"],
    defaultTheme: "luxury_box",
    suggestedThemes: ["luxury_box", "minimal_card", "digital_envelope", "bouquet"],
  },
  {
    id: "religious",
    label: "Religious Celebration",
    emoji: "🙏",
    tagline: "Share a blessing",
    gradient: ["#2e1065", "#0ea271"],
    defaultTheme: "digital_envelope",
    suggestedThemes: ["digital_envelope", "african", "minimal_card", "luxury_box"],
  },
  {
    id: "congratulations",
    label: "Congratulations",
    emoji: "🎉",
    tagline: "Mark the milestone",
    gradient: ["#6429c9", "#0ea271"],
    defaultTheme: "confetti",
    suggestedThemes: ["confetti", "fireworks", "luxury_box", "corporate"],
  },
  {
    id: "thank_you",
    label: "Thank You",
    emoji: "💐",
    tagline: "Show your gratitude",
    gradient: ["#e6b143", "#f25c9e"],
    defaultTheme: "bouquet",
    suggestedThemes: ["bouquet", "minimal_card", "luxury_box", "digital_envelope"],
  },
  {
    id: "custom",
    label: "Custom Occasion",
    emoji: "✨",
    tagline: "For any moment that matters",
    gradient: ["#6429c9", "#2e1065"],
    defaultTheme: "luxury_box",
    suggestedThemes: ["luxury_box", "minimal_card", "confetti", "digital_envelope"],
  },
];

export const THEMES: Theme[] = [
  { id: "luxury_box", label: "Luxury Gift Box", emoji: "🎁", premium: false, animation: "luxury_box", blurb: "A ribboned box that lifts open." },
  { id: "digital_envelope", label: "Digital Envelope", emoji: "✉️", premium: false, animation: "digital_envelope", blurb: "A sealed envelope, gracefully opened." },
  { id: "birthday_cake", label: "Birthday Cake Reveal", emoji: "🎂", premium: false, animation: "birthday_cake", blurb: "Blow out the candles to reveal." },
  { id: "ring_box", label: "Wedding Ring Box", emoji: "💍", premium: true, animation: "ring_box", blurb: "A velvet ring box snaps open." },
  { id: "heart_burst", label: "Valentine Heart Burst", emoji: "❤️", premium: false, animation: "heart_burst", blurb: "A heart bursts into petals." },
  { id: "graduation_cap", label: "Graduation Cap Toss", emoji: "🎓", premium: false, animation: "graduation_cap", blurb: "Toss the cap in celebration." },
  { id: "bouquet", label: "Flower Bouquet", emoji: "💐", premium: true, animation: "bouquet", blurb: "Petals bloom across the screen." },
  { id: "confetti", label: "Confetti Celebration", emoji: "🎉", premium: false, animation: "confetti", blurb: "A storm of confetti." },
  { id: "fireworks", label: "Fireworks Reveal", emoji: "🎆", premium: true, animation: "fireworks", blurb: "Fireworks light the night." },
  { id: "minimal_card", label: "Minimal Premium Card", emoji: "🤍", premium: false, animation: "minimal_card", blurb: "Understated and elegant." },
  { id: "african", label: "African Celebration", emoji: "🥁", premium: true, animation: "african", blurb: "Vibrant culture & colour." },
  { id: "corporate", label: "Corporate Professional", emoji: "💼", premium: false, animation: "corporate", blurb: "Polished for business gifting." },
];

export const occasionById = (id: OccasionId) =>
  OCCASIONS.find((o) => o.id === id) ?? OCCASIONS[OCCASIONS.length - 1];

export const themeById = (id: ThemeId) =>
  THEMES.find((t) => t.id === id) ?? THEMES[0];
