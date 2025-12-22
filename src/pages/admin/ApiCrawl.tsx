import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Database,
  RefreshCw,
  Play,
  Pause,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Settings,
  History,
  Zap,
  Server,
  Activity,
  Film,
  Calendar,
  Loader2,
} from "lucide-react";
import { fetchNewMovies, fetchMoviesByType, fetchCategories, fetchCountries } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { toast } from "sonner";

interface SyncLog {
  id: string;
  type: string;
  status: "success" | "error" | "running";
  moviesAdded: number;
  moviesUpdated: number;
  duration: string;
  timestamp: Date;
  message?: string;
}

interface ScheduleConfig {
  enabled: boolean;
  interval: string;
  lastRun: Date | null;
  nextRun: Date | null;
}

const ApiCrawl = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncType, setSyncType] = useState<string | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([
    {
      id: "1",
      type: "Phim mới cập nhật",
      status: "success",
      moviesAdded: 24,
      moviesUpdated: 156,
      duration: "2m 34s",
      timestamp: new Date(Date.now() - 3600000),
    },
    {
      id: "2",
      type: "Phim bộ",
      status: "success",
      moviesAdded: 12,
      moviesUpdated: 89,
      duration: "1m 45s",
      timestamp: new Date(Date.now() - 7200000),
    },
    {
      id: "3",
      type: "Phim lẻ",
      status: "error",
      moviesAdded: 0,
      moviesUpdated: 0,
      duration: "0m 12s",
      timestamp: new Date(Date.now() - 10800000),
      message: "API timeout - thử lại sau",
    },
  ]);

  const [schedules, setSchedules] = useState<Record<string, ScheduleConfig>>({
    newMovies: {
      enabled: true,
      interval: "30",
      lastRun: new Date(Date.now() - 1800000),
      nextRun: new Date(Date.now() + 1800000),
    },
    series: {
      enabled: true,
      interval: "60",
      lastRun: new Date(Date.now() - 3600000),
      nextRun: new Date(Date.now() + 3600000),
    },
    single: {
      enabled: false,
      interval: "120",
      lastRun: null,
      nextRun: null,
    },
    anime: {
      enabled: true,
      interval: "60",
      lastRun: new Date(Date.now() - 3600000),
      nextRun: new Date(Date.now() + 3600000),
    },
  });

  // API Status checks
  const { data: apiStatus, isLoading: checkingApi, refetch: recheckApi } = useQuery({
    queryKey: ["api-status"],
    queryFn: async () => {
      const start = Date.now();
      try {
        await fetchNewMovies(1);
        return {
          status: "online" as const,
          latency: Date.now() - start,
          lastCheck: new Date(),
        };
      } catch (error) {
        return {
          status: "offline" as const,
          latency: 0,
          lastCheck: new Date(),
        };
      }
    },
    refetchInterval: 60000,
  });

  const { data: newMovies } = useQuery({
    queryKey: ["api-new-movies"],
    queryFn: () => fetchNewMovies(1),
  });

  const { data: categories } = useQuery({
    queryKey: ["api-categories"],
    queryFn: fetchCategories,
  });

  const { data: countries } = useQuery({
    queryKey: ["api-countries"],
    queryFn: fetchCountries,
  });

  const handleSync = async (type: string) => {
    setIsSyncing(true);
    setSyncType(type);
    setSyncProgress(0);

    const newLog: SyncLog = {
      id: Date.now().toString(),
      type,
      status: "running",
      moviesAdded: 0,
      moviesUpdated: 0,
      duration: "0s",
      timestamp: new Date(),
    };

    setSyncLogs((prev) => [newLog, ...prev]);

    // Simulate sync progress
    const startTime = Date.now();
    for (let i = 0; i <= 100; i += 5) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      setSyncProgress(i);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(0);
    const moviesAdded = Math.floor(Math.random() * 20);
    const moviesUpdated = Math.floor(Math.random() * 100);

    setSyncLogs((prev) =>
      prev.map((log) =>
        log.id === newLog.id
          ? {
              ...log,
              status: "success",
              moviesAdded,
              moviesUpdated,
              duration: `${duration}s`,
            }
          : log
      )
    );

    toast.success(`Đồng bộ ${type} thành công`, {
      description: `Thêm mới ${moviesAdded} phim, cập nhật ${moviesUpdated} phim`,
    });

    setIsSyncing(false);
    setSyncType(null);
    setSyncProgress(0);
  };

  const toggleSchedule = (key: string) => {
    setSchedules((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        enabled: !prev[key].enabled,
        nextRun: !prev[key].enabled ? new Date(Date.now() + parseInt(prev[key].interval) * 60000) : null,
      },
    }));

    toast.success(
      schedules[key].enabled ? "Đã tắt lịch đồng bộ" : "Đã bật lịch đồng bộ"
    );
  };

  const updateInterval = (key: string, interval: string) => {
    setSchedules((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        interval,
        nextRun: prev[key].enabled ? new Date(Date.now() + parseInt(interval) * 60000) : null,
      },
    }));
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "—";
    return new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    }).format(date);
  };

  const syncTypes = [
    { key: "newMovies", label: "Phim mới cập nhật", icon: Film },
    { key: "series", label: "Phim bộ", icon: Play },
    { key: "single", label: "Phim lẻ", icon: Film },
    { key: "anime", label: "Hoạt hình", icon: Zap },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />

        <main className="flex-1 overflow-auto">
          {/* Header */}
          <header className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-16 items-center gap-4 px-6">
              <SidebarTrigger className="lg:hidden" />
              <div className="flex-1">
                <h1 className="text-xl font-bold">API & Crawl</h1>
                <p className="text-sm text-muted-foreground">
                  Quản lý đồng bộ phim từ KKPhim API
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => recheckApi()}
                disabled={checkingApi}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${checkingApi ? "animate-spin" : ""}`} />
                Kiểm tra API
              </Button>
            </div>
          </header>

          <div className="p-6 space-y-6">
            {/* API Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Trạng thái API</p>
                      <div className="flex items-center gap-2 mt-1">
                        {apiStatus?.status === "online" ? (
                          <>
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                            <span className="text-lg font-semibold text-green-500">Online</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-5 w-5 text-destructive" />
                            <span className="text-lg font-semibold text-destructive">Offline</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20">
                      <Server className="h-6 w-6 text-green-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Độ trễ API</p>
                      <p className="text-2xl font-bold mt-1">{apiStatus?.latency || 0}ms</p>
                    </div>
                    <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20">
                      <Activity className="h-6 w-6 text-blue-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Tổng phim API</p>
                      <p className="text-2xl font-bold mt-1">
                        {newMovies?.pagination?.totalItems?.toLocaleString() || "—"}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                      <Film className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Thể loại / Quốc gia</p>
                      <p className="text-2xl font-bold mt-1">
                        {categories?.length || 0} / {countries?.length || 0}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/20">
                      <Database className="h-6 w-6 text-purple-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sync Progress */}
            {isSyncing && (
              <Card className="border-primary/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <Loader2 className="h-6 w-6 text-primary animate-spin" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Đang đồng bộ: {syncType}</span>
                        <span className="text-sm text-muted-foreground">{syncProgress}%</span>
                      </div>
                      <Progress value={syncProgress} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Tabs defaultValue="manual" className="space-y-4">
              <TabsList>
                <TabsTrigger value="manual">Đồng bộ thủ công</TabsTrigger>
                <TabsTrigger value="schedule">Lịch tự động</TabsTrigger>
                <TabsTrigger value="history">Lịch sử</TabsTrigger>
              </TabsList>

              {/* Manual Sync */}
              <TabsContent value="manual" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {syncTypes.map(({ key, label, icon: Icon }) => (
                    <Card key={key}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{label}</CardTitle>
                            <CardDescription>
                              Đồng bộ {label.toLowerCase()} từ API
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-muted-foreground">
                            Lần cuối: {formatDate(schedules[key]?.lastRun)}
                          </div>
                          <Button
                            onClick={() => handleSync(label)}
                            disabled={isSyncing}
                            size="sm"
                          >
                            {isSyncing && syncType === label ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Đang đồng bộ
                              </>
                            ) : (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Đồng bộ ngay
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Đồng bộ tất cả</CardTitle>
                    <CardDescription>
                      Đồng bộ toàn bộ dữ liệu từ API (phim mới, phim bộ, phim lẻ, hoạt hình)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={() => handleSync("Tất cả")}
                      disabled={isSyncing}
                      className="w-full sm:w-auto"
                    >
                      {isSyncing && syncType === "Tất cả" ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Đang đồng bộ tất cả...
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 mr-2" />
                          Đồng bộ tất cả ngay
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Schedule Config */}
              <TabsContent value="schedule" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Cấu hình lịch đồng bộ tự động
                    </CardTitle>
                    <CardDescription>
                      Thiết lập thời gian đồng bộ tự động cho từng loại phim
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {syncTypes.map(({ key, label, icon: Icon }) => (
                        <div
                          key={key}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-border/50 bg-muted/20"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{label}</p>
                              <p className="text-sm text-muted-foreground">
                                {schedules[key]?.enabled
                                  ? `Tiếp theo: ${formatDate(schedules[key]?.nextRun)}`
                                  : "Đã tắt"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <Select
                              value={schedules[key]?.interval}
                              onValueChange={(value) => updateInterval(key, value)}
                              disabled={!schedules[key]?.enabled}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="15">Mỗi 15 phút</SelectItem>
                                <SelectItem value="30">Mỗi 30 phút</SelectItem>
                                <SelectItem value="60">Mỗi 1 giờ</SelectItem>
                                <SelectItem value="120">Mỗi 2 giờ</SelectItem>
                                <SelectItem value="360">Mỗi 6 giờ</SelectItem>
                                <SelectItem value="720">Mỗi 12 giờ</SelectItem>
                                <SelectItem value="1440">Mỗi ngày</SelectItem>
                              </SelectContent>
                            </Select>

                            <div className="flex items-center gap-2">
                              <Switch
                                id={`schedule-${key}`}
                                checked={schedules[key]?.enabled}
                                onCheckedChange={() => toggleSchedule(key)}
                              />
                              <Label htmlFor={`schedule-${key}`} className="text-sm">
                                {schedules[key]?.enabled ? "Bật" : "Tắt"}
                              </Label>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* History */}
              <TabsContent value="history">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Lịch sử đồng bộ
                    </CardTitle>
                    <CardDescription>
                      Xem lại các lần đồng bộ gần đây
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border/50">
                          <TableHead>Loại</TableHead>
                          <TableHead>Trạng thái</TableHead>
                          <TableHead>Thêm mới</TableHead>
                          <TableHead>Cập nhật</TableHead>
                          <TableHead>Thời gian</TableHead>
                          <TableHead>Thời điểm</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {syncLogs.map((log) => (
                          <TableRow key={log.id} className="border-border/50">
                            <TableCell className="font-medium">{log.type}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  log.status === "success"
                                    ? "default"
                                    : log.status === "error"
                                    ? "destructive"
                                    : "secondary"
                                }
                                className={
                                  log.status === "success"
                                    ? "bg-green-500/20 text-green-500 border-green-500/50"
                                    : log.status === "running"
                                    ? "bg-blue-500/20 text-blue-500 border-blue-500/50"
                                    : ""
                                }
                              >
                                {log.status === "success" && (
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                )}
                                {log.status === "error" && (
                                  <XCircle className="h-3 w-3 mr-1" />
                                )}
                                {log.status === "running" && (
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                )}
                                {log.status === "success"
                                  ? "Thành công"
                                  : log.status === "error"
                                  ? "Lỗi"
                                  : "Đang chạy"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-green-500">+{log.moviesAdded}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-blue-500">{log.moviesUpdated}</span>
                            </TableCell>
                            <TableCell>{log.duration}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatDate(log.timestamp)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default ApiCrawl;
