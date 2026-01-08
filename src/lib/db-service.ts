import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import {
  Template,
  Service,
  ServicePort,
  ConfigMap,
  TLSSecret,
  OpaqueSecret,
  Ingress,
  ChartVersion,
  TemplateWithRelations,
  Route,
  EnvVarSchema,
  ConfigMapEnvSource,
  SecretEnvSource,
  ConfigMapKey,
  OpaqueSecretKey,
  IngressRule,
  RegistrySecret,
  ChartVersionValues,
  TemplateShare,
  SharePermission,
} from '@/types/helm';

// Database row types
type DbTemplateRow = Database['public']['Tables']['templates']['Row'];
type DbServiceRow = Database['public']['Tables']['services']['Row'];
type DbConfigMapRow = Database['public']['Tables']['config_maps']['Row'];
type DbTLSSecretRow = Database['public']['Tables']['tls_secrets']['Row'];
type DbOpaqueSecretRow = Database['public']['Tables']['opaque_secrets']['Row'];
type DbIngressRow = Database['public']['Tables']['ingresses']['Row'];
type DbChartVersionRow = Database['public']['Tables']['chart_versions']['Row'];

// Database insert types
type DbTemplateInsert = Database['public']['Tables']['templates']['Insert'];
type DbServiceInsert = Database['public']['Tables']['services']['Insert'];
type DbConfigMapInsert = Database['public']['Tables']['config_maps']['Insert'];
type DbTLSSecretInsert = Database['public']['Tables']['tls_secrets']['Insert'];
type DbOpaqueSecretInsert = Database['public']['Tables']['opaque_secrets']['Insert'];
type DbIngressInsert = Database['public']['Tables']['ingresses']['Insert'];
type DbChartVersionInsert = Database['public']['Tables']['chart_versions']['Insert'];

// Helper to convert database template to app template
function dbTemplateToApp(dbTemplate: DbTemplateRow): Template {
  return {
    id: dbTemplate.id,
    name: dbTemplate.name,
    description: dbTemplate.description || '',
    sharedPort: dbTemplate.shared_port,
    registryUrl: dbTemplate.registry_url || '',
    registryProject: dbTemplate.registry_project || '',
    registrySecret: (dbTemplate.registry_secret as unknown as RegistrySecret | null) || {
      name: 'registry-credentials',
      type: 'registry',
      server: dbTemplate.registry_url || '',
      username: '',
      email: '',
    },
    enableNginxGateway: dbTemplate.enable_nginx_gateway,
    enableRedis: dbTemplate.enable_redis,
    visibility: ((dbTemplate as unknown as { visibility?: string }).visibility as Template['visibility']) || 'private',
    readme: (dbTemplate as unknown as { readme?: string | null }).readme || undefined,
    createdAt: dbTemplate.created_at,
    updatedAt: dbTemplate.updated_at,
  };
}

// Helper to convert app template to database format
function appTemplateToDb(template: Template | Partial<Template>): Partial<DbTemplateInsert> {
  const result: Partial<DbTemplateInsert> = {};
  if (template.name !== undefined) result.name = template.name;
  if (template.description !== undefined) result.description = template.description || null;
  if (template.sharedPort !== undefined) result.shared_port = template.sharedPort;
  if (template.registryUrl !== undefined) result.registry_url = template.registryUrl || null;
  if (template.registryProject !== undefined) result.registry_project = template.registryProject || null;
  if (template.registrySecret !== undefined) result.registry_secret = template.registrySecret as unknown as Database['public']['Tables']['templates']['Row']['registry_secret'] || null;
  if (template.enableNginxGateway !== undefined) result.enable_nginx_gateway = template.enableNginxGateway;
  if (template.enableRedis !== undefined) result.enable_redis = template.enableRedis;
  if (template.visibility !== undefined) result.visibility = template.visibility || 'private';
  if (template.readme !== undefined) result.readme = template.readme || null;
  return result;
}

// Helper to convert database service to app service
function dbServiceToApp(dbService: DbServiceRow): Service {
  const extendedService = dbService as DbServiceRow & { use_custom_ports?: boolean; custom_ports?: unknown };
  return {
    id: dbService.id,
    templateId: dbService.template_id,
    name: dbService.name,
    routes: (dbService.routes as unknown as Route[]) || [],
    envVars: (dbService.env_vars as unknown as EnvVarSchema[]) || [],
    healthCheckEnabled: dbService.health_check_enabled,
    livenessPath: dbService.liveness_path || '/health',
    readinessPath: dbService.readiness_path || '/ready',
    configMapEnvSources: (dbService.config_map_env_sources as unknown as ConfigMapEnvSource[]) || [],
    secretEnvSources: (dbService.secret_env_sources as unknown as SecretEnvSource[]) || [],
    useStatefulSet: dbService.use_stateful_set,
    useCustomPorts: extendedService.use_custom_ports ?? false,
    customPorts: (extendedService.custom_ports as unknown as ServicePort[]) || [],
  };
}

