// Hand-written to match supabase/migrations/*.sql until a live project
// exists to generate this from (`supabase gen types typescript`).
// Regenerate from the real database once Phase 1 is deployed; keep this
// file's shape in sync with new migrations until then.

export type UserRole = "admin" | "recruiter";

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          plan: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          plan?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          plan?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          company_id: string;
          role: UserRole;
          display_name: string;
          email: string;
          created_at: string;
        };
        Insert: {
          id: string;
          company_id: string;
          role?: UserRole;
          display_name: string;
          email: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          role?: UserRole;
          display_name?: string;
          email?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "users_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
