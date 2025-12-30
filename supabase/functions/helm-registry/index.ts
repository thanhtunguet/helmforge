import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import pako from 'https://esm.sh/pako@2.1.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegistrySecret {
  username: string;
  email?: string;
}

interface Route {
  path: string;
}

interface Service {
  id: string;
  template_id: string;
  name: string;
  routes: Route[];
  liveness_path: string | null;
  readiness_path: string | null;
  [key: string]: unknown;
}

interface ConfigMap {
  id: string;
  template_id: string;
  name: string;
  [key: string]: unknown;
}

interface TLSSecret {
  id: string;
  template_id: string;
  name: string;
  [key: string]: unknown;
}

interface OpaqueSecret {
  id: string;
  template_id: string;
  name: string;
  [key: string]: unknown;
}

interface IngressRule {
  path: string;
  serviceName: string;
}

interface Ingress {
  id: string;
  template_id: string;
  name: string;
  mode: 'nginx-gateway' | 'direct-services';
  rules: IngressRule[];
  tls_enabled: boolean;
  tls_secret_name: string | null;
  [key: string]: unknown;
}

interface ChartVersionValues {
  imageTags?: Record<string, string>;
  envValues?: Record<string, Record<string, string>>;
  configMapValues?: Record<string, Record<string, string>>;
  tlsSecretValues?: Record<string, { crt: string; key: string }>;
  opaqueSecretValues?: Record<string, Record<string, string>>;
  ingressHosts?: Record<string, string[]>;
  enableNginxGateway?: boolean;
  enableRedis?: boolean;
  registryPassword?: string;
}

interface TemplateWithRelations {
  id: string;
  name: string;
  description: string | null;
  shared_port: number;
  registry_url: string | null;
  registry_project: string | null;
  registry_secret: RegistrySecret | null;
  enable_nginx_gateway: boolean;
  enable_redis: boolean;
  services: Service[];
  config_maps: ConfigMap[];
  tls_secrets: TLSSecret[];
  opaque_secrets: OpaqueSecret[];
  ingresses: Ingress[];
}

interface ChartVersion {
  id: string;
  template_id: string;
  version_name: string;
  app_version: string | null;
  values: ChartVersionValues;
  created_at: string;
}

// Generate Chart.yaml content
function generateChartYaml(template: TemplateWithRelations, version: ChartVersion): string {
  return `apiVersion: v2
name: ${template.name.toLowerCase().replace(/\s+/g, '-')}
description: ${template.description || 'A Helm chart for Kubernetes'}
type: application
version: ${version.version_name}
appVersion: "${version.app_version || '1.0.0'}"
`;
}

// Format object to YAML
function formatYaml(obj: Record<string, unknown> | unknown[], indent = 0): string {
  const spaces = '  '.repeat(indent);
  let result = '';

  // Handle arrays
  if (Array.isArray(obj)) {
    obj.forEach((item) => {
      if (item !== null && item !== undefined) {
        if (typeof item === 'object' && !Array.isArray(item)) {
          result += `${spaces}  -\n${formatYaml(item as Record<string, unknown>, indent + 2)}`;
        } else if (Array.isArray(item)) {
          result += `${spaces}  -\n${formatYaml(item, indent + 2)}`;
        } else {
          result += `${spaces}  - ${item}\n`;
        }
      }
    });
    return result;
  }

  // Handle objects
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;

    if (typeof value === 'object' && !Array.isArray(value)) {
      result += `${spaces}${key}:\n${formatYaml(value as Record<string, unknown>, indent + 1)}`;
    } else if (Array.isArray(value)) {
      result += `${spaces}${key}:\n`;
      value.forEach((item) => {
        if (item !== null && item !== undefined) {
          if (typeof item === 'object' && !Array.isArray(item)) {
            result += `${spaces}  -\n${formatYaml(item as Record<string, unknown>, indent + 2)}`;
          } else if (Array.isArray(item)) {
            result += `${spaces}  -\n${formatYaml(item, indent + 2)}`;
          } else {
            result += `${spaces}  - ${item}\n`;
          }
        }
      });
    } else {
      result += `${spaces}${key}: ${typeof value === 'string' && value.includes(':') ? `"${value}"` : value}\n`;
    }
  }

  return result;
}

