import { useState } from 'react';
import { useHelmStore } from '@/lib/store';
import { TemplateWithRelations, Service } from '@/types/helm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Plus, Pencil, Trash2, Route, Variable, Heart, Activity } from 'lucide-react';
import { toast } from 'sonner';

interface ServicesTabProps {
  template: TemplateWithRelations;
}

export function ServicesTab({ template }: ServicesTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<Service | null>(null);
  
  const addService = useHelmStore((state) => state.addService);
  const updateService = useHelmStore((state) => state.updateService);
  const deleteService = useHelmStore((state) => state.deleteService);

  const [formData, setFormData] = useState({
    name: '',
    routes: '',
    envVars: '',
    livenessPath: '/health',
    readinessPath: '/ready',
  });

  const openNew = () => {
    setEditingService(null);
    setFormData({
      name: '',
      routes: '',
      envVars: '',
      livenessPath: '/health',
      readinessPath: '/ready',
    });
    setDialogOpen(true);
  };

  const openEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      routes: service.routes.map((r) => r.path).join(', '),
      envVars: service.envVars.map((e) => e.name).join(', '),
      livenessPath: service.livenessPath,
      readinessPath: service.readinessPath,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('Service name is required');
      return;
    }

    const routes = formData.routes
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean)
      .map((path) => ({ path: path.startsWith('/') ? path : `/${path}` }));

    const envVars = formData.envVars
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean)
      .map((name) => ({ name, required: false }));

    if (editingService) {
      updateService(editingService.id, {
        name: formData.name,
        routes,
        envVars,
        livenessPath: formData.livenessPath,
        readinessPath: formData.readinessPath,
      });
      toast.success('Service updated');
    } else {
      const service: Service = {
        id: crypto.randomUUID(),
        templateId: template.id,
        name: formData.name,
        routes,
        envVars,
        livenessPath: formData.livenessPath,
        readinessPath: formData.readinessPath,
      };
      addService(service);
      toast.success('Service added');
    }

    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteService(deleteId);
      toast.success('Service deleted');
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Microservices</h3>
          <p className="text-sm text-muted-foreground">
            Define the services in your application
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add Service
        </Button>
      </div>

      {template.services.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No services defined yet</p>
            <Button variant="outline" onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" />
              Add your first service
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {template.services.map((service) => (
            <Card key={service.id} className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base font-mono">
                      {service.name}
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs font-mono text-muted-foreground">
                      {template.registryUrl}/{template.registryProject}/{service.name}:tag
                    </CardDescription>
                  </div>
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
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Route className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">Routes:</span>
                  <div className="flex flex-wrap gap-1">
                    {service.routes.length > 0 ? (
                      service.routes.map((r, i) => (
                        <Badge key={i} variant="secondary" className="font-mono text-xs">
                          {r.path}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">None</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Variable className="h-4 w-4 text-accent" />
                  <span className="text-muted-foreground">Env vars:</span>
                  <span className="text-xs">{service.envVars.length}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Heart className="h-3 w-3 text-success" />
                    {service.livenessPath}
                  </div>
                  <div className="flex items-center gap-1">
                    <Activity className="h-3 w-3 text-primary" />
                    {service.readinessPath}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingService ? 'Edit Service' : 'Add Service'}
            </DialogTitle>
            <DialogDescription>
              Define a microservice for your Helm chart
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Service Name *</Label>
              <Input
                id="name"
                placeholder="api-gateway"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Must be DNS-safe (lowercase, alphanumeric, hyphens)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="routes">Routes (comma-separated)</Label>
              <Input
                id="routes"
                placeholder="/api, /health, /metrics"
                value={formData.routes}
                onChange={(e) =>
                  setFormData({ ...formData, routes: e.target.value })
                }
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="envVars">Environment Variables (comma-separated)</Label>
              <Input
                id="envVars"
                placeholder="DATABASE_URL, API_KEY, LOG_LEVEL"
                value={formData.envVars}
                onChange={(e) =>
                  setFormData({ ...formData, envVars: e.target.value })
                }
                className="font-mono"
              />
            </div>
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
