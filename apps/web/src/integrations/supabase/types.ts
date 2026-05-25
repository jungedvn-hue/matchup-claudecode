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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          location: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          location?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          location?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      tournaments: {
        Row: {
          id: string
          name: string
          date: string
          location: string
          format: string
          points_per_game: number
          win_by_two: boolean
          status: string
          ranking_priority: Json
          host_id: string
          referees: Json
          courts: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          date: string
          location: string
          format?: string
          points_per_game?: number
          win_by_two?: boolean
          status?: string
          ranking_priority?: Json
          host_id: string
          referees?: Json
          courts?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          date?: string
          location?: string
          format?: string
          points_per_game?: number
          win_by_two?: boolean
          status?: string
          ranking_priority?: Json
          host_id?: string
          referees?: Json
          courts?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      tour_categories: {
        Row: {
          id: string
          tournament_id: string
          type: string
          name: string
          advancing_per_pool: number
          wildcard_count: number
          pool_allocation_mode: string
          pools: Json
          bracket_rounds: Json
          bracket_fill_mode: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          type: string
          name: string
          advancing_per_pool?: number
          wildcard_count?: number
          pool_allocation_mode?: string
          pools?: Json
          bracket_rounds?: Json
          bracket_fill_mode?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          type?: string
          name?: string
          advancing_per_pool?: number
          wildcard_count?: number
          pool_allocation_mode?: string
          pools?: Json
          bracket_rounds?: Json
          bracket_fill_mode?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_categories_tournament_id_fkey"
            columns: ["tournament_id"]
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          }
        ]
      }
      tour_participants: {
        Row: {
          id: string
          category_id: string
          name: string
          seed: number | null
          skill_level: string | null
          user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id: string
          name: string
          seed?: number | null
          skill_level?: string | null
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          name?: string
          seed?: number | null
          skill_level?: string | null
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_participants_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "tour_categories"
            referencedColumns: ["id"]
          }
        ]
      }
      tour_matches: {
        Row: {
          id: string
          category_id: string
          tournament_id: string
          pool_id: string | null
          bracket_round_id: string | null
          match_no: number
          entry_a_id: string | null
          entry_b_id: string | null
          entry_a_name: string
          entry_b_name: string
          score_a: number
          score_b: number
          winner_id: string | null
          status: string
          court_id: string | null
          referee_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id: string
          tournament_id: string
          pool_id?: string | null
          bracket_round_id?: string | null
          match_no: number
          entry_a_id?: string | null
          entry_b_id?: string | null
          entry_a_name?: string
          entry_b_name?: string
          score_a?: number
          score_b?: number
          winner_id?: string | null
          status?: string
          court_id?: string | null
          referee_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          tournament_id?: string
          pool_id?: string | null
          bracket_round_id?: string | null
          match_no?: number
          entry_a_id?: string | null
          entry_b_id?: string | null
          entry_a_name?: string
          entry_b_name?: string
          score_a?: number
          score_b?: number
          winner_id?: string | null
          status?: string
          court_id?: string | null
          referee_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_matches_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "tour_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_matches_tournament_id_fkey"
            columns: ["tournament_id"]
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