interface HelmValues {
  global: {
    sharedPort: number;
    registry: {
      url: string | null;
      project: string | null;
      password: string | null;
    };
  };
  services: Record<
    string,
    {
      imageTag: string;
      env: Record<string, string>;
      livenessPath: string | null;
      readinessPath: string | null;
    }
  >;
  configMaps: Record<string, Record<string, string>>;
  ingress: Record<
    string,
    {
      hosts: string[];
      rules: Array<{ path: string; serviceName: string }>;
      tlsEnabled: boolean;
      tlsSecretName: string | null;
    }
  >;
  nginx: {
    enabled: boolean;
  };
  redis: {
    enabled: boolean;
  };
}

// Generate values.yaml content
function generateValuesYaml(template: TemplateWithRelations, version: ChartVersion): string {
  const values: HelmValues = {
    global: {
      sharedPort: template.shared_port,
      registry: {
        url: template.registry_url,
        project: template.registry_project,
        password: version.values.registryPassword || null,
      },
    },
    services: {},
    configMaps: {},
    ingress: {},
    nginx: {
      enabled: version.values.enableNginxGateway ?? template.enable_nginx_gateway,
    },
    redis: {
      enabled: version.values.enableRedis ?? template.enable_redis,
    },
  };

  template.services.forEach((svc) => {
    values.services[svc.name] = {
      imageTag: version.values.imageTags?.[svc.name] || 'latest',
      env: version.values.envValues?.[svc.name] || {},
      livenessPath: svc.liveness_path,
      readinessPath: svc.readiness_path,
    };
  });

  template.config_maps.forEach((cm) => {
    values.configMaps[cm.name] = version.values.configMapValues?.[cm.name] || {};
  });

  template.ingresses.forEach((ing) => {
    values.ingress[ing.name] = {
      hosts: version.values.ingressHosts?.[ing.name] || [],
      rules: ing.rules || [],
      tlsEnabled: ing.tls_enabled,
      tlsSecretName: ing.tls_secret_name,
    };
  });

  return formatYaml(values as unknown as Record<string, unknown>);
}

// Generate Deployment YAML
function generateDeploymentYaml(serviceName: string, service: Service): string {
  return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${serviceName}
  labels:
    app: ${serviceName}
    chart: {{ .Chart.Name }}-{{ .Chart.Version }}
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ${serviceName}
  template:
    metadata:
      labels:
        app: ${serviceName}
    spec:
      imagePullSecrets:
        - name: registry-secret
      containers:
        - name: ${serviceName}
          image: "{{ .Values.global.registry.url }}/{{ .Values.global.registry.project }}/${serviceName}:{{ index .Values.services "${serviceName}" "imageTag" }}"
          ports:
            - containerPort: {{ .Values.global.sharedPort }}
          {{- $serviceValues := index .Values.services "${serviceName}" }}
          {{- if $serviceValues.env }}
          env:
            {{- range $key, $value := $serviceValues.env }}
            - name: {{ $key }}
              value: {{ $value | quote }}
            {{- end }}
          {{- end }}
          livenessProbe:
            httpGet:
              path: ${service.liveness_path}
              port: {{ .Values.global.sharedPort }}
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: ${service.readiness_path}
              port: {{ .Values.global.sharedPort }}
            initialDelaySeconds: 5
            periodSeconds: 5
`;
}

// Generate Service YAML
function generateServiceYaml(serviceName: string): string {
  return `apiVersion: v1
kind: Service
metadata:
  name: ${serviceName}
  labels:
    app: ${serviceName}
spec:
  type: ClusterIP
  ports:
    - port: {{ .Values.global.sharedPort }}
      targetPort: {{ .Values.global.sharedPort }}
      protocol: TCP
  selector:
    app: ${serviceName}
`;
}

// Generate ConfigMap YAML
function generateConfigMapYaml(configMapName: string): string {
  return `apiVersion: v1
kind: ConfigMap
metadata:
  name: ${configMapName}
data:
  {{- range $key, $value := .Values.configMaps.${configMapName} }}
  {{ $key }}: {{ $value | quote }}
  {{- end }}
`;
}

// Generate Registry Secret YAML
function generateRegistrySecretYaml(template: TemplateWithRelations): string {
  const username = template.registry_secret?.username || '';
  const email = template.registry_secret?.email || '';
  return `apiVersion: v1
kind: Secret
metadata:
  name: registry-secret
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: {{ printf "{\\"auths\\": {\\"%s\\": {\\"username\\": \\"%s\\", \\"password\\": \\"%s\\", \\"email\\": \\"%s\\"}}}" .Values.global.registry.url "${username}" .Values.global.registry.password "${email}" | b64enc }}
`;
}

// Generate TLS Secret YAML
function generateTLSSecretYaml(secretName: string): string {
  return `apiVersion: v1
kind: Secret
metadata:
  name: ${secretName}
type: kubernetes.io/tls
stringData:
  tls.crt: |
    {{ .Values.tlsSecrets.${secretName}.crt | indent 4 }}
  tls.key: |
    {{ .Values.tlsSecrets.${secretName}.key | indent 4 }}
`;
}

// Generate Nginx ConfigMap
function generateNginxConfigMap(template: TemplateWithRelations): string {
  const allRoutes = template.services.flatMap((svc) =>
    (svc.routes || []).map((r: Route) => ({ path: r.path, serviceName: svc.name })),
  );

  const locationBlocks = allRoutes
    .map(
      (route) => `    location ${route.path} {
        proxy_pass http://${route.serviceName}:{{ .Values.global.sharedPort }};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }`,
    )
    .join('\n\n');

  return `apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-gateway-config
data:
  default.conf: |
    server {
        listen {{ .Values.global.sharedPort }};
        server_name _;

${locationBlocks}
    }
`;
}

