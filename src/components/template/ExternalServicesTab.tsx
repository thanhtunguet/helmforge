import { useState } from 'react';
import { useHelmStore } from '@/lib/store';
import { TemplateWithRelations, Service, EnvVarSchema, ConfigMapEnvSource, SecretEnvSource, ServicePort } from '@/types/helm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, X, Check, Globe } from 'lucide-react';
import { toast } from 'sonner';

interface ExternalServicesTabProps {
  template: TemplateWithRelations;
  readOnly?: boolean;
}

interface FormPort {
  name: string;
  port: string;
}

interface FormData {
  name: string;
  image: string;
  envVars: EnvVarSchema[];
  healthCheckEnabled: boolean;
  livenessPath: string;
  readinessPath: string;
  configMapEnvSources: ConfigMapEnvSource[];
  secretEnvSources: SecretEnvSource[];
  customPorts: FormPort[];
  replicas: number;
  useDaemonSet: boolean;
}

export function ExternalServicesTab({ template, readOnly = false }: ExternalServicesTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<Service | null>(null);
  
  const addService = useHelmStore((state) => state.addService);
  const updateService = useHelmStore((state) => state.updateService);
  const deleteService = useHelmStore((state) => state.deleteService);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    image: '',
    envVars: [],
    healthCheckEnabled: false,
    livenessPath: '/health',
    readinessPath: '/ready',
    configMapEnvSources: [],
    secretEnvSources: [],
    customPorts: [],
    replicas: 1,
    useDaemonSet: false,
  });

  const openNew = () => {
    setEditingService(null);
    setFormData({
      name: '',
      image: '',
      envVars: [],
      healthCheckEnabled: false,
      livenessPath: '/health',
      readinessPath: '/ready',
      configMapEnvSources: [],
      secretEnvSources: [],
      customPorts: [],
      replicas: 1,
      useDaemonSet: false,
    });
    setDialogOpen(true);
  };

  const openEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      image: service.image || '',
      envVars: [...service.envVars],
      healthCheckEnabled: service.healthCheckEnabled ?? false,
      livenessPath: service.livenessPath,
      readinessPath: service.readinessPath,
      configMapEnvSources: service.configMapEnvSources ? [...service.configMapEnvSources] : [],
      secretEnvSources: service.secretEnvSources ? [...service.secretEnvSources] : [],
      customPorts: (service.customPorts || []).map((port) => ({
        name: port.name,
        port: `${port.port}`,
      })),
      replicas: service.replicas ?? 1,
      useDaemonSet: service.useDaemonSet ?? false,
    });
    setDialogOpen(true);
  };

  const addEnvVar = () => {
    setFormData(prev => ({
      ...prev,
      envVars: [...prev.envVars, { name: '', required: false, defaultValue: '' }]
    }));
  };

  const updateEnvVar = (index: number, field: 'name' | 'defaultValue', value: string) => {
    setFormData(prev => ({
      ...prev,
      envVars: prev.envVars.map((e, i) => 
        i === index ? { ...e, [field]: value } : e
      )
    }));
  };

  const removeEnvVar = (index: number) => {
    setFormData(prev => ({
      ...prev,
      envVars: prev.envVars.filter((_, i) => i !== index)
    }));
  };

  const addCustomPort = () => {
    setFormData(prev => ({
      ...prev,
      customPorts: [...prev.customPorts, { name: '', port: '' }]
    }));
  };

  const updateCustomPort = (index: number, field: keyof FormPort, value: string) => {
    setFormData(prev => ({
      ...prev,
      customPorts: prev.customPorts.map((port, i) =>
        i === index ? { ...port, [field]: value } : port
      )
    }));
  };

  const removeCustomPort = (index: number) => {
    setFormData(prev => ({
      ...prev,
      customPorts: prev.customPorts.filter((_, i) => i !== index)
    }));
  };

  const addConfigMapEnvSource = () => {
    setFormData(prev => ({
      ...prev,
      configMapEnvSources: [...prev.configMapEnvSources, { configMapName: '' }]
    }));
  };

  const updateConfigMapEnvSource = (index: number, configMapName: string) => {
    setFormData(prev => ({
      ...prev,
      configMapEnvSources: prev.configMapEnvSources.map((c, i) => 
        i === index ? { configMapName } : c
      )
    }));
  };

  const removeConfigMapEnvSource = (index: number) => {
    setFormData(prev => ({
      ...prev,
      configMapEnvSources: prev.configMapEnvSources.filter((_, i) => i !== index)
    }));
  };

  const addSecretEnvSource = () => {
    setFormData(prev => ({
      ...prev,
      secretEnvSources: [...prev.secretEnvSources, { secretName: '' }]
    }));
  };

  const updateSecretEnvSource = (index: number, secretName: string) => {
    setFormData(prev => ({
      ...prev,
      secretEnvSources: prev.secretEnvSources.map((s, i) => 
        i === index ? { secretName } : s
      )
    }));
  };

  const removeSecretEnvSource = (index: number) => {
    setFormData(prev => ({
      ...prev,
      secretEnvSources: prev.secretEnvSources.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Service name is required');
      return;
    }

    if (!formData.image.trim()) {
      toast.error('Docker image is required');
      return;
    }

    const envVars = formData.envVars.filter(e => e.name.trim());
    const configMapEnvSources = formData.configMapEnvSources.filter(c => c.configMapName);
    const secretEnvSources = formData.secretEnvSources.filter(s => s.secretName);
    const customPorts: ServicePort[] = formData.customPorts
      .map((port) => ({
        name: port.name.trim(),
        port: Number(port.port),
      }))
      .filter((port) => port.name && Number.isFinite(port.port) && port.port > 0);

    try {
      if (editingService) {
        await updateService(editingService.id, {
          name: formData.name,
          image: formData.image,
          envVars,
          healthCheckEnabled: formData.healthCheckEnabled,
          livenessPath: formData.livenessPath,
          readinessPath: formData.readinessPath,
          configMapEnvSources,
          secretEnvSources,
          useCustomPorts: customPorts.length > 0,
          customPorts,
          replicas: formData.replicas,
          useDaemonSet: formData.useDaemonSet,
        });
        toast.success('External service updated');
      } else {
        const service: Service = {
          id: crypto.randomUUID(),
          templateId: template.id,
          name: formData.name,
          image: formData.image,
          routes: [], // External services don't use routes (nginx gateway)
          envVars,
          healthCheckEnabled: formData.healthCheckEnabled,
          livenessPath: formData.livenessPath,
          readinessPath: formData.readinessPath,
          configMapEnvSources,
          secretEnvSources,
          useStatefulSet: false,
          useCustomPorts: customPorts.length > 0,
          customPorts,
          isExternal: true,
          replicas: formData.replicas,
          useDaemonSet: formData.useDaemonSet,
        };
        await addService(service);
        toast.success('External service added');
      }

      setDialogOpen(false);
    } catch (error) {
      // Error is already handled in the store
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await deleteService(deleteId);
        toast.success('External service deleted');
        setDeleteId(null);
      } catch (error) {
        // Error is already handled in the store
      }
    }
  };

  // Combine opaque secrets for selection
  const availableSecrets = template.opaqueSecrets || [];
  
  // Filter to show only external services
  const externalServices = template.services.filter(s => s.isExternal);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">External Services</h3>
          <p className="text-sm text-muted-foreground">
            Add services from DockerHub or other public registries
          </p>
        </div>
        {!readOnly && (
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" />
            Add External Service
          </Button>
        )}
      </div>

      {externalServices.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Globe className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No external services defined yet</p>
            {!readOnly && (
              <Button variant="outline" onClick={openNew}>
                <Plus className="mr-2 h-4 w-4" />
                Add your first external service
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Image</TableHead>
                <TableHead>Ports</TableHead>
                <TableHead>Replicas</TableHead>
                <TableHead>Health Check</TableHead>
                <TableHead>Type</TableHead>
                {!readOnly && <TableHead className="w-[100px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {externalServices.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="font-mono font-medium">
                    <div className="flex items-center gap-2">
                      {service.name}
                      <Badge className="text-xs bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20">
                        External
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {service.image || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {service.customPorts && service.customPorts.length > 0 ? (
                        service.customPorts.slice(0, 3).map((p, i) => (
                          <Badge key={i} variant="secondary" className="font-mono text-xs">
                            {p.name}:{p.port}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                      {service.customPorts && service.customPorts.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{service.customPorts.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {service.useDaemonSet ? (
                      <Badge variant="outline" className="text-xs">DaemonSet</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">{service.replicas}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {service.healthCheckEnabled ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell>
                    {service.useDaemonSet ? (
                      <Badge className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
                        DaemonSet
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Deployment</Badge>
                    )}
                  </TableCell>
                  {!readOnly && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(service)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setDeleteId(service.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingService ? 'Edit External Service' : 'Add External Service'}
            </DialogTitle>
            <DialogDescription>
              Add a service from DockerHub or other public registries
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Service Name *</Label>
              <Input
                id="name"
                placeholder="redis"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Must be DNS-safe (lowercase, alphanumeric, hyphens)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="image">Docker Image *</Label>
              <Input
                id="image"
                placeholder="nginx:latest or redis:7.2-alpine"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Full image name from DockerHub or another registry (e.g., nginx:latest, redis:7.2)
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="replicas">Replicas</Label>
                <Input
                  id="replicas"
                  type="number"
                  min="1"
                  value={formData.replicas}
                  onChange={(e) => setFormData({ ...formData, replicas: parseInt(e.target.value) || 1 })}
                  disabled={formData.useDaemonSet}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Number of pod replicas (ignored for DaemonSet)
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Deploy as DaemonSet</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Run one pod on each node
                </p>
              </div>
              <Switch
                checked={formData.useDaemonSet}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, useDaemonSet: checked })
                }
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Ports (Optional)</Label>
                <Button type="button" variant="outline" size="sm" onClick={addCustomPort}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Port
                </Button>
              </div>
              {formData.customPorts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No ports defined - service will not expose any ports</p>
              ) : (
                <div className="space-y-2">
                  {formData.customPorts.map((port, index) => (
                    <div key={`${port.name}-${index}`} className="flex items-center gap-2">
                      <Input
                        placeholder="http"
                        value={port.name}
                        onChange={(e) => updateCustomPort(index, 'name', e.target.value)}
                        className="font-mono flex-1"
                      />
                      <Input
                        type="number"
                        min="1"
                        placeholder="80"
                        value={port.port}
                        onChange={(e) => updateCustomPort(index, 'port', e.target.value)}
                        className="font-mono w-32"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive shrink-0"
                        onClick={() => removeCustomPort(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Health Check</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Enable liveness and readiness probes
                </p>
              </div>
              <Switch
                checked={formData.healthCheckEnabled}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, healthCheckEnabled: checked })
                }
              />
            </div>

            {formData.healthCheckEnabled && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="livenessPath">Liveness Path</Label>
                  <Input
                    id="livenessPath"
                    placeholder="/health"
                    value={formData.livenessPath}
                    onChange={(e) =>
                      setFormData({ ...formData, livenessPath: e.target.value })
                    }
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="readinessPath">Readiness Path</Label>
                  <Input
                    id="readinessPath"
                    placeholder="/ready"
                    value={formData.readinessPath}
                    onChange={(e) =>
                      setFormData({ ...formData, readinessPath: e.target.value })
                    }
                    className="font-mono"
                  />
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Environment Variables</Label>
                <Button type="button" variant="outline" size="sm" onClick={addEnvVar}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Variable
                </Button>
              </div>
              {formData.envVars.length === 0 ? (
                <p className="text-sm text-muted-foreground">No environment variables defined</p>
              ) : (
                <div className="space-y-2">
                  {formData.envVars.map((envVar, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        placeholder="VAR_NAME"
                        value={envVar.name}
                        onChange={(e) => updateEnvVar(index, 'name', e.target.value)}
                        className="font-mono flex-1"
                      />
                      <Input
                        placeholder="default value"
                        value={envVar.defaultValue || ''}
                        onChange={(e) => updateEnvVar(index, 'defaultValue', e.target.value)}
                        className="font-mono flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive shrink-0"
                        onClick={() => removeEnvVar(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>ConfigMap Env Sources</Label>
                <Button type="button" variant="outline" size="sm" onClick={addConfigMapEnvSource}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Source
                </Button>
              </div>
              {formData.configMapEnvSources.length === 0 ? (
                <p className="text-sm text-muted-foreground">No ConfigMap sources linked</p>
              ) : (
                <div className="space-y-2">
                  {formData.configMapEnvSources.map((source, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Select
                        value={source.configMapName}
                        onValueChange={(value) => updateConfigMapEnvSource(index, value)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select ConfigMap" />
                        </SelectTrigger>
                        <SelectContent>
                          {template.configMaps.map((cm) => (
                            <SelectItem key={cm.id} value={cm.name}>
                              {cm.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive shrink-0"
                        onClick={() => removeConfigMapEnvSource(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Secret Env Sources</Label>
                <Button type="button" variant="outline" size="sm" onClick={addSecretEnvSource}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Source
                </Button>
              </div>
              {formData.secretEnvSources.length === 0 ? (
                <p className="text-sm text-muted-foreground">No Secret sources linked</p>
              ) : (
                <div className="space-y-2">
                  {formData.secretEnvSources.map((source, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Select
                        value={source.secretName}
                        onValueChange={(value) => updateSecretEnvSource(index, value)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select Secret" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSecrets.map((secret) => (
                            <SelectItem key={secret.id} value={secret.name}>
                              {secret.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive shrink-0"
                        onClick={() => removeSecretEnvSource(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingService ? 'Save Changes' : 'Add Service'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete External Service</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this external service. This action cannot be undone.
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
