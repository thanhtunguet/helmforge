import { useState, useEffect } from 'react';
import { useHelmStore } from '@/lib/store';
import { ConfigMap, ConfigMapKey } from '@/types/helm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';

interface ConfigMapDialogProps {
  templateId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ConfigMapDialog({ templateId, open, onOpenChange, onSuccess }: ConfigMapDialogProps) {
  const addConfigMap = useHelmStore((state) => state.addConfigMap);

  const [formData, setFormData] = useState({
    name: '',
    keys: [] as ConfigMapKey[],
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({ name: '', keys: [] });
    }
  }, [open]);

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
      const configMap: ConfigMap = {
        id: crypto.randomUUID(),
        templateId,
        name: formData.name,
        keys,
      };
      await addConfigMap(configMap);
      toast.success('ConfigMap added');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      // Error is already handled in the store
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add ConfigMap</DialogTitle>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Add ConfigMap
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
