import { useState, useEffect } from 'react';
import './AgentModal.css';
import { Agent } from '../types';

interface AgentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (agent: any) => void;
    editAgent?: Agent | null;
}

export default function AgentModal({ isOpen, onClose, onSave, editAgent }: AgentModalProps) {
    const [name, setName] = useState('');
    const [apiUrl, setApiUrl] = useState('');
    const [authToken, setAuthToken] = useState('');
    const [projectId, setProjectId] = useState('');

    useEffect(() => {
        if (editAgent) {
            setName(editAgent.name);
            setApiUrl(editAgent.api_url || '');
            setAuthToken(editAgent.auth_token || '');
            setProjectId(editAgent.project_id || '');
        } else {
            setName('');
            setApiUrl('');
            setAuthToken('');
            setProjectId('');
        }
    }, [editAgent, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            name,
            api_url: apiUrl,
            auth_token: authToken,
            project_id: projectId,
        });
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-md" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="chat-agent-icon" style={{ background: 'var(--accent-light)', color: 'var(--accent-primary)', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                            <path d="M2 17l10 5 10-5"></path>
                            <path d="M2 12l10 5 10-5"></path>
                        </svg>
                    </div>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>{editAgent ? 'Edit Agent' : 'Add New Agent'}</h2>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Agent Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Financial Analyst"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Coze API URL</label>
                        <input
                            type="text"
                            value={apiUrl}
                            onChange={(e) => setApiUrl(e.target.value)}
                            placeholder="https://api.coze.com/v3/chat"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Auth Token (Bearer)</label>
                        <input
                            type="password"
                            value={authToken}
                            onChange={(e) => setAuthToken(e.target.value)}
                            placeholder="Your Personal Access Token"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Bot ID / Project ID</label>
                        <input
                            type="text"
                            value={projectId}
                            onChange={(e) => setProjectId(e.target.value)}
                            placeholder="The ID of your published bot"
                            required
                        />
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary">
                            {editAgent ? 'Save Changes' : 'Create Agent'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
