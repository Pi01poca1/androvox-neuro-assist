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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_logs: {
        Row: {
          action_type: string
          clinic_id: string
          created_at: string
          full_prompt: string | null
          id: string
          input_summary: string | null
          output_summary: string | null
          patient_id: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          clinic_id: string
          created_at?: string
          full_prompt?: string | null
          id?: string
          input_summary?: string | null
          output_summary?: string | null
          patient_id?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          clinic_id?: string
          created_at?: string
          full_prompt?: string | null
          id?: string
          input_summary?: string | null
          output_summary?: string | null
          patient_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_logs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          created_at: string
          id: string
          name: string
          settings: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          settings?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          settings?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          message: string
          read: boolean | null
          sent_at: string | null
          session_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          message: string
          read?: boolean | null
          sent_at?: string | null
          session_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          message?: string
          read?: boolean | null
          sent_at?: string | null
          session_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          birth_date: string | null
          clinic_id: string
          created_at: string
          full_name: string | null
          gender: Database["public"]["Enums"]["gender_type"] | null
          id: string
          notes_summary: string | null
          public_id: string
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          clinic_id: string
          created_at?: string
          full_name?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          notes_summary?: string | null
          public_id: string
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          clinic_id?: string
          created_at?: string
          full_name?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          notes_summary?: string | null
          public_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          clinic_id: string | null
          created_at: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string
          full_name: string
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          clinic_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      session_attachments: {
        Row: {
          clinic_id: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          session_id: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          clinic_id: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          session_id: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          clinic_id?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          session_id?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_attachments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_history: {
        Row: {
          change_type: string
          changed_at: string
          changed_by: string
          clinic_id: string
          field_name: string | null
          id: string
          new_value: string | null
          old_value: string | null
          session_id: string
        }
        Insert: {
          change_type: string
          changed_at?: string
          changed_by: string
          clinic_id: string
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          session_id: string
        }
        Update: {
          change_type?: string
          changed_at?: string
          changed_by?: string
          clinic_id?: string
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          session_id?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          ai_suggestions: Json | null
          clinic_id: string
          created_at: string
          created_by: string | null
          hypotheses: string | null
          id: string
          interventions: string | null
          main_complaint: string | null
          mode: Database["public"]["Enums"]["session_mode"]
          observations: string | null
          patient_id: string
          reminder_sent: boolean | null
          scheduled_duration: number | null
          session_date: string
          session_type: Database["public"]["Enums"]["session_type"] | null
          status: Database["public"]["Enums"]["session_status"] | null
          updated_at: string
        }
        Insert: {
          ai_suggestions?: Json | null
          clinic_id: string
          created_at?: string
          created_by?: string | null
          hypotheses?: string | null
          id?: string
          interventions?: string | null
          main_complaint?: string | null
          mode?: Database["public"]["Enums"]["session_mode"]
          observations?: string | null
          patient_id: string
          reminder_sent?: boolean | null
          scheduled_duration?: number | null
          session_date?: string
          session_type?: Database["public"]["Enums"]["session_type"] | null
          status?: Database["public"]["Enums"]["session_status"] | null
          updated_at?: string
        }
        Update: {
          ai_suggestions?: Json | null
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          hypotheses?: string | null
          id?: string
          interventions?: string | null
          main_complaint?: string | null
          mode?: Database["public"]["Enums"]["session_mode"]
          observations?: string | null
          patient_id?: string
          reminder_sent?: boolean | null
          scheduled_duration?: number | null
          session_date?: string
          session_type?: Database["public"]["Enums"]["session_type"] | null
          status?: Database["public"]["Enums"]["session_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_queue: {
        Row: {
          clinic_id: string
          created_at: string
          data: Json
          entity_id: string
          entity_type: string
          id: string
          operation: string
          synced: boolean | null
          user_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          data: Json
          entity_id: string
          entity_type: string
          id?: string
          operation: string
          synced?: boolean | null
          user_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          data?: Json
          entity_id?: string
          entity_type?: string
          id?: string
          operation?: string
          synced?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_queue_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_patient_public_id: { Args: never; Returns: string }
      get_upcoming_sessions_for_reminders: {
        Args: never
        Returns: {
          patient_id: string
          patient_name: string
          professional_email: string
          professional_id: string
          session_date: string
          session_id: string
        }[]
      }
      get_user_clinic_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "profissional" | "secretario"
      gender_type: "M" | "F" | "Outro" | "Não informado"
      privacy_mode: "ID" | "NOME"
      session_mode: "online" | "presencial" | "híbrida"
      session_status: "agendada" | "concluída" | "cancelada"
      session_type:
        | "anamnese"
        | "avaliacao_neuropsicologica"
        | "tcc"
        | "intervencao_neuropsicologica"
        | "retorno"
        | "outra"
      user_role: "admin" | "clinico" | "assistente"
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
    Enums: {
      app_role: ["profissional", "secretario"],
      gender_type: ["M", "F", "Outro", "Não informado"],
      privacy_mode: ["ID", "NOME"],
      session_mode: ["online", "presencial", "híbrida"],
      session_status: ["agendada", "concluída", "cancelada"],
      session_type: [
        "anamnese",
        "avaliacao_neuropsicologica",
        "tcc",
        "intervencao_neuropsicologica",
        "retorno",
        "outra",
      ],
      user_role: ["admin", "clinico", "assistente"],
    },
  },
} as const
