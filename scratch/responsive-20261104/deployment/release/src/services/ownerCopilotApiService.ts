import { apiClient } from "./apiClient";
import { isAxiosError } from "axios";

export interface CopilotMessage {
  id?: string;
  role: "user" | "model" | "assistant";
  content: string;
  timestamp?: string;
  actionLinks?: CopilotActionLink[];
}

export interface CopilotActionLink {
  label: string;
  action: "open_module" | "open_report";
  target: string;
  description?: string;
}

export interface CopilotChatResponse {
  reply: string;
  toolsUsed: string[];
  actionLinks: CopilotActionLink[];
}

export interface CopilotChatPayload {
  messages: Array<{ role: "user" | "model" | "assistant"; content: string }>;
  portalContext?: {
    activeModule?: string;
    activeTab?: string;
  };
}

export const ownerCopilotApiService = {
  async sendMessage(
    messages: Array<{ role: "user" | "model" | "assistant"; content: string }>,
    portalContext?: { activeModule?: string; activeTab?: string }
  ): Promise<CopilotChatResponse> {
    try {
      const payload: CopilotChatPayload = {
        messages,
        portalContext,
      };

      const response = await apiClient.post<CopilotChatResponse>(
        "/owner/copilot/chat",
        payload,
        {
          timeout: 45000, // 45 seconds for Gemini multi-turn tool chain
        }
      );

      return response.data;
    } catch (err: unknown) {
      const status = isAxiosError(err) ? err.response?.status : undefined;
      if (status === 429) {
        return {
          reply:
            "One moment, Boss. Please wait a minute, then ask me again.",
          toolsUsed: [],
          actionLinks: [],
        };
      }

      if (status === 401 || status === 403) {
        return {
          reply:
            "Please sign in to your owner account again, then try your question.",
          toolsUsed: [],
          actionLinks: [],
        };
      }

      return {
        reply: "Sorry, Boss. I couldn't get an answer right now. Check your connection and try again.",
        toolsUsed: [],
        actionLinks: [],
      };
    }
  },
};
