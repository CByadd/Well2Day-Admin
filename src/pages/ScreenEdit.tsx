import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Upload, X, Loader2, CalendarIcon, Users, User, Music, DollarSign, Layers, Activity, Sparkles, Scale, Film, Tv, Monitor, Smartphone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";

interface Playlist {
  id: string;
  name: string;
  description?: string;
}

const FLOW_DRAWER_WIDTH_FRACTION = 0.45;

const getFlowDrawerMetrics = (screenWidth: number, screenHeight: number, slotCount: number) => {
  const safeWidth = Math.max(1, screenWidth || 1080);
  const safeHeight = Math.max(1, screenHeight || 1920);
  const safeSlotCount = Math.max(1, slotCount || 2);
  const drawerWidth = safeWidth * FLOW_DRAWER_WIDTH_FRACTION;
  const slotHeight = safeHeight / safeSlotCount;
  const aspectRatio = drawerWidth / slotHeight;

  return {
    drawerWidth,
    slotHeight,
    aspectRatio,
    aspectRatioLabel: aspectRatio >= 1
      ? `${aspectRatio.toFixed(2)} : 1`
      : `1 : ${(1 / aspectRatio).toFixed(2)}`,
  };
};

const ScreenEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { updateScreen, refreshScreens, screens } = useData();
  const { user } = useAuth();
  const smsEnabledForAccount = user?.role !== "admin" || ((user as any)?.totalMessageLimit != null && Number((user as any).totalMessageLimit) > 0);
  const whatsappEnabledForAccount = user?.role !== "admin" || ((user as any)?.totalWhatsAppLimit != null && Number((user as any).totalWhatsAppLimit) > 0);

  // Find screen from context
  const screen = screens?.find(s => s.id === id);

  const [formData, setFormData] = useState({
    name: screen?.name || "",
    location: screen?.location || "",
    playlistId: "",
    playlistStartDate: null as Date | null,
    playlistEndDate: null as Date | null,
    isActive: screen?.status !== "offline",
    heightCalibration: null as number | null,
    heightCalibrationEnabled: true,
    paymentAmount: null as number | null,
    flowDrawerEnabled: true,
    flowDrawerSlotCount: 2,
    flowDrawerSlots: [] as Array<{ url: string | null; file: File | null; preview: string | null }>,
    hideScreenId: false,
    hideAppMargin: false,
    appMode: "F1" as string,
    smsEnabled: false,
    smsLimitPerScreen: null as number | null,
    smsSentCount: 0,
    whatsappEnabled: false,
    whatsappLimitPerScreen: null as number | null,
    whatsappSentCount: 0,
    rotation: "landscape" as string,
  });
  const isF2 = (formData.appMode ?? "").toString().toLowerCase() === "f2" || (formData.appMode ?? "").toString().toLowerCase() === "playeronly";
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isDeletingLogo, setIsDeletingLogo] = useState(false);
  const [logoUploadProgress, setLogoUploadProgress] = useState(0);
  const [uploadingSlots, setUploadingSlots] = useState<Record<number, boolean>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<number, number>>({});
  const [screenStats, setScreenStats] = useState<{
    todayUsers: number;
    totalUsers: number;
  } | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Load playlists and current assignment when component mounts
  useEffect(() => {
    if (id) {
      loadPlaylists();
      loadCurrentPlaylist();
      loadScreenStats();
    }
  }, [id]);

  const loadCurrentPlaylist = async () => {
    if (!id) return;

    setIsLoadingData(true);
    try {
      const response = await api.getPlayer(id);
      if (response.ok && response.player) {
        const player = response.player;
        // Check for slot count - use explicit check for null/undefined, not just falsy
        const slotCount = (player.flowDrawerSlotCount !== null && player.flowDrawerSlotCount !== undefined)
          ? player.flowDrawerSlotCount
          : 2;

        console.log('DEBUG: Loading player data:', {
          flowDrawerSlotCount: player.flowDrawerSlotCount,
          slotCount,
          flowDrawerImage1Url: player.flowDrawerImage1Url,
          flowDrawerImage2Url: player.flowDrawerImage2Url,
          flowDrawerImage3Url: player.flowDrawerImage3Url,
          flowDrawerImage4Url: player.flowDrawerImage4Url,
          flowDrawerImage5Url: player.flowDrawerImage5Url,
        });

        // Load from individual URL fields based on slot count
        const flowDrawerSlots: Array<{ url: string | null; file: File | null; preview: string | null }> = [];

        // Build slots array from individual URL fields
        if (slotCount >= 1) {
          flowDrawerSlots.push({
            url: player.flowDrawerImage1Url || null,
            file: null,
            preview: player.flowDrawerImage1Url || null
          });
        }
        if (slotCount >= 2) {
          flowDrawerSlots.push({
            url: player.flowDrawerImage2Url || null,
            file: null,
            preview: player.flowDrawerImage2Url || null
          });
        }
        if (slotCount >= 3) {
          flowDrawerSlots.push({
            url: player.flowDrawerImage3Url || null,
            file: null,
            preview: player.flowDrawerImage3Url || null
          });
        }
        if (slotCount >= 4) {
          flowDrawerSlots.push({
            url: player.flowDrawerImage4Url || null,
            file: null,
            preview: player.flowDrawerImage4Url || null
          });
        }
        if (slotCount >= 5) {
          flowDrawerSlots.push({
            url: player.flowDrawerImage5Url || null,
            file: null,
            preview: player.flowDrawerImage5Url || null
          });
        }

        // Ensure slots array has correct length (fill empty slots)
        while (flowDrawerSlots.length < slotCount) {
          flowDrawerSlots.push({ url: null, file: null, preview: null });
        }

        console.log('DEBUG: Loaded flow drawer slots:', flowDrawerSlots);

        setFormData({
          name: player.deviceName || screen?.name || "",
          location: player.location || screen?.location || "",
          playlistId: player.playlistId || "none",
          playlistStartDate: player.playlistStartDate ? new Date(player.playlistStartDate) : null,
          playlistEndDate: player.playlistEndDate ? new Date(player.playlistEndDate) : null,
          isActive: player.isActive !== undefined ? player.isActive : (screen?.status !== "offline"),
          heightCalibration: player.heightCalibration !== null && player.heightCalibration !== undefined ? player.heightCalibration : null,
          heightCalibrationEnabled: player.heightCalibrationEnabled !== undefined ? player.heightCalibrationEnabled : true,
          paymentAmount: player.paymentAmount !== null && player.paymentAmount !== undefined ? player.paymentAmount : null,
          flowDrawerEnabled: player.flowDrawerEnabled !== undefined ? player.flowDrawerEnabled : true,
          flowDrawerSlotCount: slotCount,
          flowDrawerSlots: flowDrawerSlots,
          hideScreenId: player.hideScreenId !== undefined ? player.hideScreenId : false,
          hideAppMargin: (player as any).hideAppMargin === true,
          appMode: (player as any).appMode || "F1",
          smsEnabled: (player as any).smsEnabled === true,
          smsLimitPerScreen: (player as any).smsLimitPerScreen != null ? Number((player as any).smsLimitPerScreen) : null,
          smsSentCount: (player as any).smsSentCount != null ? Number((player as any).smsSentCount) : 0,
          whatsappEnabled: (player as any).whatsappEnabled === true,
          whatsappLimitPerScreen: (player as any).whatsappLimitPerScreen != null ? Number((player as any).whatsappLimitPerScreen) : null,
          whatsappSentCount: (player as any).whatsappSentCount != null ? Number((player as any).whatsappSentCount) : 0,
          rotation: (player as any).rotation || "landscape",
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
          name: screen?.name || "",
          location: screen?.location || "",
          playlistId: "none",
          playlistStartDate: null,
          playlistEndDate: null,
          isActive: screen?.status !== "offline",
          heightCalibration: null,
          heightCalibrationEnabled: true,
          paymentAmount: null,
          flowDrawerEnabled: true,
          flowDrawerSlotCount: 2,
          flowDrawerSlots: [{ url: null, file: null, preview: null }, { url: null, file: null, preview: null }],
          hideScreenId: false,
          hideAppMargin: false,
          appMode: "F1",
          rotation: "landscape",
        });
        setLogoUrl(null);
        setLogoPreview(null);
        setLogoFile(null);
      }
    } catch (error) {
      console.error("Error loading current playlist:", error);
      // Initialize with screen data on error
      setFormData({
        name: screen?.name || "",
        location: screen?.location || "",
        playlistId: "none",
        playlistStartDate: null,
        playlistEndDate: null,
        isActive: screen?.status !== "offline",
        heightCalibration: null,
        heightCalibrationEnabled: true,
        paymentAmount: null,
        flowDrawerEnabled: true,
        flowDrawerSlotCount: 2,
        flowDrawerSlots: [{ url: null, file: null, preview: null }, { url: null, file: null, preview: null }],
        hideScreenId: false,
        hideAppMargin: false,
        smsEnabled: false,
        smsLimitPerScreen: null,
        smsSentCount: 0,
        whatsappEnabled: false,
        whatsappLimitPerScreen: null,
        whatsappSentCount: 0,
        rotation: "landscape",
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

  const loadScreenStats = async () => {
    if (!id) return;

    setIsLoadingStats(true);
    try {
      const response = await api.getScreenBMIRecords(id, 'all');
      if (response.ok && response.stats) {
        setScreenStats({
          todayUsers: response.stats.todayUsers || 0,
          totalUsers: response.stats.totalUsers || 0,
        });
      }
    } catch (error) {
      console.error("Error loading screen stats:", error);
    } finally {
      setIsLoadingStats(false);
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

      // Validate file size (4 MB max per file)
      if (file.size > 4 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Logo file must be less than 4 MB",
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

  const handleLogoUpload = async (fileToUpload?: File) => {
    const selectedLogoFile = fileToUpload ?? logoFile;

    if (!selectedLogoFile || !id) {
      toast({
        title: "No file selected",
        description: "Please select a logo file to upload",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingLogo(true);
    setLogoUploadProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setLogoUploadProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    try {
      const response = await api.uploadLogo(id, selectedLogoFile);
      clearInterval(progressInterval);
      setLogoUploadProgress(100);

      const uploadedLogoUrl = response?.logoUrl || response?.player?.logoUrl || null;

      if (response?.ok || uploadedLogoUrl) {
        setTimeout(() => {
          setLogoUrl(uploadedLogoUrl);
          setLogoPreview(uploadedLogoUrl);
          setLogoFile(null);
          setIsUploadingLogo(false);
          setLogoUploadProgress(0);
          toast({
            title: "Success",
            description: "Logo uploaded successfully",
          });
          refreshScreens();
        }, 300);
      } else {
        throw new Error(response.error || 'Upload failed');
      }
    } catch (error: any) {
      clearInterval(progressInterval);
      setIsUploadingLogo(false);
      setLogoUploadProgress(0);
      console.error("Error uploading logo:", error);
      toast({
        title: "Upload failed",
        description: error?.message || "Failed to upload logo. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(logoUrl);
  };

  const handleDeleteLogo = async () => {
    if (!logoUrl || !id) {
      return;
    }

    // Confirm deletion
    if (!confirm('Are you sure you want to delete this logo? This action cannot be undone.')) {
      return;
    }

    setIsDeletingLogo(true);
    try {
      const response = await api.deleteLogo(id);
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
    if (!id) return;

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

      // Update screen configuration via API (without flowType - it's static)
      // Include playlistId and date range in the update
      const playlistIdToSend = formData.playlistId && formData.playlistId !== "none" ? formData.playlistId : null;

      // Prepare date values - always send them (null if not set). Omit paymentAmount for F2 (not used).
      const configPayload: any = {
        deviceName: formData.name,
        location: formData.location,
        isActive: formData.isActive,
        heightCalibration: formData.heightCalibration !== null && formData.heightCalibration !== undefined ? formData.heightCalibration : 0,
        heightCalibrationEnabled: formData.heightCalibrationEnabled,
        ...(isF2 ? {} : { paymentAmount: formData.paymentAmount !== null && formData.paymentAmount !== undefined ? formData.paymentAmount : null }),
        flowDrawerEnabled: formData.flowDrawerEnabled,
        flowDrawerSlotCount: formData.flowDrawerSlotCount || 2,
        hideScreenId: formData.hideScreenId,
        appMode: formData.appMode || "F1",
        rotation: formData.rotation || "landscape",
        ...(isF2 ? { hideAppMargin: formData.hideAppMargin } : {}),
        smsEnabled: formData.smsEnabled,
        smsLimitPerScreen: formData.smsLimitPerScreen !== null && formData.smsLimitPerScreen !== undefined ? formData.smsLimitPerScreen : null,
        whatsappEnabled: formData.whatsappEnabled,
        whatsappLimitPerScreen: formData.whatsappLimitPerScreen !== null && formData.whatsappLimitPerScreen !== undefined ? formData.whatsappLimitPerScreen : null,
      };

      console.log('DEBUG: Saving screen config with slot count:', formData.flowDrawerSlotCount);

      // Always include playlist fields - send null to clear, or values to set
      // IMPORTANT: Always send playlistId (even if null) so backend knows to process it
      configPayload.playlistId = playlistIdToSend;
      configPayload.playlistStartDate = formData.playlistStartDate ? formData.playlistStartDate.toISOString() : null;
      configPayload.playlistEndDate = formData.playlistEndDate ? formData.playlistEndDate.toISOString() : null;

      console.log("Saving screen config:", configPayload);
      console.log("Playlist assignment details:", {
        playlistId: configPayload.playlistId,
        playlistStartDate: configPayload.playlistStartDate,
        playlistEndDate: configPayload.playlistEndDate,
        hasPlaylist: !!configPayload.playlistId
      });

      const response = await api.updateScreenConfig(id, configPayload);
      console.log("Screen config update response:", response);

      // Verify playlist was saved by reloading it
      if (configPayload.playlistId) {
        const verifyResponse = await api.getPlayer(id);
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
      if (screen) {
        const updatedScreenData = {
          ...screen,
          name: formData.name,
          location: formData.location,
          status: formData.isActive ? (screen.status === "offline" ? "online" : screen.status) : "offline",
        };
        updateScreen(id, updatedScreenData);
      }

      // Refresh to get latest data from server
      await refreshScreens();

      // Navigate back to screens list
      navigate("/screens");
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

  if (!id) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Screen ID not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="icon" onClick={() => navigate("/screens")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold">Edit Screen</h1>
              <p className="text-sm text-muted-foreground">Screen ID: {id}</p>
            </div>
            {formData.appMode === "F2" && (
              <Badge variant="secondary" className="text-sm px-3 py-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                F2 App
              </Badge>
            )}
            {formData.appMode === "PlayerOnly" && (
              <Badge variant="secondary" className="text-sm px-3 py-1 bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30">
                Player Only
              </Badge>
            )}
            {formData.appMode === "F1" && (
              <Badge variant="secondary" className="text-sm px-3 py-1 bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30">
                F1 App
              </Badge>
            )}
          </div>
        </div>

        {/* Screen Info Card */}
        {/* {!isLoadingData && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Screen Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                Today's Users
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Today's Users</p>
                    <p className="text-2xl font-bold">
                      {isLoadingStats ? <Skeleton className="h-7 w-12" /> : (screenStats?.todayUsers ?? 0)}
                    </p>
                  </div>
                </div>

                Total Users
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <User className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Total Users</p>
                    <p className="text-2xl font-bold">
                      {isLoadingStats ? <Skeleton className="h-7 w-12" /> : (screenStats?.totalUsers ?? 0)}
                    </p>
                  </div>
                </div>

                Assigned Playlist
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <Music className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Assigned Playlist</p>
                    <p className="text-lg font-semibold">
                      {formData.playlistId && formData.playlistId !== "none"
                        ? playlists.find(p => p.id === formData.playlistId)?.name || "Loading..."
                        : "None"}
                    </p>
                  </div>
                </div>

                Payment Amount
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                    <DollarSign className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Payment Amount</p>
                    <p className="text-lg font-semibold">
                      {formData.paymentAmount !== null && formData.paymentAmount !== undefined
                        ? `₹${formData.paymentAmount.toFixed(2)}`
                        : "Not Configured"}
                    </p>
                  </div>
                </div>

                Flow Drawer Status
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                    <Layers className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Flow Drawer</p>
                    <p className="text-lg font-semibold">
                      {formData.flowDrawerEnabled ? (
                        <span className="text-green-600 dark:text-green-400">Enabled</span>
                      ) : (
                        <span className="text-gray-500">Disabled</span>
                      )}
                    </p>
                  </div>
                </div>

                Screen Status
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                    <Activity className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Screen Status</p>
                    <p className="text-lg font-semibold">
                      {formData.isActive ? (
                        <span className="text-green-600 dark:text-green-400">Active</span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400">Inactive</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )} */}

        {isLoadingData ? (
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Skeleton loaders */}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>Screen Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
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



                {/* Second row: Height Calibration and Payment Amount with Logo Upload (Payment hidden for F2) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-4">
                    <div className={cn("grid gap-4", isF2 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2")}>
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

                      {!isF2 && (
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

                    {/* Hide Screen ID Toggle */}
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

                    {/* App Mode Selector */}
                    <div className="space-y-3 py-4 border-t">
                      <div>
                        <Label className="text-sm font-semibold">App Mode</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Controls how the player app behaves on this screen. Changes apply on next sync or immediately via real-time push.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                          {
                            value: "F1",
                            label: "F1 — Full Flow",
                            description: "BMI scale + payment + media player",
                            icon: Scale,
                            color: "border-blue-500 bg-blue-50 dark:bg-blue-950/40",
                            activeText: "text-blue-700 dark:text-blue-300",
                          },
                          {
                            value: "F2",
                            label: "F2 — Player + Drawer",
                            description: "Media player with flow drawer panel",
                            icon: Film,
                            color: "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40",
                            activeText: "text-emerald-700 dark:text-emerald-300",
                          },
                          {
                            value: "PlayerOnly",
                            label: "Player Only",
                            description: "Media player only, no extra UI",
                            icon: Tv,
                            color: "border-purple-500 bg-purple-50 dark:bg-purple-950/40",
                            activeText: "text-purple-700 dark:text-purple-300",
                          },
                        ].map((opt) => {
                          const IconComponent = opt.icon;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setFormData({ ...formData, appMode: opt.value })}
                              className={cn(
                                "relative flex flex-col items-start gap-1 rounded-xl border-2 p-4 text-left transition-all duration-150 hover:shadow-md",
                                formData.appMode === opt.value
                                  ? `${opt.color} shadow-sm`
                                  : "border-border bg-card hover:bg-muted/50"
                              )}
                            >
                              {formData.appMode === opt.value && (
                                <span className="absolute top-2 right-2 text-xs font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-foreground/10">
                                  Active
                                </span>
                              )}
                              <IconComponent className="h-6 w-6 mb-1" />
                              <span className={cn("text-sm font-semibold", formData.appMode === opt.value && opt.activeText)}>
                                {opt.label}
                              </span>
                              <span className="text-xs text-muted-foreground leading-snug">{opt.description}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
 
                    {/* Screen Rotation Selector */}
                    <div className="space-y-3 py-4 border-t">
                      <div>
                        <Label className="text-sm font-semibold">Screen Rotation</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Configures the hardware/display orientation of the player app. Saved persistently and applies immediately.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        {[
                          {
                            value: "landscape",
                            label: "Landscape (0°)",
                            description: "Default landscape mode",
                            icon: Monitor,
                            className: "",
                          },
                          {
                            value: "portrait",
                            label: "Portrait (90°)",
                            description: "90° clockwise rotation",
                            icon: Smartphone,
                            className: "",
                          },
                          {
                            value: "reverse_landscape",
                            label: "Landscape Reversed (180°)",
                            description: "180° upside-down landscape",
                            icon: Monitor,
                            className: "rotate-180",
                          },
                          {
                            value: "reverse_portrait",
                            label: "Portrait Reversed (270°)",
                            description: "270° counter-clockwise",
                            icon: Smartphone,
                            className: "rotate-180",
                          },
                        ].map((opt) => {
                          const IconComponent = opt.icon;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setFormData({ ...formData, rotation: opt.value })}
                              className={cn(
                                "relative flex flex-col items-start gap-1 rounded-xl border-2 p-4 text-left transition-all duration-150 hover:shadow-md",
                                formData.rotation === opt.value
                                  ? "border-primary bg-primary/5 shadow-sm"
                                  : "border-border bg-card hover:bg-muted/50"
                              )}
                            >
                              {formData.rotation === opt.value && (
                                <span className="absolute top-2 right-2 text-xs font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-foreground/10">
                                  Active
                                </span>
                              )}
                              <IconComponent className={cn("h-6 w-6 mb-1", opt.className)} />
                              <span className={cn("text-sm font-semibold", formData.rotation === opt.value && "text-primary")}>
                                {opt.label}
                              </span>
                              <span className="text-xs text-muted-foreground leading-snug">{opt.description}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {isF2 && (
                      <div className="flex items-center justify-between space-x-2 py-2 border-t">
                        <div className="space-y-0.5">
                          <Label htmlFor="hideAppMargin">Hide App Margin</Label>
                          <p className="text-sm text-muted-foreground">
                            Remove the default outer margin around the F2 app
                          </p>
                        </div>
                        <Switch
                          id="hideAppMargin"
                          checked={formData.hideAppMargin}
                          onCheckedChange={(checked) => setFormData({ ...formData, hideAppMargin: checked })}
                        />
                      </div>
                    )}

                    {/* Enable Screen Toggle */}
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

                    {/* SMS after payment (for screens with payment flow) */}
                    {!isF2 && (
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
                                      const r = await api.updateScreenConfig(id!, { resetSmsCount: true });
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
                    )}

                    {/* WhatsApp after payment (for screens with payment flow) */}
                    {!isF2 && (
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
                                      const r = await api.updateScreenConfig(id!, { resetWhatsAppCount: true });
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
                    )}

                  </div>

                  {/* Logo Upload Section - Smaller, on the right */}
                  <div className="md:col-span-1">
                    <Card className={`transition-all h-full ${isUploadingLogo ? 'ring-2 ring-primary' : ''}`}>
                      <CardContent className="p-3 space-y-2">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${logoUrl || logoFile ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                            <Label className="text-xs font-medium">Logo</Label>
                          </div>
                          {logoUrl && !logoFile && !isUploadingLogo && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={handleDeleteLogo}
                              disabled={isDeletingLogo}
                            >
                              {isDeletingLogo ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <X className="w-3 h-3" />
                              )}
                            </Button>
                          )}
                        </div>

                        {/* Logo Preview - Smaller, square */}
                        {logoPreview ? (
                          <div className="relative w-full aspect-square rounded-lg overflow-hidden border-2 border-border bg-muted/50 flex items-center justify-center">
                            <img
                              src={logoPreview}
                              alt="Logo preview"
                              className="max-w-full max-h-full object-contain p-1.5"
                            />

                            {/* Upload Progress Overlay */}
                            {isUploadingLogo && (
                              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-2 p-2">
                                <Loader2 className="w-6 h-6 animate-spin text-white" />
                                <div className="w-full space-y-1">
                                  <Progress value={logoUploadProgress} className="h-1.5" />
                                  <p className="text-white text-[10px] text-center font-medium">{logoUploadProgress}%</p>
                                </div>
                              </div>
                            )}

                            {/* Remove Selected File Button */}
                            {logoFile && !isUploadingLogo && (
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-1 right-1 h-5 w-5 rounded-full shadow-lg"
                                onClick={handleRemoveLogo}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}

                            {/* Status Badge */}
                            {logoUrl && !logoFile && !isUploadingLogo && (
                              <div className="absolute bottom-1 left-1 bg-green-500/90 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                                ✓
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="relative w-full aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30 flex flex-col items-center justify-center gap-1.5 p-2 transition-colors hover:border-primary/50 hover:bg-muted/50">
                            {isUploadingLogo ? (
                              <>
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                <div className="w-full space-y-1">
                                  <Progress value={logoUploadProgress} className="h-1.5" />
                                  <p className="text-[10px] text-center font-medium text-muted-foreground">{logoUploadProgress}%</p>
                                </div>
                              </>
                            ) : (
                              <>
                                <Upload className="w-5 h-5 text-muted-foreground" />
                                <p className="text-[10px] text-muted-foreground text-center">No logo</p>
                              </>
                            )}
                          </div>
                        )}

                        {/* File Input - Smaller */}
                        <div className="space-y-1">
                          <Input
                            type="file"
                            accept="image/*"
                            disabled={isUploadingLogo}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;

                              // Validate file type
                              if (!file.type.startsWith('image/')) {
                                toast({
                                  title: "Invalid file type",
                                  description: "Please select an image file (PNG, JPG, GIF, etc.)",
                                  variant: "destructive",
                                });
                                e.target.value = '';
                                return;
                              }

                              // Validate file size (4 MB max per file)
                              if (file.size > 4 * 1024 * 1024) {
                                toast({
                                  title: "File too large",
                                  description: `Logo must be less than 4 MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)} MB`,
                                  variant: "destructive",
                                });
                                e.target.value = '';
                                return;
                              }

                              setLogoFile(file);
                              // Create preview
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setLogoPreview(reader.result as string);
                              };
                              reader.readAsDataURL(file);

                              // Auto-upload immediately
                              if (!id) return;
                              await handleLogoUpload(file);

                              e.target.value = ''; // Reset input for re-upload
                            }}
                            className="cursor-pointer file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-xs h-8"
                          />
                          <p className="text-[10px] text-muted-foreground">
                            {logoFile ? (
                              <span className="text-primary font-bold">
                                50% Screen Width Drawer
                                {logoFile.name.length > 15 ? `${logoFile.name.substring(0, 15)}...` : logoFile.name}
                              </span>
                            ) : logoUrl ? (
                              <span className="text-green-600">Uploaded</span>
                            ) : (
                              <span>Max 4 MB</span>
                            )}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Third row: Flow Type */}
                {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="flowType">Flow Type</Label>
                    <Input
                      id="flowType"
                      value={screen?.flowType || "Normal"}
                      disabled
                      className="bg-muted cursor-not-allowed"
                    />
                    <p className="text-xs text-muted-foreground">
                      Flow type is determined by the app version and cannot be changed here
                    </p>
                  </div>
                </div> */}

                {/* Playlist Selection */}
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

                {/* Flow Drawer Toggle */}
                <div className="flex items-center justify-between space-x-2 py-2 border-t">
                  <div className="space-y-0.5">
                    <Label htmlFor="flowDrawerEnabled">Flow Drawer</Label>
                    <p className="text-sm text-muted-foreground">
                      Show a drawer from the right when a flow is active
                    </p>
                  </div>
                  <Switch
                    id="flowDrawerEnabled"
                    checked={formData.flowDrawerEnabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, flowDrawerEnabled: checked })}
                  />
                </div>

                {/* Flow Drawer Configuration */}
                {formData.flowDrawerEnabled && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label htmlFor="flowDrawerSlotCount">Flow Drawer Slot Count</Label>
                      <Select
                        value={formData.flowDrawerSlotCount.toString()}
                        onValueChange={(value) => {
                          const newSlotCount = parseInt(value);
                          const currentSlots = [...formData.flowDrawerSlots];

                          // Resize slots array
                          if (newSlotCount > currentSlots.length) {
                            // Add empty slots
                            while (currentSlots.length < newSlotCount) {
                              currentSlots.push({ url: null, file: null, preview: null });
                            }
                          } else if (newSlotCount < currentSlots.length) {
                            // Remove extra slots
                            currentSlots.splice(newSlotCount);
                          }

                          setFormData({ ...formData, flowDrawerSlotCount: newSlotCount, flowDrawerSlots: currentSlots });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select slot count" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2 Slots</SelectItem>
                          <SelectItem value="3">3 Slots</SelectItem>
                          <SelectItem value="5">5 Slots</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Select the number of image slots for the flow drawer. Each slot can have an image.
                      </p>
                      {(() => {
                        const sw = (screen as any)?.screenWidth || 1080;
                        const sh = (screen as any)?.screenHeight || 1920;
                        const isPortrait = sh > sw;
                        const metrics = getFlowDrawerMetrics(sw, sh, formData.flowDrawerSlotCount);

                        return (
                          <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/20 space-y-2">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-primary" />
                              <p className="text-xs font-semibold text-primary">
                                Optimized for: <span className="font-bold">{sw} x {sh}</span> {isPortrait ? '(Portrait)' : '(Landscape)'} screen
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Perfect Aspect Ratio</p>
                                <p className="text-sm font-bold text-foreground">
                                  {metrics.aspectRatioLabel}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Recommended Dimensions</p>
                                <p className="text-sm font-bold text-foreground">
                                  {Math.round(metrics.drawerWidth)} x {Math.round(metrics.slotHeight)} px
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Drawer Width</p>
                                <p className="text-sm font-bold text-foreground">
                                  {Math.round(FLOW_DRAWER_WIDTH_FRACTION * 100)}% of screen
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Best For</p>
                                <p className="text-sm font-bold text-foreground">
                                  Slot-matched portrait artwork
                                </p>
                              </div>
                            </div>
                            <p className="text-[10px] text-muted-foreground italic border-t pt-2">
                              * Upload each slot image in this ratio for a clean edge-to-edge fit inside the drawer.
                            </p>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Flow Drawer Images Section */}
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <Label className="text-base font-semibold">Flow Drawer Images</Label>
                        <p className="text-sm text-muted-foreground">
                          Upload images for each slot. Images will be displayed in the flow drawer when a flow is active.
                        </p>
                      </div>

                      {/* Layout: Upload fields on left, Preview on right */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Upload Fields - Takes 2 columns */}
                        <div className="lg:col-span-2">
                          {/* Flexible responsive grid that adapts to slot count and screen size */}
                          <div className="grid grid-cols-3 gap-4 auto-rows-fr">
                            {formData.flowDrawerSlots.map((slot, index) => {
                              const isUploading = uploadingSlots[index] || false;
                              const progress = uploadProgress[index] || 0;
                              const hasImage = slot.url || slot.file;

                              return (
                                <Card
                                  key={index}
                                  className={`transition-all flex flex-col h-full ${isUploading ? 'ring-2 ring-primary' : ''}`}
                                >
                                  <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
                                    {/* Header */}
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${hasImage ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                                        <div className="flex flex-col">
                                          <Label className="text-sm font-medium">Slot {index + 1}</Label>
                                          {/* <span className="text-[10px] text-muted-foreground font-mono">
                                            → flowDrawerImage{index + 1}Url
                                          </span> */}
                                        </div>
                                      </div>
                                      {slot.url && !slot.file && !isUploading && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                          onClick={async () => {
                                            if (!id) return;
                                            const imageNumber = index + 1;
                                            const dbFieldMap: Record<number, string> = {
                                              1: 'flowDrawerImage1Url',
                                              2: 'flowDrawerImage2Url',
                                              3: 'flowDrawerImage3Url',
                                              4: 'flowDrawerImage4Url',
                                              5: 'flowDrawerImage5Url'
                                            };

                                            if (!confirm(`Are you sure you want to delete the image for Slot ${index + 1} (${dbFieldMap[imageNumber]})?`)) return;

                                            try {
                                              console.log(`[Flow Drawer Delete] Slot ${index + 1} → imageNumber: ${imageNumber} → Database Field: ${dbFieldMap[imageNumber]}`);
                                              const response = await api.deleteFlowDrawerImage(id, imageNumber);
                                              if (response.ok) {
                                                console.log(`[Flow Drawer Delete] Success! Cleared ${dbFieldMap[imageNumber]}`);
                                                const newSlots = [...formData.flowDrawerSlots];
                                                newSlots[index] = { url: null, file: null, preview: null };
                                                setFormData({ ...formData, flowDrawerSlots: newSlots });
                                                toast({
                                                  title: "Success",
                                                  description: `Slot ${index + 1} image deleted from ${dbFieldMap[imageNumber]}`,
                                                });
                                                await refreshScreens();
                                              } else {
                                                throw new Error(response.error || 'Delete failed');
                                              }
                                            } catch (error: any) {
                                              toast({
                                                title: "Delete failed",
                                                description: error?.message || "Failed to delete image",
                                                variant: "destructive",
                                              });
                                            }
                                          }}
                                        >
                                          <X className="w-4 h-4" />
                                        </Button>
                                      )}
                                    </div>

                                    {/* Image Preview */}
                                    {slot.preview ? (
                                      <div 
                                        className="relative w-full rounded-lg overflow-hidden border-2 border-border bg-muted/50"
                                        style={{ 
                                          aspectRatio: (() => {
                                            const sw = (screen as any)?.screenWidth || 1080;
                                            const sh = (screen as any)?.screenHeight || 1920;
                                            return getFlowDrawerMetrics(sw, sh, formData.flowDrawerSlotCount).aspectRatio;
                                          })()
                                        }}
                                      >
                                        <img
                                          src={slot.preview}
                                          alt={`Flow drawer slot ${index + 1}`}
                                          className="w-full h-full object-cover"
                                        />

                                        {/* Upload Progress Overlay */}
                                        {isUploading && (
                                          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-4">
                                            <Loader2 className="w-8 h-8 animate-spin text-white" />
                                            <div className="w-full max-w-[200px] space-y-2">
                                              <Progress value={progress} className="h-2" />
                                              <p className="text-white text-xs text-center font-medium">{progress}%</p>
                                              <p className="text-white/80 text-xs text-center">Uploading...</p>
                                            </div>
                                          </div>
                                        )}

                                        {/* Remove Selected File Button */}
                                        {slot.file && !isUploading && (
                                          <Button
                                            type="button"
                                            variant="destructive"
                                            size="icon"
                                            className="absolute top-2 right-2 h-7 w-7 rounded-full shadow-lg"
                                            onClick={() => {
                                              const newSlots = [...formData.flowDrawerSlots];
                                              newSlots[index] = { ...newSlots[index], file: null, preview: newSlots[index].url || null };
                                              setFormData({ ...formData, flowDrawerSlots: newSlots });
                                              setUploadingSlots({ ...uploadingSlots, [index]: false });
                                              setUploadProgress({ ...uploadProgress, [index]: 0 });
                                            }}
                                          >
                                            <X className="h-4 w-4" />
                                          </Button>
                                        )}

                                        {/* Status Badge */}
                                        {slot.url && !slot.file && !isUploading && (
                                          <div className="absolute bottom-2 left-2 bg-green-500/90 text-white text-xs px-2 py-1 rounded-md font-medium">
                                            Uploaded
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div 
                                        className="relative w-full rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30 flex flex-col items-center justify-center gap-2 p-4 transition-colors hover:border-primary/50 hover:bg-muted/50"
                                        style={{ 
                                          aspectRatio: (() => {
                                            const sw = (screen as any)?.screenWidth || 1080;
                                            const sh = (screen as any)?.screenHeight || 1920;
                                            return getFlowDrawerMetrics(sw, sh, formData.flowDrawerSlotCount).aspectRatio;
                                          })()
                                        }}
                                      >
                                        {isUploading ? (
                                          <>
                                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                            <div className="w-full max-w-[200px] space-y-2">
                                              <Progress value={progress} className="h-2" />
                                              <p className="text-xs text-center font-medium text-muted-foreground">{progress}%</p>
                                            </div>
                                          </>
                                        ) : (
                                          <>
                                            <Upload className="w-8 h-8 text-muted-foreground" />
                                            <p className="text-xs text-muted-foreground text-center">No image</p>
                                          </>
                                        )}
                                      </div>
                                    )}

                                    {/* File Input */}
                                    <div className="space-y-2">
                                      <Input
                                        type="file"
                                        accept="image/*"
                                        disabled={isUploading}
                                        onChange={async (e) => {
                                          const file = e.target.files?.[0];
                                          if (!file) return;

                                          // Validate file type
                                          if (!file.type.startsWith('image/')) {
                                            toast({
                                              title: "Invalid file type",
                                              description: "Please select an image file (PNG, JPG, GIF, etc.)",
                                              variant: "destructive",
                                            });
                                            e.target.value = ''; // Reset input
                                            return;
                                          }

                                          // Validate file size (4 MB max per file)
                                          if (file.size > 4 * 1024 * 1024) {
                                            toast({
                                              title: "File too large",
                                              description: `Image must be less than 4 MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)} MB`,
                                              variant: "destructive",
                                            });
                                            e.target.value = ''; // Reset input
                                            return;
                                          }

                                          // Create preview
                                          const reader = new FileReader();
                                          reader.onloadend = () => {
                                            const newSlots = [...formData.flowDrawerSlots];
                                            newSlots[index] = { ...newSlots[index], file, preview: reader.result as string };
                                            setFormData({ ...formData, flowDrawerSlots: newSlots });
                                          };
                                          reader.readAsDataURL(file);

                                          // Auto-upload immediately
                                          if (!id) return;

                                          // Set uploading state using functional updates
                                          setUploadingSlots(prev => ({ ...prev, [index]: true }));
                                          setUploadProgress(prev => ({ ...prev, [index]: 0 }));

                                          // Simulate progress
                                          let progressInterval: NodeJS.Timeout | null = null;
                                          progressInterval = setInterval(() => {
                                            setUploadProgress(prev => ({
                                              ...prev,
                                              [index]: Math.min((prev[index] || 0) + 10, 90)
                                            }));
                                          }, 200);

                                          try {
                                            // Map slot index to database field
                                            const imageNumber = index + 1; // 1-based for API (1, 2, 3, 4, 5)
                                            const dbFieldMap: Record<number, string> = {
                                              1: 'flowDrawerImage1Url',
                                              2: 'flowDrawerImage2Url',
                                              3: 'flowDrawerImage3Url',
                                              4: 'flowDrawerImage4Url',
                                              5: 'flowDrawerImage5Url'
                                            };

                                            console.log(`[Flow Drawer Upload] Slot ${index + 1} → imageNumber: ${imageNumber} → Database Field: ${dbFieldMap[imageNumber]}`);

                                            const response = await api.uploadFlowDrawerImage(id, imageNumber, file);

                                            // Clear progress interval
                                            if (progressInterval) {
                                              clearInterval(progressInterval);
                                              progressInterval = null;
                                            }

                                            // Set progress to 100%
                                            setUploadProgress(prev => ({ ...prev, [index]: 100 }));

                                            if (response.ok) {
                                              console.log(`[Flow Drawer Upload] Success! Slot ${index + 1} saved to ${dbFieldMap[imageNumber]}`);

                                              // Update slots with new URL
                                              const newSlots = [...formData.flowDrawerSlots];
                                              newSlots[index] = {
                                                url: response.imageUrl || null,
                                                file: null,
                                                preview: response.imageUrl || null
                                              };
                                              setFormData(prev => ({ ...prev, flowDrawerSlots: newSlots }));

                                              // Clear uploading state immediately
                                              setUploadingSlots(prev => ({ ...prev, [index]: false }));
                                              setUploadProgress(prev => ({ ...prev, [index]: 0 }));

                                              toast({
                                                title: "Success",
                                                description: `Slot ${index + 1} image uploaded to ${dbFieldMap[imageNumber]}`,
                                              });

                                              refreshScreens();
                                            } else {
                                              throw new Error(response.error || 'Upload failed');
                                            }
                                          } catch (error: any) {
                                            // Clear progress interval
                                            if (progressInterval) {
                                              clearInterval(progressInterval);
                                              progressInterval = null;
                                            }

                                            // Clear uploading state immediately on error
                                            setUploadingSlots(prev => ({ ...prev, [index]: false }));
                                            setUploadProgress(prev => ({ ...prev, [index]: 0 }));

                                            // Reset slot to previous state
                                            setFormData(prev => {
                                              const newSlots = [...prev.flowDrawerSlots];
                                              newSlots[index] = {
                                                ...newSlots[index],
                                                file: null,
                                                preview: newSlots[index].url || null
                                              };
                                              return { ...prev, flowDrawerSlots: newSlots };
                                            });

                                            toast({
                                              title: "Upload failed",
                                              description: error?.message || "Failed to upload image. Please try again.",
                                              variant: "destructive",
                                            });
                                          } finally {
                                            e.target.value = ''; // Reset input for re-upload
                                          }
                                        }}
                                        className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                      />
                                      <p className="text-xs text-muted-foreground">
                                        {slot.file ? (
                                          <span className="text-primary font-medium">
                                            Selected: {slot.file.name} ({(slot.file.size / 1024).toFixed(1)} KB)
                                          </span>
                                        ) : slot.url ? (
                                          <span className="text-green-600">Image uploaded</span>
                                        ) : (
                                          <span>Max size: 4 MB • PNG, JPG, GIF</span>
                                        )}
                                      </p>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </div>

                        {/* Preview - Takes 1 column, smaller */}
                        <div className="lg:col-span-1">
                          <Card className="sticky top-4">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm font-semibold">Live Preview</CardTitle>
                              <p className="text-xs text-muted-foreground">
                                How images will appear in the flow drawer
                              </p>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {/* Portrait Screen Container (Dynamic aspect ratio based on resolution) */}
                              {(() => {
                                const sw = (screen as any)?.screenWidth || 1080;
                                const sh = (screen as any)?.screenHeight || 1920;
                                const metrics = getFlowDrawerMetrics(sw, sh, formData.flowDrawerSlotCount);
                                
                                return (
                                  <div className="relative w-full mx-auto" style={{ aspectRatio: `${sw}/${sh}`, maxWidth: '240px' }}>
                                    {/* Main Screen Background */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg border-2 border-slate-700 shadow-2xl overflow-hidden">
                                      {/* Content Area (Behind/Left of Drawer) */}
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="text-[10px] text-slate-600 text-center font-bold tracking-tighter opacity-20 uppercase">Main Playlist Area</div>
                                      </div>

                                      {/* Real Dynamic Flow Drawer - positioned on the right */}
                                      <div 
                                        className="absolute right-0 top-0 bottom-0 bg-black/90 backdrop-blur-md p-2 shadow-2xl flex flex-col gap-2"
                                        style={{ width: `${FLOW_DRAWER_WIDTH_FRACTION * 100}%` }}
                                      >
                                        {formData.flowDrawerSlots.map((slot, idx) => (
                                          <div
                                            key={idx}
                                            className="w-full rounded-md overflow-hidden bg-white/5 border border-white/10 ring-1 ring-white/5"
                                            style={{ flex: 1 }}
                                          >
                                            {slot.preview ? (
                                              <img
                                                src={slot.preview}
                                                alt={`Slot ${idx + 1}`}
                                                className="w-full h-full object-cover"
                                              />
                                            ) : (
                                              <div className="w-full h-full flex items-center justify-center text-white/20">
                                                <span className="text-[8px] font-mono">#{idx + 1}</span>
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Preview Info */}
                              <div className="space-y-2 pt-2 border-t">
                                {(() => {
                                  const sw = (screen as any)?.screenWidth || 1080;
                                  const sh = (screen as any)?.screenHeight || 1920;
                                  const metrics = getFlowDrawerMetrics(sw, sh, formData.flowDrawerSlotCount);

                                  return (
                                    <>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">Slots configured:</span>
                                  <span className="font-semibold">{formData.flowDrawerSlotCount}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">Images uploaded:</span>
                                  <span className="font-semibold text-green-600">
                                    {formData.flowDrawerSlots.filter(s => s.url || s.file).length} / {formData.flowDrawerSlotCount}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">Drawer width:</span>
                                  <span className="font-semibold">{Math.round(metrics.drawerWidth)} px</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">Per-slot target:</span>
                                  <span className="font-semibold">{Math.round(metrics.drawerWidth)} x {Math.round(metrics.slotHeight)} px</span>
                                </div>
                                <div className="rounded-md bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
                                  Recommended artwork ratio: <span className="font-semibold text-foreground">{metrics.aspectRatioLabel}</span>
                                </div>
                                    </>
                                  );
                                })()}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/screens")}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        )}
      </div>
    </div>
  );
};

export default ScreenEdit;
