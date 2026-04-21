"use client";

import { useState } from "react";
import type { SchemaIssue } from "@/lib/scanner/types";

const SEVERITY_CONFIG = {
  critical: { label: "CRITICAL", color: "#ff5757", bg: "rgba(255,87,87,0.08)", border: "rgba(255,87,87,0.3)" },
  warning: { label: "WARNING", color: "#ffb347", bg: "rgba(255,179,71,0.08)", border: "rgba(255,179,71,0.3)" },
  info: { label: "INFO", color: "#57b8ff", bg: "rgba(87,184,255,0.08)", border: "rgba(87,184,255,0.3)" },
};

const PILLAR_LABELS: Record<string, string> = {
  schema: "Schema", content: "Content", technical: "Technical", trust: "Trust",
};

interface Props {
  issues: SchemaIssue[];
}

export default function IssueList({ issues }: Props) {
  const [filter, setFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = filter === "all" ? issues : issues.filter(i => {
    if (filter === "critical" || filter === "warning" || filter === "info") return i.severity === filter;
    return i.pillar === filter;
  });

  const visibleIssues = filtered;

  return (
    <section className="report-section-card report-issue-section w-full">
      <h2 className="section-label report-section-label">
        Issues found ({issues.length})
      </h2>

      {/* Filters */}
      <div className="flex gap-3 mb-8 flex-wrap border border-border bg-bg px-4 py-4 md:px-5 md:py-5">
        {["all", "critical", "warning", "info", "schema", "content", "technical", "trust"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`inline-flex items-center justify-center min-h-[36px] md:min-h-[40px] font-mono text-[11px] md:text-[12px] tracking-[0.09em] uppercase px-4 md:px-5 py-[8px] md:py-[9px] border cursor-pointer transition-all duration-200 ${
              filter === f
                ? "border-accent text-[#080808]"
                : "border-border text-muted bg-transparent hover:border-border-hover hover:text-text"
            }`}
            style={filter === f ? { background: "var(--accent)" } : {}}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Issue cards */}
      <div className="border border-border bg-bg p-4 md:p-5">
        <div className="flex flex-col gap-4 h-[500px] md:h-[540px] overflow-y-auto pr-1">
          {visibleIssues.map((issue) => {
            const sev = SEVERITY_CONFIG[issue.severity];
            const isExpanded = expandedId === issue.id;

            return (
              <div
                key={issue.id}
                className="bg-bg border border-border transition-colors duration-200"
              >
                <div
                  className="flex items-start gap-4 p-6 md:p-7 cursor-pointer hover:bg-bg2 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : issue.id)}
                >
                  {/* Severity badge */}
                  <span
                    className="font-mono text-[9px] tracking-[0.1em] px-2 py-[2px] shrink-0 mt-[2px]"
                    style={{ color: sev.color, background: sev.bg, border: `1px solid ${sev.border}` }}
                  >
                    {sev.label}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-[9px] text-muted tracking-[0.08em] uppercase">
                        {PILLAR_LABELS[issue.pillar] || issue.pillar}
                      </span>
                    </div>
                    <h3 className="text-[15px] font-medium mb-2 leading-[1.4]">{issue.title}</h3>
                    <p className="text-[13px] text-muted leading-[1.7]">{issue.description}</p>
                  </div>

                  <span className="inline-flex h-8 w-8 md:h-9 md:w-9 items-center justify-center border border-border bg-bg3/30 font-mono text-[22px] text-accent shrink-0 leading-none transition-transform duration-300 self-start mt-[2px]"
                    style={{ transform: isExpanded ? "rotate(45deg)" : "rotate(0)" }}
                  >
                    +
                  </span>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-6 md:px-7 pb-6 md:pb-7 pt-0">
                    {issue.fix && (
                      <div className="mb-4">
                        <div className="font-mono text-[10px] text-accent mb-2 tracking-[0.08em] uppercase">Fix</div>
                        <p className="text-[13px] text-muted leading-[1.7]">{issue.fix}</p>
                      </div>
                    )}
                    {issue.codeSnippet && (
                      <div>
                        <div className="font-mono text-[10px] text-accent mb-2 tracking-[0.08em] uppercase">Code snippet</div>
                        <pre className="font-mono text-[11px] text-text/80 leading-[1.6] p-4 bg-bg3 border border-border overflow-x-auto">
                          {issue.codeSnippet}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {visibleIssues.length === 0 && (
            <div className="bg-bg border border-border p-7 md:p-8">
              <div className="font-mono text-[11px] tracking-[0.08em] uppercase text-muted">
                No issues found for this filter
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
