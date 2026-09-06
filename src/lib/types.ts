/** Domain models for the Media Club archive. */

export type PublishState = {
  published: boolean;
  createdAt: string;
  updatedAt?: string | undefined;
};

export type ClubEvent = PublishState & {
  id: string;
  name: string;
  date: string;
  year: number;
  description: string;
  coverImage: string;
  photoCount: number;
};

export type Photo = PublishState & {
  id: string;
  eventId: string;
  imageUrl: string;
  orientation: "portrait" | "landscape";
  photographer: string;
  caption?: string | undefined;
  tags: string[];
};

export type Gallery = {
  event: ClubEvent;
  photos: Photo[];
};

export type HighlightCategory = "photos" | "videos" | "events" | "achievements";

export type Highlight = PublishState & {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  category: HighlightCategory;
  eventId?: string | undefined;
  date: string;
  creator: string;
  featured: boolean;
};

export type VideoCategory =
  | "event-coverage"
  | "interviews"
  | "behind-the-scenes"
  | "reels"
  | "promotional"
  | "student-projects";

export type Video = PublishState & {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  videoUrl?: string | undefined;
  category: VideoCategory;
  eventId?: string | undefined;
  duration: string;
  date: string;
  creator: string;
  featured: boolean;
};

export type NewsCategory =
  | "campus"
  | "events"
  | "student-life"
  | "achievements"
  | "clubs"
  | "sports"
  | "technology"
  | "arts-culture"
  | "media-club";

export type ArticleBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "quote"; text: string; attribution?: string }
  | { type: "image"; url: string; caption?: string | undefined; alt: string };

export type NewsArticle = PublishState & {
  id: string;
  title: string;
  subtitle: string;
  coverImage: string;
  category: NewsCategory;
  author: string;
  publishedDate: string;
  readingTime: number;
  body: ArticleBlock[];
  tags: string[];
  featured: boolean;
};

export type TeamMember = PublishState & {
  id: string;
  name: string;
  role: string;
  photo?: string | undefined;
  bio: string;
  skills: string[];
  team: string;
  order: number;
};

export type TeamLead = PublishState & {
  id: string;
  name: string;
  role: string;
  rank: "president" | "vice-president" | "lead";
  photo?: string | undefined;
  bio: string;
  team: string;
  order: number;
};

export type AdminUser = {
  id: string;
  email: string;
  role: "admin";
};
