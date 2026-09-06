import { img } from "./images";

export type EventPhoto = {
  src: string;
  title: string;
  tag: string;
  photographer: string;
};

export type ArchiveEvent = {
  slug: string;
  title: string;
  date: string;
  displayDate: string;
  photoCount: number;
  year: string;
  cover: string;
  blurb: string;
  photos: EventPhoto[];
};

export const featuredEvent = {
  slug: "freshers-2026",
  title: "Freshers 2026",
  displayDate: "Oct 12, 2026",
  photoCount: 124,
  cover: img.freshers,
};

export const events: ArchiveEvent[] = [
  {
    slug: "annual-cultural-fest-2026",
    title: "Annual Cultural Fest 2026",
    date: "15 August 2026",
    displayDate: "Mar 15, 2026",
    photoCount: 250,
    year: "2026",
    cover: img.culturalFest,
    blurb:
      "A vibrant celebration of diversity and creativity, capturing the spirit of our campus through music, dance, and art.",
    photos: [
      {
        src: img.fest1,
        title: "Main Stage Highlights",
        tag: "Performance",
        photographer: "Elena Rostova",
      },
      {
        src: img.fest2,
        title: "Quiet Moments",
        tag: "Backstage",
        photographer: "Sarah Jenkins",
      },
      {
        src: img.fest3,
        title: "Twilight Gathering",
        tag: "Atmosphere",
        photographer: "David Chen",
      },
      {
        src: img.fest4,
        title: "Collaborative Canvas",
        tag: "Art Exhibit",
        photographer: "Marcus Thorne",
      },
      {
        src: img.fest5,
        title: "Urban Energy",
        tag: "Street Style",
        photographer: "Elena Rostova",
      },
      {
        src: img.lightbox1,
        title: "Courtyard at Dusk",
        tag: "Main Stage",
        photographer: "Elena Rostova",
      },
    ],
  },
  {
    slug: "freshers-2026",
    title: "Freshers 2026",
    date: "12 October 2026",
    displayDate: "Oct 12, 2026",
    photoCount: 124,
    year: "2026",
    cover: img.freshers,
    blurb:
      "First light on campus: new faces, borrowed lenses, and the long orientation weekend documented end to end.",
    photos: [
      {
        src: img.freshers,
        title: "Gear Check",
        tag: "Equipment",
        photographer: "David Chen",
      },
      {
        src: img.m1,
        title: "Gala '23",
        tag: "Portraits",
        photographer: "Sarah Jenkins",
      },
      {
        src: img.m2,
        title: "Details",
        tag: "Detail",
        photographer: "Marcus Thorne",
      },
      {
        src: img.m3,
        title: "Behind",
        tag: "Backstage",
        photographer: "Elena Rostova",
      },
      {
        src: img.m4,
        title: "Gear",
        tag: "Equipment",
        photographer: "David Chen",
      },
      {
        src: img.m5,
        title: "Space",
        tag: "Architecture",
        photographer: "Sarah Jenkins",
      },
    ],
  },
  {
    slug: "inter-college-sports-meet",
    title: "Inter-College Sports Meet",
    date: "02 February 2026",
    displayDate: "Feb 02, 2026",
    photoCount: 180,
    year: "2026",
    cover: img.sportsMeet,
    blurb: "Three days of track, field and floodlights shot at 1/2000th of a second.",
    photos: [
      {
        src: img.sportsMeet,
        title: "Final Lap",
        tag: "Athletics",
        photographer: "David Chen",
      },
      {
        src: img.fest5,
        title: "Urban Energy",
        tag: "Street Style",
        photographer: "Elena Rostova",
      },
      {
        src: img.m6,
        title: "Forms",
        tag: "Detail",
        photographer: "Marcus Thorne",
      },
    ],
  },
  {
    slug: "tech-symposium-2025",
    title: "Tech Symposium 2025",
    date: "20 November 2025",
    displayDate: "Nov 20, 2025",
    photoCount: 95,
    year: "2025",
    cover: img.techSymposium,
    blurb: "Keynotes, demo tables and the blue hour of the engineering quad.",
    photos: [
      {
        src: img.techSymposium,
        title: "Keynote",
        tag: "Talks",
        photographer: "Sarah Jenkins",
      },
      {
        src: img.structure,
        title: "Structure",
        tag: "Architecture",
        photographer: "David Chen",
      },
      {
        src: img.fluid,
        title: "Fluid Dynamics",
        tag: "Submission",
        photographer: "Marcus Thorne",
      },
    ],
  },
  {
    slug: "class-of-25-graduation",
    title: "Class of '25 Graduation",
    date: "10 June 2025",
    displayDate: "Jun 10, 2025",
    photoCount: 420,
    year: "2025",
    cover: img.graduation,
    blurb: "The largest single-day shoot in the archive. Four photographers, one lawn.",
    photos: [
      {
        src: img.graduation,
        title: "Procession",
        tag: "Ceremony",
        photographer: "Elena Rostova",
      },
      {
        src: img.m3,
        title: "Behind",
        tag: "Backstage",
        photographer: "Sarah Jenkins",
      },
      {
        src: img.m1,
        title: "Portrait",
        tag: "Portraits",
        photographer: "David Chen",
      },
    ],
  },
  {
    slug: "winter-alumni-meet",
    title: "Winter Alumni Meet",
    date: "15 December 2024",
    displayDate: "Dec 15, 2024",
    photoCount: 150,
    year: "2024",
    cover: img.alumniMeet,
    blurb: "Returning classes, cold light and the old darkroom reopened for one night.",
    photos: [
      {
        src: img.alumniMeet,
        title: "Reunion",
        tag: "Portraits",
        photographer: "Marcus Thorne",
      },
      {
        src: img.nocturne,
        title: "Nocturne",
        tag: "Exhibition",
        photographer: "Elena Rostova",
      },
      {
        src: img.m5,
        title: "Space",
        tag: "Architecture",
        photographer: "David Chen",
      },
    ],
  },
  {
    slug: "campus-halloween",
    title: "Campus Halloween",
    date: "31 October 2024",
    displayDate: "Oct 31, 2024",
    photoCount: 210,
    year: "2024",
    cover: img.halloween,
    blurb: "High-ISO night documentary from the residence halls to the quad.",
    photos: [
      {
        src: img.halloween,
        title: "Masquerade",
        tag: "Night",
        photographer: "Sarah Jenkins",
      },
      {
        src: img.m2,
        title: "Details",
        tag: "Detail",
        photographer: "Marcus Thorne",
      },
      {
        src: img.m4,
        title: "Gear",
        tag: "Equipment",
        photographer: "David Chen",
      },
    ],
  },
];