// Generate Nginx Deployment YAML
function generateNginxDeploymentYaml(): string {
  return `{{- if .Values.nginx.enabled }}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-gateway
  labels:
    app: nginx-gateway
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx-gateway
  template:
    metadata:
      labels:
        app: nginx-gateway
    spec:
      containers:
        - name: nginx
          image: nginx:alpine
          ports:
            - containerPort: {{ .Values.global.sharedPort }}
          volumeMounts:
            - name: nginx-config
              mountPath: /etc/nginx/conf.d
      volumes:
        - name: nginx-config
          configMap:
            name: nginx-gateway-config
{{- end }}
`;
}

// Generate Nginx Service YAML
function generateNginxServiceYaml(): string {
  return `{{- if .Values.nginx.enabled }}
apiVersion: v1
kind: Service
metadata:
  name: nginx-gateway
  labels:
    app: nginx-gateway
spec:
  type: ClusterIP
  ports:
    - port: {{ .Values.global.sharedPort }}
      targetPort: {{ .Values.global.sharedPort }}
      protocol: TCP
  selector:
    app: nginx-gateway
{{- end }}
`;
}

// Generate Redis Deployment YAML
function generateRedisDeploymentYaml(): string {
  return `{{- if .Values.redis.enabled }}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  labels:
    app: redis
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
        - name: redis
          image: redis:alpine
          ports:
            - containerPort: 6379
{{- end }}
`;
}

// Generate Redis Service YAML
function generateRedisServiceYaml(): string {
  return `{{- if .Values.redis.enabled }}
apiVersion: v1
kind: Service
metadata:
  name: redis
  labels:
    app: redis
spec:
  type: ClusterIP
  ports:
    - port: 6379
      targetPort: 6379
      protocol: TCP
  selector:
    app: redis
{{- end }}
`;
}

