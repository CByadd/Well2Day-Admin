import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import axiosInstance from "@/lib/axios";
import { Loader2, Upload } from "lucide-react";

const DEFAULT_PACKAGE = "com.example.playerapp.f3.f1";

interface Release {
  packageName: string;
  versionCode: number;
  versionName: string;
  sha256: string;
  size: number;
  screenIds: string[];
  publishedAt: string;
}
interface Report {
  status: string;
  versionCode: number | null;
  error: string | null;
  at: string;
}
interface ScreenRow {
  screenId: string;
  deviceName: string | null;
  location: string | null;
  appVersionCode: string | null;
  lastSeen: string;
}

const AppUpdates = () => {
  const { toast } = useToast();
  const [releases, setReleases] = useState<Record<string, Release>>({});
  const [reports, setReports] = useState<Record<string, Report>>({});
  const [screens, setScreens] = useState<ScreenRow[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [packageName, setPackageName] = useState(DEFAULT_PACKAGE);
  const [versionCode, setVersionCode] = useState("");
  const [versionName, setVersionName] = useState("");
  const [screenIds, setScreenIds] = useState("");
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    try {
      const { data } = await axiosInstance.get("/api/app-releases");
      setReleases(data.releases || {});
      setReports(data.reports || {});
      setScreens(data.screens || []);
    } catch (e: any) {
      toast({ title: "Error", description: e.response?.data?.error || e.message, variant: "destructive" });
    }
  };
  useEffect(() => { load(); }, []);

  const publish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    const form = new FormData();
    form.append("packageName", packageName.trim());
    form.append("versionCode", versionCode.trim());
    form.append("versionName", versionName.trim());
    form.append("screenIds", screenIds);
    form.append("apk", file);
    setUploading(true);
    try {
      await axiosInstance.post("/api/app-releases", form, { timeout: 10 * 60 * 1000 });
      toast({ title: "Published", description: `v${versionName || versionCode} sent to ${screenIds.trim() ? "selected screens" : "all screens"}` });
      setFile(null);
      load();
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.response?.data?.error || e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const latest = releases[packageName.trim()];

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Publish app update</CardTitle>
          <CardDescription>
            Kiosks download, verify and install it on their own when idle. The APK must be signed with the shared
            release keystore and have a higher versionCode (read it with <code>aapt2 dump badging app.apk</code>).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={publish} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="apk">APK file</Label>
              <Input id="apk" type="file" accept=".apk" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pkg">Package name</Label>
              <Input id="pkg" value={packageName} required onChange={(e) => setPackageName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vc">versionCode</Label>
              <Input id="vc" type="number" min={1} required value={versionCode} onChange={(e) => setVersionCode(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vn">versionName</Label>
              <Input id="vn" placeholder="2.05" value={versionName} onChange={(e) => setVersionName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targets">Screen IDs (optional, comma separated — staged rollout)</Label>
              <Input id="targets" placeholder="All screens" value={screenIds} onChange={(e) => setScreenIds(e.target.value)} />
            </div>
            <div className="md:col-span-2 flex items-center gap-4">
              <Button type="submit" disabled={uploading || !file}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                Publish
              </Button>
              {latest && (
                <span className="text-sm text-muted-foreground">
                  Current release: v{latest.versionName} (code {latest.versionCode}) —{" "}
                  {latest.screenIds.length ? `${latest.screenIds.length} screen(s)` : "all screens"}, {new Date(latest.publishedAt).toLocaleString()}
                </span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Installed versions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Screen</TableHead>
                <TableHead>Screen ID</TableHead>
                <TableHead>versionCode</TableHead>
                <TableHead>Last update</TableHead>
                <TableHead>Last seen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {screens.map((s) => {
                const r = reports[s.screenId];
                const outdated = latest && s.appVersionCode && Number(s.appVersionCode) < latest.versionCode;
                return (
                  <TableRow key={s.screenId}>
                    <TableCell>{s.deviceName || "—"}{s.location ? ` · ${s.location}` : ""}</TableCell>
                    <TableCell className="font-mono">{s.screenId}</TableCell>
                    <TableCell className={outdated ? "text-amber-600 font-medium" : ""}>{s.appVersionCode ?? "—"}</TableCell>
                    <TableCell title={r?.error ?? ""} className={r && r.status !== "installed" ? "text-destructive" : ""}>
                      {r ? `${r.status} · ${new Date(r.at).toLocaleString()}` : "—"}
                    </TableCell>
                    <TableCell>{new Date(s.lastSeen).toLocaleString()}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AppUpdates;
