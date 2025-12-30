import { saveAs } from 'file-saver';
import pako from 'pako';
import { TemplateWithRelations, ChartVersion } from '@/types/helm';

export function generateChartYaml(template: TemplateWithRelations, version: ChartVersion): string {
  return `apiVersion: v2
name: ${template.name.toLowerCase().replace(/\s+/g, '-')}
description: ${template.description || 'A Helm chart for Kubernetes'}
type: application
version: ${version.versionName}
appVersion: "${version.appVersion || '1.0.0'}"
`;
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
  services: Record<string, {
    imageTag: string;
    env: Record<string, string>;
    livenessPath: string;
    readinessPath: string;
  }>;
  configMaps: Record<string, Record<string, string>>;
  ingress: Record<string, {
    hosts: Array<{
      hostname: string;
      paths: Array<{
        path: string;
        serviceName: string;
      }>;
    }>;
    tls: Array<{
      secretName: string;
      hosts: string[];
    }>;
  }>;
  nginx: {
    enabled: boolean;
  };
  redis: {
    enabled: boolean;
  };
}

export function generateValuesYaml(template: TemplateWithRelations, version: ChartVersion): string {
  const values: HelmValues = {
    global: {
      sharedPort: template.sharedPort,
      registry: {
        url: template.registryUrl,
        project: template.registryProject,
        password: version.values.registryPassword || null,
      },
    },
    services: {},
    configMaps: {},
    ingress: {},
    nginx: {
      enabled: version.values.enableNginxGateway ?? template.enableNginxGateway,
    },
    redis: {
      enabled: version.values.enableRedis ?? template.enableRedis,
    },
  };

  template.services.forEach((svc) => {
    values.services[svc.name] = {
      imageTag: version.values.imageTags[svc.name] || 'latest',
      env: version.values.envValues[svc.name] || {},
      livenessPath: svc.livenessPath,
      readinessPath: svc.readinessPath,
    };
  });

  template.configMaps.forEach((cm) => {
    values.configMaps[cm.name] = version.values.configMapValues[cm.name] || {};
  });

  template.ingresses.forEach((ing) => {
    values.ingress[ing.name] = {
      hosts: ing.hosts,
      tls: ing.tls,
    };
  });

  return formatYaml(values);
}

type JsonValue = 
  | string 
  | number 
  | boolean 
  | null 
  | JsonValue[] 
  | { [key: string]: JsonValue | unknown }
  | object;

