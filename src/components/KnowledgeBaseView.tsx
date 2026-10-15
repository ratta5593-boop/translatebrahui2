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
  RefreshCw,
  CheckSquare,
  Square,
  ShieldCheck,
  ListChecks,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { KnowledgeDocument, GrammarRule, ReferenceCategory } from '../types/index.js';
import { authFetch, authSafeFetchJson } from '../utils/auth.js';

interface KnowledgeBaseViewProps {
  onDocsChanged: () => void;
  onLogout?: () => void;
  adminUsername?: string;
}

export const getDocumentCategory = (doc: KnowledgeDocument): ReferenceCategory => {
  const t = (doc.type || '').toLowerCase();
  const title = (doc.title || '').toLowerCase();
  const summary = (doc.sampleSummary || '').toLowerCase();

  if (
    t === 'dictionary' ||
    t === 'lexicon' ||
    title.includes('lexicon') ||
    title.includes('dictionary') ||
    title.includes('لغت') ||
    title.includes('قاموس')
  ) {
    return 'Dictionary / Lexicon';
  }
  if (
    t === 'grammar' ||
    t === 'syntax' ||
    title.includes('grammar') ||
    title.includes('syntax') ||
    title.includes('صرف') ||
    title.includes('نحو')
  ) {
    return 'Grammar & Syntax Handbook';
  }
  if (
    t === 'folklore' ||
    title.includes('proverb') ||
    title.includes('folklore') ||
    title.includes('ضرب المثل') ||
    summary.includes('proverb') ||
    summary.includes('folklore')
  ) {
    return 'Folklore & Proverbs';
  }
  return 'Parallel Texts / Literature';
};

