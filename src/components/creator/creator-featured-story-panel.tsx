import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { motion } from "motion/react";
import {
  getFeaturedContent,
  listContentItems,
  removeFeaturedContent,
  setFeaturedContent,
  type ContentItem,
  type FeaturedContent,
} from "@/lib/featured.functions";
import { interactiveSpring } from "@/components/ui/motion-variants";
import { SkeletonBlock } from "@/components/ui/skeleton-shimmer";
import { ImageUpload } from "@/components/creator/image-upload";
import { cn } from "@/lib/utils";

type Category = FeaturedContent["content_type"];

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "photos", label: "Photos" },
  { value: "highlights", label: "Highlights" },
  { value: "videos", label: "Videos & Clips" },
  { value: "news", label: "Campus News" },
];

export function CreatorFeaturedStoryPanel() {
  const featuredQuery = useQuery({
    queryKey: ["featured-content"],
    queryFn: () => getFeaturedContent({}),
  });

  const [selectedCategory, setSelectedCategory] = useState<Category>("photos");
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [customExcerpt, setCustomExcerpt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const itemsQuery = useQuery({
    queryKey: ["content-items", selectedCategory],
    queryFn: () => listContentItems({ data: { content_type: selectedCategory } }),
    enabled: !!selectedCategory,
  });

  const queryClient = useQueryClient();
  const saveMutation = useMutation({
    mutationFn: () =>
      setFeaturedContent({
        data: {
          content_type: selectedCategory,
          content_id: selectedItem?.id ?? "",
          custom_title: customTitle || null,
          custom_excerpt: customExcerpt || null,
          image_url: imageUrl || null,
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["featured-content"] });
      setFeedback({ type: "success", message: "Featured Story updated" });
      setTimeout(() => setFeedback(null), 4000);
    },
    onError: (err: Error) => {
      setFeedback({ type: "error", message: err.message });
      setTimeout(() => setFeedback(null), 6000);
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => removeFeaturedContent({}),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["featured-content"] });
      setSelectedItem(null);
      setCustomTitle("");
      setCustomExcerpt("");
      setImageUrl("");
      setFeedback({ type: "success", message: "Featured Story removed" });
      setTimeout(() => setFeedback(null), 4000);
    },
    onError: (err: Error) => {
      setFeedback({ type: "error", message: err.message });
      setTimeout(() => setFeedback(null), 6000);
    },
  });

  const current = featuredQuery.data;

  const handleSelectItem = (item: ContentItem) => {
    setSelectedItem(item);
    setCustomTitle("");
    setCustomExcerpt("");
    setImageUrl("");
  };

  const handleSave = () => {
    if (!selectedItem) return;
    saveMutation.mutate();
  };

  const handleRemove = () => {
    if (!window.confirm("Remove the current Featured Story from the homepage?")) return;
    removeMutation.mutate();
  };

  const categoryLabel =
    CATEGORIES.find((c) => c.value === selectedCategory)?.label ?? selectedCategory;

  return (
    <div className="space-y-6 px-5 py-8 md:px-8">
      <div>
        <h2 className="font-display text-2xl font-bold">Featured Story</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose one piece of content to highlight on the homepage. Only one Featured Story is shown
          at a time.
        </p>
      </div>

      {feedback && (
        <div
          className={cn(
            "rounded-md border px-4 py-3 text-sm",
            feedback.type === "success"
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-secondary/40 bg-secondary/10 text-secondary"
          )}
        >
          {feedback.message}
        </div>
      )}

      {current && (
        <div className="space-y-3 rounded-lg border border-border bg-surface-low p-5">
          <span className="label-caps text-muted-foreground">Current Featured Story</span>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative h-40 w-full overflow-hidden rounded-sm bg-background sm:h-32 sm:w-48">
              <img src={current.image_url || ""} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="flex flex-1 flex-col justify-center">
              <span className="label-caps text-xs text-primary">
                {current.content_type.toUpperCase()}
              </span>
              <p className="mt-1 font-display text-lg font-semibold">
                {current.custom_title || "Untitled"}
              </p>
              {current.custom_excerpt && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {current.custom_excerpt}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            disabled={removeMutation.isPending}
            className="label-caps rounded-sm border border-border px-4 py-2.5 text-muted-foreground transition-colors hover:border-secondary hover:text-secondary disabled:opacity-60"
          >
            {removeMutation.isPending ? "Removing…" : "Remove Featured Story"}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          <div className="space-y-2">
            <span className="label-caps text-muted-foreground">Category</span>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.value);
                    setSelectedItem(null);
                  }}
                  className={cn(
                    "label-caps rounded-sm border px-4 py-2 transition-colors",
                    selectedCategory === cat.value
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="label-caps text-muted-foreground">Select {categoryLabel}</label>
            {itemsQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonBlock key={i} className="h-14 w-full" rounded="sm" />
                ))}
              </div>
            ) : itemsQuery.isError ? (
              <p className="text-sm text-secondary">{(itemsQuery.error as Error).message}</p>
            ) : itemsQuery.data?.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No {categoryLabel.toLowerCase()} found.
              </p>
            ) : (
              <ul className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-border">
                {itemsQuery.data?.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectItem(item)}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
                        selectedItem?.id === item.id
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-surface-high text-foreground"
                      )}
                    >
                      <span className="h-10 w-14 shrink-0 overflow-hidden rounded-sm bg-background">
                        <img src={item.coverImage} alt="" className="h-full w-full object-cover" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{item.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {item.description}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-5">
          {selectedItem ? (
            <>
              <div className="space-y-2">
                <span className="label-caps text-muted-foreground">Preview</span>
                <div className="archive-frame overflow-hidden">
                  <div className="relative aspect-video w-full bg-background">
                    <img
                      src={selectedItem.coverImage}
                      alt={selectedItem.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="space-y-2 p-5">
                    <span className="label-caps text-xs text-primary">
                      {categoryLabel.toUpperCase()}
                    </span>
                    <p className="font-display text-lg font-semibold">{selectedItem.title}</p>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {selectedItem.description}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-lg border border-border bg-surface-low p-5">
                <h3 className="label-caps text-muted-foreground">Custom Overrides (optional)</h3>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground" htmlFor="custom-title">
                    Custom headline
                  </label>
                  <input
                    id="custom-title"
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder={selectedItem.title}
                    maxLength={200}
                    className="w-full border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground" htmlFor="custom-excerpt">
                    Custom excerpt
                  </label>
                  <textarea
                    id="custom-excerpt"
                    value={customExcerpt}
                    onChange={(e) => setCustomExcerpt(e.target.value)}
                    placeholder={selectedItem.description}
                    maxLength={1000}
                    rows={3}
                    className="w-full border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <ImageUpload
                  folder="featured-story"
                  value={imageUrl}
                  onChange={setImageUrl}
                  label="Custom cover image (optional)"
                  hint="If left empty, the default image from the selected Drive content is used."
                  folderLabel="media-club-assets/featured-story"
                />
                <motion.button
                  type="button"
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  transition={interactiveSpring}
                  className="w-full rounded-sm border border-primary bg-primary/10 py-3 label-caps text-primary transition-colors hover:bg-primary/20 disabled:opacity-60"
                >
                  {saveMutation.isPending ? "Saving…" : "Set as Featured"}
                </motion.button>
              </div>
            </>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border">
              <p className="text-sm text-muted-foreground">
                Select an item from the list to preview it here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
