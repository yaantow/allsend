import { useQuery } from 'convex/react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../../convex/_generated/api';
import { MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Conversations() {
    const navigate = useNavigate();

    // Get messages from Convex and group by conversation
    const messages = useQuery(api.messages.list, { limit: 100 }) ?? [];

    // Group messages by conversationId
    const convMap = new Map<string, any>();
    for (const msg of messages) {
        if (!convMap.has(msg.conversationId)) {
            convMap.set(msg.conversationId, {
                _id: msg.conversationId,
                title: msg.senderName,
                channel: msg.channelType,
                lastMessage: msg.content,
                lastMessageAt: msg.timestamp,
                unreadCount: 0,
            });
        }
    }

    const conversations = Array.from(convMap.values());

    const handleConversationClick = (conversationId: string) => {
        navigate(`/conversations/${encodeURIComponent(conversationId)}`);
    };

    return (
        <div className="fade-in">
            <header className="page-header">
                <div className="page-title">
                    <h1>Conversations</h1>
                    <p className="page-description">
                        All conversations across your connected channels
                    </p>
                </div>
            </header>

            <div className="card">
                <div className="message-list">
                    {conversations.length === 0 ? (
                        <div className="empty-state">
                            <MessageSquare />
                            <h3>No conversations yet</h3>
                            <p>Conversations will appear here once you connect a channel</p>
                        </div>
                    ) : (
                        conversations.map((conv) => (
                            <div
                                key={conv._id}
                                className="message-item"
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleConversationClick(conv._id)}
                            >
                                <div className="message-avatar">
                                    {conv.title.charAt(0)}
                                </div>
                                <div className="message-content">
                                    <div className="message-header">
                                        <span className="message-sender">{conv.title}</span>
                                        {conv.isGroup && (
                                            <span
                                                style={{
                                                    fontSize: '0.625rem',
                                                    padding: '2px 4px',
                                                    background: 'var(--color-surface)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    color: 'var(--color-text-muted)',
                                                }}
                                            >
                                                GROUP
                                            </span>
                                        )}
                                        <span className={`message-channel ${conv.channel}`}>
                                            {conv.channel}
                                        </span>
                                        <span className="message-time">
                                            {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                                        </span>
                                    </div>
                                    <p className="message-text">{conv.lastMessage}</p>
                                </div>
                                {conv.unreadCount > 0 && (
                                    <div
                                        style={{
                                            background: 'var(--color-primary)',
                                            color: 'white',
                                            borderRadius: 'var(--radius-full)',
                                            minWidth: '20px',
                                            height: '20px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                        }}
                                    >
                                        {conv.unreadCount}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