export const KnowledgeBaseView: React.FC<KnowledgeBaseViewProps> = ({
  onDocsChanged,
  onLogout,
  adminUsername = 'admin'
}) => {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [extractingDocId, setExtractingDocId] = useState<string | null>(null);
  const [extractSuccess, setExtractSuccess] = useState<string | null>(null);

  // Upload form state
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState<'dictionary' | 'grammar' | 'corpus' | 'folklore'>('dictionary');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [manualText, setManualText] = useState('');
  const [activeMode, setActiveMode] = useState<'pdf' | 'text'>('pdf');
  const [searchQuery, setSearchQuery] = useState('');

  // Category Filtering & Grouping State (Requirement 1)
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | ReferenceCategory>('all');
  const [isExportingDict, setIsExportingDict] = useState(false);
  const [dictExportFeedback, setDictExportFeedback] = useState<string | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<string | null>(null);

  // ========================================================
  // PDF INGESTION & RULE APPROVAL WORKFLOW STATE
  // ========================================================
  const [isWorkflowOpen, setIsWorkflowOpen] = useState(false);
  const [workflowDoc, setWorkflowDoc] = useState<KnowledgeDocument | null>(null);
  const [workflowPlainText, setWorkflowPlainText] = useState<string>('');
  const [candidateRules, setCandidateRules] = useState<GrammarRule[]>([]);
  const [selectedRuleIds, setSelectedRuleIds] = useState<Set<string>>(new Set());
  const [isConvertingToRules, setIsConvertingToRules] = useState(false);
  const [isApprovingRules, setIsApprovingRules] = useState(false);
  const [workflowSuccessMsg, setWorkflowSuccessMsg] = useState<string | null>(null);
  const [workflowErrorMsg, setWorkflowErrorMsg] = useState<string | null>(null);
  const [copiedPlainText, setCopiedPlainText] = useState(false);
  const [workflowStep, setWorkflowStep] = useState<'text' | 'rules' | 'approved'>('text');
  const [approvedRulesHistory, setApprovedRulesHistory] = useState<GrammarRule[]>([]);

  // Preview Modal State
  const [previewDoc, setPreviewDoc] = useState<KnowledgeDocument | null>(null);
  const [previewRulesText, setPreviewRulesText] = useState<string>('');
  const [previewChunks, setPreviewChunks] = useState<string[]>([]);
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

  // View Filter / Section
  const [activeViewSection, setActiveViewSection] = useState<'documents' | 'approved-rules'>('documents');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const plainTextareaRef = useRef<HTMLTextAreaElement | null>(null);

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

  const fetchApprovedRules = async () => {
    try {
      const res = await authSafeFetchJson<{ rules: GrammarRule[] }>('/api/admin/rules');
      if (res.ok && res.data && Array.isArray(res.data.rules)) {
        const fromPdfs = res.data.rules.filter(
          (r) => r.sourceType === 'pdf_extraction' || (r.sourceDocId && r.sourceDocId.length > 0)
        );
        setApprovedRulesHistory(fromPdfs);
      }
    } catch (err) {
      console.error('Error fetching approved rules:', err);
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchApprovedRules();
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

  const handleExportDictionary = async (format: 'xlsx' | 'csv' = 'xlsx') => {
    setIsExportingDict(true);
    setDictExportFeedback(null);
    try {
      const res = await authFetch(`/api/dictionary/export?format=${format}`);
      if (!res.ok) throw new Error('Failed to export dictionary');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Brahui_Dictionary_Synchronized_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setDictExportFeedback(`Dictionary database successfully exported to ${format.toUpperCase()}! Download started.`);
      setTimeout(() => setDictExportFeedback(null), 5000);
    } catch (err: any) {
      console.error('Export error:', err);
      setDictExportFeedback(err.message || 'Error exporting dictionary.');
      setTimeout(() => setDictExportFeedback(null), 5000);
    } finally {
      setIsExportingDict(false);
    }
  };

  // ========================================================
  // PDF UPLOAD & AUTOMATIC CONVERSION TO EDITABLE TEXT
  // ========================================================
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

      // 1. PDF successfully converted to clean plain text!
      const convertedText = data.plainText || (data.document?.chunks ? data.document.chunks.join('\n\n') : '') || '';
      const docItem = data.document;

      setUploadSuccess(
        `PDF "${docItem.title}" successfully ingested and converted to editable plain text (${docItem.pageCount || 1} pages, ${docItem.chunksCount} lightweight chunks indexed).`
      );

      // Open the PDF Ingestion and Rule Approval Workflow immediately
      setWorkflowDoc(docItem);
      setWorkflowPlainText(convertedText);
      setCandidateRules([]);
      setSelectedRuleIds(new Set());
      setWorkflowStep('text');
      setWorkflowSuccessMsg(null);
      setWorkflowErrorMsg(null);
      setIsWorkflowOpen(true);

      // Reset form
      setSelectedFile(null);
      setTitle('');
      setManualText('');
      if (fileInputRef.current) fileInputRef.current.value = '';

      fetchDocuments();
      fetchApprovedRules();
      onDocsChanged();
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('Upload error:', err);
      if (err.name === 'AbortError') {
        setUploadError('Upload timed out after 45 seconds. For very large PDF files, please extract text or paste key chapters in the Text tab.');
      } else if (err.message === 'Failed to fetch' || err.message?.includes('NetworkError')) {
        setUploadError('Network connection to the server was interrupted during upload. Please ensure your PDF is under 20MB, or paste the text content directly.');
      } else {
        setUploadError(err.message || 'Error uploading document.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  // ========================================================
  // OPEN INGESTION & RULE APPROVAL WORKFLOW FOR EXISTING DOC
  // ========================================================
  const handleOpenWorkflowForDoc = async (doc: KnowledgeDocument) => {
    setWorkflowDoc(doc);
    setCandidateRules([]);
    setSelectedRuleIds(new Set());
    setWorkflowStep('text');
    setWorkflowSuccessMsg(null);
    setWorkflowErrorMsg(null);
    setIsWorkflowOpen(true);

    try {
      const res = await authSafeFetchJson<{
        success: boolean;
        plainText: string;
      }>(`/api/knowledge/documents/${doc.id}/plain-text`);

      if (res.ok && res.data && res.data.plainText) {
        setWorkflowPlainText(res.data.plainText);
      } else if (doc.chunks && doc.chunks.length > 0) {
        setWorkflowPlainText(doc.chunks.join('\n\n'));
      } else {
        setWorkflowPlainText(doc.sampleSummary || 'No text extracted for this document.');
      }
    } catch (err) {
      console.error('Error fetching plain text for workflow:', err);
      if (doc.chunks && doc.chunks.length > 0) {
        setWorkflowPlainText(doc.chunks.join('\n\n'));
      } else {
        setWorkflowPlainText(doc.sampleSummary || '');
      }
    }
  };

  // ========================================================
  // "CONVERT TO RULE" BUTTON HANDLER
  // ========================================================
  const handleConvertToRules = async () => {
    if (!workflowPlainText.trim()) {
      setWorkflowErrorMsg('Please ensure there is plain text in the text box before converting to rules.');
      return;
    }

    setIsConvertingToRules(true);
    setWorkflowErrorMsg(null);
    setWorkflowSuccessMsg(null);

    try {
      const res = await authSafeFetchJson<{
        success: boolean;
        candidateRules: GrammarRule[];
        totalCandidates: number;
        isDictionaryMode?: boolean;
        message?: string;
      }>('/api/knowledge/generate-candidate-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: workflowPlainText.trim(),
          title: workflowDoc?.title || 'Brahui Linguistic Reference',
          docId: workflowDoc?.id,
          docType: workflowDoc?.type,
        }),
      });

      if (res.ok && res.data) {
        if (res.data.isDictionaryMode) {
          setCandidateRules([]);
          setSelectedRuleIds(new Set());
          setWorkflowStep('rules');
          setWorkflowSuccessMsg(
            res.data.message ||
              'Strict Dictionary / Lexicon Rule: Only vocabulary terms and definitions are extracted from this document. General grammatical syntax rules are strictly excluded.'
          );
        } else if (Array.isArray(res.data.candidateRules)) {
          const rules = res.data.candidateRules;
          setCandidateRules(rules);
          const allIds = new Set(rules.map((r) => r.id));
          setSelectedRuleIds(allIds);
          setWorkflowStep('rules');
          setWorkflowSuccessMsg(
            `Successfully converted plain text into ${rules.length} structured candidate rules! Review and check the rules below, then click "Approve" to save them to Firebase Cloud.`
          );
        }
      } else {
        throw new Error(res.error || 'Failed to extract candidate rules from plain text.');
      }
    } catch (err: any) {
      console.error('Error converting to candidate rules:', err);
      setWorkflowErrorMsg(err.message || 'Error processing plain text into rules.');
    } finally {
      setIsConvertingToRules(false);
    }
  };

  const handleDownloadDictionary = async (format: 'xlsx' | 'csv' = 'xlsx') => {
    setIsExportingDict(true);
    setDictExportFeedback(null);
    try {
      const res = await authFetch(`/api/dictionary/export?format=${format}`);
      if (!res.ok) throw new Error('Failed to export dictionary');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Brahui_Dictionary_Synchronized_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setDictExportFeedback(`Complete synchronized dictionary exported to ${format.toUpperCase()}!`);
      setTimeout(() => setDictExportFeedback(null), 4000);
    } catch (err: any) {
      console.error('Export error:', err);
      setDictExportFeedback(err.message || 'Failed to download dictionary.');
    } finally {
      setIsExportingDict(false);
    }
  };

  // Toggle selection for a single candidate rule
  const handleToggleSelectRule = (ruleId: string) => {
    const next = new Set(selectedRuleIds);
    if (next.has(ruleId)) {
      next.delete(ruleId);
    } else {
      next.add(ruleId);
    }
    setSelectedRuleIds(next);
  };

  // Select / Deselect All candidate rules
  const handleToggleSelectAllRules = () => {
    if (selectedRuleIds.size === candidateRules.length) {
      setSelectedRuleIds(new Set());
    } else {
      setSelectedRuleIds(new Set(candidateRules.map((r) => r.id)));
    }
  };

  // ========================================================
  // ADMIN APPROVAL TO LEARNED RULES (FIREBASE CLOUD DATABASE)
  // ========================================================
  const handleApproveSelectedRules = async () => {
    const rulesToApprove = candidateRules.filter((r) => selectedRuleIds.has(r.id));
    if (rulesToApprove.length === 0) {
      setWorkflowErrorMsg('Please select at least one candidate rule to approve.');
      return;
    }

    setIsApprovingRules(true);
    setWorkflowErrorMsg(null);
    setWorkflowSuccessMsg(null);

    try {
      const res = await authSafeFetchJson<{
        success: boolean;
        message: string;
        approvedCount: number;
        rules: GrammarRule[];
      }>('/api/knowledge/approve-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rules: rulesToApprove,
          docId: workflowDoc?.id,
          docTitle: workflowDoc?.title,
        }),
      });

      if (res.ok && res.data) {
        setWorkflowStep('approved');
        setWorkflowSuccessMsg(
          `✓ Successfully approved ${res.data.approvedCount} rule(s) to official "Learned Rules" in Firebase Cloud! These rules are now strictly enforced during Brahui translations.`
        );
        fetchDocuments();
        fetchApprovedRules();
        onDocsChanged();
      } else {
        throw new Error(res.error || 'Failed to approve rules.');
      }
    } catch (err: any) {
      console.error('Error approving rules:', err);
      setWorkflowErrorMsg(err.message || 'Error approving rules to database.');
    } finally {
      setIsApprovingRules(false);
    }
  };

  // Copy plain text to clipboard
  const handleCopyPlainText = () => {
    navigator.clipboard.writeText(workflowPlainText);
    setCopiedPlainText(true);
    setTimeout(() => setCopiedPlainText(false), 2000);
  };

  // Select all text in the textarea
  const handleSelectAllPlainText = () => {
    if (plainTextareaRef.current) {
      plainTextareaRef.current.focus();
      plainTextareaRef.current.select();
    }
  };

  // ========================================================
  // PREVIEW MODAL LOGIC (Eye trigger)
  // ========================================================
  const handleOpenPreview = async (doc: KnowledgeDocument) => {
    setPreviewDoc(doc);
    setPreviewRulesText('');
    setPreviewChunks(doc.chunks || []);
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
        if (Array.isArray(res.data.chunks)) {
          setPreviewChunks(res.data.chunks);
        }
      } else {
        setPreviewRulesText(doc.extractedRulesText || 'No extracted rules found for this specific document.');
      }
    } catch (err) {
      console.error('Error loading preview rules:', err);
      setPreviewRulesText(doc.extractedRulesText || 'Error loading document rules.');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // ========================================================
  // EDIT MODAL LOGIC (Pencil trigger)
  // ========================================================
  const handleOpenEdit = async (doc: KnowledgeDocument) => {
    setEditDoc(doc);
    setEditTitle(doc.title);
    setEditSummary(doc.sampleSummary || '');
    setEditRulesText(doc.extractedRulesText || '');
    setEditChunksText((doc.chunks || []).join('\n\n---CHUNK_BREAK---\n\n'));
    setEditTab('rules');
    setEditSaveSuccess(null);
    setEditSaveError(null);

    try {
      const res = await authSafeFetchJson<{
        success: boolean;
        rulesText: string;
        chunks: string[];
      }>(`/api/knowledge/documents/${doc.id}/rules`);

      if (res.ok && res.data) {
        if (res.data.rulesText) {
          setEditRulesText(res.data.rulesText);
        }
        if (Array.isArray(res.data.chunks) && res.data.chunks.length > 0) {
          setEditChunksText(res.data.chunks.join('\n\n---CHUNK_BREAK---\n\n'));
        }
      }
    } catch (err) {
      console.error('Error loading document rules for edit:', err);
    }
  };

  const handleSwitchFromPreviewToEdit = () => {
    if (!previewDoc) return;
    const targetDoc = previewDoc;
    setPreviewDoc(null);
    handleOpenEdit(targetDoc);
  };

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
        fetchApprovedRules();
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

  const handleDeleteDoc = async (id: string, docTitle: string) => {
    const confirmed = confirm(
      `Remove reference book "${docTitle}"?\n\n` +
      `Note: This will only remove the PDF document card from the Knowledge Base view.\n` +
      `Crucially, all learned/approved grammar rules and extracted vocabulary entries derived from this book will remain fully intact and active in the system.`
    );
    if (!confirmed) return;

    // 1. Optimistic removal: instantly remove book card from UI
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    setDeleteFeedback(
      `Reference book "${docTitle}" removed. All approved grammar rules and vocabulary entries remain active in the system.`
    );

    try {
      const res = await authSafeFetchJson<{
        success: boolean;
        message?: string;
        activeRulesCount?: number;
        activeDictCount?: number;
      }>(`/api/knowledge/documents/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setDeleteFeedback(
          res.data?.message ||
            `Reference book "${docTitle}" removed from Knowledge Base. All learned rules and dictionary items remain intact.`
        );
        setTimeout(() => setDeleteFeedback(null), 6000);
        onDocsChanged();
      } else {
        // Rollback on server error
        fetchDocuments();
        setDeleteFeedback(null);
        alert(res.error || 'Failed to remove document from database.');
      }
    } catch (err) {
      console.error('Failed to delete document:', err);
      fetchDocuments();
      setDeleteFeedback(null);
    }
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
              <h2 className="text-base font-bold text-slate-900">PDF Ingestion &amp; Learned Rules Knowledge Base</h2>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                <Database className="w-3 h-3 text-emerald-600" />
                Firebase Cloud Sync Active
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Upload PDF dictionaries and grammars: convert to editable plain text, inspect/copy text, extract candidate rules, and approve directly to Firebase Learned Rules cloud database.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <span className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-900 text-xs font-semibold border border-amber-200">
            {documents.length} Reference Books Loaded
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-900 text-xs font-semibold border border-indigo-200">
            {approvedRulesHistory.length} Approved PDF Rules Active
          </span>
        </div>
      </div>

      {extractSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-start gap-2.5 animate-in fade-in shadow-2xs">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block text-emerald-900">Rule Extraction Complete</span>
            <span>{extractSuccess}</span>
          </div>
          <button onClick={() => setExtractSuccess(null)} className="text-emerald-600 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {deleteFeedback && (
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs flex items-start gap-2.5 animate-in fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block text-emerald-400">Reference Book Removed (Learned Rules Preserved)</span>
            <span className="text-slate-300">{deleteFeedback}</span>
          </div>
          <button onClick={() => setDeleteFeedback(null)} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. UPLOAD & INGESTION FORM (Converts PDF to Plain Text)   */}
      {/* ======================================================== */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <UploadCloud className="w-4 h-4 text-indigo-600" />
              Upload PDF &amp; Convert to Editable Text
            </h3>
            <p className="text-[11px] text-slate-500">
              PDFs are converted in-memory into clean, plain editable text for previewing, rule extraction, and approval.
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
                    Click "Convert to Plain Text &amp; Ingest" to open the editable text box and rule approval workflow.
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
                  <span>Converting PDF to Plain Text...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Convert to Plain Text &amp; Start Ingestion</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ======================================================== */}
      {/* 2. SECTION TABS: Active Documents vs Approved Rules      */}
      {/* ======================================================== */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveViewSection('documents')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
            activeViewSection === 'documents'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Uploaded PDF Documents ({documents.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveViewSection('approved-rules')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
            activeViewSection === 'approved-rules'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Approved Learned Rules ({approvedRulesHistory.length})</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 3. UPLOADED DOCUMENTS LIST                               */}
      {/* ======================================================== */}
      {activeViewSection === 'documents' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Active Reference Documents &amp; Dictionaries</h3>
              <p className="text-[11px] text-slate-500">
                Click &ldquo;Ingest &amp; Rules&rdquo; to trigger the plain text review &amp; candidate rule approval workflow.
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

          {/* Category Filter Pills & Search Bar (Requirement 1) */}
          <div className="p-3 bg-slate-50/60 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-slate-500 mr-1">Categories:</span>
              <button
                type="button"
                onClick={() => setActiveCategoryFilter('all')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeCategoryFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                All Categories ({filteredDocs.length})
              </button>
              {(
                [
                  'Dictionary / Lexicon',
                  'Grammar & Syntax Handbook',
                  'Parallel Texts / Literature',
                  'Folklore & Proverbs',
                ] as ReferenceCategory[]
              ).map((catName) => {
                const count = documents.filter((d) => getDocumentCategory(d) === catName).length;
                const isSelected = activeCategoryFilter === catName;
                return (
                  <button
                    key={catName}
                    type="button"
                    onClick={() => setActiveCategoryFilter(catName)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <span>{catName}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {dictExportFeedback && (
            <div className="mx-4 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center justify-between gap-2 animate-in fade-in">
              <span className="flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {dictExportFeedback}
              </span>
              <button onClick={() => setDictExportFeedback(null)} className="text-emerald-700 hover:text-emerald-900">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="p-4 sm:p-5">
            {isLoading ? (
              <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
                <span>Loading reference library...</span>
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No matching knowledge documents found for current search.
              </div>
            ) : (
              /* CATEGORY-BASED REFERENCE GROUPING (Requirement 1) */
              <div className="space-y-6">
                {(
                  [
                    {
                      category: 'Dictionary / Lexicon' as ReferenceCategory,
                      title: 'Dictionary / Lexicon',
                      subtitle: 'Bilingual & Trilingual Lexicographical Repositories',
                      description: 'Comprehensive Brahui-Urdu-English vocabulary, root terms, definitions, and word senses. Strict vocabulary extraction mode enforced.',
                      icon: BookMarked,
                      headerBg: 'bg-emerald-50/80 border-emerald-200',
                      borderClass: 'border-emerald-200',
                      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                      iconBoxClass: 'bg-emerald-600 text-white',
                    },
                    {
                      category: 'Grammar & Syntax Handbook' as ReferenceCategory,
                      title: 'Grammar & Syntax Handbook',
                      subtitle: 'Linguistic Handbooks & Structural Syntactic Manuals',
                      description: 'Authoritative grammatical treatises, Brahui SOV sentence architecture, case declensions, and verbal conjugation paradigms.',
                      icon: BookOpen,
                      headerBg: 'bg-amber-50/80 border-amber-200',
                      borderClass: 'border-amber-200',
                      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
                      iconBoxClass: 'bg-amber-600 text-white',
                    },
                    {
                      category: 'Parallel Texts / Literature' as ReferenceCategory,
                      title: 'Parallel Texts / Literature',
                      subtitle: 'Bilingual Aligned Corpora & Classic Literature',
                      description: 'Side-by-side aligned Brahui-Urdu and Brahui-English literary works, prose, poetry, and comparative bilingual datasets.',
                      icon: Layers,
                      headerBg: 'bg-indigo-50/80 border-indigo-200',
                      borderClass: 'border-indigo-200',
                      badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300',
                      iconBoxClass: 'bg-indigo-600 text-white',
                    },
                    {
                      category: 'Folklore & Proverbs' as ReferenceCategory,
                      title: 'Folklore & Proverbs',
                      subtitle: 'Idiomatic Lore, Oral Traditions & Cultural Heritage',
                      description: 'Brahui proverbs (ضرب المثل), folk sayings, cultural metaphors, and idiomatic expressions across Jhalawan and Sarawan dialects.',
                      icon: Sparkles,
                      headerBg: 'bg-purple-50/80 border-purple-200',
                      borderClass: 'border-purple-200',
                      badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
                      iconBoxClass: 'bg-purple-600 text-white',
                    },
                  ]
                )
                  .filter(
                    (cat) => activeCategoryFilter === 'all' || activeCategoryFilter === cat.category
                  )
                  .map((catGroup) => {
                    const CatIcon = catGroup.icon;
                    const catBooks = filteredDocs.filter(
                      (d) => getDocumentCategory(d) === catGroup.category
                    );

                    return (
                      <div
                        key={catGroup.category}
                        className={`border ${catGroup.borderClass} rounded-xl overflow-hidden bg-white shadow-2xs transition-all`}
                      >
                        {/* Distinct Category Header Banner */}
                        <div
                          className={`p-4 ${catGroup.headerBg} border-b flex flex-col md:flex-row md:items-center justify-between gap-3`}
                        >
                          <div className="flex items-start sm:items-center gap-3">
                            <span
                              className={`p-2.5 rounded-xl ${catGroup.iconBoxClass} shadow-2xs shrink-0 mt-0.5 sm:mt-0`}
                            >
                              <CatIcon className="w-5 h-5" />
                            </span>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-bold text-slate-900">
                                  {catGroup.title}
                                </h4>
                                <span
                                  className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${catGroup.badgeClass}`}
                                >
                                  {catBooks.length} {catBooks.length === 1 ? 'Reference Book' : 'Reference Books'}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 mt-0.5 max-w-2xl leading-relaxed">
                                {catGroup.description}
                              </p>
                            </div>
                          </div>

                          {/* Category Actions: Excel Export for Dictionary / Lexicon (Requirement 4) */}
                          {catGroup.category === 'Dictionary / Lexicon' && (
                            <div className="flex items-center gap-2 shrink-0 self-start md:self-auto flex-wrap">
                              <button
                                type="button"
                                id="kb-export-dictionary-excel-btn"
                                onClick={() => handleExportDictionary('xlsx')}
                                disabled={isExportingDict}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                                title="Download complete synchronized Brahui vocabulary database directly to Microsoft Excel (.xlsx)"
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                                <span>{isExportingDict ? 'Exporting...' : 'Export Dictionary to Excel'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExportDictionary('csv')}
                                disabled={isExportingDict}
                                className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
                                title="Download vocabulary database as CSV"
                              >
                                <span>CSV</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Separate Books Grid for this Category */}
                        <div className="p-4 bg-slate-50/40">
                          {catBooks.length === 0 ? (
                            <div className="py-6 text-center text-slate-400 text-xs bg-white rounded-lg border border-dashed border-slate-200">
                              No reference books currently listed in this category matching &ldquo;{searchQuery}&rdquo;.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {catBooks.map((doc) => {
                                const docApprovedCount = approvedRulesHistory.filter(
                                  (r) => r.sourceDocId === doc.id || r.sourceDocTitle === doc.title
                                ).length;

                                return (
                                  <div
                                    key={doc.id}
                                    className="p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-xs transition-all flex flex-col justify-between"
                                  >
                                    <div>
                                      {/* Header info */}
                                      <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <span className="p-2.5 bg-slate-100 text-slate-700 rounded-xl shrink-0 shadow-2xs">
                                            <CatIcon className="w-4 h-4" />
                                          </span>
                                          <div className="min-w-0">
                                            <h4
                                              className="text-xs font-bold text-slate-900 leading-snug truncate"
                                              title={doc.title}
                                            >
                                              {doc.title}
                                            </h4>
                                            <span
                                              className="text-[10px] text-slate-400 font-mono truncate block"
                                              title={doc.filename}
                                            >
                                              {doc.filename}
                                            </span>
                                          </div>
                                        </div>

                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase shrink-0 border border-slate-200">
                                          {doc.type}
                                        </span>
                                      </div>

                                      {/* Metadata Badges Strip */}
                                      <div className="flex items-center gap-2 flex-wrap mb-2.5 text-[11px] text-slate-600">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 font-semibold text-[10px]">
                                          <Layers className="w-3 h-3 text-indigo-600" />
                                          {doc.chunksCount || doc.chunks?.length || 0} Chunks
                                        </span>
                                        {doc.pageCount && (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[10px]">
                                            <FileText className="w-3 h-3 text-slate-500" />
                                            {doc.pageCount} Pages
                                          </span>
                                        )}
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium text-[10px]">
                                          <Database className="w-3 h-3 text-emerald-600" />
                                          Firebase Cloud
                                        </span>
                                        {docApprovedCount > 0 && (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 font-bold text-[10px]">
                                            <ShieldCheck className="w-3 h-3 text-purple-600" />
                                            {docApprovedCount} Rules Approved
                                          </span>
                                        )}
                                      </div>

                                      <p className="text-xs text-slate-600 line-clamp-2 mb-3 leading-relaxed">
                                        {doc.sampleSummary || 'No summary provided.'}
                                      </p>
                                    </div>

                                    {/* Actions & Triggers Strip */}
                                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs flex-wrap">
                                      <div className="text-[10px] text-slate-400 truncate">
                                        {new Date(doc.uploadedAt).toLocaleDateString()}
                                      </div>

                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        {/* WORKFLOW TRIGGER: Ingest & Rules */}
                                        <button
                                          type="button"
                                          onClick={() => handleOpenWorkflowForDoc(doc)}
                                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs hover:border-amber-400"
                                          title="Open Ingestion & Rule Approval Workflow"
                                        >
                                          <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                                          <span>Ingest &amp; Rules</span>
                                        </button>

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

                                        {/* DELETE TRIGGER */}
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteDoc(doc.id, doc.title)}
                                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                          title="Remove PDF reference document card (all learned rules and dictionary items remain active)"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. APPROVED LEARNED RULES FROM PDFS VIEW                 */}
      {/* ======================================================== */}
      {activeViewSection === 'approved-rules' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Officially Approved Learned Rules from Knowledge Base PDFs
              </h3>
              <p className="text-[11px] text-slate-500">
                These rules have been verified by the administrator, persisted in Firebase Firestore, and are strictly enforced by the Brahui SOV translation engine.
              </p>
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              {approvedRulesHistory.length} Active Rules
            </span>
          </div>

          <div className="p-4 sm:p-5">
            {approvedRulesHistory.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                <BookOpen className="w-8 h-8 mx-auto text-slate-300" />
                <p>No rules have been approved from uploaded PDFs yet.</p>
                <p className="text-slate-500">
                  Upload a PDF dictionary or click &ldquo;Ingest &amp; Rules&rdquo; on an existing document to extract and approve candidate rules!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {approvedRulesHistory.map((rule, idx) => (
                  <div
                    key={rule.id || idx}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 hover:border-indigo-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 uppercase">
                          {rule.category}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900">{rule.title}</h4>
                      </div>

                      <div className="flex items-center gap-2">
                        {rule.sourceDocTitle && (
                          <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-mono">
                            Doc: {rule.sourceDocTitle}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Verified in Cloud
                        </span>
                      </div>
                    </div>

                    <div className="text-xs font-mono bg-white p-2.5 rounded border border-slate-200 text-indigo-950 font-semibold">
                      Pattern: {rule.pattern}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {rule.explanation}
                    </p>

                    {rule.examples && rule.examples.length > 0 && (
                      <div className="p-2.5 bg-emerald-50/60 border border-emerald-100 rounded-lg text-xs space-y-1">
                        <div className="text-emerald-950 font-semibold">
                          <span className="text-emerald-700 font-bold">Correct:</span> {rule.examples[0].correct}
                        </div>
                        {rule.examples[0].incorrect && (
                          <div className="text-slate-500 text-[11px]">
                            <span className="text-rose-600 font-bold">Incorrect:</span> {rule.examples[0].incorrect}
                          </div>
                        )}
                        {rule.examples[0].englishGloss && (
                          <div className="text-slate-600 text-[11px]">
                            <span className="font-bold">Gloss:</span> {rule.examples[0].englishGloss}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. PDF INGESTION & RULE APPROVAL WORKFLOW MODAL           */}
      {/* ======================================================== */}
      {isWorkflowOpen && workflowDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 border border-slate-200">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="p-1.5 bg-amber-100 text-amber-800 rounded-lg shadow-2xs">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    PDF Ingestion &amp; Rule Approval Workflow
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                    PDF Converted to Plain Text
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                  <span className="font-semibold text-slate-700">{workflowDoc.title}</span>
                  <span>•</span>
                  <span>{workflowDoc.filename}</span>
                  <span>•</span>
                  <span>{workflowDoc.pageCount || 1} pages</span>
                  <span>•</span>
                  <span>{workflowPlainText.length} characters</span>
                </div>
              </div>

              <button
                onClick={() => setIsWorkflowOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60 cursor-pointer transition-colors"
                title="Close Workflow"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Workflow Step Bar */}
            <div className="px-5 py-2.5 bg-indigo-50/70 border-b border-indigo-100 flex items-center justify-between gap-2 overflow-x-auto text-xs">
              <div className="flex items-center gap-2 font-semibold">
                <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] ${
                  workflowStep === 'text' ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'
                }`}>
                  {workflowStep !== 'text' ? <Check className="w-3 h-3" /> : '1'}
                </span>
                <span className={workflowStep === 'text' ? 'text-indigo-900 font-bold' : 'text-slate-600'}>
                  1. Plain Text Preview &amp; Edit
                </span>

                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />

                <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] ${
                  workflowStep === 'rules' ? 'bg-indigo-600 text-white' : workflowStep === 'approved' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {workflowStep === 'approved' ? <Check className="w-3 h-3" /> : '2'}
                </span>
                <span className={workflowStep === 'rules' ? 'text-indigo-900 font-bold' : 'text-slate-600'}>
                  2. Convert to Rules &amp; Select Checkboxes
                </span>

                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />

                <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] ${
                  workflowStep === 'approved' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  3
                </span>
                <span className={workflowStep === 'approved' ? 'text-emerald-900 font-bold' : 'text-slate-600'}>
                  3. Approve to Firebase Cloud
                </span>
              </div>

              {candidateRules.length > 0 && (
                <div className="text-xs text-indigo-700 font-semibold shrink-0">
                  {selectedRuleIds.size} of {candidateRules.length} selected
                </div>
              )}
            </div>

            {/* Notification Banners */}
            {workflowSuccessMsg && (
              <div className="mx-5 mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-start gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold block text-emerald-950">Status</span>
                  <span>{workflowSuccessMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setWorkflowSuccessMsg(null)}
                  className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {workflowErrorMsg && (
              <div className="mx-5 mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold block text-rose-900">Error</span>
                  <span>{workflowErrorMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setWorkflowErrorMsg(null)}
                  className="text-rose-700 hover:text-rose-900 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Modal Scrollable Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-6">
              {/* ======================================================== */}
              {/* STEP 1: CONVERTED EDITABLE PLAIN TEXT & COPY TOOLBAR     */}
              {/* ======================================================== */}
              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      Converted Plain Text (Interactive &amp; Editable)
                    </label>
                    <p className="text-[11px] text-slate-500">
                      The PDF content parsed into editable plain text. You can view, select, copy, or edit this text directly.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={handleSelectAllPlainText}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded text-[11px] font-semibold text-slate-700 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      title="Select all text inside the text box"
                    >
                      <ListChecks className="w-3.5 h-3.5 text-slate-500" />
                      <span>Select All</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyPlainText}
                      className="px-3 py-1 bg-white hover:bg-indigo-50 border border-indigo-200 rounded text-[11px] font-semibold text-indigo-700 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                      title="Copy full converted plain text to clipboard"
                    >
                      {copiedPlainText ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Copy Plain Text</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <textarea
                  ref={plainTextareaRef}
                  rows={8}
                  value={workflowPlainText}
                  onChange={(e) => setWorkflowPlainText(e.target.value)}
                  placeholder="Converted plain text from PDF..."
                  className="w-full p-3.5 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white text-slate-800 leading-relaxed resize-y select-text shadow-inner"
                />

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Characters: {workflowPlainText.length.toLocaleString()}</span>
                  <span>Editable: Any modifications here will be parsed into candidate rules below.</span>
                </div>
              </div>

              {/* ======================================================== */}
              {/* STEP 2: "CONVERT TO RULE" ACTION BUTTON                  */}
              {/* ======================================================== */}
              <div className="p-4 bg-gradient-to-r from-indigo-50 to-amber-50 border border-indigo-100 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    Process Plain Text into Structured Candidate Rules
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    Click &ldquo;Convert to Rule&rdquo; to analyze the plain text above and generate candidate grammar paradigms for review.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleConvertToRules}
                  disabled={isConvertingToRules || !workflowPlainText.trim()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 transition-all shrink-0"
                >
                  {isConvertingToRules ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Extracting Candidate Rules...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Convert to Rule</span>
                    </>
                  )}
                </button>
              </div>

              {/* ======================================================== */}
              {/* STEP 3: CANDIDATE RULES LIST WITH SELECTION CHECKBOXES   */}
              {/* ======================================================== */}
              {candidateRules.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900">
                        Candidate Rules for Approval ({candidateRules.length})
                      </h4>
                      <span className="text-[11px] text-slate-500">
                        Check the boxes for the rules you wish to approve into Firebase Learned Rules.
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleToggleSelectAllRules}
                      className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shadow-2xs"
                    >
                      {selectedRuleIds.size === candidateRules.length ? (
                        <>
                          <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Deselect All</span>
                        </>
                      ) : (
                        <>
                          <Square className="w-3.5 h-3.5 text-slate-400" />
                          <span>Select All ({selectedRuleIds.size}/{candidateRules.length})</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-3">
                    {candidateRules.map((rule, idx) => {
                      const isSelected = selectedRuleIds.has(rule.id);

                      return (
                        <div
                          key={rule.id || idx}
                          onClick={() => handleToggleSelectRule(rule.id)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer select-none ${
                            isSelected
                              ? 'bg-indigo-50/50 border-indigo-300 shadow-xs'
                              : 'bg-white border-slate-200 hover:border-slate-300 opacity-70'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="pt-0.5">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectRule(rule.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                              />
                            </div>

                            <div className="flex-1 space-y-2 min-w-0">
                              <div className="flex items-start justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 uppercase">
                                    {rule.category}
                                  </span>
                                  <h5 className="text-xs font-bold text-slate-900 leading-snug">
                                    {rule.title}
                                  </h5>
                                </div>

                                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                  {rule.confidence || 95}% Confidence
                                </span>
                              </div>

                              <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-indigo-950 font-semibold">
                                <span className="text-slate-400 font-sans text-[11px] mr-1">Pattern:</span>
                                {rule.pattern}
                              </div>

                              <p className="text-xs text-slate-600 leading-relaxed">
                                {rule.explanation}
                              </p>

                              {rule.examples && rule.examples.length > 0 && (
                                <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs space-y-1">
                                  <div className="text-slate-800">
                                    <span className="text-emerald-700 font-bold mr-1">✓ Correct:</span>
                                    <span className="font-semibold">{rule.examples[0].correct}</span>
                                  </div>
                                  {rule.examples[0].incorrect && (
                                    <div className="text-slate-500 text-[11px]">
                                      <span className="text-rose-600 font-bold mr-1">✗ Incorrect:</span>
                                      {rule.examples[0].incorrect}
                                    </div>
                                  )}
                                  {rule.examples[0].englishGloss && (
                                    <div className="text-slate-600 text-[11px]">
                                      <span className="font-bold mr-1">Gloss:</span>
                                      {rule.examples[0].englishGloss}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer with "Approve" Button */}
            <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-600">
                {candidateRules.length > 0 ? (
                  <span>
                    <strong>{selectedRuleIds.size}</strong> of {candidateRules.length} candidate rules selected for cloud approval.
                  </span>
                ) : (
                  <span>Click &ldquo;Convert to Rule&rdquo; above to generate candidate rules.</span>
                )}
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setIsWorkflowOpen(false)}
                  className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>

                {candidateRules.length > 0 && (
                  <button
                    type="button"
                    onClick={handleApproveSelectedRules}
                    disabled={isApprovingRules || selectedRuleIds.size === 0}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 transition-all"
                  >
                    {isApprovingRules ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Persisting to Firebase Cloud...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Approve ({selectedRuleIds.size}) to Learned Rules</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. INTERACTIVE PREVIEW MODAL (Eye Trigger)               */}
      {/* ======================================================== */}
      {previewDoc && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 border border-slate-200">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                    <Eye className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    Preview: {previewDoc.title}
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-mono font-semibold">
                    ID: {previewDoc.id}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                  <span>{previewDoc.filename}</span>
                  <span>•</span>
                  <span>{previewChunks.length || previewDoc.chunksCount || 0} chunks</span>
                  <span>•</span>
                  <span className="text-indigo-700 font-medium bg-indigo-50 px-2 py-0.2 rounded border border-indigo-100">
                    Scoped specifically to this PDF
                  </span>
                  <span>•</span>
                  <span className="text-emerald-700 font-medium">Synced in Firebase</span>
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
                <span>Indexed Semantic Chunks ({previewChunks.length})</span>
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
                      Extracted Text Rules &amp; Syntactic Patterns (ID: {previewDoc.id}):
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
                    Indexed Text Chunks for &ldquo;{previewDoc.title}&rdquo; (ID: {previewDoc.id}):
                  </span>
                  {(previewChunks || []).map((chunk, idx) => (
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
      {/* 7. INTERACTIVE EDIT MODAL (Pencil Trigger)                 */}
      {/* ======================================================== */}
      {editDoc && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 border border-slate-200">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                    <Pencil className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    Edit Extracted Rules: {editDoc.title}
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-mono font-semibold">
                    ID: {editDoc.id}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                  <span>{editDoc.filename}</span>
                  <span>•</span>
                  <span className="text-indigo-700 font-medium bg-indigo-50 px-2 py-0.2 rounded border border-indigo-100">
                    Modifying rules specifically for this PDF
                  </span>
                  <span>•</span>
                  <span className="text-emerald-700 font-medium">Auto-syncs to Firebase Cloud</span>
                </div>
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
