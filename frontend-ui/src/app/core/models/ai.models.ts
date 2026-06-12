export interface AiChatRequest {
  prompt: string;
  context?: string;
}

export interface AiChatResponse {
  response: string;
  dutiesChanged?: boolean;
  actionResults?: string[];
  actions?: any[];
}

export interface AiChatResult {
  text: string;
  dutiesChanged: boolean;
  actions?: any[];
}
