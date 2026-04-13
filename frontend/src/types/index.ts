export interface User {
  id: string
  email: string
  full_name: string | null
  is_admin: boolean
  is_active: boolean
}

export interface LogEntry {
  id: string
  user_id: string | null
  session_id: string | null
  prompt: string
  output: string | null
  input_risk_score: number
  output_risk_score: number
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  status: 'allowed' | 'blocked' | 'sanitized' | 'flagged'
  prompt_injection_detected: boolean
  jailbreak_detected: boolean
  pii_detected_input: boolean
  pii_detected_output: boolean
  secrets_detected: boolean
  toxic_content_detected: boolean
  hallucination_detected: boolean
  model_used: string | null
  latency_ms: number | null
  created_at: string
}

export interface LogsResponse {
  items: LogEntry[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface StatsResponse {
  total_interactions: number
  blocked_count: number
  flagged_count: number
  injection_attempts: number
  pii_detections: number
  avg_risk_score: number
  risk_distribution: Record<string, number>
}

export interface APIKey {
  id: string
  name: string
  key_prefix: string
  is_active: boolean
  created_at: string
  expires_at: string | null
  last_used_at: string | null
  api_key?: string // only present at creation
}

export interface SecurityPolicy {
  id: string
  name: string
  description: string | null
  is_active: boolean
  rules: {
    block_pii: boolean
    block_secrets: boolean
    block_injection: boolean
    block_jailbreak: boolean
    block_toxic: boolean
    custom_terms: string[]
    max_prompt_length: number
  }
  action: string
  created_at: string
  updated_at: string
}
