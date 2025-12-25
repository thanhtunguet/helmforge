import { useHelmStore } from '@/lib/store';
import { Template } from '@/types/helm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
    registryPassword: '',
    enableNginxGateway: template.enableNginxGateway,
    enableRedis: template.enableRedis,
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
        registryPassword: '',
        enableNginxGateway: template.enableNginxGateway,
        enableRedis: template.enableRedis,
      });
    }
  }, [open, template]);

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('Template name is required');
      return;
    }

    updateTemplate(template.id, {
      name: formData.name,
      description: formData.description,
      sharedPort: formData.sharedPort,
      registryUrl: formData.registryUrl,
      registryProject: formData.registryProject,
      registrySecret: {
        ...template.registrySecret,
        server: formData.registryUrl,
        username: formData.registryUsername,
        password: formData.registryPassword || template.registrySecret.password,
      },
      enableNginxGateway: formData.enableNginxGateway,
      enableRedis: formData.enableRedis,
    });

    toast.success('Template updated');
    onOpenChange(false);
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="registryUsername">Username</Label>
                <Input
                  id="registryUsername"
                  value={formData.registryUsername}
                  onChange={(e) =>
                    setFormData({ ...formData, registryUsername: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registryPassword">Password (leave blank to keep)</Label>
                <Input
                  id="registryPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.registryPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, registryPassword: e.target.value })
                  }
                />
              </div>
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
