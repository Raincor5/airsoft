// src/types/index.ts
export interface Player {
    id: string;
    name: string;
    teamId?: string;
    location?: {
      latitude: number;
      longitude: number;
      heading: number;
      timestamp: number;
    };
    isOnline: boolean;
  }
  
  export interface Team {
    id: string;
    name: string;
    color: string;
    players: string[];
  }
  
  export interface GamePin {
    id: string;
    type: string;
    name: string;
    coordinate: {
      latitude: number;
      longitude: number;
    };
    playerId: string;
    teamId?: string;
    timestamp: string;
  }
  
  export interface GameSession {
    id: string;
    name: string;
    hostId: string;
    players: Record<string, Player>;
    teams: Record<string, Team>;
    pins: GamePin[];
    isActive: boolean;
  }