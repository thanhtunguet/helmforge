import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHelmStore } from '@/lib/store';
import { TemplateWithRelations, TLSSecret, OpaqueSecret, OpaqueSecretKey } from '@/types/helm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, Trash2, Key, Lock, Pencil, Check, X, FileKey } from 'lucide-react';
import { toast } from 'sonner';

interface SecretsTabProps {
  template: TemplateWithRelations;
  readOnly?: boolean;
}

export function SecretsTab({ template, readOnly = false }: SecretsTabProps) {
  const navigate = useNavigate();
  // TLS Secret state
  const [tlsDialogOpen, setTlsDialogOpen] = useState(false);
  const [deleteTlsId, setDeleteTlsId] = useState<string | null>(null);
  const [editingTlsSecret, setEditingTlsSecret] = useState<TLSSecret | null>(null);
  const [tlsFormData, setTlsFormData] = useState({ name: '', cert: '', key: '' });

  // Opaque Secret state
  const [opaqueDialogOpen, setOpaqueDialogOpen] = useState(false);
  const [deleteOpaqueId, setDeleteOpaqueId] = useState<string | null>(null);
  const [editingOpaqueSecret, setEditingOpaqueSecret] = useState<OpaqueSecret | null>(null);
  const [opaqueFormData, setOpaqueFormData] = useState({ name: '', keys: [] as OpaqueSecretKey[] });
  
  const addTLSSecret = useHelmStore((state) => state.addTLSSecret);
  const updateTLSSecret = useHelmStore((state) => state.updateTLSSecret);
  const deleteTLSSecret = useHelmStore((state) => state.deleteTLSSecret);

  const addOpaqueSecret = useHelmStore((state) => state.addOpaqueSecret);
  const updateOpaqueSecret = useHelmStore((state) => state.updateOpaqueSecret);
  const deleteOpaqueSecret = useHelmStore((state) => state.deleteOpaqueSecret);

  // TLS Secret handlers
  const openNewTls = () => {
    setEditingTlsSecret(null);
    setTlsFormData({ name: '', cert: '', key: '' });
    setTlsDialogOpen(true);
  };

  const openEditTls = (secret: TLSSecret) => {
    navigate(`/templates/${template.id}/secrets/${secret.id}/edit`);
  };

  const handleTlsSubmit = async () => {
    if (!tlsFormData.name.trim()) {
      toast.error('Secret name is required');
      return;
    }

    try {
      if (editingTlsSecret) {
        await updateTLSSecret(editingTlsSecret.id, {
          name: tlsFormData.name,
          cert: tlsFormData.cert || undefined,
          key: tlsFormData.key || undefined,
        });
        toast.success('TLS secret updated');
      } else {
        const secret: TLSSecret = {
          id: crypto.randomUUID(),
          templateId: template.id,
          name: tlsFormData.name,
          type: 'tls',
          cert: tlsFormData.cert || undefined,
          key: tlsFormData.key || undefined,
        };
        await addTLSSecret(secret);
        toast.success('TLS secret added');
      }
      
      setTlsDialogOpen(false);
    } catch (error) {
      // Error is already handled in the store
    }
  };

  const handleTlsDelete = async () => {
    if (deleteTlsId) {
      try {
        await deleteTLSSecret(deleteTlsId);
        toast.success('TLS secret deleted');
        setDeleteTlsId(null);
      } catch (error) {
        // Error is already handled in the store
      }
    }
  };

  // Opaque Secret handlers
  const openNewOpaque = () => {
    setEditingOpaqueSecret(null);
    setOpaqueFormData({ name: '', keys: [] });
    setOpaqueDialogOpen(true);
  };

  const openEditOpaque = (secret: OpaqueSecret) => {
    navigate(`/templates/${template.id}/secrets/${secret.id}/edit`);
  };

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
      if (editingOpaqueSecret) {
        await updateOpaqueSecret(editingOpaqueSecret.id, {
          name: opaqueFormData.name,
          keys,
        });
        toast.success('Opaque secret updated');
      } else {
        const secret: OpaqueSecret = {
          id: crypto.randomUUID(),
          templateId: template.id,
          name: opaqueFormData.name,
          type: 'opaque',
          keys,
        };
        await addOpaqueSecret(secret);
        toast.success('Opaque secret added');
      }
      
      setOpaqueDialogOpen(false);
    } catch (error) {
      // Error is already handled in the store
    }
  };

  const handleOpaqueDelete = async () => {
    if (deleteOpaqueId) {
      try {
        await deleteOpaqueSecret(deleteOpaqueId);
        toast.success('Opaque secret deleted');
        setDeleteOpaqueId(null);
      } catch (error) {
        // Error is already handled in the store
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Registry Secret */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Registry Secret</h3>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Key className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-mono font-medium">{template.registrySecret.name}</p>
                <p className="text-xs text-muted-foreground">
                  {template.registrySecret.server} • {template.registrySecret.username || 'No username'}
                </p>
              </div>
              <Badge variant="secondary">Registry</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TLS Secrets */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">TLS Secrets</h3>
            <p className="text-sm text-muted-foreground">
              Certificates for Ingress TLS termination
            </p>
          </div>
          {!readOnly && (
            <Button onClick={openNewTls}>
              <Plus className="mr-2 h-4 w-4" />
              Add TLS Secret
            </Button>
          )}
        </div>

        {template.tlsSecrets.length === 0 ? (
          <Card className="border-dashed border-2 bg-transparent">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">No TLS secrets defined yet</p>
              {!readOnly && (
                <Button variant="outline" onClick={openNewTls}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add your first TLS secret
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
                  <TableHead>Type</TableHead>
                <TableHead>Certificate</TableHead>
                <TableHead>Private Key</TableHead>
                {!readOnly && <TableHead className="w-[100px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {template.tlsSecrets.map((secret) => (
                  <TableRow 
                    key={secret.id}
                    className={!readOnly ? "cursor-pointer hover:bg-muted/50" : ""}
                    onClick={() => !readOnly && openEditTls(secret)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-success" />
                        <span className="font-mono font-medium">{secret.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">TLS</Badge>
                    </TableCell>
                    <TableCell>
                      {secret.cert ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell>
                      {secret.key ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    {!readOnly && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditTls(secret)}
                            title="Edit TLS Secret"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteTlsId(secret.id)}
                            title="Delete TLS Secret"
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
      </div>

      {/* Opaque Secrets */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Opaque Secrets</h3>
            <p className="text-sm text-muted-foreground">
              Generic secrets for sensitive data (credentials, tokens, etc.)
            </p>
          </div>
          {!readOnly && (
            <Button onClick={openNewOpaque}>
              <Plus className="mr-2 h-4 w-4" />
              Add Opaque Secret
            </Button>
          )}
        </div>

        {template.opaqueSecrets.length === 0 ? (
          <Card className="border-dashed border-2 bg-transparent">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">No Opaque secrets defined yet</p>
              {!readOnly && (
                <Button variant="outline" onClick={openNewOpaque}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add your first Opaque secret
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
                <TableHead>Type</TableHead>
                <TableHead>Keys</TableHead>
                {!readOnly && <TableHead className="w-[100px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {template.opaqueSecrets.map((secret) => (
                  <TableRow 
                    key={secret.id}
                    className={!readOnly ? "cursor-pointer hover:bg-muted/50" : ""}
                    onClick={() => !readOnly && openEditOpaque(secret)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileKey className="h-4 w-4 text-warning" />
                        <span className="font-mono font-medium">{secret.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">Opaque</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {secret.keys.length > 0 ? (
                          secret.keys.slice(0, 5).map((key, i) => (
                            <Badge key={i} variant="secondary" className="font-mono text-xs">
                              {key.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">No keys defined</span>
                        )}
                        {secret.keys.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{secret.keys.length - 5}
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
                            onClick={() => openEditOpaque(secret)}
                            title="Edit Opaque Secret"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteOpaqueId(secret.id)}
                            title="Delete Opaque Secret"
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
      </div>

      {/* TLS Add/Edit Dialog */}
      <Dialog open={tlsDialogOpen} onOpenChange={setTlsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTlsSecret ? 'Edit TLS Secret' : 'Add TLS Secret'}</DialogTitle>
            <DialogDescription>
              {editingTlsSecret 
                ? 'Update the TLS secret configuration' 
                : 'Create a TLS secret for Ingress HTTPS termination'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
                className="font-mono text-xs min-h-[120px]"
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
                className="font-mono text-xs min-h-[120px]"
              />
              <p className="text-xs text-muted-foreground">
                Paste the PEM-encoded private key or leave empty to set per version
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTlsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleTlsSubmit}>
              {editingTlsSecret ? 'Update' : 'Add'} TLS Secret
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Opaque Add/Edit Dialog */}
      <Dialog open={opaqueDialogOpen} onOpenChange={setOpaqueDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingOpaqueSecret ? 'Edit Opaque Secret' : 'Add Opaque Secret'}</DialogTitle>
            <DialogDescription>
              {editingOpaqueSecret 
                ? 'Update the Opaque secret configuration' 
                : 'Create an Opaque secret with key-value pairs'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpaqueDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleOpaqueSubmit}>
              {editingOpaqueSecret ? 'Update' : 'Add'} Opaque Secret
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TLS Delete Confirmation */}
      <AlertDialog open={!!deleteTlsId} onOpenChange={() => setDeleteTlsId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete TLS Secret</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this TLS secret? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleTlsDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Opaque Delete Confirmation */}
      <AlertDialog open={!!deleteOpaqueId} onOpenChange={() => setDeleteOpaqueId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Opaque Secret</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this Opaque secret? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleOpaqueDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}