/**
 * Per-event registration form configuration.
 *
 * A form config is an ordered list of fields. "standard" fields map to the
 * fixed columns on event_registrations; "custom" fields are stored in the
 * registration's `responses` JSON. The config is versioned: every registration
 * keeps the version and a snapshot of the fields it was submitted against, so
 * editing a form never changes historical submissions.
 */
import { z } from "zod";
export const YEARS_OF_STUDY = ["1st Year", "2nd Year", "3rd Year", "4th Year", "Other"] as const;

export const STANDARD_FIELD_IDS = [
  "fullName",
  "email",
  "phone",
  "collegeId",
  "department",
  "yearOfStudy",
] as const;

export type StandardFieldId = (typeof STANDARD_FIELD_IDS)[number];

export const STANDARD_FIELD_LABELS: Record<StandardFieldId, string> = {
  fullName: "Full Name",
  email: "Email Address",
  phone: "Phone Number",
  collegeId: "College / University ID",
  department: "Department / Course",
  yearOfStudy: "Year of Study",
};

export const STANDARD_FIELD_COLUMNS: Record<StandardFieldId, string> = {
  fullName: "full_name",
  email: "email",
  phone: "phone",
  collegeId: "college_id",
  department: "department",
  yearOfStudy: "year_of_study",
};

export const CUSTOM_FIELD_TYPES = [
  "text",
  "textarea",
  "email",
  "phone",
  "number",
  "select",
  "radio",
  "checkbox",
  "date",
  "url",
] as const;

export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

export const CUSTOM_FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: "Short Text",
  textarea: "Long Text",
  email: "Email",
  phone: "Phone Number",
  number: "Number",
  select: "Dropdown / Select",
  radio: "Radio Buttons",
  checkbox: "Checkbox",
  date: "Date",
  url: "URL",
};

export const OPTION_TYPES: CustomFieldType[] = ["select", "radio"];

const standardFieldSchema = z.object({
  kind: z.literal("standard"),
  id: z.enum(STANDARD_FIELD_IDS),
  enabled: z.boolean(),
  required: z.boolean(),
});

const customFieldSchema = z.object({
  kind: z.literal("custom"),
  id: z.string().min(1).max(64),
  type: z.enum(CUSTOM_FIELD_TYPES),
  label: z.string().trim().min(1, "Enter a field label").max(120),
  placeholder: z.string().trim().max(160).optional().or(z.literal("")),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  required: z.boolean(),
  options: z.array(z.string().trim().min(1).max(120)).max(50).optional(),
});

export const formFieldSchema = z.discriminatedUnion("kind", [
  standardFieldSchema,
  customFieldSchema,
]);

export const registrationFormConfigSchema = z.object({
  version: z.number().int().min(1).default(1),
  fields: z.array(formFieldSchema).min(1, "Keep at least one field").max(60),
  allowAdditionalInfo: z.boolean().default(true),
});

export type StandardFieldConfig = z.infer<typeof standardFieldSchema>;
export type CustomFieldConfig = z.infer<typeof customFieldSchema>;
export type FormField = z.infer<typeof formFieldSchema>;
export type RegistrationFormConfig = z.infer<typeof registrationFormConfigSchema>;

export function defaultFormConfig(): RegistrationFormConfig {
  return {
    version: 1,
    allowAdditionalInfo: true,
    fields: STANDARD_FIELD_IDS.map((id) => ({
      kind: "standard" as const,
      id,
      enabled: true,
      required: true,
    })),
  };
}

/** Accepts anything stored in the DB and always returns a usable config. */
export function normalizeFormConfig(raw: unknown): RegistrationFormConfig {
  const parsed = registrationFormConfigSchema.safeParse(raw);
  if (parsed.success && parsed.data.fields.length > 0) return parsed.data;
  return defaultFormConfig();
}

export function fieldLabel(field: FormField): string {
  return field.kind === "standard" ? STANDARD_FIELD_LABELS[field.id] : field.label;
}

/** Ordered, visitor-facing fields only. */
export function visibleFields(config: RegistrationFormConfig): FormField[] {
  return config.fields.filter((f) => f.kind === "custom" || f.enabled);
}

export function configsEqual(a: RegistrationFormConfig, b: RegistrationFormConfig): boolean {
  const strip = (c: RegistrationFormConfig) =>
    JSON.stringify({
      fields: c.fields,
      allowAdditionalInfo: c.allowAdditionalInfo,
    });
  return strip(a) === strip(b);
}

/* --------------------------------------------------------------- validation */

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRe = /^[+()\d][\d\s()-]{5,29}$/;
const dateRe = /^\d{4}-\d{2}-\d{2}$/;

export type SubmissionValues = Record<string, unknown>;

export type ValidationResult =
  | {
      ok: true;
      standard: Record<string, string>;
      custom: Record<string, string>;
    }
  | { ok: false; errors: Record<string, string> };

function asString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "";
  return String(value).trim();
}

/**
 * Validates a submission against a form config. Used on the client for UX and
 * again on the server as the authoritative check — unknown fields are dropped,
 * never stored.
 */
export function validateSubmission(
  config: RegistrationFormConfig,
  values: SubmissionValues
): ValidationResult {
  const errors: Record<string, string> = {};
  const standard: Record<string, string> = {};
  const custom: Record<string, string> = {};

  for (const field of visibleFields(config)) {
    const label = fieldLabel(field);
    const raw = values[field.id];
    const value = asString(raw);

    if (!value) {
      if (field.required) errors[field.id] = `${label} is required`;
      if (field.kind === "standard") standard[STANDARD_FIELD_COLUMNS[field.id]] = "";
      else custom[field.id] = "";
      continue;
    }

    if (value.length > 2000) {
      errors[field.id] = `${label} is too long`;
      continue;
    }

    if (field.kind === "standard") {
      if (field.id === "email" && !emailRe.test(value)) {
        errors[field.id] = "Enter a valid email address";
        continue;
      }
      if (field.id === "phone" && !phoneRe.test(value)) {
        errors[field.id] = "Enter a valid phone number";
        continue;
      }
      if (field.id === "yearOfStudy" && !(YEARS_OF_STUDY as readonly string[]).includes(value)) {
        errors[field.id] = "Choose a valid option";
        continue;
      }
      standard[STANDARD_FIELD_COLUMNS[field.id]] = value;
      continue;
    }

    switch (field.type) {
      case "email":
        if (!emailRe.test(value)) errors[field.id] = "Enter a valid email address";
        break;
      case "phone":
        if (!phoneRe.test(value)) errors[field.id] = "Enter a valid phone number";
        break;
      case "number":
        if (!/^-?\d+(\.\d+)?$/.test(value)) errors[field.id] = "Enter a number";
        break;
      case "url":
        if (!/^(https?:\/\/)?[^\s.]+\.[^\s]{2,}$/.test(value))
          errors[field.id] = "Enter a valid URL";
        break;
      case "date":
        if (!dateRe.test(value)) errors[field.id] = "Choose a valid date";
        break;
      case "select":
      case "radio":
        if (!(field.options ?? []).includes(value)) errors[field.id] = "Choose a valid option";
        break;
      default:
        break;
    }
    if (!errors[field.id]) custom[field.id] = value;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, standard, custom };
}

export function newCustomFieldId(): string {
  return `cf_${Math.random().toString(36).slice(2, 10)}`;
}
