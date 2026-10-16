// Tipos do banco no formato do `supabase gen types typescript`.
// Para regenerar depois de mudar o esquema: `npm run db:types`.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      households: {
        Row: {
          id: string;
          name: string;
          invite_code: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name?: string;
          invite_code?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          invite_code?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      household_members: {
        Row: {
          household_id: string;
          user_id: string;
          display_name: string;
          color: string;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          household_id: string;
          user_id: string;
          display_name: string;
          color?: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          household_id?: string;
          user_id?: string;
          display_name?: string;
          color?: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      accounts: {
        Row: {
          id: string;
          household_id: string;
          owner_id: string;
          name: string;
          bank: string | null;
          kind: AccountKind;
          initial_balance: number;
          goal_amount: number | null;
          color: string | null;
          archived: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id?: string;
          owner_id: string;
          name: string;
          bank?: string | null;
          kind?: AccountKind;
          initial_balance?: number;
          goal_amount?: number | null;
          color?: string | null;
          archived?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          owner_id?: string;
          name?: string;
          bank?: string | null;
          kind?: AccountKind;
          initial_balance?: number;
          goal_amount?: number | null;
          color?: string | null;
          archived?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          kind: CategoryKind;
          color: string | null;
          icon: string;
          keywords: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id?: string;
          name: string;
          kind: CategoryKind;
          color?: string | null;
          icon?: string;
          keywords?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          name?: string;
          kind?: CategoryKind;
          color?: string | null;
          icon?: string;
          keywords?: string[];
          created_at?: string;
        };
        Relationships: [];
      };
      recurring_bills: {
        Row: {
          id: string;
          household_id: string;
          description: string;
          kind: CategoryKind;
          amount: number;
          due_day: number;
          owner_id: string;
          account_id: string | null;
          category_id: string | null;
          start_month: string;
          end_month: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id?: string;
          description: string;
          kind?: CategoryKind;
          amount: number;
          due_day: number;
          owner_id: string;
          account_id?: string | null;
          category_id?: string | null;
          start_month: string;
          end_month?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          description?: string;
          kind?: CategoryKind;
          amount?: number;
          due_day?: number;
          owner_id?: string;
          account_id?: string | null;
          category_id?: string | null;
          start_month?: string;
          end_month?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      import_batches: {
        Row: {
          id: string;
          household_id: string;
          account_id: string;
          source: string;
          file_name: string;
          row_count: number;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id?: string;
          account_id: string;
          source: string;
          file_name: string;
          row_count?: number;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          account_id?: string;
          source?: string;
          file_name?: string;
          row_count?: number;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          household_id: string;
          account_id: string;
          kind: TransactionKind;
          amount: number;
          occurred_on: string;
          description: string;
          category_id: string | null;
          recurring_bill_id: string | null;
          reference_month: string | null;
          import_batch_id: string | null;
          external_id: string | null;
          transfer_group: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id?: string;
          account_id: string;
          kind: TransactionKind;
          amount: number;
          occurred_on: string;
          description: string;
          category_id?: string | null;
          recurring_bill_id?: string | null;
          reference_month?: string | null;
          import_batch_id?: string | null;
          external_id?: string | null;
          transfer_group?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          account_id?: string;
          kind?: TransactionKind;
          amount?: number;
          occurred_on?: string;
          description?: string;
          category_id?: string | null;
          recurring_bill_id?: string | null;
          reference_month?: string | null;
          import_batch_id?: string | null;
          external_id?: string | null;
          transfer_group?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      lanes: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          color: string | null;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id?: string;
          name: string;
          color?: string | null;
          position: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          name?: string;
          color?: string | null;
          position?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          household_id: string;
          lane_id: string;
          title: string;
          notes: string | null;
          position: number;
          assignee_id: string | null;
          due_on: string | null;
          done: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id?: string;
          lane_id: string;
          title: string;
          notes?: string | null;
          position: number;
          assignee_id?: string | null;
          due_on?: string | null;
          done?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          lane_id?: string;
          title?: string;
          notes?: string | null;
          position?: number;
          assignee_id?: string | null;
          due_on?: string | null;
          done?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      account_balances: {
        Row: {
          account_id: string;
          household_id: string;
          owner_id: string;
          balance: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      create_household: {
        Args: { p_name: string; p_display_name: string };
        Returns: string;
      };
      join_household: {
        Args: { p_invite_code: string; p_display_name: string };
        Returns: string;
      };
      create_transfer: {
        Args: {
          p_from_account: string;
          p_to_account: string;
          p_amount: number;
          p_occurred_on: string;
          p_description: string;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type AccountKind = "corrente" | "poupanca" | "cofrinho" | "carteira" | "investimento";
export type CategoryKind = "entrada" | "saida";
export type TransactionKind = "entrada" | "saida" | "transferencia" | "ajuste";

type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type Views<T extends keyof PublicSchema["Views"]> = PublicSchema["Views"][T]["Row"];
