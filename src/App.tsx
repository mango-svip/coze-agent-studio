import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import './App.css';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import AgentModal from './components/AgentModal';
import ContextPanel from './components/ContextPanel';
import { Agent, CreateAgentInput, Message, Conversation, StreamEvent } from './types';

function App() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showContext, setShowContext] = useState(false);

  // Load agents on mount
  useEffect(() => {
    loadAgents();
  }, []);

  // Load messages when conversation changes
  useEffect(() => {
    if (currentConversation) {
      loadMessages(currentConversation.id);
    } else {
      setMessages([]);
    }
  }, [currentConversation]);

  // Load conversations when agent changes
  useEffect(() => {
    if (selectedAgent) {
      loadConversations(selectedAgent.id);
    } else {
      setConversations([]);
      setCurrentConversation(null);
    }
  }, [selectedAgent]);

  const loadAgents = async () => {
    try {
      const loadedAgents = await invoke<Agent[]>('get_agents');
      setAgents(loadedAgents);
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const loadedMessages = await invoke<Message[]>('get_messages', { conversationId });
      setMessages(loadedMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const loadConversations = async (agentId: string) => {
    try {
      const loadedConversations = await invoke<Conversation[]>('get_conversations', { agentId });
      setConversations(loadedConversations);
      return loadedConversations;
    } catch (error) {
      console.error('Failed to load conversations:', error);
      return [];
    }
  };

  const handleAddAgent = async (input: CreateAgentInput) => {
    try {
      const newAgent = await invoke<Agent>('create_agent', { input });
      setAgents((prev) => [newAgent, ...prev]);
    } catch (error) {
      console.error('Failed to create agent:', error);
      throw error;
    }
  };

  const handleEditAgent = (agent: Agent) => {
    setEditingAgent(agent);
    setIsModalOpen(true);
  };

  const handleUpdateAgent = async (input: CreateAgentInput) => {
    if (!editingAgent) return;

    try {
      const updatedAgent: Agent = {
        ...editingAgent,
        name: input.name,
        api_url: input.api_url,
        auth_token: input.auth_token,
        project_id: input.project_id,
      };

      await invoke('update_agent', { agent: updatedAgent });
      setAgents((prev) => prev.map((a) => (a.id === updatedAgent.id ? updatedAgent : a)));

      // Update selected agent if it's the one being edited
      if (selectedAgent?.id === updatedAgent.id) {
        setSelectedAgent(updatedAgent);
      }
    } catch (error) {
      console.error('Failed to update agent:', error);
      throw error;
    }
  };

  const handleDeleteAgent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;

    try {
      await invoke('delete_agent', { id });
      setAgents((prev) => prev.filter((a) => a.id !== id));
      if (selectedAgent?.id === id) {
        setSelectedAgent(null);
        setCurrentConversation(null);
      }
    } catch (error) {
      console.error('Failed to delete agent:', error);
    }
  };

  const handleSelectAgent = async (agent: Agent) => {
    setSelectedAgent(agent);

    // Load conversations for this agent
    try {
      const agentConversations = await invoke<Conversation[]>('get_conversations', { agentId: agent.id });
      setConversations(agentConversations);

      if (agentConversations.length > 0) {
        // Use the most recent conversation
        setCurrentConversation(agentConversations[0]);
      } else {
        // Create a new conversation
        const newConversation = await invoke<Conversation>('create_conversation', {
          agentId: agent.id,
          title: null,
        });
        setCurrentConversation(newConversation);
        setConversations([newConversation]);
      }
    } catch (error) {
      console.error('Failed to handle conversation:', error);
    }
  };

  const handleCreateConversation = async () => {
    if (!selectedAgent) return;

    try {
      const newConversation = await invoke<Conversation>('create_conversation', {
        agentId: selectedAgent.id,
        title: null,
      });
      setConversations((prev) => [newConversation, ...prev]);
      setCurrentConversation(newConversation);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setCurrentConversation(conversation);
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await invoke('delete_conversation', { id });

      // Update conversation list
      const updatedConversations = conversations.filter(c => c.id !== id);
      setConversations(updatedConversations);

      // If we deleted the current conversation, select another one or create a new one
      if (currentConversation?.id === id) {
        if (updatedConversations.length > 0) {
          setCurrentConversation(updatedConversations[0]);
        } else if (selectedAgent) {
          // Create a new conversation if none left
          const newConversation = await invoke<Conversation>('create_conversation', {
            agentId: selectedAgent.id,
            title: null,
          });
          setCurrentConversation(newConversation);
          setConversations([newConversation]);
        } else {
          setCurrentConversation(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedAgent || !currentConversation) return;

    setIsLoading(true);

    // Create optimistic user message
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: currentConversation.id,
      role: 'user',
      content,
      created_at: Date.now(),
    };

    // Create placeholder assistant message for streaming
    const streamingAssistantMessage: Message = {
      id: `streaming-${Date.now()}`,
      conversation_id: currentConversation.id,
      role: 'assistant',
      content: '',
      created_at: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage, streamingAssistantMessage]);

    // Set up event listener for streaming
    let unlisten: UnlistenFn | null = null;

    try {
      unlisten = await listen<StreamEvent>('chat-stream', (event) => {
        const payload = event.payload;

        switch (payload.event_type) {
          case 'content':
            // Update the streaming message with accumulated content
            if (payload.full_content !== undefined) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === streamingAssistantMessage.id
                    ? { ...msg, content: payload.full_content || '' }
                    : msg
                )
              );
            }
            break;

          case 'tool_call':
            // Add new tool call to the streaming message
            if (payload.tool_call) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === streamingAssistantMessage.id
                    ? {
                      ...msg,
                      tool_calls: [...(msg.tool_calls || []), payload.tool_call!],
                    }
                    : msg
                )
              );
            }
            break;

          case 'tool_result':
            // Update tool call with result
            if (payload.tool_calls) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === streamingAssistantMessage.id
                    ? { ...msg, tool_calls: payload.tool_calls }
                    : msg
                )
              );
            }
            break;

          case 'done':
            // Streaming complete - will reload messages for final state
            break;

          case 'error':
            console.error('Stream error:', payload.content);
            break;
        }
      });

      // Send message to backend (this will trigger streaming events)
      await invoke<string>('send_chat_message', {
        agentId: selectedAgent.id,
        conversationId: currentConversation.id,
        message: content,
      });

      // Reload messages to get the actual saved messages with correct IDs
      await loadMessages(currentConversation.id);

      // Reload conversations to update any auto-generated titles
      if (selectedAgent) {
        const loadedConversations = await loadConversations(selectedAgent.id);
        const updated = loadedConversations.find(c => c.id === currentConversation.id);
        if (updated) {
          setCurrentConversation(updated);
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please check your agent configuration.');
      // Remove the streaming message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== streamingAssistantMessage.id));
    } finally {
      // Clean up the event listener
      if (unlisten) {
        unlisten();
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="app">
      <Sidebar
        agents={agents}
        selectedAgent={selectedAgent}
        onSelectAgent={handleSelectAgent}
        onAddAgent={() => {
          setEditingAgent(null);
          setIsModalOpen(true);
        }}
        onEditAgent={handleEditAgent}
        onDeleteAgent={handleDeleteAgent}
      />
      <main className="main-canvas">
        <ChatArea
          agent={selectedAgent}
          messages={messages}
          conversations={conversations}
          selectedConversation={currentConversation}
          onSendMessage={handleSendMessage}
          onCreateConversation={handleCreateConversation}
          onSelectConversation={handleSelectConversation}
          onDeleteConversation={handleDeleteConversation}
          isLoading={isLoading}
          onToggleContext={() => setShowContext(!showContext)}
        />
      </main>

      <ContextPanel
        isOpen={showContext}
        onClose={() => setShowContext(false)}
        title={selectedAgent ? `Context: ${selectedAgent.name}` : 'Context'}
      >
        <div className="context-placeholder">
          <p className="text-secondary text-sm">Relevant files and execution details will appear here.</p>
        </div>
      </ContextPanel>

      <AgentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAgent(null);
        }}
        onSave={editingAgent ? handleUpdateAgent : handleAddAgent}
        editAgent={editingAgent}
      />
    </div>
  );
}

export default App;
