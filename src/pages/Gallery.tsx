import { useState, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Search, Images, X, ChevronLeft, ChevronRight, Calendar, Play, Folder } from "lucide-react";
import { format } from "date-fns";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { getGallery } from "@/services/gallery";
import type { EventGalleryItem } from "@/types";

// Inline SVG placeholder shown when an image URL fails to load.
const FALLBACK_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <rect width="400" height="400" fill="#e2e8f0"/>
      <g fill="none" stroke="#94a3b8" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
        <rect x="90" y="110" width="220" height="180" rx="12"/>
        <circle cx="150" cy="160" r="18"/>
        <path d="M110 270 L180 200 L230 250 L270 210 L300 270 Z"/>
      </g>
    </svg>`
  );

const Gallery = () => {
  const [search, setSearch] = useState("");
  const [activeAlbum, setActiveAlbum] = useState<string>("All");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const { data: photos, isLoading, error } = useQuery({
    queryKey: ["gallery"],
    queryFn: getGallery,
  });

  // Build the list of albums for the filter tabs.
  const albums = useMemo(() => {
    const set = new Set<string>();
    (photos ?? []).forEach((p) => set.add(p.album || "General"));
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [photos]);

  const filtered = useMemo(() => {
    if (!photos) return [];
    return photos.filter((p) => {
      const matchesSearch = (p.caption ?? "").toLowerCase().includes(search.toLowerCase());
      const matchesAlbum = activeAlbum === "All" || (p.album || "General") === activeAlbum;
      return matchesSearch && matchesAlbum;
    });
  }, [photos, search, activeAlbum]);

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  const prevPhoto = () => setLightboxIndex((i) => (i === null || i === 0 ? filtered.length - 1 : i - 1));
  const nextPhoto = () => setLightboxIndex((i) => (i === null ? 0 : (i + 1) % filtered.length));

  const current = lightboxIndex !== null ? filtered[lightboxIndex] : null;

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

          {/* Album filter tabs */}
          {albums.length > 1 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {albums.map((album) => (
                <button
                  key={album}
                  onClick={() => { setActiveAlbum(album); setLightboxIndex(null); }}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                    activeAlbum === album
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted"
                  }`}
                >
                  {album !== "All" && <Folder className="h-3.5 w-3.5" />}
                  {album}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Gallery Masonry Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4 [&>*]:mb-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse break-inside-avoid rounded-2xl bg-muted" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border bg-card p-12 text-center text-red-500">
              <p>Failed to load gallery: {error.message}</p>
            </div>
          ) : filtered && filtered.length > 0 ? (
            <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4 [&>*]:mb-4">
              {filtered.map((photo, index) => (
                <button
                  key={photo.id}
                  onClick={() => openLightbox(index)}
                  className="group relative block w-full break-inside-avoid overflow-hidden rounded-2xl border bg-muted shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {photo.mediaType === "video" ? (
                    <video
                      src={photo.mediaUrl}
                      className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      muted
                      loop
                      autoPlay
                      playsInline
                    />
                  ) : (
                    <img
                      src={photo.mediaUrl}
                      alt={photo.caption ?? "Gallery photo"}
                      className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                      onError={(e) => {
                        const img = e.currentTarget as HTMLImageElement;
                        img.onerror = null;
                        img.src = FALLBACK_IMAGE;
                      }}
                    />
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 via-black/0 to-black/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <div className="w-full p-3 text-left">
                      {photo.caption && (
                        <p className="truncate text-sm font-medium text-white">{photo.caption}</p>
                      )}
                      <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-white/20 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                        <Folder className="h-2.5 w-2.5" />
                        {photo.album}
                      </span>
                    </div>
                  </div>

                  {/* Album badge (always visible) */}
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                    <Folder className="h-2.5 w-2.5" />
                    {photo.album}
                  </span>

                  {/* Video play badge */}
                  {photo.mediaType === "video" && (
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
                        <Play className="h-5 w-5 fill-white text-white" />
                      </span>
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border bg-card p-12 text-center">
              <Images className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No Photos Yet</h3>
              <p className="text-muted-foreground">
                {search || activeAlbum !== "All"
                  ? "Try adjusting your filters"
                  : "Event photos will be uploaded after each event!"}
              </p>
              {(search || activeAlbum !== "All") && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => { setSearch(""); setActiveAlbum("All"); }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Lightbox */}
      {current && (
        <Dialog open onOpenChange={closeLightbox}>
          <DialogContent className="max-w-4xl border-0 bg-black p-0">
            <div className="relative">
              {current.mediaType === "video" ? (
                <video
                  src={current.mediaUrl}
                  className="max-h-[80vh] w-full object-contain"
                  controls
                  autoPlay
                />
              ) : (
                <img
                  src={current.mediaUrl}
                  alt={current.caption ?? ""}
                  className="max-h-[80vh] w-full object-contain"
                />
              )}

              {/* Close */}
              <button
                onClick={closeLightbox}
                className="absolute right-3 top-3 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
              >
                <X className="h-5 w-5" />
              </button>
              {/* Prev */}
              <button
                onClick={prevPhoto}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white transition-colors hover:scale-110 hover:bg-black/70"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              {/* Next */}
              <button
                onClick={nextPhoto}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white transition-colors hover:scale-110 hover:bg-black/70"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              {/* Caption / meta */}
              <div className="bg-black/80 p-4 text-white">
                {current.caption && (
                  <p className="text-sm font-semibold text-white/90">{current.caption}</p>
                )}
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/60">
                  <span className="inline-flex items-center gap-1">
                    <Folder className="h-3 w-3" />
                    {current.album}
                  </span>
                  {current.createdAt && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(current.createdAt), "MMMM d, yyyy")}
                    </span>
                  )}
                  <Badge variant="secondary" className="text-[10px]">
                    {lightboxIndex! + 1} / {filtered.length}
                  </Badge>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Layout>
  );
};

export default Gallery;
