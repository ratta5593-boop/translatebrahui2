import React, { useState, useEffect } from 'react';
import { Sparkles, Search, CheckCircle2, BookOpen, Filter, Check, X, ShieldAlert, Cpu } from 'lucide-react';
import { GrammarRule } from '../types/index.js';
import { authFetch, authSafeFetchJson } from '../utils/auth.js';

interface RulesCatalogViewProps {
  onRefreshData?: () => void;
  onLogout?: () => void;
  adminUsername?: string;
}

export const RulesCatalogView: React.FC<RulesCatalogViewProps> = ({ onRefreshData, onLogout, adminUsername = 'admin' }) => {
  const [rules, setRules] = useState<GrammarRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchRules = async () => {
    setIsLoading(true);
    try {
      const res = await authSafeFetchJson<{ rules: GrammarRule[] }>('/api/admin/rules');
      if (res.ok && res.data) {
        setRules(res.data.rules || []);
      }
    } catch (err) {
      console.error('Error loading grammar rules:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleUpdateStatus = async (id: string, status: GrammarRule['status']) => {
    try {
      const res = await authSafeFetchJson(`/api/admin/rules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, verifiedBy: 'Super Admin Linguist' }),
      });
      if (res.ok) {
        fetchRules();
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const filteredRules = rules.filter((rule) => {
    const matchesSearch =
      rule.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.explanation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.pattern.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = categoryFilter === 'all' || rule.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || rule.status === statusFilter;
    return matchesSearch && matchesCat && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-2xs">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">AI Grammar &amp; Pattern Induction Catalog</h2>
            <p className="text-xs text-slate-500">
              Complete inventory of linguistic formulas, morphological suffixes, and syntactic rules extracted automatically from user corrections.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>{rules.length} Induced Rules Active</span>
          </div>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-300 text-slate-600 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
              title="Sign out of Admin Session"
            >
              <span>Sign Out ({adminUsername})</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg cursor-pointer"
          >
            <option value="all">All Categories</option>
            <option value="Syntax">Syntax (SOV)</option>
            <option value="Morphology">Morphology (Affixes)</option>
            <option value="Lexical">Lexical (Roots)</option>
            <option value="Orthography">Orthography (ݪ / lh)</option>
            <option value="Phonology">Phonology</option>
            <option value="Honorifics">Honorifics</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="verified">Verified Only</option>
            <option value="active">Active (Pending Admin)</option>
            <option value="deprecated">Deprecated</option>
          </select>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search grammar rules..."
            className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white w-52 focus:w-72 transition-all focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Rules Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-slate-500">Loading grammar rules catalog...</div>
      ) : filteredRules.length === 0 ? (
        <div className="py-16 text-center text-xs text-slate-400">
          No matching grammar rules found. Submit a correction on any translation to induce a new rule!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRules.map((rule) => (
            <div
              key={rule.id}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-indigo-300 transition-colors flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        rule.category === 'Syntax'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : rule.category === 'Morphology'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : rule.category === 'Orthography'
                          ? 'bg-purple-50 text-purple-800 border-purple-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {rule.category}
                    </span>
                    <h3 className="text-xs font-bold text-slate-900">{rule.title}</h3>
                  </div>

                  <span className="text-[10px] text-slate-400 font-mono shrink-0">
                    {rule.confidence}%
                  </span>
                </div>

                {/* Pattern */}
                <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px] text-slate-800 mb-2">
                  <span className="text-[10px] font-bold text-indigo-600 block mb-0.5">
                    PATTERN FORMULA:
                  </span>
                  {rule.pattern}
                </div>

                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed mb-2">
                  {rule.explanation}
                </p>

                {/* Example */}
                {rule.examples && rule.examples[0] && (
                  <div className="p-2 bg-slate-50/70 border border-slate-100 rounded-lg text-[11px] space-y-1">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase">Exemplar:</div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="line-through text-rose-600 text-[10px]">{rule.examples[0].incorrect}</span>
                      <span className="text-slate-400">&rarr;</span>
                      <span className="text-emerald-700 font-semibold">{rule.examples[0].correct}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Status and Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400">
                  Dialect: {rule.dialect || 'Standard'}
                </span>

                <div className="flex items-center gap-1.5">
                  {rule.status === 'verified' ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Verified
                    </span>
                  ) : (
                    <button
                      onClick={() => handleUpdateStatus(rule.id, 'verified')}
                      className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3 h-3" /> Approve
                    </button>
                  )}

                  {rule.status !== 'deprecated' && (
                    <button
                      onClick={() => handleUpdateStatus(rule.id, 'deprecated')}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                      title="Deactivate rule"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
