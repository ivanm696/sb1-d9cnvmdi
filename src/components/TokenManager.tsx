import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { generateToken, shouldRegenerateToken, formatDateRelative } from '../lib/tokenUtils';
import { Plus, Copy, Trash2, RefreshCw, Check, Eye, EyeOff } from 'lucide-react';

interface Token {
  id: string;
  token: string;
  name: string;
  last_regenerated_at: string;
  auto_regenerate: boolean;
  regenerate_interval_days: number;
  created_at: string;
}

export function TokenManager() {
  const { user } = useAuth();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTokenDialog, setShowNewTokenDialog] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenInterval, setNewTokenInterval] = useState(30);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [visibleTokens, setVisibleTokens] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadTokens();
    checkAndRegenerateTokens();

    const interval = setInterval(() => {
      checkAndRegenerateTokens();
    }, 60000);

    return () => clearInterval(interval);
  }, [user]);

  const loadTokens = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('api_tokens')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTokens(data);
    }
    setLoading(false);
  };

  const checkAndRegenerateTokens = async () => {
    if (!user) return;

    const { data: tokensToCheck } = await supabase
      .from('api_tokens')
      .select('*')
      .eq('user_id', user.id)
      .eq('auto_regenerate', true);

    if (!tokensToCheck) return;

    for (const token of tokensToCheck) {
      if (shouldRegenerateToken(token.last_regenerated_at, token.regenerate_interval_days)) {
        const newToken = generateToken();
        await supabase
          .from('api_tokens')
          .update({
            token: newToken,
            last_regenerated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', token.id);
      }
    }

    loadTokens();
  };

  const createToken = async () => {
    if (!user || !newTokenName.trim()) return;

    const newToken = generateToken();

    const { error } = await supabase.from('api_tokens').insert({
      user_id: user.id,
      token: newToken,
      name: newTokenName,
      auto_regenerate: true,
      regenerate_interval_days: newTokenInterval,
    });

    if (!error) {
      setNewTokenName('');
      setNewTokenInterval(30);
      setShowNewTokenDialog(false);
      loadTokens();
    }
  };

  const deleteToken = async (id: string) => {
    await supabase.from('api_tokens').delete().eq('id', id);
    loadTokens();
  };

  const regenerateToken = async (id: string) => {
    const newToken = generateToken();
    await supabase
      .from('api_tokens')
      .update({
        token: newToken,
        last_regenerated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    loadTokens();
  };

  const toggleAutoRegenerate = async (id: string, currentValue: boolean) => {
    await supabase
      .from('api_tokens')
      .update({ auto_regenerate: !currentValue })
      .eq('id', id);
    loadTokens();
  };

  const copyToken = async (token: string, id: string) => {
    await navigator.clipboard.writeText(token);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleTokenVisibility = (id: string) => {
    setVisibleTokens((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const maskToken = (token: string) => {
    return token.substring(0, 10) + '••••••••••••••••••••••••••••••' + token.substring(token.length - 8);
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">API Tokens</h2>
          <p className="text-slate-400 mt-1">
            Manage your API tokens with automatic regeneration
          </p>
        </div>
        <button
          onClick={() => setShowNewTokenDialog(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Token</span>
        </button>
      </div>

      {showNewTokenDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md border border-slate-700">
            <h3 className="text-xl font-semibold mb-4">Create New Token</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Token Name
                </label>
                <input
                  type="text"
                  value={newTokenName}
                  onChange={(e) => setNewTokenName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="My API Token"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Auto-Regenerate Interval (days)
                </label>
                <input
                  type="number"
                  value={newTokenInterval}
                  onChange={(e) => setNewTokenInterval(parseInt(e.target.value))}
                  min="1"
                  max="365"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Token will automatically regenerate every {newTokenInterval} days
                </p>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={createToken}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors"
              >
                Create Token
              </button>
              <button
                onClick={() => {
                  setShowNewTokenDialog(false);
                  setNewTokenName('');
                  setNewTokenInterval(30);
                }}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {tokens.length === 0 ? (
          <div className="text-center py-12 bg-slate-800 rounded-lg border border-slate-700">
            <p className="text-slate-400">No tokens yet. Create your first token to get started.</p>
          </div>
        ) : (
          tokens.map((token) => (
            <div
              key={token.id}
              className="bg-slate-800 rounded-lg p-6 border border-slate-700"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{token.name}</h3>
                  <p className="text-sm text-slate-400 mt-1">
                    Created {formatDateRelative(token.created_at)}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => toggleTokenVisibility(token.id)}
                    className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                    title={visibleTokens.has(token.id) ? 'Hide token' : 'Show token'}
                  >
                    {visibleTokens.has(token.id) ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => copyToken(token.token, token.id)}
                    className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                    title="Copy token"
                  >
                    {copiedId === token.id ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => regenerateToken(token.id)}
                    className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                    title="Regenerate token"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteToken(token.id)}
                    className="p-2 bg-red-900/50 hover:bg-red-900 rounded-lg transition-colors"
                    title="Delete token"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="bg-slate-900 rounded-lg p-3 mb-4 font-mono text-sm overflow-x-auto">
                {visibleTokens.has(token.id) ? token.token : maskToken(token.token)}
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={token.auto_regenerate}
                      onChange={() => toggleAutoRegenerate(token.id, token.auto_regenerate)}
                      className="w-4 h-4 rounded bg-slate-700 border-slate-600"
                    />
                    <span className="text-slate-300">Auto-regenerate</span>
                  </label>
                  {token.auto_regenerate && (
                    <span className="text-slate-400">
                      Every {token.regenerate_interval_days} days
                    </span>
                  )}
                </div>
                <span className="text-slate-400">
                  Last regenerated {formatDateRelative(token.last_regenerated_at)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