export const getEvent = (slug: string) => events.find((e) => e.slug === slug);

export const stories = [
  {
    tag: "Photo Essay",
    author: "Sarah Jenkins",
    date: "Oct 12, 2023",
    title: "Shadows in the Architecture Building",
    excerpt:
      "An exploration of brutalist forms and shifting light during the golden hour on north campus. A study in contrast and concrete geometry.",
    image: img.storyFilmSet,
  },
  {
    tag: "Editorial",
    author: "Marcus Thorne",
    date: "Oct 08, 2023",
    title: "The Return to Analog Media",
    excerpt:
      "Why more students are ditching digital sensors for the tactile, deliberate process of 35mm and medium format film photography in an age of instant gratification.",
    image: img.storyDarkroom,
  },
];

export const latestArchive = [
  { label: "Exhibition 042", title: "Nocturne", image: img.nocturne },
  { label: "Collection 11", title: "Structure", image: img.structure },
  { label: "Submission", title: "Fluid Dynamics", image: img.fluid },
];

export const leadership = [
  { role: "President", name: "Elena Rostova", image: img.president },
  { role: "Vice President", name: "Julian Thorne", image: img.vicePresident },
];

export const operations = [
  {
    department: "Photography",
    members: [
      { name: "Sarah Jenkins", image: img.member1 },
      { name: "David Chen", image: img.member2 },
    ],
  },
  {
    department: "Videography",
    members: [
      { name: "Maya Okoro", image: img.member3 },
      { name: "Liam Prescott", image: img.member4 },
    ],
  },
  {
    department: "Tech & Archive",
    members: [{ name: "Ana Ferreira", image: img.member5 }],
  },
];
