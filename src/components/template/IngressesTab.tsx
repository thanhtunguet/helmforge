import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHelmStore } from '@/lib/store';
import { TemplateWithRelations, Ingress, IngressHost } from '@/types/helm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import { Plus, Pencil, Trash2, Lock, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface IngressesTabProps {
  template: TemplateWithRelations;
  readOnly?: boolean;
}

export function IngressesTab({ template, readOnly = false }: IngressesTabProps) {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const addIngress = useHelmStore((state) => state.addIngress);
  const deleteIngress = useHelmStore((state) => state.deleteIngress);

  const [formData, setFormData] = useState({
    name: '',
    mode: 'nginx-gateway' as 'nginx-gateway' | 'direct-services',
  });

  const openNew = () => {
    setFormData({
      name: '',
      mode: 'nginx-gateway',
    });
    setDialogOpen(true);
  };

  const openEdit = (ingress: Ingress) => {
    navigate(`/templates/${template.id}/ingresses/${ingress.id}/edit`);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Ingress name is required');
      return;
    }

    try {
      const newIngress: Ingress = {
        id: crypto.randomUUID(),
        templateId: template.id,
        ...formData,
        hosts: [],
        tls: [],
      };
      await addIngress(newIngress);
      toast.success('Ingress added. Click to edit and configure hosts.');
      setDialogOpen(false);

      // Optionally navigate to edit page immediately
      navigate(`/templates/${template.id}/ingresses/${newIngress.id}/edit`);
    } catch (error) {
      // Error is already handled in the store
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await deleteIngress(deleteId);
        toast.success('Ingress deleted');
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
          <h3 className="text-lg font-semibold">Ingresses</h3>
          <p className="text-sm text-muted-foreground">
            Define ingress rules for external access
          </p>
        </div>
        {!readOnly && (
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" />
            Add Ingress
          </Button>
        )}
      </div>

      {template.ingresses.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No ingresses defined yet</p>
            {!readOnly && (
              <Button variant="outline" onClick={openNew}>
                <Plus className="mr-2 h-4 w-4" />
                Add your first ingress
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
                <TableHead>Mode</TableHead>
                <TableHead>TLS</TableHead>
                <TableHead>Hosts</TableHead>
                {!readOnly && <TableHead className="w-[100px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {template.ingresses.map((ingress) => (
                <TableRow 
                  key={ingress.id}
                  className={!readOnly ? "cursor-pointer hover:bg-muted/50" : ""}
                  onClick={() => !readOnly && openEdit(ingress)}
                >
                  <TableCell className="font-mono font-medium">{ingress.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {ingress.mode === 'nginx-gateway' ? 'Nginx Gateway' : 'Direct'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {ingress.tls && ingress.tls.length > 0 ? (
                      <div className="flex items-center gap-1">
                        <Lock className="h-3.5 w-3.5 text-success" />
                        <span className="text-xs text-muted-foreground">
                          {ingress.tls.length} config{ingress.tls.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {ingress.hosts && ingress.hosts.length > 0 ? (
                        ingress.hosts.slice(0, 2).map((host, i) => (
                          <Badge key={i} variant="secondary" className="font-mono text-xs">
                            {host.hostname}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">No hosts</span>
                      )}
                      {ingress.hosts && ingress.hosts.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{ingress.hosts.length - 2}
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
                          onClick={() => openEdit(ingress)}
                          title="Edit Ingress"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setDeleteId(ingress.id)}
                          title="Delete Ingress"
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Ingress</DialogTitle>
            <DialogDescription>
              Create a new ingress. You'll configure hosts and routes in the next step.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              Create & Configure Hosts
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
