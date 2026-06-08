export interface BaseCosmosDocument {
  id: string; // Cosmos DB document ID
  institution_id: string; // Partition key for all collections
}

export interface UserDoc extends BaseCosmosDocument {
  entra_oid: string;
  role: "Student" | "Agent" | "Admin";
  preferences?: {
    language?: "en" | "fil" | "ceb";
  };
}

export interface ConversationDoc extends BaseCosmosDocument {
  ticket_id: string;
  student_id: string; // Entra ID or student number
  status: "Open" | "Pending Agent" | "Resolved";
  assignee_id?: string; // ID of the human agent
  ai_resolution_attempts?: number; // failed autonomous attempts before escalation
  created_at: string;
}

export interface MessageDoc extends BaseCosmosDocument {
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content_scrubbed: string;
  ts: string;
  ttl?: number; // 90 days for data retention compliance
}

export interface HandoffDoc extends BaseCosmosDocument {
  ticket_id: string;
  handoff_packet: {
    student_profile: {
      name: string;
      student_id: string;
      major: string;
      year: string;
    };
    diagnosis: string;
    systems_queried: string[];
    actions_taken: string[];
    recommended_resolution: string;
  };
  agent_id?: string;
  resolved_at?: string;
  ttl?: number; // 90 days
}

export interface PolicyEmbeddingDoc extends BaseCosmosDocument {
  document_id: string;
  chunk_text: string;
  embedding: number[];
}

export interface CacheUniversityDataDoc extends BaseCosmosDocument {
  cache_key: string; // e.g., holds:studentId or balance:studentId
  data: unknown;
  fetched_at: number; // epoch timestamp
  ttl?: number; // 300 seconds
}

export interface NotificationDoc extends BaseCosmosDocument {
  user_id: string; // Entra object id
  type: "deadline" | "hold" | "ticket" | "system";
  channel: "in_app" | "teams" | "outlook";
  status: "unread" | "read";
  title: string;
  message: string;
  action_url?: string;
  created_at: string;
  ttl?: number; // 30 days
}

export interface NotificationJobDoc extends BaseCosmosDocument {
  channel: "teams" | "outlook";
  recipient_entra_oid: string;
  recipient_email?: string;
  status: "pending" | "processing" | "sent" | "failed";
  attempts: number;
  payload: {
    title?: string;
    message?: string;
    action_url?: string;
    subject?: string;
    text_body?: string;
    html_body?: string;
    ticket_id?: string;
  };
  provider_message_id?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
  ttl?: number; // 30 days
}
