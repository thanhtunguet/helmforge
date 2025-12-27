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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, Network, Globe, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { IngressHost, IngressTLS } from '@/types/helm';
import { Checkbox } from '@/components/ui/checkbox';

export default function EditIngress() {
  const { templateId, ingressId } = useParams();
  const navigate = useNavigate();
  const ingresses = useHelmStore((state) => state.ingresses);
  const templates = useHelmStore((state) => state.templates);
  const services = useHelmStore((state) => state.services);
  const tlsSecrets = useHelmStore((state) => state.tlsSecrets);
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

  const [hostForm, setHostForm] = useState({ hostname: '' });
  const [pathForms, setPathForms] = useState<Record<number, { serviceName: string; selectedRoute: string; customPath: string }>>({});
  const [tlsForm, setTlsForm] = useState({ secretName: '', selectedHosts: [] as string[] });

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

  const addTLS = () => {
    if (!tlsForm.secretName) {
      toast.error('TLS secret is required');
      return;
    }

    if (tlsForm.selectedHosts.length === 0) {
      toast.error('At least one host must be selected');
      return;
    }

    // Check if this secret is already used
    if (formData.tls.some(t => t.secretName === tlsForm.secretName)) {
      toast.error('This TLS secret is already configured');
      return;
    }

    setFormData({
      ...formData,
      tls: [
        ...formData.tls,
        {
          secretName: tlsForm.secretName,
          hosts: [...tlsForm.selectedHosts],
        },
      ],
    });

    setTlsForm({ secretName: '', selectedHosts: [] });
  };

  const removeTLS = (index: number) => {
    setFormData({
      ...formData,
      tls: formData.tls.filter((_, i) => i !== index),
    });
  };

  const toggleTLSHost = (hostname: string) => {
    const isSelected = tlsForm.selectedHosts.includes(hostname);
    if (isSelected) {
      setTlsForm({
        ...tlsForm,
        selectedHosts: tlsForm.selectedHosts.filter(h => h !== hostname),
      });
    } else {
      setTlsForm({
        ...tlsForm,
        selectedHosts: [...tlsForm.selectedHosts, hostname],
      });
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
      await updateIngress(ingress.id, formData);
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
                  <p className="text-xs text-muted-foreground">Configure HTTPS for hosts</p>
                </div>
                <Badge variant="secondary">{formData.tls.length} config(s)</Badge>
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
                <>
                  {/* Add TLS Form */}
                  <Card className="border-2">
                    <CardContent className="pt-4 space-y-3">
                      <div className="space-y-2">
                        <Label>TLS Secret</Label>
                        <Select
                          value={tlsForm.secretName}
                          onValueChange={(value) =>
                            setTlsForm({ ...tlsForm, secretName: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select TLS secret" />
                          </SelectTrigger>
                          <SelectContent>
                            {templateTlsSecrets
                              .filter(s => !formData.tls.some(t => t.secretName === s.name))
                              .map((secret) => (
                                <SelectItem key={secret.id} value={secret.name}>
                                  {secret.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Select Hosts for This TLS Secret</Label>
                        <div className="rounded-lg border border-border p-3 space-y-2 max-h-40 overflow-y-auto">
                          {formData.hosts.map((host) => (
                            <div key={host.hostname} className="flex items-center space-x-2">
                              <Checkbox
                                id={`tls-host-${host.hostname}`}
                                checked={tlsForm.selectedHosts.includes(host.hostname)}
                                onCheckedChange={() => toggleTLSHost(host.hostname)}
                              />
                              <Label
                                htmlFor={`tls-host-${host.hostname}`}
                                className="text-sm font-mono cursor-pointer flex-1"
                              >
                                {host.hostname}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full"
                        onClick={addTLS}
                        disabled={!tlsForm.secretName || tlsForm.selectedHosts.length === 0}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add TLS Configuration
                      </Button>
                    </CardContent>
                  </Card>

                  {/* TLS Configurations List */}
                  {formData.tls.length > 0 && (
                    <div className="space-y-2">
                      {formData.tls.map((tlsConfig, index) => (
                        <Card key={index} className="border-primary/20">
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Lock className="h-4 w-4 text-primary" />
                                  <span className="font-mono font-semibold text-sm">
                                    {tlsConfig.secretName}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {tlsConfig.hosts.map((hostname) => (
                                    <Badge key={hostname} variant="outline" className="font-mono text-xs">
                                      {hostname}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => removeTLS(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
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
    </MainLayout>
  );
}
