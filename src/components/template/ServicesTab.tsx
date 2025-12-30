import { useState } from 'react';
import { useHelmStore } from '@/lib/store';
import { TemplateWithRelations, Service, EnvVarSchema, Route, ConfigMapEnvSource, SecretEnvSource } from '@/types/helm';
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
import { Plus, Pencil, Trash2, X, Check, Database } from 'lucide-react';
import { toast } from 'sonner';

interface ServicesTabProps {
  template: TemplateWithRelations;
  readOnly?: boolean;
}

interface FormData {
  name: string;
  routes: Route[];
  envVars: EnvVarSchema[];
  healthCheckEnabled: boolean;
  livenessPath: string;
  readinessPath: string;
  configMapEnvSources: ConfigMapEnvSource[];
  secretEnvSources: SecretEnvSource[];
  useStatefulSet: boolean;
}

export function ServicesTab({ template, readOnly = false }: ServicesTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<Service | null>(null);
  
  const addService = useHelmStore((state) => state.addService);
  const updateService = useHelmStore((state) => state.updateService);
  const deleteService = useHelmStore((state) => state.deleteService);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    routes: [],
    envVars: [],
    healthCheckEnabled: true,
    livenessPath: '/health',
    readinessPath: '/ready',
    configMapEnvSources: [],
    secretEnvSources: [],
    useStatefulSet: false,
  });

  const openNew = () => {
    setEditingService(null);
    setFormData({
      name: '',
      routes: [],
      envVars: [],
      healthCheckEnabled: true,
      livenessPath: '/health',
      readinessPath: '/ready',
      configMapEnvSources: [],
      secretEnvSources: [],
      useStatefulSet: false,
    });
    setDialogOpen(true);
  };

  const openEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      routes: [...service.routes],
      envVars: [...service.envVars],
      healthCheckEnabled: service.healthCheckEnabled ?? true,
      livenessPath: service.livenessPath,
      readinessPath: service.readinessPath,
      configMapEnvSources: service.configMapEnvSources ? [...service.configMapEnvSources] : [],
      secretEnvSources: service.secretEnvSources ? [...service.secretEnvSources] : [],
      useStatefulSet: service.useStatefulSet ?? false,
    });
    setDialogOpen(true);
  };

  const addRoute = () => {
    setFormData(prev => ({
      ...prev,
      routes: [...prev.routes, { path: '' }]
    }));
  };

  const updateRoute = (index: number, path: string) => {
    setFormData(prev => ({
      ...prev,
      routes: prev.routes.map((r, i) => 
        i === index ? { path: path.startsWith('/') ? path : `/${path}` } : r
      )
    }));
  };

  const removeRoute = (index: number) => {
    setFormData(prev => ({
      ...prev,
      routes: prev.routes.filter((_, i) => i !== index)
    }));
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

    const routes = formData.routes.filter(r => r.path.trim());
    const envVars = formData.envVars.filter(e => e.name.trim());
    const configMapEnvSources = formData.configMapEnvSources.filter(c => c.configMapName);
    const secretEnvSources = formData.secretEnvSources.filter(s => s.secretName);

    try {
      if (editingService) {
        await updateService(editingService.id, {
          name: formData.name,
          routes,
          envVars,
          healthCheckEnabled: formData.healthCheckEnabled,
          livenessPath: formData.livenessPath,
          readinessPath: formData.readinessPath,
          configMapEnvSources,
          secretEnvSources,
          useStatefulSet: formData.useStatefulSet,
        });
        toast.success('Service updated');
      } else {
        const service: Service = {
          id: crypto.randomUUID(),
          templateId: template.id,
          name: formData.name,
          routes,
          envVars,
          healthCheckEnabled: formData.healthCheckEnabled,
          livenessPath: formData.livenessPath,
          readinessPath: formData.readinessPath,
          configMapEnvSources,
          secretEnvSources,
          useStatefulSet: formData.useStatefulSet,
        };
        await addService(service);
        toast.success('Service added');
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
        toast.success('Service deleted');
        setDeleteId(null);
      } catch (error) {
        // Error is already handled in the store
      }
    }
  };

  // Combine opaque secrets for selection
  const availableSecrets = template.opaqueSecrets || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Microservices</h3>
          <p className="text-sm text-muted-foreground">
            Define the services in your application
          </p>
        </div>
        {!readOnly && (
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" />
            Add Service
          </Button>
        )}
      </div>

      {template.services.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No services defined yet</p>
            {!readOnly && (
              <Button variant="outline" onClick={openNew}>
                <Plus className="mr-2 h-4 w-4" />
                Add your first service
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
                <TableHead>Routes</TableHead>
                <TableHead>Env Vars</TableHead>
                <TableHead>Health Check</TableHead>
                <TableHead>Type</TableHead>
                {!readOnly && <TableHead className="w-[100px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {template.services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="font-mono font-medium">{service.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {template.registryUrl}/{template.registryProject}/{service.name}:tag
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {service.routes.length > 0 ? (
                        service.routes.slice(0, 3).map((r, i) => (
                          <Badge key={i} variant="secondary" className="font-mono text-xs">
                            {r.path}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                      {service.routes.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{service.routes.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {service.envVars.length}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {(service.healthCheckEnabled ?? true) ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell>
                    {service.useStatefulSet ? (
                      <Badge variant="outline" className="text-xs">
                        <Database className="h-3 w-3 mr-1" />
                        StatefulSet
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
              {editingService ? 'Edit Service' : 'Add Service'}
            </DialogTitle>
            <DialogDescription>
              Define a microservice for your Helm chart
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Service Name *</Label>
              <Input
                id="name"
                placeholder="api-gateway"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Must be DNS-safe (lowercase, alphanumeric, hyphens)
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Deploy as StatefulSet</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Use StatefulSet instead of Deployment (for stateful workloads)
                </p>
              </div>
              <Switch
                checked={formData.useStatefulSet}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, useStatefulSet: checked })
                }
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Routes</Label>
                <Button type="button" variant="outline" size="sm" onClick={addRoute}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Route
                </Button>
              </div>
              {formData.routes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No routes defined</p>
              ) : (
                <div className="space-y-2">
                  {formData.routes.map((route, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        placeholder="/api/v1"
                        value={route.path}
                        onChange={(e) => updateRoute(index, e.target.value)}
                        className="font-mono"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive shrink-0"
                        onClick={() => removeRoute(index)}
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
                        placeholder="VARIABLE_NAME"
                        value={envVar.name}
                        onChange={(e) => updateEnvVar(index, 'name', e.target.value)}
                        className="font-mono flex-1"
                      />
                      <Input
                        placeholder="Default value (optional)"
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
                <div>
                  <Label>Mount ConfigMaps as Environment</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Load all keys from a ConfigMap as environment variables
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addConfigMapEnvSource}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add ConfigMap
                </Button>
              </div>
              {formData.configMapEnvSources.length === 0 ? (
                <p className="text-sm text-muted-foreground">No ConfigMaps mounted</p>
              ) : (
                <div className="space-y-2">
                  {formData.configMapEnvSources.map((source, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Select
                        value={source.configMapName}
                        onValueChange={(value) => updateConfigMapEnvSource(index, value)}
                      >
                        <SelectTrigger className="font-mono">
                          <SelectValue placeholder="Select ConfigMap" />
                        </SelectTrigger>
                        <SelectContent>
                          {template.configMaps.map((cm) => (
                            <SelectItem key={cm.id} value={cm.name} className="font-mono">
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
                <div>
                  <Label>Mount Secrets as Environment</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Load all keys from an Opaque Secret as environment variables
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addSecretEnvSource}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Secret
                </Button>
              </div>
              {formData.secretEnvSources.length === 0 ? (
                <p className="text-sm text-muted-foreground">No Secrets mounted</p>
              ) : (
                <div className="space-y-2">
                  {formData.secretEnvSources.map((source, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Select
                        value={source.secretName}
                        onValueChange={(value) => updateSecretEnvSource(index, value)}
                      >
                        <SelectTrigger className="font-mono">
                          <SelectValue placeholder="Select Secret" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSecrets.map((secret) => (
                            <SelectItem key={secret.id} value={secret.name} className="font-mono">
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

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Health Checks</Label>
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
                <div className="grid gap-4 sm:grid-cols-2 pl-4 border-l-2 border-primary/20">
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
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingService ? 'Update' : 'Add'} Service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this service? This action cannot be undone.
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