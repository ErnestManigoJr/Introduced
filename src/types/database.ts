export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// ---------------------------------------------------------------------------
// app_users
// ---------------------------------------------------------------------------
export interface AppUser {
  id: string;
  auth_user_id: string;
  email: string;
  username: string;
  display_name: string;
  is_18_confirmed: boolean;
  terms_accepted_at: string | null;
  privacy_accepted_at: string | null;
  community_guidelines_accepted_at: string | null;
  dating_disclaimer_accepted_at: string | null;
  account_status: 'active' | 'suspended' | 'deleted' | 'pending';
  onboarding_status: 'incomplete' | 'complete';
  connection_style_complete: boolean;
  introductions_made: number;
  introductions_received: number;
  open_to_introductions: boolean;
  created_at: string;
  updated_at: string;
}
export type AppUserInsert = Omit<AppUser, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

// ---------------------------------------------------------------------------
// profiles
// ---------------------------------------------------------------------------
export interface Profile {
  id: string;
  user_id: string;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  intro_video_url: string | null;
  city: string | null;
  state: string | null;
  country: string;
  gender: string | null;
  pronouns: string | null;
  age: number | null;
  date_of_birth: string | null;
  relationship_intention: 'friendship' | 'dating' | 'both' | null;
  values: string[];
  created_at: string;
  updated_at: string;
}
export type ProfileInsert = Omit<Profile, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

// ---------------------------------------------------------------------------
// user_consents
// ---------------------------------------------------------------------------
export interface UserConsent {
  id: string;
  user_id: string;
  consent_type: string;
  consent_version: string;
  accepted: boolean;
  accepted_at: string;
  revoked_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Json;
}
export type UserConsentInsert = Omit<UserConsent, 'id'> & { id?: string };

// ---------------------------------------------------------------------------
// privacy_settings
// ---------------------------------------------------------------------------
export interface PrivacySettings {
  id: string;
  user_id: string;
  profile_visibility: 'public' | 'connections' | 'private';
  search_visibility: 'everyone' | 'connections' | 'hidden';
  introduction_visibility: 'open' | 'connections_only' | 'closed';
  message_request_policy: 'everyone' | 'connections' | 'nobody';
  reshare_policy: 'allow' | 'connections' | 'deny';
  show_online_status: boolean;
  show_location_level: 'city' | 'region' | 'hidden';
  open_to_introductions: boolean;
  updated_at: string;
}
export type PrivacySettingsInsert = Omit<PrivacySettings, 'id' | 'updated_at'> & {
  id?: string;
  updated_at?: string;
};

