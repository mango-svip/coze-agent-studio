import { useState } from 'react';
import './ToolCallChain.css';
import { ToolCall } from '../types';

interface ToolCallChainProps {
    toolCalls: ToolCall[];
}

export default function ToolCallChain({ toolCalls }: ToolCallChainProps) {
    const [isChainExpanded, setIsChainExpanded] = useState(true);
    const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

    if (!toolCalls || toolCalls.length === 0) return null;

    const toggleChain = () => setIsChainExpanded(!isChainExpanded);

    const toggleExpand = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedItems(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const formatJson = (input: string): string => {
        try {
            const parsed = JSON.parse(input);
            return JSON.stringify(parsed, null, 2);
        } catch {
            return input;
        }
    };

    const runningCount = toolCalls.filter(tc => tc.status === 'running').length;

    return (
        <div className="tool-call-chain">
            <div className={`tool-chain-header ${isChainExpanded ? 'expanded' : ''}`} onClick={toggleChain}>
                <div className="tool-chain-summary">
                    <div className="status-badge">
                        {runningCount > 0 ? (
                            <div className="shimmer-pulse" />
                        ) : (
                            <div className="status-dot success" />
                        )}
                        <span className="tool-chain-title">
                            {runningCount > 0
                                ? `Processing (${toolCalls.length} tools)`
                                : `Execution Flow (${toolCalls.length} steps)`}
                        </span>
                    </div>
                </div>
                <svg
                    className={`chain-expand-icon ${isChainExpanded ? 'rotated' : ''}`}
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                >
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </div>

            {isChainExpanded && (
                <div className="tool-calls-grid">
                    {toolCalls.map((toolCall, index) => {
                        const isExpanded = expandedItems[toolCall.id] ?? false;
                        const hasDetails = toolCall.tool_input || toolCall.tool_output;
                        const isLast = index === toolCalls.length - 1;

                        return (
                            <div key={toolCall.id} className={`tool-call-card ${toolCall.status} ${isExpanded ? 'open' : ''}`}>
                                {!isLast && <div className="timeline-connector" />}
                                <div className="card-header" onClick={(e) => hasDetails && toggleExpand(toolCall.id, e)}>
                                    <div className="tool-id-tag">#{index + 1}</div>
                                    <div className="tool-info">
                                        <div className="tool-name">{toolCall.tool_name}</div>
                                        <div className="tool-status-label">
                                            {toolCall.status === 'running' ? 'Running...' : 'Completed'}
                                        </div>
                                    </div>
                                    {hasDetails && (
                                        <div className={`details-toggle ${isExpanded ? 'active' : ''}`}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                <polyline points="6 9 12 15 18 9"></polyline>
                                            </svg>
                                        </div>
                                    )}
                                </div>

                                {isExpanded && (
                                    <div className="tool-card-details">
                                        {toolCall.tool_input && (
                                            <div className="detail-row">
                                                <div className="detail-label">Parameters</div>
                                                <div className="detail-code">
                                                    <pre><code>{formatJson(toolCall.tool_input)}</code></pre>
                                                </div>
                                            </div>
                                        )}
                                        {toolCall.tool_output && (
                                            <div className="detail-row">
                                                <div className="detail-label">Response</div>
                                                <div className="detail-code output">
                                                    <pre><code>{toolCall.tool_output}</code></pre>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
