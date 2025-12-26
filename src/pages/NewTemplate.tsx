import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHelmStore } from '@/lib/store';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Box, Server, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { Template } from '@/types/helm';

export default function NewTemplate() {
  const navigate = useNavigate();
  const addTemplate = useHelmStore((state) => state.addTemplate);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sharedPort: 8080,
    registryUrl: '',
    registryProject: '',
    registryUsername: '',
    registryEmail: '',
    enableNginxGateway: true,
    enableRedis: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Template name is required');
      return;
    }

    if (!formData.registryUrl.trim()) {
      toast.error('Registry URL is required');
      return;
    }

    const template: Template = {
      id: crypto.randomUUID(),
      name: formData.name,
      description: formData.description,
      sharedPort: formData.sharedPort,
      registryUrl: formData.registryUrl,
      registryProject: formData.registryProject,
      registrySecret: {
        name: 'registry-credentials',
        type: 'registry',
        server: formData.registryUrl,
        username: formData.registryUsername,
        email: formData.registryEmail,
      },
      enableNginxGateway: formData.enableNginxGateway,
      enableRedis: formData.enableRedis,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addTemplate(template);
    toast.success('Template created successfully');
    navigate(`/templates/${template.id}`);
  };

  return (
    <MainLayout>
      <div className="animate-fade-in max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            className="mb-4 -ml-4"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">New Template</h1>
          <p className="text-muted-foreground">
            Create a new Helm chart template for your microservices
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Box className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>Template name and description</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  placeholder="my-microservices"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your chart template..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
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
                  className="font-mono w-32"
                />
                <p className="text-xs text-muted-foreground">
                  All microservices will use this port (containerPort, service port, targetPort)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Registry */}
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <Server className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <CardTitle>Container Registry</CardTitle>
                  <CardDescription>
                    Single registry for all microservice images
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="registryUrl">Registry URL *</Label>
                  <Input
                    id="registryUrl"
                    placeholder="harbor.company.com"
                    value={formData.registryUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, registryUrl: e.target.value })
                    }
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registryProject">Project/Namespace</Label>
                  <Input
                    id="registryProject"
                    placeholder="platform"
                    value={formData.registryProject}
                    onChange={(e) =>
                      setFormData({ ...formData, registryProject: e.target.value })
                    }
                    className="font-mono"
                  />
                </div>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="mb-3 text-sm font-medium">Registry Credentials</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="registryUsername">Username</Label>
                    <Input
                      id="registryUsername"
                      placeholder="username"
                      value={formData.registryUsername}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          registryUsername: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="registryEmail">Email (optional)</Label>
                    <Input
                      id="registryEmail"
                      type="email"
                      placeholder="registry@company.com"
                      value={formData.registryEmail}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          registryEmail: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  For security, registry passwords are not stored. They should be provided during Helm chart deployment via values.yaml.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Options */}
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                  <Shield className="h-5 w-5 text-success" />
                </div>
                <div>
                  <CardTitle>Optional Services</CardTitle>
                  <CardDescription>
                    Enable additional infrastructure components
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Nginx Internal Gateway</p>
                  <p className="text-sm text-muted-foreground">
                    Aggregate routes from all services into a single gateway
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
                  <p className="font-medium">Redis Cache</p>
                  <p className="text-sm text-muted-foreground">
                    Include a Redis deployment for caching
                  </p>
                </div>
                <Switch
                  checked={formData.enableRedis}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, enableRedis: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/dashboard')}
            >
              Cancel
            </Button>
            <Button type="submit">Create Template</Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
