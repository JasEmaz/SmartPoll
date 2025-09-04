export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      polls: {
        Row: {
          id: string
          question: string
          user_id: string
          created_at: string
          expires_at: string | null
        }
        Insert: {
          id?: string
          question: string
          user_id: string
          created_at?: string
          expires_at?: string | null
        }
        Update: {
          id?: string
          question?: string
          user_id?: string
          created_at?: string
          expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "polls_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      poll_options: {
        Row: {
          id: string
          poll_id: string
          option_text: string
          votes: number
          created_at: string
        }
        Insert: {
          id?: string
          poll_id: string
          option_text: string
          votes?: number
          created_at?: string
        }
        Update: {
          id?: string
          poll_id?: string
          option_text?: string
          votes?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            referencedRelation: "polls"
            referencedColumns: ["id"]
          }
        ]
      }
      votes: {
        Row: {
          id: string
          user_id: string
          poll_id: string
          option_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          poll_id: string
          option_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          poll_id?: string
          option_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_poll_id_fkey"
            columns: ["poll_id"]
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_option_id_fkey"
            columns: ["option_id"]
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          }
        ]
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_vote: {
        Args: {
          option_id: string
          poll_id: string
          user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
