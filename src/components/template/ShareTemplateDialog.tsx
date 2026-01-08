import { useState, useEffect } from 'react';
import { TemplateShare, SharePermission } from '@/types/helm';
import { templateShareDb } from '@/lib/db-service';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Trash2, UserPlus, Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ShareTemplateDialogProps {
  templateId: string;
  templateName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareTemplateDialog({ 
  templateId, 
  templateName, 
  open, 
  onOpenChange 
}: ShareTemplateDialogProps) {
  const [shares, setShares] = useState<TemplateShare[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<SharePermission>('view');

  useEffect(() => {
    if (open) {
      loadShares();
    }
  }, [open, templateId]);

  const loadShares = async () => {
    setLoading(true);
    try {
      const data = await templateShareDb.getByTemplateId(templateId);
      setShares(data);
    } catch (error) {
      toast.error('Failed to load shares');
    } finally {
      setLoading(false);
    }
  };

  const handleAddShare = async () => {
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setSaving(true);
    try {
      // Find user by email
      const user = await templateShareDb.findUserByEmail(email.trim());
      if (!user) {
        toast.error('No user found with that email address');
        return;
      }

      // Check if already shared
      if (shares.some(s => s.sharedWithUserId === user.id)) {
        toast.error('Already shared with this user');
        return;
      }

      await templateShareDb.create(templateId, user.id, permission);
      toast.success(`Shared with ${user.email}`);
      setEmail('');
      await loadShares();
    } catch (error) {
      toast.error('Failed to share template');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePermission = async (shareId: string, newPermission: SharePermission) => {
    try {
      await templateShareDb.update(shareId, newPermission);
      setShares(shares.map(s => 
        s.id === shareId ? { ...s, permission: newPermission } : s
      ));
      toast.success('Permission updated');
    } catch (error) {
      toast.error('Failed to update permission');
    }
  };

  const handleRemoveShare = async (shareId: string) => {
    try {
      await templateShareDb.delete(shareId);
      setShares(shares.filter(s => s.id !== shareId));
      toast.success('Share removed');
    } catch (error) {
      toast.error('Failed to remove share');
    }
  };

  const getInitials = (email?: string, name?: string) => {
    if (name) return name.substring(0, 2).toUpperCase();
    if (email) return email.substring(0, 2).toUpperCase();
    return '??';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Share "{templateName}"
          </DialogTitle>
          <DialogDescription>
            Share this template with other users. They can view or edit based on the permission you grant.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Add new share */}
          <div className="space-y-4">
            <Label>Add people</Label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddShare()}
                />
              </div>
              <Select value={permission} onValueChange={(v) => setPermission(v as SharePermission)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">Can view</SelectItem>
                  <SelectItem value="edit">Can edit</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleAddShare} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Current shares */}
          <div className="space-y-2">
            <Label>People with access</Label>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : shares.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Not shared with anyone yet</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Permission</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shares.map((share) => (
                      <TableRow key={share.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {getInitials(share.sharedWithEmail, share.sharedWithDisplayName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              {share.sharedWithDisplayName && (
                                <p className="font-medium truncate">{share.sharedWithDisplayName}</p>
                              )}
                              <p className="text-sm text-muted-foreground truncate">
                                {share.sharedWithEmail || share.sharedWithUserId}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={share.permission} 
                            onValueChange={(v) => handleUpdatePermission(share.id, v as SharePermission)}
                          >
                            <SelectTrigger className="w-[110px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="view">Can view</SelectItem>
                              <SelectItem value="edit">Can edit</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleRemoveShare(share.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}