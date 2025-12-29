import { useParams, useNavigate, Link } from 'react-router-dom';
import { useHelmStore } from '@/lib/store';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  ArrowUpCircle,
  Download,
  Tag,
  Variable,
  FileJson,
  Lock,
  Network,
  Settings,
  Check,
  X,
  Calendar,
  FileCode,
  LayoutList,
  Play,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { downloadChart } from '@/lib/helm-generator';
import { TemplateWithRelations } from '@/types/helm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { YamlViewMode } from '@/components/template/YamlViewMode';
import { PlaygroundView } from '@/components/template/PlaygroundView';
import { IngressRouteTree } from '@/components/template/IngressRouteTree';

export default function VersionDetail() {
  const { templateId, versionId } = useParams();
  const navigate = useNavigate();

  const getTemplateWithRelations = useHelmStore(
    (state) => state.getTemplateWithRelations
  );

  const template = templateId ? getTemplateWithRelations(templateId) : undefined;
  const version = template?.versions.find((v) => v.id === versionId);

  if (!template || !version) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <h2 className="text-xl font-semibold">Version not found</h2>
          <p className="text-muted-foreground mb-4">
            The requested version does not exist.
          </p>
          <Link to={templateId ? `/templates/${templateId}` : '/dashboard'}>
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {templateId ? 'Back to Template' : 'Back to Dashboard'}
            </Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const handleDownload = async () => {
    try {
      await downloadChart(template, version);
      toast.success('Chart downloaded successfully');
    } catch (error) {
      toast.error('Failed to download chart');
      console.error(error);
    }
  };

  const handleUpgrade = () => {
    navigate(`/templates/${template.id}/versions/new`, {
      state: {
        initialValues: version.values,
        initialVersionInfo: {
          versionName: version.versionName,
          appVersion: version.appVersion || '1.0.0',
        },
      },
    });
  };

  return (
    <MainLayout>
      <div className="animate-fade-in w-full">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            className="mb-4 -ml-4"
            onClick={() => navigate(`/templates/${template.id}?tab=versions`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Template
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Version {version.versionName}
              </h1>
              <p className="text-muted-foreground mt-1">{template.name}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {version.appVersion && (
                  <Badge variant="secondary" className="font-mono">
                    App: {version.appVersion}
                  </Badge>
                )}
                <Badge variant="outline" className="gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(version.createdAt), 'MMM d, yyyy')}
                </Badge>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleUpgrade}>
                <ArrowUpCircle className="mr-2 h-4 w-4" />
                Upgrade
              </Button>
              <Button onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="overview" className="gap-2">
              <LayoutList className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="yaml-view" className="gap-2">
              <FileCode className="h-4 w-4" />
              YAML View
            </TabsTrigger>
            <TabsTrigger value="playground" className="gap-2">
              <Play className="h-4 w-4" />
              Playground
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            {/* Version Information */}
            <Card className="mb-6 bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Version Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Chart Version</p>
                <p className="font-mono font-medium">{version.versionName}</p>
              </div>
              {version.appVersion && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">App Version</p>
                  <p className="font-mono font-medium">{version.appVersion}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground mb-1">Created</p>
                <p>{format(new Date(version.createdAt), 'MMM d, yyyy HH:mm')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Template</p>
                <p>{template.name}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Image Tags */}
        {Object.keys(version.values.imageTags).length > 0 && (
          <Card className="mb-6 bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Image Tags
              </CardTitle>
              <CardDescription>
                Container image tags for each service
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(version.values.imageTags)
                  .filter(([, tag]) => tag)
                  .map(([serviceName, tag]) => (
                    <div
                      key={serviceName}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div>
                        <p className="font-medium">{serviceName}</p>
                        <p className="text-sm text-muted-foreground font-mono">
                          {template.registryUrl}/{template.registryProject}/{serviceName}:{tag}
                        </p>
                      </div>
                      <Badge variant="secondary" className="font-mono">
                        {tag}
                      </Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Environment Variables */}
        {Object.keys(version.values.envValues).length > 0 &&
          Object.values(version.values.envValues).some((envs) => Object.keys(envs).length > 0) && (
            <Card className="mb-6 bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Variable className="h-5 w-5" />
                  Environment Variables
                </CardTitle>
                <CardDescription>
                  Environment variable values for each service
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(version.values.envValues).map(([serviceName, envs]) => {
                    const service = template.services.find((s) => s.name === serviceName);
                    if (!service || Object.keys(envs).length === 0) return null;

                    return (
                      <div key={serviceName} className="space-y-2">
                        <h4 className="text-sm font-medium">{serviceName}</h4>
                        <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                          {Object.entries(envs).map(([envName, value]) => (
                            <div
                              key={envName}
                              className="flex items-start justify-between gap-4"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-mono text-muted-foreground">
                                  {envName}
                                </p>
                                {service.envVars.find((e) => e.name === envName)?.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {service.envVars.find((e) => e.name === envName)?.description}
                                  </p>
                                )}
                              </div>
                              <p className="text-sm font-mono break-all">{value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

        {/* ConfigMap Values */}
        {Object.keys(version.values.configMapValues).length > 0 &&
          Object.values(version.values.configMapValues).some(
            (values) => Object.keys(values).length > 0
          ) && (
            <Card className="mb-6 bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileJson className="h-5 w-5" />
                  ConfigMap Values
                </CardTitle>
                <CardDescription>
                  Configuration values for each ConfigMap
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(version.values.configMapValues).map(([configMapName, values]) => {
                    const configMap = template.configMaps.find((cm) => cm.name === configMapName);
                    if (!configMap || Object.keys(values).length === 0) return null;

                    return (
                      <div key={configMapName} className="space-y-2">
                        <h4 className="text-sm font-medium">{configMapName}</h4>
                        <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                          {Object.entries(values).map(([keyName, value]) => (
                            <div
                              key={keyName}
                              className="flex items-start justify-between gap-4"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-mono text-muted-foreground">
                                  {keyName}
                                </p>
                                {configMap.keys.find((k) => k.name === keyName)?.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {configMap.keys.find((k) => k.name === keyName)?.description}
                                  </p>
                                )}
                              </div>
                              <p className="text-sm font-mono break-all">{value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

        {/* TLS Secrets */}
        {Object.keys(version.values.tlsSecretValues).length > 0 && (
          <Card className="mb-6 bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                TLS Secrets
              </CardTitle>
              <CardDescription>
                TLS certificate and key values
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(version.values.tlsSecretValues).map(([secretName, secret]) => (
                  <div
                    key={secretName}
                    className="p-3 rounded-lg bg-muted/50 space-y-2"
                  >
                    <h4 className="text-sm font-medium">{secretName}</h4>
                    <div className="space-y-1">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Certificate</p>
                        <p className="text-xs font-mono break-all bg-background p-2 rounded border">
                          {secret.crt || '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Private Key</p>
                        <p className="text-xs font-mono break-all bg-background p-2 rounded border">
                          {secret.key || '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Opaque Secret Values */}
        {Object.keys(version.values.opaqueSecretValues || {}).length > 0 && (
          <Card className="mb-6 bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Opaque Secret Values
              </CardTitle>
              <CardDescription>
                Secret values configured for this version
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(version.values.opaqueSecretValues || {}).map(([secretName, secretValues]) => {
                  if (!secretValues || Object.keys(secretValues).length === 0) return null;
                  return (
                    <div
                      key={secretName}
                      className="p-3 rounded-lg bg-muted/50 space-y-2"
                    >
                      <h4 className="text-sm font-medium">{secretName}</h4>
                      <div className="space-y-2">
                        {Object.entries(secretValues).map(([keyName, value]) => (
                          <div key={keyName} className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-mono text-muted-foreground">
                                {keyName}
                              </p>
                            </div>
                            <p className="text-sm font-mono break-all">{'•'.repeat(Math.min(value?.length || 0, 20))}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Opaque Secrets (Template Definition) */}
        {template && template.opaqueSecrets.length > 0 && (
          <Card className="mb-6 bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Secret Keys
              </CardTitle>
              <CardDescription>
                Secret keys defined in template
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {template.opaqueSecrets.map((secret) => (
                  <div
                    key={secret.id}
                    className="p-3 rounded-lg bg-muted/50 space-y-2"
                  >
                    <h4 className="text-sm font-medium">{secret.name}</h4>
                    <div className="space-y-1">
                      {secret.keys.map((key) => (
                        <div key={key.name} className="flex items-start gap-2 py-1">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <div className="w-3 h-px bg-border"></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-border"></div>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-mono">{key.name}</p>
                            {key.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {key.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                      {secret.keys.length === 0 && (
                        <p className="text-xs text-muted-foreground">No keys defined</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ingress Configuration */}
        {template && template.ingresses.length > 0 && (
            <Card className="mb-6 bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5" />
                  Ingress Configuration
                </CardTitle>
                <CardDescription>
                  Host names and routes for each ingress
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {template.ingresses.map((ing) => (
                    <div key={ing.id} className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary">{ing.name}</Badge>
                        {ing.tls && ing.tls.length > 0 && (
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            {ing.tls.length} TLS config{ing.tls.length > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                      {ing.hosts.map((host, idx) => {
                        const tlsConfig = ing.tls?.find(t => t.hosts.includes(host.hostname));
                        return (
                          <div key={idx} className="p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-2 mb-2">
                              <h5 className="font-mono text-sm font-semibold">{host.hostname}</h5>
                              {tlsConfig && (
                                <Badge variant="outline" className="text-xs font-mono">
                                  <Lock className="h-3 w-3 mr-1" />
                                  {tlsConfig.secretName}
                                </Badge>
                              )}
                            </div>
                            <IngressRouteTree routes={host.paths} />
                          </div>
                        );
                      })}
                      {ing.hosts.length === 0 && (
                        <p className="text-xs text-muted-foreground p-3 rounded-lg bg-muted/50">
                          No hosts configured
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

        {/* Options */}
        <Card className="mb-6 bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Options
            </CardTitle>
            <CardDescription>
              Feature flags and configuration options
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">Nginx Internal Gateway</p>
                  <p className="text-sm text-muted-foreground">
                    Template default: {template.enableNginxGateway ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                {(version.values.enableNginxGateway ?? template.enableNginxGateway) ? (
                  <div className="flex items-center gap-2 text-success">
                    <Check className="h-5 w-5" />
                    <span>Enabled</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <X className="h-5 w-5" />
                    <span>Disabled</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">Redis Cache</p>
                  <p className="text-sm text-muted-foreground">
                    Template default: {template.enableRedis ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                {(version.values.enableRedis ?? template.enableRedis) ? (
                  <div className="flex items-center gap-2 text-success">
                    <Check className="h-5 w-5" />
                    <span>Enabled</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <X className="h-5 w-5" />
                    <span>Disabled</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-border">
          <Button
            variant="ghost"
            onClick={() => navigate(`/templates/${template.id}?tab=versions`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Versions
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleUpgrade}>
              <ArrowUpCircle className="mr-2 h-4 w-4" />
              Upgrade Version
            </Button>
            <Button onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download Chart
            </Button>
          </div>
        </div>
          </TabsContent>

          {/* YAML View Tab */}
          <TabsContent value="yaml-view">
            <YamlViewMode template={template} version={version} />
          </TabsContent>

          {/* Playground Tab */}
          <TabsContent value="playground">
            <PlaygroundView template={template} version={version} />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

