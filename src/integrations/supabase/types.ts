export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string;
          changes: Json | null;
          created_at: string;
          entity_id: string | null;
          entity_label: string | null;
          entity_type: string;
          id: string;
          meta: Json | null;
          user_email: string | null;
          user_id: string | null;
        };
        Insert: {
          action: string;
          changes?: Json | null;
          created_at?: string;
          entity_id?: string | null;
          entity_label?: string | null;
          entity_type: string;
          id?: string;
          meta?: Json | null;
          user_email?: string | null;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          changes?: Json | null;
          created_at?: string;
          entity_id?: string | null;
          entity_label?: string | null;
          entity_type?: string;
          id?: string;
          meta?: Json | null;
          user_email?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      customers: {
        Row: {
          address: string | null;
          company_name: string;
          contact_person: string | null;
          created_at: string;
          created_by: string | null;
          email: string | null;
          gst_number: string | null;
          id: string;
          notes: string | null;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          company_name: string;
          contact_person?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          gst_number?: string | null;
          id?: string;
          notes?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          company_name?: string;
          contact_person?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          gst_number?: string | null;
          id?: string;
          notes?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      follow_ups: {
        Row: {
          completed: boolean;
          completed_at: string | null;
          created_at: string;
          created_by: string | null;
          due_date: string;
          id: string;
          lead_id: string;
          notes: string | null;
          updated_at: string;
        };
        Insert: {
          completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          due_date: string;
          id?: string;
          lead_id: string;
          notes?: string | null;
          updated_at?: string;
        };
        Update: {
          completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          due_date?: string;
          id?: string;
          lead_id?: string;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "follow_ups_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ];
      };
      jobs: {
        Row: {
          assigned_to: string | null;
          created_at: string;
          created_by: string | null;
          customer_id: string | null;
          deadline: string | null;
          id: string;
          job_number: string | null;
          material: string | null;
          notes: string | null;
          quantity: number | null;
          quotation_id: string | null;
          stage: Database["public"]["Enums"]["job_stage"];
          title: string;
          updated_at: string;
          value: number | null;
        };
        Insert: {
          assigned_to?: string | null;
          created_at?: string;
          created_by?: string | null;
          customer_id?: string | null;
          deadline?: string | null;
          id?: string;
          job_number?: string | null;
          material?: string | null;
          notes?: string | null;
          quantity?: number | null;
          quotation_id?: string | null;
          stage?: Database["public"]["Enums"]["job_stage"];
          title: string;
          updated_at?: string;
          value?: number | null;
        };
        Update: {
          assigned_to?: string | null;
          created_at?: string;
          created_by?: string | null;
          customer_id?: string | null;
          deadline?: string | null;
          id?: string;
          job_number?: string | null;
          material?: string | null;
          notes?: string | null;
          quantity?: number | null;
          quotation_id?: string | null;
          stage?: Database["public"]["Enums"]["job_stage"];
          title?: string;
          updated_at?: string;
          value?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "jobs_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jobs_quotation_id_fkey";
            columns: ["quotation_id"];
            isOneToOne: false;
            referencedRelation: "quotations";
            referencedColumns: ["id"];
          },
        ];
      };
      leads: {
        Row: {
          address: string | null;
          assigned_to: string | null;
          company: string | null;
          created_at: string;
          created_by: string | null;
          customer_id: string | null;
          email: string | null;
          estimated_value: number | null;
          gst_number: string | null;
          id: string;
          lead_code: string | null;
          name: string;
          notes: string | null;
          phone: string | null;
          requirement: string | null;
          source: Database["public"]["Enums"]["lead_source"];
          status: Database["public"]["Enums"]["lead_status"];
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          assigned_to?: string | null;
          company?: string | null;
          created_at?: string;
          created_by?: string | null;
          customer_id?: string | null;
          email?: string | null;
          estimated_value?: number | null;
          gst_number?: string | null;
          id?: string;
          lead_code?: string | null;
          name: string;
          notes?: string | null;
          phone?: string | null;
          requirement?: string | null;
          source?: Database["public"]["Enums"]["lead_source"];
          status?: Database["public"]["Enums"]["lead_status"];
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          assigned_to?: string | null;
          company?: string | null;
          created_at?: string;
          created_by?: string | null;
          customer_id?: string | null;
          email?: string | null;
          estimated_value?: number | null;
          gst_number?: string | null;
          id?: string;
          lead_code?: string | null;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          requirement?: string | null;
          source?: Database["public"]["Enums"]["lead_source"];
          status?: Database["public"]["Enums"]["lead_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leads_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          id: string;
          kind: string;
          link: string | null;
          read_at: string | null;
          severity: string;
          title: string;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          id?: string;
          kind: string;
          link?: string | null;
          read_at?: string | null;
          severity?: string;
          title: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          id?: string;
          kind?: string;
          link?: string | null;
          read_at?: string | null;
          severity?: string;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      quotation_items: {
        Row: {
          amount: number;
          created_at: string;
          description: string;
          hsn_code: string | null;
          id: string;
          position: number;
          quantity: number;
          quotation_id: string;
          unit: string | null;
          unit_price: number;
        };
        Insert: {
          amount?: number;
          created_at?: string;
          description: string;
          hsn_code?: string | null;
          id?: string;
          position?: number;
          quantity?: number;
          quotation_id: string;
          unit?: string | null;
          unit_price?: number;
        };
        Update: {
          amount?: number;
          created_at?: string;
          description?: string;
          hsn_code?: string | null;
          id?: string;
          position?: number;
          quantity?: number;
          quotation_id?: string;
          unit?: string | null;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "quotation_items_quotation_id_fkey";
            columns: ["quotation_id"];
            isOneToOne: false;
            referencedRelation: "quotations";
            referencedColumns: ["id"];
          },
        ];
      };
      quotations: {
        Row: {
          created_at: string;
          created_by: string | null;
          customer_address: string | null;
          customer_company: string | null;
          customer_email: string | null;
          customer_gst: string | null;
          customer_id: string | null;
          customer_name: string;
          customer_phone: string | null;
          discount_amount: number;
          discount_pct: number;
          grand_total: number;
          gst_amount: number;
          gst_pct: number;
          id: string;
          lead_id: string | null;
          notes: string | null;
          quotation_number: string | null;
          status: Database["public"]["Enums"]["quotation_status"];
          subtotal: number;
          terms: string | null;
          updated_at: string;
          valid_until: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          customer_address?: string | null;
          customer_company?: string | null;
          customer_email?: string | null;
          customer_gst?: string | null;
          customer_id?: string | null;
          customer_name: string;
          customer_phone?: string | null;
          discount_amount?: number;
          discount_pct?: number;
          grand_total?: number;
          gst_amount?: number;
          gst_pct?: number;
          id?: string;
          lead_id?: string | null;
          notes?: string | null;
          quotation_number?: string | null;
          status?: Database["public"]["Enums"]["quotation_status"];
          subtotal?: number;
          terms?: string | null;
          updated_at?: string;
          valid_until?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          customer_address?: string | null;
          customer_company?: string | null;
          customer_email?: string | null;
          customer_gst?: string | null;
          customer_id?: string | null;
          customer_name?: string;
          customer_phone?: string | null;
          discount_amount?: number;
          discount_pct?: number;
          grand_total?: number;
          gst_amount?: number;
          gst_pct?: number;
          id?: string;
          lead_id?: string | null;
          notes?: string | null;
          quotation_number?: string | null;
          status?: Database["public"]["Enums"]["quotation_status"];
          subtotal?: number;
          terms?: string | null;
          updated_at?: string;
          valid_until?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "quotations_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotations_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_admin_or_manager: { Args: { _user_id: string }; Returns: boolean };
    };
    Enums: {
      app_role: "admin" | "manager" | "sales" | "viewer";
      job_stage:
        | "design_received"
        | "programming"
        | "laser_cutting"
        | "bending"
        | "welding"
        | "powder_coating"
        | "quality_check"
        | "dispatch"
        | "completed";
      lead_source:
        | "website"
        | "google"
        | "referral"
        | "facebook"
        | "instagram"
        | "whatsapp"
        | "direct_call"
        | "other";
      lead_status:
        | "new"
        | "contacted"
        | "quotation_sent"
        | "follow_up"
        | "negotiation"
        | "won"
        | "lost";
      quotation_status: "draft" | "sent" | "approved" | "rejected" | "expired";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "manager", "sales", "viewer"],
      job_stage: [
        "design_received",
        "programming",
        "laser_cutting",
        "bending",
        "welding",
        "powder_coating",
        "quality_check",
        "dispatch",
        "completed",
      ],
      lead_source: [
        "website",
        "google",
        "referral",
        "facebook",
        "instagram",
        "whatsapp",
        "direct_call",
        "other",
      ],
      lead_status: [
        "new",
        "contacted",
        "quotation_sent",
        "follow_up",
        "negotiation",
        "won",
        "lost",
      ],
      quotation_status: ["draft", "sent", "approved", "rejected", "expired"],
    },
  },
} as const;
