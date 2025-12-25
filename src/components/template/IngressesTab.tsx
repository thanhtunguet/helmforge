import { useState } from 'react';
import { useHelmStore } from '@/lib/store';
import { TemplateWithRelations, Ingress, IngressRule } from '@/types/helm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Plus, Pencil, Trash2, Network, Lock, Route } from 'lucide-react';
import { toast } from 'sonner';

interface IngressesTabProps {
  template: TemplateWithRelations;
}

export function IngressesTab({ template }: IngressesTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingIngress, setEditingIngress] = useState<Ingress | null>(null);
  
  const addIngress = useHelmStore((state) => state.addIngress);
  const updateIngress = useHelmStore((state) => state.updateIngress);
  const deleteIngress = useHelmStore((state) => state.deleteIngress);

  const [formData, setFormData] = useState({
    name: '',
    mode: 'nginx-gateway' as 'nginx-gateway' | 'direct-services',
    defaultHost: '',
    tlsEnabled: false,
    tlsSecretName: '',
    rules: [] as IngressRule[],
  });

  const [ruleForm, setRuleForm] = useState({ 
    serviceName: '', 
    selectedRoute: '', 
    customPath: '' 
  });

  const openNew = () => {
    setEditingIngress(null);
    setFormData({
      name: '',
      mode: 'nginx-gateway',
      defaultHost: '',
      tlsEnabled: false,
      tlsSecretName: '',
      rules: [],
    });
    setDialogOpen(true);
  };

  const openEdit = (ingress: Ingress) => {
    setEditingIngress(ingress);
    setFormData({
      name: ingress.name,
      mode: ingress.mode,
      defaultHost: ingress.defaultHost || '',
      tlsEnabled: ingress.tlsEnabled,
      tlsSecretName: ingress.tlsSecretName || '',
      rules: [...ingress.rules],
    });
    setDialogOpen(true);
  };

  const selectedService = template.services.find(s => s.name === ruleForm.serviceName);
  const isCustomRoute = ruleForm.selectedRoute === '__custom__';

  const addRule = () => {
    if (!ruleForm.serviceName) {
      toast.error('Service is required');
      return;
    }
    
    const path = isCustomRoute ? ruleForm.customPath : ruleForm.selectedRoute;
    if (!path) {
      toast.error('Route path is required');
      return;
    }

    setFormData({
      ...formData,
      rules: [
        ...formData.rules,
        {
          path: path.startsWith('/') ? path : `/${path}`,
          serviceName: ruleForm.serviceName,
        },
      ],
    });
    setRuleForm({ serviceName: '', selectedRoute: '', customPath: '' });
  };

  const removeRule = (index: number) => {
    setFormData({
      ...formData,
      rules: formData.rules.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('Ingress name is required');
      return;
    }

    if (editingIngress) {
      updateIngress(editingIngress.id, formData);
      toast.success('Ingress updated');
    } else {
      const ingress: Ingress = {
        id: crypto.randomUUID(),
        templateId: template.id,
        ...formData,
      };
      addIngress(ingress);
      toast.success('Ingress added');
    }

    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteIngress(deleteId);
      toast.success('Ingress deleted');
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Ingresses</h3>
          <p className="text-sm text-muted-foreground">
            Define ingress rules for external access
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add Ingress
        </Button>
      </div>

      {template.ingresses.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No ingresses defined yet</p>
            <Button variant="outline" onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" />
              Add your first ingress
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {template.ingresses.map((ingress) => (
            <Card key={ingress.id} className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <Network className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-mono">{ingress.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {ingress.mode === 'nginx-gateway' ? 'Via Nginx Gateway' : 'Direct to Services'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(ingress)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setDeleteId(ingress.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {ingress.tlsEnabled && (
                  <div className="flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5 text-success" />
                    <span className="text-xs text-success">TLS Enabled</span>
                    {ingress.tlsSecretName && (
                      <Badge variant="outline" className="font-mono text-xs">
                        {ingress.tlsSecretName}
                      </Badge>
                    )}
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Routes:</p>
                  <div className="flex flex-wrap gap-1">
                    {ingress.rules.length > 0 ? (
                      ingress.rules.map((rule, i) => (
                        <Badge key={i} variant="secondary" className="font-mono text-xs">
                          <Route className="mr-1 h-3 w-3" />
                          {rule.path} → {rule.serviceName}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">No rules defined</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingIngress ? 'Edit Ingress' : 'Add Ingress'}
            </DialogTitle>
            <DialogDescription>
              Configure ingress rules for external traffic
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Ingress Name *</Label>
                <Input
                  id="name"
                  placeholder="main-ingress"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
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

            <div className="space-y-2">
              <Label htmlFor="defaultHost">Default Host (optional)</Label>
              <Input
                id="defaultHost"
                placeholder="app.example.com"
                value={formData.defaultHost}
                onChange={(e) =>
                  setFormData({ ...formData, defaultHost: e.target.value })
                }
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Actual hosts are assigned when creating chart versions
              </p>
            </div>

            <div className="rounded-lg border border-border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">TLS Configuration</p>
                  <p className="text-xs text-muted-foreground">Enable HTTPS</p>
                </div>
                <Switch
                  checked={formData.tlsEnabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, tlsEnabled: checked })
                  }
                />
              </div>
              {formData.tlsEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="tlsSecretName">TLS Secret</Label>
                  <Select
                    value={formData.tlsSecretName}
                    onValueChange={(value) =>
                      setFormData({ ...formData, tlsSecretName: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select TLS secret" />
                    </SelectTrigger>
                    <SelectContent>
                      {template.tlsSecrets.map((secret) => (
                        <SelectItem key={secret.id} value={secret.name}>
                          {secret.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label>Routing Rules</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Select
                    value={ruleForm.serviceName}
                    onValueChange={(value) =>
                      setRuleForm({ ...ruleForm, serviceName: value, selectedRoute: '', customPath: '' })
                    }
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select Service" />
                    </SelectTrigger>
                    <SelectContent>
                      {template.services.map((svc) => (
                        <SelectItem key={svc.id} value={svc.name}>
                          {svc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={ruleForm.selectedRoute}
                    onValueChange={(value) =>
                      setRuleForm({ ...ruleForm, selectedRoute: value, customPath: '' })
                    }
                    disabled={!ruleForm.serviceName}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select Route" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedService?.routes.map((route, idx) => (
                        <SelectItem key={idx} value={route.path}>
                          {route.path}
                        </SelectItem>
                      ))}
                      <SelectItem value="__custom__">Custom Route...</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="secondary" onClick={addRule} disabled={!ruleForm.serviceName}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {isCustomRoute && (
                  <Input
                    placeholder="/custom-path"
                    value={ruleForm.customPath}
                    onChange={(e) => setRuleForm({ ...ruleForm, customPath: e.target.value })}
                    className="font-mono"
                  />
                )}
              </div>
              {formData.rules.length > 0 && (
                <div className="space-y-2">
                  {formData.rules.map((rule, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2"
                    >
                      <span className="font-mono text-sm">
                        {rule.path} → {rule.serviceName}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeRule(i)}
                      >
                        <Trash2 className="h-3 w-3" />
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
              {editingIngress ? 'Update' : 'Add'} Ingress
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ingress</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this ingress? This action cannot be undone.
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