function formatYaml(obj: JsonValue | unknown[], indent = 0): string {
  const spaces = '  '.repeat(indent);
  let result = '';

  // Handle arrays
  if (Array.isArray(obj)) {
    obj.forEach((item) => {
      if (item !== null && item !== undefined) {
        if (typeof item === 'object' && !Array.isArray(item)) {
          result += `${spaces}  -\n${formatYaml(item, indent + 2)}`;
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
  if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) continue;

      if (typeof value === 'object' && !Array.isArray(value)) {
        result += `${spaces}${key}:\n${formatYaml(value, indent + 1)}`;
      } else if (Array.isArray(value)) {
        result += `${spaces}${key}:\n`;
        value.forEach((item) => {
          if (item !== null && item !== undefined) {
            if (typeof item === 'object' && !Array.isArray(item)) {
              result += `${spaces}  -\n${formatYaml(item, indent + 2)}`;
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
  }

  return result;
}

export function generateDeploymentYaml(serviceName: string, template: TemplateWithRelations): string {
  const service = template.services.find((s) => s.name === serviceName);
  if (!service) return '';

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
              path: ${service.livenessPath}
              port: {{ .Values.global.sharedPort }}
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: ${service.readinessPath}
              port: {{ .Values.global.sharedPort }}
            initialDelaySeconds: 5
            periodSeconds: 5
`;
}

export function generateServiceYaml(serviceName: string, template: TemplateWithRelations): string {
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

export function generateConfigMapYaml(configMapName: string, template: TemplateWithRelations): string {
  const cm = template.configMaps.find((c) => c.name === configMapName);
  if (!cm) return '';

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

export function generateRegistrySecretYaml(template: TemplateWithRelations): string {
  return `apiVersion: v1
kind: Secret
metadata:
  name: registry-secret
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: {{ printf "{\\"auths\\": {\\"%s\\": {\\"username\\": \\"%s\\", \\"password\\": \\"%s\\", \\"email\\": \\"%s\\"}}}" .Values.global.registry.url "${template.registrySecret.username}" .Values.global.registry.password "${template.registrySecret.email || ''}" | b64enc }}
`;
}

export function generateTLSSecretYaml(secretName: string): string {
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

export function generateNginxConfigMap(template: TemplateWithRelations): string {
  const allRoutes = template.services.flatMap((svc) =>
    svc.routes.map((r) => ({ path: r.path, serviceName: svc.name }))
  );

  const locationBlocks = allRoutes
    .map(
      (route) => `    location ${route.path} {
        proxy_pass http://${route.serviceName}:{{ .Values.global.sharedPort }};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }`
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

export function generateNginxDeploymentYaml(): string {
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

export function generateNginxServiceYaml(): string {
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

export function generateRedisDeploymentYaml(): string {
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

export function generateRedisServiceYaml(): string {
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

export function generateIngressYaml(ingressName: string, template: TemplateWithRelations): string {
  const ingress = template.ingresses.find((i) => i.name === ingressName);
  if (!ingress) return '';

  const backendService =
    ingress.mode === 'nginx-gateway'
      ? 'nginx-gateway'
      : '{{ $path.serviceName }}';

  return `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ${ingressName}
  annotations:
    kubernetes.io/ingress.class: nginx
spec:
  {{- if .Values.ingress.${ingressName}.tls }}
  {{- if gt (len .Values.ingress.${ingressName}.tls) 0 }}
  tls:
    {{- range $tlsConfig := .Values.ingress.${ingressName}.tls }}
    - secretName: {{ $tlsConfig.secretName }}
      hosts:
        {{- range $hostname := $tlsConfig.hosts }}
        - {{ $hostname }}
        {{- end }}
    {{- end }}
  {{- end }}
  {{- end }}
  rules:
    {{- range $host := .Values.ingress.${ingressName}.hosts }}
    - host: {{ $host.hostname }}
      http:
        paths:
          {{- range $path := $host.paths }}
          - path: {{ $path.path }}
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

// Helper function to create a tar header for a file
function createTarHeader(name: string, size: number, offset: number): Uint8Array {
  const header = new Uint8Array(512);
  const encoder = new TextEncoder();
  const nameBytes = encoder.encode(name);
  
  // Copy filename (max 100 bytes)
  header.set(nameBytes.slice(0, 100), 0);
  
  // File mode (octal 0644)
  encoder.encodeInto('0000644', header.subarray(100, 108));
  
  // UID and GID (0)
  encoder.encodeInto('0000000', header.subarray(108, 116));
  encoder.encodeInto('0000000', header.subarray(116, 124));
  
  // File size (octal, 12 bytes)
  const sizeOctal = size.toString(8).padStart(11, '0') + ' ';
  encoder.encodeInto(sizeOctal, header.subarray(124, 136));
  
  // Modification time (current time in octal)
  const mtime = Math.floor(Date.now() / 1000).toString(8).padStart(11, '0') + ' ';
  encoder.encodeInto(mtime, header.subarray(136, 148));
  
  // Type flag (0 = normal file)
  header[156] = 0x30;
  
  // Calculate checksum
  let checksum = 256; // Sum of all bytes including checksum field
  for (let i = 0; i < 512; i++) {
    if (i < 148 || i >= 156) {
      checksum += header[i];
    }
  }
  const checksumOctal = checksum.toString(8).padStart(6, '0') + '\0 ';
  encoder.encodeInto(checksumOctal, header.subarray(148, 156));
  
  return header;
}

// Helper function to pad data to 512-byte blocks
function padToBlock(data: Uint8Array): Uint8Array {
  const blockSize = 512;
  const remainder = data.length % blockSize;
  if (remainder === 0) return data;
  
  const padding = new Uint8Array(blockSize - remainder);
  const result = new Uint8Array(data.length + padding.length);
  result.set(data);
  result.set(padding, data.length);
  return result;
}

// Create tar.gz archive from file entries
function createTarGz(files: Array<{ name: string; content: string }>): Blob {
  const tarParts: Uint8Array[] = [];
  
  // Add each file to the tar archive
  for (const file of files) {
    const encoder = new TextEncoder();
    const contentBytes = encoder.encode(file.content);
    
    // Create tar header
    const header = createTarHeader(file.name, contentBytes.length, tarParts.reduce((sum, part) => sum + part.length, 0));
    tarParts.push(header);
    
    // Add file content and pad to 512-byte boundary
    tarParts.push(padToBlock(contentBytes));
  }
  
  // Add two empty blocks at the end (tar terminator)
  tarParts.push(new Uint8Array(1024));
  
  // Combine all parts
  const totalLength = tarParts.reduce((sum, part) => sum + part.length, 0);
  const tarData = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of tarParts) {
    tarData.set(part, offset);
    offset += part.length;
  }
  
  // Gzip the tar data
  const gzipped = pako.gzip(tarData);
  
  return new Blob([gzipped], { type: 'application/gzip' });
}

export async function downloadChart(
  template: TemplateWithRelations,
  version: ChartVersion
): Promise<void> {
  const chartName = template.name.toLowerCase().replace(/\s+/g, '-');
  const files: Array<{ name: string; content: string }> = [];

  // Chart.yaml
  files.push({ name: `${chartName}/Chart.yaml`, content: generateChartYaml(template, version) });

  // values.yaml
  files.push({ name: `${chartName}/values.yaml`, content: generateValuesYaml(template, version) });

  // Service deployments and services
  template.services.forEach((svc) => {
    files.push({ name: `${chartName}/templates/deployment-${svc.name}.yaml`, content: generateDeploymentYaml(svc.name, template) });
    files.push({ name: `${chartName}/templates/service-${svc.name}.yaml`, content: generateServiceYaml(svc.name, template) });
  });

  // ConfigMaps
  template.configMaps.forEach((cm) => {
    files.push({ name: `${chartName}/templates/configmap-${cm.name}.yaml`, content: generateConfigMapYaml(cm.name, template) });
  });

  // Registry secret
  files.push({ name: `${chartName}/templates/secret-registry.yaml`, content: generateRegistrySecretYaml(template) });

  // TLS secrets
  template.tlsSecrets.forEach((secret) => {
    files.push({ name: `${chartName}/templates/secret-tls-${secret.name}.yaml`, content: generateTLSSecretYaml(secret.name) });
  });

  // Nginx gateway
  if (version.values.enableNginxGateway ?? template.enableNginxGateway) {
    files.push({ name: `${chartName}/templates/configmap-nginx-gateway.yaml`, content: generateNginxConfigMap(template) });
    files.push({ name: `${chartName}/templates/deployment-nginx-gateway.yaml`, content: generateNginxDeploymentYaml() });
    files.push({ name: `${chartName}/templates/service-nginx-gateway.yaml`, content: generateNginxServiceYaml() });
  }

  // Redis
  if (version.values.enableRedis ?? template.enableRedis) {
    files.push({ name: `${chartName}/templates/deployment-redis.yaml`, content: generateRedisDeploymentYaml() });
    files.push({ name: `${chartName}/templates/service-redis.yaml`, content: generateRedisServiceYaml() });
  }

  // Ingresses
  template.ingresses.forEach((ing) => {
    files.push({ name: `${chartName}/templates/ingress-${ing.name}.yaml`, content: generateIngressYaml(ing.name, template) });
  });

  // Generate tar.gz and download
  const content = createTarGz(files);
  saveAs(content, `${chartName}-${version.versionName}.tgz`);
}

/**
 * Generate chart files for viewing in the file browser
 * Returns an array of files with their paths and contents
 */
export function generateChartFiles(
  template: TemplateWithRelations,
  version: ChartVersion
): Array<{ name: string; content: string }> {
  const chartName = template.name.toLowerCase().replace(/\s+/g, '-');
  const files: Array<{ name: string; content: string }> = [];

  // Chart.yaml
  files.push({ name: `${chartName}/Chart.yaml`, content: generateChartYaml(template, version) });

  // values.yaml
  files.push({ name: `${chartName}/values.yaml`, content: generateValuesYaml(template, version) });

  // Service deployments and services
  template.services.forEach((svc) => {
    files.push({ name: `${chartName}/templates/deployment-${svc.name}.yaml`, content: generateDeploymentYaml(svc.name, template) });
    files.push({ name: `${chartName}/templates/service-${svc.name}.yaml`, content: generateServiceYaml(svc.name, template) });
  });

  // ConfigMaps
  template.configMaps.forEach((cm) => {
    files.push({ name: `${chartName}/templates/configmap-${cm.name}.yaml`, content: generateConfigMapYaml(cm.name, template) });
  });

  // Registry secret
  files.push({ name: `${chartName}/templates/secret-registry.yaml`, content: generateRegistrySecretYaml(template) });

  // TLS secrets
  template.tlsSecrets.forEach((secret) => {
    files.push({ name: `${chartName}/templates/secret-tls-${secret.name}.yaml`, content: generateTLSSecretYaml(secret.name) });
  });

  // Nginx gateway
  if (version.values.enableNginxGateway ?? template.enableNginxGateway) {
    files.push({ name: `${chartName}/templates/configmap-nginx-gateway.yaml`, content: generateNginxConfigMap(template) });
    files.push({ name: `${chartName}/templates/deployment-nginx-gateway.yaml`, content: generateNginxDeploymentYaml() });
    files.push({ name: `${chartName}/templates/service-nginx-gateway.yaml`, content: generateNginxServiceYaml() });
  }

  // Redis
  if (version.values.enableRedis ?? template.enableRedis) {
    files.push({ name: `${chartName}/templates/deployment-redis.yaml`, content: generateRedisDeploymentYaml() });
    files.push({ name: `${chartName}/templates/service-redis.yaml`, content: generateRedisServiceYaml() });
  }

  // Ingresses
  template.ingresses.forEach((ing) => {
    files.push({ name: `${chartName}/templates/ingress-${ing.name}.yaml`, content: generateIngressYaml(ing.name, template) });
  });

  return files;
}

/**
 * Generate rendered YAML manifests for Kubernetes deployment
 * This shows the actual YAML that would be applied to the cluster
 */
export function generateRenderedManifests(
  template: TemplateWithRelations,
  version: ChartVersion,
  releaseName: string,
  namespace: string
): Array<{ name: string; content: string }> {
  const files: Array<{ name: string; content: string }> = [];

  // Generate rendered deployment and service for each service
  template.services.forEach((service) => {
    const imageTag = version.values.imageTags[service.name] || 'latest';
    const envValues = version.values.envValues[service.name] || {};
    
    // Rendered Deployment
    let deploymentEnv = '';
    if (Object.keys(envValues).length > 0) {
      deploymentEnv = '          env:\n';
      Object.entries(envValues).forEach(([key, value]) => {
        deploymentEnv += `            - name: ${key}\n              value: "${value}"\n`;
      });
    }

    const deployment = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${service.name}
  namespace: ${namespace}
  labels:
    app: ${service.name}
    app.kubernetes.io/name: ${service.name}
    app.kubernetes.io/instance: ${releaseName}
    app.kubernetes.io/managed-by: Helm
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ${service.name}
  template:
    metadata:
      labels:
        app: ${service.name}
    spec:
      imagePullSecrets:
        - name: registry-secret
      containers:
        - name: ${service.name}
          image: "${template.registryUrl}/${template.registryProject}/${service.name}:${imageTag}"
          ports:
            - containerPort: ${template.sharedPort}
${deploymentEnv}          livenessProbe:
            httpGet:
              path: ${service.livenessPath}
              port: ${template.sharedPort}
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: ${service.readinessPath}
              port: ${template.sharedPort}
            initialDelaySeconds: 5
            periodSeconds: 5
`;
    files.push({ name: `deployment-${service.name}.yaml`, content: deployment });

    // Rendered Service
    const serviceYaml = `apiVersion: v1
kind: Service
metadata:
  name: ${service.name}
  namespace: ${namespace}
  labels:
    app: ${service.name}
    app.kubernetes.io/name: ${service.name}
    app.kubernetes.io/instance: ${releaseName}
    app.kubernetes.io/managed-by: Helm
spec:
  type: ClusterIP
  ports:
    - port: ${template.sharedPort}
      targetPort: ${template.sharedPort}
      protocol: TCP
      name: http
  selector:
    app: ${service.name}
`;
    files.push({ name: `service-${service.name}.yaml`, content: serviceYaml });
  });

  // ConfigMaps
  template.configMaps.forEach((cm) => {
    const configMapValues = version.values.configMapValues[cm.name] || {};
    let dataSection = '';
    
    Object.entries(configMapValues).forEach(([key, value]) => {
      dataSection += `  ${key}: "${value}"\n`;
    });

    const configMap = `apiVersion: v1
kind: ConfigMap
metadata:
  name: ${cm.name}
  namespace: ${namespace}
  labels:
    app.kubernetes.io/name: ${cm.name}
    app.kubernetes.io/instance: ${releaseName}
    app.kubernetes.io/managed-by: Helm
data:
${dataSection}`;
    files.push({ name: `configmap-${cm.name}.yaml`, content: configMap });
  });

  // Registry Secret
  const registrySecret = `apiVersion: v1
kind: Secret
metadata:
  name: registry-secret
  namespace: ${namespace}
  labels:
    app.kubernetes.io/instance: ${releaseName}
    app.kubernetes.io/managed-by: Helm
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: ${version.values.registryPassword ? btoa(JSON.stringify({
    auths: {
      [template.registryUrl || '']: {
        username: 'default',
        password: version.values.registryPassword,
        auth: btoa(`default:${version.values.registryPassword}`),
      },
    },
  })) : 'e30K'}
`;
  files.push({ name: 'secret-registry.yaml', content: registrySecret });

  // TLS Secrets
  template.tlsSecrets.forEach((secret) => {
    const tlsValues = version.values.tlsSecretValues[secret.name] || { crt: '', key: '' };
    const tlsSecret = `apiVersion: v1
kind: Secret
metadata:
  name: ${secret.name}
  namespace: ${namespace}
  labels:
    app.kubernetes.io/instance: ${releaseName}
    app.kubernetes.io/managed-by: Helm
type: kubernetes.io/tls
data:
  tls.crt: ${tlsValues.crt ? btoa(tlsValues.crt) : ''}
  tls.key: ${tlsValues.key ? btoa(tlsValues.key) : ''}
`;
    files.push({ name: `secret-tls-${secret.name}.yaml`, content: tlsSecret });
  });

  // Nginx Gateway
  if (version.values.enableNginxGateway ?? template.enableNginxGateway) {
    // Nginx ConfigMap
    let nginxConfig = 'events {}\nhttp {\n';
    template.services.forEach((service) => {
      nginxConfig += `  upstream ${service.name} {\n    server ${service.name}:${template.sharedPort};\n  }\n`;
    });
    nginxConfig += '  server {\n    listen 80;\n';
    template.services.forEach((service) => {
      nginxConfig += `    location /${service.name}/ {\n      proxy_pass http://${service.name}/;\n    }\n`;
    });
    nginxConfig += '  }\n}';

    const nginxConfigMap = `apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-gateway-config
  namespace: ${namespace}
  labels:
    app: nginx-gateway
    app.kubernetes.io/instance: ${releaseName}
    app.kubernetes.io/managed-by: Helm
data:
  nginx.conf: |
    ${nginxConfig.split('\n').join('\n    ')}
`;
    files.push({ name: 'configmap-nginx-gateway.yaml', content: nginxConfigMap });

    // Nginx Deployment
    const nginxDeployment = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-gateway
  namespace: ${namespace}
  labels:
    app: nginx-gateway
    app.kubernetes.io/instance: ${releaseName}
    app.kubernetes.io/managed-by: Helm
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
          image: "nginx:1.27-alpine"
          ports:
            - containerPort: 80
          volumeMounts:
            - name: config
              mountPath: /etc/nginx/nginx.conf
              subPath: nginx.conf
      volumes:
        - name: config
          configMap:
            name: nginx-gateway-config
`;
    files.push({ name: 'deployment-nginx-gateway.yaml', content: nginxDeployment });

    // Nginx Service
    const nginxService = `apiVersion: v1
kind: Service
metadata:
  name: nginx-gateway
  namespace: ${namespace}
  labels:
    app: nginx-gateway
    app.kubernetes.io/instance: ${releaseName}
    app.kubernetes.io/managed-by: Helm
spec:
  type: ClusterIP
  ports:
    - port: 80
      targetPort: 80
      protocol: TCP
      name: http
  selector:
    app: nginx-gateway
`;
    files.push({ name: 'service-nginx-gateway.yaml', content: nginxService });
  }

  // Redis
  if (version.values.enableRedis ?? template.enableRedis) {
    const redisDeployment = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: ${namespace}
  labels:
    app: redis
    app.kubernetes.io/instance: ${releaseName}
    app.kubernetes.io/managed-by: Helm
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
          image: "redis:7-alpine"
          ports:
            - containerPort: 6379
`;
    files.push({ name: 'deployment-redis.yaml', content: redisDeployment });

    const redisService = `apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: ${namespace}
  labels:
    app: redis
    app.kubernetes.io/instance: ${releaseName}
    app.kubernetes.io/managed-by: Helm
spec:
  type: ClusterIP
  ports:
    - port: 6379
      targetPort: 6379
      protocol: TCP
      name: redis
  selector:
    app: redis
`;
    files.push({ name: 'service-redis.yaml', content: redisService });
  }

  // Ingresses
  template.ingresses.forEach((ing) => {
    let rulesSection = '';
    ing.hosts.forEach((host) => {
      rulesSection += `  - host: ${host.hostname}\n    http:\n      paths:\n`;
      host.paths.forEach((path) => {
        rulesSection += `        - path: ${path.path}\n          pathType: Prefix\n          backend:\n            service:\n              name: ${path.serviceName}\n              port:\n                number: ${template.sharedPort}\n`;
      });
    });

    let tlsSection = '';
    if (ing.tls && ing.tls.length > 0) {
      tlsSection = 'tls:\n';
      ing.tls.forEach((tls) => {
        tlsSection += `  - secretName: ${tls.secretName}\n    hosts:\n`;
        tls.hosts.forEach((host) => {
          tlsSection += `      - ${host}\n`;
        });
      });
    }

    const ingress = `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ${ing.name}
  namespace: ${namespace}
  labels:
    app.kubernetes.io/instance: ${releaseName}
    app.kubernetes.io/managed-by: Helm
spec:
${tlsSection}rules:
${rulesSection}`;
    files.push({ name: `ingress-${ing.name}.yaml`, content: ingress });
  });

  return files;
}
