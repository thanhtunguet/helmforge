import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';
import { supabase } from '@/integrations/supabase/client';
import {
  LayoutDashboard,
  Box,
  Plus,
  FileCode2,
  Layers,
  LogOut,
  User,
  BookOpen,
  Key,
  Lock,
  Users,
  Globe,
} from 'lucide-react';
import { useHelmStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChangePasswordDialog } from '@/components/auth/ChangePasswordDialog';
import { toast } from 'sonner';

export function Sidebar() {
  const location = useLocation();
  const templates = useHelmStore((state) => state.templates);
  const { user, signOut } = useAuth();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      if (user) {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin');
        setIsAdmin(data && data.length > 0);
      }
    }
    checkAdmin();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
  };

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/templates/new', icon: Plus, label: 'New Template' },
    { path: '/service-accounts', icon: Key, label: 'Service Accounts' },
  ];

  if (isAdmin) {
    navItems.push({ path: '/users', icon: Users, label: 'User Management' });
  }

  const userInitials = user?.email?.charAt(0).toUpperCase() || 'U';

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 glow-primary">
            <Layers className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">HelmForge</h1>
            <p className="text-xs text-muted-foreground">Chart Designer</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
          <div className="mb-4">
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Navigation
            </p>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all',
                    isActive
                      ? 'bg-sidebar-accent text-primary'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {templates.length > 0 && (
            <div>
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Templates
              </p>
              <div className="space-y-1">
                {templates.slice(0, 8).map((template) => {
                  const isActive = location.pathname.includes(`/templates/${template.id}`);
                  return (
                    <Link
                      key={template.id}
                      to={`/templates/${template.id}`}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all',
                        isActive
                          ? 'bg-sidebar-accent text-primary'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground'
                      )}
                    >
                      <Box className="h-4 w-4" />
                      <span className="truncate">{template.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </nav>

        {/* User & Footer */}
        <div className="border-t border-sidebar-border p-4 space-y-4">
          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-3 px-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left overflow-hidden">
                  <p className="text-sm font-medium truncate">
                    {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email}
                  </p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem disabled>
                <User className="mr-2 h-4 w-4" />
                Profile (coming soon)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setChangePasswordOpen(true)}>
                <Lock className="mr-2 h-4 w-4" />
                Change password
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="space-y-2">
            <Link
              to="/community"
              className="flex items-center gap-2 rounded-lg py-2 text-xs transition-all text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
            >
              <Globe className="h-4 w-4" />
              Community Templates
            </Link>
            <Link
              to="/docs"
              target="_blank"
              className="flex items-center gap-2 rounded-lg py-2 text-xs transition-all text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
            >
              <BookOpen className="h-4 w-4" />
              Documentation
            </Link>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileCode2 className="h-4 w-4" />
                <span>Helm v3 Compatible</span>
              </div>
              <ThemeSwitcher />
            </div>
          </div>
        </div>
      </div>
      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </aside>
  );
}