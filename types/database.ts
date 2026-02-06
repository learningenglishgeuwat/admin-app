export type User = {
  id: string
  fullname: string
  email: string
  whatsapp: string | null
  tier: 'Rookie' | 'Pro' | 'Legend' | string
  status: 'unpaid' | 'paid' | 'active' | 'inactive' | 'suspend' | 'ban' | string
  role: 'admin' | 'member' | string
  balance: string
  monthly_referral_count: number | null
  referral_code: string
  referred_by: string | null
  membership_start: string | null
  subscription_expires_at: string | null
  created_at: string
}

export type Notification = {
  id: string
  type: 'info' | 'success' | 'warning' | 'error' | string | null
  content: string
  recipient_id: string | null
  status: 'read' | 'unread' | string
  read_at: string | null
  created_at: string
}

export type FinancialMetrics = {
  metric_title: string
  metric_value: string
  description: string
  trend: string
  created_at: string
}

export type TransactionHistory = {
  id: string
  user_id: string
  type: 'referral' | 'cashback' | 'custom' | 'withdrawal' | string
  amount: string | number
  status: 'pending' | 'completed' | 'failed' | string
  created_at: string
}

export type WithdrawRequest = {
  id: string
  user_id: string
  amount: string | number
  status: 'pending' | 'approved' | 'rejected' | string
  created_at: string
}

export type WithdrawalRequest = WithdrawRequest

export type ExtensionRequest = {
  id: string
  user_id: string
  status: 'pending' | 'approved' | 'rejected' | string
  payment_method: string | null
  proof_url: string | null
  note: string | null
  created_at: string
  updated_at: string
}

export type SubscriptionPrice = {
  id: string
  name: string
  price_cents: number
  currency: string
  interval: string
  stripe_price_id: string | null
  active: boolean
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export type Tier = {
  tier_name: 'Rookie' | 'Pro' | 'Legend' | string
  min_referrals: number
  referral_bonus_percentage: string
  cashback_percentage: string
}

export type WalletTransaction = {
  id: string
  user_id: string
  type: string
  amount: string | number
  status: string
  source_period: string | null
  applied_percentage: string | number | null
  tier_at_time: 'Rookie' | 'Pro' | 'Legend' | string | null
  created_at: string
}

export type CustomReward = {
  id: string
  user_id: string
  amount: string | number
  note: string | null
  status: 'pending' | 'approved' | 'rejected' | string
  created_at: string
  updated_at: string
}

export type AppSettings = {
  key: string
  maintenance_mode: boolean
  maintenance_message: string
  created_at: string
  updated_at: string
}

type TableDef<Row, Relationships extends unknown[] = never[]> = {
  Row: Row
  Insert: Partial<Row>
  Update: Partial<Row>
  Relationships: Relationships
}

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '12'
  }
  public: {
    Tables: {
      tiers: TableDef<Tier>
      subscription_price: TableDef<SubscriptionPrice>
      users: TableDef<User>
      notifications: TableDef<Notification>
      transactions: TableDef<TransactionHistory>
      withdraw_requests: TableDef<
        WithdrawRequest,
        [
          {
            foreignKeyName: 'withdraw_requests_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
            isOneToOne: false
          }
        ]
      >
      wallet_transactions: TableDef<WalletTransaction>
      custom_rewards: TableDef<
        CustomReward,
        [
          {
            foreignKeyName: 'custom_rewards_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
            isOneToOne: false
          }
        ]
      >
      app_settings: TableDef<AppSettings>
      financial_metrics: TableDef<FinancialMetrics>
      extension_requests: TableDef<
        ExtensionRequest,
        [
          {
            foreignKeyName: 'extension_requests_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
            isOneToOne: false
          }
        ]
      >
    }
    Functions: {
      register_user_with_referral: {
        Args: {
          user_id: string
          user_email: string
          user_fullname: string
          user_whatsapp: string
          membership_start: string
          referral_code_input?: string | null
        }
        Returns: {
          success: boolean
          user_id: string
          referred_by: string | null
          referral_used: string | null
          referral_code: string
          message: string
        }
      }
    }
    Views: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
