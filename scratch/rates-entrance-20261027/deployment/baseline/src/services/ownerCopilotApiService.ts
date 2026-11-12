import { apiClient } from "./apiClient";

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
    } catch (err: any) {
      if (err?.response?.status === 429) {
        return {
          reply:
            "Medyo mabilis ang mga requests, Boss. Please wait about a minute before asking Kuya Sugo again so our system quota can cool down.",
          toolsUsed: [],
          actionLinks: [],
        };
      }

      if (err?.response?.status === 401 || err?.response?.status === 403) {
        return {
          reply:
            "Your owner session may have timed out or lacks permission. Please refresh your page or sign in again.",
          toolsUsed: [],
          actionLinks: [],
        };
      }

      const errorMessage =
        err?.response?.data?.error ||
        err?.message ||
        "Could not connect to Kuya Sugo right now. Please check your network connection and try again.";

      return {
        reply: `Pasensya na, Boss. ${errorMessage}`,
        toolsUsed: [],
        actionLinks: [],
      };
    }
  },
};
