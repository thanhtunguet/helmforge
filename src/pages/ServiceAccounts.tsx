import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Plus,
  Key,
  Trash2,
  Copy,
  Settings,
  Eye,
  EyeOff,
  RefreshCw,
  Shield,
} from "lucide-react";
import { format } from "date-fns";

interface ServiceAccount {
  id: string;
  name: string;
  description: string | null;
  api_key_prefix: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
}

interface Template {
  id: string;
  name: string;
}

interface TemplateAccess {
  template_id: string;
}

export default function ServiceAccounts() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [serviceAccounts, setServiceAccounts] = useState<ServiceAccount[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isManageAccessOpen, setIsManageAccessOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<ServiceAccount | null>(null);
  const [selectedTemplateAccess, setSelectedTemplateAccess] = useState<string[]>([]);
  const [deleteAccount, setDeleteAccount] = useState<ServiceAccount | null>(null);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");

  useEffect(() => {
    if (user) {
      fetchServiceAccounts();
      fetchTemplates();
    }
  }, [user]);

  async function fetchServiceAccounts() {
    setLoading(true);
    const { data, error } = await supabase
      .from("service_accounts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load service accounts");
      console.error(error);
    } else {
      setServiceAccounts(data || []);
    }
    setLoading(false);
  }

  async function fetchTemplates() {
    const { data, error } = await supabase
      .from("templates")
      .select("id, name")
      .order("name");

    if (error) {
      console.error(error);
    } else {
      setTemplates(data || []);
    }
  }

  async function fetchTemplateAccess(serviceAccountId: string) {
    const { data, error } = await supabase
      .from("service_account_template_access")
      .select("template_id")
      .eq("service_account_id", serviceAccountId);

    if (error) {
      console.error(error);
      return [];
    }
    return data.map((d: TemplateAccess) => d.template_id);
  }

  function generateApiKey(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 48; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  function hashApiKey(apiKey: string): string {
    // Simple hash for client-side - matches the edge function
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);
    const hashArray = new Uint8Array(32);
    
    for (let i = 0; i < data.length; i++) {
      hashArray[i % 32] ^= data[i];
    }
    
    return Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function createServiceAccount() {
    if (!formName.trim()) {
      toast.error("Name is required");
      return;
    }

    const apiKey = generateApiKey();
    const apiKeyHash = hashApiKey(apiKey);
    const apiKeyPrefix = apiKey.substring(0, 8);

    const { data, error } = await supabase.from("service_accounts").insert({
      user_id: user?.id,
      name: formName.trim(),
      description: formDescription.trim() || null,
      api_key_hash: apiKeyHash,
      api_key_prefix: apiKeyPrefix,
    }).select().single();

    if (error) {
      toast.error("Failed to create service account");
      console.error(error);
    } else {
      setNewApiKey(apiKey);
      setFormName("");
      setFormDescription("");
      fetchServiceAccounts();
      toast.success("Service account created");
    }
  }

  async function toggleAccountStatus(account: ServiceAccount) {
    const { error } = await supabase
      .from("service_accounts")
      .update({ is_active: !account.is_active })
      .eq("id", account.id);

    if (error) {
      toast.error("Failed to update status");
    } else {
      fetchServiceAccounts();
      toast.success(account.is_active ? "Account disabled" : "Account enabled");
    }
  }

  async function handleDeleteAccount() {
    if (!deleteAccount) return;

    const { error } = await supabase
      .from("service_accounts")
      .delete()
      .eq("id", deleteAccount.id);

    if (error) {
      toast.error("Failed to delete service account");
    } else {
      fetchServiceAccounts();
      toast.success("Service account deleted");
    }
    setDeleteAccount(null);
  }

  async function openManageAccess(account: ServiceAccount) {
    setSelectedAccount(account);
    const access = await fetchTemplateAccess(account.id);
    setSelectedTemplateAccess(access);
    setIsManageAccessOpen(true);
  }

  async function saveTemplateAccess() {
    if (!selectedAccount) return;

    // Delete existing access
    await supabase
      .from("service_account_template_access")
      .delete()
      .eq("service_account_id", selectedAccount.id);

    // Insert new access
    if (selectedTemplateAccess.length > 0) {
      const { error } = await supabase.from("service_account_template_access").insert(
        selectedTemplateAccess.map((templateId) => ({
          service_account_id: selectedAccount.id,
          template_id: templateId,
        }))
      );

      if (error) {
        toast.error("Failed to update template access");
        console.error(error);
        return;
      }
    }

    toast.success("Template access updated");
    setIsManageAccessOpen(false);
    setSelectedAccount(null);
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  return (
    <MainLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Service Accounts</h1>
            <p className="text-muted-foreground mt-1">
              Manage API access for external services to your Helm registry
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) {
              setNewApiKey(null);
              setShowApiKey(false);
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Service Account
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              {newApiKey ? (
                <>
                  <DialogHeader>
                    <DialogTitle>API Key Created</DialogTitle>
                    <DialogDescription>
                      Copy this API key now. You won't be able to see it again.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>API Key</Label>
                      <div className="flex gap-2">
                        <Input
                          type={showApiKey ? "text" : "password"}
                          value={newApiKey}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setShowApiKey(!showApiKey)}
                        >
                          {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(newApiKey)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => {
                      setIsCreateOpen(false);
                      setNewApiKey(null);
                    }}>
                      Done
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle>Create Service Account</DialogTitle>
                    <DialogDescription>
                      Create a new service account for external API access
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        placeholder="e.g., CI/CD Pipeline"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description (optional)</Label>
                      <Textarea
                        id="description"
                        placeholder="What will this service account be used for?"
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={createServiceAccount}>Create</Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Registry URL Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Registry Configuration
            </CardTitle>
            <CardDescription>
              Use these endpoints with your service account API key
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Base Registry URL</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`${supabaseUrl}/functions/v1/helm-registry`}
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(`${supabaseUrl}/functions/v1/helm-registry`)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                <strong>Index endpoint:</strong>{" "}
                <code className="bg-muted px-1 rounded">
                  {`{base-url}/{templateId}/index.yaml`}
                </code>
              </p>
              <p>
                <strong>Chart download:</strong>{" "}
                <code className="bg-muted px-1 rounded">
                  {`{base-url}/{templateId}/charts/{chartName}-{version}.tgz`}
                </code>
              </p>
              <p className="pt-2">
                <strong>Authentication:</strong> Pass API key in{" "}
                <code className="bg-muted px-1 rounded">X-API-Key</code> header or{" "}
                <code className="bg-muted px-1 rounded">Authorization: Bearer</code>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Service Accounts List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Key className="h-5 w-5" />
              Service Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading...
              </div>
            ) : serviceAccounts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No service accounts yet. Create one to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>API Key Prefix</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serviceAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{account.name}</div>
                          {account.description && (
                            <div className="text-sm text-muted-foreground">
                              {account.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="bg-muted px-2 py-1 rounded text-sm">
                          {account.api_key_prefix}...
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={account.is_active ? "default" : "secondary"}
                        >
                          {account.is_active ? "Active" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {account.last_used_at
                          ? format(new Date(account.last_used_at), "MMM d, yyyy HH:mm")
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        {format(new Date(account.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openManageAccess(account)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Switch
                            checked={account.is_active}
                            onCheckedChange={() => toggleAccountStatus(account)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteAccount(account)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Manage Template Access Dialog */}
        <Dialog open={isManageAccessOpen} onOpenChange={setIsManageAccessOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Manage Template Access</DialogTitle>
              <DialogDescription>
                Select which templates "{selectedAccount?.name}" can access
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[300px] py-4">
              <div className="space-y-3">
                {templates.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No templates available. Create a template first.
                  </p>
                ) : (
                  templates.map((template) => (
                    <div key={template.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={template.id}
                        checked={selectedTemplateAccess.includes(template.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedTemplateAccess([...selectedTemplateAccess, template.id]);
                          } else {
                            setSelectedTemplateAccess(
                              selectedTemplateAccess.filter((id) => id !== template.id)
                            );
                          }
                        }}
                      />
                      <Label htmlFor={template.id} className="cursor-pointer">
                        {template.name}
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsManageAccessOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveTemplateAccess}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteAccount} onOpenChange={() => setDeleteAccount(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Service Account</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deleteAccount?.name}"? This action
                cannot be undone and will invalidate the API key.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAccount}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
