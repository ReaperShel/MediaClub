import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useId, useRef, useState } from "react";
import { motion } from "motion/react";
import { createCreatorUploadUrl } from "@/lib/creator-uploads.functions";
import { supabase } from "@/integrations/supabase/client";
import { interactiveSpring } from "@/components/ui/motion-variants";
import { cn } from "@/lib/utils";

type UploadFolder = "featured-story" | "event-posters";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

const EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function extFromType(mime: string): string {
  return EXT_MAP[mime] ?? "bin";
}

function userMessage(err: unknown, fallback: string): string {
  if (import.meta.env.DEV) {
    const e = err as Record<string, unknown> | null;
    console.error("[ImageUpload]", {
      message: (e as { message?: string })?.message,
      name: (e as { name?: string })?.name,
      statusCode: (e as { statusCode?: string | number })?.statusCode,
      error: (e as { error?: string })?.error,
      __isStorageError: (e as { __isStorageError?: boolean })?.__isStorageError,
      originalError: (e as { originalError?: unknown })?.originalError,
      cause: (e as { cause?: unknown })?.cause,
      full: err,
    });
  }
  if (err instanceof Error && err.message) {
    const msg = err.message.toLowerCase();
    // Only suppress the very specific PostgREST "related resource does
    // not exist" message — that one contains the internal table name and
    // is meaningless to end users. All other Supabase errors should be
    // surfaced so creators and developers can diagnose the real cause.
    if (msg.includes("related resource does not exist")) {
      return "Unable to upload image. Please try again.";
    }
    return err.message;
  }
  return fallback;
}

export type ImageUploadProps = {
  /** The current image URL (from server). May be empty. */
  value: string;
  /** Called when a new upload completes. Receives the public URL. */
  onChange: (url: string) => void;
  /** Subfolder under the shared media-club-assets bucket. */
  folder: UploadFolder;
  /** Label text shown above the upload control. */
  label?: string;
  /** Optional helper text under the label. */
  hint?: string;
  /** Folder shown in the preview card (purely informational). */
  folderLabel?: string;
};

export function ImageUpload({
  value,
  onChange,
  folder,
  label = "Cover image (optional)",
  hint,
  folderLabel,
}: ImageUploadProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Client-only: the local File before it is uploaded
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  // Client-only: temporary object URL for preview
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestUpload = useServerFn(createCreatorUploadUrl);

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      // 1. Ask the server for a signed upload URL. The argument is a plain
      //    serializable object — NO File/FormData/Blob crosses the boundary.
      const {
        bucket: signedBucket,
        token,
        path,
        publicUrl,
      } = await requestUpload({
        data: {
          folder,
          contentType: file.type,
          size: file.size,
          ext: extFromType(file.type),
        },
      });

      // 2. Upload the file directly to Supabase Storage using the signed URL.
      //    The File is sent as the request body over standard HTTP — it never
      //    touches TanStack/Seroval.
      const { error: uploadError } = await supabase.storage
        .from(signedBucket)
        .uploadToSignedUrl(path, token, file, {
          contentType: file.type,
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        // Preserve the full Supabase error object (message, statusCode,
        // name, __isStorageError, etc.) so dev logging can diagnose it.
        const wrapped = new Error(uploadError.message) as Error & {
          statusCode?: string | number;
          name?: string;
          __isStorageError?: boolean;
          originalError?: unknown;
        };
        wrapped.name = uploadError.name ?? "StorageError";
        if (uploadError.statusCode !== undefined) {
          wrapped.statusCode = uploadError.statusCode;
        }
        const storageErrorFlag = (uploadError as unknown as { __isStorageError?: boolean })
          .__isStorageError;
        if (storageErrorFlag !== undefined) {
          wrapped.__isStorageError = storageErrorFlag;
        }
        wrapped.originalError = uploadError;
        throw wrapped;
      }

      // 3. Return ONLY a serializable URL string.
      return publicUrl;
    },
    onSuccess: (publicUrl) => {
      onChange(publicUrl);
      setPendingFile(null);
      setError(null);
    },
    onError: (err: Error) => {
      setError(userMessage(err, "Upload failed"));
      // Drop the pending preview since the upload failed.
      setPendingFile(null);
    },
  });

  // Revoke the local object URL when it changes or on unmount.
  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const validate = (file: File): string | null => {
    if (!ALLOWED_TYPES.has(file.type)) {
      return "Only JPG, PNG, and WebP images are allowed.";
    }
    if (file.size > MAX_BYTES) {
      return "Image is larger than 5 MB.";
    }
    return null;
  };

  const handleFile = (file: File) => {
    const err = validate(file);
    if (err) {
      setError(err);
      return;
    }
    setError(null);

    // Create a temporary object URL for local preview ONLY.
    if (localPreview) URL.revokeObjectURL(localPreview);
    const objectUrl = URL.createObjectURL(file);
    setLocalPreview(objectUrl);
    setPendingFile(file);

    // Kick off the actual upload (the file goes to Supabase directly).
    mutation.mutate(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleRemove = () => {
    onChange("");
    setError(null);
    setPendingFile(null);
    if (localPreview) {
      URL.revokeObjectURL(localPreview);
      setLocalPreview(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploading = mutation.isPending;
  // The preview comes from the local object URL while uploading; once
  // complete we use the committed `value` (a serializable public URL).
  const previewUrl = uploading && localPreview ? localPreview : value;
  const hasFile = !!value || !!pendingFile;

  return (
    <div className="space-y-2">
      <span className="label-caps text-muted-foreground">{label}</span>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {folderLabel ? (
        <p className="text-[10px] tracking-wider text-muted-foreground/70 uppercase">
          Stored in: {folderLabel}/
        </p>
      ) : null}

      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleInputChange}
        disabled={uploading}
        className="sr-only"
      />

      {hasFile ? (
        <div className="overflow-hidden rounded-sm border border-border bg-surface-low">
          <div className="relative aspect-video w-full bg-background">
            {previewUrl ? (
              <img src={previewUrl} alt="Cover preview" className="h-full w-full object-cover" />
            ) : null}
            {uploading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <span className="label-caps text-primary-foreground">Uploading…</span>
              </div>
            ) : null}
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="truncate text-xs text-muted-foreground">
              {value ? value.split("/").slice(-1)[0] : (pendingFile?.name ?? "")}
            </span>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="label-caps rounded-sm border border-border px-3 py-1.5 text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-60"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={uploading}
                className="label-caps rounded-sm border border-border px-3 py-1.5 text-muted-foreground transition-colors hover:border-secondary hover:text-secondary disabled:opacity-60"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <motion.label
          htmlFor={inputId}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          whileHover={{ scale: 1.005 }}
          whileTap={{ scale: 0.995 }}
          transition={interactiveSpring}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-sm border-2 border-dashed bg-surface-low px-4 py-8 text-center transition-colors",
            isDragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/50",
            uploading && "pointer-events-none opacity-60"
          )}
        >
          {uploading ? (
            <span className="label-caps text-primary">Uploading…</span>
          ) : (
            <>
              <svg
                className="h-8 w-8 text-muted-foreground"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 7.5m0 0L7.5 12M12 7.5v9"
                />
              </svg>
              <span className="label-caps text-foreground">Click to upload or drag and drop</span>
              <span className="text-xs text-muted-foreground">JPG, PNG, or WebP — up to 5 MB</span>
            </>
          )}
        </motion.label>
      )}

      {error ? (
        <p className="text-xs text-secondary">{error}</p>
      ) : mutation.isSuccess && value ? (
        <p className="text-xs text-primary">Upload complete</p>
      ) : null}
    </div>
  );
}
