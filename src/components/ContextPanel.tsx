import './ContextPanel.css';

interface ContextPanelProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
}

export default function ContextPanel({ isOpen, onClose, title = 'Context', children }: ContextPanelProps) {
    return (
        <>
            <div className={`context-panel-overlay ${isOpen ? 'show' : ''}`} onClick={onClose} />
            <div className={`context-panel ${isOpen ? 'open' : ''}`}>
                <div className="panel-header">
                    <h3 className="panel-title">{title}</h3>
                    <button className="btn-icon" onClick={onClose}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div className="panel-content">
                    {children}
                </div>
            </div>
        </>
    );
}
