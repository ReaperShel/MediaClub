import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CreatorShell } from "@/components/creator/creator-shell";
import { CreatorOverview } from "@/components/creator/creator-overview";
import { CreatorFeaturedStoryPanel } from "@/components/creator/creator-featured-story-panel";
import { CreatorEventsPanel } from "@/components/creator/creator-events-panel";
import { CreatorRegistrationsPanel } from "@/components/creator/creator-registrations-panel";
import { CreatorFormsPanel } from "@/components/creator/creator-forms-panel";
import { TeamManager } from "@/components/team/team-manager";
import { CreatorEventRequestsPanel } from "@/components/creator/creator-event-requests-panel";
import type { CreatorSection } from "@/components/creator/creator-types";

export const Route = createFileRoute("/creator")({
  head: () => ({
    meta: [
      { title: "Creator Mode — Media Club" },
      {
        name: "description",
        content: "Creator Mode management panel for the Media Club website.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CreatorPage,
});

function CreatorPage() {
  const [section, setSection] = useState<CreatorSection>("overview");

  const renderSection = () => {
    switch (section) {
      case "overview":
        return <CreatorOverview onSelectSection={setSection} />;
      case "featured-story":
        return <CreatorFeaturedStoryPanel />;
      case "events":
        return <CreatorEventsPanel />;
      case "registrations":
        return <CreatorRegistrationsPanel />;
      case "forms":
        return <CreatorFormsPanel />;
      case "team":
        return <TeamManager onClose={() => {}} embedded={true} />;
      case "requests":
        return <CreatorEventRequestsPanel />;
      default:
        return <CreatorOverview onSelectSection={setSection} />;
    }
  };

  return (
    <CreatorShell currentSection={section} onSelectSection={setSection}>
      {renderSection()}
    </CreatorShell>
  );
}
