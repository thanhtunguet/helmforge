import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useHelmStore } from '@/lib/store';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Plus, Trash2, Network, Globe, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { IngressHost, IngressTLS } from '@/types/helm';
import { validateTlsInputs } from '@/lib/tls-utils';

export default function EditIngress() {
  const { templateId, ingressId } = useParams();
  const navigate = useNavigate();
  const ingresses = useHelmStore((state) => state.ingresses);
  const templates = useHelmStore((state) => state.templates);
  const services = useHelmStore((state) => state.services);
  const tlsSecrets = useHelmStore((state) => state.tlsSecrets);
  const addTLSSecret = useHelmStore((state) => state.addTLSSecret);
  const updateIngress = useHelmStore((state) => state.updateIngress);

  const ingress = ingresses.find((i) => i.id === ingressId && i.templateId === templateId);
  const template = templates.find((t) => t.id === templateId);

  // Get services for this template
  const templateServices = services.filter((s) => s.templateId === templateId);

  const [formData, setFormData] = useState({
    name: '',
    mode: 'nginx-gateway' as 'nginx-gateway' | 'direct-services',
    hosts: [] as IngressHost[],
    tls: [] as IngressTLS[],
  });

  // Per-host TLS secret mapping: hostname -> secretName (or empty string for no TLS)
  const [hostTlsMapping, setHostTlsMapping] = useState<Record<string, string>>({});

  const [hostForm, setHostForm] = useState({ hostname: '' });
  const [pathForms, setPathForms] = useState<Record<number, { serviceName: string; selectedRoute: string; customPath: string }>>({});
  const [tlsSecretDialogOpen, setTlsSecretDialogOpen] = useState(false);
  const [tlsSecretFormData, setTlsSecretFormData] = useState({ name: '', cert: '', key: '' });

  useEffect(() => {
    if (ingress && template) {
      // Ensure hosts array exists (migration from old structure)
      const hosts = Array.isArray(ingress.hosts) ? ingress.hosts : [];
      const tls = Array.isArray(ingress.tls) ? ingress.tls : [];

      setFormData({
        name: ingress.name,
        mode: ingress.mode,
        hosts: hosts,
        tls: tls,
      });

      // Build per-host TLS mapping from existing TLS config
      const mapping: Record<string, string> = {};
      tls.forEach((tlsConfig) => {
        tlsConfig.hosts.forEach((hostname) => {
          mapping[hostname] = tlsConfig.secretName;
        });
      });
      setHostTlsMapping(mapping);
    }
  }, [ingress, template]);

  if (!ingress || !template) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <h2 className="text-xl font-semibold">Ingress not found</h2>
          <p className="text-muted-foreground mb-4">
            The requested Ingress does not exist.
          </p>
          <Button variant="outline" onClick={() => navigate(`/templates/${templateId}?tab=ingresses`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Template
          </Button>
        </div>
      </MainLayout>
    );
  }

  const addHost = () => {
    if (!hostForm.hostname.trim()) {
      toast.error('Hostname is required');
      return;
    }

    if (formData.hosts.some(h => h.hostname === hostForm.hostname)) {
      toast.error('This hostname already exists');
      return;
    }

    setFormData({
      ...formData,
      hosts: [
        ...formData.hosts,
        {
          hostname: hostForm.hostname.trim(),
          paths: [],
        },
      ],
    });
    setHostForm({ hostname: '' });
  };

  const removeHost = (index: number) => {
    const newPathForms = { ...pathForms };
    delete newPathForms[index];

    setFormData({
      ...formData,
      hosts: formData.hosts.filter((_, i) => i !== index),
    });
    setPathForms(newPathForms);
  };

  const addPath = (hostIndex: number) => {
    const pathForm = pathForms[hostIndex] || { serviceName: '', selectedRoute: '', customPath: '' };

    if (!pathForm.serviceName) {
      toast.error('Service is required');
      return;
    }

    const isCustomRoute = pathForm.selectedRoute === '__custom__';
    const path = isCustomRoute ? pathForm.customPath : pathForm.selectedRoute;

    if (!path) {
      toast.error('Route path is required');
      return;
    }

    const formattedPath = path.startsWith('/') ? path : `/${path}`;

    // Check for duplicate paths in this host
    if (formData.hosts[hostIndex].paths.some(p => p.path === formattedPath)) {
      toast.error('This path already exists for this host');
      return;
    }

    const updatedHosts = [...formData.hosts];
    updatedHosts[hostIndex] = {
      ...updatedHosts[hostIndex],
      paths: [
        ...updatedHosts[hostIndex].paths,
        {
          path: formattedPath,
          serviceName: pathForm.serviceName,
        },
      ],
    };

    setFormData({
      ...formData,
      hosts: updatedHosts,
    });

    // Reset path form for this host
    setPathForms({
      ...pathForms,
      [hostIndex]: { serviceName: '', selectedRoute: '', customPath: '' },
    });
  };

  const removePath = (hostIndex: number, pathIndex: number) => {
    const updatedHosts = [...formData.hosts];
    updatedHosts[hostIndex] = {
      ...updatedHosts[hostIndex],
      paths: updatedHosts[hostIndex].paths.filter((_, i) => i !== pathIndex),
    };

    setFormData({
      ...formData,
      hosts: updatedHosts,
    });
  };

  // Update TLS secret for a specific host
  const setHostTls = (hostname: string, secretName: string) => {
    setHostTlsMapping((prev) => ({
      ...prev,
      [hostname]: secretName,
    }));
  };

  // Build TLS array from per-host mapping (called before save)
  const buildTlsFromMapping = (): IngressTLS[] => {
    // Group hosts by secret name
    const secretToHosts: Record<string, string[]> = {};
    Object.entries(hostTlsMapping).forEach(([hostname, secretName]) => {
      if (secretName) {
        if (!secretToHosts[secretName]) {
          secretToHosts[secretName] = [];
        }
        secretToHosts[secretName].push(hostname);
      }
    });

    // Convert to TLS array format
    return Object.entries(secretToHosts).map(([secretName, hosts]) => ({
      secretName,
      hosts,
    }));
  };

  const openNewTlsSecret = () => {
    setTlsSecretFormData({ name: '', cert: '', key: '' });
    setTlsSecretDialogOpen(true);
  };

  const handleTlsSecretSubmit = async () => {
    if (!tlsSecretFormData.name.trim()) {
      toast.error('Secret name is required');
      return;
    }

    const validation = validateTlsInputs(tlsSecretFormData.cert, tlsSecretFormData.key);
    if (validation.errors.length > 0) {
      validation.errors.forEach((message) => toast.error(message));
      return;
    }

    const certValue = validation.cert ?? '';
    const keyValue = validation.key ?? '';
    const notBeforeValue = validation.notBefore ?? '';
    const expiresAtValue = validation.expiresAt ?? '';

    try {
      await addTLSSecret({
        id: crypto.randomUUID(),
        templateId: template.id,
        name: tlsSecretFormData.name,
        type: 'tls',
        cert: certValue,
        key: keyValue,
        notBefore: notBeforeValue,
        expiresAt: expiresAtValue,
      });
      toast.success('TLS secret added');
      setTlsSecretDialogOpen(false);
    } catch (error) {
      // Error is already handled in the store
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Ingress name is required');
      return;
    }

    if (formData.hosts.length === 0) {
      toast.error('At least one host is required');
      return;
    }

    for (let i = 0; i < formData.hosts.length; i++) {
      if (formData.hosts[i].paths.length === 0) {
        toast.error(`Host "${formData.hosts[i].hostname}" must have at least one path`);
        return;
      }
    }

    try {
      // Build TLS config from per-host mapping
      const tlsConfig = buildTlsFromMapping();
      await updateIngress(ingress.id, {
        ...formData,
        tls: tlsConfig,
      });
      toast.success('Ingress updated');
      navigate(`/templates/${templateId}?tab=ingresses`);
    } catch (error) {
      // Error is already handled in the store
    }
  };

  // Get TLS secrets for this template
  const templateTlsSecrets = tlsSecrets.filter((s) => s.templateId === templateId);

  return (
    <MainLayout>
      <div className="animate-fade-in max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            className="mb-4 -ml-4"
            onClick={() => navigate(`/templates/${templateId}?tab=ingresses`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Template
          </Button>

          <div className="flex items-center gap-3">
            <Network className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Edit Ingress</h1>
              <p className="mt-1 text-muted-foreground">
                Configure ingress rules for external traffic with host-specific routing
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Ingress Details</CardTitle>
            <CardDescription>
              Configure hosts and their routing rules for external traffic
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Ingress Name *</Label>
                <Input
                  id="name"
                  placeholder="main-ingress"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mode">Routing Mode</Label>
                <Select
                  value={formData.mode}
                  onValueChange={(value: 'nginx-gateway' | 'direct-services') =>
                    setFormData({ ...formData, mode: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nginx-gateway">Via Nginx Gateway</SelectItem>
                    <SelectItem value="direct-services">Direct to Services</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">TLS Configuration</Label>
                  <p className="text-xs text-muted-foreground">Configure HTTPS for each host</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={openNewTlsSecret}>
                    <Plus className="h-3 w-3 mr-1" />
                    New TLS Secret
                  </Button>
                  <Badge variant="secondary">
                    {Object.values(hostTlsMapping).filter(Boolean).length} host(s) with TLS
                  </Badge>
                </div>
              </div>

              {templateTlsSecrets.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                  No TLS secrets available. Create a TLS secret first to enable HTTPS.
                </div>
              ) : formData.hosts.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                  Add hosts first before configuring TLS.
                </div>
              ) : (
                <Card className="border-2">
                  <CardContent className="pt-4 space-y-3">
                    <div className="space-y-3">
                      {formData.hosts.map((host) => (
                        <div key={host.hostname} className="flex items-center gap-3">
                          <div className="flex items-center gap-2 min-w-[200px]">
                            {hostTlsMapping[host.hostname] ? (
                              <Lock className="h-4 w-4 text-primary" />
                            ) : (
                              <Globe className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="font-mono text-sm">{host.hostname}</span>
                          </div>
                          <Select
                            value={hostTlsMapping[host.hostname] || ''}
                            onValueChange={(value) => setHostTls(host.hostname, value)}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="No TLS (HTTP only)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">No TLS (HTTP only)</SelectItem>
                              {templateTlsSecrets.map((secret) => (
                                <SelectItem key={secret.id} value={secret.name}>
                                  <div className="flex items-center gap-2">
                                    <Lock className="h-3 w-3" />
                                    {secret.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Hosts and Routes *</Label>
                <Badge variant="secondary">{formData.hosts.length} host(s)</Badge>
              </div>

              {/* Add Host Form */}
              <div className="flex gap-2">
                <Input
                  placeholder="app.example.com"
                  value={hostForm.hostname}
                  onChange={(e) => setHostForm({ hostname: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addHost();
                    }
                  }}
                  className="font-mono"
                />
                <Button type="button" onClick={addHost}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Host
                </Button>
              </div>

              {/* Hosts List */}
              <div className="space-y-4">
                {formData.hosts.map((host, hostIndex) => (
                  <Card key={hostIndex} className="border-2">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-primary" />
                          <span className="font-mono font-semibold">{host.hostname}</span>
                          <Badge variant="outline">{host.paths.length} path(s)</Badge>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeHost(hostIndex)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Add Path Form */}
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Select
                            value={pathForms[hostIndex]?.serviceName || ''}
                            onValueChange={(value) =>
                              setPathForms({
                                ...pathForms,
                                [hostIndex]: { serviceName: value, selectedRoute: '', customPath: '' },
                              })
                            }
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Select Service" />
                            </SelectTrigger>
                            <SelectContent>
                              {templateServices.map((svc) => (
                                <SelectItem key={svc.id} value={svc.name}>
                                  {svc.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={pathForms[hostIndex]?.selectedRoute || ''}
                            onValueChange={(value) =>
                              setPathForms({
                                ...pathForms,
                                [hostIndex]: {
                                  ...pathForms[hostIndex],
                                  serviceName: pathForms[hostIndex]?.serviceName || '',
                                  selectedRoute: value,
                                  customPath: ''
                                },
                              })
                            }
                            disabled={!pathForms[hostIndex]?.serviceName}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Select Route" />
                            </SelectTrigger>
                            <SelectContent>
                              {templateServices
                                .find((s) => s.name === pathForms[hostIndex]?.serviceName)
                                ?.routes.map((route, idx) => (
                                  <SelectItem key={idx} value={route.path}>
                                    {route.path}
                                  </SelectItem>
                                ))}
                              <SelectItem value="__custom__">Custom Route...</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            onClick={() => addPath(hostIndex)}
                            disabled={!pathForms[hostIndex]?.serviceName}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        {pathForms[hostIndex]?.selectedRoute === '__custom__' && (
                          <Input
                            placeholder="/custom-path"
                            value={pathForms[hostIndex]?.customPath || ''}
                            onChange={(e) =>
                              setPathForms({
                                ...pathForms,
                                [hostIndex]: {
                                  ...pathForms[hostIndex],
                                  customPath: e.target.value
                                },
                              })
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addPath(hostIndex);
                              }
                            }}
                            className="font-mono"
                          />
                        )}
                      </div>

                      {/* Paths List */}
                      {host.paths.length > 0 && (
                        <div className="space-y-2 pt-2 border-t">
                          {host.paths.map((pathItem, pathIndex) => (
                            <div
                              key={pathIndex}
                              className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2"
                            >
                              <span className="font-mono text-sm">
                                {pathItem.path} → {pathItem.serviceName}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => removePath(hostIndex, pathIndex)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {formData.hosts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Globe className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No hosts configured yet. Add a host to get started.</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => navigate(`/templates/${templateId}?tab=ingresses`)}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                Update Ingress
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={tlsSecretDialogOpen} onOpenChange={setTlsSecretDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add TLS Secret</DialogTitle>
            <DialogDescription>
              Create a TLS secret for Ingress HTTPS termination.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ingress-tls-name">Secret Name *</Label>
              <Input
                id="ingress-tls-name"
                placeholder="wildcard-tls"
                value={tlsSecretFormData.name}
                onChange={(e) => setTlsSecretFormData({ ...tlsSecretFormData, name: e.target.value })}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ingress-tls-cert">Certificate (tls.crt)</Label>
              <Textarea
                id="ingress-tls-cert"
                placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                value={tlsSecretFormData.cert}
                onChange={(e) => setTlsSecretFormData({ ...tlsSecretFormData, cert: e.target.value })}
                className="font-mono text-xs min-h-[120px]"
              />
              <p className="text-xs text-muted-foreground">
                Paste the PEM-encoded certificate or leave empty to set per version
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ingress-tls-key">Private Key (tls.key)</Label>
              <Textarea
                id="ingress-tls-key"
                placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
                value={tlsSecretFormData.key}
                onChange={(e) => setTlsSecretFormData({ ...tlsSecretFormData, key: e.target.value })}
                className="font-mono text-xs min-h-[120px]"
              />
              <p className="text-xs text-muted-foreground">
                Paste the PEM-encoded private key or leave empty to set per version
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTlsSecretDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleTlsSecretSubmit}>
              Add TLS Secret
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
