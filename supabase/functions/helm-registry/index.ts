import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TemplateWithRelations {
  id: string;
  name: string;
  description: string;
  shared_port: number;
  registry_url: string;
  registry_project: string;
  registry_secret: any;
  enable_nginx_gateway: boolean;
  enable_redis: boolean;
  services: any[];
  config_maps: any[];
  tls_secrets: any[];
  opaque_secrets: any[];
  ingresses: any[];
}

interface ChartVersion {
  id: string;
  template_id: string;
  version_name: string;
  app_version: string | null;
  values: any;
  created_at: string;
}

// Generate Chart.yaml content
function generateChartYaml(template: TemplateWithRelations, version: ChartVersion): string {
  return `apiVersion: v2
name: ${template.name.toLowerCase().replace(/\s+/g, "-")}
description: ${template.description || "A Helm chart for Kubernetes"}
type: application
version: ${version.version_name}
appVersion: "${version.app_version || "1.0.0"}"
`;
}

// Format object to YAML
function formatYaml(obj: any, indent = 0): string {
  const spaces = "  ".repeat(indent);
  let result = "";

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;

    if (typeof value === "object" && !Array.isArray(value)) {
      result += `${spaces}${key}:\n${formatYaml(value, indent + 1)}`;
    } else if (Array.isArray(value)) {
      result += `${spaces}${key}:\n`;
      value.forEach((item) => {
        if (typeof item === "object") {
          result += `${spaces}  -\n${formatYaml(item, indent + 2)}`;
        } else {
          result += `${spaces}  - ${item}\n`;
        }
      });
    } else {
      result += `${spaces}${key}: ${typeof value === "string" && value.includes(":") ? `"${value}"` : value}\n`;
    }
  }

  return result;
}

// Generate values.yaml content
function generateValuesYaml(template: TemplateWithRelations, version: ChartVersion): string {
  const values: Record<string, any> = {
    global: {
      sharedPort: template.shared_port,
      registry: {
        url: template.registry_url,
        project: template.registry_project,
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
      imageTag: version.values.imageTags?.[svc.name] || "latest",
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
      tlsEnabled: ing.tls_enabled,
      tlsSecretName: ing.tls_secret_name,
    };
  });

  return formatYaml(values);
}

// Generate Deployment YAML
function generateDeploymentYaml(serviceName: string, service: any): string {
  return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}-${serviceName}
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
        - name: {{ .Release.Name }}-registry-secret
      containers:
        - name: ${serviceName}
          image: "{{ .Values.global.registry.url }}/{{ .Values.global.registry.project }}/${serviceName}:{{ .Values.services.${serviceName}.imageTag }}"
          ports:
            - containerPort: {{ .Values.global.sharedPort }}
          {{- if .Values.services.${serviceName}.env }}
          env:
            {{- range $key, $value := .Values.services.${serviceName}.env }}
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
  name: {{ .Release.Name }}-${serviceName}
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
  name: {{ .Release.Name }}-${configMapName}
data:
  {{- range $key, $value := .Values.configMaps.${configMapName} }}
  {{ $key }}: {{ $value | quote }}
  {{- end }}
`;
}

// Generate Registry Secret YAML
function generateRegistrySecretYaml(template: TemplateWithRelations): string {
  const username = template.registry_secret?.username || "";
  const email = template.registry_secret?.email || "";
  return `apiVersion: v1
kind: Secret
metadata:
  name: {{ .Release.Name }}-registry-secret
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: {{ printf "{\\"auths\\": {\\"%s\\": {\\"username\\": \\"%s\\", \\"password\\": \\"%s\\", \\"email\\": \\"%s\\"}}}" .Values.global.registry.url "${username}" "REDACTED" "${email}" | b64enc }}
`;
}

// Generate TLS Secret YAML
function generateTLSSecretYaml(secretName: string): string {
  return `apiVersion: v1
kind: Secret
metadata:
  name: {{ .Release.Name }}-${secretName}
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
    (svc.routes || []).map((r: any) => ({ path: r.path, serviceName: svc.name }))
  );

  const locationBlocks = allRoutes
    .map(
      (route) => `    location ${route.path} {
        proxy_pass http://{{ .Release.Name }}-${route.serviceName}:{{ .Values.global.sharedPort }};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }`
    )
    .join("\n\n");

  return `apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-nginx-gateway-config
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
  name: {{ .Release.Name }}-nginx-gateway
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
            name: {{ .Release.Name }}-nginx-gateway-config
{{- end }}
`;
}

