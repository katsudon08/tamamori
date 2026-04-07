// This file is a placeholder until `npm run gen:types` can connect to Supabase.
// Manual type definitions based on docs/data-model.md.
// NOTE: When gen:types is available, this file will be auto-generated and
// the manual definitions below will be replaced.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string;
                    slack_user_id: string;
                    slack_team_id: string;
                    display_name: string;
                    avatar_url: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    slack_user_id: string;
                    slack_team_id: string;
                    display_name: string;
                    avatar_url?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    slack_user_id?: string;
                    slack_team_id?: string;
                    display_name?: string;
                    avatar_url?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'bonsai_user_id_fkey';
                        columns: ['id'];
                        isOneToOne: true;
                        referencedRelation: 'bonsai';
                        referencedColumns: ['user_id'];
                    },
                ];
            };
            bonsai: {
                Row: {
                    id: string;
                    user_id: string;
                    total_messages: number;
                    total_reactions: number;
                    total_thanks: number;
                    growth_stage: string;
                    visual_state: Json;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    total_messages?: number;
                    total_reactions?: number;
                    total_thanks?: number;
                    growth_stage?: string;
                    visual_state?: Json;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    total_messages?: number;
                    total_reactions?: number;
                    total_thanks?: number;
                    growth_stage?: string;
                    visual_state?: Json;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'bonsai_user_id_fkey';
                        columns: ['user_id'];
                        isOneToOne: true;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    },
                ];
            };
            action_log: {
                Row: {
                    id: string;
                    user_id: string;
                    action_type: string;
                    slack_event_id: string;
                    slack_channel: string | null;
                    metadata: Json;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    action_type: string;
                    slack_event_id: string;
                    slack_channel?: string | null;
                    metadata?: Json;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    action_type?: string;
                    slack_event_id?: string;
                    slack_channel?: string | null;
                    metadata?: Json;
                    created_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'action_log_user_id_fkey';
                        columns: ['user_id'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    },
                ];
            };
            growth_rules: {
                Row: {
                    id: string;
                    stage: string;
                    min_messages: number;
                    min_reactions: number;
                    min_thanks: number;
                    sort_order: number;
                };
                Insert: {
                    id?: string;
                    stage: string;
                    min_messages: number;
                    min_reactions: number;
                    min_thanks: number;
                    sort_order: number;
                };
                Update: {
                    id?: string;
                    stage?: string;
                    min_messages?: number;
                    min_reactions?: number;
                    min_thanks?: number;
                    sort_order?: number;
                };
                Relationships: [];
            };
        };
        Views: Record<string, never>;
        Functions: Record<string, never>;
        Enums: Record<string, never>;
        CompositeTypes: Record<string, never>;
    };
};
