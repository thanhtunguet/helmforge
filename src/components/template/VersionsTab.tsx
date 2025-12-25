import { Link } from 'react-router-dom';
import { useHelmStore } from '@/lib/store';
import { TemplateWithRelations } from '@/types/helm';
import { downloadChart } from '@/lib/helm-generator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Plus, Download, Trash2, Layers, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useState } from 'react';

interface VersionsTabProps {
  template: TemplateWithRelations;
}

export function VersionsTab({ template }: VersionsTabProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleteChartVersion = useHelmStore((state) => state.deleteChartVersion);

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

  const handleDelete = () => {
    if (deleteId) {
      deleteChartVersion(deleteId);
      toast.success('Version deleted');
      setDeleteId(null);
    }
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
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Layers className="h-6 w-6 text-primary" />
            </div>
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
        <div className="space-y-3">
          {sortedVersions.map((version) => (
            <Card key={version.id} className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                      <Layers className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-mono">
                        v{version.versionName}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(version.createdAt), 'MMM d, yyyy HH:mm')}
                        {version.appVersion && (
                          <>
                            <span>•</span>
                            <Badge variant="secondary" className="text-xs">
                              App: {version.appVersion}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(version.id)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download .tgz
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => setDeleteId(version.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Services:</span>{' '}
                    {Object.keys(version.values.imageTags).length}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Nginx:</span>{' '}
                    {(version.values.enableNginxGateway ?? template.enableNginxGateway)
                      ? 'Enabled'
                      : 'Disabled'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Redis:</span>{' '}
                    {(version.values.enableRedis ?? template.enableRedis)
                      ? 'Enabled'
                      : 'Disabled'}
                  </div>
                </div>
                {Object.keys(version.values.imageTags).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {Object.entries(version.values.imageTags).map(([svc, tag]) => (
                      <Badge key={svc} variant="secondary" className="font-mono text-xs">
                        {svc}:{tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
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
