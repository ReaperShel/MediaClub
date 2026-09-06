import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { SiteShell } from "@/components/site-shell";
import { interactiveSpring } from "@/components/ui/motion-variants";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Media Club" },
      {
        name: "description",
        content: "Terms of Service governing your use of the Media Club website and its services.",
      },
      { property: "og:title", content: "Terms of Service — Media Club" },
      {
        property: "og:description",
        content: "Terms of Service governing your use of the Media Club website and its services.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TermsPage,
});

type TermsSection = {
  id: string;
  number: string;
  title: string;
  body: React.ReactNode;
};

const TERMS_SECTIONS: TermsSection[] = [
  {
    id: "website-use",
    number: "01",
    title: "Website Use",
    body: (
      <>
        <p>
          You may use this website for lawful personal, educational, informational, and
          event-related purposes.
        </p>
        <p>You agree not to:</p>
        <ul>
          <li>
            attempt to gain unauthorized access to restricted areas, Creator Mode, administrative
            functions, accounts, databases, or infrastructure
          </li>
          <li>
            interfere with the operation, security, performance, or availability of the website
          </li>
          <li>submit false, misleading, fraudulent, abusive, or malicious information</li>
          <li>
            attempt to bypass rate limits, authentication, authorization, or other security controls
          </li>
          <li>
            upload or transmit malicious code, harmful files, automated abuse, spam, or other
            material intended to disrupt the website
          </li>
          <li>
            scrape, copy, or systematically collect website content in a manner that places
            unreasonable load on the service or violates applicable rights
          </li>
        </ul>
        <p>
          We may restrict access where reasonably necessary to protect the website, its users, Media
          Club operations, or the security of the service.
        </p>
      </>
    ),
  },
  {
    id: "event-registration",
    number: "02",
    title: "Event Registration",
    body: (
      <>
        <p>
          The website may allow visitors to register for events organized or promoted by Media Club.
        </p>
        <p>When registering, you agree to provide accurate and reasonably complete information.</p>
        <p>Registration availability may depend on:</p>
        <ul>
          <li>event capacity</li>
          <li>eligibility requirements</li>
          <li>deadlines</li>
          <li>venue limitations</li>
          <li>organizer approval where applicable</li>
        </ul>
        <p>
          Submitting a registration form does not guarantee admission unless the event information
          specifically confirms otherwise.
        </p>
        <p>
          Media Club may close, limit, reject, or cancel registrations when reasonably necessary,
          including where:
        </p>
        <ul>
          <li>capacity has been reached</li>
          <li>incorrect or fraudulent information was submitted</li>
          <li>an event has been cancelled or changed</li>
          <li>participation requirements have not been met</li>
          <li>abuse of the registration system is detected</li>
        </ul>
        <p>
          Unless otherwise stated for a specific event, one registration should correspond to one
          participant.
        </p>
      </>
    ),
  },
  {
    id: "event-conduct",
    number: "03",
    title: "Event Conduct",
    body: (
      <>
        <p>
          Participants attending Media Club events are expected to behave respectfully and comply
          with reasonable instructions from event organizers, college staff, volunteers, and venue
          personnel.
        </p>
        <p>Participants must not engage in:</p>
        <ul>
          <li>harassment</li>
          <li>threatening or abusive behavior</li>
          <li>deliberate disruption</li>
          <li>damage to venue or equipment</li>
          <li>unlawful activity</li>
          <li>behavior that creates an unreasonable safety risk</li>
        </ul>
        <p>
          Media Club or authorized college personnel may refuse entry or remove an attendee where
          reasonably necessary for safety, security, event operation, or compliance with applicable
          rules.
        </p>
        <p>Additional event-specific rules may be communicated before or during an event.</p>
      </>
    ),
  },
  {
    id: "photography-media",
    number: "04",
    title: "Photography & Media",
    body: (
      <>
        <p>
          Media Club exists in part to document campus activities through photography, videography,
          highlights, and editorial coverage.
        </p>
        <p>
          Events and campus activities covered by Media Club may be photographed, filmed, or
          otherwise recorded.
        </p>
        <p>Such media may be displayed through:</p>
        <ul>
          <li>this website</li>
          <li>Media Club social-media accounts</li>
          <li>college-related communications</li>
          <li>promotional materials</li>
          <li>archival collections</li>
          <li>event highlights</li>
        </ul>
        <p>
          Where appropriate and reasonably practicable, Media Club will consider requests regarding
          the removal or correction of media involving an individual.
        </p>
        <p>Such requests can be submitted using the contact information provided below.</p>
        <p>
          Nothing in these Terms guarantees that every removal request can or will be granted,
          particularly where retention is reasonably necessary for archival, journalistic,
          organizational, or legal purposes.
        </p>
      </>
    ),
  },
  {
    id: "user-submissions",
    number: "05",
    title: "User Submissions",
    body: (
      <>
        <p>The website may allow users to submit information through:</p>
        <ul>
          <li>event registration forms</li>
          <li>Request an Event forms</li>
          <li>other interactive forms made available in the future</li>
        </ul>
        <p>
          You are responsible for ensuring that information you submit is lawful and accurate to the
          best of your knowledge.
        </p>
        <p>Do not submit:</p>
        <ul>
          <li>malicious content</li>
          <li>unlawful material</li>
          <li>confidential information that you are not authorized to provide</li>
          <li>another person's personal information without an appropriate reason or permission</li>
          <li>content intended to abuse or disrupt website functionality</li>
        </ul>
        <p>
          Submitting an event request does not guarantee that Media Club will organize, approve,
          cover, or respond positively to the requested event.
        </p>
      </>
    ),
  },
  {
    id: "intellectual-property",
    number: "06",
    title: "Intellectual Property",
    body: (
      <>
        <p>
          Unless otherwise stated, the design, branding, original written material, photographs,
          videos, graphics, and other Media Club-created content displayed through this website are
          owned by or used with permission by Media Club, the relevant creator, or Sreyas Institute
          of Engineering and Technology.
        </p>
        <p>Third-party works remain the property of their respective owners.</p>
        <p>
          You may view and share links to publicly available website content for ordinary personal
          and educational purposes.
        </p>
        <p>You may not, without appropriate permission:</p>
        <ul>
          <li>falsely claim ownership of Media Club content</li>
          <li>remove credits or ownership information</li>
          <li>commercially redistribute Media Club content</li>
          <li>
            reproduce substantial collections of Media Club media as your own archive or service
          </li>
          <li>use Media Club branding in a way that falsely implies endorsement or affiliation</li>
        </ul>
        <p>
          Individual photographers, videographers, designers, writers, and contributors may retain
          rights in their original work where applicable.
        </p>
      </>
    ),
  },
  {
    id: "creator-access",
    number: "07",
    title: "Creator & Administrative Access",
    body: (
      <>
        <p>
          Creator Mode and administrative tools are restricted to authorized Media Club personnel.
        </p>
        <p>
          Users must not attempt to access Creator Mode or administrative functions without
          authorization.
        </p>
        <p>Authorized Creator users are responsible for:</p>
        <ul>
          <li>protecting their credentials</li>
          <li>maintaining the confidentiality of administrative access</li>
          <li>using Creator Mode only for legitimate Media Club purposes</li>
          <li>avoiding unauthorized disclosure of registration or request information</li>
        </ul>
        <p>
          Media Club may revoke administrative access when reasonably necessary for security,
          organizational, or operational reasons.
        </p>
      </>
    ),
  },
  {
    id: "third-party-services",
    number: "08",
    title: "Third-Party Services",
    body: (
      <>
        <p>The website may rely on third-party services for functionality and infrastructure.</p>
        <p>These may include services such as:</p>
        <ul>
          <li>Supabase for database, authentication, or storage functionality</li>
          <li>Google Drive for Media Club content storage or retrieval</li>
          <li>website hosting providers</li>
          <li>Instagram and other external platforms linked from the site</li>
        </ul>
        <p>Those services operate under their own terms, policies, and availability.</p>
        <p>
          Media Club is not responsible for outages, interruptions, policy changes, or actions
          caused solely by third-party service providers.
        </p>
      </>
    ),
  },
  {
    id: "availability-changes",
    number: "09",
    title: "Availability & Changes",
    body: (
      <>
        <p>
          We aim to keep the website and its services available and accurate, but continuous
          availability is not guaranteed.
        </p>
        <p>Media Club may:</p>
        <ul>
          <li>modify website features</li>
          <li>update archive content</li>
          <li>change registration forms</li>
          <li>remove outdated content</li>
          <li>temporarily disable functionality</li>
          <li>change event dates, venues, capacity, schedules, or arrangements</li>
          <li>discontinue features when necessary</li>
        </ul>
        <p>
          Reasonable efforts may be made to communicate significant event changes to registered
          participants where contact information is available.
        </p>
      </>
    ),
  },
  {
    id: "limitation-of-liability",
    number: "10",
    title: "Limitation of Liability",
    body: (
      <>
        <p>
          To the maximum extent permitted by applicable law, Media Club, its student organizers,
          volunteers, contributors, and affiliated institution shall not be liable for indirect,
          incidental, special, or consequential loss arising solely from use of or inability to use
          this website.
        </p>
        <p>The website and its content are provided on an "as available" basis.</p>
        <p>
          While reasonable efforts are made to maintain accurate information, Media Club does not
          guarantee that every item of:
        </p>
        <ul>
          <li>event information</li>
          <li>archive metadata</li>
          <li>media description</li>
          <li>schedule</li>
          <li>availability notice</li>
        </ul>
        <p>will always be complete, current, or error-free.</p>
        <p>
          Nothing in these Terms excludes liability that cannot lawfully be excluded under
          applicable law.
        </p>
      </>
    ),
  },
  {
    id: "external-links",
    number: "11",
    title: "External Links",
    body: (
      <>
        <p>
          The website may contain links to third-party websites or services, including Instagram and
          other external platforms.
        </p>
        <p>Media Club does not control those external services and is not responsible for their:</p>
        <ul>
          <li>content</li>
          <li>availability</li>
          <li>security</li>
          <li>privacy practices</li>
          <li>terms of use</li>
        </ul>
        <p>Visiting an external website is subject to that service's own terms and policies.</p>
      </>
    ),
  },
  {
    id: "privacy",
    number: "12",
    title: "Privacy",
    body: (
      <>
        <p>Use of this website is also subject to the Media Club Privacy Policy.</p>
        <p>
          The Privacy Policy explains how information submitted through event registration, event
          requests, administrative features, and other website interactions may be processed.
        </p>
        <p>
          Privacy Policy:{" "}
          <a href="/privacy" className="text-primary underline underline-offset-4">
            /privacy
          </a>
        </p>
        <p>
          If these Terms and the Privacy Policy address the same privacy-related matter, the Privacy
          Policy should be read together with these Terms.
        </p>
      </>
    ),
  },
  {
    id: "governing-law",
    number: "13",
    title: "Governing Law",
    body: (
      <>
        <p>These Terms are governed by the applicable laws of India.</p>
        <p>
          To the extent legally permitted, disputes arising directly from use of this website or
          Media Club services will be subject to the jurisdiction of the appropriate courts in
          Hyderabad, Telangana.
        </p>
        <p>
          Nothing in this section limits any rights or remedies that cannot legally be restricted.
        </p>
      </>
    ),
  },
  {
    id: "changes-to-terms",
    number: "14",
    title: "Changes to These Terms",
    body: (
      <>
        <p>Media Club may update these Terms when:</p>
        <ul>
          <li>website functionality changes</li>
          <li>new services are introduced</li>
          <li>event processes change</li>
          <li>legal or security requirements change</li>
        </ul>
        <p>
          When the Terms are materially updated, the "Last updated" date displayed at the top of
          this page should also be changed.
        </p>
        <p>
          Continued use of the website after updated Terms become effective constitutes acceptance
          of the revised Terms to the extent permitted by applicable law.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    number: "15",
    title: "Contact",
    body: (
      <>
        <p>For questions about these Terms or the Media Club website, contact:</p>
        <address className="not-italic">
          <p>Media Club</p>
          <p>
            Sreyas Institute of Engineering and Technology
            <br />
            Hyderabad, Telangana, India
          </p>
          <p>
            Email:{" "}
            <a
              href="mailto:manishsurvi1234@gmail.com"
              className="text-primary underline underline-offset-4"
            >
              manishsurvi1234@gmail.com
            </a>
          </p>
        </address>
      </>
    ),
  },
];

function TermsPage() {
  const navigate = useNavigate();

  return (
    <SiteShell>
      <section className="border-b border-border px-5 py-20 md:px-8">
        <div className="mx-auto max-w-5xl">
          <motion.button
            type="button"
            onClick={() => window.history.back()}
            className="mb-8 flex items-center gap-2 text-xs font-light uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
            whileHover={{ x: -3 }}
            whileTap={{ scale: 0.98 }}
            transition={interactiveSpring}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 15 15"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 3L5 7.5L10 12" />
            </svg>
            Back
          </motion.button>

          <p className="label-caps text-primary">Legal Document</p>
          <h1 className="display-title mt-3 text-4xl font-bold uppercase md:text-5xl">
            TERMS OF SERVICE
          </h1>
          <p className="mt-3 text-sm font-light text-muted-foreground">
            Last updated: 6 September 2026 · Media Club
          </p>
          <p className="mt-4 max-w-2xl text-base font-light leading-relaxed text-muted-foreground md:text-lg">
            These Terms of Service govern your use of the Media Club website, including access to
            its digital archive, event registration features, event request forms, media galleries,
            and other public services operated by the Media Club of Sreyas Institute of Engineering
            and Technology.
          </p>
          <p className="mt-2 text-sm font-light italic text-muted-foreground">
            By accessing or using this website, you agree to these Terms.
          </p>
        </div>
      </section>

      <nav aria-label="Contents" className="border-b border-border px-5 py-12 md:px-8">
        <div className="mx-auto max-w-5xl">
          <span className="label-caps text-primary">Contents</span>
          <ul className="mt-4 grid grid-cols-1 gap-2.5 text-sm sm:grid-cols-2 md:grid-cols-3">
            {TERMS_SECTIONS.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document
                      .getElementById(section.id)
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="label-caps flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <span className="text-primary">{section.number}</span>
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <div className="px-5 py-12 md:px-8">
        <div className="mx-auto max-w-5xl space-y-16">
          {TERMS_SECTIONS.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <header className="mb-8 flex flex-col sm:flex-row sm:items-start sm:gap-8">
                <span className="font-display font-black text-[2.75rem] leading-none text-primary/25 sm:text-[3.5rem]">
                  {section.number}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="label-caps text-primary">Section {section.number}</span>
                  <h2 className="mt-1 font-display text-2xl font-bold uppercase tracking-tight text-foreground sm:text-3xl">
                    {section.title}
                  </h2>
                </div>
              </header>
              <div className="space-y-5 text-sm font-light leading-relaxed text-muted-foreground md:text-[1.0125rem]">
                {section.body}
              </div>

              {section.id !== "contact" && <div className="mt-10 border-t border-border" />}
            </section>
          ))}
        </div>
      </div>
    </SiteShell>
  );
}