// Generate Ingress YAML
function generateIngressYaml(ingressName: string, ingress: Ingress): string {
  return `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ${ingressName}
  annotations:
    kubernetes.io/ingress.class: nginx
spec:
  {{- $ingressValues := index .Values.ingress "${ingressName}" }}
  {{- if $ingressValues.tlsEnabled }}
  tls:
    - hosts:
        {{- range $ingressValues.hosts }}
        - {{ . }}
        {{- end }}
      secretName: ${ingress.tls_secret_name || 'tls-secret'}
  {{- end }}
  rules:
    {{- range $host := $ingressValues.hosts }}
    - host: {{ $host }}
      http:
        paths:
          {{- if eq "${ingress.mode}" "nginx-gateway" }}
          - path: /
            pathType: Prefix
            backend:
              service:
                name: nginx-gateway
                port:
                  number: {{ $.Values.global.sharedPort }}
          {{- else }}
          {{- if $ingressValues.rules }}
          {{- range $rule := $ingressValues.rules }}
          - path: {{ $rule.path }}
            pathType: Prefix
            backend:
              service:
                name: {{ $rule.serviceName }}
                port:
                  number: {{ $.Values.global.sharedPort }}
          {{- end }}
          {{- else }}
          - path: /
            pathType: Prefix
            backend:
              service:
                name: nginx-gateway
                port:
                  number: {{ $.Values.global.sharedPort }}
          {{- end }}
          {{- end }}
    {{- end }}
`;
}

// Simple tar file creation helper
function createTarEntry(filename: string, content: Uint8Array): Uint8Array {
  // Create a 512-byte header
  const header = new Uint8Array(512);
  const encoder = new TextEncoder();
  
  // File name (100 bytes)
  const nameBytes = encoder.encode(filename);
  header.set(nameBytes.subarray(0, Math.min(100, nameBytes.length)), 0);
  
  // File mode (8 bytes) - 0644
  header.set(encoder.encode('0000644\0'), 100);
  
  // UID (8 bytes) - 0
  header.set(encoder.encode('0000000\0'), 108);
  
  // GID (8 bytes) - 0
  header.set(encoder.encode('0000000\0'), 116);
  
  // File size in octal (12 bytes)
  const sizeStr = content.length.toString(8).padStart(11, '0') + '\0';
  header.set(encoder.encode(sizeStr), 124);
  
  // Modification time (12 bytes)
  const mtime = Math.floor(Date.now() / 1000).toString(8).padStart(11, '0') + '\0';
  header.set(encoder.encode(mtime), 136);
  
  // Checksum placeholder (8 spaces)
  header.set(encoder.encode('        '), 148);
  
  // Type flag (1 byte) - '0' for regular file
  header[156] = 48; // ASCII '0'
  
  // Calculate checksum
  let checksum = 0;
  for (let i = 0; i < 512; i++) {
    checksum += header[i];
  }
  const checksumStr = checksum.toString(8).padStart(6, '0') + '\0 ';
  header.set(encoder.encode(checksumStr), 148);
  
  // Pad content to 512-byte boundary
  const paddedSize = Math.ceil(content.length / 512) * 512;
  const paddedContent = new Uint8Array(paddedSize);
  paddedContent.set(content);
  
  // Combine header and content
  const result = new Uint8Array(512 + paddedSize);
  result.set(header, 0);
  result.set(paddedContent, 512);
  
  return result;
}

