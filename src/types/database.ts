export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          email: string;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      trips: {
        Row: {
          id: string;
          name: string;
          destination: string;
          emoji: string;
          start_date: string | null;
          end_date: string | null;
          cover_image: string | null;
          phase: 'planning' | 'live' | 'review';
          created_by: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['trips']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['trips']['Insert']>;
      };
      trip_members: {
        Row: {
          id: string;
          trip_id: string;
          user_id: string;
          role: 'owner' | 'member';
          joined_at: string;
        };
        Insert: Omit<Database['public']['Tables']['trip_members']['Row'], 'id' | 'joined_at'>;
        Update: Partial<Database['public']['Tables']['trip_members']['Insert']>;
      };
      itinerary_items: {
        Row: {
          id: string;
          trip_id: string;
          day: number;
          time: string;
          title: string;
          emoji: string;
          type: 'accommodation' | 'activity' | 'food' | 'transport';
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['itinerary_items']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['itinerary_items']['Insert']>;
      };
      expenses: {
        Row: {
          id: string;
          trip_id: string;
          title: string;
          amount: number;
          currency: string;
          category: string;
          emoji: string;
          paid_by: string;
          split_with: string[];
          receipt_url: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['expenses']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['expenses']['Insert']>;
      };
      polls: {
        Row: {
          id: string;
          trip_id: string;
          question: string;
          emoji: string;
          is_active: boolean;
          created_by: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['polls']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['polls']['Insert']>;
      };
      poll_options: {
        Row: {
          id: string;
          poll_id: string;
          text: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['poll_options']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['poll_options']['Insert']>;
      };
      poll_votes: {
        Row: {
          id: string;
          poll_id: string;
          option_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['poll_votes']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['poll_votes']['Insert']>;
      };
      packing_items: {
        Row: {
          id: string;
          trip_id: string;
          user_id: string;
          name: string;
          emoji: string;
          category: string;
          packed: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['packing_items']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['packing_items']['Insert']>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          trip_id: string | null;
          type: 'trip_invite' | 'expense_added' | 'poll_created' | 'itinerary_update' | 'member_joined' | 'reminder';
          title: string;
          body: string;
          emoji: string;
          read: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
      };
      journal_entries: {
        Row: {
          id: string;
          trip_id: string;
          day: number;
          text: string;
          mood: string | null;
          photos: string[];
          created_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['journal_entries']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['journal_entries']['Insert']>;
      };
      bookings: {
        Row: {
          id: string;
          trip_id: string;
          type: string;
          title: string;
          confirmation_code: string | null;
          start_date: string | null;
          end_date: string | null;
          amount: number | null;
          currency: string;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['bookings']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['bookings']['Insert']>;
      };
    };
  };
}

// Convenience type aliases
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Trip = Database['public']['Tables']['trips']['Row'];
export type TripMember = Database['public']['Tables']['trip_members']['Row'];
export type ItineraryItem = Database['public']['Tables']['itinerary_items']['Row'];
export type Expense = Database['public']['Tables']['expenses']['Row'];
export type Poll = Database['public']['Tables']['polls']['Row'];
export type PollOption = Database['public']['Tables']['poll_options']['Row'];
export type PollVote = Database['public']['Tables']['poll_votes']['Row'];
export type PackingItem = Database['public']['Tables']['packing_items']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];
export type JournalEntry = Database['public']['Tables']['journal_entries']['Row'];
export type Booking = Database['public']['Tables']['bookings']['Row'];
