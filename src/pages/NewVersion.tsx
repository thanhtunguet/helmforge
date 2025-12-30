import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
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
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { downloadChart } from '@/lib/helm-generator';
import { IngressRouteTree } from '@/components/template/IngressRouteTree';
import { MarkdownEditor } from '@/components/ui/markdown-editor';

const STEPS = [
  { id: 'info', label: 'Version Info', icon: Tag },
  { id: 'images', label: 'Image Tags', icon: Tag },
  { id: 'env', label: 'Environment', icon: Variable },
  { id: 'configmaps', label: 'ConfigMaps', icon: FileJson },
  { id: 'secrets', label: 'Secrets', icon: Lock },
  { id: 'ingress', label: 'Ingress Hosts', icon: Network },
  { id: 'options', label: 'Options', icon: Settings },
  { id: 'release-notes', label: 'Release Notes', icon: FileText },
  { id: 'review', label: 'Review', icon: Check },
];

export default function NewVersion() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(0);

  const getTemplateWithRelations = useHelmStore(
    (state) => state.getTemplateWithRelations
  );
  const addChartVersion = useHelmStore((state) => state.addChartVersion);

  const template = templateId ? getTemplateWithRelations(templateId) : undefined;

  // Get initial values from location state if available (from upgrade button)
  const initialValuesFromState = location.state?.initialValues as ChartVersionValues | undefined;
  const initialVersionInfoFromState = location.state?.initialVersionInfo as { versionName: string; appVersion: string } | undefined;

  const [versionInfo, setVersionInfo] = useState({
    versionName: initialVersionInfoFromState?.versionName || '0.1.0',
    appVersion: initialVersionInfoFromState?.appVersion || '1.0.0',
    releaseNotes: '',
  });

  const [values, setValues] = useState<ChartVersionValues>({
    imageTags: {},
    envValues: {},
    configMapValues: {},
    tlsSecretValues: {},
    opaqueSecretValues: {},
    enableNginxGateway: undefined,
    enableRedis: undefined,
  });

  // Track if we've initialized to prevent infinite loops
  const hasInitialized = useRef(false);
  const initializedTemplateId = useRef<string | undefined>(undefined);

  // Initialize values with either upgrade values or default values from template
  useEffect(() => {
    if (!template) return;
    
    // Reset initialization if template changed
    if (initializedTemplateId.current !== template.id) {
      hasInitialized.current = false;
      initializedTemplateId.current = template.id;
    }
    
    if (hasInitialized.current) return;

    // Check for initial values from location state (from upgrade button)
    // Read directly from location.state to avoid dependency issues
    const initialValuesFromLocation = location.state?.initialValues as ChartVersionValues | undefined;
    
    // If we have initial values from upgrade, use them
    if (initialValuesFromLocation) {
      setValues({
        ...initialValuesFromLocation,
        // Don't copy registryPassword for security
        registryPassword: undefined,
      });
      hasInitialized.current = true;
      return;
    }

    // Otherwise, initialize with default values from template
    const initialValues: ChartVersionValues = {
      imageTags: {},
      envValues: {},
      configMapValues: {},
      tlsSecretValues: {},
      opaqueSecretValues: {},
      enableNginxGateway: undefined,
      enableRedis: undefined,
    };

    // Initialize ConfigMap values with defaults
    template.configMaps.forEach((cm) => {
      initialValues.configMapValues[cm.name] = {};
      cm.keys.forEach((key) => {
        if (key.defaultValue) {
          initialValues.configMapValues[cm.name][key.name] = key.defaultValue;
        }
      });
    });

    // Initialize environment variable values with defaults
    template.services.forEach((svc) => {
      initialValues.envValues[svc.name] = {};
      svc.envVars.forEach((env) => {
        if (env.defaultValue) {
          initialValues.envValues[svc.name][env.name] = env.defaultValue;
        }
      });
    });

    // Initialize TLS secret values with defaults
    template.tlsSecrets.forEach((secret) => {
      if (secret.cert || secret.key) {
        initialValues.tlsSecretValues[secret.name] = {
          crt: secret.cert || '',
          key: secret.key || '',
        };
      }
    });

    // Initialize opaque secret values with defaults
    template.opaqueSecrets.forEach((secret) => {
      initialValues.opaqueSecretValues[secret.name] = {};
      secret.keys.forEach((key) => {
        if (key.defaultValue) {
          initialValues.opaqueSecretValues[secret.name][key.name] = key.defaultValue;
        }
      });
    });

    setValues(initialValues);
    hasInitialized.current = true;
  }, [template]); // Only depend on template, not initialValuesFromState

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

    if (!values.registryPassword || !values.registryPassword.trim()) {
      toast.error('Registry password is required');
      return;
    }

    const version: ChartVersion = {
      id: crypto.randomUUID(),
      templateId: template.id,
      versionName: versionInfo.versionName,
      appVersion: versionInfo.appVersion || undefined,
      releaseNotes: versionInfo.releaseNotes || undefined,
      values,
      createdAt: new Date().toISOString(),
    };

    try {
      await addChartVersion(version);
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
    } catch (error) {
      // Error is already handled in the store
    }
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
              <div className="space-y-2 pt-2 border-t border-border">
                <Label htmlFor="registryPassword">Registry Password *</Label>
                <Input
                  id="registryPassword"
                  type="password"
                  placeholder="Enter registry password"
                  value={values.registryPassword || ''}
                  onChange={(e) =>
                    setValues({ ...values, registryPassword: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Password for accessing the container registry ({template.registryUrl})
                </p>
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
                              placeholder={env.defaultValue || 'value'}
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
                            {env.defaultValue && !values.envValues[svc.name]?.[env.name] && (
                              <p className="text-xs text-muted-foreground">
                                Default: {env.defaultValue}
                              </p>
                            )}
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
                              placeholder={key.defaultValue || 'value'}
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
                            {key.defaultValue && !values.configMapValues[cm.name]?.[key.name] && (
                              <p className="text-xs text-muted-foreground">
                                Default: {key.defaultValue}
                              </p>
                            )}
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
              <CardTitle>Secret Values</CardTitle>
              <CardDescription>
                Provide values for TLS certificates and opaque secrets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* TLS Secrets */}
              {template.tlsSecrets.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    TLS Secrets
                  </h3>
                  {template.tlsSecrets.map((secret) => (
                    <div key={secret.id} className="space-y-3 p-4 rounded-lg border border-border">
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        <Badge variant="secondary">{secret.name}</Badge>
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
                  ))}
                </div>
              )}

              {/* Opaque Secrets */}
              {template.opaqueSecrets.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Opaque Secrets
                  </h3>
                  {template.opaqueSecrets.map((secret) => (
                    <div key={secret.id} className="space-y-3 p-4 rounded-lg border border-border">
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        <Badge variant="secondary">{secret.name}</Badge>
                      </h4>
                      {secret.keys.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No keys defined</p>
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {secret.keys.map((key) => (
                            <div key={key.name} className="space-y-1">
                              <Label htmlFor={`secret-${secret.name}-${key.name}`} className="text-xs">
                                {key.name}
                              </Label>
                              {key.description && (
                                <p className="text-xs text-muted-foreground mb-1">
                                  {key.description}
                                </p>
                              )}
                              <Input
                                id={`secret-${secret.name}-${key.name}`}
                                type="password"
                                placeholder={key.defaultValue || 'Enter secret value'}
                                value={values.opaqueSecretValues[secret.name]?.[key.name] || ''}
                                onChange={(e) =>
                                  setValues({
                                    ...values,
                                    opaqueSecretValues: {
                                      ...values.opaqueSecretValues,
                                      [secret.name]: {
                                        ...values.opaqueSecretValues[secret.name],
                                        [key.name]: e.target.value,
                                      },
                                    },
                                  })
                                }
                                className="font-mono text-sm"
                              />
                              {key.defaultValue && !values.opaqueSecretValues[secret.name]?.[key.name] && (
                                <p className="text-xs text-muted-foreground">
                                  Default: {key.defaultValue}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {template.tlsSecrets.length === 0 && template.opaqueSecrets.length === 0 && (
                <p className="text-muted-foreground">No secrets defined</p>
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
                      {ing.tls && ing.tls.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          <Lock className="mr-1 h-3 w-3" />
                          TLS
                        </Badge>
                      )}
                    </h4>
                    <div className="space-y-2">
                      {ing.hosts.map((host, idx) => (
                        <div key={idx} className="rounded-lg bg-muted/50 p-3">
                          <p className="font-mono text-sm font-semibold mb-2">{host.hostname}</p>
                          <IngressRouteTree routes={host.paths} />
                        </div>
                      ))}
                      {ing.hosts.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          No hosts configured. Configure hosts in the ingress settings.
                        </p>
                      )}
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

      case 'release-notes':
        return (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Release Notes</CardTitle>
              <CardDescription>
                Add release notes for this version (optional). Supports Markdown.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MarkdownEditor
                value={versionInfo.releaseNotes}
                onChange={(val) => setVersionInfo({ ...versionInfo, releaseNotes: val })}
                height="400px"
                placeholder="## What's New

- Feature 1
- Feature 2

## Bug Fixes

- Fix 1
- Fix 2

## Breaking Changes

- None
"
              />
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
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Registry Password:</span>
                  <span>
                    {values.registryPassword && values.registryPassword.trim()
                      ? '✓ Provided'
                      : '✗ Missing'}
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
      <div className="animate-fade-in w-full">
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
