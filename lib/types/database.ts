export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'citizen' | 'official' | 'admin';
export type FacilityType = 'road' | 'sanitation' | 'education' | 'health' | 'sewage' | 'other';
export type ComplaintCategory = 'road' | 'garbage' | 'sewage' | 'school' | 'healthcenter' | 'other';
export type ComplaintStatus = 'open' | 'assigned' | 'in_progress' | 'resolved' | 'verified' | 'escalated' | 'rejected';
export type VerificationStatus = 'pending' | 'passed' | 'failed';
export type EscalationTrigger = 'sla_breach' | 'verification_failed' | 'ghost_closure';
export type EscalationAuthority = 'municipal_commissioner' | 'ward_officer' | 'rti';
export type EscalationStatus = 'draft' | 'submitted' | 'acknowledged' | 'resolved';
export type AgentToolName = 'severity_score' | 'duplicate_check' | 'verify_resolution' | 'generate_escalation' | 'chat_answer';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          ward_id: string | null;
          phone: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          role?: UserRole;
          ward_id?: string | null;
          phone?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          role?: UserRole;
          ward_id?: string | null;
          phone?: string | null;
          created_at?: string;
        };
      };
      wards: {
        Row: {
          id: string;
          name: string;
          boundary: unknown;
          city: string;
          state: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          boundary: unknown;
          city: string;
          state: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          boundary?: unknown;
          city?: string;
          state?: string;
          created_at?: string;
        };
      };
      facilities: {
        Row: {
          id: string;
          ward_id: string;
          name: string;
          type: FacilityType;
          location: unknown;
          contact_phone: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          ward_id: string;
          name: string;
          type: FacilityType;
          location: unknown;
          contact_phone?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          ward_id?: string;
          name?: string;
          type?: FacilityType;
          location?: unknown;
          contact_phone?: string | null;
          created_at?: string;
        };
      };
      complaints: {
        Row: {
          id: string;
          reporter_id: string | null;
          ward_id: string | null;
          cluster_id: string | null;
          facility_id: string | null;
          category: ComplaintCategory;
          severity: number;
          status: ComplaintStatus;
          description: string | null;
          image_url: string;
          location: unknown;
          address_text: string | null;
          sla_deadline: string | null;
          resolved_at: string | null;
          resolution_image_url: string | null;
          verification_score: number | null;
          verification_status: VerificationStatus | null;
          escalation_letter_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reporter_id?: string | null;
          ward_id?: string | null;
          cluster_id?: string | null;
          facility_id?: string | null;
          category: ComplaintCategory;
          severity: number;
          status?: ComplaintStatus;
          description?: string | null;
          image_url: string;
          location: unknown;
          address_text?: string | null;
          sla_deadline?: string | null;
          resolved_at?: string | null;
          resolution_image_url?: string | null;
          verification_score?: number | null;
          verification_status?: VerificationStatus | null;
          escalation_letter_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          reporter_id?: string | null;
          ward_id?: string | null;
          cluster_id?: string | null;
          facility_id?: string | null;
          category?: ComplaintCategory;
          severity?: number;
          status?: ComplaintStatus;
          description?: string | null;
          image_url?: string;
          location?: unknown;
          address_text?: string | null;
          sla_deadline?: string | null;
          resolved_at?: string | null;
          resolution_image_url?: string | null;
          verification_score?: number | null;
          verification_status?: VerificationStatus | null;
          escalation_letter_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      complaint_clusters: {
        Row: {
          id: string;
          representative_id: string | null;
          complaint_count: number;
          centroid: unknown;
          bounding_radius: number;
          status: ComplaintStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          representative_id?: string | null;
          complaint_count?: number;
          centroid: unknown;
          bounding_radius: number;
          status?: ComplaintStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          representative_id?: string | null;
          complaint_count?: number;
          centroid?: unknown;
          bounding_radius?: number;
          status?: ComplaintStatus;
          created_at?: string;
        };
      };
      cluster_members: {
        Row: {
          cluster_id: string;
          complaint_id: string;
          joined_at: string;
        };
        Insert: {
          cluster_id: string;
          complaint_id: string;
          joined_at?: string;
        };
        Update: {
          cluster_id?: string;
          complaint_id?: string;
          joined_at?: string;
        };
      };
      escalations: {
        Row: {
          id: string;
          complaint_id: string;
          trigger_reason: EscalationTrigger;
          letter_content: string;
          authority: EscalationAuthority;
          deadline: string;
          status: EscalationStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          complaint_id: string;
          trigger_reason: EscalationTrigger;
          letter_content: string;
          authority: EscalationAuthority;
          deadline: string;
          status?: EscalationStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          complaint_id?: string;
          trigger_reason?: EscalationTrigger;
          letter_content?: string;
          authority?: EscalationAuthority;
          deadline?: string;
          status?: EscalationStatus;
          created_at?: string;
        };
      };
      agent_traces: {
        Row: {
          id: string;
          complaint_id: string | null;
          tool_name: AgentToolName;
          input_summary: Json;
          output_summary: Json;
          model_used: string;
          latency_ms: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          complaint_id?: string | null;
          tool_name: AgentToolName;
          input_summary: Json;
          output_summary: Json;
          model_used: string;
          latency_ms?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          complaint_id?: string | null;
          tool_name?: AgentToolName;
          input_summary?: Json;
          output_summary?: Json;
          model_used?: string;
          latency_ms?: number | null;
          created_at?: string;
        };
      };
    };
    Functions: {
      get_ward_from_point: {
        Args: { lng: number; lat: number };
        Returns: Database['public']['Tables']['wards']['Row'][];
      };
      increment_cluster_count: {
        Args: { target_cluster_id: string };
        Returns: number;
      };
      get_priority_queue: {
        Args: { target_ward_id: string };
        Returns: (Database['public']['Tables']['complaints']['Row'] & {
          weight: number;
          sla_breached: boolean;
        })[];
      };
    };
  };
}
