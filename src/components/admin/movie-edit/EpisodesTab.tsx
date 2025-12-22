import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Plus, Pencil, Trash2, Save, X, Play, Server } from "lucide-react";
import { toast } from "sonner";

interface EpisodesTabProps {
  movieId: string;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

interface Episode {
  id: string;
  name: string;
  slug: string;
  server_name: string;
  link_m3u8: string | null;
  link_embed: string | null;
  filename: string | null;
}

const linkTypes = [
  { value: "m3u8", label: "M3U8 Stream" },
  { value: "embed", label: "Embed" },
  { value: "mp4", label: "MP4" },
  { value: "shortcode", label: "Shortcode" },
];

const EpisodesTab = ({ movieId, onSave, onCancel, isSaving }: EpisodesTabProps) => {
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newEpisode, setNewEpisode] = useState({
    name: "",
    slug: "",
    server_name: "Server #1",
    link_type: "m3u8",
    link_value: "",
  });

  const queryClient = useQueryClient();

  const { data: episodes, isLoading } = useQuery({
    queryKey: ["movie-episodes", movieId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("episodes")
        .select("*")
        .eq("movie_id", movieId)
        .order("name");
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!movieId,
  });

  const addMutation = useMutation({
    mutationFn: async (episode: typeof newEpisode) => {
      const episodeData: any = {
        movie_id: movieId,
        name: episode.name,
        slug: episode.slug || episode.name.toLowerCase().replace(/\s+/g, "-"),
        server_name: episode.server_name,
      };

      if (episode.link_type === "m3u8") {
        episodeData.link_m3u8 = episode.link_value;
      } else if (episode.link_type === "embed") {
        episodeData.link_embed = episode.link_value;
      } else {
        episodeData.filename = episode.link_value;
      }

      const { error } = await supabase.from("episodes").insert(episodeData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movie-episodes", movieId] });
      toast.success("Đã thêm tập phim");
      setIsDialogOpen(false);
      setNewEpisode({ name: "", slug: "", server_name: "Server #1", link_type: "m3u8", link_value: "" });
    },
    onError: () => {
      toast.error("Không thể thêm tập phim");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (episode: Episode) => {
      const { error } = await supabase
        .from("episodes")
        .update({
          name: episode.name,
          slug: episode.slug,
          server_name: episode.server_name,
          link_m3u8: episode.link_m3u8,
          link_embed: episode.link_embed,
          filename: episode.filename,
        })
        .eq("id", episode.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movie-episodes", movieId] });
      toast.success("Đã cập nhật tập phim");
      setEditingEpisode(null);
    },
    onError: () => {
      toast.error("Không thể cập nhật tập phim");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("episodes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movie-episodes", movieId] });
      toast.success("Đã xóa tập phim");
      setDeleteId(null);
    },
    onError: () => {
      toast.error("Không thể xóa tập phim");
    },
  });

  const getLinkType = (episode: Episode) => {
    if (episode.link_m3u8) return "M3U8";
    if (episode.link_embed) return "Embed";
    if (episode.filename) return "File";
    return "N/A";
  };

  const getLinkValue = (episode: Episode) => {
    return episode.link_m3u8 || episode.link_embed || episode.filename || "";
  };

  // Group episodes by server
  const groupedEpisodes = episodes?.reduce((acc: Record<string, Episode[]>, episode) => {
    const server = episode.server_name || "Server #1";
    if (!acc[server]) acc[server] = [];
    acc[server].push(episode);
    return acc;
  }, {}) || {};

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Danh sách tập phim</CardTitle>
            <CardDescription>Quản lý các tập phim và link stream</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Thêm tập
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Thêm tập phim mới</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tên tập</Label>
                    <Input
                      value={newEpisode.name}
                      onChange={(e) => setNewEpisode(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Tập 1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Slug</Label>
                    <Input
                      value={newEpisode.slug}
                      onChange={(e) => setNewEpisode(prev => ({ ...prev, slug: e.target.value }))}
                      placeholder="tap-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Server</Label>
                  <Input
                    value={newEpisode.server_name}
                    onChange={(e) => setNewEpisode(prev => ({ ...prev, server_name: e.target.value }))}
                    placeholder="Server #1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Loại link</Label>
                  <Select 
                    value={newEpisode.link_type} 
                    onValueChange={(v) => setNewEpisode(prev => ({ ...prev, link_type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {linkTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Link / URL</Label>
                  <Input
                    value={newEpisode.link_value}
                    onChange={(e) => setNewEpisode(prev => ({ ...prev, link_value: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Hủy
                  </Button>
                  <Button 
                    onClick={() => addMutation.mutate(newEpisode)}
                    disabled={addMutation.isPending || !newEpisode.name}
                  >
                    Thêm tập
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : Object.keys(groupedEpisodes).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Chưa có tập phim nào
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedEpisodes).map(([serverName, serverEpisodes]) => (
                <div key={serverName} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium">{serverName}</h4>
                    <Badge variant="secondary">{serverEpisodes.length} tập</Badge>
                  </div>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border">
                          <TableHead className="w-[120px]">Tên tập</TableHead>
                          <TableHead className="w-[100px]">Slug</TableHead>
                          <TableHead className="w-[100px]">Type</TableHead>
                          <TableHead>Link</TableHead>
                          <TableHead className="w-[100px] text-right">Thao tác</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {serverEpisodes.map((episode) => (
                          <TableRow key={episode.id} className="border-border">
                            {editingEpisode?.id === episode.id ? (
                              <>
                                <TableCell>
                                  <Input
                                    value={editingEpisode.name}
                                    onChange={(e) => setEditingEpisode({ ...editingEpisode, name: e.target.value })}
                                    className="h-8"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    value={editingEpisode.slug}
                                    onChange={(e) => setEditingEpisode({ ...editingEpisode, slug: e.target.value })}
                                    className="h-8"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{getLinkType(editingEpisode)}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Input
                                    value={editingEpisode.link_m3u8 || editingEpisode.link_embed || editingEpisode.filename || ""}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      if (editingEpisode.link_m3u8 !== null) {
                                        setEditingEpisode({ ...editingEpisode, link_m3u8: value });
                                      } else if (editingEpisode.link_embed !== null) {
                                        setEditingEpisode({ ...editingEpisode, link_embed: value });
                                      } else {
                                        setEditingEpisode({ ...editingEpisode, filename: value });
                                      }
                                    }}
                                    className="h-8"
                                  />
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-1">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8"
                                      onClick={() => updateMutation.mutate(editingEpisode)}
                                    >
                                      <Save className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8"
                                      onClick={() => setEditingEpisode(null)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </>
                            ) : (
                              <>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Play className="h-3 w-3 text-primary" />
                                    {episode.name}
                                  </div>
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                  {episode.slug}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{getLinkType(episode)}</Badge>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground truncate max-w-[300px]">
                                  {getLinkValue(episode)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-1">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8"
                                      onClick={() => setEditingEpisode(episode)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      onClick={() => setDeleteId(episode.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa tập phim?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Tập phim sẽ bị xóa vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 sticky bottom-4 bg-background/95 backdrop-blur p-4 rounded-lg border border-border">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          <X className="h-4 w-4 mr-2" />
          Đóng
        </Button>
        <Button onClick={onSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          Hoàn tất
        </Button>
      </div>
    </div>
  );
};

export default EpisodesTab;
