import { Camera, Sparkles, Video, Newspaper } from "lucide-react";

export type CategoryCard = {
  id: string;
  label: string;
  description: string;
  to: "/news" | "/videos" | "/highlights" | "/photos";
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
};

export const categoryCards: CategoryCard[] = [
  {
    id: "photos",
    label: "PHOTOS",
    description: "Photography from events, campus life and the moments between.",
    to: "/photos",
    icon: Camera,
  },
  {
    id: "highlights",
    label: "HIGHLIGHTS",
    description: "The standout moments, stories and memories worth revisiting.",
    to: "/highlights",
    icon: Sparkles,
  },
  {
    id: "videos",
    label: "VIDEOS & CLIPS",
    description: "Films, edits and moving stories captured by the Media Club.",
    to: "/videos",
    icon: Video,
  },
  {
    id: "news",
    label: "CAMPUS NEWS",
    description: "Updates, stories and moments happening across the campus.",
    to: "/news",
    icon: Newspaper,
  },
];