// ---------------------------------------------------------------------------
// account_settings
// ---------------------------------------------------------------------------
export interface AccountSettings {
  id: string;
  user_id: string;
  notification_email: boolean;
  notification_push: boolean;
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string | null;
  two_factor_enabled: boolean;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// dating_preferences
// ---------------------------------------------------------------------------
export interface DatingPreferences {
  id: string;
  user_id: string;
  open_to: 'friendship' | 'dating' | 'relationship' | 'both' | 'not_sure';
  relationship_pace: 'slow' | 'natural' | 'steady' | 'direct' | null;
  non_negotiables: string[];
  intro_open_status: 'yes_open' | 'after_two' | 'not_yet' | 'social_only';
  min_age: number;
  max_age: number;
  preferred_genders: string[];
  max_distance_km: number | null;
  updated_at: string;
}
export type DatingPreferencesInsert = Omit<DatingPreferences, 'id' | 'updated_at'> & {
  id?: string;
  updated_at?: string;
};

// ---------------------------------------------------------------------------
// user_interests
// ---------------------------------------------------------------------------
export interface UserInterest {
  id: string;
  user_id: string;
  interest: string;
  category: string;
  created_at: string;
}
export type UserInterestInsert = Omit<UserInterest, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

// ---------------------------------------------------------------------------
// posts
// ---------------------------------------------------------------------------
export interface Post {
  id: string;
  author_id: string;
  body: string | null;
  media_urls: string[];
  media_type: 'none' | 'photo' | 'video';
  visibility: 'public' | 'connections' | 'room';
  community_id: string | null;
  repost_of: string | null;
  reply_to: string | null;
  reaction_counts: Json;
  comment_count: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}
export type PostInsert = Omit<Post, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

// ---------------------------------------------------------------------------
// post_comments
// ---------------------------------------------------------------------------
export interface PostComment {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  parent_comment_id: string | null;
  created_at: string;
  updated_at: string;
}
export type PostCommentInsert = Omit<PostComment, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

// ---------------------------------------------------------------------------
// post_reactions
// ---------------------------------------------------------------------------
export interface PostReaction {
  id: string;
  user_id: string;
  post_id: string;
  type: 'heart' | 'fire' | 'laugh' | 'wow' | 'support';
  created_at: string;
}
export type PostReactionInsert = Omit<PostReaction, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

// ---------------------------------------------------------------------------
// communities
// ---------------------------------------------------------------------------
export interface Community {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  created_by: string;
  community_type: 'public' | 'private';
  is_live: boolean;
  livekit_room_name: string | null;
  member_count: number;
  tags: string[];
  created_at: string;
}
export type CommunityInsert = Omit<Community, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

// ---------------------------------------------------------------------------
// community_members
// ---------------------------------------------------------------------------
export interface CommunityMember {
  id: string;
  community_id: string;
  user_id: string;
  role: 'member' | 'moderator' | 'owner';
  joined_at: string;
}

// ---------------------------------------------------------------------------
// room_messages
// ---------------------------------------------------------------------------
export interface RoomMessage {
  id: string;
  community_id: string;
  sender_id: string;
  body: string;
  media_url: string | null;
  created_at: string;
}
export type RoomMessageInsert = Omit<RoomMessage, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

// ---------------------------------------------------------------------------
// direct_threads + direct_messages
// ---------------------------------------------------------------------------
export interface DirectThread {
  id: string;
  participant_ids: string[];
  last_message_at: string | null;
  created_at: string;
}

export interface DirectMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  media_url: string | null;
  is_read: boolean;
  created_at: string;
}
export type DirectMessageInsert = Omit<DirectMessage, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

// ---------------------------------------------------------------------------
// questionnaire_answers + trait_scores
// ---------------------------------------------------------------------------
export interface QuestionnaireAnswer {
  id: string;
  user_id: string;
  question_key: string;
  answer_value: string;
  created_at: string;
}

export interface TraitScore {
  id: string;
  user_id: string;
  trait_key: string;
  score: number;
  computed_at: string;
}

// ---------------------------------------------------------------------------
// connection_signals
// ---------------------------------------------------------------------------
export interface ConnectionSignal {
  id: string;
  user_a_id: string;
  user_b_id: string;
  profile_signal: number;
  personality_signal: number;
  community_signal: number;
  interaction_signal: number;
  introduction_signal: number;
  total_signal: number;
  computed_at: string;
}

// ---------------------------------------------------------------------------
// introductions
// ---------------------------------------------------------------------------
export interface Introduction {
  id: string;
  connector_id: string;
  person_a_id: string;
  person_b_id: string;
  note: string | null;
  status: 'pending' | 'a_accepted' | 'b_accepted' | 'both_accepted' | 'declined' | 'expired' | 'completed';
  signal_score: number | null;
  intro_room_id: string | null;
  connector_credited: boolean;
  created_at: string;
  responded_at: string | null;
  completed_at: string | null;
}
export type IntroductionInsert = Omit<Introduction, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

