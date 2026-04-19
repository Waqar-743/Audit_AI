"use client";

import type { PillarScore } from "@/lib/scanner/types";

const PILLAR_COLORS: Record<string, string> = {
	schema: "#a8ff57",
	content: "#57b8ff",
	technical: "#ffb347",
	trust: "#ff7eb3",
};

const PILLAR_LABELS: Record<string, string> = {
	schema: "Schema Markup",
	content: "Content Quality",
	technical: "Technical SEO",
	trust: "Trust Signals",
};

interface Props {
	pillars: Record<string, PillarScore>;
}

export default function PillarBreakdown({ pillars }: Props) {
	return (
		<section className="report-section-card report-pillar-section w-full">
			<h2 className="section-label report-section-label">
				Pillar breakdown
			</h2>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
				{Object.entries(pillars).map(([key, pillar]) => {
					const color = PILLAR_COLORS[key] || "#a8ff57";
					const label = PILLAR_LABELS[key] || pillar.name;

					return (
						<div key={key} className="bg-bg border border-border p-[10px] min-h-[180px] flex flex-col items-center justify-center text-center gap-[10px]">
							<div className="w-full flex flex-col items-center gap-[10px]">
								<div className="font-mono text-[10px] text-muted tracking-[0.08em] uppercase">
									{label}
								</div>
								<div className="font-serif text-[46px] leading-none" style={{ color }}>
									{pillar.percentage}%
								</div>
							</div>

							<div className="w-full flex flex-col items-center gap-[10px]">
								<div className="h-[3px] w-full bg-white/[0.06] relative overflow-hidden">
									<div
										className="h-full absolute left-0 top-0 transition-[width] duration-1000"
										style={{
											width: `${pillar.percentage}%`,
											background: color,
											transitionTimingFunction: "cubic-bezier(0.25, 1, 0.5, 1)",
										}}
									/>
								</div>

								<div className="font-mono text-[10px] text-muted tracking-[0.06em] text-center">
									{pillar.issues.length} {pillar.issues.length === 1 ? "issue" : "issues"} found
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</section>
	);
}