// Helper to convert app service to database format
function appServiceToDb(service: Service | Partial<Service>): Record<string, unknown> {
  return {
    template_id: service.templateId!,
    name: service.name!,
    routes: (service.routes || []) as unknown as Database['public']['Tables']['services']['Row']['routes'],
    env_vars: (service.envVars || []) as unknown as Database['public']['Tables']['services']['Row']['env_vars'],
    health_check_enabled: service.healthCheckEnabled ?? false,
    liveness_path: service.livenessPath || '/health',
    readiness_path: service.readinessPath || '/ready',
    config_map_env_sources: (service.configMapEnvSources || []) as unknown as Database['public']['Tables']['services']['Row']['config_map_env_sources'],
    secret_env_sources: (service.secretEnvSources || []) as unknown as Database['public']['Tables']['services']['Row']['secret_env_sources'],
    use_stateful_set: service.useStatefulSet ?? false,
    use_custom_ports: service.useCustomPorts ?? false,
    custom_ports: service.customPorts || [],
  };
}

// Helper to convert database configmap to app configmap
function dbConfigMapToApp(dbConfigMap: DbConfigMapRow): ConfigMap {
  return {
    id: dbConfigMap.id,
    templateId: dbConfigMap.template_id,
    name: dbConfigMap.name,
    keys: (dbConfigMap.keys as unknown as ConfigMapKey[]) || [],
  };
}

// Helper to convert app configmap to database format
function appConfigMapToDb(configMap: ConfigMap | Partial<ConfigMap>): Omit<DbConfigMapInsert, 'id' | 'created_at'> {
  return {
    template_id: configMap.templateId!,
    name: configMap.name!,
    keys: (configMap.keys || []) as unknown as Database['public']['Tables']['config_maps']['Row']['keys'],
  };
}

// Helper to convert database TLS secret to app TLS secret
function dbTLSSecretToApp(dbSecret: DbTLSSecretRow): TLSSecret {
  return {
    id: dbSecret.id,
    templateId: dbSecret.template_id,
    name: dbSecret.name,
    type: 'tls',
  };
}

// Helper to convert app TLS secret to database format
function appTLSSecretToDb(secret: TLSSecret | Partial<TLSSecret>): Omit<DbTLSSecretInsert, 'id' | 'created_at'> {
  return {
    template_id: secret.templateId!,
    name: secret.name!,
  };
}

// Helper to convert database opaque secret to app opaque secret
function dbOpaqueSecretToApp(dbSecret: DbOpaqueSecretRow): OpaqueSecret {
  return {
    id: dbSecret.id,
    templateId: dbSecret.template_id,
    name: dbSecret.name,
    type: 'opaque',
    keys: (dbSecret.keys as unknown as OpaqueSecretKey[]) || [],
  };
}

// Helper to convert app opaque secret to database format
function appOpaqueSecretToDb(secret: OpaqueSecret | Partial<OpaqueSecret>): Omit<DbOpaqueSecretInsert, 'id' | 'created_at'> {
  return {
    template_id: secret.templateId!,
    name: secret.name!,
    keys: (secret.keys || []) as unknown as Database['public']['Tables']['opaque_secrets']['Row']['keys'],
  };
}

