import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Box, Search, Globe, ExternalLink } from 'lucide-react';
import type { Template, RegistrySecret } from '@/types/helm';

export default function CommunityTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchPublicTemplates() {
      setLoading(true);
      try {
        // Fetch all templates and filter for public ones
        const { data, error } = await supabase
          .from('templates')
          .select('*')
          .eq('visibility', 'public')
          .order('updated_at', { ascending: false });

        if (error) throw error;

        setTemplates((data || []).map((t: Record<string, unknown>) => ({
          id: t.id as string,
          name: t.name as string,
          description: (t.description as string) || '',
          sharedPort: t.shared_port as number,
          registryUrl: (t.registry_url as string) || '',
          registryProject: (t.registry_project as string) || '',
          registrySecret: (t.registry_secret as RegistrySecret) || {
            name: 'registry-credentials',
            type: 'registry',
            server: (t.registry_url as string) || '',
            username: '',
            email: '',
          },
          enableNginxGateway: t.enable_nginx_gateway as boolean,
          enableRedis: t.enable_redis as boolean,
          visibility: (t.visibility as 'public' | 'private') || 'public',
          createdAt: t.created_at as string,
          updatedAt: t.updated_at as string,
        })));
      } catch (error) {
        console.error('Error fetching public templates:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPublicTemplates();
  }, []);

  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PublicLayout>
      <div className="animate-fade-in w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Globe className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Community Templates</h1>
              <p className="text-muted-foreground">
                Browse public Helm chart templates shared by the community
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Templates Grid */}
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="bg-card border-border">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Globe className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Public Templates</h3>
              <p className="text-muted-foreground text-center max-w-md">
                {searchQuery
                  ? 'No templates match your search criteria.'
                  : 'There are no public templates available yet. Be the first to share a template with the community!'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => (
              <Link key={template.id} to={`/community/${template.id}`}>
                <Card className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Box className="h-5 w-5 text-primary" />
                        </div>
                        <div className="overflow-hidden">
                          <CardTitle className="truncate">{template.name}</CardTitle>
                          <CardDescription className="truncate">
                            {template.registryUrl}/{template.registryProject}
                          </CardDescription>
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {template.description || 'No description provided'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">Port {template.sharedPort}</Badge>
                      {template.enableNginxGateway && (
                        <Badge variant="outline">Nginx Gateway</Badge>
                      )}
                      {template.enableRedis && (
                        <Badge variant="outline">Redis</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
