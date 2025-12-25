import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useHelmStore } from '@/lib/store';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChartVersion, ChartVersionValues } from '@/types/helm';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Tag,
  Variable,
  FileJson,
  Lock,
  Network,
  Settings,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { downloadChart } from '@/lib/helm-generator';

const STEPS = [
  { id: 'info', label: 'Version Info', icon: Tag },
  { id: 'images', label: 'Image Tags', icon: Tag },
  { id: 'env', label: 'Environment', icon: Variable },
  { id: 'configmaps', label: 'ConfigMaps', icon: FileJson },
  { id: 'secrets', label: 'TLS Secrets', icon: Lock },
  { id: 'ingress', label: 'Ingress Hosts', icon: Network },
  { id: 'options', label: 'Options', icon: Settings },
  { id: 'review', label: 'Review', icon: Check },
];

export default function NewVersion() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  const getTemplateWithRelations = useHelmStore(
    (state) => state.getTemplateWithRelations
  );
  const addChartVersion = useHelmStore((state) => state.addChartVersion);

  const template = templateId ? getTemplateWithRelations(templateId) : undefined;

  const [versionInfo, setVersionInfo] = useState({
    versionName: '0.1.0',
    appVersion: '1.0.0',
  });

  const [values, setValues] = useState<ChartVersionValues>({
    imageTags: {},
    envValues: {},
    configMapValues: {},
    tlsSecretValues: {},
    ingressHosts: {},
    enableNginxGateway: undefined,
    enableRedis: undefined,
  });

  if (!template) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <h2 className="text-xl font-semibold">Template not found</h2>
          <Link to="/">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreate = async () => {
    if (!versionInfo.versionName.trim()) {
      toast.error('Version name is required');
      return;
    }

    const version: ChartVersion = {
      id: crypto.randomUUID(),
      templateId: template.id,
      versionName: versionInfo.versionName,
      appVersion: versionInfo.appVersion || undefined,
      values,
      createdAt: new Date().toISOString(),
    };

    addChartVersion(version);
    toast.success('Version created successfully');

    // Auto download
    try {
      await downloadChart(
        { ...template, versions: [...template.versions, version] },
        version
      );
      toast.success('Chart downloaded');
    } catch (error) {
      console.error(error);
    }

    navigate(`/templates/${template.id}`);
  };

  const renderStep = () => {
    switch (STEPS[currentStep].id) {
      case 'info':
        return (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Version Information</CardTitle>
              <CardDescription>Set the chart and app version numbers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="versionName">Chart Version *</Label>
                  <Input
                    id="versionName"
                    placeholder="0.1.0"
                    value={versionInfo.versionName}
                    onChange={(e) =>
                      setVersionInfo({ ...versionInfo, versionName: e.target.value })
                    }
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Semantic versioning recommended (e.g., 1.0.0)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appVersion">App Version</Label>
                  <Input
                    id="appVersion"
                    placeholder="1.0.0"
                    value={versionInfo.appVersion}
                    onChange={(e) =>
                      setVersionInfo({ ...versionInfo, appVersion: e.target.value })
                    }
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Version of your application
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'images':
        return (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Image Tags</CardTitle>
              <CardDescription>
                Set the image tag for each service
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {template.services.length === 0 ? (
                <p className="text-muted-foreground">No services defined</p>
              ) : (
                template.services.map((svc) => (
                  <div key={svc.id} className="space-y-2">
                    <Label htmlFor={`tag-${svc.name}`}>{svc.name}</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono">
                        {template.registryUrl}/{template.registryProject}/{svc.name}:
                      </span>
                      <Input
                        id={`tag-${svc.name}`}
                        placeholder="latest"
                        value={values.imageTags[svc.name] || ''}
                        onChange={(e) =>
                          setValues({
                            ...values,
                            imageTags: {
                              ...values.imageTags,
                              [svc.name]: e.target.value,
                            },
                          })
                        }
                        className="font-mono w-40"
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        );

      case 'env':
        return (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Environment Variables</CardTitle>
              <CardDescription>Set values for service environment variables</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {template.services.filter((s) => s.envVars.length > 0).length === 0 ? (
                <p className="text-muted-foreground">No environment variables defined</p>
              ) : (
                template.services
                  .filter((s) => s.envVars.length > 0)
                  .map((svc) => (
                    <div key={svc.id} className="space-y-3">
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        <Badge variant="secondary">{svc.name}</Badge>
                      </h4>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {svc.envVars.map((env) => (
                          <div key={env.name} className="space-y-1">
                            <Label htmlFor={`env-${svc.name}-${env.name}`} className="text-xs">
                              {env.name}
                            </Label>
                            <Input
                              id={`env-${svc.name}-${env.name}`}
                              placeholder="value"
                              value={values.envValues[svc.name]?.[env.name] || ''}
                              onChange={(e) =>
                                setValues({
                                  ...values,
                                  envValues: {
                                    ...values.envValues,
                                    [svc.name]: {
                                      ...values.envValues[svc.name],
                                      [env.name]: e.target.value,
                                    },
                                  },
                                })
                              }
                              className="font-mono text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
              )}
            </CardContent>
          </Card>
        );

      case 'configmaps':
        return (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>ConfigMap Values</CardTitle>
              <CardDescription>Set values for ConfigMap keys</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {template.configMaps.length === 0 ? (
                <p className="text-muted-foreground">No ConfigMaps defined</p>
              ) : (
                template.configMaps.map((cm) => (
                  <div key={cm.id} className="space-y-3">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Badge variant="secondary">{cm.name}</Badge>
                    </h4>
                    {cm.keys.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No keys defined</p>
                    ) : (
                      <div className="space-y-3">
                        {cm.keys.map((key) => (
                          <div key={key.name} className="space-y-1">
                            <Label htmlFor={`cm-${cm.name}-${key.name}`} className="text-xs">
                              {key.name}
                            </Label>
                            <Textarea
                              id={`cm-${cm.name}-${key.name}`}
                              placeholder="value"
                              value={values.configMapValues[cm.name]?.[key.name] || ''}
                              onChange={(e) =>
                                setValues({
                                  ...values,
                                  configMapValues: {
                                    ...values.configMapValues,
                                    [cm.name]: {
                                      ...values.configMapValues[cm.name],
                                      [key.name]: e.target.value,
                                    },
                                  },
                                })
                              }
                              className="font-mono text-sm"
                              rows={3}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        );

      case 'secrets':
        return (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>TLS Secret Values</CardTitle>
              <CardDescription>
                Provide certificate and key data (masked for security)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {template.tlsSecrets.length === 0 ? (
                <p className="text-muted-foreground">No TLS secrets defined</p>
              ) : (
                template.tlsSecrets.map((secret) => (
                  <div key={secret.id} className="space-y-3 p-4 rounded-lg border border-border">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Lock className="h-4 w-4 text-success" />
                      {secret.name}
                    </h4>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">tls.crt</Label>
                        <Textarea
                          placeholder="-----BEGIN CERTIFICATE-----"
                          value={values.tlsSecretValues[secret.name]?.crt || ''}
                          onChange={(e) =>
                            setValues({
                              ...values,
                              tlsSecretValues: {
                                ...values.tlsSecretValues,
                                [secret.name]: {
                                  ...values.tlsSecretValues[secret.name],
                                  crt: e.target.value,
                                },
                              },
                            })
                          }
                          className="font-mono text-xs"
                          rows={4}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">tls.key</Label>
                        <Textarea
                          placeholder="-----BEGIN PRIVATE KEY-----"
                          value={values.tlsSecretValues[secret.name]?.key || ''}
                          onChange={(e) =>
                            setValues({
                              ...values,
                              tlsSecretValues: {
                                ...values.tlsSecretValues,
                                [secret.name]: {
                                  ...values.tlsSecretValues[secret.name],
                                  key: e.target.value,
                                },
                              },
                            })
                          }
                          className="font-mono text-xs"
                          rows={4}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        );

      case 'ingress':
        return (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Ingress Hosts</CardTitle>
              <CardDescription>
                Assign domain names for each ingress
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {template.ingresses.length === 0 ? (
                <p className="text-muted-foreground">No ingresses defined</p>
              ) : (
                template.ingresses.map((ing) => (
                  <div key={ing.id} className="space-y-3">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Badge variant="secondary">{ing.name}</Badge>
                      {ing.tlsEnabled && (
                        <Badge variant="outline" className="text-xs">
                          <Lock className="mr-1 h-3 w-3" />
                          TLS
                        </Badge>
                      )}
                    </h4>
                    <div className="space-y-1">
                      <Label className="text-xs">Hosts (comma-separated)</Label>
                      <Input
                        placeholder="app.example.com, www.example.com"
                        value={values.ingressHosts[ing.name]?.join(', ') || ''}
                        onChange={(e) =>
                          setValues({
                            ...values,
                            ingressHosts: {
                              ...values.ingressHosts,
                              [ing.name]: e.target.value
                                .split(',')
                                .map((h) => h.trim())
                                .filter(Boolean),
                            },
                          })
                        }
                        className="font-mono"
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        );

      case 'options':
        return (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Options</CardTitle>
              <CardDescription>
                Override template defaults for this version
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Nginx Internal Gateway</p>
                  <p className="text-sm text-muted-foreground">
                    Template default:{' '}
                    {template.enableNginxGateway ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                <Switch
                  checked={values.enableNginxGateway ?? template.enableNginxGateway}
                  onCheckedChange={(checked) =>
                    setValues({ ...values, enableNginxGateway: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Redis Cache</p>
                  <p className="text-sm text-muted-foreground">
                    Template default: {template.enableRedis ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                <Switch
                  checked={values.enableRedis ?? template.enableRedis}
                  onCheckedChange={(checked) =>
                    setValues({ ...values, enableRedis: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        );

      case 'review':
        return (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Review & Create</CardTitle>
              <CardDescription>
                Verify your configuration before creating the version
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Chart Version:</span>
                  <span className="font-mono">{versionInfo.versionName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">App Version:</span>
                  <span className="font-mono">{versionInfo.appVersion || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Services:</span>
                  <span>{template.services.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nginx Gateway:</span>
                  <span>
                    {(values.enableNginxGateway ?? template.enableNginxGateway)
                      ? 'Enabled'
                      : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Redis:</span>
                  <span>
                    {(values.enableRedis ?? template.enableRedis)
                      ? 'Enabled'
                      : 'Disabled'}
                  </span>
                </div>
              </div>

              {Object.keys(values.imageTags).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Image Tags</h4>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(values.imageTags)
                      .filter(([, tag]) => tag)
                      .map(([svc, tag]) => (
                        <Badge key={svc} variant="secondary" className="font-mono text-xs">
                          {svc}:{tag}
                        </Badge>
                      ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  The Helm chart will be generated and downloaded automatically after creation.
                </p>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <MainLayout>
      <div className="animate-fade-in max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            className="mb-4 -ml-4"
            onClick={() => navigate(`/templates/${template.id}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Template
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Create Chart Version</h1>
          <p className="text-muted-foreground">
            {template.name} — Step {currentStep + 1} of {STEPS.length}
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <Progress value={progress} className="h-2" />
          <div className="mt-4 flex justify-between">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(index)}
                  className={`flex flex-col items-center gap-1 transition-colors ${
                    isActive
                      ? 'text-primary'
                      : isCompleted
                      ? 'text-success'
                      : 'text-muted-foreground'
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : isCompleted
                        ? 'bg-success/20 text-success'
                        : 'bg-muted'
                    }`}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className="text-xs hidden sm:block">{step.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        {renderStep()}

        {/* Navigation */}
        <div className="mt-6 flex justify-between">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          {currentStep === STEPS.length - 1 ? (
            <Button onClick={handleCreate}>
              <Download className="mr-2 h-4 w-4" />
              Create & Download
            </Button>
          ) : (
            <Button onClick={nextStep}>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
