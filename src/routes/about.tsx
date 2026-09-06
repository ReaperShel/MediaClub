import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { img } from "@/lib/images";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About the Media Club — Create. Capture. Inspire." },
      {
        name: "description",
        content:
          "The Media Club is a student-driven creative community for photography, videography, visual storytelling and documenting campus life.",
      },
      { property: "og:title", content: "About the Media Club" },
      {
        property: "og:description",
        content:
          "Who we are, what we do and why we document campus life — the student creative collective behind the archive.",
      },
      { property: "og:image", content: img.heroCameras },
      { name: "twitter:image", content: img.heroCameras },
    ],
  }),
  component: AboutPage,
});

const disciplines = [
  {
    title: "Photography",
    body: "Stills that hold a moment — portraits, candids, stage light and street.",
  },
  {
    title: "Videography",
    body: "Films, aftermovies and documentaries shot and cut in-house.",
  },
  {
    title: "Event Coverage",
    body: "On-ground crews for fests, seminars, sports and club activities.",
  },
  {
    title: "Creative Media",
    body: "Posters, titles, graphics and design work that frames the story.",
  },
  {
    title: "Campus Documentation",
    body: "A continuous visual record of everyday life across the college.",
  },
  {
    title: "Visual Storytelling",
    body: "Sequencing images and sound into narratives worth revisiting.",
  },
];

const mission = [
  "Document campus life as it happens, not after it's forgotten.",
  "Encourage student creativity across every visual discipline.",
  "Develop real photography, videography and editing skills.",
  "Give students hands-on opportunities at live events.",
  "Preserve the college's visual history for the years ahead.",
];

function AboutPage() {
  return (
    <SiteShell>
      <section className="border-b border-border px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-5xl">
          <p className="label-caps mb-4 text-primary">Create. Capture. Inspire.</p>
          <h1 className="display-title text-4xl md:text-6xl">About the Media Club</h1>
          <p className="mt-6 max-w-2xl text-base font-light text-muted-foreground md:text-lg">
            The Media Club is a student-driven creative community dedicated to photography,
            videography, visual storytelling, and documenting campus life.
          </p>
        </div>
      </section>

      <section className="border-b border-border bg-surface/40 px-5 py-20 md:px-8">
        <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-[minmax(0,18rem)_1fr]">
          <div>
            <span className="label-caps text-primary">Who We Are</span>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight uppercase">
              The people behind the frame
            </h2>
          </div>
          <div className="space-y-5 text-sm font-light text-muted-foreground md:text-base">
            <p>
              We are the student organisation responsible for capturing and documenting the moments
              that define this campus — its events, activities, achievements and the quieter stories
              in between.
            </p>
            <p>
              Photographers, filmmakers, editors, writers and designers work together across
              divisions. Every frame in this archive was made by a student on our team, on a real
              assignment, with real deadlines.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-border px-5 py-20 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 border-b border-border pb-6">
            <span className="label-caps text-primary">What We Do</span>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight uppercase md:text-4xl">
              Our disciplines
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {disciplines.map((d, i) => (
              <article
                key={d.title}
                className="archive-frame flex flex-col gap-3 p-7 transition-colors hover:border-primary/40 hover:bg-surface"
              >
                <span className="label-caps text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-display text-xl font-bold uppercase">{d.title}</h3>
                <p className="text-sm font-light text-muted-foreground">{d.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-surface/40 px-5 py-20 md:px-8">
        <div className="mx-auto max-w-5xl">
          <span className="label-caps text-primary">Our Mission</span>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight uppercase md:text-4xl">
            Keep the record. Build the makers.
          </h2>
          <ul className="mt-8 divide-y divide-border border-t border-b border-border">
            {mission.map((m) => (
              <li
                key={m}
                className="flex gap-5 py-5 text-sm font-light text-muted-foreground md:text-base"
              >
                <span className="text-primary">—</span>
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="px-5 py-20 md:px-8">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-6">
          <span className="label-caps text-primary">Our Team</span>
          <h2 className="font-display text-3xl font-bold tracking-tight uppercase md:text-4xl">
            Led by students, backed by divisions
          </h2>
          <p className="max-w-xl text-sm font-light text-muted-foreground md:text-base">
            A president, vice president and division leads run photography, videography, editorial
            and design — with members across every year.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/team"
              className="label-caps border border-primary px-7 py-4 text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              Meet the Team
            </Link>
            <Link
              to="/events"
              className="label-caps border border-border px-7 py-4 text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
            >
              Register for Club Events
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
