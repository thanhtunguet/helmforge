export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      chart_versions: {
        Row: {
          app_version: string | null
          created_at: string
          id: string
          template_id: string
          values: Json
          version_name: string
        }
        Insert: {
          app_version?: string | null
          created_at?: string
          id?: string
          template_id: string
          values?: Json
          version_name: string
        }
        Update: {
          app_version?: string | null
          created_at?: string
          id?: string
          template_id?: string
          values?: Json
          version_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      config_maps: {
        Row: {
          created_at: string
          id: string
          keys: Json
          name: string
          template_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          keys?: Json
          name: string
          template_id: string
        }
        Update: {
          created_at?: string
          id?: string
          keys?: Json
          name?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "config_maps_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      ingresses: {
        Row: {
          created_at: string
          default_host: string | null
          id: string
          mode: string
          name: string
          rules: Json
          template_id: string
          tls_enabled: boolean
          tls_secret_name: string | null
        }
        Insert: {
          created_at?: string
          default_host?: string | null
          id?: string
          mode?: string
          name: string
          rules?: Json
          template_id: string
          tls_enabled?: boolean
          tls_secret_name?: string | null
        }
        Update: {
          created_at?: string
          default_host?: string | null
          id?: string
          mode?: string
          name?: string
          rules?: Json
          template_id?: string
          tls_enabled?: boolean
          tls_secret_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingresses_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      opaque_secrets: {
        Row: {
          created_at: string
          id: string
          keys: Json
          name: string
          template_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          keys?: Json
          name: string
          template_id: string
        }
        Update: {
          created_at?: string
          id?: string
          keys?: Json
          name?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opaque_secrets_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_account_template_access: {
        Row: {
          created_at: string
          id: string
          service_account_id: string
          template_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          service_account_id: string
          template_id: string
        }
        Update: {
          created_at?: string
          id?: string
          service_account_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_account_template_access_service_account_id_fkey"
            columns: ["service_account_id"]
            isOneToOne: false
            referencedRelation: "service_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_account_template_access_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      service_accounts: {
        Row: {
          api_key_hash: string
          api_key_prefix: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          last_used_at: string | null
          name: string
          user_id: string
        }
        Insert: {
          api_key_hash: string
          api_key_prefix: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name: string
          user_id: string
        }
        Update: {
          api_key_hash?: string
          api_key_prefix?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          config_map_env_sources: Json
          created_at: string
          env_vars: Json
          health_check_enabled: boolean
          id: string
          liveness_path: string | null
          name: string
          readiness_path: string | null
          routes: Json
          secret_env_sources: Json
          template_id: string
          use_stateful_set: boolean
        }
        Insert: {
          config_map_env_sources?: Json
          created_at?: string
          env_vars?: Json
          health_check_enabled?: boolean
          id?: string
          liveness_path?: string | null
          name: string
          readiness_path?: string | null
          routes?: Json
          secret_env_sources?: Json
          template_id: string
          use_stateful_set?: boolean
        }
        Update: {
          config_map_env_sources?: Json
          created_at?: string
          env_vars?: Json
          health_check_enabled?: boolean
          id?: string
          liveness_path?: string | null
          name?: string
          readiness_path?: string | null
          routes?: Json
          secret_env_sources?: Json
          template_id?: string
          use_stateful_set?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "services_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          created_at: string
          description: string | null
          enable_nginx_gateway: boolean
          enable_redis: boolean
          id: string
          name: string
          registry_project: string | null
          registry_secret: Json | null
          registry_url: string | null
          shared_port: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enable_nginx_gateway?: boolean
          enable_redis?: boolean
          id?: string
          name: string
          registry_project?: string | null
          registry_secret?: Json | null
          registry_url?: string | null
          shared_port?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enable_nginx_gateway?: boolean
          enable_redis?: boolean
          id?: string
          name?: string
          registry_project?: string | null
          registry_secret?: Json | null
          registry_url?: string | null
          shared_port?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tls_secrets: {
        Row: {
          created_at: string
          id: string
          name: string
          template_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          template_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tls_secrets_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_template_access: {
        Args: { p_service_account_id: string; p_template_id: string }
        Returns: boolean
      }
      update_service_account_last_used: {
        Args: { p_service_account_id: string }
        Returns: undefined
      }
      validate_service_account_key: {
        Args: { p_api_key: string }
        Returns: {
          is_valid: boolean
          service_account_id: string
          user_id: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
