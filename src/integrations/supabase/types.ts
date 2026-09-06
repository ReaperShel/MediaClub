export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      club_events: {
        Row: {
          additional_info: string | null;
          created_at: string;
          description: string;
          end_time: string | null;
          event_date: string;
          form_config: Json;
          form_version: number;
          id: string;
          max_participants: number;
          poster_url: string | null;
          registration_deadline: string | null;
          short_description: string;
          start_time: string | null;
          status: Database["public"]["Enums"]["club_event_status"];
          title: string;
          updated_at: string;
          venue: string;
        };
        Insert: {
          additional_info?: string | null;
          created_at?: string;
          description?: string;
          end_time?: string | null;
          event_date: string;
          form_config?: Json;
          form_version?: number;
          id?: string;
          max_participants?: number;
          poster_url?: string | null;
          registration_deadline?: string | null;
          short_description?: string;
          start_time?: string | null;
          status?: Database["public"]["Enums"]["club_event_status"];
          title: string;
          updated_at?: string;
          venue: string;
        };
        Update: {
          additional_info?: string | null;
          created_at?: string;
          description?: string;
          end_time?: string | null;
          event_date?: string;
          form_config?: Json;
          form_version?: number;
          id?: string;
          max_participants?: number;
          poster_url?: string | null;
          registration_deadline?: string | null;
          short_description?: string;
          start_time?: string | null;
          status?: Database["public"]["Enums"]["club_event_status"];
          title?: string;
          updated_at?: string;
          venue?: string;
        };
        Relationships: [];
      };
      creator_auth_attempts: {
        Row: {
          fail_count: number;
          id: string;
          locked_until: string | null;
          updated_at: string;
        };
        Insert: {
          fail_count?: number;
          id: string;
          locked_until?: string | null;
          updated_at?: string;
        };
        Update: {
          fail_count?: number;
          id?: string;
          locked_until?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      event_registrations: {
        Row: {
          additional_info: string | null;
          college_id: string | null;
          created_at: string;
          department: string | null;
          email: string;
          event_id: string;
          form_snapshot: Json | null;
          form_version: number;
          full_name: string;
          id: string;
          phone: string | null;
          responses: Json;
          year_of_study: string | null;
        };
        Insert: {
          additional_info?: string | null;
          college_id?: string | null;
          created_at?: string;
          department?: string | null;
          email?: string;
          event_id: string;
          form_snapshot?: Json | null;
          form_version?: number;
          full_name?: string;
          id?: string;
          phone?: string | null;
          responses?: Json;
          year_of_study?: string | null;
        };
        Update: {
          additional_info?: string | null;
          college_id?: string | null;
          created_at?: string;
          department?: string | null;
          email?: string;
          event_id?: string;
          form_snapshot?: Json | null;
          form_version?: number;
          full_name?: string;
          id?: string;
          phone?: string | null;
          responses?: Json;
          year_of_study?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "club_events";
            referencedColumns: ["id"];
          },
        ];
      };
      event_requests: {
        Row: {
          additional_requirements: string | null;
          created_at: string;
          email: string;
          end_time: string | null;
          event_date: string;
          event_description: string;
          event_name: string;
          event_type: string;
          expected_attendees: number | null;
          id: string;
          organization: string | null;
          other_service: string | null;
          phone: string | null;
          reference: string;
          rejection_reason: string | null;
          requested_services: string[];
          requester_name: string;
          requester_type: string;
          start_time: string | null;
          status: Database["public"]["Enums"]["request_status"];
          updated_at: string;
          venue: string;
        };
        Insert: {
          additional_requirements?: string | null;
          created_at?: string;
          email: string;
          end_time?: string | null;
          event_date: string;
          event_description: string;
          event_name: string;
          event_type: string;
          expected_attendees?: number | null;
          id?: string;
          organization?: string | null;
          other_service?: string | null;
          phone?: string | null;
          reference?: string;
          rejection_reason?: string | null;
          requested_services?: string[];
          requester_name: string;
          requester_type: string;
          start_time?: string | null;
          status?: Database["public"]["Enums"]["request_status"];
          updated_at?: string;
          venue: string;
        };
        Update: {
          additional_requirements?: string | null;
          created_at?: string;
          email?: string;
          end_time?: string | null;
          event_date?: string;
          event_description?: string;
          event_name?: string;
          event_type?: string;
          expected_attendees?: number | null;
          id?: string;
          organization?: string | null;
          other_service?: string | null;
          phone?: string | null;
          reference?: string;
          rejection_reason?: string | null;
          requested_services?: string[];
          requester_name?: string;
          requester_type?: string;
          start_time?: string | null;
          status?: Database["public"]["Enums"]["request_status"];
          updated_at?: string;
          venue?: string;
        };
        Relationships: [];
      };
      featured_content: {
        Row: {
          content_id: string;
          content_type: string;
          custom_excerpt: string | null;
          custom_title: string | null;
          id: string;
          image_url: string | null;
          updated_at: string;
        };
        Insert: {
          content_id: string;
          content_type: string;
          custom_excerpt?: string | null;
          custom_title?: string | null;
          id?: string;
          image_url?: string | null;
          updated_at?: string;
        };
        Update: {
          content_id?: string;
          content_type?: string;
          custom_excerpt?: string | null;
          custom_title?: string | null;
          id?: string;
          image_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      team_people: {
        Row: {
          bio: string;
          created_at: string;
          display_order: number;
          drive_folder_id: string | null;
          drive_photo_file_id: string | null;
          drive_photo_mime: string | null;
          drive_photo_name: string | null;
          id: string;
          instagram_url: string | null;
          kind: string;
          lead_id: string | null;
          name: string;
          published: boolean;
          rank: string;
          role: string;
          skills: string[];
          team: string;
          updated_at: string;
        };
        Insert: {
          bio?: string;
          created_at?: string;
          display_order?: number;
          drive_folder_id?: string | null;
          drive_photo_file_id?: string | null;
          drive_photo_mime?: string | null;
          drive_photo_name?: string | null;
          id?: string;
          instagram_url?: string | null;
          kind: string;
          lead_id?: string | null;
          name: string;
          published?: boolean;
          rank?: string;
          role: string;
          skills?: string[];
          team?: string;
          updated_at?: string;
        };
        Update: {
          bio?: string;
          created_at?: string;
          display_order?: number;
          drive_folder_id?: string | null;
          drive_photo_file_id?: string | null;
          drive_photo_mime?: string | null;
          drive_photo_name?: string | null;
          id?: string;
          instagram_url?: string | null;
          kind?: string;
          lead_id?: string | null;
          name?: string;
          published?: boolean;
          rank?: string;
          role?: string;
          skills?: string[];
          team?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_people_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "team_people";
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
      club_event_seat_counts: {
        Args: never;
        Returns: {
          event_id: string;
          registered: number;
        }[];
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "user";
      club_event_status:
        | "upcoming"
        | "registration_open"
        | "registration_closed"
        | "completed"
        | "cancelled"
        | "removed";
      request_status: "pending" | "approved" | "rejected";
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
      app_role: ["admin", "user"],
      club_event_status: [
        "upcoming",
        "registration_open",
        "registration_closed",
        "completed",
        "cancelled",
        "removed",
      ],
      request_status: ["pending", "approved", "rejected"],
    },
  },
} as const;
