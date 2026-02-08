import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Plus, Settings, Trash2, RefreshCw } from 'lucide-react';

export default function Channels() {
    const channels = useQuery(api.channels.list) ?? [];

    return (
        <div className="fade-in">
            <header className="page-header">
                <div className="page-title">
                    <h1>Channels</h1>
                    <p className="page-description">
                        Manage your connected messaging platforms
                    </p>
                </div>
                <button className="btn btn-primary">
                    <Plus size={16} />
                    Add Channel
                </button>
            </header>

            <div className="channels-grid">
                {channels.map((channel) => (
                    <div key={channel._id} className="channel-card">
                        <div className="channel-header">
                            <div className="channel-info">
                                <div className={`channel-icon ${channel.type}`}>
                                    {channel.type === 'telegram' && '✈️'}
                                    {channel.type === 'discord' && '🎮'}
                                    {channel.type === 'whatsapp' && '💬'}
                                    {channel.type === 'imessage' && '💬'}
                                </div>
                                <div>
                                    <div className="channel-name">{channel.name}</div>
                                    <div className="channel-type">{channel.type}</div>
                                </div>
                            </div>
                            <div className={`status-badge ${channel.status}`}>
                                <span className="status-dot" />
                                {channel.status}
                            </div>
                        </div>

                        {channel.lastError && (
                            <div
                                style={{
                                    padding: 'var(--space-sm)',
                                    background: 'var(--color-error-muted)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '0.75rem',
                                    color: 'var(--color-error)',
                                }}>
                                {channel.lastError}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'auto' }}>
                            {channel.status === 'disconnected' && (
                                <button className="btn btn-primary" style={{ flex: 1 }}>
                                    <RefreshCw size={14} />
                                    Reconnect
                                </button>
                            )}
                            <button className="btn btn-secondary">
                                <Settings size={14} />
                            </button>
                            <button className="btn btn-secondary">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
