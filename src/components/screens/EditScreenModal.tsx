import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Upload, X, Image as ImageIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";

interface EditScreenModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  screen: {
    id: string;
    name: string;
    model: string;
    status: "online" | "offline" | "maintenance";
    location?: string;
    flowType?: string | null;
  };
  onSave: (updatedScreen: any) => void;
}

interface Playlist {
  id: string;
  name: string;
  description?: string;
}

const EditScreenModal = ({ open, onOpenChange, screen, onSave }: EditScreenModalProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { updateScreen, refreshScreens } = useData();
  const smsEnabledForAccount = user?.role !== "admin" || ((user as any)?.totalMessageLimit != null && Number((user as any).totalMessageLimit) > 0);
  const whatsappEnabledForAccount = user?.role !== "admin" || ((user as any)?.totalWhatsAppLimit != null && Number((user as any).totalWhatsAppLimit) > 0);
  const [formData, setFormData] = useState({
    name: screen.name,
    location: screen.location || "",
    playlistId: "",
    playlistStartDate: null as Date | null,
    playlistEndDate: null as Date | null,
    isActive: screen.status !== "offline",
    heightCalibration: null as number | null,
    heightCalibrationEnabled: true,
    paymentAmount: null as number | null,
    hideScreenId: false,
    hideAppMargin: false,
    smsEnabled: false,
    smsLimitPerScreen: null as number | null,
    smsSentCount: 0,
    whatsappEnabled: false,
    whatsappLimitPerScreen: null as number | null,
    whatsappSentCount: 0,
  });
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isDeletingLogo, setIsDeletingLogo] = useState(false);

  // Load playlists and current assignment when modal opens
  useEffect(() => {
    if (open) {
      loadPlaylists();
      loadCurrentPlaylist();
    } else {
      // Reset form when modal closes
      setLogoFile(null);
    }
  }, [screen, open]);

  const loadCurrentPlaylist = async () => {
    setIsLoadingData(true);
    try {
      const response = await api.getPlayer(screen.id);
      if (response.ok && response.player) {
        const player = response.player;
        setFormData({
          name: player.deviceName || screen.name,
          location: player.location || screen.location || "",
          playlistId: player.playlistId || "none",
          playlistStartDate: player.playlistStartDate ? new Date(player.playlistStartDate) : null,
          playlistEndDate: player.playlistEndDate ? new Date(player.playlistEndDate) : null,
          isActive: player.isActive !== undefined ? player.isActive : (screen.status !== "offline"),
          heightCalibration: player.heightCalibration !== null && player.heightCalibration !== undefined ? player.heightCalibration : null,
          heightCalibrationEnabled: player.heightCalibrationEnabled !== undefined ? player.heightCalibrationEnabled : true,
          paymentAmount: player.paymentAmount !== null && player.paymentAmount !== undefined ? player.paymentAmount : null,
          hideScreenId: player.hideScreenId !== undefined ? player.hideScreenId : false,
          hideAppMargin: (player as any).hideAppMargin === true,
          smsEnabled: (player as any).smsEnabled === true,
          smsLimitPerScreen: (player as any).smsLimitPerScreen != null ? Number((player as any).smsLimitPerScreen) : null,
          smsSentCount: (player as any).smsSentCount != null ? Number((player as any).smsSentCount) : 0,
          whatsappEnabled: (player as any).whatsappEnabled === true,
          whatsappLimitPerScreen: (player as any).whatsappLimitPerScreen != null ? Number((player as any).whatsappLimitPerScreen) : null,
          whatsappSentCount: (player as any).whatsappSentCount != null ? Number((player as any).whatsappSentCount) : 0,
        });
        // Load logo URL if exists
        if (player.logoUrl) {
          setLogoUrl(player.logoUrl);
          setLogoPreview(player.logoUrl);
        } else {
          setLogoUrl(null);
          setLogoPreview(null);
        }
      } else {
        // If API call fails, initialize with screen data
        setFormData({
          name: screen.name,
          location: screen.location || "",
          playlistId: "none",
          playlistStartDate: null,
          playlistEndDate: null,
          isActive: screen.status !== "offline",
          heightCalibration: null,
          heightCalibrationEnabled: true,
          paymentAmount: null,
          hideScreenId: false,
          hideAppMargin: false,
          smsEnabled: false,
          smsLimitPerScreen: null,
          smsSentCount: 0,
          whatsappEnabled: false,
          whatsappLimitPerScreen: null,
          whatsappSentCount: 0,
        });
        setLogoUrl(null);
        setLogoPreview(null);
        setLogoFile(null);
      }
    } catch (error) {
      console.error("Error loading current playlist:", error);
      // Initialize with screen data on error
      setFormData({
        name: screen.name,
        location: screen.location || "",
        playlistId: "none",
        playlistStartDate: null,
        playlistEndDate: null,
        isActive: screen.status !== "offline",
        heightCalibration: null,
        heightCalibrationEnabled: true,
        paymentAmount: null,
        hideScreenId: false,
        hideAppMargin: false,
        smsEnabled: false,
        smsLimitPerScreen: null,
        smsSentCount: 0,
        whatsappEnabled: false,
        whatsappLimitPerScreen: null,
        whatsappSentCount: 0,
      });
      setLogoUrl(null);
      setLogoPreview(null);
      setLogoFile(null);
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadPlaylists = async () => {
    setIsLoadingPlaylists(true);
    try {
      const response = await api.getAllPlaylists() as { ok: boolean; playlists: Playlist[] };
      if (response.ok && response.playlists) {
        setPlaylists(response.playlists);
      }
    } catch (error) {
      console.error("Error loading playlists:", error);
      toast({
        title: "Error",
        description: "Failed to load playlists",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPlaylists(false);
    }
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (5 MB max per file)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Logo file must be less than 5 MB",
          variant: "destructive",
        });
        return;
      }

      setLogoFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = async () => {
    if (!logoFile) {
      toast({
        title: "No file selected",
        description: "Please select a logo file to upload",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingLogo(true);
    try {
      const response = await api.uploadLogo(screen.id, logoFile);
      const uploadedLogoUrl = response?.logoUrl || response?.player?.logoUrl || null;

      if (response?.ok || uploadedLogoUrl) {
        setLogoUrl(uploadedLogoUrl);
        setLogoPreview(uploadedLogoUrl);
        setLogoFile(null);
        toast({
          title: "Success",
          description: "Logo uploaded successfully",
        });
        await refreshScreens();
      } else {
        throw new Error(response.error || 'Upload failed');
      }
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      toast({
        title: "Upload failed",
        description: error?.message || "Failed to upload logo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(logoUrl);
  };

  const handleDeleteLogo = async () => {
    if (!logoUrl) {
      return;
    }

    // Confirm deletion
    if (!confirm('Are you sure you want to delete this logo? This action cannot be undone.')) {
      return;
    }

    setIsDeletingLogo(true);
    try {
      const response = await api.deleteLogo(screen.id);
      if (response.ok) {
        setLogoUrl(null);
        setLogoPreview(null);
        setLogoFile(null);
        toast({
          title: "Success",
          description: "Logo deleted successfully",
        });
        await refreshScreens();
      } else {
        throw new Error(response.error || 'Delete failed');
      }
    } catch (error: any) {
      console.error("Error deleting logo:", error);
      toast({
        title: "Delete failed",
        description: error?.message || "Failed to delete logo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Validate date range if both dates are provided
      if (formData.playlistStartDate && formData.playlistEndDate && formData.playlistEndDate < formData.playlistStartDate) {
        toast({
          title: "Error",
          description: "End date must be after start date",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      // Upload logo first if a new file is selected
      if (logoFile) {
        await handleLogoUpload();
      }

      // Validate message limits if user is an admin
      if (user?.role === "admin") {
        const totalSmsLimit = (user as any).totalMessageLimit != null ? Number((user as any).totalMessageLimit) : 0;
        const totalWhatsAppLimit = (user as any).totalWhatsAppLimit != null ? Number((user as any).totalWhatsAppLimit) : 0;

        if (formData.smsLimitPerScreen !== null && formData.smsLimitPerScreen > totalSmsLimit) {
          toast({
            title: "Limit Exceeded",
            description: `Screen SMS limit (${formData.smsLimitPerScreen}) cannot exceed your account total limit of ${totalSmsLimit}.`,
            variant: "destructive",
          });
          setIsSaving(false);
          return;
        }

        if (formData.whatsappLimitPerScreen !== null && formData.whatsappLimitPerScreen > totalWhatsAppLimit) {
          toast({
            title: "Limit Exceeded",
            description: `Screen WhatsApp limit (${formData.whatsappLimitPerScreen}) cannot exceed your account total limit of ${totalWhatsAppLimit}.`,
            variant: "destructive",
          });
          setIsSaving(false);
          return;
        }
      }

      // Update screen configuration via API (without flowType - it's static)
      // Include playlistId and date range in the update
      const playlistIdToSend = formData.playlistId && formData.playlistId !== "none" ? formData.playlistId : null;

      const isF2 = (screen.flowType ?? "").toString().toLowerCase() === "f2";
      // Omit paymentAmount for F2 (not used); include SMS settings for all screens
      const configPayload: any = {
        deviceName: formData.name,
        location: formData.location,
        isActive: formData.isActive,
        heightCalibration: formData.heightCalibration !== null && formData.heightCalibration !== undefined ? formData.heightCalibration : 0,
        heightCalibrationEnabled: formData.heightCalibrationEnabled,
        ...(isF2 ? {} : { paymentAmount: formData.paymentAmount !== null && formData.paymentAmount !== undefined ? formData.paymentAmount : null }),
        hideScreenId: formData.hideScreenId,
        hideAppMargin: formData.hideAppMargin,
        smsEnabled: formData.smsEnabled,
        smsLimitPerScreen: formData.smsLimitPerScreen !== null && formData.smsLimitPerScreen !== undefined ? formData.smsLimitPerScreen : null,
        whatsappEnabled: formData.whatsappEnabled,
        whatsappLimitPerScreen: formData.whatsappLimitPerScreen !== null && formData.whatsappLimitPerScreen !== undefined ? formData.whatsappLimitPerScreen : null,
      };

      // Always include playlist fields - send null to clear, or values to set
      // IMPORTANT: Always send playlistId (even if null) so backend knows to process it
      configPayload.playlistId = playlistIdToSend;
      configPayload.playlistStartDate = formData.playlistStartDate ? formData.playlistStartDate.toISOString() : null;
      configPayload.playlistEndDate = formData.playlistEndDate ? formData.playlistEndDate.toISOString() : null;

      console.log("Saving screen config:", configPayload);
      console.log("SMS/WhatsApp toggles:", {
        smsEnabled: formData.smsEnabled,
        whatsappEnabled: formData.whatsappEnabled,
        smsLimitPerScreen: formData.smsLimitPerScreen,
        whatsappLimitPerScreen: formData.whatsappLimitPerScreen
      });
      console.log("Playlist assignment details:", {
        playlistId: configPayload.playlistId,
        playlistStartDate: configPayload.playlistStartDate,
        playlistEndDate: configPayload.playlistEndDate,
        hasPlaylist: !!configPayload.playlistId
      });

      const response = await api.updateScreenConfig(screen.id, configPayload);
      console.log("Screen config update response:", response);

      // Verify playlist was saved by reloading it
      if (configPayload.playlistId) {
        const verifyResponse = await api.getPlayer(screen.id);
        console.log("Verification - current playlist assignment:", verifyResponse.player?.playlistId);

        if (verifyResponse.player?.playlistId !== configPayload.playlistId) {
          console.warn("WARNING: Playlist assignment may not have saved correctly!");
          toast({
            title: "Warning",
            description: "Screen updated but playlist assignment may not have saved. Please check.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Success",
            description: "Screen and playlist assignment updated successfully",
          });
        }
      } else {
        toast({
          title: "Success",
          description: "Screen updated successfully",
        });
      }

      // Update screen in context
      const updatedScreenData = {
        ...screen,
        name: formData.name,
        location: formData.location,
        status: formData.isActive ? (screen.status === "offline" ? "online" : screen.status) : "offline",
      };
      updateScreen(screen.id, updatedScreenData);

      // Refresh to get latest data from server
      await refreshScreens();

      // Call onSave with updated data
      onSave(updatedScreenData);

      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating screen:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to update screen",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[90vw] max-w-[95vw] w-full h-[90dvh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <DialogTitle className="mb-0">Edit Screen - {screen.id}</DialogTitle>
            {(screen.flowType ?? "").toString().toLowerCase() === "f2" && (
              <Badge variant="secondary" className="text-sm px-2 py-0.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                F2 App
              </Badge>
            )}
          </div>
        </DialogHeader>
        {isLoadingData ? (
          <div className="space-y-4 py-4 overflow-y-auto overflow-x-auto flex-1">
            {/* First row: Screen Name and Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>

            {/* Second row: Height Calibration and Payment Amount */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-3 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>

            {/* Third row: Flow Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>

            {/* Playlist Selection */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>

            {/* Date Range Skeleton */}
            <div className="space-y-4 pt-2 border-t border-border">
              <Skeleton className="h-4 w-48" />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            </div>

            {/* Enable Screen Toggle */}
            <div className="flex items-center justify-between space-x-2 py-2">
              <div className="space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-11 rounded-full" />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="space-y-4 py-4 overflow-y-auto overflow-x-auto flex-1">
              {/* First row: Screen Name and Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Screen Name (Device Name)</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter screen name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Enter location"
                  />
                </div>
              </div>

              {/* Second row: Height Calibration and Payment Amount (Payment hidden for F2) */}
              <div className={`grid gap-4 ${(screen.flowType ?? "").toString().toLowerCase() === "f2" ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
                <div className="space-y-2">
                  <Label htmlFor="heightCalibration">Height Calibration (cm)</Label>
                  <Input
                    id="heightCalibration"
                    type="number"
                    step="0.1"
                    value={formData.heightCalibration ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({
                        ...formData,
                        heightCalibration: value === "" ? null : (isNaN(parseFloat(value)) ? null : parseFloat(value))
                      });
                    }}
                    placeholder="Leave empty for default (0)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Height calibration offset in cm. This value will be added/subtracted from sensor readings before BMI calculation. Use positive values to add, negative to subtract. Leave empty to use default (0).
                  </p>
                  <div className="flex items-center justify-between space-x-2 pt-2">
                    <div className="space-y-0.5">
                      <Label htmlFor="heightCalibrationEnabled" className="text-sm">Height Calibration Enabled</Label>
                      <p className="text-xs text-muted-foreground">
                        Enable height calibration validation
                      </p>
                    </div>
                    <Switch
                      id="heightCalibrationEnabled"
                      checked={formData.heightCalibrationEnabled}
                      onCheckedChange={(checked) => setFormData({ ...formData, heightCalibrationEnabled: checked })}
                    />
                  </div>
                </div>
                {(screen.flowType ?? "").toString().toLowerCase() !== "f2" && (
                  <div className="space-y-2">
                    <Label htmlFor="paymentAmount">Payment Amount (₹)</Label>
                    <Input
                      id="paymentAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.paymentAmount ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData({
                          ...formData,
                          paymentAmount: value === "" ? null : (isNaN(parseFloat(value)) ? null : parseFloat(value))
                        });
                      }}
                      placeholder="Leave empty for default (₹9)"
                    />
                    <p className="text-xs text-muted-foreground">
                      Payment amount for BMI analysis on this screen. Leave empty to use default amount (₹9).
                    </p>
                  </div>
                )}
              </div>

              {/* Logo Upload Section */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <Label>Screen Logo</Label>
                  {logoUrl && !logoFile && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteLogo}
                      disabled={isDeletingLogo}
                    >
                      {isDeletingLogo ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <X className="w-4 h-4 mr-2" />
                          Delete Logo
                        </>
                      )}
                    </Button>
                  )}
                </div>
                <div className="flex flex-col gap-4">
                  {logoPreview && (
                    <div className="relative inline-block">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="h-32 w-auto object-contain border border-border rounded-lg p-2 bg-muted"
                      />
                      {logoFile && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                          onClick={handleRemoveLogo}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileChange}
                        className="cursor-pointer"
                      />
                    </div>
                    {logoFile && (
                      <Button
                        type="button"
                        onClick={handleLogoUpload}
                        disabled={isUploadingLogo}
                      >
                        {isUploadingLogo ? (
                          <>
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Logo
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Upload a logo image for this screen. The logo will be displayed at the top of modals in the Android app. Maximum file size: 5 MB. Supported formats: JPG, PNG, GIF.
                  </p>
                </div>
              </div>

              {/* Third row: Flow Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="flowType">Flow Type</Label>
                  <Input
                    id="flowType"
                    value={screen.flowType || "Normal"}
                    disabled
                    className="bg-muted cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground">
                    Flow type is determined by the app version and cannot be changed here
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="playlist">Assign Playlist</Label>
                {isLoadingPlaylists ? (
                  <>
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </>
                ) : (
                  <>
                    <Select
                      value={formData.playlistId || "none"}
                      onValueChange={(value) => setFormData({ ...formData, playlistId: value === "none" ? "" : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a playlist" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (No playlist assigned)</SelectItem>
                        {playlists.map((playlist) => (
                          <SelectItem key={playlist.id} value={playlist.id}>
                            {playlist.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Select a playlist to assign to this screen
                    </p>
                  </>
                )}
              </div>

              {/* Date Range Configuration for Playlist */}
              {formData.playlistId && formData.playlistId !== "none" && (
                <div className="space-y-4 pt-2 border-t border-border">
                  <Label className="text-sm font-medium">Playlist Date Range (Optional)</Label>
                  <p className="text-xs text-muted-foreground">
                    Configure when this playlist should be active. Leave empty for always active.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="startDate" className="text-xs">Start Date</Label>
                        {formData.playlistStartDate && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => setFormData({ ...formData, playlistStartDate: null })}
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !formData.playlistStartDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.playlistStartDate ? (
                              format(formData.playlistStartDate, "PPP")
                            ) : (
                              <span>Pick a start date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formData.playlistStartDate || undefined}
                            onSelect={(date) => setFormData({ ...formData, playlistStartDate: date || null })}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="endDate" className="text-xs">End Date</Label>
                        {formData.playlistEndDate && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => setFormData({ ...formData, playlistEndDate: null })}
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !formData.playlistEndDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.playlistEndDate ? (
                              format(formData.playlistEndDate, "PPP")
                            ) : (
                              <span>Pick an end date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formData.playlistEndDate || undefined}
                            onSelect={(date) => setFormData({ ...formData, playlistEndDate: date || null })}
                            initialFocus
                            disabled={(date) => {
                              if (formData.playlistStartDate) {
                                return date < formData.playlistStartDate;
                              }
                              return false;
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {formData.playlistStartDate && formData.playlistEndDate && formData.playlistEndDate < formData.playlistStartDate && (
                    <p className="text-xs text-destructive">
                      End date must be after start date
                    </p>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between space-x-2 py-2">
                <div className="space-y-0.5">
                  <Label htmlFor="isActive">Enable Screen</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable or disable this screen
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>

              <div className="flex items-center justify-between space-x-2 py-2 border-t">
                <div className="space-y-0.5">
                  <Label htmlFor="hideScreenId">Hide Screen ID</Label>
                  <p className="text-sm text-muted-foreground">
                    Hide the screen ID display in the top-left corner
                  </p>
                </div>
                <Switch
                  id="hideScreenId"
                  checked={formData.hideScreenId}
                  onCheckedChange={(checked) => setFormData({ ...formData, hideScreenId: checked })}
                />
              </div>

              <div className="flex items-center justify-between space-x-2 py-2 border-t">
                <div className="space-y-0.5">
                  <Label htmlFor="hideAppMargin">Hide App Margin</Label>
                  <p className="text-sm text-muted-foreground">
                    Remove the default outer margin around the app
                  </p>
                </div>
                <Switch
                  id="hideAppMargin"
                  checked={formData.hideAppMargin}
                  onCheckedChange={(checked) => setFormData({ ...formData, hideAppMargin: checked })}
                />
              </div>

              {/* SMS after payment (for screens with payment flow) */}
              {(screen.flowType ?? "").toString().toLowerCase() !== "f2" && (
                <>
                  <div className={cn("space-y-4 pt-4 border-t-2 border-border", !smsEnabledForAccount && "opacity-60 pointer-events-none")}>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1 flex-1">
                        <Label className="text-base font-semibold flex items-center gap-2">
                          📱 SMS Messaging
                          {formData.smsEnabled && (
                            <Badge variant="default" className="text-xs">Enabled</Badge>
                          )}
                          {!formData.smsEnabled && smsEnabledForAccount && (
                            <Badge variant="secondary" className="text-xs">Disabled</Badge>
                          )}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {smsEnabledForAccount
                            ? user?.role === "super_admin"
                              ? "When enabled, an SMS is sent after payment. For screens not assigned to any admin, you can enable SMS here."
                              : "⚠️ IMPORTANT: Even though your admin account has SMS limits, you must toggle this ON for each screen to send SMS. When enabled, an SMS is sent to the user's mobile after payment. Use the limit to cap how many SMS can be sent for this screen."
                            : "SMS is disabled for your account. Ask super admin to set a total SMS limit for you."}
                        </p>
                        {!formData.smsEnabled && smsEnabledForAccount && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
                            ⚠️ SMS is currently OFF for this screen. Toggle it ON to enable SMS sending.
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Switch
                          id="smsEnabled"
                          checked={formData.smsEnabled}
                          onCheckedChange={(checked) => setFormData({ ...formData, smsEnabled: checked })}
                          disabled={!smsEnabledForAccount}
                          className="scale-125"
                        />
                        <span className="text-xs text-muted-foreground">
                          {formData.smsEnabled ? "ON" : "OFF"}
                        </span>
                      </div>
                    </div>
                    {formData.smsEnabled && (
                      <>
                        {user?.role !== "super_admin" && (
                          <div className="space-y-2">
                            <Label htmlFor="smsLimitPerScreen">Max SMS per screen</Label>
                            <Input
                              id="smsLimitPerScreen"
                              type="number"
                              min={0}
                              step={1}
                              value={formData.smsLimitPerScreen ?? ""}
                              onChange={(e) => {
                                const v = e.target.value;
                                setFormData({
                                  ...formData,
                                  smsLimitPerScreen: v === "" ? null : (parseInt(v, 10) >= 0 ? parseInt(v, 10) : formData.smsLimitPerScreen),
                                });
                              }}
                              placeholder="No limit"
                            />
                            <p className="text-xs text-muted-foreground">
                              Leave empty for no limit. Once reached, no more SMS until reset.
                            </p>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <span className="text-sm text-muted-foreground">
                            SMS sent: <strong>{formData.smsSentCount}</strong>
                            {formData.smsLimitPerScreen != null && <span className="ml-1">/ {formData.smsLimitPerScreen}</span>}
                            {user?.role === "super_admin" && formData.smsLimitPerScreen != null && (
                              <span className="ml-2 text-xs text-muted-foreground">(Limit set by admin)</span>
                            )}
                          </span>
                          {user?.role !== "super_admin" && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  const r = await api.updateScreenConfig(screen.id, { resetSmsCount: true });
                                  if (r && (r as any).ok !== false) {
                                    setFormData((f) => ({ ...f, smsSentCount: 0 }));
                                    toast({ title: "SMS count reset", description: "SMS sent count has been set to 0." });
                                    await refreshScreens();
                                    loadCurrentPlaylist();
                                  } else throw new Error((r as any)?.error || "Reset failed");
                                } catch (err: any) {
                                  toast({
                                    title: "Reset failed",
                                    description: err?.message || "Could not reset SMS count",
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              Reset SMS count
                            </Button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  <div className={cn("space-y-4 pt-4 border-t-2 border-border", !whatsappEnabledForAccount && "opacity-60 pointer-events-none")}>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1 flex-1">
                        <Label className="text-base font-semibold flex items-center gap-2">
                          💬 WhatsApp Messaging
                          {formData.whatsappEnabled && (
                            <Badge variant="default" className="text-xs">Enabled</Badge>
                          )}
                          {!formData.whatsappEnabled && whatsappEnabledForAccount && (
                            <Badge variant="secondary" className="text-xs">Disabled</Badge>
                          )}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {whatsappEnabledForAccount
                            ? user?.role === "super_admin"
                              ? "When enabled, a WhatsApp message is sent after payment. For screens not assigned to any admin, you can enable WhatsApp here."
                              : "⚠️ IMPORTANT: Even though your admin account has WhatsApp limits, you must toggle this ON for each screen to send WhatsApp. When enabled, a WhatsApp message is sent to the user's mobile after payment. Use the limit to cap how many WhatsApp messages can be sent for this screen."
                            : "WhatsApp is disabled for your account. Ask super admin to set a total WhatsApp limit for you."}
                        </p>
                        {!formData.whatsappEnabled && whatsappEnabledForAccount && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
                            ⚠️ WhatsApp is currently OFF for this screen. Toggle it ON to enable WhatsApp sending.
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Switch
                          id="whatsappEnabled"
                          checked={formData.whatsappEnabled}
                          onCheckedChange={(checked) => setFormData({ ...formData, whatsappEnabled: checked })}
                          disabled={!whatsappEnabledForAccount}
                          className="scale-125"
                        />
                        <span className="text-xs text-muted-foreground">
                          {formData.whatsappEnabled ? "ON" : "OFF"}
                        </span>
                      </div>
                    </div>
                    {formData.whatsappEnabled && (
                      <>
                        {user?.role !== "super_admin" && (
                          <div className="space-y-2">
                            <Label htmlFor="whatsappLimitPerScreen">Max WhatsApp per screen</Label>
                            <Input
                              id="whatsappLimitPerScreen"
                              type="number"
                              min={0}
                              step={1}
                              value={formData.whatsappLimitPerScreen ?? ""}
                              onChange={(e) => {
                                const v = e.target.value;
                                setFormData({
                                  ...formData,
                                  whatsappLimitPerScreen: v === "" ? null : (parseInt(v, 10) >= 0 ? parseInt(v, 10) : formData.whatsappLimitPerScreen),
                                });
                              }}
                              placeholder="No limit"
                            />
                            <p className="text-xs text-muted-foreground">
                              Leave empty for no limit. Once reached, no more WhatsApp until reset.
                            </p>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <span className="text-sm text-muted-foreground">
                            WhatsApp sent: <strong>{formData.whatsappSentCount}</strong>
                            {formData.whatsappLimitPerScreen != null && <span className="ml-1">/ {formData.whatsappLimitPerScreen}</span>}
                            {user?.role === "super_admin" && formData.whatsappLimitPerScreen != null && (
                              <span className="ml-2 text-xs text-muted-foreground">(Limit set by admin)</span>
                            )}
                          </span>
                          {user?.role !== "super_admin" && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  const r = await api.updateScreenConfig(screen.id, { resetWhatsAppCount: true });
                                  if (r && (r as any).ok !== false) {
                                    setFormData((f) => ({ ...f, whatsappSentCount: 0 }));
                                    toast({ title: "WhatsApp count reset", description: "WhatsApp sent count has been set to 0." });
                                    await refreshScreens();
                                    loadCurrentPlaylist();
                                  } else throw new Error((r as any)?.error || "Reset failed");
                                } catch (err: any) {
                                  toast({
                                    title: "Reset failed",
                                    description: err?.message || "Could not reset WhatsApp count",
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              Reset WhatsApp count
                            </Button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
            <DialogFooter className="flex-shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EditScreenModal;
