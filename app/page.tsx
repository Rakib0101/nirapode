import { MRTMapCard } from "@/components/mrt-map-button";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

async function getFeaturedProjects() {
	try {
		return await prisma.project.findMany({
			where: { status: "ACTIVE" },
			orderBy: { createdAt: "desc" },
			take: 3,
		});
	} catch (err) {
		console.error("Failed to load featured projects on home page:", err);
		return [];
	}
}

// SVG icons — purely visual, not translated
const ICONS = {
	shares: (
		<svg
			className="w-6 h-6"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
			<polyline points="16 7 22 7 22 13" />
		</svg>
	),
	wallet: (
		<svg
			className="w-6 h-6"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<rect x="1" y="4" width="22" height="16" rx="2" />
			<line x1="1" y1="10" x2="23" y2="10" />
		</svg>
	),
	plane: (
		<svg
			className="w-6 h-6"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<line x1="22" y1="2" x2="11" y2="13" />
			<polygon points="22 2 15 22 11 13 2 9 22 2" />
		</svg>
	),
	taxi: (
		<svg
			className="w-6 h-6"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<rect x="1" y="3" width="15" height="13" rx="1" />
			<polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
			<circle cx="5.5" cy="18.5" r="2.5" />
			<circle cx="18.5" cy="18.5" r="2.5" />
		</svg>
	),
	currency: (
		<svg
			className="w-6 h-6"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<polyline points="17 1 21 5 17 9" />
			<path d="M3 11V9a4 4 0 014-4h14" />
			<polyline points="7 23 3 19 7 15" />
			<path d="M21 13v2a4 4 0 01-4 4H3" />
		</svg>
	),
	blog: (
		<svg
			className="w-6 h-6"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
			<path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
		</svg>
	),
	islamic: (
		<svg
			className="w-6 h-6"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
		</svg>
	),
	lost: (
		<svg
			className="w-6 h-6"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<circle cx="11" cy="11" r="8" />
			<line x1="21" y1="21" x2="16.65" y2="16.65" />
		</svg>
	),
	support: (
		<svg
			className="w-6 h-6"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
		</svg>
	),
	arrow: (
		<svg
			className="w-4 h-4"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.5"
			strokeLinecap="round"
		>
			<path d="M5 12h14M12 5l7 7-7 7" />
		</svg>
	),
	arrowSm: (
		<svg
			className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
		>
			<path d="M5 12h14M12 5l7 7-7 7" />
		</svg>
	),
	check: (
		<svg
			className="w-3 h-3 text-white"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="3"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<polyline points="20 6 9 17 4 12" />
		</svg>
	),
};

export default async function HomePage() {
	let featuredProjects: Awaited<ReturnType<typeof getFeaturedProjects>> = [];

	try {
		featuredProjects = (await getFeaturedProjects()) ?? [];
	} catch (err) {
		console.error("HomePage data loading error:", err);
	}

	const mktPoints = [
		"Admin-created and verified investment projects",
		"Manual payment approval — bKash, Nagad, Bank Transfer",
		"Secondary market: list your shares for resale",
		"Dynamic share pricing set by admin",
		"Full purchase and transaction history",
	] as const;

	return (
		<>
			{/* ─── Hero ─── */}
			<section className="relative overflow-hidden bg-white">
				<div className="absolute inset-0 pointer-events-none overflow-hidden">
					<div className="absolute -top-48 -right-48 size-160 rounded-full bg-brand-50 blur-3xl opacity-70" />
					<div className="absolute bottom-0 -left-32 size-120 rounded-full bg-brand-100 blur-3xl opacity-30" />
				</div>

				<div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-36">
					<div className="max-w-xl mx-auto">
						<MRTMapCard />
					</div>
				</div>
			</section>


			{/* ─── Marketplace highlight ─── */}
			<section className="py-12 md:py-24 bg-muted">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid lg:grid-cols-2 gap-16 items-center">
						<div className="space-y-6">
							<h2 className="text-xl sm:text-4xl font-bold text-foreground leading-tight">
								Share Investment Marketplace
							</h2>
							<p className="text-sm sm:text-lg text-muted-foreground leading-relaxed">
								Invest in verified community projects. Every transaction is manually approved by our admin team — transparent, secure and community-driven.
							</p>
							<ul className="space-y-3">
								{mktPoints.map((point) => (
									<li
										key={point}
										className="flex items-center gap-3 text-xs sm:text-sm text-foreground"
									>
										<span className="mt-0.5 size-4 sm:size-5 rounded-full bg-brand flex items-center justify-center shrink-0">
											{ICONS.check}
										</span>
										{point}
									</li>
								))}
							</ul>
							<Link
								href="/shares"
								className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-brand rounded-full hover:bg-brand-dark transition-colors"
							>
								View Marketplace
								{ICONS.arrow}
							</Link>
						</div>

						{/* Preview card */}
						<div className="bg-white rounded-3xl border border-border p-6 shadow-xl space-y-4">
							<div className="flex items-center justify-between pb-4 border-b border-border">
								<span className="font-semibold text-foreground">
									Available Projects
								</span>
								<span className="text-xs text-muted-foreground">
									Updated live
								</span>
							</div>
							{featuredProjects.length > 0 ? (
								featuredProjects.map((project) => (
									<Link
										key={project.id}
										href={`/shares/${project.id}`}
										className="flex items-center justify-between p-4 bg-muted rounded-xl hover:bg-brand-50 transition-colors"
									>
										<div>
											<p className="font-semibold text-sm text-foreground">
												{project.name}
											</p>
											<p className="text-xs text-muted-foreground mt-0.5">
												{project.availableShares} shares left
											</p>
										</div>
										<div className="text-right">
											<p className="font-bold text-sm text-foreground">
												৳{Number(project.sharePriceSgd ?? 0).toFixed(2)}
											</p>
											<p className="text-[11px] text-muted-foreground">
												Per Share
											</p>
										</div>
									</Link>
								))
							) : (
								<p className="text-sm text-muted-foreground text-center py-6">
									No projects available right now — check back soon.
								</p>
							)}
						</div>
					</div>
				</div>
			</section>

		</>
	);
}