// Generate full chart package as base64 string
async function generateChartPackage(template: TemplateWithRelations, version: ChartVersion): Promise<string> {
  const chartName = template.name.toLowerCase().replace(/\s+/g, '-');
  const encoder = new TextEncoder();
  
  // Collect all tar entries
  const entries: Uint8Array[] = [];
  
  // Helper function to add file to tar
  const addFile = (path: string, content: string) => {
    // Normalize line endings to LF and ensure content ends with newline
    const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const contentWithNewline = normalizedContent.endsWith('\n') ? normalizedContent : normalizedContent + '\n';
    const contentBytes = encoder.encode(contentWithNewline);
    entries.push(createTarEntry(path, contentBytes));
  };

  // Chart.yaml
  addFile(`${chartName}/Chart.yaml`, generateChartYaml(template, version));

  // values.yaml
  addFile(`${chartName}/values.yaml`, generateValuesYaml(template, version));

  // Service deployments and services
  template.services.forEach((svc) => {
    addFile(`${chartName}/templates/deployment-${svc.name}.yaml`, generateDeploymentYaml(svc.name, svc));
    addFile(`${chartName}/templates/service-${svc.name}.yaml`, generateServiceYaml(svc.name));
  });

  // ConfigMaps
  template.config_maps.forEach((cm) => {
    addFile(`${chartName}/templates/configmap-${cm.name}.yaml`, generateConfigMapYaml(cm.name));
  });

  // Registry secret
  addFile(`${chartName}/templates/secret-registry.yaml`, generateRegistrySecretYaml(template));

  // TLS secrets
  template.tls_secrets.forEach((secret) => {
    addFile(`${chartName}/templates/secret-tls-${secret.name}.yaml`, generateTLSSecretYaml(secret.name));
  });

  // Nginx gateway
  if (version.values.enableNginxGateway ?? template.enable_nginx_gateway) {
    addFile(`${chartName}/templates/configmap-nginx-gateway.yaml`, generateNginxConfigMap(template));
    addFile(`${chartName}/templates/deployment-nginx-gateway.yaml`, generateNginxDeploymentYaml());
    addFile(`${chartName}/templates/service-nginx-gateway.yaml`, generateNginxServiceYaml());
  }

  // Redis
  if (version.values.enableRedis ?? template.enable_redis) {
    addFile(`${chartName}/templates/deployment-redis.yaml`, generateRedisDeploymentYaml());
    addFile(`${chartName}/templates/service-redis.yaml`, generateRedisServiceYaml());
  }

  // Ingresses
  template.ingresses.forEach((ing) => {
    addFile(`${chartName}/templates/ingress-${ing.name}.yaml`, generateIngressYaml(ing.name, ing));
  });

  // Combine all entries and add end-of-archive marker (2 blocks of zeros)
  const totalLength = entries.reduce((sum, e) => sum + e.length, 0) + 1024;
  const tarBytes = new Uint8Array(totalLength);
  let offset = 0;
  for (const entry of entries) {
    tarBytes.set(entry, offset);
    offset += entry.length;
  }
  // End-of-archive marker is already zeros

  // Gzip the tar archive using pako
  const gzipped = pako.gzip(tarBytes);

  // Convert to base64
  const base64 = btoa(String.fromCharCode(...gzipped));
  return base64;
}

