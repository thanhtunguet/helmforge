import { useHelmStore } from '@/lib/store';
import { Template, TemplateVisibility } from '@/types/helm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

interface TemplateSettingsDialogProps {
  template: Template;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplateSettingsDialog({
  template,
  open,
  onOpenChange,
}: TemplateSettingsDialogProps) {
  const updateTemplate = useHelmStore((state) => state.updateTemplate);

  const [formData, setFormData] = useState({
    name: template.name,
    description: template.description,
    sharedPort: template.sharedPort,
    registryUrl: template.registryUrl,
    registryProject: template.registryProject,
    registryUsername: template.registrySecret.username,
    enableNginxGateway: template.enableNginxGateway,
    enableRedis: template.enableRedis,
    visibility: template.visibility,
  });

  useEffect(() => {
    if (open) {
      setFormData({
        name: template.name,
        description: template.description,
        sharedPort: template.sharedPort,
        registryUrl: template.registryUrl,
        registryProject: template.registryProject,
        registryUsername: template.registrySecret.username,
        enableNginxGateway: template.enableNginxGateway,
        enableRedis: template.enableRedis,
        visibility: template.visibility,
      });
    }
  }, [open, template]);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Template name is required');
      return;
    }

    try {
      await updateTemplate(template.id, {
        name: formData.name,
        description: formData.description,
        sharedPort: formData.sharedPort,
        registryUrl: formData.registryUrl,
        registryProject: formData.registryProject,
        registrySecret: {
          ...template.registrySecret,
          server: formData.registryUrl,
          username: formData.registryUsername,
        },
        enableNginxGateway: formData.enableNginxGateway,
        enableRedis: formData.enableRedis,
        visibility: formData.visibility,
      });

      toast.success('Template updated');
      onOpenChange(false);
    } catch (error) {
      // Error is already handled in the store
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Template Settings</DialogTitle>
          <DialogDescription>
            Update template configuration
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <h4 className="font-medium">Basic Information</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sharedPort">Shared Port</Label>
                <Input
                  id="sharedPort"
                  type="number"
                  min={1}
                  max={65535}
                  value={formData.sharedPort}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sharedPort: parseInt(e.target.value) || 8080,
                    })
                  }
                  className="font-mono"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={2}
              />
            </div>
          </div>

          {/* Registry */}
          <div className="space-y-4">
            <h4 className="font-medium">Container Registry</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="registryUrl">Registry URL</Label>
                <Input
                  id="registryUrl"
                  value={formData.registryUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, registryUrl: e.target.value })
                  }
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registryProject">Project</Label>
                <Input
                  id="registryProject"
                  value={formData.registryProject}
                  onChange={(e) =>
                    setFormData({ ...formData, registryProject: e.target.value })
                  }
                  className="font-mono"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="registryUsername">Username</Label>
              <Input
                id="registryUsername"
                value={formData.registryUsername}
                onChange={(e) =>
                  setFormData({ ...formData, registryUsername: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                For security, registry passwords are not stored. They should be provided during Helm chart deployment.
              </p>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-4">
            <h4 className="font-medium">Optional Services</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Nginx Internal Gateway</p>
                  <p className="text-xs text-muted-foreground">
                    Aggregate routes into a single gateway
                  </p>
                </div>
                <Switch
                  checked={formData.enableNginxGateway}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, enableNginxGateway: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Redis Cache</p>
                  <p className="text-xs text-muted-foreground">
                    Include a Redis deployment
                  </p>
                </div>
                <Switch
                  checked={formData.enableRedis}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, enableRedis: checked })
                  }
                />
              </div>
            </div>
          </div>

          {/* Visibility */}
          <div className="space-y-4">
            <h4 className="font-medium">Visibility</h4>
            <div className="space-y-2">
              <Label htmlFor="visibility">Template Visibility</Label>
              <Select
                value={formData.visibility}
                onValueChange={(value: TemplateVisibility) =>
                  setFormData({ ...formData, visibility: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">🔒 Private - Only you can see</SelectItem>
                  <SelectItem value="public">🌍 Public - Visible in Community Templates</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Public templates are visible to all authenticated users.
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