// Helper to convert database ingress to app ingress
function dbIngressToApp(dbIngress: DbIngressRow): Ingress {
  const rulesData = dbIngress.rules as unknown;
  let hosts: import('@/types/helm').IngressHost[] = [];

  // Migration: Check if this is the old structure (array of {path, serviceName})
  if (Array.isArray(rulesData) && rulesData.length > 0) {
    // Check if it's the old structure (has 'path' and 'serviceName' properties)
    if (rulesData[0] && 'path' in rulesData[0] && 'serviceName' in rulesData[0] && !('hostname' in rulesData[0])) {
      // Old structure: convert to new structure
      // Create a single host from the defaultHost or use a placeholder
      const hostname = dbIngress.default_host || 'example.com';
      hosts = [{
        hostname: hostname,
        paths: rulesData as Array<{ path: string; serviceName: string }>,
      }];
    } else {
      // New structure: use as-is
      hosts = rulesData as import('@/types/helm').IngressHost[];
    }
  }

  // Migrate TLS configuration
  let tls: import('@/types/helm').IngressTLS[] = [];
  if (dbIngress.tls_enabled && dbIngress.tls_secret_name) {
    // Old structure: single TLS secret for all hosts
    const allHostnames = hosts.map(h => h.hostname);
    if (allHostnames.length > 0) {
      tls = [{
        secretName: dbIngress.tls_secret_name,
        hosts: allHostnames,
      }];
    }
  }

  return {
    id: dbIngress.id,
    templateId: dbIngress.template_id,
    name: dbIngress.name,
    mode: (dbIngress.mode as 'nginx-gateway' | 'direct-services') || 'nginx-gateway',
    hosts: hosts,
    tls: tls,
  };
}

// Helper to convert app ingress to database format
function appIngressToDb(ingress: Ingress | Partial<Ingress>): Omit<DbIngressInsert, 'id' | 'created_at'> {
  // For backward compatibility, store the first TLS config in the old fields
  const hasTLS = ingress.tls && ingress.tls.length > 0;
  const firstTLS = hasTLS ? ingress.tls![0] : null;

  return {
    template_id: ingress.templateId!,
    name: ingress.name!,
    mode: (ingress.mode || 'nginx-gateway') as Database['public']['Tables']['ingresses']['Row']['mode'],
    rules: (ingress.hosts || []) as unknown as Database['public']['Tables']['ingresses']['Row']['rules'],
    default_host: null,
    tls_enabled: hasTLS,
    tls_secret_name: firstTLS?.secretName || null,
  };
}

// Helper to convert database chart version to app chart version
function dbChartVersionToApp(dbVersion: DbChartVersionRow): ChartVersion {
  return {
    id: dbVersion.id,
    templateId: dbVersion.template_id,
    versionName: dbVersion.version_name,
    appVersion: dbVersion.app_version || undefined,
    releaseNotes: (dbVersion as unknown as { release_notes?: string | null }).release_notes || undefined,
    values: (dbVersion.values as unknown as ChartVersionValues) || {
      imageTags: {},
      envValues: {},
      configMapValues: {},
      tlsSecretValues: {},
      opaqueSecretValues: {},
    },
    createdAt: dbVersion.created_at,
  };
}

// Helper to convert app chart version to database format
function appChartVersionToDb(version: ChartVersion | Partial<ChartVersion>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (version.templateId !== undefined) result.template_id = version.templateId;
  if (version.versionName !== undefined) result.version_name = version.versionName;
  if (version.appVersion !== undefined) result.app_version = version.appVersion || null;
  if (version.releaseNotes !== undefined) result.release_notes = version.releaseNotes || null;
  if (version.values !== undefined) {
    result.values = (version.values || {
      imageTags: {},
      envValues: {},
      configMapValues: {},
      tlsSecretValues: {},
    }) as unknown as Database['public']['Tables']['chart_versions']['Row']['values'];
  }
  return result;
}

