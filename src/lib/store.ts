import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Template,
  Service,
  ConfigMap,
  TLSSecret,
  OpaqueSecret,
  Ingress,
  ChartVersion,
  TemplateWithRelations,
} from '@/types/helm';
import {
  templateDb,
  serviceDb,
  configMapDb,
  tlsSecretDb,
  opaqueSecretDb,
  ingressDb,
  chartVersionDb,
  loadAllData,
} from './db-service';
import { toast } from 'sonner';

interface HelmStore {
  templates: Template[];
  services: Service[];
  configMaps: ConfigMap[];
  tlsSecrets: TLSSecret[];
  opaqueSecrets: OpaqueSecret[];
  ingresses: Ingress[];
  chartVersions: ChartVersion[];
  isLoading: boolean;
  
  // Initialization
  loadFromDatabase: () => Promise<void>;
  
  // Template actions
  addTemplate: (template: Template) => Promise<void>;
  updateTemplate: (id: string, template: Partial<Template>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  cloneTemplate: (id: string) => Promise<string>;
  getTemplateWithRelations: (id: string) => TemplateWithRelations | undefined;
  
  // Service actions
  addService: (service: Service) => Promise<void>;
  updateService: (id: string, service: Partial<Service>) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
  
  // ConfigMap actions
  addConfigMap: (configMap: ConfigMap) => Promise<void>;
  updateConfigMap: (id: string, configMap: Partial<ConfigMap>) => Promise<void>;
  deleteConfigMap: (id: string) => Promise<void>;
  
  // TLS Secret actions
  addTLSSecret: (secret: TLSSecret) => Promise<void>;
  updateTLSSecret: (id: string, secret: Partial<TLSSecret>) => Promise<void>;
  deleteTLSSecret: (id: string) => Promise<void>;
  
  // Opaque Secret actions
  addOpaqueSecret: (secret: OpaqueSecret) => Promise<void>;
  updateOpaqueSecret: (id: string, secret: Partial<OpaqueSecret>) => Promise<void>;
  deleteOpaqueSecret: (id: string) => Promise<void>;
  
  // Ingress actions
  addIngress: (ingress: Ingress) => Promise<void>;
  updateIngress: (id: string, ingress: Partial<Ingress>) => Promise<void>;
  deleteIngress: (id: string) => Promise<void>;
  
  // Chart Version actions
  addChartVersion: (version: ChartVersion) => Promise<void>;
  deleteChartVersion: (id: string) => Promise<void>;
}

export const useHelmStore = create<HelmStore>()(
  persist(
    (set, get) => ({
      templates: [],
      services: [],
      configMaps: [],
      tlsSecrets: [],
      opaqueSecrets: [],
      ingresses: [],
      chartVersions: [],
      isLoading: false,
      
      loadFromDatabase: async () => {
        set({ isLoading: true });
        try {
          const data = await loadAllData();
          set({
            ...data,
            isLoading: false,
          });
        } catch (error) {
          console.error('Failed to load data from database:', error);
          toast.error('Failed to load data from database');
          set({ isLoading: false });
        }
      },
      
      addTemplate: async (template) => {
        try {
          const saved = await templateDb.create(template);
          set((state) => ({ templates: [...state.templates, saved] }));
        } catch (error) {
          console.error('Failed to create template:', error);
          toast.error('Failed to create template');
          throw error;
        }
      },
      
      updateTemplate: async (id, updates) => {
        try {
          const saved = await templateDb.update(id, updates);
          set((state) => ({
            templates: state.templates.map((t) =>
              t.id === id ? saved : t
            ),
          }));
        } catch (error) {
          console.error('Failed to update template:', error);
          toast.error('Failed to update template');
          throw error;
        }
      },
      
      deleteTemplate: async (id) => {
        try {
          await templateDb.delete(id);
          set((state) => ({
            templates: state.templates.filter((t) => t.id !== id),
            services: state.services.filter((s) => s.templateId !== id),
            configMaps: state.configMaps.filter((c) => c.templateId !== id),
            tlsSecrets: state.tlsSecrets.filter((s) => s.templateId !== id),
            opaqueSecrets: state.opaqueSecrets.filter((s) => s.templateId !== id),
            ingresses: state.ingresses.filter((i) => i.templateId !== id),
            chartVersions: state.chartVersions.filter((v) => v.templateId !== id),
          }));
        } catch (error) {
          console.error('Failed to delete template:', error);
          toast.error('Failed to delete template');
          throw error;
        }
      },

      cloneTemplate: async (id) => {
        const state = get();
        const sourceTemplate = state.templates.find((t) => t.id === id);
        if (!sourceTemplate) throw new Error('Template not found');

        const newTemplateId = crypto.randomUUID();
        
        try {
          // Clone template with new ID and private visibility
          const newTemplate: Template = {
            ...sourceTemplate,
            id: newTemplateId,
            name: `${sourceTemplate.name} (Copy)`,
            visibility: 'private',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          const savedTemplate = await templateDb.create(newTemplate);
          set((state) => ({ templates: [...state.templates, savedTemplate] }));

          // Clone services
          const sourceServices = state.services.filter((s) => s.templateId === id);
          for (const service of sourceServices) {
            const newService: Service = {
              ...service,
              id: crypto.randomUUID(),
              templateId: newTemplateId,
            };
            const savedService = await serviceDb.create(newService);
            set((state) => ({ services: [...state.services, savedService] }));
          }

          // Clone config maps
          const sourceConfigMaps = state.configMaps.filter((c) => c.templateId === id);
          for (const configMap of sourceConfigMaps) {
            const newConfigMap: ConfigMap = {
              ...configMap,
              id: crypto.randomUUID(),
              templateId: newTemplateId,
            };
            const savedConfigMap = await configMapDb.create(newConfigMap);
            set((state) => ({ configMaps: [...state.configMaps, savedConfigMap] }));
          }

          // Clone TLS secrets
          const sourceTLSSecrets = state.tlsSecrets.filter((s) => s.templateId === id);
          for (const secret of sourceTLSSecrets) {
            const newSecret: TLSSecret = {
              ...secret,
              id: crypto.randomUUID(),
              templateId: newTemplateId,
            };
            const savedSecret = await tlsSecretDb.create(newSecret);
            set((state) => ({ tlsSecrets: [...state.tlsSecrets, savedSecret] }));
          }

          // Clone opaque secrets
          const sourceOpaqueSecrets = state.opaqueSecrets.filter((s) => s.templateId === id);
          for (const secret of sourceOpaqueSecrets) {
            const newSecret: OpaqueSecret = {
              ...secret,
              id: crypto.randomUUID(),
              templateId: newTemplateId,
            };
            const savedSecret = await opaqueSecretDb.create(newSecret);
            set((state) => ({ opaqueSecrets: [...state.opaqueSecrets, savedSecret] }));
          }

          // Clone ingresses
          const sourceIngresses = state.ingresses.filter((i) => i.templateId === id);
          for (const ingress of sourceIngresses) {
            const newIngress: Ingress = {
              ...ingress,
              id: crypto.randomUUID(),
              templateId: newTemplateId,
            };
            const savedIngress = await ingressDb.create(newIngress);
            set((state) => ({ ingresses: [...state.ingresses, savedIngress] }));
          }

          return newTemplateId;
        } catch (error) {
          console.error('Failed to clone template:', error);
          toast.error('Failed to clone template');
          throw error;
        }
      },
      
      getTemplateWithRelations: (id) => {
        const state = get();
        const template = state.templates.find((t) => t.id === id);
        if (!template) return undefined;
        
        return {
          ...template,
          services: state.services.filter((s) => s.templateId === id),
          configMaps: state.configMaps.filter((c) => c.templateId === id),
          tlsSecrets: state.tlsSecrets.filter((s) => s.templateId === id),
          opaqueSecrets: state.opaqueSecrets.filter((s) => s.templateId === id),
          ingresses: state.ingresses.filter((i) => i.templateId === id),
          versions: state.chartVersions.filter((v) => v.templateId === id),
        };
      },
      
      addService: async (service) => {
        try {
          const saved = await serviceDb.create(service);
          set((state) => ({ services: [...state.services, saved] }));
        } catch (error) {
          console.error('Failed to create service:', error);
          toast.error('Failed to create service');
          throw error;
        }
      },
      
      updateService: async (id, updates) => {
        try {
          const saved = await serviceDb.update(id, updates);
          set((state) => ({
            services: state.services.map((s) =>
              s.id === id ? saved : s
            ),
          }));
        } catch (error) {
          console.error('Failed to update service:', error);
          toast.error('Failed to update service');
          throw error;
        }
      },
      
      deleteService: async (id) => {
        try {
          await serviceDb.delete(id);
          set((state) => ({
            services: state.services.filter((s) => s.id !== id),
          }));
        } catch (error) {
          console.error('Failed to delete service:', error);
          toast.error('Failed to delete service');
          throw error;
        }
      },
      
      addConfigMap: async (configMap) => {
        try {
          const saved = await configMapDb.create(configMap);
          set((state) => ({ configMaps: [...state.configMaps, saved] }));
        } catch (error) {
          console.error('Failed to create config map:', error);
          toast.error('Failed to create config map');
          throw error;
        }
      },
      
      updateConfigMap: async (id, updates) => {
        try {
          const saved = await configMapDb.update(id, updates);
          set((state) => ({
            configMaps: state.configMaps.map((c) =>
              c.id === id ? saved : c
            ),
          }));
        } catch (error) {
          console.error('Failed to update config map:', error);
          toast.error('Failed to update config map');
          throw error;
        }
      },
      
      deleteConfigMap: async (id) => {
        try {
          await configMapDb.delete(id);
          set((state) => ({
            configMaps: state.configMaps.filter((c) => c.id !== id),
          }));
        } catch (error) {
          console.error('Failed to delete config map:', error);
          toast.error('Failed to delete config map');
          throw error;
        }
      },
      
      addTLSSecret: async (secret) => {
        try {
          const saved = await tlsSecretDb.create(secret);
          set((state) => ({ tlsSecrets: [...state.tlsSecrets, saved] }));
        } catch (error) {
          console.error('Failed to create TLS secret:', error);
          toast.error('Failed to create TLS secret');
          throw error;
        }
      },
      
      updateTLSSecret: async (id, updates) => {
        try {
          const saved = await tlsSecretDb.update(id, updates);
          set((state) => ({
            tlsSecrets: state.tlsSecrets.map((s) =>
              s.id === id ? saved : s
            ),
          }));
        } catch (error) {
          console.error('Failed to update TLS secret:', error);
          toast.error('Failed to update TLS secret');
          throw error;
        }
      },
      
      deleteTLSSecret: async (id) => {
        try {
          await tlsSecretDb.delete(id);
          set((state) => ({
            tlsSecrets: state.tlsSecrets.filter((s) => s.id !== id),
          }));
        } catch (error) {
          console.error('Failed to delete TLS secret:', error);
          toast.error('Failed to delete TLS secret');
          throw error;
        }
      },
      
      addOpaqueSecret: async (secret) => {
        try {
          const saved = await opaqueSecretDb.create(secret);
          set((state) => ({ opaqueSecrets: [...state.opaqueSecrets, saved] }));
        } catch (error) {
          console.error('Failed to create opaque secret:', error);
          toast.error('Failed to create opaque secret');
          throw error;
        }
      },
      
      updateOpaqueSecret: async (id, updates) => {
        try {
          const saved = await opaqueSecretDb.update(id, updates);
          set((state) => ({
            opaqueSecrets: state.opaqueSecrets.map((s) =>
              s.id === id ? saved : s
            ),
          }));
        } catch (error) {
          console.error('Failed to update opaque secret:', error);
          toast.error('Failed to update opaque secret');
          throw error;
        }
      },
      
      deleteOpaqueSecret: async (id) => {
        try {
          await opaqueSecretDb.delete(id);
          set((state) => ({
            opaqueSecrets: state.opaqueSecrets.filter((s) => s.id !== id),
          }));
        } catch (error) {
          console.error('Failed to delete opaque secret:', error);
          toast.error('Failed to delete opaque secret');
          throw error;
        }
      },
      
      addIngress: async (ingress) => {
        try {
          const saved = await ingressDb.create(ingress);
          set((state) => ({ ingresses: [...state.ingresses, saved] }));
        } catch (error) {
          console.error('Failed to create ingress:', error);
          toast.error('Failed to create ingress');
          throw error;
        }
      },
      
      updateIngress: async (id, updates) => {
        try {
          const saved = await ingressDb.update(id, updates);
          set((state) => ({
            ingresses: state.ingresses.map((i) =>
              i.id === id ? saved : i
            ),
          }));
        } catch (error) {
          console.error('Failed to update ingress:', error);
          toast.error('Failed to update ingress');
          throw error;
        }
      },
      
      deleteIngress: async (id) => {
        try {
          await ingressDb.delete(id);
          set((state) => ({
            ingresses: state.ingresses.filter((i) => i.id !== id),
          }));
        } catch (error) {
          console.error('Failed to delete ingress:', error);
          toast.error('Failed to delete ingress');
          throw error;
        }
      },
      
      addChartVersion: async (version) => {
        try {
          const saved = await chartVersionDb.create(version);
          set((state) => ({ chartVersions: [...state.chartVersions, saved] }));
        } catch (error) {
          console.error('Failed to create chart version:', error);
          toast.error('Failed to create chart version');
          throw error;
        }
      },
      
      deleteChartVersion: async (id) => {
        try {
          await chartVersionDb.delete(id);
          set((state) => ({
            chartVersions: state.chartVersions.filter((v) => v.id !== id),
          }));
        } catch (error) {
          console.error('Failed to delete chart version:', error);
          toast.error('Failed to delete chart version');
          throw error;
        }
      },
    }),
    {
      name: 'helm-designer-storage',
    }
  )
);
