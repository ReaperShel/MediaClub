import { createFileRoute } from "@tanstack/react-router";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { SiteShell } from "@/components/site-shell";
import { TeamDirectory, type GroupedTeam, type TeamPerson } from "@/components/team/team-directory";
import { EmptyState, ErrorState, SkeletonGrid } from "@/components/ui-states";
import { listPublicTeam, teamKeys } from "@/lib/team.functions";
import type { PublicTeamPerson } from "@/lib/team.schema";
import { driveMediaUrl } from "@/lib/drive/media";

export const Route = createFileRoute("/team")({
  validateSearch: (search: Record<string, unknown>): { team?: string } => {
    const team = typeof search["team"] === "string" ? (search["team"] as string) : undefined;
    return team ? { team } : {};
  },
  head: () => ({
    meta: [
      { title: "Our Team — Media Club" },
      {
        name: "description",
        content:
          "The photographers, videographers, designers and builders behind the Media Club of Sreyas Institute of Engineering and Technology.",
      },
      { property: "og:title", content: "Our Team — Media Club" },
      {
        property: "og:description",
        content: "Photographers, filmmakers, designers and builders behind the Media Club archive.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TeamPage,
});

function TeamPage() {
  const { team: searchTeam = "" } = Route.useSearch();
  const navigate = useNavigate({ from: "/team" });
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: teamKeys.public,
    queryFn: () => listPublicTeam(),
  });

  const people = useMemo<TeamPerson[]>(() => {
    if (!data) return [];
    const all = [...(data.leads ?? []), ...(data.members ?? [])] as PublicTeamPerson[];
    return all.map((p): TeamPerson => {
      const person: TeamPerson = {
        id: p.id,
        name: p.name,
        role: p.role,
        team: p.team,
        rank: p.rank,
        bio: p.bio,
        skills: p.skills ?? [],
        order: p.order,
      };
      if (p.photoFileId) person.photo = driveMediaUrl(p.photoFileId);
      if (p.instagramUrl) person.instagramUrl = p.instagramUrl;
      return person;
    });
  }, [data]);

  const teams = useMemo<GroupedTeam[]>(() => {
    const peopleRef = people;
    const map = new Map<string, TeamPerson[]>();
    for (const person of peopleRef) {
      const arr = map.get(person.team) ?? [];
      arr.push(person);
      map.set(person.team, arr);
    }
    const result: GroupedTeam[] = [];
    const known = ["Leadership", "Photography", "Videography", "Tech", "Other"];
    for (const team of [...map.keys()].sort((a, b) => {
      const ia = known.indexOf(a);
      const ib = known.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    })) {
      const arr = map.get(team);
      if (!arr) continue;
      const rankPriority: Record<string, number> = {
        president: 0,
        "vice-president": 1,
        lead: 2,
        member: 3,
      };
      arr.sort(
        (a, b) =>
          (rankPriority[a.rank] ?? 4) - (rankPriority[b.rank] ?? 4) ||
          a.order - b.order ||
          a.name.localeCompare(b.name)
      );
      result.push({ team, people: arr });
    }
    return result;
  }, [people]);

  const activeTeam = useMemo(() => {
    const slug = (searchTeam ?? "").toLowerCase();
    const match = teams.find((t) => t.team.toLowerCase() === slug);
    if (match) return match.team;
    const leadership = teams.find((t) => t.team.toLowerCase() === "leadership");
    return leadership ? leadership.team : (teams[0]?.team ?? "");
  }, [teams, searchTeam]);

  const handleSelectTeam = (team: string) => {
    navigate({
      to: "/team",
      search: { team: team.toLowerCase() },
    });
  };

  return (
    <SiteShell>
      <section className="border-b border-border px-5 py-20 md:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="label-caps mb-4 text-primary">The People</p>
          <h1 className="display-title text-4xl md:text-6xl">THE PEOPLE BEHIND MEDIA CLUB</h1>
          <p className="font-display mt-2 text-2xl font-bold uppercase text-foreground md:text-3xl">
            OUR TEAM
          </p>
          <p className="mt-4 max-w-xl text-base font-light text-muted-foreground md:text-lg">
            The photographers, filmmakers, designers and builders behind the Media Club archive.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-5 py-16 md:px-8">
        {isLoading ? (
          <SkeletonGrid count={4} className="lg:grid-cols-2" />
        ) : isError || !data ? (
          <ErrorState onRetry={() => refetch()} />
        ) : people.length === 0 ? (
          <EmptyState
            title="Team information coming soon"
            description="The Media Club team list is published from Creator Mode. Published members appear here once they’re added."
          />
        ) : (
          <TeamDirectory teams={teams} activeTeam={activeTeam} onSelectTeam={handleSelectTeam} />
        )}
      </div>
    </SiteShell>
  );
}
