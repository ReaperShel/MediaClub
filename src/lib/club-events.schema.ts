import { z } from "zod";
import { registrationFormConfigSchema } from "./registration-form";
import type { RegistrationFormConfig } from "./registration-form";
export { YEARS_OF_STUDY } from "./registration-form";

export const CLUB_EVENT_STATUSES = [
  "upcoming",
  "registration_open",
  "registration_closed",
  "completed",
  "cancelled",
  "removed",
] as const;

export type ClubEventStatus = (typeof CLUB_EVENT_STATUSES)[number];

const optionalTime = z
  .string()
  .regex(/^\d{2}:\d{2}$/, "Use HH:MM")
  .optional()
  .or(z.literal(""));

const optionalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date")
  .optional()
  .or(z.literal(""));

export const clubEventSchema = z
  .object({
    id: z.string().uuid().optional(),
    title: z.string().trim().min(2, "Enter the event title").max(160),
    description: z.string().trim().max(4000).optional().or(z.literal("")),
    posterUrl: z
      .string()
      .trim()
      .max(600)
      .refine(
        (v) => v === "" || /^(https?:\/\/|\/)/.test(v),
        "Enter a valid image URL or Drive poster"
      )
      .optional()
      .or(z.literal("")),
    shortDescription: z.string().trim().max(300).optional().or(z.literal("")),
    additionalInfo: z.string().trim().max(2000).optional().or(z.literal("")),
    eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date"),
    startTime: optionalTime,
    endTime: optionalTime,
    venue: z.string().trim().min(2, "Enter the venue").max(200),
    maxParticipants: z.coerce.number().int().min(0).max(100000),
    registrationDeadline: optionalDate,
    status: z.enum(CLUB_EVENT_STATUSES),
    formConfig: registrationFormConfigSchema.optional(),
  })
  .strict();

export type ClubEventInput = z.infer<typeof clubEventSchema>;

/**
 * Public submission payload. The actual required fields depend on the event's
 * registration form configuration and are validated server-side against it.
 */
export const eventRegistrationSchema = z
  .object({
    eventId: z.string().uuid(),
    values: z.record(z.string().max(64), z.union([z.string(), z.number(), z.boolean()])),
    additionalInfo: z.string().trim().max(1000).optional().or(z.literal("")),
  })
  .strict();

export type EventRegistrationInput = z.infer<typeof eventRegistrationSchema>;

export type ClubEventRecord = {
  id: string;
  title: string;
  description: string;
  short_description: string;
  additional_info: string | null;
  poster_url: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  venue: string;
  max_participants: number;
  registration_deadline: string | null;
  status: ClubEventStatus;
  created_at: string;
  updated_at: string;
  form_config: RegistrationFormConfig | null;
  form_version: number;
};

export type PublicClubEvent = ClubEventRecord & {
  registered: number;
  seatsLeft: number;
  isOpen: boolean;
};

export type EventRegistrationRecord = {
  id: string;
  event_id: string;
  full_name: string;
  college_id: string | null;
  email: string;
  phone: string | null;
  department: string | null;
  year_of_study: string | null;
  additional_info: string | null;
  created_at: string;
  responses: Record<string, string> | null;
  form_version: number;
  form_snapshot: RegistrationFormConfig | null;
};

export const STATUS_LABELS: Record<ClubEventStatus, string> = {
  upcoming: "Upcoming",
  registration_open: "Registration open",
  registration_closed: "Registration closed",
  completed: "Completed",
  cancelled: "Cancelled",
  removed: "Removed",
};
