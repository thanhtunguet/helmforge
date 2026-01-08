import { useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useHelmStore } from '@/lib/store';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Server,
  FileJson,
  Shield,
  Network,
  Layers,
  Settings,
  Trash2,
  Download,
  FileCode,
  FileText,
  Share2,
} from 'lucide-react';
import { ServicesTab } from '@/components/template/ServicesTab';
import { ConfigMapsTab } from '@/components/template/ConfigMapsTab';
import { SecretsTab } from '@/components/template/SecretsTab';
import { IngressesTab } from '@/components/template/IngressesTab';
import { VersionsTab } from '@/components/template/VersionsTab';
import { NginxConfigTab } from '@/components/template/NginxConfigTab';
import { ReadmeTab } from '@/components/template/ReadmeTab';
import { TemplateSettingsDialog } from '@/components/template/TemplateSettingsDialog';
import { ShareTemplateDialog } from '@/components/template/ShareTemplateDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { TemplateWithRelations } from '@/types/helm';

export default function TemplateDetail() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  
  // Get the active tab from URL query parameter, default to 'versions'
  const activeTab = searchParams.get('tab') || 'versions';
  
  // Use selectors that track actual data changes
  const templates = useHelmStore((state) => state.templates);
  const services = useHelmStore((state) => state.services);
  const configMaps = useHelmStore((state) => state.configMaps);
  const tlsSecrets = useHelmStore((state) => state.tlsSecrets);
  const opaqueSecrets = useHelmStore((state) => state.opaqueSecrets);
  const ingresses = useHelmStore((state) => state.ingresses);
  const chartVersions = useHelmStore((state) => state.chartVersions);
  const deleteTemplate = useHelmStore((state) => state.deleteTemplate);
  
  // Build template with relations from tracked data
  const baseTemplate = templates.find((t) => t.id === templateId);
  const template: TemplateWithRelations | undefined = baseTemplate
    ? {
        ...baseTemplate,
        services: services.filter((s) => s.templateId === templateId),
        configMaps: configMaps.filter((c) => c.templateId === templateId),
        tlsSecrets: tlsSecrets.filter((s) => s.templateId === templateId),
        opaqueSecrets: opaqueSecrets.filter((s) => s.templateId === templateId),
        ingresses: ingresses.filter((i) => i.templateId === templateId),
        versions: chartVersions.filter((v) => v.templateId === templateId),
      }
    : undefined;

  if (!template) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <h2 className="text-xl font-semibold">Template not found</h2>
          <p className="text-muted-foreground mb-4">
            The requested template does not exist.
          </p>
          <Link to="/">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const handleDelete = async () => {
    try {
      await deleteTemplate(template.id);
      toast.success('Template deleted');
      navigate('/dashboard');
    } catch (error) {
      // Error is already handled in the store
    }
  };

  return (
    <MainLayout>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            className="mb-4 -ml-4"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{template.name}</h1>
              {template.description && (
                <p className="mt-1 text-muted-foreground">{template.description}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="secondary" className="font-mono">
                  Port: {template.sharedPort}
                </Badge>
                <Badge variant="outline" className="font-mono">
                  {template.registryUrl}/{template.registryProject}
                </Badge>
                {template.versions.length > 0 && (() => {
                  const latestVersion = [...template.versions].sort((a, b) => 
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                  )[0];
                  return (
                    <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                      v{latestVersion.versionName}
                    </Badge>
                  );
                })()}
                {template.enableNginxGateway && (
                  <Badge className="bg-primary/10 text-primary border-primary/20">
                    Nginx Gateway
                  </Badge>
                )}
                {template.enableRedis && (
                  <Badge className="bg-destructive/10 text-destructive border-destructive/20">
                    Redis
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShareOpen(true)}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
              <Button variant="outline" onClick={() => setSettingsOpen(true)}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
              <Link to={`/templates/${template.id}/versions/new`}>
                <Button>
                  <Layers className="mr-2 h-4 w-4" />
                  New Version
                </Button>
              </Link>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Template</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete "{template.name}" and all its services,
                      configurations, and versions. This action cannot be undone.
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
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => {
          const newSearchParams = new URLSearchParams(searchParams);
          if (value === 'versions') {
            newSearchParams.delete('tab');
          } else {
            newSearchParams.set('tab', value);
          }
          navigate(`/templates/${templateId}?${newSearchParams.toString()}`, { replace: true });
        }} className="space-y-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="versions" className="gap-2">
              <Download className="h-4 w-4" />
              Versions
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {template.versions.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="readme" className="gap-2">
              <FileText className="h-4 w-4" />
              README
            </TabsTrigger>
            <TabsTrigger value="services" className="gap-2">
              <Server className="h-4 w-4" />
              Services
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {template.services.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="configmaps" className="gap-2">
              <FileJson className="h-4 w-4" />
              ConfigMaps
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {template.configMaps.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="secrets" className="gap-2">
              <Shield className="h-4 w-4" />
              Secrets
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {template.tlsSecrets.length + template.opaqueSecrets.length + 1}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="ingresses" className="gap-2">
              <Network className="h-4 w-4" />
              Ingresses
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {template.ingresses.length}
              </Badge>
            </TabsTrigger>
            {template.enableNginxGateway && (
              <TabsTrigger value="nginx" className="gap-2">
                <FileCode className="h-4 w-4" />
                Nginx Config
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="services">
            <ServicesTab template={template} />
          </TabsContent>
          <TabsContent value="configmaps">
            <ConfigMapsTab template={template} />
          </TabsContent>
          <TabsContent value="secrets">
            <SecretsTab template={template} />
          </TabsContent>
          <TabsContent value="ingresses">
            <IngressesTab template={template} />
          </TabsContent>
          <TabsContent value="versions">
            <VersionsTab template={template} />
          </TabsContent>
          {template.enableNginxGateway && (
            <TabsContent value="nginx">
              <NginxConfigTab template={template} />
            </TabsContent>
          )}
          <TabsContent value="readme">
            <ReadmeTab template={template} />
          </TabsContent>
        </Tabs>
      </div>
      
      <TemplateSettingsDialog
        template={template}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
      
      <ShareTemplateDialog
        templateId={template.id}
        templateName={template.name}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />
    </MainLayout>
  );
}
