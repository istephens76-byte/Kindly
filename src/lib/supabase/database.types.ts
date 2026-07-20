// Hand-written to match supabase/migrations/*.sql until a live project
// exists to generate this from (`supabase gen types typescript`).
// Regenerate from the real database once Phase 1 is deployed; keep this
// file's shape in sync with new migrations until then.

export type UserRole = "admin" | "recruiter";
export type ShellStatus = "draft" | "active";
export type TaxonomyKind = "reason" | "strength";
export type VacancySkillSource = "extracted" | "manual";

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
      company_profiles: {
        Row: {
          company_id: string;
          about: string;
          values: string;
          voice: string;
          sender_name: string;
          talent_link_url: string;
          updated_at: string;
        };
        Insert: {
          company_id: string;
          about?: string;
          values?: string;
          voice?: string;
          sender_name?: string;
          talent_link_url?: string;
          updated_at?: string;
        };
        Update: {
          company_id?: string;
          about?: string;
          values?: string;
          voice?: string;
          sender_name?: string;
          talent_link_url?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_profiles_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: true;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      shells: {
        Row: {
          id: string;
          company_id: string;
          version: number;
          warm_line: string;
          closing_active: string;
          closing_other: string;
          closing_no: string;
          talent_line: string;
          status: ShellStatus;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          version: number;
          warm_line: string;
          closing_active: string;
          closing_other: string;
          closing_no: string;
          talent_line: string;
          status?: ShellStatus;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          version?: number;
          warm_line?: string;
          closing_active?: string;
          closing_other?: string;
          closing_no?: string;
          talent_line?: string;
          status?: ShellStatus;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shells_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shells_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      taxonomies: {
        Row: {
          id: string;
          company_id: string;
          kind: TaxonomyKind;
          label: string;
          needs_skill: boolean;
          sort_order: number;
          archived: boolean;
        };
        Insert: {
          id?: string;
          company_id: string;
          kind: TaxonomyKind;
          label: string;
          needs_skill?: boolean;
          sort_order?: number;
          archived?: boolean;
        };
        Update: {
          id?: string;
          company_id?: string;
          kind?: TaxonomyKind;
          label?: string;
          needs_skill?: boolean;
          sort_order?: number;
          archived?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "taxonomies_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      vacancies: {
        Row: {
          id: string;
          company_id: string;
          title: string;
          jd_text: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          title: string;
          jd_text: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          title?: string;
          jd_text?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vacancies_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vacancies_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      vacancy_skills: {
        Row: {
          id: string;
          vacancy_id: string;
          label: string;
          source: VacancySkillSource;
          created_at: string;
        };
        Insert: {
          id?: string;
          vacancy_id: string;
          label: string;
          source: VacancySkillSource;
          created_at?: string;
        };
        Update: {
          id?: string;
          vacancy_id?: string;
          label?: string;
          source?: VacancySkillSource;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vacancy_skills_vacancy_id_fkey";
            columns: ["vacancy_id"];
            isOneToOne: false;
            referencedRelation: "vacancies";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      activate_shell: {
        Args: { p_shell_id: string };
        Returns: void;
      };
    };
  };
}
