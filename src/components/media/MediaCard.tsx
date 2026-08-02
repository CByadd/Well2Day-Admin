import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Trash2, FileVideo, Clock, ExternalLink, HardDrive, Calendar } from "lucide-react";
import { MoveMediaModal } from "./MoveMediaModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

interface MediaItem {
  id: string;
  name: string;
  type: "image" | "video";
  url: string;
  duration?: string;
  tags: string[];
  uploadDate: string;
  size: string;
  publicId?: string;
}

interface MediaCardProps {
  media: MediaItem;
  onDelete: (id: string, silent?: boolean) => void;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  isSelectionMode?: boolean;
}

export const MediaCard = ({ 
  media, 
  onDelete, 
  isSelected = false, 
  onSelect,
  isSelectionMode = false
}: MediaCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);

  const toggleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(media.id, !isSelected);
  };

  // Self-hosted assets: no thumbnails (files served as-is). Videos show placeholder + duration.

  const handleDelete = () => {
    onDelete(media.id);
    setShowDeleteDialog(false);
    toast({
      title: "Media deleted",
      description: "The media asset has been removed from your library.",
    });
  };

  return (
    <>
      <Card 
        className={`overflow-hidden transition-all duration-300 group relative ${
          isSelected 
            ? "ring-2 ring-primary ring-offset-2 scale-[1.02] shadow-xl" 
            : "hover:shadow-lg"
        }`}
        onClick={isSelectionMode ? toggleSelect : undefined}
      >
        {/* Selection Checkbox */}
        <div 
          onClick={toggleSelect}
          className={`absolute top-2 left-2 z-20 transition-all duration-200 cursor-pointer ${
            isSelectionMode || isSelected ? "opacity-100 scale-100" : "opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100"
          }`}
        >
          <div 
            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shadow-sm transition-colors ${
              isSelected 
                ? "bg-primary border-primary text-primary-foreground" 
                : "bg-background/80 backdrop-blur-sm border-muted-foreground/30 hover:border-primary"
            }`}
          >
            {isSelected && (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        </div>
        <CardContent className="p-0">
          <div className="relative aspect-video bg-muted flex items-center justify-center overflow-hidden group">
            {media.type === "image" ? (
              <img
                src={media.url}
                alt={media.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="relative w-full h-full bg-black">
                <video
                  src={`${media.url}#t=0.1`}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                  preload="metadata"
                  crossOrigin="anonymous"
                  onMouseEnter={(e) => e.currentTarget.play()}
                  onMouseLeave={(e) => {
                    e.currentTarget.pause();
                    e.currentTarget.currentTime = 0.1;
                  }}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none group-hover:opacity-0 transition-opacity bg-black/20">
                  <FileVideo className="w-12 h-12 text-white/70" />
                  {media.duration && (
                    <div className="flex items-center gap-1 text-sm text-white/80 font-medium">
                      <Clock className="w-4 h-4" />
                      <span>{media.duration}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Mobile preview-only trigger area */}
            <div
              className="absolute inset-0 md:hidden z-10"
              onClick={() => setShowPreview(true)}
              aria-label="Preview"
            />

            {/* Hover overlay (Desktop only) */}
            <div className="absolute inset-0 bg-black/60 opacity-0 md:group-hover:opacity-100 transition-opacity hidden md:flex items-center justify-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowPreview(true)}
              >
                <Eye className="w-4 h-4 mr-1" />
                Preview
              </Button>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col items-start gap-3 p-4">
          <div className="w-full space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm line-clamp-1">{media.name}</h3>
              <Badge variant="outline" className="shrink-0">
                {media.type}
              </Badge>
            </div>

            {media.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {media.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-muted-foreground/70" />
                {media.uploadDate}
              </span>
              <Badge variant="secondary" className="font-mono text-xs flex items-center gap-1 bg-primary/10 text-primary border-primary/20">
                <HardDrive className="w-3 h-3" />
                {media.size}
              </Badge>
            </div>
          </div>

          <div className="flex w-full gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 md:hidden"
              onClick={() => setShowPreview(true)}
            >
              <Eye className="w-4 h-4 mr-1" />
              Preview
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => setShowMoveModal(true)}
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Move
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          </div>
        </CardFooter>
      </Card>

      <MoveMediaModal
        open={showMoveModal}
        onOpenChange={setShowMoveModal}
        mediaIds={[media.id]}
        mediaName={media.name}
        onSuccess={() => onDelete?.(media.id, true)}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this asset? It will also be removed from any playlists using it.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Dialog */}
      <AlertDialog open={showPreview} onOpenChange={setShowPreview}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-[90vw] md:max-w-4xl w-full max-h-[95vh] flex flex-col">
          <AlertDialogHeader>
            <AlertDialogTitle className="truncate">{media.name}</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="my-4 flex-1 overflow-auto flex flex-col items-center justify-center gap-4">
            {media.type === "image" ? (
              <img
                src={media.url}
                alt={media.name}
                className="max-w-full max-h-[60vh] w-auto h-auto rounded-lg object-contain"
              />
            ) : (
              <div className="w-full max-w-full bg-black rounded-lg overflow-hidden">
                <video
                  src={media.url}
                  controls
                  className="w-full h-auto max-h-[60vh]"
                  preload="metadata"
                  crossOrigin="anonymous"
                  style={{ maxWidth: '100%' }}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            )}

            {/* Comprehensive File Metadata Footer */}
            <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-muted/60 dark:bg-muted/30 rounded-xl border text-xs">
              <div className="space-y-1">
                <span className="text-muted-foreground font-medium flex items-center gap-1">
                  <HardDrive className="w-3.5 h-3.5 text-primary" />
                  File Size
                </span>
                <span className="font-semibold text-foreground font-mono text-sm block">
                  {media.size}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground font-medium flex items-center gap-1">
                  <FileVideo className="w-3.5 h-3.5 text-primary" />
                  Asset Type
                </span>
                <span className="font-semibold text-foreground capitalize block">
                  {media.type}
                </span>
              </div>
              {media.duration && (
                <div className="space-y-1">
                  <span className="text-muted-foreground font-medium flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    Duration
                  </span>
                  <span className="font-semibold text-foreground block">
                    {media.duration}
                  </span>
                </div>
              )}
              <div className="space-y-1">
                <span className="text-muted-foreground font-medium flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  Uploaded Date
                </span>
                <span className="font-semibold text-foreground block">
                  {media.uploadDate}
                </span>
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
