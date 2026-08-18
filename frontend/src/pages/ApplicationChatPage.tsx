import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Send, Plus, ArrowLeft, User, ShieldCheck, Loader2 } from 'lucide-react';
import { api } from '../api';
import { io } from 'socket.io-client';

interface ApplicationMessage {
  id: string;
  senderRole: 'USER' | 'CHAIRMAN';
  senderName: string;
  content: string;
  createdAt: string;
}

interface Application {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  messages: ApplicationMessage[];
}

export const ApplicationChatPage: React.FC = () => {
  const { t } = useTranslation();
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states for new application
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newMsg, setNewMsg] = useState('');
  const [creating, setCreating] = useState(false);

  // Chat message input
  const [chatInput, setChatInput] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedAppIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedAppIdRef.current = selectedApp?.id || null;
  }, [selectedApp?.id]);

  const fetchApplications = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/applications');
      if (res.data.success) {
        setApplications(res.data.applications);
        const currentId = selectedAppIdRef.current;
        if (currentId) {
          const updated = res.data.applications.find((a: Application) => a.id === currentId);
          if (updated) {
            setSelectedApp((prev) => {
              if (!prev) return updated;
              if (prev.messages.length !== updated.messages.length || prev.status !== updated.status) {
                return updated;
              }
              return prev;
            });
          }
        }
      }
    } catch (err) {
      if (!silent) console.error('Fetch applications error:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications(false);

    // 1-second silent real-time polling
    const interval = setInterval(() => {
      fetchApplications(true);
    }, 1000);

    const socket = io();
    socket.on('connect', () => {});

    // Listen for incoming chairman replies
    if (selectedApp) {
      socket.on(`application_msg_${selectedApp.id}`, (newMsg: ApplicationMessage) => {
        setSelectedApp((prev) =>
          prev
            ? {
                ...prev,
                messages: [...prev.messages, newMsg],
              }
            : null
        );
      });
    }

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, [selectedApp?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedApp?.messages?.length]);

  const handleCreateApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setCreating(true);
    try {
      const res = await api.post('/applications', {
        title: newTitle,
        message: newMsg,
      });
      if (res.data.success) {
        setNewTitle('');
        setNewMsg('');
        setShowCreateModal(false);
        fetchApplications();
      }
    } catch (err) {
      console.error('Create app error:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedApp) return;

    setSendingMsg(true);
    try {
      const res = await api.post('/applications/message', {
        applicationId: selectedApp.id,
        content: chatInput,
      });

      if (res.data.success) {
        setSelectedApp((prev) =>
          prev
            ? {
                ...prev,
                messages: [...prev.messages, res.data.message],
              }
            : null
        );
        setChatInput('');
      }
    } catch (err) {
      console.error('Send message error:', err);
    } finally {
      setSendingMsg(false);
    }
  };

  if (selectedApp) {
    return (
      <div className="flex flex-col h-[calc(100vh-140px)] pb-16">
        {/* Chat Thread Header */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl card-shadow border border-gray-100 dark:border-gray-700 flex items-center gap-3 mb-3">
          <button
            onClick={() => setSelectedApp(null)}
            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h3 className="font-extrabold text-gray-900 dark:text-white text-base leading-tight">
              🏛 {selectedApp.title}
            </h3>
            <p className="text-xs text-brand-700 dark:text-brand-400 font-semibold">
              Mahalla Raisi bilan chat
            </p>
          </div>
        </div>

        {/* Message Thread List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border border-gray-100 dark:border-gray-800">
          {selectedApp.messages.map((m) => {
            const isUser = m.senderRole === 'USER';
            return (
              <div
                key={m.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div className="text-[10px] font-bold text-gray-400 px-1 mb-0.5">
                  {m.senderName}
                </div>
                <div
                  className={`max-w-[82%] p-4 rounded-3xl shadow-xs text-sm font-bold leading-relaxed ${
                    isUser
                      ? 'bg-brand-600 text-white rounded-br-xs'
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-bl-xs'
                  }`}
                >
                  {m.content}
                </div>
                <span className="text-[10px] text-gray-400 mt-1 px-1 font-mono">
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="mt-3 flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder={t('applications.typeMessage')}
            className="flex-1 px-5 py-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full font-bold text-gray-900 dark:text-white text-base focus:ring-2 focus:ring-brand-500 outline-hidden shadow-sm"
          />
          <button
            type="submit"
            disabled={sendingMsg}
            className="w-13 h-13 bg-brand-600 hover:bg-brand-700 text-white rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-brand-600/30"
          >
            {sendingMsg ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl card-shadow border border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">
            🏛 {t('applications.title')}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            {t('applications.subtitle')}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-12 h-12 bg-brand-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-brand-600/30 active:scale-95 transition-transform"
        >
          <Plus className="w-6 h-6 stroke-[3]" />
        </button>
      </div>

      {showCreateModal && (
        <div className="p-5 bg-white dark:bg-gray-800 rounded-3xl card-shadow border border-brand-200 dark:border-brand-800 space-y-4 animate-fadeIn">
          <h3 className="font-extrabold text-gray-900 dark:text-white text-base">
            📝 {t('applications.newAppBtn')}
          </h3>
          <form onSubmit={handleCreateApplication} className="space-y-3">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={t('applications.appTitlePlaceholder')}
              className="w-full p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl font-bold text-gray-900 dark:text-white text-base focus:ring-2 focus:ring-brand-500 outline-hidden"
              required
            />
            <textarea
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              placeholder={t('applications.appMsgPlaceholder')}
              rows={3}
              className="w-full p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl font-bold text-gray-900 dark:text-white text-base focus:ring-2 focus:ring-brand-500 outline-hidden resize-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-2xl"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                disabled={creating}
                className="flex-1 btn-large bg-brand-600 text-white font-bold"
              >
                {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : t('applications.sendApp')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Applications List */}
      {applications.length === 0 ? (
        <div className="p-8 bg-white dark:bg-gray-800 rounded-3xl text-center space-y-2 card-shadow">
          <MessageSquare className="w-10 h-10 mx-auto text-gray-300" />
          <p className="font-bold text-gray-500">{t('applications.empty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <div
              key={app.id}
              onClick={() => setSelectedApp(app)}
              className="p-4 bg-white dark:bg-gray-800 rounded-3xl card-shadow border border-gray-100 dark:border-gray-700 flex items-center justify-between cursor-pointer hover:border-brand-300 transition-all"
            >
              <div>
                <h4 className="font-extrabold text-gray-900 dark:text-white text-base">
                  🏛 {app.title}
                </h4>
                <p className="text-xs text-gray-400 font-medium mt-1">
                  {app.messages.length} ta xabar • {new Date(app.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="px-3 py-1 bg-brand-50 text-brand-700 font-bold text-xs rounded-full">
                Chatni ochish →
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
