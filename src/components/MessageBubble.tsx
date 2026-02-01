import { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ToolCallChain from './ToolCallChain';
import './MessageBubble.css';
import { Message } from '../types';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';

interface MessageBubbleProps {
    message: Message;
    isStreaming?: boolean;
    agentName?: string;
}


export default function MessageBubble({ message, isStreaming = false, agentName }: MessageBubbleProps) {

    const [showActions, setShowActions] = useState(false);
    const isUser = message.role === 'user';
    const messageRef = useRef<HTMLDivElement>(null);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const exportAsImage = async () => {
        if (messageRef.current) {
            try {
                const canvas = await html2canvas(messageRef.current, {
                    backgroundColor: document.documentElement.getAttribute('data-theme') === 'light' ? '#FAFAF9' : '#0C0A09'
                });
                canvas.toBlob((blob) => {
                    if (blob) {
                        saveAs(blob, `message-${message.id}.png`);
                    }
                });
            } catch (error) {
                console.error('Failed to export image:', error);
            }
        }
    };


    const renderContent = (content: string) => {
        const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

        return (
            <div className="markdown-content">
                <ReactMarkdown
                    components={{
                        code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                                <div className="code-block-container">
                                    <div className="code-block-header">
                                        <span className="code-lang">{match[1]}</span>
                                        <button className="copy-code-btn" onClick={() => copyToClipboard(String(children).replace(/\n$/, ''))}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
                                            </svg>
                                        </button>
                                    </div>
                                    <SyntaxHighlighter
                                        style={isDark ? vscDarkPlus : vs}
                                        language={match[1]}
                                        PreTag="div"
                                        {...props}
                                    >
                                        {String(children).replace(/\n$/, '')}
                                    </SyntaxHighlighter>
                                </div>
                            ) : (
                                <code className={className} {...props}>
                                    {children}
                                </code>
                            );
                        },
                        table({ children }) {
                            return (
                                <div className="table-container">
                                    <table>{children}</table>
                                </div>
                            );
                        }
                    }}
                >
                    {content}
                </ReactMarkdown>
            </div>
        );
    };

    return (
        <div
            ref={messageRef}
            id={`message-${message.id}`}
            className={`message-bubble-wrapper ${isUser ? 'user' : 'assistant'} ${isStreaming ? 'streaming' : ''}`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            <div className="message-bubble">
                {!isUser && (
                    <div className="message-header">
                        <div className="message-avatar">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="12" fill="var(--accent-primary)" />
                                <path d="M7 8H17M7 12H13M7 16H11" stroke="white" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </div>
                        <span className="message-agent-name">{agentName || 'Agent'}</span>

                        {showActions && (
                            <div className="message-actions fade-in">
                                <button className="btn-icon-xs" onClick={() => copyToClipboard(message.content)} title="Copy">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path></svg>
                                </button>
                                <button className="btn-icon-xs" onClick={exportAsImage} title="Image">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {isUser && (
                    <div className="user-message-header">
                        {showActions && (
                            <div className="message-actions user-actions">
                                <button className="btn-icon-xs" onClick={() => copyToClipboard(message.content)}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path></svg>
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {!isUser && message.tool_calls && message.tool_calls.length > 0 && (
                    <ToolCallChain toolCalls={message.tool_calls} />
                )}

                <div className="message-content">
                    {!isUser && isStreaming && !message.content ? (
                        <div className="thinking-bubble">
                            <span className="thinking-dot"></span>
                            <span className="thinking-dot"></span>
                            <span className="thinking-dot"></span>
                        </div>
                    ) : (
                        <>
                            {renderContent(message.content)}
                            {isStreaming && <span className="typing-cursor">▋</span>}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
