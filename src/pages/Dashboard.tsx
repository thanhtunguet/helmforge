import { Link } from 'react-router-dom';
import { useHelmStore } from '@/lib/store';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Box,
  Server,
  Network,
  Clock,
  ArrowRight,
  Layers,
  Download,
} from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const templates = useHelmStore((state) => state.templates);
  const chartVersions = useHelmStore((state) => state.chartVersions);
  const services = useHelmStore((state) => state.services);
  const ingresses = useHelmStore((state) => state.ingresses);

  const recentVersions = chartVersions
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <MainLayout>
      <div className="animate-fade-in space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your Helm chart templates and versions
            </p>
          </div>
          <Link to="/templates/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Template
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Templates
              </CardTitle>
              <Box className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{templates.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Chart Versions
              </CardTitle>
              <Layers className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{chartVersions.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Services
              </CardTitle>
              <Server className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{services.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ingresses
              </CardTitle>
              <Network className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ingresses.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Templates List */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Templates</h2>
            {templates.length > 0 && (
              <Link
                to="/templates/new"
                className="text-sm text-primary hover:underline"
              >
                View all →
              </Link>
            )}
          </div>

          {templates.length === 0 ? (
            <Card className="border-dashed border-2 border-border bg-transparent">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Box className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">No templates yet</h3>
                <p className="mb-4 text-center text-sm text-muted-foreground">
                  Create your first Helm chart template to get started
                </p>
                <Link to="/templates/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Template
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => {
                const templateServices = services.filter(
                  (s) => s.templateId === template.id
                );
                const templateVersions = chartVersions.filter(
                  (v) => v.templateId === template.id
                );
                const templateIngresses = ingresses.filter(
                  (i) => i.templateId === template.id
                );

                return (
                  <Link key={template.id} to={`/templates/${template.id}`}>
                    <Card className="group border-border bg-card transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg group-hover:text-primary transition-colors">
                              {template.name}
                            </CardTitle>
                            <CardDescription className="mt-1 line-clamp-2">
                              {template.description || 'No description'}
                            </CardDescription>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-1" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2 mb-4">
                          <Badge variant="secondary" className="font-mono text-xs">
                            Port: {template.sharedPort}
                          </Badge>
                          {template.enableNginxGateway && (
                            <Badge variant="outline" className="text-xs">
                              Nginx
                            </Badge>
                          )}
                          {template.enableRedis && (
                            <Badge variant="outline" className="text-xs">
                              Redis
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{templateServices.length} services</span>
                          <span>{templateIngresses.length} ingresses</span>
                          <span>{templateVersions.length} versions</span>
                        </div>
                        <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(template.updatedAt), 'MMM d, yyyy')}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Versions */}
        {recentVersions.length > 0 && (
          <div>
            <h2 className="mb-4 text-xl font-semibold">Recent Versions</h2>
            <Card className="bg-card border-border">
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {recentVersions.map((version) => {
                    const template = templates.find(
                      (t) => t.id === version.templateId
                    );
                    return (
                      <div
                        key={version.id}
                        className="flex items-center justify-between px-6 py-4"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                            <Download className="h-5 w-5 text-accent" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {template?.name} - v{version.versionName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(
                                new Date(version.createdAt),
                                'MMM d, yyyy HH:mm'
                              )}
                            </p>
                          </div>
                        </div>
                        <Link to={`/templates/${version.templateId}/versions/${version.id}`}>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