// Generate Nginx Service YAML
function generateNginxServiceYaml(): string {
  return `{{- if .Values.nginx.enabled }}
apiVersion: v1
kind: Service
metadata:
  name: {{ .Release.Name }}-nginx-gateway
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
  name: {{ .Release.Name }}-redis
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
  name: {{ .Release.Name }}-redis
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
function generateIngressYaml(ingressName: string, ingress: any): string {
  const backendService =
    ingress.mode === "nginx-gateway"
      ? "{{ .Release.Name }}-nginx-gateway"
      : "{{ .Release.Name }}-{{ $rule.serviceName }}";

  return `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ .Release.Name }}-${ingressName}
  annotations:
    kubernetes.io/ingress.class: nginx
spec:
  {{- if .Values.ingress.${ingressName}.tlsEnabled }}
  tls:
    - hosts:
        {{- range .Values.ingress.${ingressName}.hosts }}
        - {{ . }}
        {{- end }}
      secretName: {{ .Release.Name }}-${ingress.tls_secret_name || "tls-secret"}
  {{- end }}
  rules:
    {{- range .Values.ingress.${ingressName}.hosts }}
    - host: {{ . }}
      http:
        paths:
          {{- range $rule := $.Values.ingress.${ingressName}.rules }}
          - path: {{ $rule.path }}
            pathType: Prefix
            backend:
              service:
                name: ${backendService}
                port:
                  number: {{ $.Values.global.sharedPort }}
          {{- end }}
    {{- end }}
