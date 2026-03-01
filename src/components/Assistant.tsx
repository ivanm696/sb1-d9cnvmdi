import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Send, Loader } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Subscription {
  api_calls_limit: number;
  api_calls_used: number;
  tier: string;
}

export function Assistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [tokens, setTokens] = useState<any[]>([]);
  const [selectedToken, setSelectedToken] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSubscription();
    loadTokens();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadSubscription = async () => {
    if (!user) return;

    let { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!data) {
      await supabase.from('subscriptions').insert({
        user_id: user.id,
        tier: 'free',
        api_calls_limit: 1000,
        api_calls_used: 0,
      });
      data = {
        tier: 'free',
        api_calls_limit: 1000,
        api_calls_used: 0,
      };
    }

    setSubscription(data);
  };

  const loadTokens = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('api_tokens')
      .select('id, name, token')
      .eq('user_id', user.id);

    if (data && data.length > 0) {
      setTokens(data);
      setSelectedToken(data[0].id);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !user || !subscription || !selectedToken) return;

    if (subscription.api_calls_used >= subscription.api_calls_limit) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'You have reached your API call limit for this month. Please upgrade your subscription.',
          timestamp: new Date(),
        },
      ]);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assistant`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: input,
            tokenId: selectedToken,
            userId: user.id,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.reply,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        await supabase
          .from('subscriptions')
          .update({
            api_calls_used: subscription.api_calls_used + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        setSubscription((prev) =>
          prev ? { ...prev, api_calls_used: prev.api_calls_used + 1 } : null
        );

        const { data: usage } = await supabase
          .from('token_usage')
          .select('*')
          .eq('token_id', selectedToken)
          .eq('user_id', user.id)
          .maybeSingle();

        if (usage) {
          await supabase
            .from('token_usage')
            .update({
              api_calls: usage.api_calls + 1,
              last_used_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', usage.id);
        } else {
          await supabase.from('token_usage').insert({
            user_id: user.id,
            token_id: selectedToken,
            api_calls: 1,
          });
        }
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const remainingCalls = subscription
    ? subscription.api_calls_limit - subscription.api_calls_used
    : 0;
  const usagePercentage = subscription
    ? Math.round((subscription.api_calls_used / subscription.api_calls_limit) * 100)
    : 0;

  return (
    <div className="flex flex-col h-full bg-slate-800 rounded-lg border border-slate-700">
      <div className="p-4 border-b border-slate-700">
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            API Token
          </label>
          <select
            value={selectedToken}
            onChange={(e) => setSelectedToken(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {tokens.map((token) => (
              <option key={token.id} value={token.id}>
                {token.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">API Calls Used</span>
            <span className="text-slate-300">
              {subscription?.api_calls_used} / {subscription?.api_calls_limit}
            </span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                usagePercentage > 80 ? 'bg-red-500' : 'bg-blue-500'
              }`}
              style={{ width: `${usagePercentage}%` }}
            />
          </div>
          <div className="text-xs text-slate-400">
            {remainingCalls} calls remaining
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-slate-400 mb-2">No messages yet</p>
              <p className="text-slate-500 text-sm">Start a conversation with the AI assistant</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-200'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <span className="text-xs opacity-70 mt-1 block">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="p-4 border-t border-slate-700">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading || !selectedToken || remainingCalls <= 0}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim() || !selectedToken || remainingCalls <= 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-2"
          >
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
