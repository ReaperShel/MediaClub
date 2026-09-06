import { YEARS_OF_STUDY, fieldLabel, visibleFields } from "@/lib/registration-form";
import type { FormField, RegistrationFormConfig } from "@/lib/registration-form";

const inputClass =
  "w-full border border-border bg-surface-low px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none";
const labelClass = "label-caps mb-2 block text-muted-foreground";

/** Renders one configured field as a controlled input. */
function Field({
  field,
  value,
  onChange,
  error,
  disabled,
}: {
  field: FormField;
  value: string;
  onChange: (v: string) => void;
  error?: string | undefined;
  disabled?: boolean;
}) {
  const label = `${fieldLabel(field)}${field.required ? " *" : ""}`;
  const placeholder = field.kind === "custom" ? (field.placeholder ?? "") : "";
  const description = field.kind === "custom" ? (field.description ?? "") : "";

  let control: React.ReactNode;

  if (field.kind === "standard" && field.id === "yearOfStudy") {
    control = (
      <select
        className={inputClass}
        value={value}
        disabled={disabled ?? false}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select…</option>
        {YEARS_OF_STUDY.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    );
  } else if (field.kind === "standard") {
    control = (
      <input
        className={inputClass}
        type={field.id === "email" ? "email" : "text"}
        value={value}
        disabled={disabled ?? false}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  } else {
    switch (field.type) {
      case "textarea":
        control = (
          <textarea
            rows={4}
            className={inputClass}
            placeholder={placeholder}
            value={value}
            disabled={disabled ?? false}
            onChange={(e) => onChange(e.target.value)}
          />
        );
        break;
      case "select":
        control = (
          <select
            className={inputClass}
            value={value}
            disabled={disabled ?? false}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">Select…</option>
            {(field.options ?? []).map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        );
        break;
      case "radio":
        control = (
          <div className="flex flex-wrap gap-4">
            {(field.options ?? []).map((o) => (
              <label key={o} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={field.id}
                  value={o}
                  checked={value === o}
                  disabled={disabled ?? false}
                  onChange={() => onChange(o)}
                />
                {o}
              </label>
            ))}
          </div>
        );
        break;
      case "checkbox":
        control = (
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={value === "Yes"}
              disabled={disabled ?? false}
              onChange={(e) => onChange(e.target.checked ? "Yes" : "")}
            />
            {placeholder || fieldLabel(field)}
          </label>
        );
        break;
      default:
        control = (
          <input
            className={inputClass}
            type={
              field.type === "date"
                ? "date"
                : field.type === "number"
                  ? "number"
                  : field.type === "email"
                    ? "email"
                    : field.type === "url"
                      ? "url"
                      : "text"
            }
            placeholder={placeholder}
            value={value}
            disabled={disabled ?? false}
            onChange={(e) => onChange(e.target.value)}
          />
        );
    }
  }

  const wide =
    field.kind === "custom" &&
    (field.type === "textarea" || field.type === "radio" || field.type === "checkbox");

  return (
    <div className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className={labelClass}>{label}</span>
      {control}
      {description ? (
        <span className="mt-2 block text-xs text-muted-foreground">{description}</span>
      ) : null}
      {error ? <span className="mt-2 block text-xs text-secondary">{error}</span> : null}
    </div>
  );
}

/** The event's configured registration form, rendered in its configured order. */
export function RegistrationFields({
  config,
  values,
  onChange,
  errors,
  disabled,
}: {
  config: RegistrationFormConfig;
  values: Record<string, string>;
  onChange: (id: string, value: string) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {visibleFields(config).map((field) => (
        <Field
          key={field.id}
          field={field}
          value={values[field.id] ?? ""}
          onChange={(v) => onChange(field.id, v)}
          error={errors?.[field.id]}
          {...(disabled === undefined ? {} : { disabled })}
        />
      ))}
    </div>
  );
}

export { inputClass as fieldInputClass, labelClass as fieldLabelClass };
