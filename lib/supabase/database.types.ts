
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "ai_logs": {
                  Row: {
                    "completion_tokens": number | null,"created_at": string,"created_by": string | null,"entity_id": string,"entity_type": string,"error": string | null,"household_id": string,"id": string,"input": NonNullable<Json>,"is_private": boolean,"latency_ms": number | null,"model": string | null,"output": Json | null,"owner_id": string | null,"prompt_tokens": number | null,"source": string | null,"total_tokens": number | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completion_tokens"?: number | null,"created_at"?: string,"created_by"?: string | null,"entity_id": string,"entity_type": string,"error"?: string | null,"household_id": string,"id"?: string,"input"?: NonNullable<Json>,"is_private"?: boolean,"latency_ms"?: number | null,"model"?: string | null,"output"?: Json | null,"owner_id"?: string | null,"prompt_tokens"?: number | null,"source"?: string | null,"total_tokens"?: number | null,"updated_at"?: string
                  }
                  Update: {
                    "completion_tokens"?: number | null,"created_at"?: string,"created_by"?: string | null,"entity_id"?: string,"entity_type"?: string,"error"?: string | null,"household_id"?: string,"id"?: string,"input"?: NonNullable<Json>,"is_private"?: boolean,"latency_ms"?: number | null,"model"?: string | null,"output"?: Json | null,"owner_id"?: string | null,"prompt_tokens"?: number | null,"source"?: string | null,"total_tokens"?: number | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_logs_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ai_logs_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ai_logs_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"ai_usage_counters": {
                  Row: {
                    "count": number,"household_id": string,"window_kind": string,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "count"?: number,"household_id": string,"window_kind": string,"window_start": string
                  }
                  Update: {
                    "count"?: number,"household_id"?: string,"window_kind"?: string,"window_start"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_usage_counters_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    }
                  ]
                },"card_expenses": {
                  Row: {
                    "ai_confidence": number | null,"ai_reason": string | null,"amount": number,"card_id": string,"categorization_status": string,"category_id": string | null,"category_source": string | null,"created_at": string,"created_by": string | null,"currency": string,"description": string,"household_id": string,"id": string,"installments_count": number,"is_private": boolean,"needs_review": boolean,"notes": string | null,"purchase_date": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ai_confidence"?: number | null,"ai_reason"?: string | null,"amount": number,"card_id": string,"categorization_status"?: string,"category_id"?: string | null,"category_source"?: string | null,"created_at"?: string,"created_by"?: string | null,"currency"?: string,"description": string,"household_id": string,"id"?: string,"installments_count"?: number,"is_private"?: boolean,"needs_review"?: boolean,"notes"?: string | null,"purchase_date": string,"updated_at"?: string
                  }
                  Update: {
                    "ai_confidence"?: number | null,"ai_reason"?: string | null,"amount"?: number,"card_id"?: string,"categorization_status"?: string,"category_id"?: string | null,"category_source"?: string | null,"created_at"?: string,"created_by"?: string | null,"currency"?: string,"description"?: string,"household_id"?: string,"id"?: string,"installments_count"?: number,"is_private"?: boolean,"needs_review"?: boolean,"notes"?: string | null,"purchase_date"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "card_expenses_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "card_expenses_household_id_card_id_fkey"
      columns: ["household_id","card_id"]
isOneToOne: false
      referencedRelation: "cards"
      referencedColumns: ["household_id","id"]
    },{
      foreignKeyName: "card_expenses_household_id_category_id_fkey"
      columns: ["household_id","category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["household_id","id"]
    },{
      foreignKeyName: "card_expenses_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    }
                  ]
                },"card_installments": {
                  Row: {
                    "amount": number,"card_expense_id": string,"card_id": string,"created_at": string,"created_by": string | null,"currency": string,"household_id": string,"id": string,"installment_number": number,"installments_count": number,"period": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"card_expense_id": string,"card_id": string,"created_at"?: string,"created_by"?: string | null,"currency": string,"household_id": string,"id"?: string,"installment_number": number,"installments_count": number,"period": string,"updated_at"?: string
                  }
                  Update: {
                    "amount"?: number,"card_expense_id"?: string,"card_id"?: string,"created_at"?: string,"created_by"?: string | null,"currency"?: string,"household_id"?: string,"id"?: string,"installment_number"?: number,"installments_count"?: number,"period"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "card_installments_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "card_installments_household_id_card_expense_id_fkey"
      columns: ["household_id","card_expense_id"]
isOneToOne: false
      referencedRelation: "card_expenses"
      referencedColumns: ["household_id","id"]
    },{
      foreignKeyName: "card_installments_household_id_card_id_fkey"
      columns: ["household_id","card_id"]
isOneToOne: false
      referencedRelation: "cards"
      referencedColumns: ["household_id","id"]
    },{
      foreignKeyName: "card_installments_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    }
                  ]
                },"card_statements": {
                  Row: {
                    "card_id": string,"closing_date": string,"created_at": string,"created_by": string | null,"due_date": string,"household_id": string,"id": string,"paid_at": string | null,"paid_by": string | null,"period": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "card_id": string,"closing_date": string,"created_at"?: string,"created_by"?: string | null,"due_date": string,"household_id": string,"id"?: string,"paid_at"?: string | null,"paid_by"?: string | null,"period": string,"updated_at"?: string
                  }
                  Update: {
                    "card_id"?: string,"closing_date"?: string,"created_at"?: string,"created_by"?: string | null,"due_date"?: string,"household_id"?: string,"id"?: string,"paid_at"?: string | null,"paid_by"?: string | null,"period"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "card_statements_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "card_statements_household_id_card_id_fkey"
      columns: ["household_id","card_id"]
isOneToOne: false
      referencedRelation: "cards"
      referencedColumns: ["household_id","id"]
    },{
      foreignKeyName: "card_statements_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "card_statements_paid_by_fkey"
      columns: ["paid_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"cards": {
                  Row: {
                    "bank": string | null,"closing_day": number,"color": string,"created_at": string,"created_by": string | null,"due_day": number,"holder_id": string | null,"household_id": string,"id": string,"is_active": boolean,"last4": string | null,"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bank"?: string | null,"closing_day": number,"color"?: string,"created_at"?: string,"created_by"?: string | null,"due_day": number,"holder_id"?: string | null,"household_id": string,"id"?: string,"is_active"?: boolean,"last4"?: string | null,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "bank"?: string | null,"closing_day"?: number,"color"?: string,"created_at"?: string,"created_by"?: string | null,"due_day"?: number,"holder_id"?: string | null,"household_id"?: string,"id"?: string,"is_active"?: boolean,"last4"?: string | null,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cards_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cards_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cards_household_id_holder_id_fkey"
      columns: ["household_id","holder_id"]
isOneToOne: false
      referencedRelation: "household_members"
      referencedColumns: ["household_id","user_id"]
    }
                  ]
                },"categories": {
                  Row: {
                    "color": string,"created_at": string,"created_by": string | null,"created_by_ai": boolean,"description": string,"household_id": string,"icon": string,"id": string,"is_system": boolean,"name": string,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "color"?: string,"created_at"?: string,"created_by"?: string | null,"created_by_ai"?: boolean,"description"?: string,"household_id": string,"icon"?: string,"id"?: string,"is_system"?: boolean,"name": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "color"?: string,"created_at"?: string,"created_by"?: string | null,"created_by_ai"?: boolean,"description"?: string,"household_id"?: string,"icon"?: string,"id"?: string,"is_system"?: boolean,"name"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "categories_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "categories_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    }
                  ]
                },"category_corrections": {
                  Row: {
                    "created_at": string,"created_by": string | null,"description": string,"entity_id": string,"entity_type": string,"from_category_id": string | null,"household_id": string,"id": string,"is_private": boolean,"normalized": string,"to_category_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"description": string,"entity_id": string,"entity_type": string,"from_category_id"?: string | null,"household_id": string,"id"?: string,"is_private"?: boolean,"normalized"?: string,"to_category_id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"description"?: string,"entity_id"?: string,"entity_type"?: string,"from_category_id"?: string | null,"household_id"?: string,"id"?: string,"is_private"?: boolean,"normalized"?: string,"to_category_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "category_corrections_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "category_corrections_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "category_corrections_household_id_from_category_id_fkey"
      columns: ["household_id","from_category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["household_id","id"]
    },{
      foreignKeyName: "category_corrections_household_id_to_category_id_fkey"
      columns: ["household_id","to_category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["household_id","id"]
    }
                  ]
                },"category_rules": {
                  Row: {
                    "category_id": string,"created_at": string,"created_by": string | null,"hits": number,"household_id": string,"id": string,"last_matched_at": string | null,"pattern": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id": string,"created_at"?: string,"created_by"?: string | null,"hits"?: number,"household_id": string,"id"?: string,"last_matched_at"?: string | null,"pattern": string,"updated_at"?: string
                  }
                  Update: {
                    "category_id"?: string,"created_at"?: string,"created_by"?: string | null,"hits"?: number,"household_id"?: string,"id"?: string,"last_matched_at"?: string | null,"pattern"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "category_rules_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "category_rules_household_id_category_id_fkey"
      columns: ["household_id","category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["household_id","id"]
    },{
      foreignKeyName: "category_rules_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    }
                  ]
                },"fixed_expense_payments": {
                  Row: {
                    "amount": number,"created_at": string,"created_by": string | null,"currency": string,"fixed_expense_id": string,"household_id": string,"id": string,"notes": string | null,"paid_at": string,"paid_by": string | null,"period": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"created_by"?: string | null,"currency"?: string,"fixed_expense_id": string,"household_id": string,"id"?: string,"notes"?: string | null,"paid_at"?: string,"paid_by"?: string | null,"period": string,"updated_at"?: string
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"created_by"?: string | null,"currency"?: string,"fixed_expense_id"?: string,"household_id"?: string,"id"?: string,"notes"?: string | null,"paid_at"?: string,"paid_by"?: string | null,"period"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "fixed_expense_payments_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fixed_expense_payments_household_id_fixed_expense_id_fkey"
      columns: ["household_id","fixed_expense_id"]
isOneToOne: false
      referencedRelation: "fixed_expenses"
      referencedColumns: ["household_id","id"]
    },{
      foreignKeyName: "fixed_expense_payments_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fixed_expense_payments_paid_by_fkey"
      columns: ["paid_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"fixed_expenses": {
                  Row: {
                    "ai_confidence": number | null,"ai_reason": string | null,"amount": number,"card_id": string | null,"categorization_status": string,"category_id": string | null,"category_source": string | null,"created_at": string,"created_by": string | null,"currency": string,"due_day": number,"household_id": string,"id": string,"is_active": boolean,"is_private": boolean,"name": string,"needs_review": boolean,"notes": string | null,"payment_method": string,"responsible_ids": (string)[],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ai_confidence"?: number | null,"ai_reason"?: string | null,"amount": number,"card_id"?: string | null,"categorization_status"?: string,"category_id"?: string | null,"category_source"?: string | null,"created_at"?: string,"created_by"?: string | null,"currency"?: string,"due_day": number,"household_id": string,"id"?: string,"is_active"?: boolean,"is_private"?: boolean,"name": string,"needs_review"?: boolean,"notes"?: string | null,"payment_method"?: string,"responsible_ids"?: (string)[],"updated_at"?: string
                  }
                  Update: {
                    "ai_confidence"?: number | null,"ai_reason"?: string | null,"amount"?: number,"card_id"?: string | null,"categorization_status"?: string,"category_id"?: string | null,"category_source"?: string | null,"created_at"?: string,"created_by"?: string | null,"currency"?: string,"due_day"?: number,"household_id"?: string,"id"?: string,"is_active"?: boolean,"is_private"?: boolean,"name"?: string,"needs_review"?: boolean,"notes"?: string | null,"payment_method"?: string,"responsible_ids"?: (string)[],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "fixed_expenses_card_fk"
      columns: ["household_id","card_id"]
isOneToOne: false
      referencedRelation: "cards"
      referencedColumns: ["household_id","id"]
    },{
      foreignKeyName: "fixed_expenses_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fixed_expenses_household_id_category_id_fkey"
      columns: ["household_id","category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["household_id","id"]
    },{
      foreignKeyName: "fixed_expenses_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    }
                  ]
                },"household_members": {
                  Row: {
                    "color": string,"created_at": string,"created_by": string | null,"household_id": string,"id": string,"nickname": string | null,"role": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "color"?: string,"created_at"?: string,"created_by"?: string | null,"household_id": string,"id"?: string,"nickname"?: string | null,"role"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "color"?: string,"created_at"?: string,"created_by"?: string | null,"household_id"?: string,"id"?: string,"nickname"?: string | null,"role"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "household_members_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "household_members_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "household_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"households": {
                  Row: {
                    "created_at": string,"created_by": string | null,"default_currency": string,"id": string,"name": string,"timezone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"default_currency"?: string,"id"?: string,"name": string,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"default_currency"?: string,"id"?: string,"name"?: string,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "households_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"invitations": {
                  Row: {
                    "code": string,"created_at": string,"created_by": string | null,"expires_at": string,"household_id": string,"id": string,"invited_user_id": string | null,"invited_username": string | null,"max_uses": number | null,"revoked_at": string | null,"role": string,"updated_at": string,"uses_count": number
                  }
                  ComputedFields: never
                  Insert: {
                    "code"?: string,"created_at"?: string,"created_by"?: string | null,"expires_at"?: string,"household_id": string,"id"?: string,"invited_user_id"?: string | null,"invited_username"?: string | null,"max_uses"?: number | null,"revoked_at"?: string | null,"role"?: string,"updated_at"?: string,"uses_count"?: number
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"created_by"?: string | null,"expires_at"?: string,"household_id"?: string,"id"?: string,"invited_user_id"?: string | null,"invited_username"?: string | null,"max_uses"?: number | null,"revoked_at"?: string | null,"role"?: string,"updated_at"?: string,"uses_count"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "invitations_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invitations_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invitations_invited_user_id_fkey"
      columns: ["invited_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"pending_purchases": {
                  Row: {
                    "ai_confidence": number | null,"ai_reason": string | null,"card_expense_id": string | null,"categorization_status": string,"category_id": string | null,"category_source": string | null,"created_at": string,"created_by": string | null,"currency": string,"estimated_price": number | null,"household_id": string,"id": string,"is_private": boolean,"kind": string,"name": string,"needs_review": boolean,"notes": string | null,"priority": string,"purchased_at": string | null,"requested_by": string | null,"status": string,"updated_at": string,"url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "ai_confidence"?: number | null,"ai_reason"?: string | null,"card_expense_id"?: string | null,"categorization_status"?: string,"category_id"?: string | null,"category_source"?: string | null,"created_at"?: string,"created_by"?: string | null,"currency"?: string,"estimated_price"?: number | null,"household_id": string,"id"?: string,"is_private"?: boolean,"kind"?: string,"name": string,"needs_review"?: boolean,"notes"?: string | null,"priority"?: string,"purchased_at"?: string | null,"requested_by"?: string | null,"status"?: string,"updated_at"?: string,"url"?: string | null
                  }
                  Update: {
                    "ai_confidence"?: number | null,"ai_reason"?: string | null,"card_expense_id"?: string | null,"categorization_status"?: string,"category_id"?: string | null,"category_source"?: string | null,"created_at"?: string,"created_by"?: string | null,"currency"?: string,"estimated_price"?: number | null,"household_id"?: string,"id"?: string,"is_private"?: boolean,"kind"?: string,"name"?: string,"needs_review"?: boolean,"notes"?: string | null,"priority"?: string,"purchased_at"?: string | null,"requested_by"?: string | null,"status"?: string,"updated_at"?: string,"url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "pending_purchases_card_expense_fk"
      columns: ["household_id","card_expense_id"]
isOneToOne: false
      referencedRelation: "card_expenses"
      referencedColumns: ["household_id","id"]
    },{
      foreignKeyName: "pending_purchases_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pending_purchases_household_id_category_id_fkey"
      columns: ["household_id","category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["household_id","id"]
    },{
      foreignKeyName: "pending_purchases_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pending_purchases_household_id_requested_by_fkey"
      columns: ["household_id","requested_by"]
isOneToOne: false
      referencedRelation: "household_members"
      referencedColumns: ["household_id","user_id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"created_at": string,"current_household_id": string | null,"display_name": string,"id": string,"sound_enabled": boolean,"updated_at": string,"username": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"created_at"?: string,"current_household_id"?: string | null,"display_name"?: string,"id": string,"sound_enabled"?: boolean,"updated_at"?: string,"username": string
                  }
                  Update: {
                    "avatar_url"?: string | null,"created_at"?: string,"current_household_id"?: string | null,"display_name"?: string,"id"?: string,"sound_enabled"?: boolean,"updated_at"?: string,"username"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_current_household_fk"
      columns: ["current_household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    }
                  ]
                },"shopping_items": {
                  Row: {
                    "actual_price": number | null,"category": string,"created_at": string,"created_by": string | null,"estimated_price": number | null,"household_id": string,"id": string,"is_purchased": boolean,"list_id": string,"name": string,"purchased_at": string | null,"purchased_by": string | null,"quantity": number,"sort_order": number,"unit": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actual_price"?: number | null,"category"?: string,"created_at"?: string,"created_by"?: string | null,"estimated_price"?: number | null,"household_id": string,"id"?: string,"is_purchased"?: boolean,"list_id": string,"name": string,"purchased_at"?: string | null,"purchased_by"?: string | null,"quantity"?: number,"sort_order"?: number,"unit"?: string,"updated_at"?: string
                  }
                  Update: {
                    "actual_price"?: number | null,"category"?: string,"created_at"?: string,"created_by"?: string | null,"estimated_price"?: number | null,"household_id"?: string,"id"?: string,"is_purchased"?: boolean,"list_id"?: string,"name"?: string,"purchased_at"?: string | null,"purchased_by"?: string | null,"quantity"?: number,"sort_order"?: number,"unit"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "shopping_items_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shopping_items_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shopping_items_household_id_list_id_fkey"
      columns: ["household_id","list_id"]
isOneToOne: false
      referencedRelation: "shopping_lists"
      referencedColumns: ["household_id","id"]
    },{
      foreignKeyName: "shopping_items_purchased_by_fkey"
      columns: ["purchased_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"shopping_lists": {
                  Row: {
                    "created_at": string,"created_by": string | null,"household_id": string,"id": string,"is_template": boolean,"month": string | null,"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"household_id": string,"id"?: string,"is_template"?: boolean,"month"?: string | null,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"household_id"?: string,"id"?: string,"is_template"?: boolean,"month"?: string | null,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "shopping_lists_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shopping_lists_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    }
                  ]
                },"task_categories": {
                  Row: {
                    "color": string,"created_at": string,"created_by": string | null,"household_id": string,"icon": string,"id": string,"name": string,"parent_id": string | null,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "color"?: string,"created_at"?: string,"created_by"?: string | null,"household_id": string,"icon"?: string,"id"?: string,"name": string,"parent_id"?: string | null,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "color"?: string,"created_at"?: string,"created_by"?: string | null,"household_id"?: string,"icon"?: string,"id"?: string,"name"?: string,"parent_id"?: string | null,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "task_categories_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "task_categories_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "task_categories_household_id_parent_id_fkey"
      columns: ["household_id","parent_id"]
isOneToOne: false
      referencedRelation: "task_categories"
      referencedColumns: ["household_id","id"]
    }
                  ]
                },"task_completions": {
                  Row: {
                    "completed_at": string,"completed_by": string | null,"created_at": string,"created_by": string | null,"household_id": string,"id": string,"next_task_id": string | null,"previous_assigned_to": string | null,"reassigned": boolean,"task_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string,"completed_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"household_id": string,"id"?: string,"next_task_id"?: string | null,"previous_assigned_to"?: string | null,"reassigned"?: boolean,"task_id": string,"updated_at"?: string
                  }
                  Update: {
                    "completed_at"?: string,"completed_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"household_id"?: string,"id"?: string,"next_task_id"?: string | null,"previous_assigned_to"?: string | null,"reassigned"?: boolean,"task_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "task_completions_completed_by_fkey"
      columns: ["completed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "task_completions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "task_completions_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "task_completions_household_id_task_id_fkey"
      columns: ["household_id","task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["household_id","id"]
    },{
      foreignKeyName: "task_completions_next_task_id_fkey"
      columns: ["next_task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "task_completions_previous_assigned_to_fkey"
      columns: ["previous_assigned_to"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"tasks": {
                  Row: {
                    "assigned_to": string | null,"completed_at": string | null,"completed_by": string | null,"created_at": string,"created_by": string | null,"description": string | null,"due_date": string | null,"frequency": string,"household_id": string,"id": string,"is_private": boolean,"month_day": number | null,"priority": string,"recurrence_anchor": string | null,"series_id": string | null,"status": string,"task_category_id": string | null,"title": string,"updated_at": string,"weekdays": (number)[] | null
                  }
                  ComputedFields: never
                  Insert: {
                    "assigned_to"?: string | null,"completed_at"?: string | null,"completed_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"due_date"?: string | null,"frequency"?: string,"household_id": string,"id"?: string,"is_private"?: boolean,"month_day"?: number | null,"priority"?: string,"recurrence_anchor"?: string | null,"series_id"?: string | null,"status"?: string,"task_category_id"?: string | null,"title": string,"updated_at"?: string,"weekdays"?: (number)[] | null
                  }
                  Update: {
                    "assigned_to"?: string | null,"completed_at"?: string | null,"completed_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"due_date"?: string | null,"frequency"?: string,"household_id"?: string,"id"?: string,"is_private"?: boolean,"month_day"?: number | null,"priority"?: string,"recurrence_anchor"?: string | null,"series_id"?: string | null,"status"?: string,"task_category_id"?: string | null,"title"?: string,"updated_at"?: string,"weekdays"?: (number)[] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "tasks_completed_by_fkey"
      columns: ["completed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_household_id_assigned_to_fkey"
      columns: ["household_id","assigned_to"]
isOneToOne: false
      referencedRelation: "household_members"
      referencedColumns: ["household_id","user_id"]
    },{
      foreignKeyName: "tasks_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_household_id_task_category_id_fkey"
      columns: ["household_id","task_category_id"]
isOneToOne: false
      referencedRelation: "task_categories"
      referencedColumns: ["household_id","id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "accept_invitation":
{ Args: { "p_code": string }; Returns: string
                           },
"complete_task":
{ Args: { "p_next_due"?: string,"p_task_id": string }; Returns: string
                           },
"consume_ai_quota":
{ Args: { "p_cost": number,"p_household_id": string,"p_per_day": number,"p_per_minute": number }; Returns: boolean
                           },
"create_household":
{ Args: { "p_name": string }; Returns: string
                           },
"create_shopping_list":
{ Args: { "p_household_id": string,"p_is_template"?: boolean,"p_month"?: string,"p_name": string,"p_source_list_id"?: string }; Returns: string
                           },
"decline_invitation":
{ Args: { "p_code": string }; Returns: undefined
                           },
"get_invitation_preview":
{ Args: { "p_code": string }; Returns: {
              "for_other_user": boolean,"household_name": string,"valid": boolean
            }[]
                           },
"get_my_invitations":
{ Args: Record<PropertyKey, never>; Returns: {
              "code": string,"expires_at": string,"household_name": string,"invited_by": string,"invited_by_username": string,"role": string
            }[]
                           },
"invite_user":
{ Args: { "p_days"?: number,"p_household_id": string,"p_role"?: string,"p_username": string }; Returns: string
                           },
"statement_period":
{ Args: { "p_closing_day": number,"p_date": string }; Returns: string
                           },
"undo_complete_task":
{ Args: { "p_completion_id": string }; Returns: undefined
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
