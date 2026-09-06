/**
 * Read-only media proxy for the Google Drive archive.
 *
 * - GET only: there is no write path to Drive anywhere in this app.
 * - A file is served only when it is a descendant of the MEDIA CLUB root
 *   folder, so this endpoint can never expose unrelated Drive content.
 * - Google credentials stay on the server; the browser only sees these URLs.
 */
import { createFileRoute } from "@tanstack/react-router";

const FILE_ID = /^[A-Za-z0-9_-]{10,200}$/;

export const Route = createFileRoute("/api/public/drive/$fileId")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const fileId = params.fileId;
        if (!FILE_ID.test(fileId)) {
          return new Response("Not found", { status: 404 });
        }

        try {
          const drive = await import("@/lib/drive.server");
          if (!(await drive.isInsideArchive(fileId))) {
            return new Response("Not found", { status: 404 });
          }
          return await drive.streamFile(fileId, request.headers.get("range"));
        } catch (error) {
          console.error("[drive] proxy failed", error);
          return new Response("Media temporarily unavailable", {
            status: 503,
            headers: { "cache-control": "no-store" },
          });
        }
      },
    },
  },
});
