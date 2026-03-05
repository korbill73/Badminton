export type BDCategoryType = 'singles' | 'doubles';
export type BDMatchResultType = 'win' | 'loss';

export type BDPointType =
  | 'smash_winner'
  | 'drop_winner'
  | 'net_kill'
  | 'drive_winner'
  | 'hairpin_winner'
  | 'clear_winner'
  | 'push_winner'
  | 'unforced_error'
  | 'out_error'
  | 'net_error'
  | 'service_fault'
  | 'receive_error'
  | 'opponent_winner';

export interface BDPlayer {
  id: string;
  name: string;
  school_or_team?: string;
  birth_year?: number;
  created_at: string;
}

export interface BDTournament {
  id: string;
  name: string;
  location?: string;
  result?: string;
  start_date?: string;
  end_date?: string;
  created_at: string;
}

export interface BDMatch {
  id: string;
  tournament_id: string;
  match_name?: string;
  match_date: string;
  category: BDCategoryType;
  partner_id?: string;
  opponent_1_id: string;
  opponent_2_id?: string;
  my_set_score: number;
  opponent_set_score: number;
  match_result: BDMatchResultType;
  youtube_video_id?: string;
  feedback_notes?: string;
  created_at: string;

  // Joins
  tournament?: BDTournament;
  partner?: BDPlayer;
  opponent_1?: BDPlayer;
  opponent_2?: BDPlayer;
}

export interface BDPointLog {
  id: string;
  match_id: string;
  set_number: number;
  current_score: string;
  is_my_point: boolean;
  point_type: BDPointType | string;
  video_timestamp?: number;
  created_at: string;
}

// Chart Data Types
export interface MomentumData {
  rallyIndex: number;
  scoreGap: number;
  score: string;
  isMyPoint: boolean;
}
