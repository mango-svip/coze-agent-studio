export interface Agent {
    id: string;
    name: string;
    api_url: string;
    auth_token: string;
    project_id: string;
    created_at: number;
}

export interface CreateAgentInput {
    name: string;
    api_url: string;
    auth_token: string;
    project_id: string;
}

export interface Conversation {
    id: string;
    agent_id: string;
    title: string | null;
    created_at: number;
}

export interface ToolCall {
    id: string;
    tool_name: string;
    tool_input: string;
    tool_output?: string;
    status: 'running' | 'success' | 'error';
}

export interface Message {
    id: string;
    conversation_id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: number;
    tool_calls?: ToolCall[];
}

export interface StreamEvent {
    event_type: 'content' | 'tool_call' | 'tool_result' | 'done' | 'error';
    content?: string;
    tool_call?: ToolCall;
    full_content?: string;
    tool_calls?: ToolCall[];
}
