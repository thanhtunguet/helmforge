import { useState } from 'react';
import { useHelmStore } from '@/lib/store';
import { TemplateWithRelations, ConfigMap } from '@/types/helm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Plus, Pencil, Trash2, FileJson } from 'lucide-react';
import { toast } from 'sonner';

interface ConfigMapsTabProps {
  template: TemplateWithRelations;
}

export function ConfigMapsTab({ template }: ConfigMapsTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingConfigMap, setEditingConfigMap] = useState<ConfigMap | null>(null);
  
  const addConfigMap = useHelmStore((state) => state.addConfigMap);
  const updateConfigMap = useHelmStore((state) => state.updateConfigMap);
  const deleteConfigMap = useHelmStore((state) => state.deleteConfigMap);

  const [formData, setFormData] = useState({
    name: '',
    keys: '',
  });

  const openNew = () => {
    setEditingConfigMap(null);
    setFormData({ name: '', keys: '' });
    setDialogOpen(true);
  };

  const openEdit = (configMap: ConfigMap) => {
    setEditingConfigMap(configMap);
    setFormData({
      name: configMap.name,
      keys: configMap.keys.map((k) => k.name).join(', '),
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('ConfigMap name is required');
      return;
    }

    const keys = formData.keys
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean)
      .map((name) => ({ name }));

    if (editingConfigMap) {
      updateConfigMap(editingConfigMap.id, { name: formData.name, keys });
      toast.success('ConfigMap updated');
    } else {
      const configMap: ConfigMap = {
        id: crypto.randomUUID(),
        templateId: template.id,
        name: formData.name,
        keys,
      };
      addConfigMap(configMap);
      toast.success('ConfigMap added');
    }

    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteConfigMap(deleteId);
      toast.success('ConfigMap deleted');
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">ConfigMaps</h3>
          <p className="text-sm text-muted-foreground">
            Define configuration data for your services
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add ConfigMap
        </Button>
      </div>

      {template.configMaps.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No ConfigMaps defined yet</p>
            <Button variant="outline" onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" />
              Add your first ConfigMap
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {template.configMaps.map((cm) => (
            <Card key={cm.id} className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                      <FileJson className="h-4 w-4 text-accent" />
                    </div>
                    <CardTitle className="text-base font-mono">{cm.name}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(cm)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setDeleteId(cm.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {cm.keys.length > 0 ? (
                    cm.keys.map((key, i) => (
                      <Badge key={i} variant="secondary" className="font-mono text-xs">
                        {key.name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">No keys defined</span>
                  )}
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
              {editingConfigMap ? 'Edit ConfigMap' : 'Add ConfigMap'}
            </DialogTitle>
            <DialogDescription>
              Define a ConfigMap with its keys
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">ConfigMap Name *</Label>
              <Input
                id="name"
                placeholder="app-config"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="keys">Keys (comma-separated)</Label>
              <Input
                id="keys"
                placeholder="config.yaml, settings.json, env"
                value={formData.keys}
                onChange={(e) =>
                  setFormData({ ...formData, keys: e.target.value })
                }
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Values will be assigned when creating chart versions
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingConfigMap ? 'Update' : 'Add'} ConfigMap
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete ConfigMap</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this ConfigMap? This action cannot be undone.
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
