import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { ArrowLeft, Send, Image, Paperclip } from 'lucide-react';
import { format } from 'date-fns';

export default function ConversationDetail() {
    const { conversationId } = useParams<{ conversationId: string }>();
    const navigate = useNavigate();
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Get messages for this conversation
    const convexMessages = useQuery(api.messages.getByConversation, {
        conversationId: conversationId || '',
        limit: 100,
    });

    const messages = convexMessages?.map(m => ({
        _id: m._id,
        senderName: m.senderName,
        content: m.content,
        isOutgoing: m.isOutgoing,
        timestamp: m.timestamp,
    })).reverse() ?? []; // Oldest first

    const conversationTitle = convexMessages?.[0]?.senderName || 'Conversation';
    const channelType = convexMessages?.[0]?.channelType || 'telegram';

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Send message via server API
    const handleSendMessage = async () => {
        if (!newMessage.trim() || sending) return;

        setSending(true);
        try {
            const response = await fetch('http://localhost:3000/api/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversationId: conversationId,
                    channelType: channelType,
                    content: newMessage,
                }),
            });

            if (response.ok) {
                setNewMessage('');
            } else {
                console.error('Failed to send message');
            }
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setSending(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className="conversation-detail">
            {/* Header */}
            <div className="conversation-header">
                <button className="btn btn-secondary" onClick={() => navigate('/conversations')}>
                    <ArrowLeft size={16} />
                </button>
                <div className="conversation-info">
                    <div className="conversation-avatar">{conversationTitle.charAt(0)}</div>
                    <div>
                        <div className="conversation-title">{conversationTitle}</div>
                        <div className={`conversation-channel ${channelType}`}>{channelType}</div>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="messages-container">
                {messages.map((msg) => (
                    <div
                        key={msg._id}
                        className={`message-bubble ${msg.isOutgoing ? 'outgoing' : 'incoming'}`}
                    >
                        <div className="bubble-content">
                            {msg.content}
                        </div>
                        <div className="bubble-time">
                            {format(new Date(msg.timestamp), 'HH:mm')}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Reply Input */}
            <div className="reply-container">
                <button className="btn btn-secondary icon-only">
                    <Paperclip size={18} />
                </button>
                <button className="btn btn-secondary icon-only">
                    <Image size={18} />
                </button>
                <input
                    type="text"
                    className="reply-input"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={sending}
                />
                <button
                    className="btn btn-primary icon-only"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending}
                >
                    <Send size={18} />
                </button>
            </div>

            <style>{`
                .conversation-detail {
                    display: flex;
                    flex-direction: column;
                    height: calc(100vh - 2rem);
                    background: var(--color-bg);
                }

                .conversation-header {
                    display: flex;
                    align-items: center;
                    gap: var(--space-md);
                    padding: var(--space-md);
                    background: var(--color-surface);
                    border-bottom: 1px solid var(--color-border);
                    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
                }

                .conversation-info {
                    display: flex;
                    align-items: center;
                    gap: var(--space-sm);
                }

                .conversation-avatar {
                    width: 40px;
                    height: 40px;
                    border-radius: var(--radius-full);
                    background: var(--color-primary);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 600;
                }

                .conversation-title {
                    font-weight: 600;
                }

                .conversation-channel {
                    font-size: 0.75rem;
                    color: var(--color-text-muted);
                    text-transform: capitalize;
                }

                .messages-container {
                    flex: 1;
                    overflow-y: auto;
                    padding: var(--space-md);
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-sm);
                }

                .message-bubble {
                    max-width: 70%;
                    padding: var(--space-sm) var(--space-md);
                    border-radius: var(--radius-lg);
                    animation: fadeIn 0.2s ease-out;
                }

                .message-bubble.incoming {
                    align-self: flex-start;
                    background: var(--color-surface);
                    border: 1px solid var(--color-border);
                }

                .message-bubble.outgoing {
                    align-self: flex-end;
                    background: var(--color-primary);
                    color: white;
                }

                .bubble-content {
                    word-wrap: break-word;
                }

                .bubble-time {
                    font-size: 0.625rem;
                    opacity: 0.7;
                    margin-top: 4px;
                    text-align: right;
                }

                .reply-container {
                    display: flex;
                    align-items: center;
                    gap: var(--space-sm);
                    padding: var(--space-md);
                    background: var(--color-surface);
                    border-top: 1px solid var(--color-border);
                    border-radius: 0 0 var(--radius-lg) var(--radius-lg);
                }

                .reply-input {
                    flex: 1;
                    padding: var(--space-sm) var(--space-md);
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-full);
                    background: var(--color-bg);
                    color: var(--color-text);
                    font-size: 0.875rem;
                }

                .reply-input:focus {
                    outline: none;
                    border-color: var(--color-primary);
                }

                .icon-only {
                    padding: var(--space-sm);
                    border-radius: var(--radius-full);
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
