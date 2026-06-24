import { useState, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Search, Images, X, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { getGallery } from "@/services/gallery";
import type { EventGalleryItem } from "@/types";

const Gallery = () => {
  const [search, setSearch] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const { data: photos, isLoading, error } = useQuery({
    queryKey: ["gallery"],
    queryFn: getGallery,
  });

  console.log("Gallery:", photos, error);

  if (error) {
    console.error("Gallery Error:", error.message);
  }

  const filtered = useMemo(() => {
    if (!photos) return [];
    return photos.filter((p) => {
      const matchesSearch =
        (p.caption ?? "").toLowerCase().includes(search.toLowerCase());
      return matchesSearch;
    });
  }, [photos, search]);

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  const prevPhoto = () => setLightboxIndex((i) => (i === null || i === 0 ? filtered.length - 1 : i - 1));
  const nextPhoto = () => setLightboxIndex((i) => (i === null ? 0 : (i + 1) % filtered.length));

  return (
    <Layout>
      <Helmet>
        <title>Events Gallery — Unstop Igniters Club</title>
        <meta name="description" content="Photos from Unstop Igniters Club events — workshops, hackathons, seminars, and more." />
      </Helmet>

      {/* Header */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="mb-4 text-4xl font-bold md:text-5xl">
              Events{" "}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Gallery
              </span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Moments from our workshops, hackathons, and club events
            </p>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="border-b bg-background py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 md:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search gallery..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

          </div>
        </div>
      </section>

      {/* Gallery Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border bg-card p-12 text-center text-red-500">
              <p>Failed to load gallery: {error.message}</p>
            </div>
          ) : filtered && filtered.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {filtered.map((photo, index) => (
                <button
                  key={photo.id}
                  onClick={() => openLightbox(index)}
                  className="group relative aspect-square overflow-hidden rounded-xl border bg-muted transition-transform hover:scale-[1.02] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <img
                    src={photo.mediaUrl}
                    alt={photo.caption ?? ""}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="absolute bottom-0 w-full p-3 text-left">
                      {photo.caption && (
                        <p className="truncate text-sm text-white">{photo.caption}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border bg-card p-12 text-center">
              <Images className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No Photos Yet</h3>
              <p className="text-muted-foreground">
                {search
                  ? "Try adjusting your filters"
                  : "Event photos will be uploaded after each event!"}
              </p>
              {search && (
                <Button variant="outline" className="mt-4" onClick={() => { setSearch(""); }}>
                  Clear Filters
                </Button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Lightbox */}
      {lightboxIndex !== null && filtered[lightboxIndex] && (
        <Dialog open onOpenChange={closeLightbox}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-0">
            <div className="relative">
              <img
                src={filtered[lightboxIndex].mediaUrl}
                alt={filtered[lightboxIndex].caption ?? ""}
                className="max-h-[80vh] w-full object-contain"
              />
              {/* Close */}
              <button
                onClick={closeLightbox}
                className="absolute right-3 top-3 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
              >
                <X className="h-5 w-5" />
              </button>
              {/* Prev */}
              <button
                onClick={prevPhoto}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              {/* Next */}
              <button
                onClick={nextPhoto}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              {/* Caption */}
              <div className="bg-black/80 p-4 text-white">
                {filtered[lightboxIndex].caption && (
                  <p className="text-sm font-semibold text-white/80">{filtered[lightboxIndex].caption}</p>
                )}
                {filtered[lightboxIndex].createdAt && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-white/60">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(filtered[lightboxIndex].createdAt), "MMMM d, yyyy")}
                  </p>
                )}
                <p className="mt-1 text-xs text-white/50">
                  {lightboxIndex + 1} / {filtered.length}
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Layout>
  );
};

export default Gallery;
