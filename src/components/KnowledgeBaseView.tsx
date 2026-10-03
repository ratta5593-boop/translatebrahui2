import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  BookOpen,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Search,
  Eye,
  Pencil,
  X,
  FileSpreadsheet,
  Database,
  BookMarked,
  Sparkles,
  Layers,
  Copy,
  Check,
  Save,
  FileCode,
  Info,
  RefreshCw
} from 'lucide-react';
import { KnowledgeDocument } from '../types/index.js';
import { authFetch, authSafeFetchJson } from '../utils/auth.js';

interface KnowledgeBaseViewProps {
  onDocsChanged: () => void;
  onLogout?: () => void;
  adminUsername?: string;
}

export const KnowledgeBaseView: React.FC<KnowledgeBaseViewProps> = ({ onDocsChanged, onLogout, adminUsername = 'admin' }) => {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [extractingDocId, setExtractingDocId] = useState<string | null>(null);
  const [extractSuccess, setExtractSuccess] = useState<string | null>(null);

  // Upload form state
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState<'dictionary' | 'grammar' | 'literature' | 'corpus'>('dictionary');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [manualText, setManualText] = useState('');
  const [activeMode, setActiveMode] = useState<'pdf' | 'text'>('pdf');
  const [searchQuery, setSearchQuery] = useState('');

  // Preview Modal State
  const [previewDoc, setPreviewDoc] = useState<KnowledgeDocument | null>(null);
  const [previewRulesText, setPreviewRulesText] = useState<string>('');
  const [previewTab, setPreviewTab] = useState<'rules' | 'chunks'>('rules');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [copiedRules, setCopiedRules] = useState(false);
  const [copiedChunkIdx, setCopiedChunkIdx] = useState<number | null>(null);

  // Edit Modal State
  const [editDoc, setEditDoc] = useState<KnowledgeDocument | null>(null);
  const [editRulesText, setEditRulesText] = useState<string>('');
  const [editTitle, setEditTitle] = useState<string>('');
  const [editSummary, setEditSummary] = useState<string>('');
  const [editChunksText, setEditChunksText] = useState<string>('');
  const [editTab, setEditTab] = useState<'rules' | 'chunks' | 'meta'>('rules');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editSaveSuccess, setEditSaveSuccess] = useState<string | null>(null);
  const [editSaveError, setEditSaveError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const res = await authSafeFetchJson<{ documents: KnowledgeDocument[] }>('/api/knowledge/documents');
      if (res.ok && res.data) {
        setDocuments(res.data.documents || []);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB limit

  const validateAndSelectFile = (file: File) => {
    setUploadError(null);
    setUploadSuccess(null);

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setUploadError(`"${file.name}" is not a PDF file. Please upload a PDF document or switch to the "Paste Text" tab.`);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return false;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setUploadError(`File is too large (${sizeMB} MB). Maximum supported PDF size is 20MB. Please use a compressed PDF or paste key chapters in the Text tab.`);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return false;
    }

    setSelectedFile(file);
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
    }
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSelectFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeMode === 'pdf' && !selectedFile) {
      setUploadError('Please select a PDF dictionary or grammar file to upload (up to 20MB).');
      return;
    }
    if (activeMode === 'text' && !manualText.trim()) {
      setUploadError('Please provide dictionary or grammar text content.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    const formData = new FormData();
    if (selectedFile) {
      formData.append('file', selectedFile);
    }
    formData.append('title', title.trim() || 'Brahui Linguistic Reference');
    formData.append('type', docType);
    if (activeMode === 'text' && manualText.trim()) {
      formData.append('manualText', manualText.trim());
    }

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 45000);

    try {
      const response = await authFetch('/api/knowledge/upload-pdf', {
        method: 'POST',
        body: formData,
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      let data: any = {};
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const textResp = await response.text();
        data = { error: textResp.slice(0, 300) || `Upload failed with HTTP ${response.status}` };
      }

      if (!response.ok) {
        throw new Error(data.error || `Upload failed (Status ${response.status}).`);
      }

      const rulesCount = data.extraction?.extractedRulesCount ?? 0;
      const vocabCount = data.extraction?.extractedVocabCount ?? 0;
      setUploadSuccess(
        `Successfully ingested "${data.document.title}" into AI translation memory (${data.document.chunksCount} lightweight text chunks indexed in Firebase Cloud). Extracted ${rulesCount} grammar rules and ${vocabCount} vocabulary pairs.`
      );
      setSelectedFile(null);
      setTitle('');
      setManualText('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchDocuments();
      onDocsChanged();
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('Upload error:', err);
      if (err.name === 'AbortError') {
        setUploadError('Upload timed out after 45 seconds. For very large PDF files, please extract text or paste excerpt entries in the Text tab.');
      } else if (err.message === 'Failed to fetch' || err.message?.includes('NetworkError')) {
        setUploadError('Network connection to the server was interrupted during upload. Please ensure your PDF is under 20MB, or paste the text content directly.');
      } else {
        setUploadError(err.message || 'Error uploading document.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleExtractRules = async (id: string, docTitle: string) => {
    setExtractingDocId(id);
    setExtractSuccess(null);
    try {
      const res = await authSafeFetchJson<{
        success: boolean;
        message: string;
        extractedRulesCount: number;
        extractedVocabCount: number;
      }>(`/api/knowledge/extract-rules/${id}`, {
        method: 'POST',
      });

      if (res.ok && res.data) {
        setExtractSuccess(
          `Extracted ${res.data.extractedRulesCount} grammar rules and ${res.data.extractedVocabCount} vocabulary pairs from "${docTitle}". Synchronized to Firebase Cloud and applied globally!`
        );
        fetchDocuments();
        onDocsChanged();
      } else {
        alert(res.error || 'Failed to extract rules from document.');
      }
    } catch (err) {
      console.error('Failed to trigger rule extraction:', err);
    } finally {
      setExtractingDocId(null);
    }
  };

  const handleDeleteDoc = async (id: string, docTitle: string) => {
    if (!confirm(`Are you sure you want to remove "${docTitle}" from the active knowledge base and Firebase Cloud?`)) return;

    try {
      const res = await authSafeFetchJson(`/api/knowledge/documents/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchDocuments();
        onDocsChanged();
      }
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  // Open Preview Modal (Eye trigger)
  const handleOpenPreview = async (doc: KnowledgeDocument) => {
    setPreviewDoc(doc);
    setPreviewTab('rules');
    setIsLoadingPreview(true);
    try {
      const res = await authSafeFetchJson<{
        success: boolean;
        rulesText: string;
        chunks: string[];
      }>(`/api/knowledge/documents/${doc.id}/rules`);

      if (res.ok && res.data) {
        setPreviewRulesText(res.data.rulesText || '');
        if (res.data.chunks && res.data.chunks.length > 0) {
          doc.chunks = res.data.chunks;
        }
      } else {
        setPreviewRulesText(doc.extractedRulesText || 'No extracted rules found.');
      }
    } catch (err) {
      console.error('Error loading preview rules:', err);
      setPreviewRulesText(doc.extractedRulesText || 'Error loading extracted rules.');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Open Edit Modal (Pencil trigger)
  const handleOpenEdit = async (doc: KnowledgeDocument) => {
    setEditDoc(doc);
    setEditTitle(doc.title);
    setEditSummary(doc.sampleSummary || '');
    setEditTab('rules');
    setEditSaveSuccess(null);
    setEditSaveError(null);
    setEditChunksText((doc.chunks || []).join('\n\n---CHUNK_BREAK---\n\n'));

    try {
      const res = await authSafeFetchJson<{
        success: boolean;
        rulesText: string;
        chunks: string[];
      }>(`/api/knowledge/documents/${doc.id}/rules`);

      if (res.ok && res.data) {
        setEditRulesText(res.data.rulesText || '');
        if (res.data.chunks && res.data.chunks.length > 0) {
          setEditChunksText(res.data.chunks.join('\n\n---CHUNK_BREAK---\n\n'));
        }
      } else {
        setEditRulesText(doc.extractedRulesText || '');
      }
    } catch {
      setEditRulesText(doc.extractedRulesText || '');
    }
  };

  // Switch from Preview to Edit
  const handleSwitchFromPreviewToEdit = () => {
    if (!previewDoc) return;
    const targetDoc = previewDoc;
    setPreviewDoc(null);
    handleOpenEdit(targetDoc);
  };

  // Save changes from Edit Modal to Backend and Firebase
  const handleSaveEdit = async () => {
    if (!editDoc) return;
    setIsSavingEdit(true);
    setEditSaveSuccess(null);
    setEditSaveError(null);

    try {
      const chunksArray = editChunksText
        .split(/\n\s*---CHUNK_BREAK---\s*\n/)
        .map((c) => c.trim())
        .filter(Boolean);

      const payload = {
        title: editTitle.trim() || editDoc.title,
        sampleSummary: editSummary.trim() || editDoc.sampleSummary,
        extractedRulesText: editRulesText,
        chunks: chunksArray.length > 0 ? chunksArray : editDoc.chunks,
      };

      const res = await authSafeFetchJson<{
        success: boolean;
        message: string;
        document: KnowledgeDocument;
        syncResult?: { added: number; updated: number };
      }>(`/api/knowledge/documents/${editDoc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok && res.data) {
        const added = res.data.syncResult?.added ?? 0;
        const updated = res.data.syncResult?.updated ?? 0;
        setEditSaveSuccess(
          `Extracted text rules and chunks successfully saved and synchronized with Firebase Cloud! (${added} rules added, ${updated} updated).`
        );
        fetchDocuments();
        onDocsChanged();
      } else {
        setEditSaveError(res.error || 'Failed to save document updates.');
      }
    } catch (err: any) {
      console.error('Error saving document:', err);
      setEditSaveError(err.message || 'Error communicating with server.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleCopyRules = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRules(true);
    setTimeout(() => setCopiedRules(false), 2000);
  };

  const handleCopyChunk = (chunk: string, idx: number) => {
    navigator.clipboard.writeText(chunk);
    setCopiedChunkIdx(idx);
    setTimeout(() => setCopiedChunkIdx(null), 2000);
  };

  const filteredDocs = documents.filter((doc) => {
    return (
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.sampleSummary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Overview Banner - Optimized Cloud Persistence Notice */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs shrink-0 mt-0.5 sm:mt-0">
            <BookMarked className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-slate-900">PDF Knowledge Base &amp; Lexicon Repository</h2>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                <Database className="w-3 h-3 text-emerald-600" />
                Firebase Cloud Sync Active
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Authoritative Brahui dictionaries, lexicons, and grammar textbooks. Only lightweight text components (rules, chunks &amp; metadata) are stored in Firebase Cloud, keeping storage ultra-fast and permanently free-tier compliant.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-900 text-xs font-semibold border border-amber-200">
            {documents.length} Reference Books Loaded
          </span>
        </div>
      </div>

      {extractSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-start gap-2.5 animate-in fade-in shadow-2xs">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block text-emerald-900">Active Learning Extraction Complete</span>
            <span>{extractSuccess}</span>
          </div>
          <button onClick={() => setExtractSuccess(null)} className="text-emerald-600 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Upload & Indexing Card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Ingest New Linguistic Reference</h3>
            <p className="text-[11px] text-slate-500">
              PDF files are parsed in-memory into lightweight semantic text chunks and grammar rules for cloud persistence.
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-lg text-xs self-start sm:self-auto">
            <button
              type="button"
              onClick={() => { setActiveMode('pdf'); setUploadError(null); }}
              className={`px-3 py-1 rounded font-semibold cursor-pointer transition-all ${
                activeMode === 'pdf' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Upload PDF
            </button>
            <button
              type="button"
              onClick={() => { setActiveMode('text'); setUploadError(null); }}
              className={`px-3 py-1 rounded font-semibold cursor-pointer transition-all ${
                activeMode === 'text' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Paste Text
            </button>
          </div>
        </div>

        <form onSubmit={handleUpload} className="p-4 sm:p-5 space-y-4">
          {uploadError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{uploadError}</span>
            </div>
          )}

          {uploadSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{uploadSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Document / Lexicon Title:
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Brahui-Urdu Comprehensive Lexicon (Bray / Mengal)"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Content Classification:
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white cursor-pointer"
              >
                <option value="dictionary">Dictionary / Lexicon</option>
                <option value="grammar">Grammar &amp; Syntax Handbook</option>
                <option value="corpus">Parallel Texts / Literature</option>
                <option value="literature">Folklore &amp; Proverbs</option>
              </select>
            </div>
          </div>

          {activeMode === 'pdf' ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl p-6 text-center cursor-pointer bg-slate-50/50 hover:bg-indigo-50/20 transition-all"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />

              <UploadCloud className="w-8 h-8 text-indigo-500 mx-auto mb-2" />

              {selectedFile ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-900">{selectedFile.name}</span>
                    <span className="text-xs text-slate-500">
                      ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-1">
                    Ready to ingest and extract rules (lightweight text-only cloud storage).
                  </span>
                </div>
              ) : (
                <div className="text-xs text-slate-600">
                  <span className="font-semibold text-indigo-600">Click to upload</span> or drag and drop PDF file here
                  <p className="text-[11px] text-slate-400 mt-1">Supports PDF dictionaries and grammars up to 20MB</p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Brahui Dictionary Entries or Grammar Notes:
              </label>
              <textarea
                rows={5}
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Paste Brahui vocabulary pairs, declension rules, or grammatical notes here..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white font-mono"
              />
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isUploading}
              className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isUploading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Extracting &amp; Indexing Knowledge Chunks...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Ingest into AI Knowledge Base</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Uploaded Documents List */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Active Reference Documents &amp; Dictionaries</h3>
            <p className="text-[11px] text-slate-500">
              Clean metadata, chunk counts, and interactive Preview &amp; Edit triggers for extracted rules and text chunks.
            </p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reference books..."
              className="pl-8 pr-3 py-1 text-xs border border-slate-300 rounded-lg bg-white w-full sm:w-48 sm:focus:w-64 transition-all focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
              <span>Loading reference library...</span>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No matching knowledge documents found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 bg-slate-50/60 border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-xs transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header info */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl shrink-0 shadow-2xs">
                          <BookOpen className="w-4 h-4" />
                        </span>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 leading-snug truncate" title={doc.title}>
                            {doc.title}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono truncate block" title={doc.filename}>
                            {doc.filename}
                          </span>
                        </div>
                      </div>

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 uppercase shrink-0">
                        {doc.type}
                      </span>
                    </div>

                    {/* Metadata Badges Strip */}
                    <div className="flex items-center gap-2 flex-wrap mb-2.5 text-[11px] text-slate-600">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 font-semibold">
                        <Layers className="w-3 h-3 text-indigo-600" />
                        {doc.chunksCount || doc.chunks?.length || 0} Chunks
                      </span>
                      {doc.pageCount && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          <FileText className="w-3 h-3 text-slate-500" />
                          {doc.pageCount} Pages
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                        <Database className="w-3 h-3 text-emerald-600" />
                        Text in Cloud
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 mb-3 leading-relaxed">
                      {doc.sampleSummary || 'No summary provided.'}
                    </p>
                  </div>

                  {/* Actions & Triggers Strip */}
                  <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between gap-2 text-xs">
                    <div className="text-[10px] text-slate-400 truncate">
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* PREVIEW TRIGGER (Eye icon) */}
                      <button
                        type="button"
                        onClick={() => handleOpenPreview(doc)}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs hover:text-indigo-600"
                        title="Preview extracted rules and text chunks"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Preview</span>
                      </button>

                      {/* EDIT TRIGGER (Pencil icon) */}
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(doc)}
                        className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs hover:border-indigo-400"
                        title="Edit extracted text rules directly"
                      >
                        <Pencil className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Edit</span>
                      </button>

                      {/* EXTRACT RULES TRIGGER */}
                      <button
                        type="button"
                        onClick={() => handleExtractRules(doc.id, doc.title)}
                        disabled={extractingDocId === doc.id}
                        className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                        title="Extract grammar rules & vocabulary"
                      >
                        {extractingDocId === doc.id ? (
                          <div className="w-3 h-3 border-2 border-amber-700 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Sparkles className="w-3 h-3 text-amber-700" />
                        )}
                        <span className="hidden sm:inline">Extract</span>
                      </button>

                      {/* DELETE TRIGGER */}
                      <button
                        type="button"
                        onClick={() => handleDeleteDoc(doc.id, doc.title)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                        title="Remove document from knowledge base"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* INTERACTIVE PREVIEW MODAL (Eye Trigger)                  */}
      {/* ======================================================== */}
      {previewDoc && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 border border-slate-200">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                    <Eye className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    Preview: {previewDoc.title}
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                  <span>{previewDoc.filename}</span>
                  <span>•</span>
                  <span>{previewDoc.chunksCount || previewDoc.chunks?.length || 0} chunks</span>
                  <span>•</span>
                  <span className="text-emerald-700 font-medium">Text synced to Firebase Cloud</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSwitchFromPreviewToEdit}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Switch to Edit Mode"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit Rules</span>
                </button>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Tabs Bar */}
            <div className="px-5 pt-3 bg-white border-b border-slate-200 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewTab('rules')}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 cursor-pointer transition-all flex items-center gap-1.5 ${
                  previewTab === 'rules'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileCode className="w-4 h-4" />
                <span>Extracted Grammar Rules</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('chunks')}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 cursor-pointer transition-all flex items-center gap-1.5 ${
                  previewTab === 'chunks'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Indexed Semantic Chunks ({previewDoc.chunks?.length || 0})</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4 bg-slate-50/40">
              {isLoadingPreview ? (
                <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
                  <span>Loading document rules...</span>
                </div>
              ) : previewTab === 'rules' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-700">
                      Extracted Text Rules &amp; Syntactic Patterns:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyRules(previewRulesText)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded text-[11px] font-medium text-slate-700 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedRules ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600 font-semibold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Rules</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed border border-slate-800 max-h-[50vh] overflow-y-auto select-text">
                    {previewRulesText || 'No extracted rules found for this document.'}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <span className="text-xs font-semibold text-slate-700 block">
                    Indexed Text Chunks (Sent to AI Translation Memory):
                  </span>
                  {(previewDoc.chunks || []).map((chunk, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-indigo-600 flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          CHUNK #{idx + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">{chunk.length} chars</span>
                          <button
                            type="button"
                            onClick={() => handleCopyChunk(chunk, idx)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 cursor-pointer"
                            title="Copy chunk text"
                          >
                            {copiedChunkIdx === idx ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-700 font-mono leading-relaxed break-words bg-slate-50 p-2.5 rounded border border-slate-100">
                        {chunk}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Linguistic memory active across AI Studio &amp; Vercel deployments.
              </span>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* INTERACTIVE EDIT MODAL (Pencil Trigger)                  */}
      {/* ======================================================== */}
      {editDoc && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 border border-slate-200">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                    <Pencil className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    Edit Extracted Rules: {editDoc.title}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Modify extracted grammar rules or text chunks directly. Saves directly to Firebase Cloud.
                </p>
              </div>

              <button
                onClick={() => setEditDoc(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="px-5 pt-3 bg-white border-b border-slate-200 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditTab('rules')}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 cursor-pointer transition-all flex items-center gap-1.5 ${
                  editTab === 'rules'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileCode className="w-4 h-4" />
                <span>Edit Extracted Rules (Text Format)</span>
              </button>
              <button
                type="button"
                onClick={() => setEditTab('chunks')}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 cursor-pointer transition-all flex items-center gap-1.5 ${
                  editTab === 'chunks'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Edit Semantic Chunks</span>
              </button>
              <button
                type="button"
                onClick={() => setEditTab('meta')}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 cursor-pointer transition-all flex items-center gap-1.5 ${
                  editTab === 'meta'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Info className="w-4 h-4" />
                <span>Document Details</span>
              </button>
            </div>

            {/* Feedback Notifications */}
            {editSaveSuccess && (
              <div className="mx-5 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{editSaveSuccess}</span>
              </div>
            )}
            {editSaveError && (
              <div className="mx-5 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{editSaveError}</span>
              </div>
            )}

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {editTab === 'rules' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span className="font-semibold">Format Guide for Rules:</span>
                    <span className="text-[11px] text-slate-400">
                      Parsed blocks: ### Rule &bull; Category &bull; Pattern &bull; Explanation &bull; Example
                    </span>
                  </div>

                  <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-lg text-[11px] text-indigo-900 font-mono space-y-1">
                    <div>### Rule: Strict SOV Word Order</div>
                    <div>Category: Syntax</div>
                    <div>Pattern: Subject + Complement/Object + Finite Verb</div>
                    <div>Explanation: The inflected finite verb or copula must terminate the sentence.</div>
                    <div>Example (Correct): ای کتاب ءِ خوانوہ</div>
                    <div>Example (Incorrect): ای خوانوہ کتاب ءِ</div>
                    <div>Gloss: I read the book</div>
                  </div>

                  <textarea
                    rows={14}
                    value={editRulesText}
                    onChange={(e) => setEditRulesText(e.target.value)}
                    placeholder="Enter or modify extracted grammar rules in standard text format..."
                    className="w-full p-3.5 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-900 text-slate-100 leading-relaxed resize-y"
                  />
                </div>
              ) : editTab === 'chunks' ? (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600">
                    Separate chunks using <code className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-indigo-600">---CHUNK_BREAK---</code> on its own line:
                  </p>

                  <textarea
                    rows={14}
                    value={editChunksText}
                    onChange={(e) => setEditChunksText(e.target.value)}
                    placeholder="Enter or modify text chunks separated by ---CHUNK_BREAK---..."
                    className="w-full p-3.5 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white leading-relaxed resize-y"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Document Title:
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Sample Summary:
                    </label>
                    <textarea
                      rows={5}
                      value={editSummary}
                      onChange={(e) => setEditSummary(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 space-y-1">
                    <div><strong>Original Filename:</strong> {editDoc.filename}</div>
                    <div><strong>File Size:</strong> {(editDoc.fileSize / (1024 * 1024)).toFixed(2)} MB</div>
                    <div><strong>Ingested On:</strong> {new Date(editDoc.uploadedAt).toLocaleString()}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer with Save Trigger */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Changes immediately re-synchronize to Firebase Firestore.
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditDoc(null)}
                  className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {isSavingEdit ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving &amp; Syncing to Cloud...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save &amp; Sync Rules</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
