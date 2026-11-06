import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, User, Search, Info, X } from 'lucide-react';
import { 
  collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { OperationType, handleFirestoreError } from '../utils/firestoreDiagnostics';

interface ChatViewProps {
  currentUser: any;
  playClickSound: () => void;
  initialRoomId?: string | null;
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderEmail: string;
  createdAt: any;
}

interface ChatRoom {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageAt?: any;
  otherUser?: {
    email: string;
    profilePicUrl?: string;
  };
}

export const ChatView: React.FC<ChatViewProps> = ({ currentUser, playClickSound, initialRoomId }) => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Sync Chat Rooms
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'chatRooms'),
      where('participants', 'array-contains', currentUser.uid),
      orderBy('lastMessageAt', 'desc')
    );

    const unsub = onSnapshot(q, async (snap) => {
      const roomData: ChatRoom[] = [];
      
      for (const roomDoc of snap.docs) {
        const data = roomDoc.data();
        const otherUserId = data.participants.find((id: string) => id !== currentUser.uid);
        
        let otherUser = null;
        if (otherUserId) {
          try {
            const userSnap = await getDoc(doc(db, 'users', otherUserId));
            if (userSnap.exists()) {
              const userData = userSnap.data();
              otherUser = {
                email: userData.email,
                profilePicUrl: userData.profilePicUrl
              };
            }
          } catch (e) {
            console.error('Error fetching chat user:', e);
          }
        }

        roomData.push({
          id: roomDoc.id,
          participants: data.participants,
          lastMessage: data.lastMessage,
          lastMessageAt: data.lastMessageAt,
          otherUser: otherUser || { email: 'Unknown User' }
        });
      }
      
      setRooms(roomData);
      setIsLoadingRooms(false);

      // Auto-select initial room if provided
      if (initialRoomId && !activeRoom) {
        const target = roomData.find(r => r.id === initialRoomId);
        if (target) setActiveRoom(target);
      }
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'chatRooms'));

    return () => unsub();
  }, [currentUser?.uid]);

  // Sync Messages for Active Room
  useEffect(() => {
    if (!activeRoom) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, `chatRooms/${activeRoom.id}/messages`),
      orderBy('createdAt', 'asc')
    );

    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `chatRooms/${activeRoom.id}/messages`));

    return () => unsub();
  }, [activeRoom?.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeRoom) return;

    const text = newMessage.trim();
    setNewMessage('');
    playClickSound();

    try {
      // Add message
      await addDoc(collection(db, `chatRooms/${activeRoom.id}/messages`), {
        text,
        senderId: currentUser.uid,
        senderEmail: currentUser.email,
        createdAt: serverTimestamp()
      });

      // Update room last message
      await updateDoc(doc(db, 'chatRooms', activeRoom.id), {
        lastMessage: text,
        lastMessageAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-xl mx-auto w-full box-border overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 rounded-2xl shadow-lg">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Direct Messages</h2>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Secure Chat</p>
          </div>
        </div>

        <div className="relative">
          <button 
            onClick={() => { playClickSound(); setShowInfoPopup(!showInfoPopup); }}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 text-white/80 transition-all cursor-pointer"
          >
            <Info className="w-3 h-3" />
          </button>
          {showInfoPopup && (
            <>
              <div className="fixed inset-0 z-[140]" onClick={() => setShowInfoPopup(false)} />
              <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-2rem)] p-4 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl text-xs text-white/90 leading-relaxed z-[150] animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-blue-400 uppercase tracking-wider text-[10px]">Chat Feature</p>
                  <button onClick={() => setShowInfoPopup(false)} className="text-white/40 hover:text-white transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                Connect directly with service seekers or providers. Chat in real-time to discuss gig details, coordinates, and timing.
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Room List or Active Chat */}
        {activeRoom ? (
          <div className="flex-1 flex flex-col bg-slate-950/20 backdrop-blur-sm">
            {/* Chat Header */}
            <div className="p-3 flex items-center gap-3 border-b border-white/5 bg-white/5">
              <button 
                onClick={() => { playClickSound(); setActiveRoom(null); }}
                className="p-2 hover:bg-white/10 rounded-xl text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center overflow-hidden border border-white/20">
                {activeRoom.otherUser?.profilePicUrl ? (
                  <img src={activeRoom.otherUser.profilePicUrl} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-white" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{activeRoom.otherUser?.email}</p>
                <p className="text-[10px] text-emerald-500 font-bold uppercase">Online</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => {
                const isMe = msg.senderId === currentUser.uid;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed shadow-lg ${
                      isMe 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : 'bg-white/10 text-slate-100 border border-white/5 rounded-tl-none'
                    }`}>
                      {msg.text}
                      <div className={`text-[8px] mt-1 opacity-50 ${isMe ? 'text-right' : 'text-left'}`}>
                        {msg.createdAt?.toMillis ? new Date(msg.createdAt.toMillis()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 flex items-center gap-2">
              <input 
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
              <button 
                type="submit"
                className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-lg transition-transform active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isLoadingRooms ? (
              <div className="flex flex-col items-center justify-center h-full opacity-30">
                <div className="w-8 h-8 border-2 border-white/20 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : rooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4 p-8">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                  <MessageSquare className="w-10 h-10 text-slate-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">No Conversations Yet</h3>
                  <p className="text-xs text-slate-500 mt-2">
                    Start a chat with service providers or seekers to discuss your gigs.
                  </p>
                </div>
              </div>
            ) : (
              rooms.map((room) => (
                <div 
                  key={room.id}
                  onClick={() => { playClickSound(); setActiveRoom(room); }}
                  className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-3xl transition-all cursor-pointer flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-600/20 flex items-center justify-center overflow-hidden border border-white/10">
                    {room.otherUser?.profilePicUrl ? (
                      <img src={room.otherUser.profilePicUrl} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-blue-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{room.otherUser?.email}</p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{room.lastMessage || 'Start a conversation'}</p>
                  </div>
                  {room.lastMessageAt && (
                    <div className="text-[10px] text-slate-600 font-bold uppercase shrink-0">
                      {new Date(room.lastMessageAt.toMillis()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
