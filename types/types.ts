export type Status = "OFFLINE" | "IN_LOBBY" | "IN_GAME" | "ONLINE";

export type LobbyPrivacy = "PUBLIC" | "PRIVATE";

export type Player = {
  userId: string;
  username: string;
  score: number;
  lives: number;
};

export type Lobby = {
  roomId: string;
  players: Map<string, Player>;
  privacy: LobbyPrivacy;
  maxPlayers: number;
  minPlayers: number;
  password:string | undefined;
  inProgress: boolean
};

export type QuestionSeed = {
  question: string;
  format: Format;
  options: string[];
  correctAnswer: string;
  pointsAwarded: number;
  pointsSubtracted: number;
  timeAwarded: number;
  timeSubtracted: number;
  livesSubtracted: number;
};

export type GameState = {
  roomId: string;
  questions: QuestionSeed[];
  playerProgress: Map<string, PlayerProgress>;
};

export type PlayerProgress = {
  currentIndex: number;
  score: number;
  lives: number;
  time: number;
  timeoutId: ReturnType<typeof setTimeout> | null;
};

export type Format = "MCQ" | "CodeSnippet" | "TrueFalse";
