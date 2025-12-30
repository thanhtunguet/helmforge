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
  Copy,
  FileCode,
  Loader2,
} from 'lucide-react';
import { ServicesTab } from '@/components/template/ServicesTab';
import { ConfigMapsTab } from '@/components/template/ConfigMapsTab';
import { SecretsTab } from '@/components/template/SecretsTab';
import { IngressesTab } from '@/components/template/IngressesTab';
import { NginxConfigTab } from '@/components/template/NginxConfigTab';
import { toast } from 'sonner';
import { TemplateWithRelations } from '@/types/helm';
import { useAuth } from '@/hooks/useAuth';

export default function CommunityTemplateDetail() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isCloning, setIsCloning] = useState(false);
  const { user } = useAuth();
  
  const activeTab = searchParams.get('tab') || 'services';
  
  const templates = useHelmStore((state) => state.templates);
  const services = useHelmStore((state) => state.services);
  const configMaps = useHelmStore((state) => state.configMaps);
  const tlsSecrets = useHelmStore((state) => state.tlsSecrets);
  const opaqueSecrets = useHelmStore((state) => state.opaqueSecrets);
  const ingresses = useHelmStore((state) => state.ingresses);
  const cloneTemplate = useHelmStore((state) => state.cloneTemplate);
  
  const baseTemplate = templates.find((t) => t.id === templateId);
  const template: TemplateWithRelations | undefined = baseTemplate
    ? {
        ...baseTemplate,
        services: services.filter((s) => s.templateId === templateId),
        configMaps: configMaps.filter((c) => c.templateId === templateId),
        tlsSecrets: tlsSecrets.filter((s) => s.templateId === templateId),
        opaqueSecrets: opaqueSecrets.filter((s) => s.templateId === templateId),
        ingresses: ingresses.filter((i) => i.templateId === templateId),
        versions: [],
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
          <Link to="/community">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Community Templates
            </Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const handleClone = async () => {
    if (!user) {
      toast.error('Please sign in to clone templates');
      navigate('/auth');
      return;
    }

    setIsCloning(true);
    try {
      const newTemplateId = await cloneTemplate(template.id);
      toast.success(`Template "${template.name}" cloned successfully!`);
      navigate(`/templates/${newTemplateId}`);
    } catch (error) {
      toast.error('Failed to clone template');
    } finally {
      setIsCloning(false);
    }
  };

  return (
    <MainLayout>
      <div className="animate-fade-in">
        <div className="mb-8">
          <Button
            variant="ghost"
            className="mb-4 -ml-4"
            onClick={() => navigate('/community')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Community Templates
          </Button>
          
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold tracking-tight">{template.name}</h1>
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                  Community
                </Badge>
              </div>
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
            
            <Button onClick={handleClone} disabled={isCloning}>
              {isCloning ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              Clone to My Templates
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => {
          const newSearchParams = new URLSearchParams(searchParams);
          if (value === 'services') {
            newSearchParams.delete('tab');
          } else {
            newSearchParams.set('tab', value);
          }
          navigate(`/community/${templateId}?${newSearchParams.toString()}`, { replace: true });
        }} className="space-y-6">
          <TabsList className="bg-muted/50 p-1">
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
            <ServicesTab template={template} readOnly />
          </TabsContent>
          <TabsContent value="configmaps">
            <ConfigMapsTab template={template} readOnly />
          </TabsContent>
          <TabsContent value="secrets">
            <SecretsTab template={template} readOnly />
          </TabsContent>
          <TabsContent value="ingresses">
            <IngressesTab template={template} readOnly />
          </TabsContent>
          {template.enableNginxGateway && (
            <TabsContent value="nginx">
              <NginxConfigTab template={template} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </MainLayout>
  );
}