`;
}

// Generate full chart package as base64 string
async function generateChartPackage(
  template: TemplateWithRelations,
  version: ChartVersion
): Promise<string> {
  const zip = new JSZip();
  const chartName = template.name.toLowerCase().replace(/\s+/g, "-");
  const folder = zip.folder(chartName);

  if (!folder) throw new Error("Failed to create zip folder");

  // Chart.yaml
  folder.file("Chart.yaml", generateChartYaml(template, version));

  // values.yaml
  folder.file("values.yaml", generateValuesYaml(template, version));

  // templates folder
  const templates = folder.folder("templates");
  if (!templates) throw new Error("Failed to create templates folder");

  // Service deployments and services
  template.services.forEach((svc) => {
    templates.file(`deployment-${svc.name}.yaml`, generateDeploymentYaml(svc.name, svc));
    templates.file(`service-${svc.name}.yaml`, generateServiceYaml(svc.name));
  });

  // ConfigMaps
  template.config_maps.forEach((cm) => {
    templates.file(`configmap-${cm.name}.yaml`, generateConfigMapYaml(cm.name));
  });

  // Registry secret
  templates.file("secret-registry.yaml", generateRegistrySecretYaml(template));

  // TLS secrets
  template.tls_secrets.forEach((secret) => {
    templates.file(`secret-tls-${secret.name}.yaml`, generateTLSSecretYaml(secret.name));
  });

  // Nginx gateway
  if (version.values.enableNginxGateway ?? template.enable_nginx_gateway) {
    templates.file("configmap-nginx-gateway.yaml", generateNginxConfigMap(template));
    templates.file("deployment-nginx-gateway.yaml", generateNginxDeploymentYaml());
    templates.file("service-nginx-gateway.yaml", generateNginxServiceYaml());
  }

  // Redis
  if (version.values.enableRedis ?? template.enable_redis) {
    templates.file("deployment-redis.yaml", generateRedisDeploymentYaml());
    templates.file("service-redis.yaml", generateRedisServiceYaml());
  }

  // Ingresses
  template.ingresses.forEach((ing) => {
    templates.file(`ingress-${ing.name}.yaml`, generateIngressYaml(ing.name, ing));
  });

  // Generate as base64 and return
  const content = await zip.generateAsync({ type: "base64" });
  return content;
}

// Hash API key
function hashApiKey(apiKey: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = new Uint8Array(32);
  
  // Simple hash for demonstration - in production use SubtleCrypto
  for (let i = 0; i < data.length; i++) {
    hashBuffer[i % 32] ^= data[i];
  }
  
  return Array.from(hashBuffer).map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    
    // Expected paths:
    // /helm-registry/{templateId}/index.yaml - Get index
    // /helm-registry/{templateId}/charts/{chartName}-{version}.tgz - Download chart
    
    console.log("Request path:", url.pathname);
    console.log("Path parts:", pathParts);

    // Get API key from header
    const apiKey = req.headers.get("X-API-Key") || req.headers.get("Authorization")?.replace("Bearer ", "");
    
    if (!apiKey) {
      console.log("No API key provided");
      return new Response(JSON.stringify({ error: "API key required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client with service role for validation
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate API key using the database function
    const { data: validationResult, error: validationError } = await supabase.rpc(
      "validate_service_account_key",
      { p_api_key: apiKey }
    );

    console.log("Validation result:", validationResult);
    
    if (validationError || !validationResult || validationResult.length === 0) {
      console.log("Invalid API key:", validationError);
      return new Response(JSON.stringify({ error: "Invalid API key" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceAccountId = validationResult[0].service_account_id;
    console.log("Service account ID:", serviceAccountId);

    // Update last used timestamp
    await supabase.rpc("update_service_account_last_used", {
      p_service_account_id: serviceAccountId,
    });

    // Extract template ID from path
    // Path format: /helm-registry/{templateId}/...
    const templateIdIndex = pathParts.indexOf("helm-registry") + 1;
    if (templateIdIndex >= pathParts.length) {
      return new Response(JSON.stringify({ error: "Template ID required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const templateId = pathParts[templateIdIndex];
    console.log("Template ID:", templateId);

    // Check if service account has access to this template
    const { data: hasAccess } = await supabase.rpc("check_template_access", {
      p_service_account_id: serviceAccountId,
      p_template_id: templateId,
    });

    if (!hasAccess) {
      console.log("No access to template");
      return new Response(JSON.stringify({ error: "Access denied to this template" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get template with all relations
    const { data: template, error: templateError } = await supabase
      .from("templates")
      .select("*")
      .eq("id", templateId)
      .single();

    if (templateError || !template) {
      console.log("Template not found:", templateError);
      return new Response(JSON.stringify({ error: "Template not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get related data
    const [servicesRes, configMapsRes, tlsSecretsRes, opaqueSecretsRes, ingressesRes, versionsRes] =
      await Promise.all([
        supabase.from("services").select("*").eq("template_id", templateId),
        supabase.from("config_maps").select("*").eq("template_id", templateId),
        supabase.from("tls_secrets").select("*").eq("template_id", templateId),
        supabase.from("opaque_secrets").select("*").eq("template_id", templateId),
        supabase.from("ingresses").select("*").eq("template_id", templateId),
        supabase.from("chart_versions").select("*").eq("template_id", templateId),
      ]);

    const templateWithRelations: TemplateWithRelations = {
      ...template,
      services: servicesRes.data || [],
      config_maps: configMapsRes.data || [],
      tls_secrets: tlsSecretsRes.data || [],
      opaque_secrets: opaqueSecretsRes.data || [],
      ingresses: ingressesRes.data || [],
    };

    const versions = versionsRes.data || [];

    // Determine the action based on path
    const actionPath = pathParts.slice(templateIdIndex + 1).join("/");
    console.log("Action path:", actionPath);

    if (actionPath === "index.yaml" || actionPath === "") {
      // Return index.yaml
      const chartName = template.name.toLowerCase().replace(/\s+/g, "-");
      const baseUrl = `${supabaseUrl}/functions/v1/helm-registry/${templateId}`;

      const entries = versions.map((v: ChartVersion) => ({
        apiVersion: "v2",
        name: chartName,
        version: v.version_name,
        appVersion: v.app_version || "1.0.0",
        description: template.description || "A Helm chart for Kubernetes",
        type: "application",
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
        - ${e.urls[0]}`
  )
  .join("\n")}
generated: "${new Date().toISOString()}"
`;

      return new Response(indexYaml, {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/x-yaml",
        },
      });
    }

    // Check for chart download: charts/{chartName}-{version}.tgz
    if (actionPath.startsWith("charts/") && actionPath.endsWith(".tgz")) {
      const chartFile = actionPath.replace("charts/", "").replace(".tgz", "");
      const chartName = template.name.toLowerCase().replace(/\s+/g, "-");
      
      // Extract version from chartFile (format: chartName-version)
      const versionStr = chartFile.replace(`${chartName}-`, "");
      
      console.log("Looking for version:", versionStr);

      const version = versions.find((v: ChartVersion) => v.version_name === versionStr);

      if (!version) {
        return new Response(JSON.stringify({ error: "Version not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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
          "Content-Type": "application/gzip",
          "Content-Disposition": `attachment; filename="${chartName}-${versionStr}.tgz"`,
        },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid endpoint" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
