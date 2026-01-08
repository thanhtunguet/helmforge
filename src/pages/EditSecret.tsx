import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useHelmStore } from '@/lib/store';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, X, Lock, FileKey } from 'lucide-react';
import { toast } from 'sonner';
import { TLSSecret, OpaqueSecret, OpaqueSecretKey } from '@/types/helm';
import { validateTlsInputs } from '@/lib/tls-utils';

export default function EditSecret() {
  const { templateId, secretId } = useParams();
  const navigate = useNavigate();
  const tlsSecrets = useHelmStore((state) => state.tlsSecrets);
  const opaqueSecrets = useHelmStore((state) => state.opaqueSecrets);
  const updateTLSSecret = useHelmStore((state) => state.updateTLSSecret);
  const updateOpaqueSecret = useHelmStore((state) => state.updateOpaqueSecret);
  
  const tlsSecret = tlsSecrets.find((s) => s.id === secretId && s.templateId === templateId);
  const opaqueSecret = opaqueSecrets.find((s) => s.id === secretId && s.templateId === templateId);
  const secret = tlsSecret || opaqueSecret;
  const isTLS = !!tlsSecret;
  
  const [tlsFormData, setTlsFormData] = useState({ name: '', cert: '', key: '' });
  const [opaqueFormData, setOpaqueFormData] = useState({ name: '', keys: [] as OpaqueSecretKey[] });

  useEffect(() => {
    if (tlsSecret) {
      setTlsFormData({
        name: tlsSecret.name,
        cert: tlsSecret.cert || '',
        key: tlsSecret.key || ''
      });
    } else if (opaqueSecret) {
      setOpaqueFormData({
        name: opaqueSecret.name,
        keys: [...opaqueSecret.keys],
      });
    }
  }, [tlsSecret, opaqueSecret]);

  if (!secret) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <h2 className="text-xl font-semibold">Secret not found</h2>
          <p className="text-muted-foreground mb-4">
            The requested Secret does not exist.
          </p>
          <Button variant="outline" onClick={() => navigate(`/templates/${templateId}?tab=secrets`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Template
          </Button>
        </div>
      </MainLayout>
    );
  }

  // TLS Secret handlers
  const handleTlsSubmit = async () => {
    if (!tlsFormData.name.trim()) {
      toast.error('Secret name is required');
      return;
    }

    const validation = validateTlsInputs(tlsFormData.cert, tlsFormData.key);
    if (validation.errors.length > 0) {
      validation.errors.forEach((message) => toast.error(message));
      return;
    }

    const certValue = validation.cert ?? '';
    const keyValue = validation.key ?? '';
    const notBeforeValue = validation.notBefore ?? '';
    const expiresAtValue = validation.expiresAt ?? '';

    try {
      await updateTLSSecret(secret.id, {
        name: tlsFormData.name,
        cert: certValue,
        key: keyValue,
        notBefore: notBeforeValue,
        expiresAt: expiresAtValue,
      });
      toast.success('TLS secret updated');
      navigate(`/templates/${templateId}?tab=secrets`);
    } catch (error) {
      // Error is already handled in the store
    }
  };

  // Opaque Secret handlers
  const addOpaqueKey = () => {
    setOpaqueFormData(prev => ({
      ...prev,
      keys: [...prev.keys, { name: '', defaultValue: '' }]
    }));
  };

  const updateOpaqueKey = (index: number, field: 'name' | 'defaultValue', value: string) => {
    setOpaqueFormData(prev => ({
      ...prev,
      keys: prev.keys.map((k, i) => i === index ? { ...k, [field]: value } : k)
    }));
  };

  const removeOpaqueKey = (index: number) => {
    setOpaqueFormData(prev => ({
      ...prev,
      keys: prev.keys.filter((_, i) => i !== index)
    }));
  };

  const handleOpaqueSubmit = async () => {
    if (!opaqueFormData.name.trim()) {
      toast.error('Secret name is required');
      return;
    }

    const keys = opaqueFormData.keys.filter(k => k.name.trim());

    try {
      await updateOpaqueSecret(secret.id, {
        name: opaqueFormData.name,
        keys,
      });
      toast.success('Opaque secret updated');
      navigate(`/templates/${templateId}?tab=secrets`);
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
            onClick={() => navigate(`/templates/${templateId}?tab=secrets`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Template
          </Button>
          
          <div className="flex items-center gap-3">
            {isTLS ? (
              <Lock className="h-6 w-6 text-success" />
            ) : (
              <FileKey className="h-6 w-6 text-warning" />
            )}
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Edit {isTLS ? 'TLS' : 'Opaque'} Secret
              </h1>
              <p className="mt-1 text-muted-foreground">
                {isTLS 
                  ? 'Update the TLS secret configuration for Ingress HTTPS termination'
                  : 'Update the Opaque secret configuration with key-value pairs'}
              </p>
            </div>
            <Badge variant="outline">{isTLS ? 'TLS' : 'Opaque'}</Badge>
          </div>
        </div>

        {/* TLS Secret Form */}
        {isTLS ? (
          <Card>
            <CardHeader>
              <CardTitle>TLS Secret Details</CardTitle>
              <CardDescription>
                Update the TLS secret configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="tls-name">Secret Name *</Label>
                <Input
                  id="tls-name"
                  placeholder="wildcard-tls"
                  value={tlsFormData.name}
                  onChange={(e) => setTlsFormData({ ...tlsFormData, name: e.target.value })}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tls-cert">Certificate (tls.crt)</Label>
                <Textarea
                  id="tls-cert"
                  placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                  value={tlsFormData.cert}
                  onChange={(e) => setTlsFormData({ ...tlsFormData, cert: e.target.value })}
                  className="font-mono text-xs min-h-[200px]"
                />
                <p className="text-xs text-muted-foreground">
                  Paste the PEM-encoded certificate or leave empty to set per version
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tls-key">Private Key (tls.key)</Label>
                <Textarea
                  id="tls-key"
                  placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
                  value={tlsFormData.key}
                  onChange={(e) => setTlsFormData({ ...tlsFormData, key: e.target.value })}
                  className="font-mono text-xs min-h-[200px]"
                />
                <p className="text-xs text-muted-foreground">
                  Paste the PEM-encoded private key or leave empty to set per version
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => navigate(`/templates/${templateId}?tab=secrets`)}
                >
                  Cancel
                </Button>
                <Button onClick={handleTlsSubmit}>
                  Update TLS Secret
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Opaque Secret Form */
          <Card>
            <CardHeader>
              <CardTitle>Opaque Secret Details</CardTitle>
              <CardDescription>
                Update the Opaque secret configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="opaque-name">Secret Name *</Label>
                <Input
                  id="opaque-name"
                  placeholder="app-secrets"
                  value={opaqueFormData.name}
                  onChange={(e) => setOpaqueFormData({ ...opaqueFormData, name: e.target.value })}
                  className="font-mono"
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Keys</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addOpaqueKey}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Key
                  </Button>
                </div>
                {opaqueFormData.keys.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No keys defined</p>
                ) : (
                  <div className="space-y-2">
                    {opaqueFormData.keys.map((key, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          placeholder="Key name"
                          value={key.name}
                          onChange={(e) => updateOpaqueKey(index, 'name', e.target.value)}
                          className="font-mono flex-1"
                        />
                        <Input
                          placeholder="Default value (optional)"
                          value={key.defaultValue || ''}
                          onChange={(e) => updateOpaqueKey(index, 'defaultValue', e.target.value)}
                          className="font-mono flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-destructive shrink-0"
                          onClick={() => removeOpaqueKey(index)}
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
                  onClick={() => navigate(`/templates/${templateId}?tab=secrets`)}
                >
                  Cancel
                </Button>
                <Button onClick={handleOpaqueSubmit}>
                  Update Opaque Secret
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}

