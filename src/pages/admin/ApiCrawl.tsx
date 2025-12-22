import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Database,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Server,
  Activity,
  Film,
  Loader2,
  Link as LinkIcon,
  FileText,
  Settings2,
  Image as ImageIcon,
  Download,
  AlertCircle,
} from "lucide-react";
import { fetchNewMovies, fetchMovieDetail, fetchCategories, fetchCountries } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface CrawlLog {
  id: string;
  type: string;
  status: string;
  movies_added: number;
  movies_updated: number;
  duration: string | null;
  message: string | null;
  created_at: string;
}

const ApiCrawl = () => {
  const queryClient = useQueryClient();
  
  // Crawl state
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlProgress, setCrawlProgress] = useState(0);
  const [crawlMessage, setCrawlMessage] = useState("");
  
  // Crawl by page range
  const [pageFrom, setPageFrom] = useState("1");
  const [pageTo, setPageTo] = useState("1");
  
  // Single movie crawl
  const [singleMovieUrl, setSingleMovieUrl] = useState("");
  
  // Bulk crawl
  const [bulkUrls, setBulkUrls] = useState("");
  
  // Skip options
  const [skipFormat, setSkipFormat] = useState(false);
  const [skipGenre, setSkipGenre] = useState(false);
  const [skipCountry, setSkipCountry] = useState(false);
  
  // Image options
  const [downloadThumb, setDownloadThumb] = useState(false);
  const [thumbWidth, setThumbWidth] = useState("300");
  const [downloadPoster, setDownloadPoster] = useState(false);
  const [posterWidth, setPosterWidth] = useState("400");
  const [saveAsWebp, setSaveAsWebp] = useState(false);

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

  // Crawl logs from database
  const { data: crawlLogs, isLoading: loadingLogs } = useQuery({
    queryKey: ["crawl-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crawl_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as CrawlLog[];
    },
  });

  // Helper function to create slug
  const createSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  // Main crawl function
  const crawlMovie = async (movieSlug: string) => {
    try {
      const movieData = await fetchMovieDetail(movieSlug);
      if (!movieData || !movieData.movie) {
        return { success: false, message: `Không tìm thấy phim: ${movieSlug}` };
      }

      const movie = movieData.movie;
      
      // Check if movie exists
      const { data: existingMovie } = await supabase
        .from("movies")
        .select("id")
        .eq("slug", movie.slug)
        .maybeSingle();

      let movieId: string;

      if (existingMovie) {
        // Update existing movie
        const { error: updateError } = await supabase
          .from("movies")
          .update({
            name: movie.name,
            origin_name: movie.origin_name,
            content: movie.content,
            type: movie.type,
            status: movie.status,
            poster_url: saveAsWebp ? null : movie.poster_url,
            thumb_url: saveAsWebp ? null : movie.thumb_url,
            trailer_url: movie.trailer_url,
            time: movie.time,
            episode_current: movie.episode_current,
            episode_total: movie.episode_total,
            quality: movie.quality,
            lang: movie.lang,
            year: movie.year,
          })
          .eq("id", existingMovie.id);

        if (updateError) throw updateError;
        movieId = existingMovie.id;
        
        return { success: true, updated: true, movieId };
      } else {
        // Insert new movie
        const { data: newMovie, error: insertError } = await supabase
          .from("movies")
          .insert({
            name: movie.name,
            slug: movie.slug,
            origin_name: movie.origin_name,
            content: movie.content,
            type: movie.type,
            status: movie.status,
            poster_url: saveAsWebp ? null : movie.poster_url,
            thumb_url: saveAsWebp ? null : movie.thumb_url,
            trailer_url: movie.trailer_url,
            time: movie.time,
            episode_current: movie.episode_current,
            episode_total: movie.episode_total,
            quality: movie.quality,
            lang: movie.lang,
            year: movie.year,
          })
          .select("id")
          .single();

        if (insertError) throw insertError;
        movieId = newMovie.id;
      }

      // Process genres
      if (!skipGenre && movie.category && movie.category.length > 0) {
        for (const cat of movie.category) {
          // Upsert genre
          const { data: genre } = await supabase
            .from("genres")
            .upsert({ name: cat.name, slug: cat.slug }, { onConflict: "slug" })
            .select("id")
            .single();
          
          if (genre) {
            await supabase
              .from("movie_genres")
              .upsert({ movie_id: movieId, genre_id: genre.id }, { onConflict: "movie_id,genre_id" });
          }
        }
      }

      // Process countries
      if (!skipCountry && movie.country && movie.country.length > 0) {
        for (const c of movie.country) {
          const { data: country } = await supabase
            .from("countries")
            .upsert({ name: c.name, slug: c.slug }, { onConflict: "slug" })
            .select("id")
            .single();
          
          if (country) {
            await supabase
              .from("movie_countries")
              .upsert({ movie_id: movieId, country_id: country.id }, { onConflict: "movie_id,country_id" });
          }
        }
      }

      // Process year
      if (movie.year) {
        await supabase
          .from("years")
          .upsert({ year: movie.year }, { onConflict: "year" });
      }

      // Process directors
      if (movie.director && movie.director.length > 0) {
        for (const dirName of movie.director) {
          if (dirName && dirName.trim()) {
            const slug = createSlug(dirName);
            const { data: director } = await supabase
              .from("directors")
              .upsert({ name: dirName, slug }, { onConflict: "slug" })
              .select("id")
              .single();
            
            if (director) {
              await supabase
                .from("movie_directors")
                .upsert({ movie_id: movieId, director_id: director.id }, { onConflict: "movie_id,director_id" });
            }
          }
        }
      }

      // Process actors
      if (movie.actor && movie.actor.length > 0) {
        for (const actorName of movie.actor) {
          if (actorName && actorName.trim()) {
            const slug = createSlug(actorName);
            const { data: actor } = await supabase
              .from("actors")
              .upsert({ name: actorName, slug }, { onConflict: "slug" })
              .select("id")
              .single();
            
            if (actor) {
              await supabase
                .from("movie_actors")
                .upsert({ movie_id: movieId, actor_id: actor.id }, { onConflict: "movie_id,actor_id" });
            }
          }
        }
      }

      // Process episodes
      if (movieData.episodes && movieData.episodes.length > 0) {
        // Delete existing episodes first
        await supabase.from("episodes").delete().eq("movie_id", movieId);
        
        for (const server of movieData.episodes) {
          for (const ep of server.server_data) {
            await supabase.from("episodes").insert({
              movie_id: movieId,
              server_name: server.server_name,
              name: ep.name,
              slug: ep.slug,
              filename: ep.filename,
              link_embed: ep.link_embed,
              link_m3u8: ep.link_m3u8,
            });
          }
        }
      }

      return { success: true, updated: !!existingMovie, movieId };
    } catch (error: any) {
      console.error("Error crawling movie:", error);
      return { success: false, message: error.message };
    }
  };

  // Crawl by page range
  const handleCrawlByPage = async () => {
    const from = parseInt(pageFrom);
    const to = parseInt(pageTo);
    
    if (isNaN(from) || isNaN(to) || from < 1 || to < from) {
      toast.error("Vui lòng nhập khoảng trang hợp lệ");
      return;
    }

    setIsCrawling(true);
    setCrawlProgress(0);
    setCrawlMessage("Đang bắt đầu crawl...");
    
    const startTime = Date.now();
    let added = 0;
    let updated = 0;
    let failed = 0;
    const totalPages = to - from + 1;

    try {
      // Create log entry
      const { data: logEntry } = await supabase
        .from("crawl_logs")
        .insert({
          type: `Crawl trang ${from} -> ${to}`,
          status: "running",
        })
        .select()
        .single();

      for (let page = from; page <= to; page++) {
        setCrawlMessage(`Đang lấy danh sách phim trang ${page}/${to}...`);
        
        const moviesData = await fetchNewMovies(page);
        if (!moviesData || !moviesData.items) continue;

        const movies = moviesData.items;
        const totalMovies = movies.length;

        for (let i = 0; i < totalMovies; i++) {
          const movie = movies[i];
          setCrawlMessage(`Trang ${page}: Đang crawl ${i + 1}/${totalMovies} - ${movie.name}`);
          
          const result = await crawlMovie(movie.slug);
          if (result.success) {
            if (result.updated) updated++;
            else added++;
          } else {
            failed++;
          }

          // Update progress
          const pageProgress = ((page - from) / totalPages) * 100;
          const movieProgress = ((i + 1) / totalMovies) * (100 / totalPages);
          setCrawlProgress(Math.min(pageProgress + movieProgress, 100));
        }
      }

      const duration = Math.round((Date.now() - startTime) / 1000);
      
      // Update log entry
      if (logEntry) {
        await supabase
          .from("crawl_logs")
          .update({
            status: "success",
            movies_added: added,
            movies_updated: updated,
            duration: `${duration}s`,
            message: failed > 0 ? `${failed} phim lỗi` : null,
          })
          .eq("id", logEntry.id);
      }

      toast.success(`Hoàn tất! Thêm mới: ${added}, Cập nhật: ${updated}${failed > 0 ? `, Lỗi: ${failed}` : ""}`);
      queryClient.invalidateQueries({ queryKey: ["crawl-logs"] });
      queryClient.invalidateQueries({ queryKey: ["admin-db-movies"] });
      queryClient.invalidateQueries({ queryKey: ["admin-movies-count"] });
    } catch (error: any) {
      toast.error("Lỗi khi crawl: " + error.message);
    } finally {
      setIsCrawling(false);
      setCrawlProgress(0);
      setCrawlMessage("");
    }
  };

  // Crawl single movie
  const handleCrawlSingle = async () => {
    if (!singleMovieUrl.trim()) {
      toast.error("Vui lòng nhập URL phim");
      return;
    }

    // Extract slug from URL
    const match = singleMovieUrl.match(/phim\/([^\/\?]+)/);
    if (!match) {
      toast.error("URL không hợp lệ. Ví dụ: https://phimapi.com/phim/ten-phim");
      return;
    }

    const slug = match[1];
    setIsCrawling(true);
    setCrawlProgress(50);
    setCrawlMessage(`Đang crawl phim: ${slug}...`);

    const startTime = Date.now();

    try {
      const result = await crawlMovie(slug);
      const duration = Math.round((Date.now() - startTime) / 1000);

      // Create log entry
      await supabase.from("crawl_logs").insert({
        type: `Crawl phim: ${slug}`,
        status: result.success ? "success" : "error",
        movies_added: result.success && !result.updated ? 1 : 0,
        movies_updated: result.success && result.updated ? 1 : 0,
        duration: `${duration}s`,
        message: result.message,
      });

      if (result.success) {
        toast.success(result.updated ? "Đã cập nhật phim!" : "Đã thêm phim mới!");
        setSingleMovieUrl("");
      } else {
        toast.error(result.message || "Lỗi khi crawl phim");
      }
      
      queryClient.invalidateQueries({ queryKey: ["crawl-logs"] });
      queryClient.invalidateQueries({ queryKey: ["admin-db-movies"] });
    } catch (error: any) {
      toast.error("Lỗi: " + error.message);
    } finally {
      setIsCrawling(false);
      setCrawlProgress(0);
      setCrawlMessage("");
    }
  };

  // Crawl bulk URLs
  const handleCrawlBulk = async () => {
    const urls = bulkUrls.split("\n").map(u => u.trim()).filter(u => u);
    if (urls.length === 0) {
      toast.error("Vui lòng nhập ít nhất một URL");
      return;
    }

    setIsCrawling(true);
    setCrawlProgress(0);
    setCrawlMessage("Đang bắt đầu crawl hàng loạt...");

    const startTime = Date.now();
    let added = 0;
    let updated = 0;
    let failed = 0;

    try {
      const { data: logEntry } = await supabase
        .from("crawl_logs")
        .insert({
          type: `Crawl hàng loạt (${urls.length} phim)`,
          status: "running",
        })
        .select()
        .single();

      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        const match = url.match(/phim\/([^\/\?]+)/);
        
        if (!match) {
          failed++;
          continue;
        }

        const slug = match[1];
        setCrawlMessage(`Đang crawl ${i + 1}/${urls.length}: ${slug}`);
        setCrawlProgress(((i + 1) / urls.length) * 100);

        const result = await crawlMovie(slug);
        if (result.success) {
          if (result.updated) updated++;
          else added++;
        } else {
          failed++;
        }
      }

      const duration = Math.round((Date.now() - startTime) / 1000);

      if (logEntry) {
        await supabase
          .from("crawl_logs")
          .update({
            status: "success",
            movies_added: added,
            movies_updated: updated,
            duration: `${duration}s`,
            message: failed > 0 ? `${failed} phim lỗi` : null,
          })
          .eq("id", logEntry.id);
      }

      toast.success(`Hoàn tất! Thêm mới: ${added}, Cập nhật: ${updated}${failed > 0 ? `, Lỗi: ${failed}` : ""}`);
      setBulkUrls("");
      queryClient.invalidateQueries({ queryKey: ["crawl-logs"] });
      queryClient.invalidateQueries({ queryKey: ["admin-db-movies"] });
    } catch (error: any) {
      toast.error("Lỗi: " + error.message);
    } finally {
      setIsCrawling(false);
      setCrawlProgress(0);
      setCrawlMessage("");
    }
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(dateString));
  };

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
                <h1 className="text-xl font-bold">Crawl Phim</h1>
                <p className="text-sm text-muted-foreground">
                  Crawl phim từ PhimAPI
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

            {/* Crawl Progress */}
            {isCrawling && (
              <Card className="border-primary/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <Loader2 className="h-6 w-6 text-primary animate-spin" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{crawlMessage}</span>
                        <span className="text-sm text-muted-foreground">{Math.round(crawlProgress)}%</span>
                      </div>
                      <Progress value={crawlProgress} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Crawl Options */}
              <div className="lg:col-span-2 space-y-6">
                {/* Crawl by Page */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Crawl theo trang
                    </CardTitle>
                    <CardDescription>
                      Crawl phim từ danh sách phim mới cập nhật theo trang
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Label htmlFor="pageFrom">Từ trang</Label>
                        <Input
                          id="pageFrom"
                          type="number"
                          min="1"
                          value={pageFrom}
                          onChange={(e) => setPageFrom(e.target.value)}
                          placeholder="1"
                          disabled={isCrawling}
                        />
                      </div>
                      <div className="flex items-center pt-6">
                        <span className="text-muted-foreground">→</span>
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="pageTo">Đến trang</Label>
                        <Input
                          id="pageTo"
                          type="number"
                          min="1"
                          value={pageTo}
                          onChange={(e) => setPageTo(e.target.value)}
                          placeholder="3"
                          disabled={isCrawling}
                        />
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Ví dụ: 1→3 sẽ crawl trang 1, 2, 3 (mỗi trang ~24 phim)
                    </p>
                    <Button 
                      onClick={handleCrawlByPage} 
                      disabled={isCrawling}
                      className="w-full"
                    >
                      {isCrawling ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Đang crawl...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Crawl theo trang
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Single Movie Crawl */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <LinkIcon className="h-5 w-5" />
                      Crawl phim cụ thể
                    </CardTitle>
                    <CardDescription>
                      Nhập URL phim để crawl một phim cụ thể
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="singleUrl">URL phim</Label>
                      <Input
                        id="singleUrl"
                        value={singleMovieUrl}
                        onChange={(e) => setSingleMovieUrl(e.target.value)}
                        placeholder="https://phimapi.com/phim/avatar-lua-va-tro-tan"
                        disabled={isCrawling}
                      />
                    </div>
                    <Button 
                      onClick={handleCrawlSingle} 
                      disabled={isCrawling || !singleMovieUrl.trim()}
                      className="w-full"
                    >
                      {isCrawling ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Đang crawl...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Crawl phim
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Bulk Crawl */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      Crawl hàng loạt
                    </CardTitle>
                    <CardDescription>
                      Paste nhiều URL phim (mỗi URL một dòng) để crawl hàng loạt
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="bulkUrls">Danh sách URL</Label>
                      <Textarea
                        id="bulkUrls"
                        value={bulkUrls}
                        onChange={(e) => setBulkUrls(e.target.value)}
                        placeholder={`https://phimapi.com/phim/avatar-lua-va-tro-tan\nhttps://phimapi.com/phim/oppenheimer\nhttps://phimapi.com/phim/dune-2`}
                        rows={5}
                        disabled={isCrawling}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {bulkUrls.split("\n").filter(u => u.trim()).length} URL được nhập
                    </p>
                    <Button 
                      onClick={handleCrawlBulk} 
                      disabled={isCrawling || !bulkUrls.trim()}
                      className="w-full"
                    >
                      {isCrawling ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Đang crawl...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Crawl hàng loạt
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Options Sidebar */}
              <div className="space-y-6">
                {/* Skip Options */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings2 className="h-5 w-5" />
                      Tùy chọn bỏ qua
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="skipFormat" className="cursor-pointer">Bỏ qua định dạng</Label>
                      <Switch
                        id="skipFormat"
                        checked={skipFormat}
                        onCheckedChange={setSkipFormat}
                        disabled={isCrawling}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="skipGenre" className="cursor-pointer">Bỏ qua thể loại</Label>
                      <Switch
                        id="skipGenre"
                        checked={skipGenre}
                        onCheckedChange={setSkipGenre}
                        disabled={isCrawling}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="skipCountry" className="cursor-pointer">Bỏ qua quốc gia</Label>
                      <Switch
                        id="skipCountry"
                        checked={skipCountry}
                        onCheckedChange={setSkipCountry}
                        disabled={isCrawling}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Image Options */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ImageIcon className="h-5 w-5" />
                      Tùy chọn hình ảnh
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="downloadThumb" className="cursor-pointer">Tải & Resize Thumb</Label>
                        <Switch
                          id="downloadThumb"
                          checked={downloadThumb}
                          onCheckedChange={setDownloadThumb}
                          disabled={isCrawling}
                        />
                      </div>
                      {downloadThumb && (
                        <div className="flex items-center gap-2 pl-4">
                          <Label htmlFor="thumbWidth" className="text-sm whitespace-nowrap">Width (px):</Label>
                          <Input
                            id="thumbWidth"
                            type="number"
                            value={thumbWidth}
                            onChange={(e) => setThumbWidth(e.target.value)}
                            className="w-24"
                            disabled={isCrawling}
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="downloadPoster" className="cursor-pointer">Tải & Resize Poster</Label>
                        <Switch
                          id="downloadPoster"
                          checked={downloadPoster}
                          onCheckedChange={setDownloadPoster}
                          disabled={isCrawling}
                        />
                      </div>
                      {downloadPoster && (
                        <div className="flex items-center gap-2 pl-4">
                          <Label htmlFor="posterWidth" className="text-sm whitespace-nowrap">Width (px):</Label>
                          <Input
                            id="posterWidth"
                            type="number"
                            value={posterWidth}
                            onChange={(e) => setPosterWidth(e.target.value)}
                            className="w-24"
                            disabled={isCrawling}
                          />
                        </div>
                      )}
                    </div>

                    <div className="border-t border-border pt-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="saveAsWebp"
                          checked={saveAsWebp}
                          onCheckedChange={(checked) => setSaveAsWebp(checked as boolean)}
                          disabled={isCrawling}
                        />
                        <div className="space-y-1">
                          <Label htmlFor="saveAsWebp" className="cursor-pointer">
                            Lưu ảnh định dạng WebP
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Nếu bật: lưu ảnh lên server. Nếu tắt: dùng link ảnh từ API.
                          </p>
                        </div>
                      </div>
                    </div>

                    {saveAsWebp && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                        <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                        <p className="text-xs text-yellow-600 dark:text-yellow-400">
                          Cần cấu hình storage bucket để lưu ảnh
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Crawl History */}
            <Card>
              <CardHeader>
                <CardTitle>Lịch sử Crawl</CardTitle>
                <CardDescription>
                  Các lần crawl gần đây
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Loại</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Thêm mới</TableHead>
                        <TableHead>Cập nhật</TableHead>
                        <TableHead>Thời gian</TableHead>
                        <TableHead>Ngày</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingLogs ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
                            <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                            <TableCell><div className="h-4 w-8 bg-muted animate-pulse rounded" /></TableCell>
                            <TableCell><div className="h-4 w-8 bg-muted animate-pulse rounded" /></TableCell>
                            <TableCell><div className="h-4 w-12 bg-muted animate-pulse rounded" /></TableCell>
                            <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                          </TableRow>
                        ))
                      ) : crawlLogs && crawlLogs.length > 0 ? (
                        crawlLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-medium">{log.type}</TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  log.status === "success"
                                    ? "border-green-500/50 text-green-500"
                                    : log.status === "running"
                                    ? "border-blue-500/50 text-blue-500"
                                    : "border-red-500/50 text-red-500"
                                }
                              >
                                {log.status === "success" ? "Thành công" : log.status === "running" ? "Đang chạy" : "Lỗi"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-green-500">+{log.movies_added}</TableCell>
                            <TableCell className="text-blue-500">{log.movies_updated}</TableCell>
                            <TableCell>{log.duration || "—"}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatDate(log.created_at)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Chưa có lịch sử crawl
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default ApiCrawl;
