import { z } from "zod";

export const SERVICE_OPTIONS = [
  "Photography",
  "Videography",
  "Short-form/Reels",
  "Event Highlights",
  "Interviews",
  "Social Media Content",
  "Full Event Documentation",
  "Other",
] as const;

export const REQUESTER_TYPES = ["Student", "Faculty", "Staff", "Organization"] as const;

export const EVENT_TYPES = [
  "Cultural",
  "Technical",
  "Sports",
  "Workshop",
  "Seminar",
  "Fest",
  "Club Activity",
  "Other",
] as const;

const time = z
  .string()
  .regex(/^\d{2}:\d{2}$/, { message: "Use HH:MM" })
  .optional()
  .or(z.literal(""));

export const eventRequestSchema = z
  .object({
    requesterName: z.string().trim().min(2, "Enter your full name").max(120),
    email: z.string().trim().email("Enter a valid email address").max(255),
    phone: z.string().trim().max(30).optional().or(z.literal("")),
    requesterType: z.enum(REQUESTER_TYPES),
    organization: z.string().trim().max(160).optional().or(z.literal("")),
    eventName: z.string().trim().min(2, "Enter the event name").max(160),
    eventType: z.enum(EVENT_TYPES),
    eventDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date")
      .refine((v) => !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime()), "Choose a valid date"),
    startTime: time,
    endTime: time,
    venue: z.string().trim().min(2, "Enter the venue").max(200),
    expectedAttendees: z.coerce.number().int().min(0).max(1_000_000).optional(),
    requestedServices: z.array(z.enum(SERVICE_OPTIONS)).min(1, "Select at least one service"),
    otherService: z.string().trim().max(200).optional().or(z.literal("")),
    eventDescription: z.string().trim().min(10, "Tell us about the event").max(4000),
    additionalRequirements: z.string().trim().max(2000).optional().or(z.literal("")),
  })
  .strict();

export type EventRequestInput = z.infer<typeof eventRequestSchema>;

export type RequestStatus = "pending" | "approved" | "rejected";

export type EventRequestRecord = {
  id: string;
  reference: string;
  requester_name: string;
  email: string;
  phone: string | null;
  requester_type: string;
  organization: string | null;
  event_name: string;
  event_type: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  venue: string;
  expected_attendees: number | null;
  requested_services: string[];
  other_service: string | null;
  event_description: string;
  additional_requirements: string | null;
  status: RequestStatus;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
};
