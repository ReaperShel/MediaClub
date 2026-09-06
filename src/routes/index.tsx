import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteShell } from "@/components/site-shell";
import { CameraHero } from "@/components/hero/camera-hero";
import { FeaturedStory, FeaturedStorySkeleton } from "@/components/featured-story";
import { useServerFn } from "@tanstack/react-start";
import { getFeaturedContent } from "@/lib/featured.functions";
import { img } from "@/lib/images";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Media Club — Create. Capture. Inspire." },
      {
        name: "description",
        content:
          "The college Media Club archive: event photography, films, campus news and the team behind the lens.",
      },
      {
        property: "og:title",
        content: "Media Club — Create. Capture. Inspire.",
      },
      {
        property: "og:description",
        content:
          "Explore photos, highlights, videos and campus stories from the college Media Club.",
      },
      { property: "og:image", content: img.heroCameras },
      { name: "twitter:image", content: img.heroCameras },
    ],
  }),
  component: Home,
});

function Home() {
  const fetchFeatured = useServerFn(getFeaturedContent);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["featured-content"],
    queryFn: () => fetchFeatured({}),
    staleTime: 30000,
    retry: 2,
  });

  if (import.meta.env.DEV) {
    console.log("[FeaturedStory] featured row loading", isLoading);
    console.log("[FeaturedStory] featured row result", data);
    if (isError) console.log("[FeaturedStory] featured row error", error);
    console.log("[FeaturedStory] final render state", {
      hasData: !!data,
      isLoading,
      isError,
    });
  }

  return (
    <SiteShell>
      <CameraHero />
      {isLoading && !data ? (
        <FeaturedStorySkeleton />
      ) : isError ? (
        data ? (
          <FeaturedStory data={data} />
        ) : (
          <FeaturedStorySkeleton />
        )
      ) : data ? (
        <FeaturedStory data={data} />
      ) : null}
    </SiteShell>
  );
}
