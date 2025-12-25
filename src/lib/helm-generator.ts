import JSZip from 'jszip';
import { saveAs } from 'file-saver';
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

export function generateValuesYaml(template: TemplateWithRelations, version: ChartVersion): string {
  const values: Record<string, any> = {
    global: {
      sharedPort: template.sharedPort,
      registry: {
        url: template.registryUrl,
        project: template.registryProject,
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
      hosts: version.values.ingressHosts[ing.name] || [],
      tlsEnabled: ing.tlsEnabled,
      tlsSecretName: ing.tlsSecretName,
    };
  });

  return formatYaml(values);
}

function formatYaml(obj: any, indent = 0): string {
  const spaces = '  '.repeat(indent);
  let result = '';

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;

    if (typeof value === 'object' && !Array.isArray(value)) {
      result += `${spaces}${key}:\n${formatYaml(value, indent + 1)}`;
    } else if (Array.isArray(value)) {
      result += `${spaces}${key}:\n`;
      value.forEach((item) => {
        if (typeof item === 'object') {
          result += `${spaces}  -\n${formatYaml(item, indent + 2)}`;
        } else {
          result += `${spaces}  - ${item}\n`;
        }
      });
    } else {
      result += `${spaces}${key}: ${typeof value === 'string' && value.includes(':') ? `"${value}"` : value}\n`;
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

export function generateConfigMapYaml(configMapName: string, template: TemplateWithRelations): string {
  const cm = template.configMaps.find((c) => c.name === configMapName);
  if (!cm) return '';

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

export function generateRegistrySecretYaml(template: TemplateWithRelations): string {
  return `apiVersion: v1
kind: Secret
metadata:
  name: {{ .Release.Name }}-registry-secret
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: {{ printf "{\\"auths\\": {\\"%s\\": {\\"username\\": \\"%s\\", \\"password\\": \\"%s\\", \\"email\\": \\"%s\\"}}}" .Values.global.registry.url "${template.registrySecret.username}" "REDACTED" "${template.registrySecret.email || ''}" | b64enc }}
`;
}

export function generateTLSSecretYaml(secretName: string): string {
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

export function generateNginxConfigMap(template: TemplateWithRelations): string {
  const allRoutes = template.services.flatMap((svc) =>
    svc.routes.map((r) => ({ path: r.path, serviceName: svc.name }))
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
    .join('\n\n');

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

export function generateNginxDeploymentYaml(): string {
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

export function generateNginxServiceYaml(): string {
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

export function generateRedisDeploymentYaml(): string {
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

export function generateRedisServiceYaml(): string {
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

export function generateIngressYaml(ingressName: string, template: TemplateWithRelations): string {
  const ingress = template.ingresses.find((i) => i.name === ingressName);
  if (!ingress) return '';

  const backendService =
    ingress.mode === 'nginx-gateway'
      ? '{{ .Release.Name }}-nginx-gateway'
      : '{{ .Release.Name }}-{{ $rule.serviceName }}';

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
      secretName: {{ .Release.Name }}-${ingress.tlsSecretName || 'tls-secret'}
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

export async function downloadChart(
  template: TemplateWithRelations,
  version: ChartVersion
): Promise<void> {
  const zip = new JSZip();
  const chartName = template.name.toLowerCase().replace(/\s+/g, '-');
  const folder = zip.folder(chartName);

  if (!folder) throw new Error('Failed to create zip folder');

  // Chart.yaml
  folder.file('Chart.yaml', generateChartYaml(template, version));

  // values.yaml
  folder.file('values.yaml', generateValuesYaml(template, version));

  // templates folder
  const templates = folder.folder('templates');
  if (!templates) throw new Error('Failed to create templates folder');

  // Service deployments and services
  template.services.forEach((svc) => {
    templates.file(`deployment-${svc.name}.yaml`, generateDeploymentYaml(svc.name, template));
    templates.file(`service-${svc.name}.yaml`, generateServiceYaml(svc.name, template));
  });

  // ConfigMaps
  template.configMaps.forEach((cm) => {
    templates.file(`configmap-${cm.name}.yaml`, generateConfigMapYaml(cm.name, template));
  });

  // Registry secret
  templates.file('secret-registry.yaml', generateRegistrySecretYaml(template));

  // TLS secrets
  template.tlsSecrets.forEach((secret) => {
    templates.file(`secret-tls-${secret.name}.yaml`, generateTLSSecretYaml(secret.name));
  });

  // Nginx gateway
  if (version.values.enableNginxGateway ?? template.enableNginxGateway) {
    templates.file('configmap-nginx-gateway.yaml', generateNginxConfigMap(template));
    templates.file('deployment-nginx-gateway.yaml', generateNginxDeploymentYaml());
    templates.file('service-nginx-gateway.yaml', generateNginxServiceYaml());
  }

  // Redis
  if (version.values.enableRedis ?? template.enableRedis) {
    templates.file('deployment-redis.yaml', generateRedisDeploymentYaml());
    templates.file('service-redis.yaml', generateRedisServiceYaml());
  }

  // Ingresses
  template.ingresses.forEach((ing) => {
    templates.file(`ingress-${ing.name}.yaml`, generateIngressYaml(ing.name, template));
  });

  // Generate and download
  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `${chartName}-${version.versionName}.tgz`);
}
