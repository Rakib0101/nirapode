import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { AvatarUpload } from "./avatar-upload";
import { ReferralCard } from "./referral-card";
import { EditProfileForm } from "./edit-profile-form";
import { lockPinAction } from "@/app/actions/pin";

export default async function ProfilePage() {
	const session = await getSession();
	if (!session) redirect("/login");

	const user = await prisma.user.findUnique({
		where: { id: session.userId },
		select: {
			fullName: true,
			nidNumber: true,
			email: true,
			phone: true,
			role: true,
			isVerified: true,
			isActive: true,
			isAgent: true,
			referralCode: true,
			createdAt: true,
			profilePhoto: true,
			pinHash: true,
			wallet: { select: { balance: true } },
			_count: {
				select: {
					ownedShares: true,
					lostFoundPosts: true,
					blogPosts: true,
					airTicketRequests: true,
					taxiRequests: true,
					checkouts: true,
				},
			},
		},
	});

	if (!user) redirect("/login");

	const ROLE_LABELS: Record<string, string> = {
		SUPER_ADMIN: "Super Admin",
		ADMIN: "Admin",
		MODERATOR: "Moderator",
		USER: "Member",
	};

	return (
		<div className="min-h-screen bg-muted">
			<div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
					<Link
						href="/dashboard"
						className="hover:text-brand transition-colors"
					>
						Dashboard
					</Link>
					<span>/</span>
					<span className="text-foreground">My Profile</span>
				</div>

				{/* Profile card */}
				<div className="bg-white rounded-2xl border border-border overflow-hidden mb-5">
					<div className="bg-linear-to-br from-brand-50 to-brand-100 px-7 py-8 flex items-start gap-5">
						<AvatarUpload
							initial={user.fullName.charAt(0).toUpperCase()}
							currentPhoto={user.profilePhoto}
						/>
						<div>
							<h1 className="text-2xl font-bold text-foreground">
								{user.fullName}
							</h1>
							<p className="text-sm text-muted-foreground">{user.email}</p>
							<div className="flex flex-wrap gap-2 mt-3">
								<span className="text-xs font-bold text-brand bg-white border border-brand/20 px-3 py-1 rounded-full">
									{ROLE_LABELS[user.role] ?? user.role}
								</span>
								{user.isVerified ? (
									<span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-full flex items-center gap-1">
										<span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />{" "}
										Verified
									</span>
								) : (
									<span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
										Unverified
									</span>
								)}
							</div>
						</div>
					</div>

					{/* Account summary cards */}
					<div className="px-7 pt-5 pb-2 grid grid-cols-2 gap-4">
						<div className="bg-slate-50 p-3 rounded-xl border border-border">
							<p className="text-[11px] text-muted-foreground font-medium">Member Since</p>
							<p className="text-xs sm:text-sm font-semibold text-foreground mt-0.5">
								{user.createdAt.toLocaleDateString("en-GB", {
									day: "2-digit",
									month: "short",
									year: "numeric",
								})}
							</p>
						</div>
						<div className="bg-slate-50 p-3 rounded-xl border border-border">
							<p className="text-[11px] text-muted-foreground font-medium">Wallet Balance</p>
							<p className="text-xs sm:text-sm font-bold text-brand mt-0.5">
								৳{Number(user.wallet?.balance ?? 0).toFixed(2)}
							</p>
						</div>
					</div>

					{/* Editable Profile & Contact Details Form */}
					<div className="px-7 pb-7">
						<EditProfileForm
							initialFullName={user.fullName}
							initialPhone={user.phone}
							initialNidNumber={user.nidNumber}
							email={user.email}
						/>
					</div>
				</div>

				{user.isAgent && user.referralCode && (
					<ReferralCard
						code={user.referralCode}
						title="Your Agent Referral Link"
						hint="Share this link — anyone who signs up or logs in through it is permanently linked to you. You earn commission on every purchase they make afterward, automatically, no code needed."
						copyLabel="Copy"
						copiedLabel="Copied!"
						linkLabel="Referral Link"
					/>
				)}

				{/* Activity stats */}
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
					{[
						{
							label: "Shares",
							value: user._count.ownedShares,
							href: "/shares/my",
						},
						{
							label: "Air Tickets",
							value: user._count.airTicketRequests,
							href: "/air-ticket/my",
						},
						{
							label: "Taxi Requests",
							value: user._count.taxiRequests,
							href: "/taxi/my",
						},
						{
							label: "Checkouts",
							value: user._count.checkouts,
							href: "/checkout",
						},
					].map((s) => (
						<Link key={s.label} href={s.href}>
							<div className="bg-white rounded-xl border border-border p-4 text-center hover:border-brand/30 transition-colors">
								<p className="text-2xl font-bold text-foreground">{s.value}</p>
								<p className="text-xs text-muted-foreground mt-0.5">
									{s.label}
								</p>
							</div>
						</Link>
					))}
				</div>

				{/* Quick actions */}
				<div className="bg-white rounded-xl border border-border p-5">
					<h2 className="font-semibold text-foreground mb-4 text-sm">
						Quick Actions
					</h2>
					<div className="flex flex-wrap gap-2">
						<Link
							href="/dashboard/deposit"
							className="text-xs font-semibold bg-brand-50 text-brand px-4 py-2 rounded-lg hover:bg-brand hover:text-white transition-colors"
						>
							+ Deposit Funds
						</Link>
						<Link
							href="/shares"
							className="text-xs font-semibold bg-muted text-foreground px-4 py-2 rounded-lg hover:bg-border transition-colors"
						>
							Browse Shares
						</Link>
						<Link
							href="/wallet"
							className="text-xs font-semibold bg-muted text-foreground px-4 py-2 rounded-lg hover:bg-border transition-colors"
						>
							View Wallet
						</Link>
						<Link
							href="/pick-put/new"
							className="text-xs font-semibold bg-muted text-foreground px-4 py-2 rounded-lg hover:bg-border transition-colors"
						>
							Offer Pick & Put Space
						</Link>
						<Link
							href="/taxi/my"
							className="text-xs font-semibold bg-muted text-foreground px-4 py-2 rounded-lg hover:bg-border transition-colors"
						>
							My Taxi Requests
						</Link>
						<Link
							href="/air-ticket/my"
							className="text-xs font-semibold bg-muted text-foreground px-4 py-2 rounded-lg hover:bg-border transition-colors"
						>
							My Air Ticket Requests
						</Link>
						<Link
							href="/checkout"
							className="text-xs font-semibold bg-muted text-foreground px-4 py-2 rounded-lg hover:bg-border transition-colors"
						>
							My Checkouts
						</Link>
					</div>
				</div>

				{/* Security */}
				<div className="bg-white rounded-xl border border-border p-5">
					<h2 className="font-semibold text-foreground mb-1 text-sm">
						App Lock PIN
					</h2>
					<p className="text-xs text-muted-foreground mb-4">
						{user.pinHash
							? "Your account is protected by a 4-digit PIN, asked once per fresh visit."
							: "Set a 4-digit PIN to lock the app on this and other devices."}
					</p>
					<div className="flex flex-wrap gap-2">
						<Link
							href="/set-pin"
							className="text-xs font-semibold bg-muted text-foreground px-4 py-2 rounded-lg hover:bg-border transition-colors"
						>
							{user.pinHash ? "Change PIN" : "Set PIN"}
						</Link>
						{user.pinHash && (
							<form action={lockPinAction}>
								<button
									type="submit"
									className="text-xs font-semibold bg-amber-50 text-amber-700 px-4 py-2 rounded-lg hover:bg-amber-100 transition-colors"
								>
									Lock App Now
								</button>
							</form>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
