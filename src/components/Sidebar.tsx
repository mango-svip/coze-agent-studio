import { useState } from 'react';
import './Sidebar.css';
import { Agent } from '../types';
import ThemeToggle from './ThemeToggle';

interface SidebarProps {
    agents: Agent[];
    selectedAgent: Agent | null;
    onSelectAgent: (agent: Agent) => void;
    onAddAgent: () => void;
    onEditAgent: (agent: Agent) => void;
    onDeleteAgent: (id: string) => void;
}

export default function Sidebar({
    agents,
    selectedAgent,
    onSelectAgent,
    onAddAgent,
    onEditAgent,
    onDeleteAgent,
}: SidebarProps) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className={`sidebar ${isHovered ? 'expanded' : 'collapsed'}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="sidebar-header">
                <div className="sidebar-brand">
                    <div className="brand-logo">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                            <path d="M2 17l10 5 10-5"></path>
                            <path d="M2 12l10 5 10-5"></path>
                        </svg>
                    </div>
                    <h1 className="sidebar-title">Agent Studio</h1>
                </div>
                <div className="sidebar-actions">
                    <ThemeToggle />
                    <button className="btn-icon" onClick={onAddAgent} title="Add Agent">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>
                </div>
            </div>

            <div className="agent-list">
                {agents.length === 0 ? (
                    <div className="empty-state">
                        <p className="text-secondary text-sm">No agents found</p>
                    </div>
                ) : (
                    agents.map((agent) => (
                        <div
                            key={agent.id}
                            className={`agent-item ${selectedAgent?.id === agent.id ? 'active' : ''}`}
                            onClick={() => onSelectAgent(agent)}
                            title={!isHovered ? agent.name : ''}
                        >
                            <div className="agent-info">
                                <div className="agent-icon">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                                        <path d="M2 17l10 5 10-5"></path>
                                        <path d="M2 12l10 5 10-5"></path>
                                    </svg>
                                </div>
                                <div className="agent-details">
                                    <div className="agent-name truncate">{agent.name}</div>
                                    <div className="agent-url text-xs truncate">{new URL(agent.api_url).hostname}</div>
                                </div>
                            </div>
                            <div className="agent-item-actions">
                                <button
                                    className="btn-icon btn-edit"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEditAgent(agent);
                                    }}
                                    title="Edit"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                </button>
                                <button
                                    className="btn-icon btn-delete"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteAgent(agent.id);
                                    }}
                                    title="Delete"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="sidebar-footer">
                <div className="footer-content">
                    <span className="agent-count">
                        {agents.length} Agent{agents.length !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>
        </div>
    );
}
