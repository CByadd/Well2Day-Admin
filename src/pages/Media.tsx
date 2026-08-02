import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Search, Loader2, FolderPlus, Home, ChevronRight, Trash2, Move, CheckSquare, Square, X, HardDrive } from "lucide-react";
import { MediaEmptyState } from "@/components/media/MediaEmptyState";
import { UploadMediaModal } from "@/components/media/UploadMediaModal";
import { MediaCard } from "@/components/media/MediaCard";
import { FolderCard } from "@/components/media/FolderCard";
import { CreateFolderModal } from "@/components/media/CreateFolderModal";
import { MoveMediaModal } from "@/components/media/MoveMediaModal";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";

interface MediaItem {
  id: string;
  name: string;
  type: "image" | "video";
  url: string;
  duration?: string;
  tags: string[];
  uploadDate: string;
  size: string;
  rawSizeBytes?: number;
  publicId?: string;
  folderId?: string;
}

interface FolderItem {
  id: string;
  name: string;
}

const Media = () => {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [bulkMoveModalOpen, setBulkMoveModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [folderStack, setFolderStack] = useState<{ id: string | undefined; name: string }[]>([]);
  const [editFolder, setEditFolder] = useState<{ id: string; name: string } | null>(null);
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
  const { toast } = useToast();

  const currentFolder = folderStack.length > 0 ? folderStack[folderStack.length - 1] : null;
  const isSelectionMode = selectedMediaIds.length > 0;

  useEffect(() => {
    fetchContent();
  }, [currentFolder?.id]);

  const fetchContent = async () => {
    setLoading(true);
    await Promise.all([fetchMedia(), fetchFolders()]);
    setLoading(false);
  };

  const fetchFolders = async () => {
    try {
      const response = await api.getFolders(currentFolder?.id) as { ok: boolean; folders: any[] };
      if (response.ok) {
        setFolders(response.folders || []);
      }
    } catch (error) {
      console.error('[MEDIA_PAGE] Error fetching folders:', error);
    }
  };

  const fetchMedia = async () => {
    try {
      const response = await api.getAllMedia(currentFolder?.id) as { ok: boolean; media: any[]; total: number };

      if (response.ok && response.media) {
        const transformedMedia: MediaItem[] = response.media.map((item: any) => ({
          id: item.id || item.publicId,
          name: item.name || 'Untitled',
          type: item.type || (item.resource_type === 'video' ? 'video' : 'image'),
          url: item.url || item.secure_url,
          duration: item.duration ? formatDuration(item.duration) : undefined,
          tags: item.tags || [],
          uploadDate: item.uploadDate || item.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
          size: formatFileSize(item.size || 0),
          rawSizeBytes: Number(item.size || 0),
          publicId: item.publicId || item.id || item.public_id,
          folderId: item.folderId
        }));
        setMediaItems(transformedMedia);
      } else {
        setMediaItems([]);
      }
    } catch (error: any) {
      console.error('[MEDIA_PAGE] Error fetching media:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to load media",
        variant: "destructive",
      });
      setMediaItems([]);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleUploadSuccess = () => {
    fetchContent();
  };

  const handleCreateFolderSuccess = () => {
    fetchFolders();
  };

  const handleDelete = async (id: string, silent = false) => {
    if (silent) {
      fetchContent();
      return;
    }

    const mediaItem = mediaItems.find(item => item.id === id);
    if (!mediaItem?.publicId) {
      toast({ title: "Error", description: "Cannot delete: Missing public ID", variant: "destructive" });
      return;
    }

    try {
      await api.deleteMedia(id, mediaItem.publicId, mediaItem.type);
      toast({ title: "Success", description: "Media deleted successfully" });
      fetchMedia();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete media", variant: "destructive" });
    }
  };

  const handleRenameFolder = (id: string, name: string) => {
    setEditFolder({ id, name });
    setFolderModalOpen(true);
  };

  const handleDeleteFolder = async (id: string) => {
    try {
      await api.deleteFolder(id);
      toast({ title: "Success", description: "Folder deleted successfully" });
      fetchFolders();
      if (currentFolder) fetchMedia();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete folder", variant: "destructive" });
    }
  };

  const navigateToFolder = (id: string, name: string) => {
    setFolderStack(prev => [...prev, { id, name }]);
    setSelectedMediaIds([]);
  };

  const navigateToRoot = () => {
    setFolderStack([]);
    setSelectedMediaIds([]);
  };

  const navigateToStackIndex = (index: number) => {
    setFolderStack(prev => prev.slice(0, index + 1));
    setSelectedMediaIds([]);
  };

  const toggleSelectMedia = (id: string, selected: boolean) => {
    setSelectedMediaIds(prev => 
      selected ? [...prev, id] : prev.filter(item => item !== id)
    );
  };

  const handleSelectAll = () => {
    const allIds = filteredMedia.map(m => m.id);
    setSelectedMediaIds(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedMediaIds([]);
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${selectedMediaIds.length} assets? This action cannot be undone.`)) {
      try {
        setLoading(true);
        await api.bulkDeleteMedia(selectedMediaIds);
        toast({ title: "Success", description: `Successfully deleted ${selectedMediaIds.length} items` });
        setSelectedMediaIds([]);
        fetchContent();
      } catch (error: any) {
        toast({ title: "Error", description: error.message || "Bulk delete failed", variant: "destructive" });
        setLoading(false);
      }
    }
  };

  const handleBulkMoveSuccess = () => {
    setSelectedMediaIds([]);
    setBulkMoveModalOpen(false);
    fetchContent();
  };

  const filteredMedia = useMemo(() => {
    return mediaItems
      .filter(item => {
        const query = searchQuery.toLowerCase();
        const matchesSearch = !query ||
          item.name.toLowerCase().includes(query) ||
          (item.tags && item.tags.some(tag => tag.toLowerCase().includes(query)));
        const matchesType = filterType === "all" || item.type === filterType;
        return matchesSearch && matchesType;
      })
      .sort((a, b) => {
        if (sortBy === "newest") return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
        if (sortBy === "oldest") return new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime();
        if (sortBy === "name") return a.name.localeCompare(b.name);
        return 0;
      });
  }, [mediaItems, searchQuery, filterType, sortBy]);

  const filteredFolders = folders.filter(f => 
    !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalStorageBytes = useMemo(() => {
    return mediaItems.reduce((acc, item) => acc + (item.rawSizeBytes || 0), 0);
  }, [mediaItems]);

  const selectedStorageBytes = useMemo(() => {
    return mediaItems
      .filter(item => selectedMediaIds.includes(item.id))
      .reduce((acc, item) => acc + (item.rawSizeBytes || 0), 0);
  }, [mediaItems, selectedMediaIds]);

  const hasContent = mediaItems.length > 0 || folders.length > 0;

  if (loading && mediaItems.length === 0 && folders.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 relative min-h-screen">
      <div className="space-y-6">
        {/* Breadcrumbs & Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border overflow-x-auto whitespace-nowrap flex-1">
            <Button variant="ghost" size="sm" className="h-8 px-2 flex-shrink-0" onClick={navigateToRoot}>
              <Home className="w-4 h-4 mr-1" />
              Media Library
            </Button>
            {folderStack.map((folder, index) => (
              <div key={folder.id} className="flex items-center">
                <ChevronRight className="w-4 h-4 mx-1 flex-shrink-0" />
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 px-2 flex-shrink-0 ${index === folderStack.length - 1 ? 'font-semibold text-foreground' : ''}`}
                  onClick={() => navigateToStackIndex(index)}
                  disabled={index === folderStack.length - 1}
                >
                  {folder.name}
                </Button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-primary/10 text-primary border border-primary/20 px-3 py-2 rounded-lg shadow-sm">
              <HardDrive className="w-4 h-4 text-primary shrink-0" />
              <span>
                Total Storage: <strong className="font-mono text-foreground">{formatFileSize(totalStorageBytes)}</strong> ({mediaItems.length} items)
              </span>
            </div>

            {filteredMedia.length > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={selectedMediaIds.length === filteredMedia.length ? handleDeselectAll : handleSelectAll}
                className="whitespace-nowrap h-9"
              >
                {selectedMediaIds.length === filteredMedia.length ? (
                  <><Square className="w-4 h-4 mr-2" /> Deselect All</>
                ) : (
                  <><CheckSquare className="w-4 h-4 mr-2" /> Select All</>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1 md:max-w-xs">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="image">Images</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => { setEditFolder(null); setFolderModalOpen(true); }}>
                <FolderPlus className="mr-2 h-4 w-4" /> New Folder
              </Button>
              <Button onClick={() => setUploadModalOpen(true)}>
                <Upload className="mr-2 h-4 w-4" /> Upload Media
              </Button>
            </div>
          </div>
        </div>

        {!hasContent && !loading ? (
          <div className="py-20 text-center border-2 border-dashed rounded-xl border-muted">
            <div className="max-w-xs mx-auto space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <Search className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h2 className="text-xl font-semibold">Folder is empty</h2>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => setFolderModalOpen(true)}>Create Folder</Button>
                <Button onClick={() => setUploadModalOpen(true)}>Upload File</Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8 pb-20">
            {filteredFolders.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  Folders <span className="text-sm font-normal text-muted-foreground">({folders.length})</span>
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {filteredFolders.map((folder) => (
                    <FolderCard 
                      key={folder.id} 
                      folder={folder} 
                      onClick={navigateToFolder}
                      onRename={handleRenameFolder}
                      onDelete={handleDeleteFolder}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                Media Files <span className="text-sm font-normal text-muted-foreground">({mediaItems.length})</span>
              </h2>
              {filteredMedia.length === 0 ? (
                <div className="text-center py-12 bg-muted/10 rounded-lg">
                  <p className="text-muted-foreground">No media files found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {filteredMedia.map((media) => (
                    <MediaCard 
                      key={media.id} 
                      media={media} 
                      onDelete={handleDelete}
                      isSelected={selectedMediaIds.includes(media.id)}
                      onSelect={toggleSelectMedia}
                      isSelectionMode={isSelectionMode}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating Selection Bar */}
      {isSelectionMode && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300 w-[90%] sm:w-auto">
          <div className="bg-slate-900 dark:bg-slate-800 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-6 border border-white/10 backdrop-blur-md">
            <div className="flex items-center gap-2 pr-4 border-r border-white/20">
              <span className="font-bold text-lg">{selectedMediaIds.length}</span>
              <span className="text-sm opacity-80 hidden sm:inline">selected</span>
              <span className="text-xs font-mono bg-white/10 px-2 py-0.5 rounded-md ml-1 opacity-90">
                {formatFileSize(selectedStorageBytes)}
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white hover:bg-white/10"
                onClick={() => setBulkMoveModalOpen(true)}
              >
                <Move className="w-4 h-4 mr-2" />
                Move
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-red-400 hover:text-red-300 hover:bg-white/10"
                onClick={handleBulkDelete}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              
              <div className="h-6 w-px bg-white/20 mx-2" />
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/10 h-8 w-8"
                onClick={handleDeselectAll}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <UploadMediaModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        onUploadSuccess={handleUploadSuccess}
        folderId={currentFolder?.id}
      />

      <CreateFolderModal
        open={folderModalOpen}
        onOpenChange={setFolderModalOpen}
        onSuccess={handleCreateFolderSuccess}
        parentId={currentFolder?.id}
        editFolder={editFolder}
      />

      <MoveMediaModal
        open={bulkMoveModalOpen}
        onOpenChange={setBulkMoveModalOpen}
        mediaIds={selectedMediaIds}
        onSuccess={handleBulkMoveSuccess}
      />
    </div>
  );
};

export default Media;
