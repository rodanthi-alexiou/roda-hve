// Shared types mirroring the API response shape.

export interface ArtworkCard {
  objectID: number;
  title: string;
  artist: string;
  date: string;
  medium: string;
  department: string;
  culture: string;
  image: string;
  thumbnail: string;
  url: string;
}

export interface ChatResponse {
  reply: string;
  cards: ArtworkCard[];
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}
