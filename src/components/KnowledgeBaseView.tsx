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
  X,
  FileSpreadsheet,
  Database,
  BookMarked,
  Sparkles,
  Cpu
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
  const [previewDoc, setPreviewDoc] = useState<KnowledgeDocument | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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
      setUploadError(`"${file.name}" is not a PDF file. Please upload a PDF document or switch to the "Paste Lexicon Text Directly" tab.`);
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
        `Successfully ingested "${data.document.title}" into AI translation memory (${data.document.chunksCount} chunks indexed). Actively extracted ${rulesCount} grammar rules and ${vocabCount} vocabulary pairs applied globally!`
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
          `Extracted ${res.data.extractedRulesCount} grammar rules and ${res.data.extractedVocabCount} vocabulary pairs from "${docTitle}". Applied globally across all translations!`
        );
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
    if (!confirm(`Are you sure you want to remove "${docTitle}" from the active knowledge base?`)) return;

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

  const filteredDocs = documents.filter((doc) => {
    return (
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.sampleSummary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.type.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Overview Banner - Fully Responsive */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-2xs shrink-0 mt-0.5 sm:mt-0">
            <BookMarked className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">PDF Knowledge Base &amp; Lexicon Repository</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload authoritative Brahui dictionaries, vocabulary lists, and grammar textbooks. The system actively extracts rules, vocabulary, and grammar context for global translation accuracy.
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
              Files are automatically parsed into semantic chunks and analyzed for grammar rules and vocabulary.
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
                    Ready to ingest and extract rules.
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
              The AI retrieves relevant chunks from these documents during every translation.
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
            <div className="py-8 text-center text-xs text-slate-400">Loading reference library...</div>
          ) : filteredDocs.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No matching knowledge documents found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 bg-slate-50/50 border border-slate-200 rounded-xl hover:border-indigo-300 transition-colors shadow-2xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="p-2 bg-indigo-100 text-indigo-700 rounded-lg shrink-0">
                          <BookOpen className="w-4 h-4" />
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 leading-snug">{doc.title}</h4>
                          <span className="text-[10px] text-slate-400 font-mono">{doc.filename}</span>
                        </div>
                      </div>

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 uppercase shrink-0">
                        {doc.type}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-3 mb-3 leading-relaxed">
                      {doc.sampleSummary}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
                    <div className="flex items-center gap-2 flex-wrap text-[11px]">
                      <span><strong>{doc.chunksCount}</strong> chunks</span>
                      {doc.pageCount && <span>• <strong>{doc.pageCount}</strong> pgs</span>}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleExtractRules(doc.id, doc.title)}
                        disabled={extractingDocId === doc.id}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                        title="Read and extract grammar rules and vocabulary from this document"
                      >
                        {extractingDocId === doc.id ? (
                          <div className="w-3 h-3 border-2 border-amber-700 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Sparkles className="w-3 h-3 text-amber-700" />
                        )}
                        <span>Extract Rules</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPreviewDoc(doc)}
                        className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded text-slate-700 font-medium text-[11px] flex items-center gap-1 cursor-pointer"
                        title="Preview indexed chunks"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Chunks</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteDoc(doc.id, doc.title)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                        title="Remove document"
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

      {/* Chunks Inspector Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{previewDoc.title}</h3>
                <span className="text-xs text-slate-500">
                  {previewDoc.chunksCount} indexed semantic chunks in translation memory
                </span>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-3">
              {previewDoc.chunks.map((chunk, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed text-slate-700 font-mono break-words">
                  <span className="text-[10px] font-bold text-indigo-600 block mb-1">
                    CHUNK #{idx + 1}
                  </span>
                  {chunk}
                </div>
              ))}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
