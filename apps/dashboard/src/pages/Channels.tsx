import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Plus, Settings, Trash2, RefreshCw, X } from 'lucide-react';

export default function Channels() {
    const channels = useQuery(api.channels.list) ?? [];
    const createChannel = useMutation(api.channels.create);
    const removeChannel = useMutation(api.channels.remove);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        type: 'telegram',
        name: '',
        token: '',
        guildIds: '', // For Discord
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const credentials: any = { token: formData.token };
            if (formData.type === 'discord' && formData.guildIds) {
                credentials.guildIds = formData.guildIds.split(',').map(id => id.trim()).filter(Boolean);
            }

            await createChannel({
                type: formData.type as any,
                name: formData.name,
                credentials: JSON.stringify(credentials),
                metadata: {},
            });

            setIsModalOpen(false);
            setFormData({ type: 'telegram', name: '', token: '', guildIds: '' });
        } catch (error) {
            console.error('Failed to create channel:', error);
            alert('Failed to create channel. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: any) => {
        if (confirm('Are you sure you want to delete this channel?')) {
            await removeChannel({ id });
        }
    };

    return (
        <div className="fade-in">
            <header className="page-header">
                <div className="page-title">
                    <h1>Channels</h1>
                    <p className="page-description">
                        Manage your connected messaging platforms
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
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
                                }}
                            >
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
                            <button className="btn btn-secondary" onClick={() => handleDelete(channel._id)}>
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Channel Modal */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    backdropFilter: 'blur(4px)'
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: '500px', animation: 'fadeIn 0.2s ease' }}>
                        <div className="card-header">
                            <h2 className="card-title">Add New Channel</h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Channel Type</label>
                                <select
                                    className="btn btn-secondary"
                                    style={{ width: '100%', justifyContent: 'space-between', textAlign: 'left' }}
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="telegram">Telegram</option>
                                    <option value="discord">Discord</option>
                                    <option value="whatsapp">WhatsApp</option>
                                    <option value="imessage">iMessage</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Name</label>
                                <input
                                    type="text"
                                    placeholder="My Channel"
                                    className="btn btn-secondary"
                                    style={{ width: '100%', textAlign: 'left', cursor: 'text' }}
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}> {formData.type === 'discord' ? 'Bot Token' : 'Access Token'} </label>
                                <input
                                    type="password"
                                    placeholder="Token..."
                                    className="btn btn-secondary"
                                    style={{ width: '100%', textAlign: 'left', cursor: 'text' }}
                                    value={formData.token}
                                    onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                                    required
                                />
                            </div>

                            {formData.type === 'discord' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                                    <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Guild IDs (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="Comma-separated IDs..."
                                        className="btn btn-secondary"
                                        style={{ width: '100%', textAlign: 'left', cursor: 'text' }}
                                        value={formData.guildIds}
                                        onChange={(e) => setFormData({ ...formData, guildIds: e.target.value })}
                                    />
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                        Leave empty to listen to all guilds the bot is in.
                                    </span>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isSubmitting}>
                                    {isSubmitting ? 'Creating...' : 'Create Channel'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
