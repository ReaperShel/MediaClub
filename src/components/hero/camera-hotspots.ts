export type CategoryCard = {
  id: string;
  label: string;
  to: "/news" | "/videos" | "/highlights" | "/photos";
};

export const categoryCards: CategoryCard[] = [
  { id: "photos", label: "PHOTOS", to: "/photos" },
  { id: "highlights", label: "HIGHLIGHTS", to: "/highlights" },
  { id: "videos", label: "VIDEOS & CLIPS", to: "/videos" },
  { id: "news", label: "CAMPUS NEWS", to: "/news" },
];
