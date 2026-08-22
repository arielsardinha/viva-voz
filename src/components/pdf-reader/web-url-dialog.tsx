"use client";

import { useId, useRef } from "react";
import { Globe, Link, Loader2, CheckCircle2, AlertCircle, X, Clock, BookOpen, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useWebArticleExtractor,
  type WebArticlePreview,
} from "@/hooks/use-web-article-extractor";
import type { ParsedDocument } from "@/lib/domain/document.types";

interface WebUrlDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (document: ParsedDocument) => void;
}

export function WebUrlDialog({ isOpen, onClose, onSubmit }: WebUrlDialogProps) {
  const urlInputId = useId();
  const {
    url,
    setUrl,
    isUrlValid,
    state,
    preview,
    error,
    progress,
    handleExtract,
    handleConfirm,
    reset,
  } = useWebArticleExtractor();

  const inputRef = useRef<HTMLInputElement>(null);
  const isLoading = state === "loading";

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleConfirmAndSubmit = () => {
    const doc = handleConfirm();
    if (doc) {
      onSubmit(doc);
      handleClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") handleClose();
    if (e.key === "Enter" && isUrlValid && state === "idle") {
      handleExtract();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="web-url-dialog-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="web-url-dialog-title"
      data-webmcp-tool="extractWebArticle"
      data-webmcp-action="extract-article-from-url"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="web-url-dialog-backdrop"
        aria-hidden="true"
        onClick={handleClose}
      />

      {/* Panel */}
      <div className="web-url-dialog-panel" role="document">
        {/* Header */}
        <header className="web-url-dialog-header">
          <div className="web-url-dialog-header-title">
            <div className="web-url-dialog-icon">
              <Globe size={20} aria-hidden="true" />
            </div>
            <h2 id="web-url-dialog-title" className="web-url-dialog-title">
              Ler Artigo da Web
            </h2>
          </div>
          <button
            type="button"
            className="web-url-dialog-close"
            onClick={handleClose}
            aria-label="Fechar diálogo de leitura de artigo"
            data-cy="web-url-dialog-close"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        {/* Body */}
        <div className="web-url-dialog-body">
          {/* URL Form */}
          <form
            className="web-url-dialog-form"
            onSubmit={(e) => { e.preventDefault(); handleExtract(); }}
            data-webmcp-schema='{"url":"string"}'
          >
            <label htmlFor={urlInputId} className="web-url-dialog-label">
              Endereço do artigo
            </label>
            <div className="web-url-dialog-input-wrapper">
              <Link size={16} className="web-url-dialog-input-icon" aria-hidden="true" />
              <input
                ref={inputRef}
                id={urlInputId}
                name="url"
                type="url"
                className={cn(
                  "web-url-dialog-input",
                  error && "web-url-dialog-input--error",
                  isUrlValid && url && "web-url-dialog-input--valid"
                )}
                placeholder="https://exemplo.com/artigo"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading}
                autoFocus
                autoComplete="url"
                aria-label="URL do artigo a ser lido"
                aria-describedby={error ? "web-url-error" : undefined}
                aria-invalid={!!error}
                data-cy="web-url-input"
                data-webmcp-field="url"
              />
              {isLoading && (
                <Loader2
                  size={16}
                  className="web-url-dialog-input-spinner"
                  aria-hidden="true"
                />
              )}
            </div>

            {/* Progress bar */}
            {isLoading && (
              <div
                className="web-url-dialog-progress"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progresso da extração"
              >
                <div
                  className="web-url-dialog-progress-bar"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            {/* Error */}
            {error && (
              <div
                id="web-url-error"
                className="web-url-dialog-error"
                role="alert"
                data-cy="web-url-error"
              >
                <AlertCircle size={15} aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            {/* Extract button */}
            {state !== "preview" && (
              <button
                type="submit"
                className="web-url-dialog-extract-btn"
                disabled={!isUrlValid || isLoading}
                aria-label="Extrair conteúdo do artigo"
                data-cy="web-url-extract-btn"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="spin" aria-hidden="true" />
                    Extraindo conteúdo...
                  </>
                ) : (
                  <>
                    <Globe size={16} aria-hidden="true" />
                    Extrair Conteúdo
                  </>
                )}
              </button>
            )}
          </form>

          {/* Preview Card */}
          {state === "preview" && preview && (
            <ArticlePreviewCard preview={preview} />
          )}
        </div>

        {/* Footer */}
        {state === "preview" && preview && (
          <footer className="web-url-dialog-footer">
            <button
              type="button"
              className="web-url-dialog-btn-secondary"
              onClick={() => { reset(); }}
              data-cy="web-url-change-btn"
            >
              Alterar URL
            </button>
            <button
              type="button"
              className="web-url-dialog-btn-primary"
              onClick={handleConfirmAndSubmit}
              aria-label="Iniciar leitura do artigo extraído"
              data-cy="web-url-confirm-btn"
            >
              <CheckCircle2 size={16} aria-hidden="true" />
              Iniciar Leitura
            </button>
          </footer>
        )}
      </div>

      <style>{styles}</style>
    </div>
  );
}

/* ─── Preview Card ─────────────────────────────────────────── */

function ArticlePreviewCard({ preview }: { preview: WebArticlePreview }) {
  return (
    <div className="article-preview-card" data-cy="article-preview-card">
      <div className="article-preview-site">
        <ExternalLink size={13} aria-hidden="true" />
        <span>{preview.siteUrl}</span>
      </div>
      <h3 className="article-preview-title">{preview.title}</h3>
      {preview.byline && (
        <p className="article-preview-byline">{preview.byline}</p>
      )}
      <div className="article-preview-stats">
        <span className="article-preview-stat">
          <BookOpen size={13} aria-hidden="true" />
          {preview.wordCount.toLocaleString("pt-BR")} palavras
        </span>
        <span className="article-preview-stat">
          <Clock size={13} aria-hidden="true" />
          ~{preview.estimatedMinutes} min de leitura
        </span>
      </div>
    </div>
  );
}

/* ─── Styles ────────────────────────────────────────────────── */

const styles = `
  .web-url-dialog-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }

  .web-url-dialog-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    animation: backdropFadeIn 0.2s ease;
  }

  .web-url-dialog-panel {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 520px;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    border: 1px solid rgba(100, 149, 237, 0.25);
    border-radius: 16px;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.05);
    overflow: hidden;
    animation: panelSlideIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    display: flex;
    flex-direction: column;
  }

  .web-url-dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.125rem 1.25rem;
    border-bottom: 1px solid rgba(100, 149, 237, 0.15);
    background: rgba(255, 255, 255, 0.03);
    flex-shrink: 0;
  }

  .web-url-dialog-header-title {
    display: flex;
    align-items: center;
    gap: 0.625rem;
  }

  .web-url-dialog-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    flex-shrink: 0;
  }

  .web-url-dialog-title {
    font-size: 1rem;
    font-weight: 600;
    color: #e8eaf6;
    margin: 0;
  }

  .web-url-dialog-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.06);
    color: #9099b7;
    cursor: pointer;
    transition: background 0.2s, color 0.2s;
    flex-shrink: 0;
  }

  .web-url-dialog-close:hover {
    background: rgba(255, 255, 255, 0.12);
    color: #e8eaf6;
  }

  .web-url-dialog-body {
    padding: 1.25rem;
    flex: 1;
    overflow-y: auto;
    max-height: 75dvh;
    padding-bottom: 1.5rem;
  }

  .web-url-dialog-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .web-url-dialog-label {
    font-size: 0.8125rem;
    font-weight: 500;
    color: #9099b7;
    letter-spacing: 0.02em;
  }

  .web-url-dialog-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .web-url-dialog-input-icon {
    position: absolute;
    left: 0.875rem;
    color: #6272a4;
    pointer-events: none;
    z-index: 1;
  }

  .web-url-dialog-input-spinner {
    position: absolute;
    right: 0.875rem;
    color: #667eea;
    animation: spin 1s linear infinite;
  }

  .web-url-dialog-input {
    width: 100%;
    padding: 0.75rem 2.5rem 0.75rem 2.375rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(100, 149, 237, 0.2);
    border-radius: 10px;
    color: #e8eaf6;
    font-size: 0.9rem;
    font-family: 'JetBrains Mono', 'Courier New', monospace;
    transition: border-color 0.2s, box-shadow 0.2s;
    outline: none;
    box-sizing: border-box;
  }

  .web-url-dialog-input::placeholder { color: #4a5278; }

  .web-url-dialog-input:focus {
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.18);
  }

  .web-url-dialog-input--error { border-color: #f87171 !important; }
  .web-url-dialog-input--valid { border-color: rgba(74, 222, 128, 0.4); }

  .web-url-dialog-input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .web-url-dialog-progress {
    height: 4px;
    background: rgba(255,255,255,0.06);
    border-radius: 2px;
    overflow: hidden;
  }

  .web-url-dialog-progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #667eea, #764ba2);
    border-radius: 2px;
    transition: width 0.3s ease;
  }

  .web-url-dialog-error {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: rgba(248, 113, 113, 0.1);
    border: 1px solid rgba(248, 113, 113, 0.25);
    border-radius: 8px;
    color: #fca5a5;
    font-size: 0.8125rem;
    line-height: 1.4;
  }

  .web-url-dialog-error svg { flex-shrink: 0; margin-top: 1px; }

  .web-url-dialog-extract-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.15s;
    min-height: 44px;
  }

  .web-url-dialog-extract-btn:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  .web-url-dialog-extract-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }

  /* Article Preview Card */
  .article-preview-card {
    margin-top: 0.75rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(100, 149, 237, 0.18);
    border-radius: 12px;
    animation: previewFadeIn 0.3s ease;
  }

  .article-preview-site {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.75rem;
    color: #667eea;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }

  .article-preview-title {
    font-size: 0.9625rem;
    font-weight: 600;
    color: #e8eaf6;
    margin: 0 0 0.375rem;
    line-height: 1.4;
  }

  .article-preview-byline {
    font-size: 0.8125rem;
    color: #9099b7;
    margin: 0 0 0.75rem;
  }

  .article-preview-stats {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .article-preview-stat {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.775rem;
    color: #6272a4;
  }

  /* Footer */
  .web-url-dialog-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.625rem;
    padding: 0.875rem 1.25rem;
    padding-bottom: calc(0.875rem + env(safe-area-inset-bottom, 0px));
    border-top: 1px solid rgba(100, 149, 237, 0.12);
    background: rgba(255, 255, 255, 0.02);
    flex-shrink: 0;
    flex-wrap: wrap;
  }

  .web-url-dialog-btn-secondary {
    padding: 0.625rem 1rem;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: #9099b7;
    font-size: 0.8625rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s, color 0.2s;
    min-height: 44px;
  }

  .web-url-dialog-btn-secondary:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #e8eaf6;
  }

  .web-url-dialog-btn-primary {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1.125rem;
    background: linear-gradient(135deg, #667eea, #764ba2);
    border: none;
    border-radius: 8px;
    color: white;
    font-size: 0.8625rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.15s;
    min-height: 44px;
  }

  .web-url-dialog-btn-primary:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  /* Animations */
  @keyframes backdropFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes panelSlideIn {
    from { opacity: 0; transform: scale(0.94) translateY(12px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }

  @keyframes previewFadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .spin { animation: spin 1s linear infinite; }

  /* Mobile 370px */
  @media (max-width: 480px) {
    .web-url-dialog-overlay { padding: 0.5rem; align-items: flex-end; }
    .web-url-dialog-panel {
      border-radius: 16px 16px 0 0;
      max-width: 100%;
      max-height: 92dvh;
    }
    .web-url-dialog-footer {
      justify-content: stretch;
    }
    .web-url-dialog-btn-secondary,
    .web-url-dialog-btn-primary {
      flex: 1;
      justify-content: center;
    }
  }
`;
