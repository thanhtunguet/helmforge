import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useHelmStore } from '@/lib/store';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { ConfigMap, ConfigMapKey } from '@/types/helm';

export default function EditConfigMap() {
  const { templateId, configMapId } = useParams();
  const navigate = useNavigate();
  const configMaps = useHelmStore((state) => state.configMaps);
  const updateConfigMap = useHelmStore((state) => state.updateConfigMap);
  
  const configMap = configMaps.find((cm) => cm.id === configMapId && cm.templateId === templateId);
  
  const [formData, setFormData] = useState({
    name: '',
    keys: [] as ConfigMapKey[],
  });

  useEffect(() => {
    if (configMap) {
      setFormData({
        name: configMap.name,
        keys: [...configMap.keys],
      });
    }
  }, [configMap]);

  if (!configMap) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <h2 className="text-xl font-semibold">ConfigMap not found</h2>
          <p className="text-muted-foreground mb-4">
            The requested ConfigMap does not exist.
          </p>
          <Button variant="outline" onClick={() => navigate(`/templates/${templateId}?tab=configmaps`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Template
          </Button>
        </div>
      </MainLayout>
    );
  }

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
      await updateConfigMap(configMap.id, { name: formData.name, keys });
      toast.success('ConfigMap updated');
      navigate(`/templates/${templateId}?tab=configmaps`);
    } catch (error) {
      // Error is already handled in the store
    }
  };

  return (
    <MainLayout>
      <div className="animate-fade-in max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            className="mb-4 -ml-4"
            onClick={() => navigate(`/templates/${templateId}?tab=configmaps`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Template
          </Button>
          
          <h1 className="text-3xl font-bold tracking-tight">Edit ConfigMap</h1>
          <p className="mt-1 text-muted-foreground">
            Update the ConfigMap configuration
          </p>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>ConfigMap Details</CardTitle>
            <CardDescription>
              Define a ConfigMap with its keys
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => navigate(`/templates/${templateId}?tab=configmaps`)}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                Update ConfigMap
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}


