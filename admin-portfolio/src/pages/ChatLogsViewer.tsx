import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Search, Filter, ChevronDown, ChevronUp, Clock, Zap, Hash, RotateCcw, AlertTriangle } from 'lucide-react';
import api from '../api';

interface ChatLogEntry {
  id: number;
  user_query: string;
  bot_response: string;
  intent: string;
  latency_ms: number;
  total_tokens: number;
  retries: number;
  api_key_used: string;
  created_at: string;
}

export default function ChatLogsViewer() {
  const [logs, setLogs] = useState<ChatLogEntry[]>([]);
  const [intents, setIntents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [intentFilter, setIntentFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  const loadIntents = useCallback(async () => {
    try {
      const res = await api.get('/chat-logs/intents');
      setIntents(res.data);
    } catch { /* ignore */ }
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params: Record<string, string | number> = {
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        sort: sortOrder,
      };
      if (search.trim()) params.search = search.trim();
      if (intentFilter) params.intent = intentFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const res = await api.get('/chat-logs', { params });
      setLogs(res.data);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Failed to load chat logs');
    } finally {
      setLoading(false);
    }
  }, [search, intentFilter, dateFrom, dateTo, sortOrder, page]);

  useEffect(() => { loadIntents(); }, [loadIntents]);
  useEffect(() => { loadLogs(); }, [loadLogs]);

  const resetFilters = () => {
    setSearch('');
    setIntentFilter('');
    setDateFrom('');
    setDateTo('');
    setSortOrder('desc');
    setPage(0);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  };

  const intentColor = (intent: string) => {
    const colors: Record<string, string> = {
      greeting: 'text-green-400 bg-green-500/10 border-green-500/20',
      skills: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      experience: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      projects: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      contact: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
      unknown: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
    };
    return colors[intent] || 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
  };

  return (
    <div className="animate-fade-in">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          Chat Logs <span className="text-emerald-500 text-sm font-mono tracking-widest font-normal">// MONITOR</span>
        </h1>
        <p className="text-sm text-slate-500 font-mono mt-1">View and analyze chatbot conversations</p>
      </header>

      {/* Filters Bar */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-slate-500" />
          <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">Filters</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-600" />
            <input
              type="text"
              placeholder="Search queries & responses..."
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 pl-9 text-slate-200 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors font-mono placeholder:text-slate-700"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            />
          </div>

          {/* Intent Filter */}
          <select
            className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors font-mono appearance-none cursor-pointer"
            value={intentFilter}
            onChange={(e) => { setIntentFilter(e.target.value); setPage(0); }}
          >
            <option value="">All Intents</option>
            {intents.map(i => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>

          {/* Date From */}
          <input
            type="date"
            className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors font-mono"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
            placeholder="From date"
          />

          {/* Date To */}
          <input
            type="date"
            className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors font-mono"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
            placeholder="To date"
          />
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="flex items-center gap-1.5 text-xs font-mono text-slate-500 hover:text-emerald-400 transition-colors cursor-pointer"
            >
              {sortOrder === 'desc' ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
            </button>
          </div>
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 text-xs font-mono text-slate-600 hover:text-pink-400 transition-colors cursor-pointer"
          >
            <RotateCcw size={12} /> Reset Filters
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 px-4 py-3 bg-pink-500/10 border border-pink-500/30 rounded text-pink-400 text-sm font-mono flex items-center gap-2">
          <AlertTriangle size={16} /> ERROR: {errorMsg}
        </div>
      )}

      {/* Logs List */}
      {loading ? (
        <div className="text-center py-16 text-slate-600 font-mono text-sm">Loading chat logs...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-slate-600 font-mono text-sm border border-dashed border-slate-800 rounded-lg">
          No chat logs found{search || intentFilter || dateFrom || dateTo ? ' matching your filters' : ''}.
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map(log => (
            <div
              key={log.id}
              className={`bg-slate-900/50 border rounded-lg transition-all duration-200 ${
                expandedId === log.id
                  ? 'border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.08)]'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Header Row */}
              <button
                onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                className="w-full text-left px-5 py-4 flex items-start gap-4 cursor-pointer"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <MessageSquare size={16} className="text-emerald-500/60" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 font-medium truncate">{log.user_query}</p>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border ${intentColor(log.intent)}`}>
                      {log.intent}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-mono text-slate-600">
                      <Clock size={10} /> {formatDate(log.created_at)}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-mono text-slate-600">
                      <Zap size={10} /> {log.latency_ms}ms
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-mono text-slate-600">
                      <Hash size={10} /> {log.total_tokens} tokens
                    </span>
                    {log.retries > 0 && (
                      <span className="flex items-center gap-1 text-[11px] font-mono text-amber-500">
                        <RotateCcw size={10} /> {log.retries} retries
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0 mt-1">
                  {expandedId === log.id ? (
                    <ChevronUp size={16} className="text-slate-600" />
                  ) : (
                    <ChevronDown size={16} className="text-slate-600" />
                  )}
                </div>
              </button>

              {/* Expanded Content */}
              {expandedId === log.id && (
                <div className="px-5 pb-5 border-t border-slate-800/50 pt-4 space-y-4">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-2">User Query</p>
                    <div className="bg-slate-950 border border-slate-800 rounded p-3">
                      <p className="text-sm text-slate-300 font-mono whitespace-pre-wrap">{log.user_query}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mb-2">Bot Response</p>
                    <div className="bg-slate-950 border border-emerald-500/10 rounded p-3">
                      <p className="text-sm text-emerald-300/80 font-mono whitespace-pre-wrap">{log.bot_response}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-[11px] font-mono text-slate-600 pt-2 border-t border-slate-800/30">
                    <span>ID: {log.id}</span>
                    <span>Key: ...{log.api_key_used.slice(-8)}</span>
                    <span>Latency: {log.latency_ms}ms</span>
                    <span>Tokens: {log.total_tokens}</span>
                    <span>Retries: {log.retries}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && logs.length > 0 && (
        <div className="flex items-center justify-between mt-6 py-4 border-t border-slate-800">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="text-xs font-mono px-4 py-2 rounded border border-slate-800 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            ← Previous
          </button>
          <span className="text-xs font-mono text-slate-600">
            Page {page + 1} · Showing {logs.length} entries
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={logs.length < PAGE_SIZE}
            className="text-xs font-mono px-4 py-2 rounded border border-slate-800 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
