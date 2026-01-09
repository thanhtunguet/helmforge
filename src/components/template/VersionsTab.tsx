import { Link, useNavigate } from 'react-router-dom';
import { useHelmStore } from '@/lib/store';
import { TemplateWithRelations } from '@/types/helm';
import { downloadChart } from '@/lib/helm-generator';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Download, Trash2, Check, X, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useState } from 'react';

interface VersionsTabProps {
  template: TemplateWithRelations;
}

export function VersionsTab({ template }: VersionsTabProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleteChartVersion = useHelmStore((state) => state.deleteChartVersion);
  const navigate = useNavigate();

  const handleDownload = async (versionId: string) => {
    const version = template.versions.find((v) => v.id === versionId);
    if (!version) return;

    try {
      await downloadChart(template, version);
      toast.success('Chart downloaded successfully');
    } catch (error) {
      toast.error('Failed to download chart');
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await deleteChartVersion(deleteId);
        toast.success('Version deleted');
        setDeleteId(null);
      } catch (error) {
        // Error is already handled in the store
      }
    }
  };

  const handlePartialUpdate = (version: typeof template.versions[0]) => {
    navigate(`/templates/${template.id}/versions/${version.id}/partial-update`);
  };

  const sortedVersions = [...template.versions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Chart Versions</h3>
          <p className="text-sm text-muted-foreground">
            Generated Helm chart versions ready for deployment
          </p>
        </div>
        <Link to={`/templates/${template.id}/versions/new`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Version
          </Button>
        </Link>
      </div>

      {sortedVersions.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No versions created yet</p>
            <Link to={`/templates/${template.id}/versions/new`}>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Create your first version
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>App Version</TableHead>
                <TableHead>Nginx</TableHead>
                <TableHead>Redis</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[200px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedVersions.map((version) => (
                <TableRow 
                  key={version.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/templates/${template.id}/versions/${version.id}`)}
                >
                  <TableCell className="font-mono font-medium">v{version.versionName}</TableCell>
                  <TableCell>
                    {version.appVersion ? (
                      <Badge variant="secondary" className="text-xs">
                        {version.appVersion}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {(version.values.enableNginxGateway ?? template.enableNginxGateway) ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell>
                    {(version.values.enableRedis ?? template.enableRedis) ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(version.createdAt), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handlePartialUpdate(version)}
                        title="Partial update"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDownload(version.id)}
                        title="Download chart"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setDeleteId(version.id)}
                        title="Delete version"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Version</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this version? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
