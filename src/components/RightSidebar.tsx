import React from 'react';
import './RightSidebar.css';
import { Conversation, Agent } from '../types';

interface RightSidebarProps {
    agents: Agent[];
    selectedAgent: Agent | null;
    onSelectAgent: (agent: Agent) => void;
    onAddAgent: () => void;
    onEditAgent: (agent: Agent) => void;
    onDeleteAgent: (id: string) => void;
    conversations: Conversation[];
    selectedConversation: Conversation | null;
    onSelectConversation: (conversation: Conversation) => void;
    onCreateConversation: () => void;
    onDeleteConversation: (id: string) => void;
}

const RightSidebar: React.FC<RightSidebarProps> = ({
    agents,
    selectedAgent,
    onSelectAgent,
    onAddAgent,
    onEditAgent,
    onDeleteAgent,
    conversations,
    selectedConversation,
    onSelectConversation,
    onCreateConversation,
    onDeleteConversation,
}) => {
    return (
        <div className="right-sidebar">
            <div className="agents-section">
                <div className="section-header">
                    <h3>Agents</h3>
                    <button className="btn-icon-sm" onClick={onAddAgent} title="Add Agent">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>
                </div>
                <div className="agents-list">
                    {agents.map((agent) => (
                        <div
                            key={agent.id}
                            className={`agent-item ${selectedAgent?.id === agent.id ? 'active' : ''}`}
                            onClick={() => onSelectAgent(agent)}
                        >
                            <div className="agent-avatar-sm">
                                {agent.name.charAt(0)}
                            </div>
                            <span className="agent-name truncate">{agent.name}</span>
                            <div className="agent-actions">
                                <button
                                    className="btn-icon-xs"
                                    onClick={(e) => { e.stopPropagation(); onEditAgent(agent); }}
                                    title="Edit"
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                </button>
                                <button
                                    className="btn-icon-xs btn-delete-agent"
                                    onClick={(e) => { e.stopPropagation(); onDeleteAgent(agent.id); }}
                                    title="Delete"
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path></svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="history-section">
                <div className="section-header">
                    <h3>History</h3>
                    <button className="btn-icon-sm" onClick={onCreateConversation} title="New Chat">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>
                </div>

                <div className="conversation-list">
                    {conversations.map((conv) => (
                        <div
                            key={conv.id}
                            className={`conversation-item ${selectedConversation?.id === conv.id ? 'active' : ''}`}
                            onClick={() => onSelectConversation(conv)}
                        >
                            <div className="conv-title truncate">{conv.title || 'Untitled Conversation'}</div>
                            <div className="conv-meta">
                                <span>{new Date(conv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                <button
                                    className="btn-delete-conv"
                                    onClick={(e) => { e.stopPropagation(); onDeleteConversation(conv.id); }}
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path></svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default RightSidebar;
