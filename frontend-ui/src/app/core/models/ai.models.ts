export interface AiChatRequest {
  prompt: string;
  context?: string;
}

export interface AiChatResponse {
  response: string;
}
