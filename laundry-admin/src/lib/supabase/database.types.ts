/**
 * Replace with `supabase gen types` once DB contracts are finalized by backend.
 * Kept intentionally permissive so admin UI can map from evolving schemas.
 */
type JsonPrimitive = string | number | boolean | null;
type Json = JsonPrimitive | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email?: string | null;
          phone?: string | null;
          full_name?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          role?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          [key: string]: Json | undefined;
        };
        Insert: {
          id?: string;
          email?: string | null;
          phone?: string | null;
          full_name?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          role?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          [key: string]: Json | undefined;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      customer_orders: {
        Row: {
          id: string;
          customer_id?: string | null;
          partner_id?: string | null;
          status?: string | null;
          currency_prefix?: string | null;
          estimated_total?: number | null;
          delivery_type?: string | null;
          created_at?: string | null;
          [key: string]: Json | undefined;
        };
        Insert: {
          id?: string;
          customer_id?: string | null;
          partner_id?: string | null;
          status?: string | null;
          currency_prefix?: string | null;
          estimated_total?: number | null;
          delivery_type?: string | null;
          created_at?: string | null;
          [key: string]: Json | undefined;
        };
        Update: Partial<Database["public"]["Tables"]["customer_orders"]["Insert"]>;
        Relationships: [];
      };
      order_services: {
        Row: {
          id: string;
          order_id?: string | null;
          service_type?: string | null;
          estimated_amount?: number | null;
          total_item_count?: number | null;
          created_at?: string | null;
          [key: string]: Json | undefined;
        };
        Insert: {
          id?: string;
          order_id?: string | null;
          service_type?: string | null;
          estimated_amount?: number | null;
          total_item_count?: number | null;
          created_at?: string | null;
          [key: string]: Json | undefined;
        };
        Update: Partial<Database["public"]["Tables"]["order_services"]["Insert"]>;
        Relationships: [];
      };
      order_service_items: {
        Row: {
          id: string;
          order_service_id?: string | null;
          quantity?: number | null;
          [key: string]: Json | undefined;
        };
        Insert: {
          id?: string;
          order_service_id?: string | null;
          quantity?: number | null;
          [key: string]: Json | undefined;
        };
        Update: Partial<Database["public"]["Tables"]["order_service_items"]["Insert"]>;
        Relationships: [];
      };
      partner_profiles: {
        Row: {
          id: string;
          business_name?: string | null;
          business_description?: string | null;
          pickup_delivery_enabled?: boolean | null;
          pickup_delivery_amount?: string | null;
          [key: string]: Json | undefined;
        };
        Insert: {
          id?: string;
          business_name?: string | null;
          business_description?: string | null;
          pickup_delivery_enabled?: boolean | null;
          pickup_delivery_amount?: string | null;
          [key: string]: Json | undefined;
        };
        Update: Partial<Database["public"]["Tables"]["partner_profiles"]["Insert"]>;
        Relationships: [];
      };
      partner_services: {
        Row: {
          id: string;
          user_id?: string | null;
          name?: string | null;
          category?: string | null;
          price_display?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          [key: string]: Json | undefined;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name?: string | null;
          category?: string | null;
          price_display?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          [key: string]: Json | undefined;
        };
        Update: Partial<Database["public"]["Tables"]["partner_services"]["Insert"]>;
        Relationships: [];
      };
      partner_onboarding_requests: {
        Row: {
          id: string;
          user_id?: string | null;
          status?: string | null;
          submitted_at?: string | null;
          reviewed_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          rejection_reason?: string | null;
          reviewed_by?: string | null;
          notes?: Json | null;
          [key: string]: Json | undefined;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          status?: string | null;
          submitted_at?: string | null;
          reviewed_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          rejection_reason?: string | null;
          reviewed_by?: string | null;
          notes?: Json | null;
          [key: string]: Json | undefined;
        };
        Update: Partial<Database["public"]["Tables"]["partner_onboarding_requests"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
