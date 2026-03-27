import React, { useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";

const LIVE_PREVIEW_STORAGE_KEY = "livePreviewUrl";

const sanitizeUrl = (raw) => {
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.toString();
  } catch {
    return "";
  }
};

const LivePreview = () => {
  const location = useLocation();

  const previewUrl = useMemo(() => {
    const queryUrl = new URLSearchParams(location.search).get("url") || "";
    if (queryUrl) return sanitizeUrl(queryUrl);
    try {
      return sanitizeUrl(localStorage.getItem(LIVE_PREVIEW_STORAGE_KEY) || "");
    } catch {
      return "";
    }
  }, [location.search]);

  useEffect(() => {
    if (previewUrl) {
      try {
        localStorage.setItem(LIVE_PREVIEW_STORAGE_KEY, previewUrl);
      } catch {}
    }
  }, [previewUrl]);

  useEffect(() => {
    if (!location.search) return;
    window.history.replaceState({}, "", location.pathname);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const preventContextMenu = (event) => event.preventDefault();
    document.addEventListener("contextmenu", preventContextMenu);
    return () => {
      document.removeEventListener("contextmenu", preventContextMenu);
    };
  }, []);

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.assign("/posts");
  };

  return (
    <main className="live-preview-page" onContextMenu={(e) => e.preventDefault()}>
      <header className="live-preview-bar">
        <button type="button" className="ghost-btn live-preview-back" onClick={goBack}>
          Back
        </button>
        <div className="live-preview-safe">Secure Live Preview</div>
      </header>

      <section className="live-preview-stage">
        {previewUrl ? (
          <iframe
            className="live-preview-iframe"
            title="Live website preview"
            src={previewUrl}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="live-preview-error">
            <h2>Live Link Unavailable</h2>
            <p>The seller has not provided a valid website URL for this product yet.</p>
            <Link className="ghost-btn live-preview-open" to="/posts">
              Browse Posts
            </Link>
          </div>
        )}
      </section>
    </main>
  );
};

export default LivePreview;
