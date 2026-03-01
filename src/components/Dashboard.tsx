import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Code2, LogOut, Key, MessageCircle } from 'lucide-react';
import { Editor } from './Editor';
import { TokenManager } from './TokenManager';
import { Assistant } from './Assistant';

export function Dashboard() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'editor' | 'tokens' | 'assistant'>('editor');

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center">
                <Code2 className="w-8 h-8 text-blue-400" />
                <h1 className="text-xl font-bold ml-2">Bolt.new</h1>
              </div>

              <nav className="flex space-x-4">
                <button
                  onClick={() => setActiveTab('editor')}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    activeTab === 'editor'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  Editor
                </button>
                <button
                  onClick={() => setActiveTab('assistant')}
                  className={`px-3 py-2 rounded-lg transition-colors flex items-center ${
                    activeTab === 'assistant'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  AI Assistant
                </button>
                <button
                  onClick={() => setActiveTab('tokens')}
                  className={`px-3 py-2 rounded-lg transition-colors flex items-center ${
                    activeTab === 'tokens'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <Key className="w-4 h-4 mr-2" />
                  API Tokens
                </button>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-400">{user?.email}</span>
              <button
                onClick={() => signOut()}
                className="flex items-center space-x-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'editor' && <Editor />}
        {activeTab === 'assistant' && <div className="h-[calc(100vh-12rem)]"><Assistant /></div>}
        {activeTab === 'tokens' && <TokenManager />}
      </main>
    </div>
  );
}
