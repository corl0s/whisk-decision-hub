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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      daily_predictions: {
        Row: {
          created_at: string
          id: string
          payload: Json
          predicted_covers: number
          prediction_date: string
          recommended_qty: number
          restaurant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload: Json
          predicted_covers: number
          prediction_date: string
          recommended_qty: number
          restaurant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          predicted_covers?: number
          prediction_date?: string
          recommended_qty?: number
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_predictions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          event_date: string
          event_type: string
          expected_attendance: number | null
          id: string
          lat: number | null
          lng: number | null
          metadata: Json
          name: string
          radius_km: number
        }
        Insert: {
          created_at?: string
          event_date: string
          event_type: string
          expected_attendance?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          metadata?: Json
          name: string
          radius_km?: number
        }
        Update: {
          created_at?: string
          event_date?: string
          event_type?: string
          expected_attendance?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          metadata?: Json
          name?: string
          radius_km?: number
        }
        Relationships: []
      }
      inventory_levels: {
        Row: {
          created_at: string
          current_stock: number
          id: string
          last_counted_at: string
          menu_item_id: string
          par_level: number
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_stock?: number
          id?: string
          last_counted_at?: string
          menu_item_id: string
          par_level?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_stock?: number
          id?: string
          last_counted_at?: string
          menu_item_id?: string
          par_level?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_levels_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: true
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string
          created_at: string
          id: string
          lat: number
          lng: number
          name: string
          timezone: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          lat: number
          lng: number
          name: string
          timezone?: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          lat?: number
          lng?: number
          name?: string
          timezone?: string
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          baseline_hourly_demand: number
          category: string
          co2_per_unit: number
          cost_per_unit: number
          created_at: string
          id: string
          location_id: string
          name: string
        }
        Insert: {
          baseline_hourly_demand?: number
          category: string
          co2_per_unit?: number
          cost_per_unit?: number
          created_at?: string
          id?: string
          location_id: string
          name: string
        }
        Update: {
          baseline_hourly_demand?: number
          category?: string
          co2_per_unit?: number
          cost_per_unit?: number
          created_at?: string
          id?: string
          location_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      predictions: {
        Row: {
          created_at: string
          id: string
          location_id: string
          payload: Json
          shift_date: string
          shift_label: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id: string
          payload: Json
          shift_date: string
          shift_label: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string
          payload?: Json
          shift_date?: string
          shift_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "predictions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      restaurants: {
        Row: {
          avg_order_size: number | null
          avg_rating: number | null
          created_at: string
          delivery_ratio: number | null
          dist_to_boston_center_km: number | null
          dist_to_marathon_km: number | null
          has_delivery: boolean | null
          id: string
          is_fast_food: boolean | null
          is_health_focused: boolean | null
          lat: number | null
          lng: number | null
          name: string
          neighborhood: string | null
          owner_user_id: string
          price_tier: number | null
          seating_capacity: number | null
          setup_complete: boolean | null
          updated_at: string
        }
        Insert: {
          avg_order_size?: number | null
          avg_rating?: number | null
          created_at?: string
          delivery_ratio?: number | null
          dist_to_boston_center_km?: number | null
          dist_to_marathon_km?: number | null
          has_delivery?: boolean | null
          id?: string
          is_fast_food?: boolean | null
          is_health_focused?: boolean | null
          lat?: number | null
          lng?: number | null
          name?: string
          neighborhood?: string | null
          owner_user_id: string
          price_tier?: number | null
          seating_capacity?: number | null
          setup_complete?: boolean | null
          updated_at?: string
        }
        Update: {
          avg_order_size?: number | null
          avg_rating?: number | null
          created_at?: string
          delivery_ratio?: number | null
          dist_to_boston_center_km?: number | null
          dist_to_marathon_km?: number | null
          has_delivery?: boolean | null
          id?: string
          is_fast_food?: boolean | null
          is_health_focused?: boolean | null
          lat?: number | null
          lng?: number | null
          name?: string
          neighborhood?: string | null
          owner_user_id?: string
          price_tier?: number | null
          seating_capacity?: number | null
          setup_complete?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "admin"
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
      app_role: ["owner", "admin"],
    },
  },
} as const
