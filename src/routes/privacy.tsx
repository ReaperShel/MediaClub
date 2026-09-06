import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { SiteShell } from "@/components/site-shell";
import { interactiveSpring } from "@/components/ui/motion-variants";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Media Club" },
      {
        name: "description",
        content: "Privacy Policy for the Media Club website.",
      },
      { property: "og:title", content: "Privacy Policy — Media Club" },
      {
        property: "og:description",
        content: "Privacy Policy for the Media Club website.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <SiteShell>
      <section className="border-b border-border px-5 py-16 md:px-8">
        <div className="mx-auto max-w-3xl">
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

          <p className="label-caps mb-4 text-primary">Privacy Policy</p>
          <h1 className="display-title text-4xl font-bold uppercase md:text-5xl">PRIVACY POLICY</h1>
          <p className="mt-4 text-sm font-light text-muted-foreground">
            Media Club — Sreyas Institute of Engineering and Technology
          </p>
          <p className="mt-2 text-xs font-light text-muted-foreground">
            Effective date: 5 September 2026
          </p>
        </div>
      </section>

      <section className="px-5 py-16 md:px-8">
        <div className="mx-auto max-w-3xl space-y-12 text-sm font-light text-muted-foreground">
          <div>
            <h2 className="font-display text-lg font-bold uppercase tracking-tight text-foreground">
              1. Information We May Collect
            </h2>
            <p className="mt-4">
              When you use the Media Club website, we may collect information that you voluntarily
              provide.
            </p>
            <p className="mt-4">This may include:</p>
            <ul className="mt-4 list-disc space-y-2 pl-5">
              <li>your name</li>
              <li>email address</li>
              <li>phone number, when required for an event</li>
              <li>
                college or student-related information when requested by an event registration form
              </li>
              <li>responses submitted through event registration forms</li>
              <li>information submitted through the Request an Event feature</li>
              <li>any other information you choose to provide through a form on the website</li>
            </ul>
            <p className="mt-4">
              The specific fields collected may vary depending on the event because event
              registration forms may contain custom fields.
            </p>
            <p className="mt-4">
              We may also process limited technical information required for the website to
              function, such as authentication/session information and basic request or error
              information.
            </p>
          </div>

          <div className="border-t border-border pt-12">
            <h2 className="font-display text-lg font-bold uppercase tracking-tight text-foreground">
              2. How We Use Information
            </h2>
            <p className="mt-4">Information collected through the website may be used to:</p>
            <ul className="mt-4 list-disc space-y-2 pl-5">
              <li>process registrations for Media Club events</li>
              <li>manage event attendance and capacity</li>
              <li>contact participants when necessary regarding an event</li>
              <li>review event requests</li>
              <li>operate and administer Media Club activities</li>
              <li>maintain and improve the website</li>
              <li>
                protect the website from abuse, spam, unauthorized access, or security threats
              </li>
              <li>
                allow authorized Media Club creators or administrators to manage events,
                registrations, requests, and team information
              </li>
            </ul>
            <p className="mt-4">
              We will not use submitted information for unrelated commercial advertising without
              appropriate notice or permission.
            </p>
          </div>

          <div className="border-t border-border pt-12">
            <h2 className="font-display text-lg font-bold uppercase tracking-tight text-foreground">
              3. Event Registrations
            </h2>
            <p className="mt-4">
              When you register for an event, the information you submit is stored so Media Club
              organizers can manage the event and its participants.
            </p>
            <p className="mt-4">
              Only information reasonably necessary for the relevant event should be requested.
            </p>
            <p className="mt-4">
              Authorized Media Club administrators may view or remove registration records through
              the website&apos;s Creator Mode.
            </p>
          </div>

          <div className="border-t border-border pt-12">
            <h2 className="font-display text-lg font-bold uppercase tracking-tight text-foreground">
              4. Event Requests
            </h2>
            <p className="mt-4">
              Information submitted through the Request an Event feature may be reviewed by
              authorized Media Club administrators for the purpose of evaluating, planning, or
              responding to the request.
            </p>
          </div>

          <div className="border-t border-border pt-12">
            <h2 className="font-display text-lg font-bold uppercase tracking-tight text-foreground">
              5. Authentication and Creator Mode
            </h2>
            <p className="mt-4">
              Certain administrative areas of the website are restricted to authorized Media Club
              users.
            </p>
            <p className="mt-4">
              Authentication and session information may be processed to verify that a user is
              permitted to access Creator Mode and administrative functions.
            </p>
            <p className="mt-4">
              Administrative access is not available to ordinary website visitors.
            </p>
          </div>

          <div className="border-t border-border pt-12">
            <h2 className="font-display text-lg font-bold uppercase tracking-tight text-foreground">
              6. Third-Party Services
            </h2>
            <p className="mt-4">
              The website may use third-party infrastructure and services to provide functionality.
            </p>
            <p className="mt-4">
              This may include services such as Supabase for database, authentication, or storage
              functionality, as well as the website&apos;s hosting provider.
            </p>
            <p className="mt-4">
              Information processed through these services is subject to their applicable security
              and privacy practices.
            </p>
            <p className="mt-4">
              We do not provide personal information to third parties for the purpose of selling
              user data.
            </p>
          </div>

          <div className="border-t border-border pt-12">
            <h2 className="font-display text-lg font-bold uppercase tracking-tight text-foreground">
              7. Media and Public Content
            </h2>
            <p className="mt-4">
              Photos, videos, highlights, news, and other Media Club content may be displayed
              publicly on the website.
            </p>
            <p className="mt-4">
              Media Club content intended for public viewing may therefore be accessible to anyone
              who visits the website.
            </p>
            <p className="mt-4">
              If you believe that media involving you should not appear on the website, you may
              contact Media Club using the contact information below.
            </p>
          </div>

          <div className="border-t border-border pt-12">
            <h2 className="font-display text-lg font-bold uppercase tracking-tight text-foreground">
              8. Cookies and Local Storage
            </h2>
            <p className="mt-4">
              The website may use essential browser storage, cookies, or similar technologies where
              necessary for functions such as authentication, session management, security, and
              remembering application state.
            </p>
            <p className="mt-4">
              These technologies are not intended to be used for unrelated advertising tracking.
            </p>
          </div>

          <div className="border-t border-border pt-12">
            <h2 className="font-display text-lg font-bold uppercase tracking-tight text-foreground">
              9. Data Security
            </h2>
            <p className="mt-4">
              We take reasonable technical and organizational measures to protect information
              handled through the website.
            </p>
            <p className="mt-4">
              These measures may include access controls, authentication, database security
              policies, input validation, and restrictions on administrative functionality.
            </p>
            <p className="mt-4">However, no online system can guarantee absolute security.</p>
          </div>

          <div className="border-t border-border pt-12">
            <h2 className="font-display text-lg font-bold uppercase tracking-tight text-foreground">
              10. Data Retention
            </h2>
            <p className="mt-4">
              Information may be retained for as long as it is reasonably necessary for the event,
              request, administrative purpose, or legal/security purpose for which it was collected.
            </p>
            <p className="mt-4">
              Authorized Media Club administrators may remove registrations, requests, events, or
              team records when they are no longer required.
            </p>
          </div>

          <div className="border-t border-border pt-12">
            <h2 className="font-display text-lg font-bold uppercase tracking-tight text-foreground">
              11. Data Sharing
            </h2>
            <p className="mt-4">We do not sell personal information.</p>
            <p className="mt-4">
              Information may be accessed by authorized Media Club members when necessary to operate
              events and website functions.
            </p>
            <p className="mt-4">
              Information may also be processed by service providers that supply infrastructure
              required to operate the website.
            </p>
            <p className="mt-4">
              Information may be disclosed when reasonably necessary to comply with applicable law,
              protect the security of the website, or prevent misuse.
            </p>
          </div>

          <div className="border-t border-border pt-12">
            <h2 className="font-display text-lg font-bold uppercase tracking-tight text-foreground">
              12. Your Choices
            </h2>
            <p className="mt-4">
              If you have submitted information through the website and would like to ask about that
              information, request a correction, or request deletion where appropriate, contact
              Media Club using the email address below.
            </p>
            <p className="mt-4">
              Requests will be handled subject to reasonable verification and any legitimate need to
              retain particular information.
            </p>
          </div>

          <div className="border-t border-border pt-12">
            <h2 className="font-display text-lg font-bold uppercase tracking-tight text-foreground">
              13. External Links
            </h2>
            <p className="mt-4">
              The website may contain links to third-party websites or social-media platforms,
              including Instagram.
            </p>
            <p className="mt-4">
              Media Club is not responsible for the privacy practices or content of external
              websites.
            </p>
            <p className="mt-4">
              You should review the privacy policies of those services when visiting them.
            </p>
          </div>

          <div className="border-t border-border pt-12">
            <h2 className="font-display text-lg font-bold uppercase tracking-tight text-foreground">
              14. Children&apos;s Privacy
            </h2>
            <p className="mt-4">
              This website is primarily intended for the college community and people interested in
              Media Club activities.
            </p>
            <p className="mt-4">
              Users should avoid submitting unnecessary personal or sensitive information through
              website forms.
            </p>
            <p className="mt-4">
              If information is discovered to have been submitted inappropriately, Media Club may
              remove it where appropriate.
            </p>
          </div>

          <div className="border-t border-border pt-12">
            <h2 className="font-display text-lg font-bold uppercase tracking-tight text-foreground">
              15. Changes to This Policy
            </h2>
            <p className="mt-4">
              This Privacy Policy may be updated when the website, its functionality, or its data
              practices change.
            </p>
            <p className="mt-4">
              When material changes are made, the effective date displayed at the top of this page
              should be updated.
            </p>
          </div>

          <div className="border-t border-border pt-12">
            <h2 className="font-display text-lg font-bold uppercase tracking-tight text-foreground">
              16. Contact
            </h2>
            <p className="mt-4">
              For privacy questions, requests, or concerns regarding this website, contact:
            </p>
            <p className="mt-4 font-medium text-foreground">
              Media Club
              <br />
              Sreyas Institute of Engineering and Technology
            </p>
            <p className="mt-4">
              Email:{" "}
              <a
                href="mailto:manishsurvi1234@gmail.com"
                className="text-primary underline underline-offset-4"
              >
                manishsurvi1234@gmail.com
              </a>
            </p>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
