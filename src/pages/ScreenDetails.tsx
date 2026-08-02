import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Activity, ArrowLeft, Edit, MapPin, Monitor, Clock, Calendar,
  Download, Search, Users, TrendingUp, CheckCircle, ImageIcon, List, Loader2, DollarSign
} from "lucide-react";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import PeakHoursChart from "@/components/screens/PeakHoursChart";
import * as XLSX from "xlsx";

interface UserLog {
  id: string;
  date: string;
  userName: string;
  mobile: string;
  weight: number;
  height: number;
  bmi: number;
  category: string;
  location: string;
  waterIntake: string | null;
  paymentStatus?: boolean;
  paymentAmount?: number | null;
}

interface ScreenData {
  id: string;
  name: string;
  model: string;
  status: "online" | "offline" | "maintenance";
  location: string;
  latitude?: number;
  longitude?: number;
  flow: string;
  screenSize: string;
  onTime: string;
  runtime: string;
  lastSync: string;
  todayUsers: number;
  totalUsers: number;
  avgBMI: number;
  nextMaintenance?: string;
}

const labelColors: Record<string, string> = {
  Normal: "bg-success/10 text-success border-success/20",
  Overweight: "bg-warning/10 text-warning border-warning/20",
  Obese: "bg-danger/10 text-danger border-danger/20",
  Underweight: "bg-info/10 text-info border-info/20",
};

const ScreenDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("today");
  const [loading, setLoading] = useState(true);
  const [screenData, setScreenData] = useState<ScreenData | null>(null);
  const [userLogs, setUserLogs] = useState<UserLog[]>([]);
  const [peakHoursData, setPeakHoursData] = useState<UserLog[]>([]);
  const [loadingPeakHours, setLoadingPeakHours] = useState(false);
  const [stats, setStats] = useState({
    todayUsers: 0,
    totalUsers: 0,
    avgBMI: 0,
    totalRevenue: 0
  });
  const [paymentAmount, setPaymentAmount] = useState<number | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    hasMore: true,
    loadingMore: false
  });
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFilters, setExportFilters] = useState({
    format: "csv" as "csv" | "excel" | "json",
    registeredUsersOnly: false,
    categories: {
      Normal: true,
      Overweight: true,
      Obese: true,
      Underweight: true,
    }
  });
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchScreenData();
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchBMIRecords();
      // Also fetch initial data for peak hours (last 7 days by default)
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      fetchAllRecordsForPeakHours(startDate, endDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, dateFilter, pagination.page, pagination.limit]);

  useEffect(() => {
    if (screenData) {
      setScreenData(prev => prev ? {
        ...prev,
        todayUsers: stats.todayUsers,
        totalUsers: stats.totalUsers,
        avgBMI: stats.avgBMI,
      } : null);
    }
  }, [stats.todayUsers, stats.totalUsers, stats.avgBMI]);

  const fetchScreenData = async () => {
    try {
      const response = await api.getPlayer(id!) as { ok: boolean; player: any };

      if (response.ok && response.player) {
        const player = response.player;
        const lastSeen = new Date(player.lastSeen);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

        // Status logic:
        // - Online: isActive && lastSeen within 5 minutes
        // - Offline: isActive && lastSeen >= 48 hours ago (system is active but hasn't been seen for 48 hours)
        // - Maintenance: !isActive (disabled) OR (isActive && lastSeen > 48 hours ago)
        let status: "online" | "offline" | "maintenance" = "offline";
        if (player.isActive && lastSeen >= fiveMinutesAgo) {
          status = "online";
        } else if (!player.isActive) {
          // System is disabled - show as maintenance
          status = "maintenance";
        } else if (lastSeen >= fortyEightHoursAgo) {
          // System is active but offline for 48+ hours - show as maintenance
          status = "maintenance";
        } else {
          // System is active but offline (between 5 minutes and 48 hours) - show as offline
          status = "offline";
        }

        // Calculate time ago
        const timeDiff = Date.now() - lastSeen.getTime();
        const minutesAgo = Math.floor(timeDiff / (1000 * 60));
        const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60));
        const daysAgo = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

        let lastSync = "";
        if (minutesAgo < 60) {
          lastSync = `${minutesAgo} ${minutesAgo === 1 ? 'min' : 'mins'} ago`;
        } else if (hoursAgo < 24) {
          lastSync = `${hoursAgo} ${hoursAgo === 1 ? 'hour' : 'hours'} ago`;
        } else {
          lastSync = `${daysAgo} ${daysAgo === 1 ? 'day' : 'days'} ago`;
        }

        const flowType = player.flowType || "Normal";
        const flowTypeLabel = flowType === "Normal" ? "Normal" : `Flow ${flowType}`;
        const model = `${flowTypeLabel} - ${player.screenWidth || 'Unknown'}x${player.screenHeight || 'Unknown'} Display`;
        const screenSize = `${player.screenWidth || 'Unknown'}x${player.screenHeight || 'Unknown'}`;

        // Parse location for coordinates if available
        let latitude: number | undefined;
        let longitude: number | undefined;
        if (player.location) {
          // Try to extract coordinates from location string if it contains them
          const coordMatch = player.location.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
          if (coordMatch) {
            latitude = parseFloat(coordMatch[1]);
            longitude = parseFloat(coordMatch[2]);
          }
        }

        setScreenData({
          id: player.screenId,
          name: player.deviceName || player.screenId,
          model,
          status,
          location: player.location || "Unknown Location",
          latitude,
          longitude,
          flow: flowTypeLabel,
          screenSize,
          onTime: "08:00 AM", // This could be calculated or stored separately
          runtime: "N/A", // This could be calculated from lastSeen
          lastSync,
          todayUsers: 0, // Will be updated from stats
          totalUsers: 0, // Will be updated from stats
          avgBMI: 0, // Will be updated from stats
        });

        // Store payment amount for displaying in user activity table
        setPaymentAmount(player.paymentAmount !== null && player.paymentAmount !== undefined ? player.paymentAmount : null);
      }
    } catch (error) {
      console.error('Error fetching screen data:', error);
      toast({
        title: "Error",
        description: "Failed to load screen data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isFetchingRef = useRef(false);
  const observerTargetRef = useRef<HTMLDivElement | null>(null);
  const paginationRef = useRef(pagination);

  useEffect(() => {
    paginationRef.current = pagination;
  }, [pagination]);

  const fetchBMIRecords = useCallback(async (loadMore = false) => {
    if (!id || isFetchingRef.current) return;

    const currentPagination = paginationRef.current;
    if (loadMore && !currentPagination.hasMore) return;

    isFetchingRef.current = true;

    try {
      const page = loadMore ? currentPagination.page + 1 : 1;
      const limit = currentPagination.limit;

      setPagination(prev => ({
        ...prev,
        loadingMore: true,
        ...(loadMore ? {} : { page: 1 })
      }));

      const response = await api.getScreenBMIRecords(
        id,
        dateFilter,
        undefined,
        undefined,
        page,
        limit
      ) as {
        ok: boolean;
        records: UserLog[];
        stats: { todayUsers: number; totalUsers: number; avgBMI: number; totalRevenue: number };
        pagination: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
          hasNextPage: boolean;
          hasPreviousPage: boolean;
        };
      };

      if (response.ok) {
        const formattedLogs = response.records.map((record) => ({
          id: record.id,
          date: record.date,
          userName: record.userName,
          mobile: record.mobile,
          weight: record.weight,
          height: record.height,
          bmi: record.bmi,
          paymentAmount: record.paymentAmount,
          paymentStatus: record.paymentStatus,
          category: record.category,
          location: record.location,
          waterIntake: record.waterIntake,
        }));

        setUserLogs(prev => loadMore ? [...prev, ...formattedLogs] : formattedLogs);
        if (response.stats) setStats(response.stats);

        setPagination({
          page: response.pagination.page,
          limit: response.pagination.limit,
          total: response.pagination.total,
          hasMore: response.pagination.hasNextPage,
          loadingMore: false
        });
      } else {
        setPagination(prev => ({ ...prev, loadingMore: false }));
      }
    } catch (error) {
      console.error('Error fetching BMI records:', error);
      toast({
        title: "Error",
        description: "Failed to load user logs",
        variant: "destructive",
      });

      setPagination(prev => ({
        ...prev,
        loadingMore: false
      }));
    } finally {
      isFetchingRef.current = false;
    }
  }, [id, dateFilter, toast]);

  // Fetch all records for peak hours analysis
  const fetchAllRecordsForPeakHours = useCallback(async (startDate?: Date, endDate?: Date) => {
    if (!id) return;

    try {
      setLoadingPeakHours(true);
      const startDateStr = startDate ? startDate.toISOString().split('T')[0] : undefined;
      const endDateStr = endDate ? endDate.toISOString().split('T')[0] : undefined;

      const response = await api.getScreenBMIRecords(
        id,
        undefined,
        startDateStr,
        endDateStr,
        1,
        10000
      ) as {
        ok: boolean;
        records: UserLog[];
      };

      if (response.ok) {
        const formattedLogs = response.records.map((record) => ({
          id: record.id,
          date: record.date,
          userName: record.userName,
          mobile: record.mobile,
          weight: record.weight,
          height: record.height,
          bmi: record.bmi,
          category: record.category,
          location: record.location,
          waterIntake: record.waterIntake,
        }));
        setPeakHoursData(formattedLogs);
      }
    } catch (error) {
      console.error('Error fetching peak hours data:', error);
    } finally {
      setLoadingPeakHours(false);
    }
  }, [id]);

  const handlePeakHoursDateRangeChange = useCallback((startDate: Date | undefined, endDate: Date | undefined) => {
    fetchAllRecordsForPeakHours(startDate, endDate);
  }, [fetchAllRecordsForPeakHours]);

  // Handle intersection observer for smooth lazy loading
  useEffect(() => {
    const target = observerTargetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingRef.current && paginationRef.current.hasMore && !paginationRef.current.loadingMore) {
          fetchBMIRecords(true);
        }
      },
      { threshold: 0.1, rootMargin: '150px' }
    );

    observer.observe(target);
    return () => {
      if (target) observer.unobserve(target);
    };
  }, [fetchBMIRecords]);

  const filteredLogs = userLogs.filter((log) =>
    log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.mobile.includes(searchQuery)
  );

  const exportToCSV = () => {
    try {
      setExporting(true);

      // Apply filters to logs
      let exportData = filteredLogs;

      // Filter out anonymous users if requested
      if (exportFilters.registeredUsersOnly) {
        exportData = exportData.filter(log => log.userName !== 'Anonymous' && log.userName !== '-');
      }

      // Filter by BMI categories
      const selectedCategories = Object.entries(exportFilters.categories)
        .filter(([_, selected]) => selected)
        .map(([category, _]) => category);

      if (selectedCategories.length > 0) {
        exportData = exportData.filter(log => selectedCategories.includes(log.category));
      }

      if (exportData.length === 0) {
        toast({
          title: "No data to export",
          description: "No records match the selected filters",
          variant: "destructive",
        });
        setExportDialogOpen(false);
        return;
      }

      // Prepare formatted data objects
      const formattedData = exportData.map((log, index) => {
        const dateTime = new Date(log.date).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          year: "numeric",
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true
        });

        return {
          '#': index + 1,
          'Date & Time': dateTime,
          'User Name': log.userName,
          'Mobile': log.mobile,
          'Weight (kg)': log.weight,
          'Height (cm)': log.height,
          'BMI': log.bmi,
          'Category': log.category,
          'Amount Paid': log.paymentStatus && log.paymentAmount !== null && log.paymentAmount !== undefined
            ? `₹${log.paymentAmount.toFixed(2)}`
            : '-',
          'Location': log.location || '-'
        };
      });

      const date = new Date().toISOString().split('T')[0];
      const screenId = id || 'screen';
      const filterSuffix = exportFilters.registeredUsersOnly ? '_registered' : '';
      const fmt = exportFilters.format || "csv";

      if (fmt === "excel") {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(formattedData);
        ws['!cols'] = [
          { wch: 5 }, { wch: 22 }, { wch: 20 }, { wch: 15 },
          { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 20 }
        ];
        XLSX.utils.book_append_sheet(wb, ws, 'UserActivity');
        const filename = `${screenId}_export_${date}${filterSuffix}.xlsx`;
        XLSX.writeFile(wb, filename);
      } else if (fmt === "json") {
        const jsonContent = JSON.stringify(formattedData, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${screenId}_export_${date}${filterSuffix}.json`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        // CSV
        const headers = Object.keys(formattedData[0]);
        const rows = formattedData.map(row =>
          headers.map(h => `"${String((row as any)[h]).replace(/"/g, '""')}"`).join(',')
        );
        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${screenId}_export_${date}${filterSuffix}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      }

      toast({
        title: "Export successful",
        description: `Exported ${exportData.length} records in ${fmt.toUpperCase()} format`,
      });

      setExportDialogOpen(false);
    } catch (error: any) {
      console.error('Error exporting data:', error);
      toast({
        title: "Export failed",
        description: error.message || "Failed to export data",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!screenData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Screen not found</p>
          <Button onClick={() => navigate("/screens")} className="mt-4">
            Back to Screens
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate("/screens")}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0">
                <Activity className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">{screenData.name}</h1>
                <p className="text-xs text-muted-foreground">{screenData.id}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="flex-1 sm:flex-none"
              >
                <span className="hidden sm:inline">Dashboard</span>
                <span className="sm:hidden">Dash</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/media")}
                className="flex-1 sm:flex-none"
              >
                <ImageIcon className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Media</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/playlists")}
                className="flex-1 sm:flex-none"
              >
                <List className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Playlists</span>
              </Button>
              {/* <Badge className={screenData.status === "online" ? "bg-success/10 text-success border-success/20" : ""}>
                <div className="w-2 h-2 rounded-full bg-success mr-2" />
                Online
              </Badge> */}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Monitoring Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.todayUsers}</p>
                <p className="text-xs text-muted-foreground">Checks Today</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-success/20 bg-gradient-to-br from-success/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.avgBMI || 0}</p>
                <p className="text-xs text-muted-foreground">Avg BMI Today</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-info/20 bg-gradient-to-br from-info/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{screenData.lastSync}</p>
                <p className="text-xs text-muted-foreground">Last Sync</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-warning/20 bg-gradient-to-br from-warning/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalUsers}</p>
                <p className="text-xs text-muted-foreground">Total BMI Checks</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Screen Information */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">Screen Information</h2>
            <Button variant="outline" size="sm" onClick={() => navigate(`/screens/${id}/edit`)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Info
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Screen Name</p>
                <p className="font-medium text-foreground">{screenData.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Screen ID</p>
                <p className="font-medium text-foreground">{screenData.id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Model Type</p>
                <p className="font-medium text-foreground">{screenData.model}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Screen Size & Resolution</p>
                <p className="font-medium text-foreground">{screenData.screenSize}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Selected Flow</p>
                <p className="font-medium text-foreground">{screenData.flow}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Location</p>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <p className="font-medium text-foreground">{screenData.location}</p>
                </div>
                {screenData.latitude && screenData.longitude && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {screenData.latitude}, {screenData.longitude}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">App Version</p>
                <p className="font-medium text-foreground">{screenData.flow}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Last Sync</p>
                <p className="font-medium text-foreground">{screenData.lastSync}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Peak Hours Chart */}
        <PeakHoursChart
          userLogs={peakHoursData.length > 0 ? peakHoursData : userLogs}
          loading={loadingPeakHours}
          onDateRangeChange={handlePeakHoursDateRangeChange}
        />

        {/* User Logs Section */}
        <Card className="p-4 sm:p-6">
          <div className="space-y-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">User Activity Logs</h2>
                  <p className="text-sm text-muted-foreground">Complete measurement history for this screen</p>
                </div>
                {stats.totalRevenue > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Collected Revenue </p>
                      <p className="text-xl font-bold text-green-600 dark:text-green-400">
                        ₹{stats.totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <Calendar className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">Last 30 Days</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => setExportDialogOpen(true)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Export CSV</span>
                  <span className="sm:hidden">Export</span>
                </Button>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or mobile..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Date & Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">User Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Mobile</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Weight (kg)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Height (cm)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">BMI</th>
                    {/* <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Water Intake</th> */}
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Amount Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-foreground">
                        {new Date(log.date).toLocaleString("en-IN", {
                          timeZone: "Asia/Kolkata",
                          year: "numeric",
                          month: "short",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          hour12: true
                        })}
                      </td>

                      <td className="px-4 py-3 text-sm font-medium text-foreground">{log.userName}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{log.mobile}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{log.weight}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{log.height}</td>
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{log.bmi}</td>
                      {/* <td className="px-4 py-3 text-sm text-foreground">{log.waterIntake || '-'}</td> */}
                      <td className="px-4 py-3">
                        <Badge className={labelColors[log.category] || labelColors.Normal}>{log.category}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-foreground">
                        {log.paymentStatus && log.paymentAmount !== null && log.paymentAmount !== undefined ? (
                          `₹${log.paymentAmount.toFixed(2)}`
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredLogs.length === 0 && (
              <div className="text-center py-12">
                <Monitor className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No user logs found</p>
              </div>
            )}

            {pagination.loadingMore && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}

            {!pagination.loadingMore && !pagination.hasMore && userLogs.length > 0 && (
              <div className="text-center py-4 text-muted-foreground">
                No more records to load
              </div>
            )}

            <div ref={observerTargetRef} className="h-4 w-full" />

          </div>
        </Card>
      </main>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Export Options</DialogTitle>
            <DialogDescription>
              Choose filters for exporting user activity data
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* File Format Selector */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">File Format</Label>
              <Select
                value={exportFilters.format}
                onValueChange={(val: "csv" | "excel" | "json") =>
                  setExportFilters(prev => ({ ...prev, format: val }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">Comma Separated (.csv)</SelectItem>
                  <SelectItem value="excel">Excel Sheet (.xlsx)</SelectItem>
                  <SelectItem value="json">JSON Format (.json)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Registered Users Only Filter */}
            <div className="flex items-start space-x-3">
              <Checkbox
                id="registered-users-only"
                checked={exportFilters.registeredUsersOnly}
                onCheckedChange={(checked) =>
                  setExportFilters(prev => ({
                    ...prev,
                    registeredUsersOnly: checked === true
                  }))
                }
              />
              <div className="space-y-1 leading-none">
                <label
                  htmlFor="registered-users-only"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Registered Users Only
                </label>
                <p className="text-sm text-muted-foreground">
                  Exclude anonymous users from the export
                </p>
              </div>
            </div>

            {/* BMI Category Filters */}
            <div className="space-y-3">
              <label className="text-sm font-medium">BMI Categories</label>
              <div className="space-y-3">
                {['Normal', 'Overweight', 'Obese', 'Underweight'].map((category) => (
                  <div key={category} className="flex items-center space-x-3">
                    <Checkbox
                      id={`category-${category}`}
                      checked={exportFilters.categories[category as keyof typeof exportFilters.categories]}
                      onCheckedChange={(checked) =>
                        setExportFilters(prev => ({
                          ...prev,
                          categories: {
                            ...prev.categories,
                            [category]: checked === true
                          }
                        }))
                      }
                    />
                    <label
                      htmlFor={`category-${category}`}
                      className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                    >
                      <Badge className={labelColors[category] || labelColors.Normal}>
                        {category}
                      </Badge>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExportDialogOpen(false)}
              disabled={exporting}
            >
              Cancel
            </Button>
            <Button
              onClick={exportToCSV}
              disabled={exporting || Object.values(exportFilters.categories).every(v => !v)}
            >
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScreenDetails;
