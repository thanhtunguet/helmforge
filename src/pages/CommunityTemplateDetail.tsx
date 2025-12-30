import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Server,
  FileJson,
  Shield,
  Network,
  Copy,
  Loader2,
  Box,
  Settings,
  Globe,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useHelmStore } from '@/lib/store';
import type { 
  Template, 
  Service, 
  ConfigMap, 
  TLSSecret, 
  OpaqueSecret, 
  Ingress, 
  RegistrySecret, 
  IngressRule, 
  IngressHost,
  IngressTLS,
  EnvVarSchema, 
  Route, 
  OpaqueSecretKey, 
  ConfigMapKey,
  ConfigMapEnvSource,
  SecretEnvSource,
  TemplateVisibility 
} from '@/types/helm';
import type { Json } from '@/integrations/supabase/types';

interface TemplateData {
  template: Template;
  services: Service[];
  configMaps: ConfigMap[];
  tlsSecrets: TLSSecret[];
  opaqueSecrets: OpaqueSecret[];
  ingresses: Ingress[];
}

export default function CommunityTemplateDetail() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isCloning, setIsCloning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TemplateData | null>(null);
  const { user } = useAuth();
  const cloneTemplate = useHelmStore((state) => state.cloneTemplate);
  const loadFromDatabase = useHelmStore((state) => state.loadFromDatabase);
  
  const activeTab = searchParams.get('tab') || 'services';

  useEffect(() => {
    async function fetchTemplateData() {
      if (!templateId) return;
      
      setLoading(true);
      try {
        // Fetch template
        const { data: templateData, error: templateError } = await supabase
          .from('templates')
          .select('*')
          .eq('id', templateId)
          .eq('visibility', 'public')
          .single();

        if (templateError || !templateData) {
          setData(null);
          return;
        }

        // Fetch related data in parallel
        const [servicesRes, configMapsRes, tlsSecretsRes, opaqueSecretsRes, ingressesRes] = await Promise.all([
          supabase.from('services').select('*').eq('template_id', templateId),
          supabase.from('config_maps').select('*').eq('template_id', templateId),
          supabase.from('tls_secrets').select('*').eq('template_id', templateId),
          supabase.from('opaque_secrets').select('*').eq('template_id', templateId),
          supabase.from('ingresses').select('*').eq('template_id', templateId),
        ]);

        const template: Template = {
          id: templateData.id,
          name: templateData.name,
          description: templateData.description || '',
          sharedPort: templateData.shared_port,
          registryUrl: templateData.registry_url || '',
          registryProject: templateData.registry_project || '',
          registrySecret: (templateData.registry_secret as unknown as RegistrySecret) || {
            name: 'registry-credentials',
            type: 'registry',
            server: templateData.registry_url || '',
            username: '',
            email: '',
          },
          enableNginxGateway: templateData.enable_nginx_gateway,
          enableRedis: templateData.enable_redis,
          visibility: templateData.visibility as TemplateVisibility,
          createdAt: templateData.created_at,
          updatedAt: templateData.updated_at,
        };

        const services: Service[] = (servicesRes.data || []).map((s) => ({
          id: s.id,
          templateId: s.template_id,
          name: s.name,
          routes: (s.routes as unknown as Route[]) || [],
          envVars: (s.env_vars as unknown as EnvVarSchema[]) || [],
          healthCheckEnabled: s.health_check_enabled,
          livenessPath: s.liveness_path || '/health',
          readinessPath: s.readiness_path || '/ready',
          configMapEnvSources: (s.config_map_env_sources as unknown as ConfigMapEnvSource[]) || [],
          secretEnvSources: (s.secret_env_sources as unknown as SecretEnvSource[]) || [],
          useStatefulSet: s.use_stateful_set,
        }));

        const configMaps: ConfigMap[] = (configMapsRes.data || []).map((c) => ({
          id: c.id,
          templateId: c.template_id,
          name: c.name,
          keys: (c.keys as unknown as ConfigMapKey[]) || [],
        }));

        const tlsSecrets: TLSSecret[] = (tlsSecretsRes.data || []).map((s) => ({
          id: s.id,
          templateId: s.template_id,
          name: s.name,
          type: 'tls' as const,
        }));

        const opaqueSecrets: OpaqueSecret[] = (opaqueSecretsRes.data || []).map((s) => ({
          id: s.id,
          templateId: s.template_id,
          name: s.name,
          type: 'opaque' as const,
          keys: (s.keys as unknown as OpaqueSecretKey[]) || [],
        }));

        const ingresses: Ingress[] = (ingressesRes.data || []).map((i) => {
          // Parse legacy format (rules) to new format (hosts/tls)
          const rules = (i.rules as unknown as IngressRule[]) || [];
          const defaultHost = i.default_host || '';
          
          // Convert rules to hosts format
          const hosts: IngressHost[] = defaultHost ? [{
            hostname: defaultHost,
            paths: rules.map(r => ({ path: r.path, serviceName: r.serviceName }))
          }] : [];
          
          // Convert TLS settings
          const tls: IngressTLS[] = i.tls_enabled && i.tls_secret_name ? [{
            secretName: i.tls_secret_name,
            hosts: defaultHost ? [defaultHost] : []
          }] : [];

          return {
            id: i.id,
            templateId: i.template_id,
            name: i.name,
            mode: i.mode as 'nginx-gateway' | 'direct-services',
            hosts,
            tls,
          };
        });

        setData({ template, services, configMaps, tlsSecrets, opaqueSecrets, ingresses });
      } catch (error) {
        console.error('Error fetching template:', error);
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    fetchTemplateData();
  }, [templateId]);

  const handleClone = async () => {
    if (!user) {
      toast.error('Please sign in to clone templates');
      navigate('/auth', { state: { from: `/community/${templateId}` } });
      return;
    }

    if (!data) return;

    setIsCloning(true);
    try {
      // Load data into store first if needed
      await loadFromDatabase();
      const newTemplateId = await cloneTemplate(data.template.id);
      toast.success(`Template "${data.template.name}" cloned successfully!`);
      navigate(`/templates/${newTemplateId}`);
    } catch (error) {
      toast.error('Failed to clone template');
    } finally {
      setIsCloning(false);
    }
  };

  if (loading) {
    return (
      <PublicLayout>
        <div className="animate-fade-in">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-12 w-96 mb-2" />
          <Skeleton className="h-6 w-64 mb-8" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (!data) {
    return (
      <PublicLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <Globe className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h2 className="text-xl font-semibold">Template not found</h2>
          <p className="text-muted-foreground mb-4">
            The requested template does not exist or is not public.
          </p>
          <Link to="/community">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Community Templates
            </Button>
          </Link>
        </div>
      </PublicLayout>
    );
  }

  const { template, services, configMaps, tlsSecrets, opaqueSecrets, ingresses } = data;

  return (
    <PublicLayout>
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
                {services.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="configmaps" className="gap-2">
              <FileJson className="h-4 w-4" />
              ConfigMaps
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {configMaps.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="secrets" className="gap-2">
              <Shield className="h-4 w-4" />
              Secrets
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {tlsSecrets.length + opaqueSecrets.length + 1}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="ingresses" className="gap-2">
              <Network className="h-4 w-4" />
              Ingresses
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {ingresses.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="services">
            <div className="grid gap-4 md:grid-cols-2">
              {services.length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Server className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No services defined</p>
                  </CardContent>
                </Card>
              ) : (
                services.map((service) => (
                  <Card key={service.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Box className="h-4 w-4" />
                        {service.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {service.healthCheckEnabled && (
                          <Badge variant="outline">Health Check</Badge>
                        )}
                        {service.useStatefulSet && (
                          <Badge variant="outline">StatefulSet</Badge>
                        )}
                        <Badge variant="secondary">{service.routes.length} routes</Badge>
                        <Badge variant="secondary">{service.envVars.length} env vars</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="configmaps">
            <div className="grid gap-4 md:grid-cols-2">
              {configMaps.length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileJson className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No ConfigMaps defined</p>
                  </CardContent>
                </Card>
              ) : (
                configMaps.map((cm) => (
                  <Card key={cm.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        {cm.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge variant="secondary">{cm.keys.length} keys</Badge>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="secrets">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Registry Secret */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    {template.registrySecret.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline">Registry Secret</Badge>
                </CardContent>
              </Card>
              
              {/* TLS Secrets */}
              {tlsSecrets.map((secret) => (
                <Card key={secret.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      {secret.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="outline">TLS Secret</Badge>
                  </CardContent>
                </Card>
              ))}
              
              {/* Opaque Secrets */}
              {opaqueSecrets.map((secret) => (
                <Card key={secret.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      {secret.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="secondary">{secret.keys.length} keys</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="ingresses">
            <div className="grid gap-4 md:grid-cols-2">
              {ingresses.length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Network className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No Ingresses defined</p>
                  </CardContent>
                </Card>
              ) : (
                ingresses.map((ingress) => (
                  <Card key={ingress.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Network className="h-4 w-4" />
                        {ingress.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{ingress.mode}</Badge>
                        {ingress.tls.length > 0 && (
                          <Badge variant="outline">TLS Enabled</Badge>
                        )}
                        <Badge variant="secondary">{ingress.hosts.length} hosts</Badge>
                      </div>
                      {ingress.hosts[0]?.hostname && (
                        <p className="text-sm text-muted-foreground font-mono">
                          Host: {ingress.hosts[0].hostname}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PublicLayout>
  );
}
