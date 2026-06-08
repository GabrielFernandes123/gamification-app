export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          is_active: boolean
          level: number | null
          media_url: string | null
          name: string
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          attribute_key?: Database["public"]["Enums"]["attribute_key"] | null
          color?: string | null
          created_at?: string
          icon_name?: string | null
          id?: string
          is_active?: boolean
          level?: number | null
          media_url?: string | null
          name: string
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          attribute_key?: Database["public"]["Enums"]["attribute_key"] | null
          color?: string | null
          created_at?: string
          icon_name?: string | null
          id?: string
          is_active?: boolean
          level?: number | null
          media_url?: string | null
          name?: string
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
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
          last_reset_at: string | null
          level: number | null
          max_hp: number | null
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
          last_reset_at?: string | null
          level?: number | null
          max_hp?: number | null
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
          last_reset_at?: string | null
          level?: number | null
          max_hp?: number | null
          total_xp?: number
          updated_at?: string
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
          is_active: boolean
          name: string
          required_level: number
          slot: Database["public"]["Enums"]["equipment_slot"]
          sort_order: number
          tier_origem: Database["public"]["Enums"]["equipment_tier"]
          updated_at: string
        }
        Insert: {
          attribute_bonuses?: Json
          cost_essencia?: number | null
          cost_gold?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          required_level?: number
          slot: Database["public"]["Enums"]["equipment_slot"]
          sort_order?: number
          tier_origem?: Database["public"]["Enums"]["equipment_tier"]
          updated_at?: string
        }
        Update: {
          attribute_bonuses?: Json
          cost_essencia?: number | null
          cost_gold?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          required_level?: number
          slot?: Database["public"]["Enums"]["equipment_slot"]
          sort_order?: number
          tier_origem?: Database["public"]["Enums"]["equipment_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      fitness_exercises: {
        Row: {
          created_at: string
          id: string
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
          created_at?: string
          id?: string
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
          created_at?: string
          id?: string
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
      habit_logs: {
        Row: {
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
          primary_skill_id: string | null
          reminder_times: string[]
          schedule: Database["public"]["Enums"]["schedule_type"]
          secondary_skill_id: string | null
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
          primary_skill_id?: string | null
          reminder_times?: string[]
          schedule: Database["public"]["Enums"]["schedule_type"]
          secondary_skill_id?: string | null
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
          primary_skill_id?: string | null
          reminder_times?: string[]
          schedule?: Database["public"]["Enums"]["schedule_type"]
          secondary_skill_id?: string | null
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
          unlocked_by_boss_id?: string | null
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
          primary_skill_id: string | null
          secondary_skill_id: string | null
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
          primary_skill_id?: string | null
          secondary_skill_id?: string | null
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
          primary_skill_id?: string | null
          secondary_skill_id?: string | null
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
          level: number | null
          name: string
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
          level?: number | null
          name: string
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
          level?: number | null
          name?: string
          updated_at?: string
          user_id?: string
          xp?: number
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
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      attribute_key: "forca" | "agilidade" | "vitalidade" | "foco"
      body_goal_status: "active" | "paused" | "completed" | "archived"
      body_goal_type: "measurement" | "performance" | "frequency"
      character_class: "guerreiro" | "mago" | "ladino"
      difficulty: "trivial" | "easy" | "medium" | "hard" | "epic"
      economy_source_type:
        | "habit"
        | "workout"
        | "sidequest"
        | "body_goal"
        | "body_measurement"
        | "boss"
      equipment_slot: "arma" | "armadura" | "acessorio"
      equipment_source: "loja" | "boss_drop"
      equipment_tier: "mensal" | "trimestral" | "semestral" | "anual"
      habit_type: "positive" | "negative"
      module_kind: "atividade" | "meta"
      schedule_type: "weekdays" | "weekly_count" | "monthly"
      system_item_type: "heal" | "damage_reduction" | "streak_recovery"
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
      character_class: ["guerreiro", "mago", "ladino"],
      difficulty: ["trivial", "easy", "medium", "hard", "epic"],
      economy_source_type: [
        "habit",
        "workout",
        "sidequest",
        "body_goal",
        "body_measurement",
        "boss",
      ],
      equipment_slot: ["arma", "armadura", "acessorio"],
      equipment_source: ["loja", "boss_drop"],
      equipment_tier: ["mensal", "trimestral", "semestral", "anual"],
      habit_type: ["positive", "negative"],
      module_kind: ["atividade", "meta"],
      schedule_type: ["weekdays", "weekly_count", "monthly"],
      system_item_type: ["heal", "damage_reduction", "streak_recovery"],
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
