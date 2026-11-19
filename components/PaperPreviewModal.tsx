'use client';

import React, { useState } from 'react';
import {
  FileText,
  Download,
  ExternalLink,
  X,
  FolderOpen,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { PastPaperItem } from '@/lib/types';

interface PaperPreviewModalProps {
  paper: PastPaperItem | null;
  onClose: () => void;
  onApprove?: (paperId: string) => void;
  isAdmin?: boolean;
}

export function parsePdfEmbedInfo(rawUrl?: string): {
  isDriveFolder: boolean;
  folderId?: string;
  embedUrl: string;
  externalUrl: string;
  isBlob: boolean;
} {
  const url = (rawUrl || '').trim();
  if (!url || url === '#') {
    return {
      isDriveFolder: true,
      folderId: '1_CHRONO_A_L_Past_Papers_Drive_Vault',
      embedUrl: '',
      externalUrl: 'https://drive.google.com',
      isBlob: false
    };
  }

  if (url.startsWith('blob:') || url.startsWith('data:')) {
    return {
      isDriveFolder: false,
      embedUrl: url,
      externalUrl: url,
      isBlob: true
    };
  }

  // Google Drive folder pattern
  const folderMatch = url.match(/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([a-zA-Z0-9_\-]+)/);
  if (folderMatch) {
    const folderId = folderMatch[1];
    return {
      isDriveFolder: true,
      folderId,
      embedUrl: `https://drive.google.com/embeddedfolderview?id=${folderId}#grid`,
      externalUrl: url,
      isBlob: false
    };
  }

  // Google Drive file pattern: /file/d/FILE_ID
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_\-]+)/);
  if (fileMatch) {
    const fileId = fileMatch[1];
    return {
      isDriveFolder: false,
      embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
      externalUrl: `https://drive.google.com/file/d/${fileId}/view?usp=sharing`,
      isBlob: false
    };
  }

  // Google Drive open?id= or uc?id=
  const idMatch = url.match(/drive\.google\.com\/(?:open|uc)\?id=([a-zA-Z0-9_\-]+)/);
  if (idMatch) {
    const id = idMatch[1];
    return {
      isDriveFolder: false,
      embedUrl: `https://drive.google.com/file/d/${id}/preview`,
      externalUrl: `https://drive.google.com/file/d/${id}/view?usp=sharing`,
      isBlob: false
    };
  }

  return {
    isDriveFolder: false,
    embedUrl: url,
    externalUrl: url,
    isBlob: false
  };
}

export const PaperPreviewModal: React.FC<PaperPreviewModalProps> = ({
  paper,
  onClose,
  onApprove,
  isAdmin = false
}) => {
  const [copied, setCopied] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  if (!paper) return null;

  const targetUrl = paper.previewUrl || paper.downloadUrl;
  const embedInfo = parsePdfEmbedInfo(targetUrl);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(embedInfo.externalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200"
    >
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-4xl h-[90vh] sm:h-[86vh] bg-[#0E0E12] border border-white/10 rounded-3xl flex flex-col shadow-2xl shadow-black/90 overflow-hidden z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#141418]/90 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-[#A3E635]/15 border border-[#A3E635]/30 flex items-center justify-center text-[#A3E635] shrink-0">
              {embedInfo.isDriveFolder ? <FolderOpen className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate">{paper.title}</h3>
              <p className="text-[11px] text-zinc-400 truncate">
                {paper.subject} • {paper.year} • {paper.examType}
                {paper.uploaderName ? ` • Contributed by ${paper.uploaderName}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyLink}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5 text-xs transition-colors"
              title="Copy link to clipboard"
            >
              {copied ? <Check className="w-4 h-4 text-[#A3E635]" /> : <Copy className="w-4 h-4" />}
            </button>

            <a
              href={embedInfo.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-xl bg-[#A3E635] text-black font-semibold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{embedInfo.isDriveFolder ? 'Open in Google Drive' : 'Open in New Tab'}</span>
            </a>

            {isAdmin && onApprove && paper.status === 'quarantined' && (
              <button
                onClick={() => onApprove(paper.id)}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-semibold text-xs flex items-center gap-1.5 transition-all"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Approve Paper</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors ml-1"
              title="Close preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 bg-[#08080A] relative flex flex-col items-center justify-center overflow-hidden">
          {embedInfo.isDriveFolder ? (
            /* Bento Google Drive Folder Vault View */
            <div className="p-8 max-w-lg w-full text-center space-y-6 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/5">
                <FolderOpen className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono text-zinc-400">
                  Google Drive Cloud Vault
                </span>
                <h4 className="text-lg font-bold text-white tracking-tight">{paper.title}</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  This past paper and its accompanying resources (marking scheme, model answers, revision notes) are stored in the verified Google Drive archive folder.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#141418] border border-white/5 text-left space-y-2 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Subject:</span>
                  <span className="text-white font-medium">{paper.subject}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Exam Type:</span>
                  <span className="text-white font-medium">{paper.examType}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Year:</span>
                  <span className="text-white font-medium">{paper.year}</span>
                </div>
                {embedInfo.folderId && (
                  <div className="flex justify-between text-zinc-400">
                    <span>Folder ID:</span>
                    <span className="font-mono text-zinc-300 truncate max-w-[200px]">{embedInfo.folderId}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <a
                  href={embedInfo.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#A3E635] text-black font-semibold text-xs hover:bg-[#86efac] transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open Folder in Google Drive</span>
                </a>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 text-xs font-semibold transition-all flex items-center justify-center gap-2"
                >
                  {copied ? <Check className="w-4 h-4 text-[#A3E635]" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied Link' : 'Copy Direct Link'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Document / PDF Iframe Preview */
            <div className="w-full h-full relative">
              <iframe
                src={`${embedInfo.embedUrl}#toolbar=0`}
                className="w-full h-full border-none"
                title={paper.title}
                onError={() => setIframeError(true)}
              />

              {iframeError && (
                <div className="absolute inset-0 bg-[#08080A]/95 flex flex-col items-center justify-center p-6 text-center space-y-4">
                  <AlertTriangle className="w-10 h-10 text-amber-400" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white">Browser Security Blocked In-App Preview</h4>
                    <p className="text-xs text-zinc-400 max-w-sm">
                      Your browser’s third-party cookie or frame policy prevented loading this document inside the frame.
                    </p>
                  </div>
                  <a
                    href={embedInfo.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2 rounded-xl bg-[#A3E635] text-black font-semibold text-xs flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Open Document Directly</span>
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