// Template operations
export const templateDb = {
  async getAll(): Promise<Template[]> {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(dbTemplateToApp);
  },

  async getById(id: string): Promise<Template | null> {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data ? dbTemplateToApp(data) : null;
  },

  async create(template: Template): Promise<Template> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('User not authenticated');

    const insertData: DbTemplateInsert = {
      id: template.id,
      name: template.name,
      user_id: userData.user.id,
      ...appTemplateToDb(template),
    };

    const { data, error } = await supabase
      .from('templates')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return dbTemplateToApp(data);
  },

  async update(id: string, updates: Partial<Template>): Promise<Template> {
    const { data, error } = await supabase
      .from('templates')
      .update({
        ...appTemplateToDb(updates),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return dbTemplateToApp(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

// Service operations
export const serviceDb = {
  async getByTemplateId(templateId: string): Promise<Service[]> {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('template_id', templateId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(dbServiceToApp);
  },

  async create(service: Service): Promise<Service> {
    const insertData = {
      id: service.id,
      ...appServiceToDb(service),
    };
    const { data, error } = await supabase
      .from('services')
      .insert(insertData as Database['public']['Tables']['services']['Insert'])
      .select()
      .single();

    if (error) throw error;
    return dbServiceToApp(data);
  },

  async update(id: string, updates: Partial<Service>): Promise<Service> {
    const updateData = appServiceToDb(updates as Service);
    const { data, error } = await supabase
      .from('services')
      .update(updateData as Database['public']['Tables']['services']['Update'])
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return dbServiceToApp(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

// ConfigMap operations
export const configMapDb = {
  async getByTemplateId(templateId: string): Promise<ConfigMap[]> {
    const { data, error } = await supabase
      .from('config_maps')
      .select('*')
      .eq('template_id', templateId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(dbConfigMapToApp);
  },

  async create(configMap: ConfigMap): Promise<ConfigMap> {
    const { data, error } = await supabase
      .from('config_maps')
      .insert({
        id: configMap.id,
        ...appConfigMapToDb(configMap),
      })
      .select()
      .single();

    if (error) throw error;
    return dbConfigMapToApp(data);
  },

  async update(id: string, updates: Partial<ConfigMap>): Promise<ConfigMap> {
    const { data, error } = await supabase
      .from('config_maps')
      .update(appConfigMapToDb(updates as ConfigMap))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return dbConfigMapToApp(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('config_maps')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

// TLS Secret operations
export const tlsSecretDb = {
  async getByTemplateId(templateId: string): Promise<TLSSecret[]> {
    const { data, error } = await supabase
      .from('tls_secrets')
      .select('*')
      .eq('template_id', templateId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(dbTLSSecretToApp);
  },

  async create(secret: TLSSecret): Promise<TLSSecret> {
    const { data, error } = await supabase
      .from('tls_secrets')
      .insert({
        id: secret.id,
        ...appTLSSecretToDb(secret),
      })
      .select()
      .single();

    if (error) throw error;
    return dbTLSSecretToApp(data);
  },

  async update(id: string, updates: Partial<TLSSecret>): Promise<TLSSecret> {
    const { data, error } = await supabase
      .from('tls_secrets')
      .update(appTLSSecretToDb(updates as TLSSecret))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return dbTLSSecretToApp(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('tls_secrets')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

// Opaque Secret operations
export const opaqueSecretDb = {
  async getByTemplateId(templateId: string): Promise<OpaqueSecret[]> {
    const { data, error } = await supabase
      .from('opaque_secrets')
      .select('*')
      .eq('template_id', templateId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(dbOpaqueSecretToApp);
  },

  async create(secret: OpaqueSecret): Promise<OpaqueSecret> {
    const { data, error } = await supabase
      .from('opaque_secrets')
      .insert({
        id: secret.id,
        ...appOpaqueSecretToDb(secret),
      })
      .select()
      .single();

    if (error) throw error;
    return dbOpaqueSecretToApp(data);
  },

  async update(id: string, updates: Partial<OpaqueSecret>): Promise<OpaqueSecret> {
    const { data, error } = await supabase
      .from('opaque_secrets')
      .update(appOpaqueSecretToDb(updates as OpaqueSecret))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return dbOpaqueSecretToApp(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('opaque_secrets')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

// Ingress operations
export const ingressDb = {
  async getByTemplateId(templateId: string): Promise<Ingress[]> {
    const { data, error } = await supabase
      .from('ingresses')
      .select('*')
      .eq('template_id', templateId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(dbIngressToApp);
  },

  async create(ingress: Ingress): Promise<Ingress> {
    const { data, error } = await supabase
      .from('ingresses')
      .insert({
        id: ingress.id,
        ...appIngressToDb(ingress),
      })
      .select()
      .single();

    if (error) throw error;
    return dbIngressToApp(data);
  },

  async update(id: string, updates: Partial<Ingress>): Promise<Ingress> {
    const { data, error } = await supabase
      .from('ingresses')
      .update(appIngressToDb(updates as Ingress))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return dbIngressToApp(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('ingresses')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

// Chart Version operations
export const chartVersionDb = {
  async getByTemplateId(templateId: string): Promise<ChartVersion[]> {
    const { data, error } = await supabase
      .from('chart_versions')
      .select('*')
      .eq('template_id', templateId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(dbChartVersionToApp);
  },

  async create(version: ChartVersion): Promise<ChartVersion> {
    const insertData: DbChartVersionInsert = {
      id: version.id,
      template_id: version.templateId,
      version_name: version.versionName,
      app_version: version.appVersion || null,
      release_notes: version.releaseNotes || null,
      values: version.values as unknown as Database['public']['Tables']['chart_versions']['Row']['values'],
    };
    const { data, error } = await supabase
      .from('chart_versions')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return dbChartVersionToApp(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('chart_versions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

// Load all data for a user
export async function loadAllData(): Promise<{
  templates: Template[];
  services: Service[];
  configMaps: ConfigMap[];
  tlsSecrets: TLSSecret[];
  opaqueSecrets: OpaqueSecret[];
  ingresses: Ingress[];
  chartVersions: ChartVersion[];
}> {
  const templates = await templateDb.getAll();
  const templateIds = templates.map((t) => t.id);

  const [services, configMaps, tlsSecrets, opaqueSecrets, ingresses, chartVersions] = await Promise.all([
    Promise.all(templateIds.map((id) => serviceDb.getByTemplateId(id))).then((results) => results.flat()),
    Promise.all(templateIds.map((id) => configMapDb.getByTemplateId(id))).then((results) => results.flat()),
    Promise.all(templateIds.map((id) => tlsSecretDb.getByTemplateId(id))).then((results) => results.flat()),
    Promise.all(templateIds.map((id) => opaqueSecretDb.getByTemplateId(id))).then((results) => results.flat()),
    Promise.all(templateIds.map((id) => ingressDb.getByTemplateId(id))).then((results) => results.flat()),
    Promise.all(templateIds.map((id) => chartVersionDb.getByTemplateId(id))).then((results) => results.flat()),
  ]);

  return {
    templates,
    services,
    configMaps,
    tlsSecrets,
    opaqueSecrets,
    ingresses,
    chartVersions,
  };
}

// Template Share operations
export const templateShareDb = {
  async getByTemplateId(templateId: string): Promise<TemplateShare[]> {
    const { data, error } = await supabase
      .from('template_shares')
      .select('*')
      .eq('template_id', templateId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Fetch user profiles for shared users
    const shares = data || [];
    if (shares.length === 0) return [];
    
    const userIds = shares.map(s => (s as { shared_with_user_id: string }).shared_with_user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, display_name')
      .in('id', userIds);
    
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    
    return shares.map(s => {
      const share = s as { id: string; template_id: string; shared_with_user_id: string; permission: string; shared_by_user_id: string; created_at: string };
      const profile = profileMap.get(share.shared_with_user_id);
      return {
        id: share.id,
        templateId: share.template_id,
        sharedWithUserId: share.shared_with_user_id,
        sharedWithEmail: profile?.email || undefined,
        sharedWithDisplayName: profile?.display_name || undefined,
        permission: share.permission as SharePermission,
        sharedByUserId: share.shared_by_user_id,
        createdAt: share.created_at,
      };
    });
  },

  async create(templateId: string, sharedWithUserId: string, permission: SharePermission): Promise<TemplateShare> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('template_shares')
      .insert({
        template_id: templateId,
        shared_with_user_id: sharedWithUserId,
        permission,
        shared_by_user_id: userData.user.id,
      } as Database['public']['Tables']['template_shares']['Insert'])
      .select()
      .single();

    if (error) throw error;
    
    const share = data as { id: string; template_id: string; shared_with_user_id: string; permission: string; shared_by_user_id: string; created_at: string };
    return {
      id: share.id,
      templateId: share.template_id,
      sharedWithUserId: share.shared_with_user_id,
      permission: share.permission as SharePermission,
      sharedByUserId: share.shared_by_user_id,
      createdAt: share.created_at,
    };
  },

  async update(shareId: string, permission: SharePermission): Promise<void> {
    const { error } = await supabase
      .from('template_shares')
      .update({ permission } as Database['public']['Tables']['template_shares']['Update'])
      .eq('id', shareId);

    if (error) throw error;
  },

  async delete(shareId: string): Promise<void> {
    const { error } = await supabase
      .from('template_shares')
      .delete()
      .eq('id', shareId);

    if (error) throw error;
  },

  async findUserByEmail(email: string): Promise<{ id: string; email: string; displayName: string | null } | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, display_name')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    
    return data ? { id: data.id, email: data.email || '', displayName: data.display_name } : null;
  },

  async getSharedWithMe(): Promise<{ templateId: string; permission: SharePermission; sharedByUserId: string }[]> {
    const { data, error } = await supabase
      .from('template_shares')
      .select('template_id, permission, shared_by_user_id');

    if (error) throw error;
    
    return (data || []).map(s => {
      const share = s as { template_id: string; permission: string; shared_by_user_id: string };
      return {
        templateId: share.template_id,
        permission: share.permission as SharePermission,
        sharedByUserId: share.shared_by_user_id,
      };
    });
  },
};
