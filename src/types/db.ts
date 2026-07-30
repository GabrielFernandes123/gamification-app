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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      _migrations: {
        Row: {
          applied_at: string
          name: string
        }
        Insert: {
          applied_at?: string
          name: string
        }
        Update: {
          applied_at?: string
          name?: string
        }
        Relationships: []
      }
      active_buffs: {
        Row: {
          buff_type: string
          created_at: string
          effect_value: number
          expires_at: string
          id: string
          user_id: string
        }
        Insert: {
          buff_type: string
          created_at?: string
          effect_value: number
          expires_at: string
          id?: string
          user_id: string
        }
        Update: {
          buff_type?: string
          created_at?: string
          effect_value?: number
          expires_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      assistant_messages: {
        Row: {
          content: Json
          created_at: string
          id: string
          model: string | null
          role: string
          seq: number
          thread_id: string
          tokens_in: number
          tokens_out: number
          tool_call_id: string | null
          tool_name: string | null
          user_id: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          model?: string | null
          role: string
          seq: number
          thread_id: string
          tokens_in?: number
          tokens_out?: number
          tool_call_id?: string | null
          tool_name?: string | null
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          model?: string | null
          role?: string
          seq?: number
          thread_id?: string
          tokens_in?: number
          tokens_out?: number
          tool_call_id?: string | null
          tool_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "assistant_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_pending_actions: {
        Row: {
          args: Json
          created_at: string
          id: string
          preview: string
          resolved_at: string | null
          result: Json | null
          status: string
          thread_id: string
          tool_call_id: string
          tool_name: string
          user_id: string
        }
        Insert: {
          args?: Json
          created_at?: string
          id?: string
          preview: string
          resolved_at?: string | null
          result?: Json | null
          status?: string
          thread_id: string
          tool_call_id: string
          tool_name: string
          user_id: string
        }
        Update: {
          args?: Json
          created_at?: string
          id?: string
          preview?: string
          resolved_at?: string | null
          result?: Json | null
          status?: string
          thread_id?: string
          tool_call_id?: string
          tool_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_pending_actions_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "assistant_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_threads: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      assistant_usage_daily: {
        Row: {
          day: string
          requests: number
          tokens_in: number
          tokens_out: number
          tool_calls: number
          updated_at: string
          user_id: string
        }
        Insert: {
          day: string
          requests?: number
          tokens_in?: number
          tokens_out?: number
          tool_calls?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          day?: string
          requests?: number
          tokens_in?: number
          tokens_out?: number
          tool_calls?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      body_alert_settings: {
        Row: {
          body_part_stale_days: number
          measurement_stale_days: number
          updated_at: string
          user_id: string
          workout_stale_days: number
        }
        Insert: {
          body_part_stale_days?: number
          measurement_stale_days?: number
          updated_at?: string
          user_id: string
          workout_stale_days?: number
        }
        Update: {
          body_part_stale_days?: number
          measurement_stale_days?: number
          updated_at?: string
          user_id?: string
          workout_stale_days?: number
        }
        Relationships: []
      }
      body_goals: {
        Row: {
          body_part_id: string | null
          completed_at: string | null
          created_at: string
          deadline: string | null
          difficulty: Database["public"]["Enums"]["difficulty"]
          exercise_id: string | null
          id: string
          is_manual: boolean
          media_url: string | null
          reward_gold: number | null
          reward_xp: number | null
          status: Database["public"]["Enums"]["body_goal_status"]
          target_direction: string
          target_metric: string | null
          target_reps: number | null
          target_value: number | null
          title: string
          type: Database["public"]["Enums"]["body_goal_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          body_part_id?: string | null
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty"]
          exercise_id?: string | null
          id?: string
          is_manual?: boolean
          media_url?: string | null
          reward_gold?: number | null
          reward_xp?: number | null
          status?: Database["public"]["Enums"]["body_goal_status"]
          target_direction?: string
          target_metric?: string | null
          target_reps?: number | null
          target_value?: number | null
          title: string
          type: Database["public"]["Enums"]["body_goal_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          body_part_id?: string | null
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty"]
          exercise_id?: string | null
          id?: string
          is_manual?: boolean
          media_url?: string | null
          reward_gold?: number | null
          reward_xp?: number | null
          status?: Database["public"]["Enums"]["body_goal_status"]
          target_direction?: string
          target_metric?: string | null
          target_reps?: number | null
          target_value?: number | null
          title?: string
          type?: Database["public"]["Enums"]["body_goal_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "body_goals_body_part_id_fkey"
            columns: ["body_part_id"]
            isOneToOne: false
            referencedRelation: "body_parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "body_goals_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "fitness_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      body_measurements: {
        Row: {
          body_fat_percent: number | null
          chest_cm: number | null
          created_at: string
          hip_cm: number | null
          icon_name: string | null
          id: string
          left_arm_cm: number | null
          left_thigh_cm: number | null
          measured_on: string
          media_url: string | null
          notes: string | null
          right_arm_cm: number | null
          right_thigh_cm: number | null
          user_id: string
          waist_cm: number | null
          weight_kg: number | null
        }
        Insert: {
          body_fat_percent?: number | null
          chest_cm?: number | null
          created_at?: string
          hip_cm?: number | null
          icon_name?: string | null
          id?: string
          left_arm_cm?: number | null
          left_thigh_cm?: number | null
          measured_on: string
          media_url?: string | null
          notes?: string | null
          right_arm_cm?: number | null
          right_thigh_cm?: number | null
          user_id: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Update: {
          body_fat_percent?: number | null
          chest_cm?: number | null
          created_at?: string
          hip_cm?: number | null
          icon_name?: string | null
          id?: string
          left_arm_cm?: number | null
          left_thigh_cm?: number | null
          measured_on?: string
          media_url?: string | null
          notes?: string | null
          right_arm_cm?: number | null
          right_thigh_cm?: number | null
          user_id?: string
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      body_parts: {
        Row: {
          attribute_key: Database["public"]["Enums"]["attribute_key"] | null
          color: string | null
          created_at: string
          icon_name: string | null
          id: string
          image_url: string | null
          is_active: boolean
          level: number | null
          media_url: string | null
          name: string
          needs_image: boolean
          updated_at: string
          user_id: string
          volume_coefficient: number
          xp: number
        }
        Insert: {
          attribute_key?: Database["public"]["Enums"]["attribute_key"] | null
          color?: string | null
          created_at?: string
          icon_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          level?: number | null
          media_url?: string | null
          name: string
          needs_image?: boolean
          updated_at?: string
          user_id: string
          volume_coefficient?: number
          xp?: number
        }
        Update: {
          attribute_key?: Database["public"]["Enums"]["attribute_key"] | null
          color?: string | null
          created_at?: string
          icon_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          level?: number | null
          media_url?: string | null
          name?: string
          needs_image?: boolean
          updated_at?: string
          user_id?: string
          volume_coefficient?: number
          xp?: number
        }
        Relationships: []
      }
      boss_charges: {
        Row: {
          amount: number
          season_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          season_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          season_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "boss_charges_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      boss_damage_events: {
        Row: {
          amount: number
          boss_id: string
          economy_event_id: string | null
          id: string
          occurred_at: string
          phase_id: string | null
          source_type: Database["public"]["Enums"]["economy_source_type"] | null
          user_id: string
          was_critical: boolean
          was_weakness: boolean
        }
        Insert: {
          amount: number
          boss_id: string
          economy_event_id?: string | null
          id?: string
          occurred_at?: string
          phase_id?: string | null
          source_type?:
            | Database["public"]["Enums"]["economy_source_type"]
            | null
          user_id: string
          was_critical?: boolean
          was_weakness?: boolean
        }
        Update: {
          amount?: number
          boss_id?: string
          economy_event_id?: string | null
          id?: string
          occurred_at?: string
          phase_id?: string | null
          source_type?:
            | Database["public"]["Enums"]["economy_source_type"]
            | null
          user_id?: string
          was_critical?: boolean
          was_weakness?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "boss_damage_events_boss_id_fkey"
            columns: ["boss_id"]
            isOneToOne: false
            referencedRelation: "bosses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boss_damage_events_economy_event_id_fkey"
            columns: ["economy_event_id"]
            isOneToOne: false
            referencedRelation: "economy_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boss_damage_events_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "boss_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      boss_objectives: {
        Row: {
          boss_damage: number
          boss_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          phase_id: string | null
          progress: number
          source_type: Database["public"]["Enums"]["economy_source_type"]
          spec: Json
          target: number
          title: string
          updated_at: string
        }
        Insert: {
          boss_damage?: number
          boss_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          phase_id?: string | null
          progress?: number
          source_type: Database["public"]["Enums"]["economy_source_type"]
          spec?: Json
          target: number
          title: string
          updated_at?: string
        }
        Update: {
          boss_damage?: number
          boss_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          phase_id?: string | null
          progress?: number
          source_type?: Database["public"]["Enums"]["economy_source_type"]
          spec?: Json
          target?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "boss_objectives_boss_id_fkey"
            columns: ["boss_id"]
            isOneToOne: false
            referencedRelation: "bosses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boss_objectives_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "boss_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      boss_phases: {
        Row: {
          boss_id: string
          created_at: string
          current_hp: number
          enrage_stage: number
          id: string
          max_hp: number
          month_index: number
          objectives_seeded: boolean
          sort_order: number
          status: Database["public"]["Enums"]["boss_phase_status"]
          unlock_on: string | null
          updated_at: string
        }
        Insert: {
          boss_id: string
          created_at?: string
          current_hp: number
          enrage_stage?: number
          id?: string
          max_hp: number
          month_index?: number
          objectives_seeded?: boolean
          sort_order: number
          status?: Database["public"]["Enums"]["boss_phase_status"]
          unlock_on?: string | null
          updated_at?: string
        }
        Update: {
          boss_id?: string
          created_at?: string
          current_hp?: number
          enrage_stage?: number
          id?: string
          max_hp?: number
          month_index?: number
          objectives_seeded?: boolean
          sort_order?: number
          status?: Database["public"]["Enums"]["boss_phase_status"]
          unlock_on?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "boss_phases_boss_id_fkey"
            columns: ["boss_id"]
            isOneToOne: false
            referencedRelation: "bosses"
            referencedColumns: ["id"]
          },
        ]
      }
      bosses: {
        Row: {
          attack_boss: number
          created_at: string
          current_hp: number
          death_count_at_start: number
          description: string | null
          id: string
          image_url: string | null
          last_resolved_day: string | null
          max_hp: number
          name: string
          needs_identity: boolean
          needs_image: boolean
          parent_boss_id: string | null
          phase_count: number
          rewards_claimed: boolean
          season_id: string
          status: Database["public"]["Enums"]["boss_status"]
          theme: string
          tier: Database["public"]["Enums"]["boss_tier"]
          updated_at: string
          user_id: string
          weakness_bonus: number
          weakness_module_key:
            | Database["public"]["Enums"]["economy_source_type"]
            | null
          window_end: string
          window_start: string
        }
        Insert: {
          attack_boss?: number
          created_at?: string
          current_hp: number
          death_count_at_start?: number
          description?: string | null
          id?: string
          image_url?: string | null
          last_resolved_day?: string | null
          max_hp: number
          name: string
          needs_identity?: boolean
          needs_image?: boolean
          parent_boss_id?: string | null
          phase_count?: number
          rewards_claimed?: boolean
          season_id: string
          status?: Database["public"]["Enums"]["boss_status"]
          theme?: string
          tier?: Database["public"]["Enums"]["boss_tier"]
          updated_at?: string
          user_id: string
          weakness_bonus?: number
          weakness_module_key?:
            | Database["public"]["Enums"]["economy_source_type"]
            | null
          window_end: string
          window_start: string
        }
        Update: {
          attack_boss?: number
          created_at?: string
          current_hp?: number
          death_count_at_start?: number
          description?: string | null
          id?: string
          image_url?: string | null
          last_resolved_day?: string | null
          max_hp?: number
          name?: string
          needs_identity?: boolean
          needs_image?: boolean
          parent_boss_id?: string | null
          phase_count?: number
          rewards_claimed?: boolean
          season_id?: string
          status?: Database["public"]["Enums"]["boss_status"]
          theme?: string
          tier?: Database["public"]["Enums"]["boss_tier"]
          updated_at?: string
          user_id?: string
          weakness_bonus?: number
          weakness_module_key?:
            | Database["public"]["Enums"]["economy_source_type"]
            | null
          window_end?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "bosses_parent_boss_id_fkey"
            columns: ["parent_boss_id"]
            isOneToOne: false
            referencedRelation: "bosses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bosses_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bosses_weakness_module_key_fkey"
            columns: ["weakness_module_key"]
            isOneToOne: false
            referencedRelation: "module_registry"
            referencedColumns: ["key"]
          },
        ]
      }
      character_attribute_point_grants: {
        Row: {
          allocated_points: number
          boss_id: string | null
          created_at: string
          id: string
          points: number
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allocated_points?: number
          boss_id?: string | null
          created_at?: string
          id?: string
          points: number
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allocated_points?: number
          boss_id?: string | null
          created_at?: string
          id?: string
          points?: number
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_attribute_point_grants_boss_id_fkey"
            columns: ["boss_id"]
            isOneToOne: false
            referencedRelation: "bosses"
            referencedColumns: ["id"]
          },
        ]
      }
      character_attribute_points: {
        Row: {
          attribute_key: Database["public"]["Enums"]["attribute_key"]
          created_at: string
          points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          attribute_key: Database["public"]["Enums"]["attribute_key"]
          created_at?: string
          points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          attribute_key?: Database["public"]["Enums"]["attribute_key"]
          created_at?: string
          points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      character_damage_events: {
        Row: {
          amount: number
          boss_id: string | null
          created_at: string
          direction: string
          habit_id: string | null
          id: string
          meta: Json
          occurred_on: string
          phase_id: string | null
          source: string
          user_id: string
        }
        Insert: {
          amount: number
          boss_id?: string | null
          created_at?: string
          direction?: string
          habit_id?: string | null
          id?: string
          meta?: Json
          occurred_on: string
          phase_id?: string | null
          source: string
          user_id: string
        }
        Update: {
          amount?: number
          boss_id?: string | null
          created_at?: string
          direction?: string
          habit_id?: string | null
          id?: string
          meta?: Json
          occurred_on?: string
          phase_id?: string | null
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_damage_events_boss_id_fkey"
            columns: ["boss_id"]
            isOneToOne: false
            referencedRelation: "bosses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_damage_events_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_damage_events_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "boss_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      character_equipment: {
        Row: {
          attribute_bonuses: Json
          catalog_id: string | null
          created_at: string
          id: string
          is_equipped: boolean
          name: string
          required_level: number
          slot: Database["public"]["Enums"]["equipment_slot"]
          source: Database["public"]["Enums"]["equipment_source"]
          updated_at: string
          user_id: string
        }
        Insert: {
          attribute_bonuses?: Json
          catalog_id?: string | null
          created_at?: string
          id?: string
          is_equipped?: boolean
          name: string
          required_level?: number
          slot: Database["public"]["Enums"]["equipment_slot"]
          source?: Database["public"]["Enums"]["equipment_source"]
          updated_at?: string
          user_id: string
        }
        Update: {
          attribute_bonuses?: Json
          catalog_id?: string | null
          created_at?: string
          id?: string
          is_equipped?: boolean
          name?: string
          required_level?: number
          slot?: Database["public"]["Enums"]["equipment_slot"]
          source?: Database["public"]["Enums"]["equipment_source"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_equipment_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "equipment_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      characters: {
        Row: {
          class: Database["public"]["Enums"]["character_class"] | null
          created_at: string
          current_hp: number
          daily_gold_goal: number
          daily_xp_goal: number
          death_count: number
          death_mode: string
          essencia: number
          gold: number
          id: string
          image_url: string | null
          last_reset_at: string | null
          level: number | null
          max_hp: number | null
          needs_image: boolean
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          class?: Database["public"]["Enums"]["character_class"] | null
          created_at?: string
          current_hp?: number
          daily_gold_goal?: number
          daily_xp_goal?: number
          death_count?: number
          death_mode?: string
          essencia?: number
          gold?: number
          id?: string
          image_url?: string | null
          last_reset_at?: string | null
          level?: number | null
          max_hp?: number | null
          needs_image?: boolean
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          class?: Database["public"]["Enums"]["character_class"] | null
          created_at?: string
          current_hp?: number
          daily_gold_goal?: number
          daily_xp_goal?: number
          death_count?: number
          death_mode?: string
          essencia?: number
          gold?: number
          id?: string
          image_url?: string | null
          last_reset_at?: string | null
          level?: number | null
          max_hp?: number | null
          needs_image?: boolean
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      codex_encounters: {
        Row: {
          beat_id: string | null
          created_at: string
          entry_id: string
          id: string
          meta: Json
          note: string | null
          occurred_on: string
          outcome: string
          period_key: string | null
          user_id: string
        }
        Insert: {
          beat_id?: string | null
          created_at?: string
          entry_id: string
          id?: string
          meta?: Json
          note?: string | null
          occurred_on: string
          outcome: string
          period_key?: string | null
          user_id: string
        }
        Update: {
          beat_id?: string | null
          created_at?: string
          entry_id?: string
          id?: string
          meta?: Json
          note?: string | null
          occurred_on?: string
          outcome?: string
          period_key?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "codex_encounters_beat_id_fkey"
            columns: ["beat_id"]
            isOneToOne: false
            referencedRelation: "narrative_beats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "codex_encounters_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "codex_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      codex_entries: {
        Row: {
          created_at: string
          epithet: string | null
          hunt_objective_id: string | null
          id: string
          image_url: string | null
          kind: string
          last_faced_on: string | null
          lore: string | null
          missions_since_escape: number
          name: string
          needs_image: boolean
          needs_story: boolean
          origin_id: string | null
          origin_type: string | null
          parent_entry_id: string | null
          season_id_at_birth: string | null
          spawned_by_boss_id: string | null
          standby_since: string | null
          status: string
          story_model: string | null
          times_defeated: number
          times_escaped: number
          times_faced: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          epithet?: string | null
          hunt_objective_id?: string | null
          id?: string
          image_url?: string | null
          kind: string
          last_faced_on?: string | null
          lore?: string | null
          missions_since_escape?: number
          name: string
          needs_image?: boolean
          needs_story?: boolean
          origin_id?: string | null
          origin_type?: string | null
          parent_entry_id?: string | null
          season_id_at_birth?: string | null
          spawned_by_boss_id?: string | null
          standby_since?: string | null
          status?: string
          story_model?: string | null
          times_defeated?: number
          times_escaped?: number
          times_faced?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          epithet?: string | null
          hunt_objective_id?: string | null
          id?: string
          image_url?: string | null
          kind?: string
          last_faced_on?: string | null
          lore?: string | null
          missions_since_escape?: number
          name?: string
          needs_image?: boolean
          needs_story?: boolean
          origin_id?: string | null
          origin_type?: string | null
          parent_entry_id?: string | null
          season_id_at_birth?: string | null
          spawned_by_boss_id?: string | null
          standby_since?: string | null
          status?: string
          story_model?: string | null
          times_defeated?: number
          times_escaped?: number
          times_faced?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "codex_entries_parent_entry_id_fkey"
            columns: ["parent_entry_id"]
            isOneToOne: false
            referencedRelation: "codex_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      composite_goals: {
        Row: {
          created_at: string
          description: string | null
          frequency: Database["public"]["Enums"]["objective_frequency"]
          id: string
          is_active: boolean
          metadata: Json
          name: string
          needs_story: boolean
          repeatable: boolean
          reward_item_kind:
            | Database["public"]["Enums"]["objective_reward_item_kind"]
            | null
          reward_quantity: number
          reward_system_item_id: string | null
          reward_user_item_id: string | null
          story_description: string | null
          story_model: string | null
          story_title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          frequency?: Database["public"]["Enums"]["objective_frequency"]
          id?: string
          is_active?: boolean
          metadata?: Json
          name: string
          needs_story?: boolean
          repeatable?: boolean
          reward_item_kind?:
            | Database["public"]["Enums"]["objective_reward_item_kind"]
            | null
          reward_quantity?: number
          reward_system_item_id?: string | null
          reward_user_item_id?: string | null
          story_description?: string | null
          story_model?: string | null
          story_title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          frequency?: Database["public"]["Enums"]["objective_frequency"]
          id?: string
          is_active?: boolean
          metadata?: Json
          name?: string
          needs_story?: boolean
          repeatable?: boolean
          reward_item_kind?:
            | Database["public"]["Enums"]["objective_reward_item_kind"]
            | null
          reward_quantity?: number
          reward_system_item_id?: string | null
          reward_user_item_id?: string | null
          story_description?: string | null
          story_model?: string | null
          story_title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "composite_goals_reward_system_item_id_fkey"
            columns: ["reward_system_item_id"]
            isOneToOne: false
            referencedRelation: "system_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "composite_goals_reward_user_item_id_fkey"
            columns: ["reward_user_item_id"]
            isOneToOne: false
            referencedRelation: "user_items"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_events: {
        Row: {
          chosen_key: string | null
          created_at: string
          day: string
          description: string
          id: string
          model: string | null
          options: Json
          outcome: Json | null
          resolved_at: string | null
          source: string
          title: string
          user_id: string
        }
        Insert: {
          chosen_key?: string | null
          created_at?: string
          day: string
          description: string
          id?: string
          model?: string | null
          options?: Json
          outcome?: Json | null
          resolved_at?: string | null
          source?: string
          title: string
          user_id: string
        }
        Update: {
          chosen_key?: string | null
          created_at?: string
          day?: string
          description?: string
          id?: string
          model?: string | null
          options?: Json
          outcome?: Json | null
          resolved_at?: string | null
          source?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      device_pairing_codes: {
        Row: {
          code: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          user_id: string
        }
        Insert: {
          code: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          user_id: string
        }
        Update: {
          code?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      devices: {
        Row: {
          created_at: string
          id: string
          ios_links: Json | null
          ios_links_at: string | null
          last_seen_at: string | null
          name: string
          platform: string
          protection: Json | null
          protection_at: string | null
          protection_ok_at: string | null
          revoked_at: string | null
          sabotage_fined_on: string | null
          token_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ios_links?: Json | null
          ios_links_at?: string | null
          last_seen_at?: string | null
          name: string
          platform: string
          protection?: Json | null
          protection_at?: string | null
          protection_ok_at?: string | null
          revoked_at?: string | null
          sabotage_fined_on?: string | null
          token_hash: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ios_links?: Json | null
          ios_links_at?: string | null
          last_seen_at?: string | null
          name?: string
          platform?: string
          protection?: Json | null
          protection_at?: string | null
          protection_ok_at?: string | null
          revoked_at?: string | null
          sabotage_fined_on?: string | null
          token_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      difficulty_levels: {
        Row: {
          damage_factor: number
          difficulty: Database["public"]["Enums"]["difficulty"]
          gold: number
          sort_order: number
          xp: number
        }
        Insert: {
          damage_factor: number
          difficulty: Database["public"]["Enums"]["difficulty"]
          gold: number
          sort_order: number
          xp: number
        }
        Update: {
          damage_factor?: number
          difficulty?: Database["public"]["Enums"]["difficulty"]
          gold?: number
          sort_order?: number
          xp?: number
        }
        Relationships: []
      }
      economy_events: {
        Row: {
          created_at: string
          essencia_delta: number
          gold_delta: number
          id: string
          meta: Json
          occurred_on: string
          source_id: string | null
          source_type: Database["public"]["Enums"]["economy_source_type"]
          user_id: string
          xp_delta: number
        }
        Insert: {
          created_at?: string
          essencia_delta?: number
          gold_delta?: number
          id?: string
          meta?: Json
          occurred_on: string
          source_id?: string | null
          source_type: Database["public"]["Enums"]["economy_source_type"]
          user_id: string
          xp_delta?: number
        }
        Update: {
          created_at?: string
          essencia_delta?: number
          gold_delta?: number
          id?: string
          meta?: Json
          occurred_on?: string
          source_id?: string | null
          source_type?: Database["public"]["Enums"]["economy_source_type"]
          user_id?: string
          xp_delta?: number
        }
        Relationships: []
      }
      equipment_catalog: {
        Row: {
          attribute_bonuses: Json
          cost_essencia: number | null
          cost_gold: number | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          needs_image: boolean
          needs_story: boolean
          required_level: number
          slot: Database["public"]["Enums"]["equipment_slot"]
          sort_order: number
          story_description: string | null
          story_model: string | null
          story_title: string | null
          tier_origem: Database["public"]["Enums"]["equipment_tier"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          attribute_bonuses?: Json
          cost_essencia?: number | null
          cost_gold?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          needs_image?: boolean
          needs_story?: boolean
          required_level?: number
          slot: Database["public"]["Enums"]["equipment_slot"]
          sort_order?: number
          story_description?: string | null
          story_model?: string | null
          story_title?: string | null
          tier_origem?: Database["public"]["Enums"]["equipment_tier"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          attribute_bonuses?: Json
          cost_essencia?: number | null
          cost_gold?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          needs_image?: boolean
          needs_story?: boolean
          required_level?: number
          slot?: Database["public"]["Enums"]["equipment_slot"]
          sort_order?: number
          story_description?: string | null
          story_model?: string | null
          story_title?: string | null
          tier_origem?: Database["public"]["Enums"]["equipment_tier"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      exercise_catalog: {
        Row: {
          attribution: string | null
          category: string | null
          created_at: string
          equipment: string | null
          external_id: string
          gif_url: string | null
          id: string
          image_url: string | null
          instructions: Json
          name: string
          name_pt: string | null
          secondary_muscles: Json
          target: string | null
        }
        Insert: {
          attribution?: string | null
          category?: string | null
          created_at?: string
          equipment?: string | null
          external_id: string
          gif_url?: string | null
          id?: string
          image_url?: string | null
          instructions?: Json
          name: string
          name_pt?: string | null
          secondary_muscles?: Json
          target?: string | null
        }
        Update: {
          attribution?: string | null
          category?: string | null
          created_at?: string
          equipment?: string | null
          external_id?: string
          gif_url?: string | null
          id?: string
          image_url?: string | null
          instructions?: Json
          name?: string
          name_pt?: string | null
          secondary_muscles?: Json
          target?: string | null
        }
        Relationships: []
      }
      fitness_exercises: {
        Row: {
          catalog_id: string | null
          created_at: string
          equipment: string | null
          id: string
          instructions: string | null
          is_active: boolean
          media_url: string | null
          name: string
          primary_body_part_id: string | null
          primary_skill_id: string | null
          secondary_body_part_id: string | null
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          catalog_id?: string | null
          created_at?: string
          equipment?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean
          media_url?: string | null
          name: string
          primary_body_part_id?: string | null
          primary_skill_id?: string | null
          secondary_body_part_id?: string | null
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          catalog_id?: string | null
          created_at?: string
          equipment?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean
          media_url?: string | null
          name?: string
          primary_body_part_id?: string | null
          primary_skill_id?: string | null
          secondary_body_part_id?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fitness_exercises_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "exercise_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fitness_exercises_primary_body_part_id_fkey"
            columns: ["primary_body_part_id"]
            isOneToOne: false
            referencedRelation: "body_parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fitness_exercises_primary_skill_id_fkey"
            columns: ["primary_skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fitness_exercises_secondary_body_part_id_fkey"
            columns: ["secondary_body_part_id"]
            isOneToOne: false
            referencedRelation: "body_parts"
            referencedColumns: ["id"]
          },
        ]
      }
      focus_sessions: {
        Row: {
          abandon_cost_gold: number
          closed_at: string | null
          created_at: string
          ends_at: string
          id: string
          reward_gold: number
          set_id: string | null
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          abandon_cost_gold?: number
          closed_at?: string | null
          created_at?: string
          ends_at: string
          id?: string
          reward_gold?: number
          set_id?: string | null
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          abandon_cost_gold?: number
          closed_at?: string | null
          created_at?: string
          ends_at?: string
          id?: string
          reward_gold?: number
          set_id?: string | null
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "focus_sessions_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "tracking_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_images: {
        Row: {
          attempts: number
          cost_usd: number | null
          created_at: string
          error: string | null
          family: string
          id: string
          kind: string
          model: string | null
          owner_id: string | null
          owner_table: string
          prompt: Json
          prompt_hash: string | null
          status: string
          updated_at: string
          url: string | null
          user_id: string | null
        }
        Insert: {
          attempts?: number
          cost_usd?: number | null
          created_at?: string
          error?: string | null
          family?: string
          id?: string
          kind: string
          model?: string | null
          owner_id?: string | null
          owner_table: string
          prompt?: Json
          prompt_hash?: string | null
          status?: string
          updated_at?: string
          url?: string | null
          user_id?: string | null
        }
        Update: {
          attempts?: number
          cost_usd?: number | null
          created_at?: string
          error?: string | null
          family?: string
          id?: string
          kind?: string
          model?: string | null
          owner_id?: string | null
          owner_table?: string
          prompt?: Json
          prompt_hash?: string | null
          status?: string
          updated_at?: string
          url?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      habit_levels: {
        Row: {
          change_reason: string
          created_at: string
          difficulty: Database["public"]["Enums"]["difficulty"]
          effective_from: string
          effective_to: string | null
          executions_per_day: number
          habit_id: string
          id: string
          level_number: number
          monthly_target: number | null
          primary_skill_id: string | null
          schedule: Database["public"]["Enums"]["schedule_type"]
          secondary_skill_id: string | null
          type: Database["public"]["Enums"]["habit_type"]
          user_id: string
          weekdays: number[] | null
          weekly_target: number | null
        }
        Insert: {
          change_reason?: string
          created_at?: string
          difficulty: Database["public"]["Enums"]["difficulty"]
          effective_from: string
          effective_to?: string | null
          executions_per_day: number
          habit_id: string
          id?: string
          level_number: number
          monthly_target?: number | null
          primary_skill_id?: string | null
          schedule: Database["public"]["Enums"]["schedule_type"]
          secondary_skill_id?: string | null
          type: Database["public"]["Enums"]["habit_type"]
          user_id: string
          weekdays?: number[] | null
          weekly_target?: number | null
        }
        Update: {
          change_reason?: string
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty"]
          effective_from?: string
          effective_to?: string | null
          executions_per_day?: number
          habit_id?: string
          id?: string
          level_number?: number
          monthly_target?: number | null
          primary_skill_id?: string | null
          schedule?: Database["public"]["Enums"]["schedule_type"]
          secondary_skill_id?: string | null
          type?: Database["public"]["Enums"]["habit_type"]
          user_id?: string
          weekdays?: number[] | null
          weekly_target?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "habit_levels_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habit_levels_primary_skill_id_fkey"
            columns: ["primary_skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habit_levels_secondary_skill_id_fkey"
            columns: ["secondary_skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_logs: {
        Row: {
          caused_death: boolean
          created_at: string
          damage_taken: number
          gold_gained: number
          habit_id: string
          id: string
          is_auto: boolean
          logged_at: string
          occurred_on: string
          streak_at_log: number
          success: boolean
          user_id: string
          xp_gained: number
        }
        Insert: {
          caused_death?: boolean
          created_at?: string
          damage_taken?: number
          gold_gained?: number
          habit_id: string
          id?: string
          is_auto?: boolean
          logged_at?: string
          occurred_on: string
          streak_at_log?: number
          success: boolean
          user_id: string
          xp_gained?: number
        }
        Update: {
          caused_death?: boolean
          created_at?: string
          damage_taken?: number
          gold_gained?: number
          habit_id?: string
          id?: string
          is_auto?: boolean
          logged_at?: string
          occurred_on?: string
          streak_at_log?: number
          success?: boolean
          user_id?: string
          xp_gained?: number
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_suggestions: {
        Row: {
          ai_model: string | null
          ai_summary: string | null
          alternatives: Json
          created_at: string
          decided_at: string | null
          deterministic_summary: string | null
          diagnosis: string
          habit_id: string
          habit_level_id: string | null
          id: string
          metrics: Json
          primary_action: Json
          status: Database["public"]["Enums"]["habit_suggestion_status"]
          user_id: string
        }
        Insert: {
          ai_model?: string | null
          ai_summary?: string | null
          alternatives?: Json
          created_at?: string
          decided_at?: string | null
          deterministic_summary?: string | null
          diagnosis: string
          habit_id: string
          habit_level_id?: string | null
          id?: string
          metrics?: Json
          primary_action: Json
          status?: Database["public"]["Enums"]["habit_suggestion_status"]
          user_id: string
        }
        Update: {
          ai_model?: string | null
          ai_summary?: string | null
          alternatives?: Json
          created_at?: string
          decided_at?: string | null
          deterministic_summary?: string | null
          diagnosis?: string
          habit_id?: string
          habit_level_id?: string | null
          id?: string
          metrics?: Json
          primary_action?: Json
          status?: Database["public"]["Enums"]["habit_suggestion_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_suggestions_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habit_suggestions_habit_level_id_fkey"
            columns: ["habit_level_id"]
            isOneToOne: false
            referencedRelation: "habit_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          best_streak: number
          created_at: string
          current_streak: number
          description: string | null
          difficulty: Database["public"]["Enums"]["difficulty"]
          executions_per_day: number
          id: string
          is_active: boolean
          last_period_close: string | null
          last_streak: number
          monthly_target: number | null
          name: string
          needs_story: boolean
          primary_skill_id: string | null
          reminder_times: string[]
          schedule: Database["public"]["Enums"]["schedule_type"]
          secondary_skill_id: string | null
          story_description: string | null
          story_model: string | null
          story_title: string | null
          type: Database["public"]["Enums"]["habit_type"]
          updated_at: string
          user_id: string
          weekdays: number[] | null
          weekly_target: number | null
        }
        Insert: {
          best_streak?: number
          created_at?: string
          current_streak?: number
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty"]
          executions_per_day?: number
          id?: string
          is_active?: boolean
          last_period_close?: string | null
          last_streak?: number
          monthly_target?: number | null
          name: string
          needs_story?: boolean
          primary_skill_id?: string | null
          reminder_times?: string[]
          schedule: Database["public"]["Enums"]["schedule_type"]
          secondary_skill_id?: string | null
          story_description?: string | null
          story_model?: string | null
          story_title?: string | null
          type: Database["public"]["Enums"]["habit_type"]
          updated_at?: string
          user_id: string
          weekdays?: number[] | null
          weekly_target?: number | null
        }
        Update: {
          best_streak?: number
          created_at?: string
          current_streak?: number
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty"]
          executions_per_day?: number
          id?: string
          is_active?: boolean
          last_period_close?: string | null
          last_streak?: number
          monthly_target?: number | null
          name?: string
          needs_story?: boolean
          primary_skill_id?: string | null
          reminder_times?: string[]
          schedule?: Database["public"]["Enums"]["schedule_type"]
          secondary_skill_id?: string | null
          story_description?: string | null
          story_model?: string | null
          story_title?: string | null
          type?: Database["public"]["Enums"]["habit_type"]
          updated_at?: string
          user_id?: string
          weekdays?: number[] | null
          weekly_target?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "habits_primary_skill_id_fkey"
            columns: ["primary_skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habits_secondary_skill_id_fkey"
            columns: ["secondary_skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          created_at: string
          id: string
          quantity_delta: number
          reason: string
          source_id: string | null
          source_type: string | null
          system_item_id: string | null
          user_id: string
          user_item_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          quantity_delta: number
          reason: string
          source_id?: string | null
          source_type?: string | null
          system_item_id?: string | null
          user_id: string
          user_item_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          quantity_delta?: number
          reason?: string
          source_id?: string | null
          source_type?: string | null
          system_item_id?: string | null
          user_id?: string
          user_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_system_item_id_fkey"
            columns: ["system_item_id"]
            isOneToOne: false
            referencedRelation: "system_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_user_item_id_fkey"
            columns: ["user_item_id"]
            isOneToOne: false
            referencedRelation: "user_items"
            referencedColumns: ["id"]
          },
        ]
      }
      module_registry: {
        Row: {
          ativo: boolean
          cor: string
          icone: string
          key: Database["public"]["Enums"]["economy_source_type"]
          kind: Database["public"]["Enums"]["module_kind"]
          nome: string
          ordem: number
        }
        Insert: {
          ativo?: boolean
          cor: string
          icone: string
          key: Database["public"]["Enums"]["economy_source_type"]
          kind: Database["public"]["Enums"]["module_kind"]
          nome: string
          ordem: number
        }
        Update: {
          ativo?: boolean
          cor?: string
          icone?: string
          key?: Database["public"]["Enums"]["economy_source_type"]
          kind?: Database["public"]["Enums"]["module_kind"]
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      narrative_beats: {
        Row: {
          boss_id: string | null
          content: string
          created_at: string
          id: string
          image_url: string | null
          kind: string
          layer: number
          meta: Json
          needs_image: boolean
          needs_narration: boolean
          season_id: string
          title: string | null
          user_id: string
        }
        Insert: {
          boss_id?: string | null
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          kind: string
          layer?: number
          meta?: Json
          needs_image?: boolean
          needs_narration?: boolean
          season_id: string
          title?: string | null
          user_id: string
        }
        Update: {
          boss_id?: string | null
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          kind?: string
          layer?: number
          meta?: Json
          needs_image?: boolean
          needs_narration?: boolean
          season_id?: string
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "narrative_beats_boss_id_fkey"
            columns: ["boss_id"]
            isOneToOne: false
            referencedRelation: "bosses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "narrative_beats_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      narrative_generation_jobs: {
        Row: {
          attempts: number
          boss_id: string | null
          created_at: string
          error: string | null
          id: string
          layer: number
          model: string | null
          output: Json | null
          prompt: Json
          season_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          boss_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          layer: number
          model?: string | null
          output?: Json | null
          prompt?: Json
          season_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          boss_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          layer?: number
          model?: string | null
          output?: Json | null
          prompt?: Json
          season_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "narrative_generation_jobs_boss_id_fkey"
            columns: ["boss_id"]
            isOneToOne: false
            referencedRelation: "bosses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "narrative_generation_jobs_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      objective_claims: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          owner_type: Database["public"]["Enums"]["requirement_owner_type"]
          period_key: string
          reward_item_kind:
            | Database["public"]["Enums"]["objective_reward_item_kind"]
            | null
          reward_quantity: number
          reward_system_item_id: string | null
          reward_user_item_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          owner_type: Database["public"]["Enums"]["requirement_owner_type"]
          period_key: string
          reward_item_kind?:
            | Database["public"]["Enums"]["objective_reward_item_kind"]
            | null
          reward_quantity?: number
          reward_system_item_id?: string | null
          reward_user_item_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          owner_type?: Database["public"]["Enums"]["requirement_owner_type"]
          period_key?: string
          reward_item_kind?:
            | Database["public"]["Enums"]["objective_reward_item_kind"]
            | null
          reward_quantity?: number
          reward_system_item_id?: string | null
          reward_user_item_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "objective_claims_reward_system_item_id_fkey"
            columns: ["reward_system_item_id"]
            isOneToOne: false
            referencedRelation: "system_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objective_claims_reward_user_item_id_fkey"
            columns: ["reward_user_item_id"]
            isOneToOne: false
            referencedRelation: "user_items"
            referencedColumns: ["id"]
          },
        ]
      }
      objective_period_results: {
        Row: {
          claimed: boolean
          created_at: string
          evaluated_on: string
          id: string
          owner_id: string
          owner_type: Database["public"]["Enums"]["requirement_owner_type"]
          passed: boolean
          period_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          claimed?: boolean
          created_at?: string
          evaluated_on: string
          id?: string
          owner_id: string
          owner_type: Database["public"]["Enums"]["requirement_owner_type"]
          passed: boolean
          period_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          claimed?: boolean
          created_at?: string
          evaluated_on?: string
          id?: string
          owner_id?: string
          owner_type?: Database["public"]["Enums"]["requirement_owner_type"]
          passed?: boolean
          period_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      objective_suggestions: {
        Row: {
          ai_error: string | null
          ai_model: string | null
          ai_status: string
          ai_summary: string | null
          analytics: Json
          created_at: string
          decided_at: string | null
          diagnosis: string
          id: string
          rationale: string | null
          status: Database["public"]["Enums"]["objective_suggestion_status"]
          suggested_objective: Json
          suggested_requirements: Json
          suggestion_type: Database["public"]["Enums"]["objective_suggestion_type"]
          summary: string
          title: string
          user_id: string
        }
        Insert: {
          ai_error?: string | null
          ai_model?: string | null
          ai_status?: string
          ai_summary?: string | null
          analytics?: Json
          created_at?: string
          decided_at?: string | null
          diagnosis: string
          id?: string
          rationale?: string | null
          status?: Database["public"]["Enums"]["objective_suggestion_status"]
          suggested_objective: Json
          suggested_requirements?: Json
          suggestion_type: Database["public"]["Enums"]["objective_suggestion_type"]
          summary: string
          title: string
          user_id: string
        }
        Update: {
          ai_error?: string | null
          ai_model?: string | null
          ai_status?: string
          ai_summary?: string | null
          analytics?: Json
          created_at?: string
          decided_at?: string | null
          diagnosis?: string
          id?: string
          rationale?: string | null
          status?: Database["public"]["Enums"]["objective_suggestion_status"]
          suggested_objective?: Json
          suggested_requirements?: Json
          suggestion_type?: Database["public"]["Enums"]["objective_suggestion_type"]
          summary?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          last_summary_at: string
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          last_summary_at?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_summary_at?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          essencia_spent: number | null
          gold_spent: number
          id: string
          kind: string
          name: string
          purchased_at: string
          reference_id: string
          user_id: string
        }
        Insert: {
          essencia_spent?: number | null
          gold_spent: number
          id?: string
          kind: string
          name: string
          purchased_at?: string
          reference_id: string
          user_id: string
        }
        Update: {
          essencia_spent?: number | null
          gold_spent?: number
          id?: string
          kind?: string
          name?: string
          purchased_at?: string
          reference_id?: string
          user_id?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          platform?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      requirement_groups: {
        Row: {
          created_at: string
          ends_on: string | null
          id: string
          mode: Database["public"]["Enums"]["requirement_group_mode"]
          owner_id: string
          owner_type: Database["public"]["Enums"]["requirement_owner_type"]
          required_count: number | null
          starts_on: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          ends_on?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["requirement_group_mode"]
          owner_id: string
          owner_type: Database["public"]["Enums"]["requirement_owner_type"]
          required_count?: number | null
          starts_on?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          ends_on?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["requirement_group_mode"]
          owner_id?: string
          owner_type?: Database["public"]["Enums"]["requirement_owner_type"]
          required_count?: number | null
          starts_on?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      requirements: {
        Row: {
          created_at: string
          custom_end: string | null
          custom_start: string | null
          group_id: string
          id: string
          metric: Database["public"]["Enums"]["requirement_metric"]
          operator: Database["public"]["Enums"]["requirement_operator"]
          params: Json
          period_scope: Database["public"]["Enums"]["requirement_period_scope"]
          reference_id: string | null
          reference_kind: string | null
          sort_order: number
          source_type: Database["public"]["Enums"]["requirement_source_type"]
          target_value: number
        }
        Insert: {
          created_at?: string
          custom_end?: string | null
          custom_start?: string | null
          group_id: string
          id?: string
          metric: Database["public"]["Enums"]["requirement_metric"]
          operator?: Database["public"]["Enums"]["requirement_operator"]
          params?: Json
          period_scope?: Database["public"]["Enums"]["requirement_period_scope"]
          reference_id?: string | null
          reference_kind?: string | null
          sort_order?: number
          source_type: Database["public"]["Enums"]["requirement_source_type"]
          target_value: number
        }
        Update: {
          created_at?: string
          custom_end?: string | null
          custom_start?: string | null
          group_id?: string
          id?: string
          metric?: Database["public"]["Enums"]["requirement_metric"]
          operator?: Database["public"]["Enums"]["requirement_operator"]
          params?: Json
          period_scope?: Database["public"]["Enums"]["requirement_period_scope"]
          reference_id?: string | null
          reference_kind?: string | null
          sort_order?: number
          source_type?: Database["public"]["Enums"]["requirement_source_type"]
          target_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "requirements_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "requirement_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          cooldown_minutes: number | null
          cost: number
          cost_essencia: number | null
          created_at: string
          current_stock: number | null
          description: string | null
          has_stock: boolean
          id: string
          is_active: boolean
          is_repurchasable: boolean
          last_purchased_at: string | null
          max_stock: number | null
          name: string
          requirements_enabled: boolean
          unlocked_by_boss_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cooldown_minutes?: number | null
          cost: number
          cost_essencia?: number | null
          created_at?: string
          current_stock?: number | null
          description?: string | null
          has_stock?: boolean
          id?: string
          is_active?: boolean
          is_repurchasable?: boolean
          last_purchased_at?: string | null
          max_stock?: number | null
          name: string
          requirements_enabled?: boolean
          unlocked_by_boss_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cooldown_minutes?: number | null
          cost?: number
          cost_essencia?: number | null
          created_at?: string
          current_stock?: number | null
          description?: string | null
          has_stock?: boolean
          id?: string
          is_active?: boolean
          is_repurchasable?: boolean
          last_purchased_at?: string | null
          max_stock?: number | null
          name?: string
          requirements_enabled?: boolean
          unlocked_by_boss_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rewards_unlocked_by_boss_id_fkey"
            columns: ["unlocked_by_boss_id"]
            isOneToOne: false
            referencedRelation: "bosses"
            referencedColumns: ["id"]
          },
        ]
      }
      season_story_settings: {
        Row: {
          ai_enabled: boolean
          ai_images_enabled: boolean
          created_at: string
          ends_on: string | null
          id: string
          preset: string
          season_id: string
          starts_on: string | null
          theme_seed: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_enabled?: boolean
          ai_images_enabled?: boolean
          created_at?: string
          ends_on?: string | null
          id?: string
          preset?: string
          season_id: string
          starts_on?: string | null
          theme_seed?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_enabled?: boolean
          ai_images_enabled?: boolean
          created_at?: string
          ends_on?: string | null
          id?: string
          preset?: string
          season_id?: string
          starts_on?: string | null
          theme_seed?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_story_settings_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: true
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          arc_lore: string | null
          created_at: string
          ends_on: string
          id: string
          image_url: string | null
          lore: string | null
          name: string
          needs_image: boolean
          preset: string
          starts_on: string
          status: Database["public"]["Enums"]["season_status"]
          theme_seed: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          arc_lore?: string | null
          created_at?: string
          ends_on: string
          id?: string
          image_url?: string | null
          lore?: string | null
          name: string
          needs_image?: boolean
          preset?: string
          starts_on: string
          status?: Database["public"]["Enums"]["season_status"]
          theme_seed?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          arc_lore?: string | null
          created_at?: string
          ends_on?: string
          id?: string
          image_url?: string | null
          lore?: string | null
          name?: string
          needs_image?: boolean
          preset?: string
          starts_on?: string
          status?: Database["public"]["Enums"]["season_status"]
          theme_seed?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      side_quests: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          difficulty: Database["public"]["Enums"]["difficulty"]
          due_date: string | null
          gold_gained: number | null
          id: string
          is_completed: boolean
          name: string
          needs_story: boolean
          primary_skill_id: string | null
          secondary_skill_id: string | null
          story_description: string | null
          story_model: string | null
          story_title: string | null
          updated_at: string
          user_id: string
          xp_gained: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty"]
          due_date?: string | null
          gold_gained?: number | null
          id?: string
          is_completed?: boolean
          name: string
          needs_story?: boolean
          primary_skill_id?: string | null
          secondary_skill_id?: string | null
          story_description?: string | null
          story_model?: string | null
          story_title?: string | null
          updated_at?: string
          user_id: string
          xp_gained?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty"]
          due_date?: string | null
          gold_gained?: number | null
          id?: string
          is_completed?: boolean
          name?: string
          needs_story?: boolean
          primary_skill_id?: string | null
          secondary_skill_id?: string | null
          story_description?: string | null
          story_model?: string | null
          story_title?: string | null
          updated_at?: string
          user_id?: string
          xp_gained?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "side_quests_primary_skill_id_fkey"
            columns: ["primary_skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "side_quests_secondary_skill_id_fkey"
            columns: ["secondary_skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          attribute_key: Database["public"]["Enums"]["attribute_key"] | null
          color: string | null
          created_at: string
          description: string | null
          icon_name: string | null
          id: string
          image_url: string | null
          level: number | null
          name: string
          needs_image: boolean
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          attribute_key?: Database["public"]["Enums"]["attribute_key"] | null
          color?: string | null
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          image_url?: string | null
          level?: number | null
          name: string
          needs_image?: boolean
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          attribute_key?: Database["public"]["Enums"]["attribute_key"] | null
          color?: string | null
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          image_url?: string | null
          level?: number | null
          name?: string
          needs_image?: boolean
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      sleep_logs: {
        Row: {
          bedtime: string
          created_at: string
          criteria_met: Json
          duration_minutes: number
          external_id: string | null
          id: string
          night_on: string
          source: string
          user_id: string
          wake_time: string
        }
        Insert: {
          bedtime: string
          created_at?: string
          criteria_met?: Json
          duration_minutes: number
          external_id?: string | null
          id?: string
          night_on: string
          source?: string
          user_id: string
          wake_time: string
        }
        Update: {
          bedtime?: string
          created_at?: string
          criteria_met?: Json
          duration_minutes?: number
          external_id?: string | null
          id?: string
          night_on?: string
          source?: string
          user_id?: string
          wake_time?: string
        }
        Relationships: []
      }
      sleep_settings: {
        Row: {
          bedtime_enabled: boolean
          bedtime_max: string
          difficulty: Database["public"]["Enums"]["difficulty"]
          min_duration_enabled: boolean
          min_minutes: number
          updated_at: string
          user_id: string
          wake_enabled: boolean
          wake_max: string
        }
        Insert: {
          bedtime_enabled?: boolean
          bedtime_max?: string
          difficulty?: Database["public"]["Enums"]["difficulty"]
          min_duration_enabled?: boolean
          min_minutes?: number
          updated_at?: string
          user_id: string
          wake_enabled?: boolean
          wake_max?: string
        }
        Update: {
          bedtime_enabled?: boolean
          bedtime_max?: string
          difficulty?: Database["public"]["Enums"]["difficulty"]
          min_duration_enabled?: boolean
          min_minutes?: number
          updated_at?: string
          user_id?: string
          wake_enabled?: boolean
          wake_max?: string
        }
        Relationships: []
      }
      system_items: {
        Row: {
          cost: number
          description: string
          effect_value: number
          id: string
          is_active: boolean
          name: string
          sort_order: number
          type: Database["public"]["Enums"]["system_item_type"]
        }
        Insert: {
          cost: number
          description: string
          effect_value: number
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          type: Database["public"]["Enums"]["system_item_type"]
        }
        Update: {
          cost?: number
          description?: string
          effect_value?: number
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          type?: Database["public"]["Enums"]["system_item_type"]
        }
        Relationships: []
      }
      temporary_challenges: {
        Row: {
          created_at: string
          description: string | null
          ends_on: string
          id: string
          is_active: boolean
          metadata: Json
          name: string
          needs_story: boolean
          repeatable: boolean
          resolved_at: string | null
          reward_item_kind:
            | Database["public"]["Enums"]["objective_reward_item_kind"]
            | null
          reward_quantity: number
          reward_system_item_id: string | null
          reward_user_item_id: string | null
          starts_on: string
          status: string
          story_description: string | null
          story_model: string | null
          story_title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          ends_on: string
          id?: string
          is_active?: boolean
          metadata?: Json
          name: string
          needs_story?: boolean
          repeatable?: boolean
          resolved_at?: string | null
          reward_item_kind?:
            | Database["public"]["Enums"]["objective_reward_item_kind"]
            | null
          reward_quantity?: number
          reward_system_item_id?: string | null
          reward_user_item_id?: string | null
          starts_on: string
          status?: string
          story_description?: string | null
          story_model?: string | null
          story_title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          ends_on?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          name?: string
          needs_story?: boolean
          repeatable?: boolean
          resolved_at?: string | null
          reward_item_kind?:
            | Database["public"]["Enums"]["objective_reward_item_kind"]
            | null
          reward_quantity?: number
          reward_system_item_id?: string | null
          reward_user_item_id?: string | null
          starts_on?: string
          status?: string
          story_description?: string | null
          story_model?: string | null
          story_title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "temporary_challenges_reward_system_item_id_fkey"
            columns: ["reward_system_item_id"]
            isOneToOne: false
            referencedRelation: "system_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temporary_challenges_reward_user_item_id_fkey"
            columns: ["reward_user_item_id"]
            isOneToOne: false
            referencedRelation: "user_items"
            referencedColumns: ["id"]
          },
        ]
      }
      tracked_source_day_overrides: {
        Row: {
          block_after_seconds: number | null
          boss_threshold_seconds: number | null
          daily_free_seconds: number | null
          gold_per_hour: number | null
          source_id: string
          updated_at: string
          weekday: number
        }
        Insert: {
          block_after_seconds?: number | null
          boss_threshold_seconds?: number | null
          daily_free_seconds?: number | null
          gold_per_hour?: number | null
          source_id: string
          updated_at?: string
          weekday: number
        }
        Update: {
          block_after_seconds?: number | null
          boss_threshold_seconds?: number | null
          daily_free_seconds?: number | null
          gold_per_hour?: number | null
          source_id?: string
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "tracked_source_day_overrides_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "tracked_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      tracked_sources: {
        Row: {
          block_after_seconds: number | null
          boss_threshold_seconds: number | null
          charge_mode: string
          created_at: string
          daily_bonus_gold: number
          daily_free_seconds: number
          gold_per_hour: number
          hp_per_hour: number
          id: string
          ios_measure: string
          is_active: boolean
          kind: string
          label: string
          matcher: string
          unlock_cooldown_minutes: number | null
          unlock_cost_gold: number
          unlock_minutes: number
          unlock_price_cap_mult: number | null
          unlock_price_step_pct: number | null
          user_id: string
        }
        Insert: {
          block_after_seconds?: number | null
          boss_threshold_seconds?: number | null
          charge_mode?: string
          created_at?: string
          daily_bonus_gold?: number
          daily_free_seconds?: number
          gold_per_hour?: number
          hp_per_hour?: number
          id?: string
          ios_measure?: string
          is_active?: boolean
          kind: string
          label: string
          matcher: string
          unlock_cooldown_minutes?: number | null
          unlock_cost_gold?: number
          unlock_minutes?: number
          unlock_price_cap_mult?: number | null
          unlock_price_step_pct?: number | null
          user_id: string
        }
        Update: {
          block_after_seconds?: number | null
          boss_threshold_seconds?: number | null
          charge_mode?: string
          created_at?: string
          daily_bonus_gold?: number
          daily_free_seconds?: number
          gold_per_hour?: number
          hp_per_hour?: number
          id?: string
          ios_measure?: string
          is_active?: boolean
          kind?: string
          label?: string
          matcher?: string
          unlock_cooldown_minutes?: number | null
          unlock_cost_gold?: number
          unlock_minutes?: number
          unlock_price_cap_mult?: number | null
          unlock_price_step_pct?: number | null
          user_id?: string
        }
        Relationships: []
      }
      tracking_blocked_keywords: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          phrase: string
          unlock_cost_gold: number
          unlock_minutes: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          phrase: string
          unlock_cost_gold?: number
          unlock_minutes?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          phrase?: string
          unlock_cost_gold?: number
          unlock_minutes?: number
          user_id?: string
        }
        Relationships: []
      }
      tracking_day_marks: {
        Row: {
          created_at: string
          day: string
          mode: string
          note: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          day: string
          mode: string
          note?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          mode?: string
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tracking_ignored_sources: {
        Row: {
          created_at: string
          kind: string
          matcher: string
          user_id: string
        }
        Insert: {
          created_at?: string
          kind: string
          matcher: string
          user_id: string
        }
        Update: {
          created_at?: string
          kind?: string
          matcher?: string
          user_id?: string
        }
        Relationships: []
      }
      tracking_set_sources: {
        Row: {
          set_id: string
          source_id: string
        }
        Insert: {
          set_id: string
          source_id: string
        }
        Update: {
          set_id?: string
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_set_sources_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "tracking_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_set_sources_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "tracked_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_sets: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      tracking_settings: {
        Row: {
          alert_interval_minutes: number
          calm_goal_multiplier: number
          calm_limit_multiplier: number
          focus_abandon_cost_gold: number
          focus_default_minutes: number
          focus_reward_gold: number
          focus_set_id: string | null
          heavy_goal_multiplier: number
          heavy_limit_multiplier: number
          last_push_at: string | null
          notify_charge_start: boolean
          push_enabled: boolean
          sabotage_fine_gold: number
          unlock_cooldown_minutes: number
          unlock_price_cap_mult: number
          unlock_price_step_pct: number
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_interval_minutes?: number
          calm_goal_multiplier?: number
          calm_limit_multiplier?: number
          focus_abandon_cost_gold?: number
          focus_default_minutes?: number
          focus_reward_gold?: number
          focus_set_id?: string | null
          heavy_goal_multiplier?: number
          heavy_limit_multiplier?: number
          last_push_at?: string | null
          notify_charge_start?: boolean
          push_enabled?: boolean
          sabotage_fine_gold?: number
          unlock_cooldown_minutes?: number
          unlock_price_cap_mult?: number
          unlock_price_step_pct?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_interval_minutes?: number
          calm_goal_multiplier?: number
          calm_limit_multiplier?: number
          focus_abandon_cost_gold?: number
          focus_default_minutes?: number
          focus_reward_gold?: number
          focus_set_id?: string | null
          heavy_goal_multiplier?: number
          heavy_limit_multiplier?: number
          last_push_at?: string | null
          notify_charge_start?: boolean
          push_enabled?: boolean
          sabotage_fine_gold?: number
          unlock_cooldown_minutes?: number
          unlock_price_cap_mult?: number
          unlock_price_step_pct?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_settings_focus_set_id_fkey"
            columns: ["focus_set_id"]
            isOneToOne: false
            referencedRelation: "tracking_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_source_icons: {
        Row: {
          data_url: string
          kind: string
          matcher: string
          updated_at: string
          user_id: string
        }
        Insert: {
          data_url: string
          kind: string
          matcher: string
          updated_at?: string
          user_id: string
        }
        Update: {
          data_url?: string
          kind?: string
          matcher?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tracking_source_names: {
        Row: {
          kind: string
          label: string
          matcher: string
          updated_at: string
          user_id: string
        }
        Insert: {
          kind: string
          label: string
          matcher: string
          updated_at?: string
          user_id: string
        }
        Update: {
          kind?: string
          label?: string
          matcher?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tracking_unlock_receipts: {
        Row: {
          client_id: string
          created_at: string
          expires_at: string
          gold_paid: number
          label: string
          target_key: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          expires_at: string
          gold_paid?: number
          label: string
          target_key: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          expires_at?: string
          gold_paid?: number
          label?: string
          target_key?: string
          user_id?: string
        }
        Relationships: []
      }
      tracking_unlocks: {
        Row: {
          created_at: string
          expires_at: string
          gold_paid: number
          target_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          gold_paid?: number
          target_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          gold_paid?: number
          target_key?: string
          user_id?: string
        }
        Relationships: []
      }
      tracking_window_slots: {
        Row: {
          end_time: string
          id: string
          start_time: string
          weekdays: number[]
          window_id: string
        }
        Insert: {
          end_time: string
          id?: string
          start_time: string
          weekdays: number[]
          window_id: string
        }
        Update: {
          end_time?: string
          id?: string
          start_time?: string
          weekdays?: number[]
          window_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_window_slots_window_id_fkey"
            columns: ["window_id"]
            isOneToOne: false
            referencedRelation: "tracking_windows"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_windows: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          set_id: string | null
          unlock_cost_gold: number
          unlock_minutes: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          set_id?: string | null
          unlock_cost_gold?: number
          unlock_minutes?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          set_id?: string | null
          unlock_cost_gold?: number
          unlock_minutes?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_windows_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "tracking_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_daily: {
        Row: {
          audio_seconds: number
          day: string
          gold_charged: number
          kind: string
          matcher: string
          parallel_seconds: number
          seconds: number
          seconds_charged: number
          settled_at: string | null
          source_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          audio_seconds?: number
          day: string
          gold_charged?: number
          kind: string
          matcher: string
          parallel_seconds?: number
          seconds?: number
          seconds_charged?: number
          settled_at?: string | null
          source_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          audio_seconds?: number
          day?: string
          gold_charged?: number
          kind?: string
          matcher?: string
          parallel_seconds?: number
          seconds?: number
          seconds_charged?: number
          settled_at?: string | null
          source_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_daily_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "tracked_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_intervals: {
        Row: {
          day_local: string
          device_id: string
          ended_at: string
          id: string
          kind: string
          matcher: string
          mode: string
          received_at: string
          seconds: number
          started_at: string
          user_id: string
        }
        Insert: {
          day_local: string
          device_id: string
          ended_at: string
          id: string
          kind: string
          matcher: string
          mode?: string
          received_at?: string
          seconds: number
          started_at: string
          user_id: string
        }
        Update: {
          day_local?: string
          device_id?: string
          ended_at?: string
          id?: string
          kind?: string
          matcher?: string
          mode?: string
          received_at?: string
          seconds?: number
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_intervals_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_open_events: {
        Row: {
          device_id: string
          kind: string
          matcher: string
          opened_at: string
          user_id: string
        }
        Insert: {
          device_id: string
          kind: string
          matcher: string
          opened_at?: string
          user_id: string
        }
        Update: {
          device_id?: string
          kind?: string
          matcher?: string
          opened_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_open_events_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_key: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_key: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_key?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_inventory_items: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          quantity: number
          source_id: string | null
          source_type: string | null
          system_item_id: string | null
          updated_at: string
          user_id: string
          user_item_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          quantity?: number
          source_id?: string | null
          source_type?: string | null
          system_item_id?: string | null
          updated_at?: string
          user_id: string
          user_item_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          quantity?: number
          source_id?: string | null
          source_type?: string | null
          system_item_id?: string | null
          updated_at?: string
          user_id?: string
          user_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_inventory_items_system_item_id_fkey"
            columns: ["system_item_id"]
            isOneToOne: false
            referencedRelation: "system_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_inventory_items_user_item_id_fkey"
            columns: ["user_item_id"]
            isOneToOne: false
            referencedRelation: "user_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_items: {
        Row: {
          category: string
          cooldown_minutes: number | null
          cost: number | null
          cost_essencia: number | null
          created_at: string
          current_stock: number | null
          description: string | null
          has_stock: boolean
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_consumable: boolean
          is_purchasable: boolean
          is_repurchasable: boolean
          last_purchased_at: string | null
          max_stock: number | null
          metadata: Json
          name: string
          needs_image: boolean
          needs_story: boolean
          rarity: string
          sort_order: number
          story_description: string | null
          story_model: string | null
          story_title: string | null
          unlocked_by_boss_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          cooldown_minutes?: number | null
          cost?: number | null
          cost_essencia?: number | null
          created_at?: string
          current_stock?: number | null
          description?: string | null
          has_stock?: boolean
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_consumable?: boolean
          is_purchasable?: boolean
          is_repurchasable?: boolean
          last_purchased_at?: string | null
          max_stock?: number | null
          metadata?: Json
          name: string
          needs_image?: boolean
          needs_story?: boolean
          rarity?: string
          sort_order?: number
          story_description?: string | null
          story_model?: string | null
          story_title?: string | null
          unlocked_by_boss_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          cooldown_minutes?: number | null
          cost?: number | null
          cost_essencia?: number | null
          created_at?: string
          current_stock?: number | null
          description?: string | null
          has_stock?: boolean
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_consumable?: boolean
          is_purchasable?: boolean
          is_repurchasable?: boolean
          last_purchased_at?: string | null
          max_stock?: number | null
          metadata?: Json
          name?: string
          needs_image?: boolean
          needs_story?: boolean
          rarity?: string
          sort_order?: number
          story_description?: string | null
          story_model?: string | null
          story_title?: string | null
          unlocked_by_boss_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_items_unlocked_by_boss_id_fkey"
            columns: ["unlocked_by_boss_id"]
            isOneToOne: false
            referencedRelation: "bosses"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_contracts: {
        Row: {
          created_at: string
          description: string | null
          id: string
          metadata: Json
          name: string
          needs_story: boolean
          reward_item_kind:
            | Database["public"]["Enums"]["objective_reward_item_kind"]
            | null
          reward_quantity: number
          reward_system_item_id: string | null
          reward_user_item_id: string | null
          stake_item_kind:
            | Database["public"]["Enums"]["objective_reward_item_kind"]
            | null
          stake_quantity: number
          stake_system_item_id: string | null
          stake_user_item_id: string | null
          status: Database["public"]["Enums"]["weekly_contract_status"]
          story_description: string | null
          story_model: string | null
          story_title: string | null
          updated_at: string
          user_id: string
          week_end: string
          week_start: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          name: string
          needs_story?: boolean
          reward_item_kind?:
            | Database["public"]["Enums"]["objective_reward_item_kind"]
            | null
          reward_quantity?: number
          reward_system_item_id?: string | null
          reward_user_item_id?: string | null
          stake_item_kind?:
            | Database["public"]["Enums"]["objective_reward_item_kind"]
            | null
          stake_quantity?: number
          stake_system_item_id?: string | null
          stake_user_item_id?: string | null
          status?: Database["public"]["Enums"]["weekly_contract_status"]
          story_description?: string | null
          story_model?: string | null
          story_title?: string | null
          updated_at?: string
          user_id: string
          week_end: string
          week_start: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          name?: string
          needs_story?: boolean
          reward_item_kind?:
            | Database["public"]["Enums"]["objective_reward_item_kind"]
            | null
          reward_quantity?: number
          reward_system_item_id?: string | null
          reward_user_item_id?: string | null
          stake_item_kind?:
            | Database["public"]["Enums"]["objective_reward_item_kind"]
            | null
          stake_quantity?: number
          stake_system_item_id?: string | null
          stake_user_item_id?: string | null
          status?: Database["public"]["Enums"]["weekly_contract_status"]
          story_description?: string | null
          story_model?: string | null
          story_title?: string | null
          updated_at?: string
          user_id?: string
          week_end?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_contracts_reward_system_item_id_fkey"
            columns: ["reward_system_item_id"]
            isOneToOne: false
            referencedRelation: "system_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_contracts_reward_user_item_id_fkey"
            columns: ["reward_user_item_id"]
            isOneToOne: false
            referencedRelation: "user_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_contracts_stake_system_item_id_fkey"
            columns: ["stake_system_item_id"]
            isOneToOne: false
            referencedRelation: "system_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_contracts_stake_user_item_id_fkey"
            columns: ["stake_user_item_id"]
            isOneToOne: false
            referencedRelation: "user_items"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_personal_records: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          previous_value: number | null
          record_type: string
          session_id: string
          set_id: string | null
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          previous_value?: number | null
          record_type: string
          session_id: string
          set_id?: string | null
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          previous_value?: number | null
          record_type?: string
          session_id?: string
          set_id?: string | null
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "workout_personal_records_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "fitness_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_personal_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_personal_records_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "workout_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          created_at: string
          duration_minutes: number | null
          ended_at: string | null
          gold_gained: number
          icon_name: string | null
          id: string
          media_url: string | null
          modality: string
          name: string
          notes: string | null
          started_at: string
          status: Database["public"]["Enums"]["workout_session_status"]
          template_id: string | null
          total_sets: number
          total_volume: number
          updated_at: string
          user_id: string
          xp_gained: number
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          gold_gained?: number
          icon_name?: string | null
          id?: string
          media_url?: string | null
          modality?: string
          name: string
          notes?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["workout_session_status"]
          template_id?: string | null
          total_sets?: number
          total_volume?: number
          updated_at?: string
          user_id: string
          xp_gained?: number
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          gold_gained?: number
          icon_name?: string | null
          id?: string
          media_url?: string | null
          modality?: string
          name?: string
          notes?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["workout_session_status"]
          template_id?: string | null
          total_sets?: number
          total_volume?: number
          updated_at?: string
          user_id?: string
          xp_gained?: number
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sets: {
        Row: {
          created_at: string
          distance_meters: number | null
          drops: Json | null
          duration_seconds: number | null
          exercise_id: string
          id: string
          is_skipped: boolean
          is_warmup: boolean
          notes: string | null
          reps: number
          rest_seconds: number | null
          rpe: number | null
          session_id: string
          set_number: number
          set_type: Database["public"]["Enums"]["workout_set_type"]
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          distance_meters?: number | null
          drops?: Json | null
          duration_seconds?: number | null
          exercise_id: string
          id?: string
          is_skipped?: boolean
          is_warmup?: boolean
          notes?: string | null
          reps?: number
          rest_seconds?: number | null
          rpe?: number | null
          session_id: string
          set_number: number
          set_type?: Database["public"]["Enums"]["workout_set_type"]
          user_id: string
          weight?: number
        }
        Update: {
          created_at?: string
          distance_meters?: number | null
          drops?: Json | null
          duration_seconds?: number | null
          exercise_id?: string
          id?: string
          is_skipped?: boolean
          is_warmup?: boolean
          notes?: string | null
          reps?: number
          rest_seconds?: number | null
          rpe?: number | null
          session_id?: string
          set_number?: number
          set_type?: Database["public"]["Enums"]["workout_set_type"]
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "workout_sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "fitness_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_template_exercises: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          notes: string | null
          rest_after_seconds: number
          rest_warmup_seconds: number
          rest_working_seconds: number
          sort_order: number
          superset_group: string | null
          template_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          notes?: string | null
          rest_after_seconds?: number
          rest_warmup_seconds?: number
          rest_working_seconds?: number
          sort_order?: number
          superset_group?: string | null
          template_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          notes?: string | null
          rest_after_seconds?: number
          rest_warmup_seconds?: number
          rest_working_seconds?: number
          sort_order?: number
          superset_group?: string | null
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_template_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "fitness_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_template_exercises_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_template_sets: {
        Row: {
          created_at: string
          drops: Json | null
          id: string
          set_type: Database["public"]["Enums"]["workout_set_type"]
          sort_order: number
          target_duration_seconds: number | null
          target_reps: number | null
          target_weight: number | null
          template_exercise_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          drops?: Json | null
          id?: string
          set_type?: Database["public"]["Enums"]["workout_set_type"]
          sort_order?: number
          target_duration_seconds?: number | null
          target_reps?: number | null
          target_weight?: number | null
          template_exercise_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          drops?: Json | null
          id?: string
          set_type?: Database["public"]["Enums"]["workout_set_type"]
          sort_order?: number
          target_duration_seconds?: number | null
          target_reps?: number | null
          target_weight?: number | null
          template_exercise_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_template_sets_template_exercise_id_fkey"
            columns: ["template_exercise_id"]
            isOneToOne: false
            referencedRelation: "workout_template_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          media_url: string | null
          modality: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          media_url?: string | null
          modality?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          media_url?: string | null
          modality?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      xp_goal_day_overrides: {
        Row: {
          daily_xp_goal: number
          updated_at: string
          user_id: string
          weekday: number
        }
        Insert: {
          daily_xp_goal: number
          updated_at?: string
          user_id: string
          weekday: number
        }
        Update: {
          daily_xp_goal?: number
          updated_at?: string
          user_id?: string
          weekday?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      tracking_day_multiplier: {
        Args: { p_day: string; p_kind: string; p_user: string }
        Returns: number
      }
    }
    Enums: {
      attribute_key: "forca" | "agilidade" | "vitalidade" | "foco"
      body_goal_status: "active" | "paused" | "completed" | "archived"
      body_goal_type: "measurement" | "performance" | "frequency"
      boss_phase_status: "ativa" | "vencida" | "bloqueada" | "expirada"
      boss_status: "ativo" | "vencido" | "perdido" | "encerrado"
      boss_tier: "mensal" | "trimestral" | "semestral" | "anual"
      character_class: "guerreiro" | "mago" | "ladino"
      difficulty: "trivial" | "easy" | "medium" | "hard" | "epic"
      economy_source_type:
        | "habit"
        | "workout"
        | "sidequest"
        | "body_goal"
        | "body_measurement"
        | "boss"
        | "achievement"
        | "tracking"
        | "store"
        | "death"
        | "build"
        | "event"
        | "sleep"
        | "cardio"
        | "reading"
      equipment_slot: "arma" | "armadura" | "acessorio"
      equipment_source: "loja" | "boss_drop"
      equipment_tier: "mensal" | "trimestral" | "semestral" | "anual"
      habit_suggestion_status: "pending" | "applied" | "dismissed" | "expired"
      habit_type: "positive" | "negative"
      module_kind: "atividade" | "meta"
      objective_frequency: "daily" | "weekly" | "monthly" | "manual"
      objective_reward_item_kind: "system" | "custom"
      objective_suggestion_status: "pending" | "applied" | "dismissed"
      objective_suggestion_type:
        | "composite_goal"
        | "temporary_challenge"
        | "weekly_contract"
      requirement_group_mode: "all" | "any" | "at_least"
      requirement_metric:
        | "habit_success_days"
        | "habit_executions"
        | "habit_clean_days"
        | "habit_failed_days"
        | "workout_sessions"
        | "body_measurement_count"
        | "body_measurement_value"
        | "body_goal_completed"
        | "sidequest_completed"
        | "xp_gained"
        | "gold_gained"
      requirement_operator: "gte" | "lte" | "eq"
      requirement_owner_type:
        | "reward"
        | "composite_goal"
        | "temporary_challenge"
        | "weekly_contract"
        | "boss_objective"
      requirement_period_scope:
        | "today"
        | "current_week"
        | "current_month"
        | "lifetime"
        | "since_created"
        | "since_last_claim"
        | "custom"
      requirement_source_type:
        | "habit"
        | "workout"
        | "body_measurement"
        | "body_goal"
        | "sidequest"
        | "economy_event"
      schedule_type: "weekdays" | "weekly_count" | "monthly"
      season_status: "ativa" | "concluida" | "encerrada"
      system_item_type: "heal" | "damage_reduction" | "streak_recovery"
      weekly_contract_status:
        | "draft"
        | "active"
        | "completed"
        | "failed"
        | "cancelled"
      workout_session_status: "active" | "completed" | "cancelled"
      workout_set_type:
        | "warmup"
        | "working"
        | "failure"
        | "dropset"
        | "isometric"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      attribute_key: ["forca", "agilidade", "vitalidade", "foco"],
      body_goal_status: ["active", "paused", "completed", "archived"],
      body_goal_type: ["measurement", "performance", "frequency"],
      boss_phase_status: ["ativa", "vencida", "bloqueada", "expirada"],
      boss_status: ["ativo", "vencido", "perdido", "encerrado"],
      boss_tier: ["mensal", "trimestral", "semestral", "anual"],
      character_class: ["guerreiro", "mago", "ladino"],
      difficulty: ["trivial", "easy", "medium", "hard", "epic"],
      economy_source_type: [
        "habit",
        "workout",
        "sidequest",
        "body_goal",
        "body_measurement",
        "boss",
        "achievement",
        "tracking",
        "store",
        "death",
        "build",
        "event",
        "sleep",
        "cardio",
        "reading",
      ],
      equipment_slot: ["arma", "armadura", "acessorio"],
      equipment_source: ["loja", "boss_drop"],
      equipment_tier: ["mensal", "trimestral", "semestral", "anual"],
      habit_suggestion_status: ["pending", "applied", "dismissed", "expired"],
      habit_type: ["positive", "negative"],
      module_kind: ["atividade", "meta"],
      objective_frequency: ["daily", "weekly", "monthly", "manual"],
      objective_reward_item_kind: ["system", "custom"],
      objective_suggestion_status: ["pending", "applied", "dismissed"],
      objective_suggestion_type: [
        "composite_goal",
        "temporary_challenge",
        "weekly_contract",
      ],
      requirement_group_mode: ["all", "any", "at_least"],
      requirement_metric: [
        "habit_success_days",
        "habit_executions",
        "habit_clean_days",
        "habit_failed_days",
        "workout_sessions",
        "body_measurement_count",
        "body_measurement_value",
        "body_goal_completed",
        "sidequest_completed",
        "xp_gained",
        "gold_gained",
      ],
      requirement_operator: ["gte", "lte", "eq"],
      requirement_owner_type: [
        "reward",
        "composite_goal",
        "temporary_challenge",
        "weekly_contract",
        "boss_objective",
      ],
      requirement_period_scope: [
        "today",
        "current_week",
        "current_month",
        "lifetime",
        "since_created",
        "since_last_claim",
        "custom",
      ],
      requirement_source_type: [
        "habit",
        "workout",
        "body_measurement",
        "body_goal",
        "sidequest",
        "economy_event",
      ],
      schedule_type: ["weekdays", "weekly_count", "monthly"],
      season_status: ["ativa", "concluida", "encerrada"],
      system_item_type: ["heal", "damage_reduction", "streak_recovery"],
      weekly_contract_status: [
        "draft",
        "active",
        "completed",
        "failed",
        "cancelled",
      ],
      workout_session_status: ["active", "completed", "cancelled"],
      workout_set_type: [
        "warmup",
        "working",
        "failure",
        "dropset",
        "isometric",
      ],
    },
  },
} as const
