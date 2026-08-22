"use client";

import { useId, useRef } from "react";
import { Globe, Link, Loader2, AlertCircle, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWebArticleExtractor } from "@/hooks/use-web-article-extractor";
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
    error,
    progress,
    handleExtract,
    reset,
  } = useWebArticleExtractor();

  const inputRef = useRef<HTMLInputElement>(null);
  const isLoading = state === "loading";

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isUrlValid || isLoading) return;

    void handleExtract((doc) => {
      onSubmit(doc);
      handleClose();
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") handleClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="web-url-dialog-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="web-url-dialog-title"
      data-webmcp-tool="extractWebArticle"
      data-webmcp-action="extract-and-read-article-from-url"
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
          <p className="web-url-dialog-description">
            Cole o link de uma notícia, artigo ou post para extrair o conteúdo principal e iniciar a narração automaticamente.
          </p>

          {/* URL Form */}
          <form
            className="web-url-dialog-form"
            onSubmit={handleSubmit}
            data-webmcp-schema='{"url":"string"}'
          >
            <label htmlFor={urlInputId} className="web-url-dialog-label">
              Endereço do artigo (URL)
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

            {/* Submit button */}
            <button
              type="submit"
              className="web-url-dialog-extract-btn"
              disabled={!isUrlValid || isLoading}
              aria-label="Extrair e iniciar leitura do artigo"
              data-cy="web-url-extract-btn"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="spin" aria-hidden="true" />
                  <span>Extraindo e iniciando...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} aria-hidden="true" />
                  <span>Ouvir Artigo</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      <style>{styles}</style>
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
    max-width: 500px;
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
    background: rgba(14, 165, 233, 0.15);
    color: #38bdf8;
  }

  .web-url-dialog-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #f1f5f9;
  }

  .web-url-dialog-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    color: #94a3b8;
    border-radius: 6px;
    cursor: pointer;
    transition: color 0.15s, background 0.15s;
  }

  .web-url-dialog-close:hover {
    color: #f1f5f9;
    background: rgba(255, 255, 255, 0.08);
  }

  .web-url-dialog-body {
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow-y: auto;
    max-height: 80dvh;
    padding-bottom: 1.5rem;
  }

  .web-url-dialog-description {
    margin: 0;
    font-size: 0.8125rem;
    line-height: 1.5;
    color: #94a3b8;
  }

  .web-url-dialog-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .web-url-dialog-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: #cbd5e1;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .web-url-dialog-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .web-url-dialog-input-icon {
    position: absolute;
    left: 0.875rem;
    color: #64748b;
    pointer-events: none;
  }

  .web-url-dialog-input {
    width: 100%;
    padding: 0.6875rem 2.25rem 0.6875rem 2.375rem;
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(100, 149, 237, 0.2);
    border-radius: 10px;
    color: #f8fafc;
    font-size: 0.875rem;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .web-url-dialog-input:focus {
    border-color: #38bdf8;
    box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15);
  }

  .web-url-dialog-input--error {
    border-color: #f87171 !important;
    box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.15) !important;
  }

  .web-url-dialog-input--valid {
    border-color: rgba(52, 211, 153, 0.5);
  }

  .web-url-dialog-input-spinner {
    position: absolute;
    right: 0.875rem;
    color: #38bdf8;
    animation: spin 1s linear infinite;
  }

  .web-url-dialog-progress {
    width: 100%;
    height: 4px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 2px;
    overflow: hidden;
  }

  .web-url-dialog-progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #38bdf8, #818cf8);
    border-radius: 2px;
    transition: width 0.3s ease;
  }

  .web-url-dialog-error {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.625rem 0.75rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.25);
    border-radius: 8px;
    color: #fca5a5;
    font-size: 0.8125rem;
    line-height: 1.4;
  }

  .web-url-dialog-extract-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
    color: #ffffff;
    font-size: 0.875rem;
    font-weight: 600;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.1s, box-shadow 0.15s;
    box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35);
    min-height: 44px;
  }

  .web-url-dialog-extract-btn:hover:not(:disabled) {
    opacity: 0.92;
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(2, 132, 199, 0.45);
  }

  .web-url-dialog-extract-btn:active:not(:disabled) {
    transform: translateY(0);
  }

  .web-url-dialog-extract-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    box-shadow: none;
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes backdropFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes panelSlideIn {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(8px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  @media (max-width: 480px) {
    .web-url-dialog-panel {
      border-radius: 12px;
      max-width: 100%;
    }
    .web-url-dialog-body {
      padding: 1rem;
    }
  }
`;
