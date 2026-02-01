import { useState, useRef, useEffect } from 'react';
import './ChatArea.css';
import MessageBubble from './MessageBubble';
import { Message, Agent } from '../types';

interface ChatAreaProps {
    agent: Agent | null;
    messages: Message[];
    isLoading: boolean;
    onSendMessage: (message: string) => Promise<void>;
    onCreateConversation: () => void;
}

export default function ChatArea({
    agent,
    messages,
    isLoading,
    onSendMessage,
    onCreateConversation,
}: ChatAreaProps) {
    const [input, setInput] = useState('');
    const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleScroll = () => {
        if (!containerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        // If user is within 100px of bottom, enable auto-scroll
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
        setShouldAutoScroll(isAtBottom);
    };

    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    };

    useEffect(() => {
        const lastMessage = messages[messages.length - 1];
        const isUserMessage = lastMessage?.role === 'user';

        if (shouldAutoScroll || isUserMessage) {
            scrollToBottom(isUserMessage ? 'auto' : 'smooth');
        }
    }, [messages]);

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
                <div className="chat-header">
                    <div className="chat-agent-info">
                        <div className="chat-agent-name">{agent.name}</div>
                        <div className="chat-status-badge">
                            <div className="status-dot-green"></div>
                            <span>Ready</span>
                        </div>
                    </div>
                    <div className="chat-header-actions">
                        <button className="btn-icon" title="Share">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                                <polyline points="16 6 12 2 8 6"></polyline>
                                <line x1="12" y1="2" x2="12" y2="15"></line>
                            </svg>
                        </button>
                        <button className="btn-icon" onClick={onCreateConversation} title="New Chat">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="messages-container" ref={containerRef} onScroll={handleScroll}>
                    {messages.length === 0 ? (
                        <div className="empty-state-canvas">
                            <div className="agent-avatar-large">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                                </svg>
                            </div>
                            <h2>{agent.name}</h2>
                            <p>How can I help you today?</p>
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
                <div className="input-outer-container">
                    <div className="input-composer-card">
                        <button type="button" className="composer-action-btn" title="Add">
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
                            placeholder="输入内容 (Input content...)"
                            className="composer-textarea"
                            rows={1}
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleSubmit}
                            className="composer-send-btn"
                            disabled={!input.trim() || isLoading}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="19" x2="12" y2="5"></line>
                                <polyline points="5 12 12 5 19 12"></polyline>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div >
    );
}
