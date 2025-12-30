import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHelmStore } from '@/lib/store';
import { TemplateWithRelations, ConfigMap, ConfigMapKey } from '@/types/helm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

interface ConfigMapsTabProps {
  template: TemplateWithRelations;
  readOnly?: boolean;
}

export function ConfigMapsTab({ template, readOnly = false }: ConfigMapsTabProps) {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingConfigMap, setEditingConfigMap] = useState<ConfigMap | null>(null);
  
  const addConfigMap = useHelmStore((state) => state.addConfigMap);
  const updateConfigMap = useHelmStore((state) => state.updateConfigMap);
  const deleteConfigMap = useHelmStore((state) => state.deleteConfigMap);

  const [formData, setFormData] = useState({
    name: '',
    keys: [] as ConfigMapKey[],
  });

  const openNew = () => {
    setEditingConfigMap(null);
    setFormData({ name: '', keys: [] });
    setDialogOpen(true);
  };

  const openEdit = (configMap: ConfigMap) => {
    navigate(`/templates/${template.id}/configmaps/${configMap.id}/edit`);
  };

  const addKey = () => {
    setFormData(prev => ({
      ...prev,
      keys: [...prev.keys, { name: '', defaultValue: '' }]
    }));
  };

  const updateKey = (index: number, field: 'name' | 'defaultValue', value: string) => {
    setFormData(prev => ({
      ...prev,
      keys: prev.keys.map((k, i) => i === index ? { ...k, [field]: value } : k)
    }));
  };

  const removeKey = (index: number) => {
    setFormData(prev => ({
      ...prev,
      keys: prev.keys.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('ConfigMap name is required');
      return;
    }

    const keys = formData.keys.filter(k => k.name.trim());

    try {
      if (editingConfigMap) {
        await updateConfigMap(editingConfigMap.id, { name: formData.name, keys });
        toast.success('ConfigMap updated');
      } else {
        const configMap: ConfigMap = {
          id: crypto.randomUUID(),
          templateId: template.id,
          name: formData.name,
          keys,
        };
        await addConfigMap(configMap);
        toast.success('ConfigMap added');
      }

      setDialogOpen(false);
    } catch (error) {
      // Error is already handled in the store
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await deleteConfigMap(deleteId);
        toast.success('ConfigMap deleted');
        setDeleteId(null);
      } catch (error) {
        // Error is already handled in the store
      }
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
        {!readOnly && (
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" />
            Add ConfigMap
          </Button>
        )}
      </div>

      {template.configMaps.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No ConfigMaps defined yet</p>
            {!readOnly && (
              <Button variant="outline" onClick={openNew}>
                <Plus className="mr-2 h-4 w-4" />
                Add your first ConfigMap
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
                <TableHead>Keys</TableHead>
                {!readOnly && <TableHead className="w-[100px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {template.configMaps.map((cm) => (
                <TableRow 
                  key={cm.id}
                  className={!readOnly ? "cursor-pointer hover:bg-muted/50" : ""}
                  onClick={() => !readOnly && openEdit(cm)}
                >
                  <TableCell className="font-mono font-medium">{cm.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {cm.keys.length > 0 ? (
                        cm.keys.slice(0, 5).map((key, i) => (
                          <Badge key={i} variant="secondary" className="font-mono text-xs">
                            {key.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">No keys defined</span>
                      )}
                      {cm.keys.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{cm.keys.length - 5}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  {!readOnly && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(cm)}
                          title="Edit ConfigMap"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setDeleteId(cm.id)}
                          title="Delete ConfigMap"
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
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Keys</Label>
                <Button type="button" variant="outline" size="sm" onClick={addKey}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Key
                </Button>
              </div>
              {formData.keys.length === 0 ? (
                <p className="text-sm text-muted-foreground">No keys defined</p>
              ) : (
                <div className="space-y-2">
                  {formData.keys.map((key, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        placeholder="Key name"
                        value={key.name}
                        onChange={(e) => updateKey(index, 'name', e.target.value)}
                        className="font-mono flex-1"
                      />
                      <Input
                        placeholder="Default value (optional)"
                        value={key.defaultValue || ''}
                        onChange={(e) => updateKey(index, 'defaultValue', e.target.value)}
                        className="font-mono flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive shrink-0"
                        onClick={() => removeKey(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
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