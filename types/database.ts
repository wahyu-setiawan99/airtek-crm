/**
 * Placeholder until `pnpm db:types` runs against a linked Supabase project.
 * Demo mode uses the domain types in `types/crm.ts`.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: {
      pipeline_summary: {
        Args: { p_pipeline: string };
        Returns: {
          stage_id: string;
          stage_name: string;
          deal_count: number;
          total_value: number;
          weighted_value: number;
        }[];
      };
      move_deal: {
        Args: { p_deal: string; p_stage: string; p_position: number };
        Returns: undefined;
      };
    };
  };
};
