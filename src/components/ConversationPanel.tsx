import { useState } from 'react';
import './ConversationPanel.css';
import { Conversation } from '../types';

interface ConversationPanelProps {
    conversations: Conversation[];
    selectedConversation: Conversation | null;
    onSelectConversation: (conversation: Conversation) => void;
    onCreateConversation: () => void;
    onRenameConversation: (id: string, title: string) => void;
    onDeleteConversation: (id: string) => void;
}

export default function ConversationPanel({
    conversations,
    selectedConversation,
    onSelectConversation,
    onCreateConversation,
    onRenameConversation,
    onDeleteConversation,
}: ConversationPanelProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const handleStartEdit = (conversation: Conversation) => {
        setEditingId(conversation.id);
        setEditTitle(conversation.title || 'Untitled Conversation');
    };

    const handleSaveEdit = (id: string) => {
        if (editTitle.trim()) {
            onRenameConversation(id, editTitle.trim());
        }
        setEditingId(null);
        setEditTitle('');
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditTitle('');
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp * 1000);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="conversation-panel">
            <div className="conversation-header">
                <h3>History</h3>
                <button className="btn-icon" onClick={onCreateConversation} title="New Chat">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                </button>
            </div>

            <div className="conversation-list">
                {conversations.length === 0 ? (
                    <div className="empty-chat" style={{ padding: '40px 20px', minHeight: 'auto' }}>
                        <p className="text-secondary text-xs">No active chats</p>
                    </div>
                ) : (
                    conversations.map((conversation) => (
                        <div
                            key={conversation.id}
                            className={`conversation-item ${selectedConversation?.id === conversation.id ? 'active' : ''}`}
                            onClick={() => !editingId && onSelectConversation(conversation)}
                        >
                            {editingId === conversation.id ? (
                                <div className="conversation-edit">
                                    <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveEdit(conversation.id);
                                            if (e.key === 'Escape') handleCancelEdit();
                                        }}
                                        autoFocus
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    <div className="edit-actions">
                                        <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handleSaveEdit(conversation.id); }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12"></polyline>
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="conversation-info">
                                        <div className="conversation-title truncate">
                                            {conversation.title || 'Untitled Chat'}
                                        </div>
                                        <div className="conversation-date">
                                            {formatDate(conversation.created_at)}
                                        </div>
                                    </div>
                                    <div className="conversation-actions">
                                        <button
                                            className="btn-icon"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleStartEdit(conversation);
                                            }}
                                            title="Rename"
                                        >
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                            </svg>
                                        </button>
                                        <button
                                            className={`btn-icon btn-delete ${confirmDeleteId === conversation.id ? 'confirming' : ''}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirmDeleteId === conversation.id) {
                                                    onDeleteConversation(conversation.id);
                                                    setConfirmDeleteId(null);
                                                } else {
                                                    setConfirmDeleteId(conversation.id);
                                                    // Auto reset after 3 seconds
                                                    setTimeout(() => setConfirmDeleteId(null), 3000);
                                                }
                                            }}
                                            title={confirmDeleteId === conversation.id ? "Click again to confirm" : "Delete"}
                                        >
                                            {confirmDeleteId === conversation.id ? (
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--error-color, #ff4d4f)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12"></polyline>
                                                </svg>
                                            ) : (
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="3 6 5 6 21 6"></polyline>
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
