import { useState } from "react";
import {
  CUSTOM_FIELD_TYPES,
  CUSTOM_FIELD_TYPE_LABELS,
  OPTION_TYPES,
  STANDARD_FIELD_LABELS,
  newCustomFieldId,
} from "@/lib/registration-form";
import type { CustomFieldType, FormField, RegistrationFormConfig } from "@/lib/registration-form";
import { RegistrationFields } from "./registration-fields";

const inputClass =
  "w-full border border-border bg-surface-low px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none";
const labelClass = "label-caps mb-1 block text-muted-foreground";
const chip =
  "label-caps border border-border px-3 py-2 text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:opacity-30";

/** Creator-facing builder for one event's registration form. */
export function FormBuilder({
  config,
  onChange,
}: {
  config: RegistrationFormConfig;
  onChange: (next: RegistrationFormConfig) => void;
}) {
  const [preview, setPreview] = useState(false);
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({});

  const setFields = (fields: FormField[]) => onChange({ ...config, fields });

  const update = (index: number, patch: Partial<FormField>) =>
    setFields(config.fields.map((f, i) => (i === index ? ({ ...f, ...patch } as FormField) : f)));

  const move = (index: number, dir: -1 | 1) => {
    const next = [...config.fields];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    const a = next[index]!;
    next[index] = next[target]!;
    next[target] = a;
    setFields(next);
  };

  const addCustom = (type: CustomFieldType) =>
    setFields([
      ...config.fields,
      {
        kind: "custom",
        id: newCustomFieldId(),
        type,
        label: CUSTOM_FIELD_TYPE_LABELS[type],
        required: false,
        ...(OPTION_TYPES.includes(type) ? { options: ["Option 1", "Option 2"] } : {}),
      },
    ]);

  const removeField = (index: number) => setFields(config.fields.filter((_, i) => i !== index));

  return (
    <div className="border border-border p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="label-caps text-primary">Registration form</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Turn standard fields on or off, mark them required, and add your own questions.
          </p>
        </div>
        <button type="button" className={chip} onClick={() => setPreview((p) => !p)}>
          {preview ? "Back to editing" : "Preview form"}
        </button>
      </div>

      {preview ? (
        <div className="border border-border p-4">
          <RegistrationFields
            config={config}
            values={previewValues}
            onChange={(id, v) => setPreviewValues((p) => ({ ...p, [id]: v }))}
          />
          {config.allowAdditionalInfo ? (
            <div className="mt-5">
              <span className={labelClass}>Anything else we should know?</span>
              <textarea rows={3} className={inputClass} />
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {config.fields.map((field, index) => (
              <li key={field.id} className="border border-border p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-display text-sm font-bold uppercase">
                    {field.kind === "standard"
                      ? STANDARD_FIELD_LABELS[field.id]
                      : field.label || "Untitled field"}
                  </span>
                  <span className="label-caps text-muted-foreground">
                    {field.kind === "standard" ? "Standard" : CUSTOM_FIELD_TYPE_LABELS[field.type]}
                  </span>
                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    {field.kind === "standard" ? (
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={field.enabled}
                          onChange={(e) =>
                            update(index, {
                              enabled: e.target.checked,
                              ...(e.target.checked ? {} : { required: false }),
                            } as Partial<FormField>)
                          }
                        />
                        Include
                      </label>
                    ) : null}
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={field.required}
                        disabled={field.kind === "standard" && !field.enabled}
                        onChange={(e) =>
                          update(index, {
                            required: e.target.checked,
                          } as Partial<FormField>)
                        }
                      />
                      Required
                    </label>
                    <button
                      type="button"
                      className={chip}
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className={chip}
                      onClick={() => move(index, 1)}
                      disabled={index === config.fields.length - 1}
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                    {field.kind === "custom" ? (
                      <button
                        type="button"
                        className="label-caps border border-border px-3 py-2 text-secondary transition-colors hover:border-secondary"
                        onClick={() => removeField(index)}
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </div>

                {field.kind === "custom" ? (
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className={labelClass}>Label</span>
                      <input
                        className={inputClass}
                        value={field.label}
                        onChange={(e) =>
                          update(index, {
                            label: e.target.value,
                          } as Partial<FormField>)
                        }
                      />
                    </label>
                    <label className="block">
                      <span className={labelClass}>Field type</span>
                      <select
                        className={inputClass}
                        value={field.type}
                        onChange={(e) => {
                          const type = e.target.value as CustomFieldType;
                          update(index, {
                            type,
                            ...(OPTION_TYPES.includes(type) && !(field.options ?? []).length
                              ? { options: ["Option 1", "Option 2"] }
                              : {}),
                          } as Partial<FormField>);
                        }}
                      >
                        {CUSTOM_FIELD_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {CUSTOM_FIELD_TYPE_LABELS[t]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className={labelClass}>Placeholder</span>
                      <input
                        className={inputClass}
                        value={field.placeholder ?? ""}
                        onChange={(e) =>
                          update(index, {
                            placeholder: e.target.value,
                          } as Partial<FormField>)
                        }
                      />
                    </label>
                    <label className="block">
                      <span className={labelClass}>Helper text</span>
                      <input
                        className={inputClass}
                        value={field.description ?? ""}
                        onChange={(e) =>
                          update(index, {
                            description: e.target.value,
                          } as Partial<FormField>)
                        }
                      />
                    </label>
                    {OPTION_TYPES.includes(field.type) ? (
                      <label className="block sm:col-span-2">
                        <span className={labelClass}>Options (one per line)</span>
                        <textarea
                          rows={3}
                          className={inputClass}
                          value={(field.options ?? []).join("\n")}
                          onChange={(e) =>
                            update(index, {
                              options: e.target.value
                                .split("\n")
                                .map((o) => o.trim())
                                .filter(Boolean),
                            } as Partial<FormField>)
                          }
                        />
                      </label>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="label-caps text-muted-foreground">Add field</span>
            {CUSTOM_FIELD_TYPES.map((t) => (
              <button key={t} type="button" className={chip} onClick={() => addCustom(t)}>
                {CUSTOM_FIELD_TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          <label className="mt-4 flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={config.allowAdditionalInfo}
              onChange={(e) => onChange({ ...config, allowAdditionalInfo: e.target.checked })}
            />
            Include the free-text "anything else we should know?" box
          </label>
        </>
      )}
    </div>
  );
}
