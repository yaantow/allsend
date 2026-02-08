import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import {
    MessageSquare,
    Radio,
    Users,
    Activity,
    TrendingUp,
    ArrowUpRight,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Dashboard() {
    const channels = useQuery(api.channels.list) ?? [];
    const messages = useQuery(api.messages.list, { limit: 10 }) ?? [];
    const stats = useQuery(api.messages.stats) ?? {
        totalMessages: 0,
        todayMessages: 0,
        connectedChannels: 0,
        totalChannels: 0,
    };

    return (
        <div className="fade-in">
            <header className="page-header">
                <div className="page-title">
                    <h1>Dashboard</h1>
                    <p className="page-description">
                        Overview of your multi-channel communication hub
                    </p>
                </div>
                <button className="btn btn-primary">
                    <Radio size={16} />
                    Add Channel
                </button>
            </header>

            {/* Stats Grid */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon primary">
                        <MessageSquare size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Total Messages</span>
                        <span className="stat-value">{stats.totalMessages.toLocaleString()}</span>
                        <span className="stat-change positive">
                            <TrendingUp size={12} />
                            +12.5% from last week
                        </span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon primary">
                        <Radio size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Active Channels</span>
                        <span className="stat-value">{stats.connectedChannels} / {stats.totalChannels}</span>
                        <span className="stat-change positive">
                            <ArrowUpRight size={12} />
                            All systems operational
                        </span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon primary">
                        <Users size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Messages Today</span>
                        <span className="stat-value">{stats.todayMessages}</span>
                        <span className="stat-change positive">
                            <TrendingUp size={12} />
                            Real-time tracking
                        </span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon primary">
                        <Activity size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Events Today</span>
                        <span className="stat-value">{stats.todayMessages.toLocaleString()}</span>
                        <span className="stat-change positive">
                            <TrendingUp size={12} />
                            Real-time monitoring
                        </span>
                    </div>
                </div>
            </div>

            {/* Connected Channels */}
            <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
                <div className="card-header">
                    <h3 className="card-title">Connected Channels</h3>
                    <button className="btn btn-secondary">View All</button>
                </div>

                <div className="channels-grid">
                    {channels.map((channel) => (
                        <ChannelCard
                            key={channel._id}
                            name={channel.name}
                            type={channel.type}
                            status={channel.status}
                        />
                    ))}
                </div>
            </div>

            {/* Recent Messages */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">Recent Messages</h3>
                    <button className="btn btn-secondary">View All</button>
                </div>

                <div className="message-list">
                    {messages.map((msg) => (
                        <div key={msg._id} className="message-item">
                            <div className="message-avatar">
                                {msg.senderName.charAt(0)}
                            </div>
                            <div className="message-content">
                                <div className="message-header">
                                    <span className="message-sender">{msg.senderName}</span>
                                    <span className={`message-channel ${msg.channelType}`}>
                                        {msg.channelType}
                                    </span>
                                    <span className="message-time">
                                        {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}
                                    </span>
                                </div>
                                <p className="message-text">{msg.content}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

interface ChannelCardProps {
    name: string;
    type: string;
    status: string;
}

function ChannelCard({ name, type, status }: ChannelCardProps) {
    return (
        <div className="channel-card">
            <div className="channel-header">
                <div className="channel-info">
                    <div className={`channel-icon ${type}`}>
                        {type === 'telegram' && '✈️'}
                        {type === 'discord' && '🎮'}
                        {type === 'whatsapp' && '💬'}
                        {type === 'imessage' && '💬'}
                    </div>
                    <div>
                        <div className="channel-name">{name}</div>
                        <div className="channel-type">{type}</div>
                    </div>
                </div>
                <div className={`status-badge ${status}`}>
                    <span className="status-dot" />
                    {status}
                </div>
            </div>
        </div>
    );
}
