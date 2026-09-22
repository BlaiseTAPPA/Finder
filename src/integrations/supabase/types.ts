export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      collector_state: {
        Row: {
          cursor: string | null;
          id: string;
          last_error: string | null;
          last_run_at: string | null;
          lease_until: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          cursor?: string | null;
          id: string;
          last_error?: string | null;
          last_run_at?: string | null;
          lease_until?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          cursor?: string | null;
          id?: string;
          last_error?: string | null;
          last_run_at?: string | null;
          lease_until?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      price_alerts: {
        Row: {
          active: boolean;
          clerk_user_id: string;
          created_at: string;
          fuel_type: Database["public"]["Enums"]["fuel_type"];
          id: string;
          last_triggered_at: string | null;
          station_id: string;
          station_name: string;
          threshold: number;
        };
        Insert: {
          active?: boolean;
          clerk_user_id: string;
          created_at?: string;
          fuel_type: Database["public"]["Enums"]["fuel_type"];
          id?: string;
          last_triggered_at?: string | null;
          station_id: string;
          station_name?: string;
          threshold: number;
        };
        Update: {
          active?: boolean;
          clerk_user_id?: string;
          created_at?: string;
          fuel_type?: Database["public"]["Enums"]["fuel_type"];
          id?: string;
          last_triggered_at?: string | null;
          station_id?: string;
          station_name?: string;
          threshold?: number;
        };
        Relationships: [
          {
            foreignKeyName: "price_alerts_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
        ];
      };
      price_confirmations: {
        Row: {
          contributor_id: string;
          created_at: string;
          fuel_type: Database["public"]["Enums"]["fuel_type"];
          id: string;
          station_id: string;
          user_lat: number;
          user_lng: number;
        };
        Insert: {
          contributor_id: string;
          created_at?: string;
          fuel_type: Database["public"]["Enums"]["fuel_type"];
          id?: string;
          station_id: string;
          user_lat: number;
          user_lng: number;
        };
        Update: {
          contributor_id?: string;
          created_at?: string;
          fuel_type?: Database["public"]["Enums"]["fuel_type"];
          id?: string;
          station_id?: string;
          user_lat?: number;
          user_lng?: number;
        };
        Relationships: [
          {
            foreignKeyName: "price_confirmations_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
        ];
      };
      price_daily: {
        Row: {
          avg_price: number;
          day: string;
          fuel_type: Database["public"]["Enums"]["fuel_type"];
          max_price: number;
          min_price: number;
          samples: number;
          station_id: string;
        };
        Insert: {
          avg_price: number;
          day: string;
          fuel_type: Database["public"]["Enums"]["fuel_type"];
          max_price: number;
          min_price: number;
          samples?: number;
          station_id: string;
        };
        Update: {
          avg_price?: number;
          day?: string;
          fuel_type?: Database["public"]["Enums"]["fuel_type"];
          max_price?: number;
          min_price?: number;
          samples?: number;
          station_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "price_daily_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
        ];
      };
      price_history: {
        Row: {
          fuel_type: Database["public"]["Enums"]["fuel_type"];
          id: number;
          price: number;
          recorded_at: string;
          station_id: string;
        };
        Insert: {
          fuel_type: Database["public"]["Enums"]["fuel_type"];
          id?: number;
          price: number;
          recorded_at?: string;
          station_id: string;
        };
        Update: {
          fuel_type?: Database["public"]["Enums"]["fuel_type"];
          id?: number;
          price?: number;
          recorded_at?: string;
          station_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "price_history_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
        ];
      };
      price_reports: {
        Row: {
          comment: string | null;
          contributor_id: string;
          created_at: string;
          fuel_type: Database["public"]["Enums"]["fuel_type"];
          id: string;
          reported_price: number | null;
          station_id: string;
          user_lat: number | null;
          user_lng: number | null;
        };
        Insert: {
          comment?: string | null;
          contributor_id: string;
          created_at?: string;
          fuel_type: Database["public"]["Enums"]["fuel_type"];
          id?: string;
          reported_price?: number | null;
          station_id: string;
          user_lat?: number | null;
          user_lng?: number | null;
        };
        Update: {
          comment?: string | null;
          contributor_id?: string;
          created_at?: string;
          fuel_type?: Database["public"]["Enums"]["fuel_type"];
          id?: string;
          reported_price?: number | null;
          station_id?: string;
          user_lat?: number | null;
          user_lng?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "price_reports_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          clerk_user_id: string;
          created_at: string;
          updated_at: string;
          username: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          clerk_user_id: string;
          created_at?: string;
          updated_at?: string;
          username?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          clerk_user_id?: string;
          created_at?: string;
          updated_at?: string;
          username?: string | null;
        };
        Relationships: [];
      };
      stations: {
        Row: {
          brand: string;
          created_at: string;
          house_number: string;
          id: string;
          last_seen_at: string;
          lat: number;
          lng: number;
          name: string;
          place: string;
          post_code: string;
          street: string;
        };
        Insert: {
          brand?: string;
          created_at?: string;
          house_number?: string;
          id: string;
          last_seen_at?: string;
          lat: number;
          lng: number;
          name?: string;
          place?: string;
          post_code?: string;
          street?: string;
        };
        Update: {
          brand?: string;
          created_at?: string;
          house_number?: string;
          id?: string;
          last_seen_at?: string;
          lat?: number;
          lng?: number;
          name?: string;
          place?: string;
          post_code?: string;
          street?: string;
        };
        Relationships: [];
      };
      user_favorites: {
        Row: {
          clerk_user_id: string;
          created_at: string;
          id: string;
          station: Json;
          station_id: string;
        };
        Insert: {
          clerk_user_id: string;
          created_at?: string;
          id?: string;
          station: Json;
          station_id: string;
        };
        Update: {
          clerk_user_id?: string;
          created_at?: string;
          id?: string;
          station?: Json;
          station_id?: string;
        };
        Relationships: [];
      };
      user_trips: {
        Row: {
          clerk_user_id: string;
          created_at: string;
          id: string;
          name: string;
          trip: Json;
        };
        Insert: {
          clerk_user_id: string;
          created_at?: string;
          id?: string;
          name: string;
          trip: Json;
        };
        Update: {
          clerk_user_id?: string;
          created_at?: string;
          id?: string;
          name?: string;
          trip?: Json;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      compact_price_history: { Args: never; Returns: undefined };
    };
    Enums: {
      fuel_type: "e5" | "e10" | "diesel";
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      fuel_type: ["e5", "e10", "diesel"],
    },
  },
} as const;