// ---------------------------------------------------------------------------
// intro_rooms
// ---------------------------------------------------------------------------
export interface IntroRoom {
  id: string;
  introduction_id: string | null;
  livekit_room_name: string;
  created_by: string;
  status: 'waiting' | 'active' | 'ended';
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// blocks + reports
// ---------------------------------------------------------------------------
export interface Block {
  id: string;
  blocker_id: string;
  blocked_id: string;
  reason: string | null;
  created_at: string;
}
export type BlockInsert = Omit<Block, 'id' | 'created_at'> & { id?: string; created_at?: string };

export interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  reported_post_id: string | null;
  reported_message_id: string | null;
  reported_community_id: string | null;
  category: 'harassment' | 'spam' | 'explicit' | 'underage' | 'other';
  details: string | null;
  status: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
  created_at: string;
}
export type ReportInsert = Omit<Report, 'id' | 'created_at' | 'status'> & {
  id?: string;
  created_at?: string;
  status?: Report['status'];
};

// ---------------------------------------------------------------------------
// deletion_requests
// ---------------------------------------------------------------------------
export interface DeletionRequest {
  id: string;
  user_id: string;
  requested_at: string;
  scheduled_deletion_at: string;
  reason: string | null;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  cancelled_at: string | null;
}

// ---------------------------------------------------------------------------
// Database shape for typed Supabase client
// ---------------------------------------------------------------------------
export interface Database {
  public: {
    Tables: {
      app_users: { Row: AppUser; Insert: AppUserInsert; Update: Partial<AppUserInsert> };
      profiles: { Row: Profile; Insert: ProfileInsert; Update: Partial<ProfileInsert> };
      user_consents: { Row: UserConsent; Insert: UserConsentInsert; Update: Partial<UserConsentInsert> };
      privacy_settings: { Row: PrivacySettings; Insert: PrivacySettingsInsert; Update: Partial<PrivacySettingsInsert> };
      account_settings: { Row: AccountSettings; Insert: Omit<AccountSettings, 'id' | 'updated_at'>; Update: Partial<AccountSettings> };
      dating_preferences: { Row: DatingPreferences; Insert: DatingPreferencesInsert; Update: Partial<DatingPreferencesInsert> };
      user_interests: { Row: UserInterest; Insert: UserInterestInsert; Update: Partial<UserInterestInsert> };
      posts: { Row: Post; Insert: PostInsert; Update: Partial<PostInsert> };
      post_comments: { Row: PostComment; Insert: PostCommentInsert; Update: Partial<PostCommentInsert> };
      post_reactions: { Row: PostReaction; Insert: PostReactionInsert; Update: Partial<PostReactionInsert> };
      communities: { Row: Community; Insert: CommunityInsert; Update: Partial<CommunityInsert> };
      community_members: { Row: CommunityMember; Insert: Omit<CommunityMember, 'id' | 'joined_at'>; Update: Partial<CommunityMember> };
      room_messages: { Row: RoomMessage; Insert: RoomMessageInsert; Update: Partial<RoomMessageInsert> };
      direct_threads: { Row: DirectThread; Insert: Omit<DirectThread, 'id' | 'created_at'>; Update: Partial<DirectThread> };
      direct_messages: { Row: DirectMessage; Insert: DirectMessageInsert; Update: Partial<DirectMessageInsert> };
      questionnaire_answers: { Row: QuestionnaireAnswer; Insert: Omit<QuestionnaireAnswer, 'id' | 'created_at'>; Update: Partial<QuestionnaireAnswer> };
      trait_scores: { Row: TraitScore; Insert: Omit<TraitScore, 'id'>; Update: Partial<TraitScore> };
      connection_signals: { Row: ConnectionSignal; Insert: Omit<ConnectionSignal, 'id'>; Update: Partial<ConnectionSignal> };
      introductions: { Row: Introduction; Insert: IntroductionInsert; Update: Partial<IntroductionInsert> };
      intro_rooms: { Row: IntroRoom; Insert: Omit<IntroRoom, 'id' | 'created_at'>; Update: Partial<IntroRoom> };
      blocks: { Row: Block; Insert: BlockInsert; Update: Partial<BlockInsert> };
      reports: { Row: Report; Insert: ReportInsert; Update: Partial<ReportInsert> };
      deletion_requests: { Row: DeletionRequest; Insert: Omit<DeletionRequest, 'id'>; Update: Partial<DeletionRequest> };
    };
  };
}