// Hash API key using SHA-256
async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Parse Basic Auth header
function parseBasicAuth(authHeader: string): { username: string; password: string } | null {
  try {
    if (!authHeader.startsWith('Basic ')) return null;
    const base64 = authHeader.substring(6);
    const decoded = atob(base64);
    const colonIndex = decoded.indexOf(':');
    if (colonIndex === -1) return null;
    return {
      username: decoded.substring(0, colonIndex),
      password: decoded.substring(colonIndex + 1),
    };
  } catch {
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);

    // Expected paths:
    // /helm-registry/{templateId}/index.yaml - Get index
    // /helm-registry/{templateId}/charts/{chartName}-{version}.tgz - Download chart

    console.log('Request path:', url.pathname);
    console.log('Path parts:', pathParts);

    // Create Supabase client with service role for validation
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Try to authenticate with different methods
    const apiKey = req.headers.get('X-API-Key') || req.headers.get('Authorization')?.replace('Bearer ', '');
    const authHeader = req.headers.get('Authorization');

    let serviceAccountId: string | null = null;

    // Try Bearer/API Key auth first
    if (apiKey && !authHeader?.startsWith('Basic ')) {
      console.log('Trying Bearer/API key auth');
      const { data: validationResult, error: validationError } = await supabase.rpc('validate_service_account_key', {
        p_api_key: apiKey,
      });

      if (!validationError && validationResult && validationResult.length > 0) {
        serviceAccountId = validationResult[0].service_account_id;
        console.log('Bearer auth successful, service account ID:', serviceAccountId);
      }
    }

    // Try Basic auth if Bearer failed or wasn't provided
    if (!serviceAccountId && authHeader?.startsWith('Basic ')) {
      console.log('Trying Basic auth');
      const basicCreds = parseBasicAuth(authHeader);

      if (basicCreds) {
        const { data: basicValidationResult, error: basicValidationError } = await supabase.rpc(
          'validate_service_account_basic',
          { p_username: basicCreds.username, p_password: basicCreds.password },
        );

        if (!basicValidationError && basicValidationResult && basicValidationResult.length > 0) {
          serviceAccountId = basicValidationResult[0].service_account_id;
          console.log('Basic auth successful, service account ID:', serviceAccountId);
        }
      }
    }

    if (!serviceAccountId) {
      console.log('No valid authentication provided');
      return new Response(
        JSON.stringify({ error: 'Authentication required. Use X-API-Key header, Bearer token, or Basic auth' }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Basic realm="Helm Registry"',
          },
        },
      );
    }

    // Update last used timestamp
    await supabase.rpc('update_service_account_last_used', {
      p_service_account_id: serviceAccountId,
    });

    // Extract template ID from path
    // Path format: /helm-registry/{templateId}/...
    const templateIdIndex = pathParts.indexOf('helm-registry') + 1;

    // Handle root index.yaml request (list all accessible templates)
    if (templateIdIndex >= pathParts.length || pathParts[templateIdIndex] === 'index.yaml') {
      console.log('Root index request - listing all accessible templates');

      // Get all templates this service account has access to
      const { data: accessibleTemplates } = await supabase
        .from('service_account_template_access')
        .select('template_id')
        .eq('service_account_id', serviceAccountId);

      if (!accessibleTemplates || accessibleTemplates.length === 0) {
        // Return empty but valid index.yaml
        const emptyIndexYaml = `apiVersion: v1
entries: {}
generated: "${new Date().toISOString()}"
`;
        return new Response(emptyIndexYaml, {
          headers: { ...corsHeaders, 'Content-Type': 'application/x-yaml' },
        });
      }

      // Get all templates with their versions
      const templateIds = accessibleTemplates.map((t) => t.template_id);
      const { data: templates } = await supabase.from('templates').select('*').in('id', templateIds);

      const { data: allVersions } = await supabase.from('chart_versions').select('*').in('template_id', templateIds);

      const baseUrl = `${supabaseUrl}/functions/v1/helm-registry`;

      // Build entries grouped by chart name
      interface ChartEntry {
        apiVersion: string;
        name: string;
        version: string;
        appVersion: string;
        description: string | null;
        type: string;
        created: string;
        urls: string[];
      }
      const entriesMap: Record<string, ChartEntry[]> = {};

      const typedVersions = (allVersions || []).map((v) => ({
        ...v,
        values: v.values as ChartVersionValues,
      })) as ChartVersion[];

      for (const template of templates || []) {
        const chartName = template.name.toLowerCase().replace(/\s+/g, '-');
        const templateVersions = typedVersions.filter((v) => v.template_id === template.id);

        if (!entriesMap[chartName]) {
          entriesMap[chartName] = [];
        }

        for (const v of templateVersions) {
          entriesMap[chartName].push({
            apiVersion: 'v2',
            name: chartName,
            version: v.version_name,
            appVersion: v.app_version || '1.0.0',
            description: template.description || 'A Helm chart for Kubernetes',
            type: 'application',
            created: v.created_at,
            urls: [`${baseUrl}/${template.id}/charts/${chartName}-${v.version_name}.tgz`],
          });
        }
      }

      // Generate index.yaml content
      let entriesYaml = '';
      for (const [chartName, entries] of Object.entries(entriesMap)) {
        if (entries.length > 0) {
          entriesYaml += `  ${chartName}:\n`;
          for (const e of entries) {
            entriesYaml += `    - apiVersion: ${e.apiVersion}
      name: ${e.name}
      version: ${e.version}
      appVersion: "${e.appVersion}"
      description: ${e.description}
      type: ${e.type}
      created: "${e.created}"
      urls:
        - ${e.urls[0]}\n`;
          }
        }
      }

      const rootIndexYaml = `apiVersion: v1
entries:
${entriesYaml || '  {}'}
generated: "${new Date().toISOString()}"
`;

      return new Response(rootIndexYaml, {
        headers: { ...corsHeaders, 'Content-Type': 'application/x-yaml' },
      });
    }

    const templateId = pathParts[templateIdIndex];
    console.log('Template ID:', templateId);

    // Check if service account has access to this template
    const { data: hasAccess } = await supabase.rpc('check_template_access', {
      p_service_account_id: serviceAccountId,
      p_template_id: templateId,
    });

    if (!hasAccess) {
      console.log('No access to template');
      return new Response(JSON.stringify({ error: 'Access denied to this template' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get template with all relations
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      console.log('Template not found:', templateError);
      return new Response(JSON.stringify({ error: 'Template not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get related data
    const [servicesRes, configMapsRes, tlsSecretsRes, opaqueSecretsRes, ingressesRes, versionsRes] = await Promise.all([
      supabase.from('services').select('*').eq('template_id', templateId),
      supabase.from('config_maps').select('*').eq('template_id', templateId),
      supabase.from('tls_secrets').select('*').eq('template_id', templateId),
      supabase.from('opaque_secrets').select('*').eq('template_id', templateId),
      supabase.from('ingresses').select('*').eq('template_id', templateId),
      supabase.from('chart_versions').select('*').eq('template_id', templateId),
    ]);

    const templateWithRelations: TemplateWithRelations = {
      ...template,
      registry_secret: template.registry_secret as RegistrySecret | null,
      services: (servicesRes.data || []) as Service[],
      config_maps: (configMapsRes.data || []) as ConfigMap[],
      tls_secrets: (tlsSecretsRes.data || []) as TLSSecret[],
      opaque_secrets: (opaqueSecretsRes.data || []) as OpaqueSecret[],
      ingresses: (ingressesRes.data || []) as Ingress[],
    };

    const versions = (versionsRes.data || []).map((v) => ({
      ...v,
      values: v.values as ChartVersionValues,
    })) as ChartVersion[];

    // Determine the action based on path
    const actionPath = pathParts.slice(templateIdIndex + 1).join('/');
    console.log('Action path:', actionPath);

    if (actionPath === 'index.yaml' || actionPath === '') {
      // Return index.yaml for this specific template only
      const chartName = template.name.toLowerCase().replace(/\s+/g, '-');
      const baseUrl = `${supabaseUrl}/functions/v1/helm-registry/${templateId}`;

      const entries = versions.map((v: ChartVersion) => ({
        apiVersion: 'v2',
        name: chartName,
        version: v.version_name,
        appVersion: v.app_version || '1.0.0',
        description: template.description || 'A Helm chart for Kubernetes',
        type: 'application',
        created: v.created_at,
        urls: [`${baseUrl}/charts/${chartName}-${v.version_name}.tgz`],
      }));

      const indexYaml = `apiVersion: v1
entries:
  ${chartName}:
${entries
  .map(
    (e) => `    - apiVersion: ${e.apiVersion}
      name: ${e.name}
      version: ${e.version}
      appVersion: "${e.appVersion}"
      description: ${e.description}
      type: ${e.type}
      created: "${e.created}"
      urls:
        - ${e.urls[0]}`,
  )
  .join('\n')}
generated: "${new Date().toISOString()}"
`;

      return new Response(indexYaml, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/x-yaml',
        },
      });
    }

    // Check for chart download: charts/{chartName}-{version}.tgz
    if (actionPath.startsWith('charts/') && actionPath.endsWith('.tgz')) {
      const chartFile = actionPath.replace('charts/', '').replace('.tgz', '');
      const chartName = template.name.toLowerCase().replace(/\s+/g, '-');

      // Extract version from chartFile (format: chartName-version)
      const versionStr = chartFile.replace(`${chartName}-`, '');

      console.log('Looking for version:', versionStr);

      const version = versions.find((v: ChartVersion) => v.version_name === versionStr);

      if (!version) {
        return new Response(JSON.stringify({ error: 'Version not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Generate the chart package
      const chartPackageBase64 = await generateChartPackage(templateWithRelations, version);

      // Decode base64 to binary
      const binaryString = atob(chartPackageBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      return new Response(bytes, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/gzip',
          'Content-Disposition': `attachment; filename="${chartName}-${versionStr}.tgz"`,
        },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid endpoint' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
