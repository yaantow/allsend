import { useQuery } from 'convex/react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../../convex/_generated/api';
import { MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Demo data fallback
const demoConversations = [
    {
        _id: '1' as any,
        title: 'John Doe',
        channel: 'telegram',
        lastMessage: 'Hey, is the AI assistant working now?',
        lastMessageAt: Date.now() - 1000 * 60 * 5,
        unreadCount: 2,
    },
    {
        _id: '2' as any,
        title: 'Design Team',
        channel: 'discord',
        isGroup: true,
        lastMessage: 'Just tested the Discord integration, works great! 🎉',
        lastMessageAt: Date.now() - 1000 * 60 * 15,
        unreadCount: 0,
    },
    {
        _id: '3' as any,
        title: 'Support Chat',
        channel: 'whatsapp',
        isGroup: true,
        lastMessage: 'Can you check the WhatsApp connection?',
        lastMessageAt: Date.now() - 1000 * 60 * 30,
        unreadCount: 5,
    },
    {
        _id: '4' as any,
        title: 'Mom',
        channel: 'imessage',
        lastMessage: "Don't forget to call your grandmother!",
        lastMessageAt: Date.now() - 1000 * 60 * 60,
        unreadCount: 1,
    },
];

export default function Conversations() {
    const navigate = useNavigate();

    // Get messages from Convex and group by conversation
    let conversations: typeof demoConversations;

    try {
        const messages = useQuery(api.messages.list, { limit: 100 });

        if (messages && messages.length > 0) {
            // Group messages by conversationId and get the latest
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

            conversations = Array.from(convMap.values());
        } else {
            conversations = demoConversations;
        }
    } catch {
        conversations = demoConversations;
    }

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
