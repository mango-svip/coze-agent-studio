import { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './ChatArea.css';
import MessageBubble from './MessageBubble';
import ConversationPanel from './ConversationPanel';
import { Message, Agent, Conversation } from '../types';

interface ChatAreaProps {
    agent: Agent | null;
    messages: Message[];
    conversations: Conversation[];
    selectedConversation: Conversation | null;
    onSendMessage: (message: string) => Promise<void>;
    onCreateConversation: () => void;
    onSelectConversation: (conversation: Conversation) => void;
    onDeleteConversation: (id: string) => void;
    isLoading: boolean;
    onToggleContext: () => void;
}

export default function ChatArea({
    agent,
    messages,
    conversations,
    selectedConversation,
    onSendMessage,
    onCreateConversation,
    onSelectConversation,
    onDeleteConversation,
    isLoading,
    onToggleContext
}: ChatAreaProps) {
    const [input, setInput] = useState('');
    const [showConversations, setShowConversations] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                textareaRef.current?.focus();
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading || !agent) return;

        const message = input.trim();
        setInput('');

        // Reset textarea height
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }

        await onSendMessage(message);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);

        // Auto-resize textarea
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
    };

    const handleRenameConversation = async (id: string, title: string) => {
        try {
            const conversation = conversations.find(c => c.id === id);
            if (!conversation) return;

            const updated = { ...conversation, title };
            await invoke('update_conversation', { conversation: updated });
            // Parent component will reload conversations
        } catch (error) {
            console.error('Failed to rename conversation:', error);
        }
    };




    if (!agent) {
        return (
            <div className="chat-area">
                <div className="empty-chat">
                    <div className="empty-icon">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                    </div>
                    <h2>Welcome to Coze Studio</h2>
                    <p className="text-secondary">Select an agent from the sidebar or create a new one to get started</p>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-area">
            <div className="chat-content">
                <div className="chat-header glass">
                    <div className="chat-agent-info">
                        <div className="chat-agent-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                                <path d="M2 17l10 5 10-5"></path>
                                <path d="M2 12l10 5 10-5"></path>
                            </svg>
                        </div>
                        <div className="chat-agent-name">{agent.name}</div>
                        <div className="chat-status-indicator">
                            <div className={`status-dot ${isLoading ? 'thinking' : 'ready'}`}></div>
                            <span className="status-text">
                                {isLoading ? 'Thinking...' : 'Ready'}
                            </span>
                        </div>
                    </div>
                    <div className="chat-header-actions">
                        <button
                            className="btn-icon"
                            onClick={onToggleContext}
                            title="Execution Context"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="9" y1="3" x2="9" y2="21"></line>
                                <path d="M15 9l-3 3 3 3"></path>
                            </svg>
                        </button>
                        <button
                            className="btn-icon"
                            onClick={onCreateConversation}
                            title="New Chat"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        </button>
                        <button
                            className={`btn-icon ${showConversations ? 'active' : ''}`}
                            onClick={() => setShowConversations(!showConversations)}
                            title="History"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="messages-container">
                    {messages.length === 0 ? (
                        <div className="empty-messages-placeholder">
                            <div className="empty-agent-icon">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="12" fill="#0084FF" />
                                    <path d="M7 8H17M7 12H13M7 16H11" stroke="white" strokeWidth="2" strokeLinecap="round" />
                                    <path d="M15 13.5C15 13.5 16 13.5 17 14.5C18 15.5 18 17 18 17H12V13.5H15Z" fill="white" opacity="0.8" />
                                </svg>
                            </div>
                            <h2 className="empty-agent-name">{agent.name}</h2>
                            <p className="empty-agent-hint">在输入框中输入消息测试 Agent 回复效果</p>
                        </div>
                    ) : (
                        messages.map((message) => (
                            <MessageBubble
                                key={message.id}
                                message={message}
                                isStreaming={isLoading && message.id.startsWith('streaming-')}
                                agentName={agent?.name}
                            />

                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <div className="messages-bottom-mask"></div>

                <div className="input-area">
                    <form onSubmit={handleSubmit} className="input-form">
                        <div className="input-container">
                            <button type="button" className="add-button" title="Upload File">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                            </button>
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={handleInput}
                                onKeyDown={handleKeyDown}
                                placeholder="输入内容"
                                className="message-input"
                                rows={1}
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                className="send-button-new"
                                disabled={!input.trim() || isLoading}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="19" x2="12" y2="5"></line>
                                    <polyline points="5 12 12 5 19 12"></polyline>
                                </svg>
                            </button>
                        </div>

                    </form>
                </div>
            </div>



            {
                showConversations && agent && (
                    <ConversationPanel
                        conversations={conversations}
                        selectedConversation={selectedConversation}
                        onSelectConversation={onSelectConversation}
                        onCreateConversation={onCreateConversation}
                        onRenameConversation={handleRenameConversation}
                        onDeleteConversation={onDeleteConversation}
                    />

                )
            }
        </div >
    );
}
