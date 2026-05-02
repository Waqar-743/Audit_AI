"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ScanModal from "./ScanModal";

export default function URLInput({ variant = "hero" }: { variant?: "hero" | "cta" }) {
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanId, setScanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const normalizedUrl = url.trim().replace(/^https?:\/\//, "");
  const hasUrl = normalizedUrl.length > 0;

  const handleScan = async () => {
    if (scanning || !hasUrl) return;

    const cleanUrl = normalizedUrl;
    setScanId(null);
    setError(null);
    setScanning(true);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cleanUrl }),
      });
      const data = await res.json();
      if (res.ok && data.scanId) {
        setScanId(data.scanId);
      } else {
        setScanning(false);
        setError(data.error || "Failed to start scan. Please try again.");
      }
    } catch {
      setScanning(false);
      setError("Network error. Please try again.");
    }
  };

  const handleScanComplete = () => {
    setScanning(false);
    if (scanId && scanId !== "demo") {
      router.push(`/scan/${scanId}`);
    }
  };

  const isHero = variant === "hero";

  return (
    <>
      <div
        id={isHero ? "hero-input" : "cta-input"}
          className="relative z-20 flex w-full gap-0 overflow-hidden rounded-xl glass-panel transition-all duration-300 focus-within:-translate-y-1 focus-within:border-accent/50 focus-within:shadow-[0_0_30px_rgba(168,255,87,0.15)]"
        style={{ padding: "4px" }}
      >
        {isHero && (
          <span className="font-mono text-sm text-muted px-5 flex items-center bg-black/40 rounded-l-lg border-r border-white/5 whitespace-nowrap">
            https://
          </span>
        )}
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="yourwebsite.com"
          autoComplete="off"
          spellCheck={false}
          onKeyDown={(e) => e.key === "Enter" && handleScan()}
          className="flex-1 bg-black/20 border-none outline-none text-text font-mono text-[15px] px-6 py-5 placeholder:text-muted/50 min-w-0 focus:bg-black/40 transition-colors"
          style={!isHero ? { borderRadius: "8px 0 0 8px" } : {}}
        />
        <button
          onClick={handleScan}
          disabled={!hasUrl || scanning}
          className="antigravity-btn whitespace-nowrap rounded-lg px-10 py-5 font-mono text-[15px] font-semibold tracking-[0.04em] cursor-pointer active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
        >
          {scanning ? "Scanning..." : "Analyze site"}
        </button>
      </div>

      {error && (
        <p className="font-mono text-[12px] text-red-400 mt-2 px-1">{error}</p>
      )}

      {scanning && scanId !== null && (
        <ScanModal
          url={url.trim().replace(/^https?:\/\//, "") || "yoursite.com"}
          scanId={scanId}
          onComplete={handleScanComplete}
          onClose={() => setScanning(false)}
        />
      )}
    </>
  );
}
