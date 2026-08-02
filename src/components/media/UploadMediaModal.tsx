import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, FileVideo, FileImage, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import api from "@/lib/api";

interface UploadMediaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadSuccess: () => void;
  folderId?: string;
}

export const UploadMediaModal = ({ open, onOpenChange, onUploadSuccess, folderId }: UploadMediaModalProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_SIZE = 20 * 1024 * 1024; // 20 MB

  const checkFileSize = (file: File): { ok: boolean; message?: string } => {
  const isVideo = file.type.startsWith("video/");
  const limit = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  const limitMb = isVideo ? 20 : 10;

  if (file.size > limit) {
    const mb = (file.size / (1024 * 1024)).toFixed(2);
    return {
      ok: false,
      message: `${file.name} is too large (${mb} MB). ${
        isVideo ? "Videos" : "Images"
      } must be less than ${limitMb} MB.`,
    };
  }
  return { ok: true };
};

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const allowed = Array.from(e.dataTransfer.files).filter(
        (file) => file.type.startsWith("image/") || file.type.startsWith("video/")
      );
      const valid: File[] = [];
      for (const file of allowed) {
        const { ok, message } = checkFileSize(file);
        if (ok) valid.push(file);
        else
          toast({
            title: "Asset too large",
            description: message,
            variant: "destructive",
          });
      }
      if (valid.length) setFiles((prev) => [...prev, ...valid]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      const valid: File[] = [];
      for (const file of newFiles) {
        const { ok, message } = checkFileSize(file);
        if (ok) valid.push(file);
        else
          toast({
            title: "Asset too large",
            description: message,
            variant: "destructive",
          });
      }
      if (valid.length) setFiles((prev) => [...prev, ...valid]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const validateFiles = () => {
    for (const file of files) {
      const { ok, message } = checkFileSize(file);
      if (!ok) {
        toast({ title: "Asset too large", description: message, variant: "destructive" });
        return false;
      }
    }
    return true;
  };

  const readVideoDuration = (file: File): Promise<number | null> =>
    new Promise((resolve) => {
      if (!file.type.startsWith("video/")) {
        resolve(null);
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.preload = "metadata";
      video.src = objectUrl;

      const cleanup = () => {
        URL.revokeObjectURL(objectUrl);
        video.removeAttribute("src");
        video.load();
      };

      video.onloadedmetadata = () => {
        const duration = Number.isFinite(video.duration) && video.duration > 0
          ? Math.max(1, Math.round(video.duration))
          : null;
        cleanup();
        resolve(duration);
      };

      video.onerror = () => {
        cleanup();
        resolve(null);
      };
    });

  const handleUpload = async () => {
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one file to upload.",
        variant: "destructive",
      });
      return;
    }

    if (!validateFiles()) return;

    try {
      setUploading(true);

      // Create FormData for file upload
      const formData = new FormData();
      const fileMetadata = await Promise.all(files.map(async (file, index) => ({
        index,
        originalName: file.name,
        size: file.size,
        type: file.type,
        duration: await readVideoDuration(file),
      })));

      files.forEach((file) => {
        formData.append('files', file);
      });
      formData.append('fileMetadata', JSON.stringify(fileMetadata));

      if (name) {
        formData.append('name', name);
      }

      if (tags) {
        formData.append('tags', tags);
      }

      if (folderId) {
        formData.append('folderId', folderId);
      }

      // Upload to server
      const response = await api.uploadMedia(formData);

      if (response.ok) {
        toast({
          title: "Upload successful",
          description: response.message || `Successfully uploaded ${files.length} file(s)!`,
        });

        // Reset form
        setFiles([]);
        setName("");
        setTags("");
        onUploadSuccess();
        onOpenChange(false);
      } else {
        throw new Error(response.error || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error?.message || "Failed to upload media. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('video/')) {
      return <FileVideo className="w-8 h-8 text-primary" />;
    }
    return <FileImage className="w-8 h-8 text-primary" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const trimFileName = (name, max = 25) => {
    if (name.length <= max) return name
    const ext = name.split('.').pop()
    return `${name.slice(0, max - ext.length - 4)}...${ext}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload Media</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Upload Area */}
          <div className="space-y-2">
            <Label>Upload File(s)</Label>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
                }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag & drop files here, or click to browse
              </p>
            <p className="text-xs text-muted-foreground mb-4">
  Supported: JPG, PNG, MP4, MOV. Limits: 10 MB (images), 20 MB (videos).
</p>
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                Browse Files
              </Button>
            </div>
          </div>

          {/* Selected Files */}
          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Selected Files ({files.length})</Label>
                <span className="text-xs font-mono font-medium text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                  Total Size: {formatFileSize(files.reduce((acc, f) => acc + f.size, 0))}
                </span>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    {getFileIcon(file)}
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-sm font-medium" title={file.name}>
                        {trimFileName(file.name)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)} • {file.type.split('/')[0]}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeFile(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Name Field */}
          {/* <div className="space-y-2">
            <Label htmlFor="name">Name (Optional)</Label>
            <Input
              id="name"
              placeholder="Enter a name for easy identification"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div> */}

          {/* Tags Field */}
          {/* <div className="space-y-2">
            <Label htmlFor="tags">Tags (Optional)</Label>
            <Input
              id="tags"
              placeholder="e.g., Health, Ad Campaign (comma-separated)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div> */}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={uploading || files.length === 0}
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              'Upload & Save'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
