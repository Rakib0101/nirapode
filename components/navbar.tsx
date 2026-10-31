"use client";

import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { useState, useRef, useEffect } from "react";
import type { SessionPayload } from "@/lib/session";

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "MODERATOR"];

function getInitials(fullName: string) {
	const parts = fullName.trim().split(/\s+/);
	if (parts.length === 1) return parts[0][0].toUpperCase();
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function AvatarDropdown({ user }: { user: SessionPayload }) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);
	const isAdmin = ADMIN_ROLES.includes(user.role);

	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, []);

	return (
		<div ref={ref} className="relative">
			<button
				onClick={() => setOpen((v) => !v)}
				className="flex items-center gap-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
			>
				<span className="w-9 h-9 rounded-full bg-brand text-white text-sm font-bold flex items-center justify-center select-none shrink-0">
					{getInitials(user.fullName)}
				</span>
				<svg
					className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						fillRule="evenodd"
						d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
						clipRule="evenodd"
					/>
				</svg>
			</button>

			{open && (
				<div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-border py-1 z-50">
					{/* User info */}
					<div className="px-4 py-3 border-b border-border">
						<p className="text-sm font-semibold text-foreground truncate">
							{user.fullName}
						</p>
						<p className="text-xs text-muted-foreground truncate">
							{user.email}
						</p>
						<span className="mt-1 inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand-50 text-brand">
							{user.role.replace("_", " ")}
						</span>
					</div>

					{/* Links */}
					<div className="py-1">
						{isAdmin && (
							<Link
								href="/admin"
								onClick={() => setOpen(false)}
								className="flex items-center gap-2.5 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
							>
								<svg
									className="w-4 h-4 text-muted-foreground"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									strokeWidth={1.8}
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
									/>
								</svg>
								Admin Panel
							</Link>
						)}
						<Link
							href="/dashboard"
							onClick={() => setOpen(false)}
							className="flex items-center gap-2.5 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
						>
							<svg
								className="w-4 h-4 text-muted-foreground"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={1.8}
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
								/>
							</svg>
							Dashboard
						</Link>
						<Link
							href="/profile"
							onClick={() => setOpen(false)}
							className="flex items-center gap-2.5 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
						>
							<svg
								className="w-4 h-4 text-muted-foreground"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={1.8}
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
								/>
							</svg>
							Profile
						</Link>
					</div>

					{/* My sections */}
					<div className="border-t border-border py-1">
						<p className="px-4 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
							My Sections
						</p>
						<Link
							href="/history"
							onClick={() => setOpen(false)}
							className="flex items-center gap-2.5 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors font-medium"
						>
							<svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
								<path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							All History
						</Link>
						<Link
							href="/reminders"
							onClick={() => setOpen(false)}
							className="flex items-center gap-2.5 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
						>
							<svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
								<path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
							</svg>
							Alarm & Reminders
						</Link>
						<Link
							href="/forum"
							onClick={() => setOpen(false)}
							className="flex items-center gap-2.5 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
						>
							<svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
								<path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
							</svg>
							Community Forum
						</Link>
						<Link
							href="/shares/my"
							onClick={() => setOpen(false)}
							className="flex items-center gap-2.5 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
						>
							<svg
								className="w-4 h-4 text-muted-foreground"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={1.8}
							>
								<polyline
									strokeLinecap="round"
									strokeLinejoin="round"
									points="22 7 13.5 15.5 8.5 10.5 2 17"
								/>
								<polyline
									strokeLinecap="round"
									strokeLinejoin="round"
									points="16 7 22 7 22 13"
								/>
							</svg>
							My Investments
						</Link>
						<Link
							href="/pick-put/my"
							onClick={() => setOpen(false)}
							className="flex items-center gap-2.5 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
						>
							<svg
								className="w-4 h-4 text-muted-foreground"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={1.8}
							>
								<circle
									cx="11"
									cy="11"
									r="8"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
								<line
									x1="21"
									y1="21"
									x2="16.65"
									y2="16.65"
									strokeLinecap="round"
								/>
							</svg>
							My Pick & Put
						</Link>
						<Link
							href="/apply"
							onClick={() => setOpen(false)}
							className="flex items-center gap-2.5 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
						>
							<svg
								className="w-4 h-4 text-muted-foreground"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={1.8}
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
								/>
							</svg>
							Apply for Service
						</Link>
						<Link
							href="/wallet"
							onClick={() => setOpen(false)}
							className="flex items-center gap-2.5 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
						>
							<svg
								className="w-4 h-4 text-muted-foreground"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={1.8}
							>
								<rect
									x="1"
									y="4"
									width="22"
									height="16"
									rx="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
								<line x1="1" y1="10" x2="23" y2="10" strokeLinecap="round" />
							</svg>
							Wallet
						</Link>
					</div>

					{/* Logout */}
					<div className="border-t border-border py-1">
						<form action="/api/logout" method="POST">
							<button
								type="submit"
								className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
							>
								<svg
									className="w-4 h-4"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									strokeWidth={1.8}
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
									/>
								</svg>
								Logout
							</button>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}

function MobileAvatarMenu({
	user,
	walletBalance,
	pendingCheckout,
}: {
	user: SessionPayload;
	walletBalance?: number | null;
	pendingCheckout?: { token: string; totalAmount: number } | null;
}) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);
	const isAdmin = ADMIN_ROLES.includes(user.role);

	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, []);

	return (
		<div ref={ref} className="relative">
			<button
				onClick={() => setOpen((v) => !v)}
				className="w-8 h-8 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center shrink-0 active:scale-90 transition-transform"
			>
				{getInitials(user.fullName)}
			</button>

			{open && (
				<div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-border py-1 z-50">
					{/* User name */}
					<div className="px-4 py-3 border-b border-border">
						<p className="text-sm font-semibold text-foreground truncate">{user.fullName}</p>
						<p className="text-xs text-muted-foreground truncate">{user.email}</p>
						<span className="mt-1 inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand-50 text-brand">
							{user.role.replace("_", " ")}
						</span>
					</div>

					{/* Wallet balance */}
					<Link
						href="/wallet"
						onClick={() => setOpen(false)}
						className="flex items-center justify-between px-4 py-3 border-b border-border hover:bg-muted transition-colors"
					>
						<span className="text-xs text-muted-foreground">Wallet Balance</span>
						<span className="text-sm font-bold text-foreground">৳{(walletBalance ?? 0).toFixed(2)}</span>
					</Link>

					{/* Pending checkout */}
					{pendingCheckout && (
						<Link
							href={`/pay/${pendingCheckout.token}`}
							onClick={() => setOpen(false)}
							className="flex items-center justify-between px-4 py-3 border-b border-border bg-amber-50 hover:bg-amber-100 transition-colors"
						>
							<span className="text-xs font-medium text-amber-800">Complete Payment</span>
							<span className="text-sm font-bold text-amber-800">৳{pendingCheckout.totalAmount.toFixed(2)}</span>
						</Link>
					)}

					{/* Quick actions */}
					<div className="py-1">
						{isAdmin && (
							<Link
								href="/admin"
								onClick={() => setOpen(false)}
								className="flex items-center px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
							>
								Admin Panel
							</Link>
						)}
						<Link
							href="/dashboard"
							onClick={() => setOpen(false)}
							className="flex items-center px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
						>
							Dashboard
						</Link>
						<Link
							href="/profile"
							onClick={() => setOpen(false)}
							className="flex items-center px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
						>
							Profile
						</Link>
					</div>

					{/* Logout */}
					<div className="border-t border-border py-1">
						<form action="/api/logout" method="POST">
							<button
								type="submit"
								className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
							>
								Logout
							</button>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}

function MobileNavMenu({ links }: { links: { href: string; label: string }[] }) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, []);

	return (
		<div ref={ref} className="relative">
			<button
				onClick={() => setOpen((v) => !v)}
				aria-label="Open menu"
				className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-brand hover:bg-brand-50 active:scale-90 transition-transform"
			>
				<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
				</svg>
			</button>

			{open && (
				<div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-border py-1.5 z-50">
					{links.map((link) => (
						<Link
							key={link.href}
							href={link.href}
							onClick={() => setOpen(false)}
							className="block px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
						>
							{link.label}
						</Link>
					))}
				</div>
			)}
		</div>
	);
}

export function Navbar({
	user,
	walletBalance,
	pendingCheckout,
}: {
	user: SessionPayload | null;
	walletBalance?: number | null;
	pendingCheckout?: { token: string; totalAmount: number } | null;
}) {
	const navLinks = [
		{ href: "/shares", label: "Shares 6" },
		{ href: "/shares/buy-request", label: "Share 4" },
		{ href: "/services", label: "Services" },
		{ href: "/taxi", label: "Taxi Rent" },
		{ href: "/air-ticket", label: "Air Ticket" },
		{ href: "/forum", label: "Forum" },
		{ href: "/currency", label: "Currency" },
		{ href: "/islamic-center", label: "Islamic Center" },
		{ href: "/pick-put", label: "Pick & Put" },
	];

	// Wallet/Checkout/Reminders/History surface in mobile menu once logged in
	const mobileMenuLinks = user
		? [
				...navLinks,
				{ href: "/history", label: "All History" },
				{ href: "/reminders", label: "Alarm & Reminders" },
				{ href: "/wallet", label: "Wallet" },
				{ href: "/checkout", label: "Checkout" },
		  ]
		: navLinks;

	return (
		<header className="sticky top-0 z-50 bg-white/95 dark:bg-card/95 backdrop-blur-sm border-b border-border">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex items-center justify-between h-14 lg:h-16">
					{/* Logo */}
					<Link href="/" className="shrink-0 flex items-center">
						<Logo size="md" />
					</Link>

					{/* Desktop nav */}
					<nav className="hidden lg:flex items-center gap-0.5">
						{navLinks.map((link) => (
							<Link
								key={link.href}
								href={link.href}
								className="px-3.5 py-2 text-sm font-medium text-muted-foreground hover:text-brand hover:bg-brand-50 rounded-lg transition-colors"
							>
								{link.label}
							</Link>
						))}
					</nav>

					{/* Mobile right: tappable avatar with dropdown + hamburger menu */}
					<div className="flex lg:hidden items-center gap-1.5">
						<ThemeToggle compact />
						{user && (
							<MobileAvatarMenu user={user} walletBalance={walletBalance} pendingCheckout={pendingCheckout} />
						)}
						{!user && (
							<Link
								href="/login"
								className="text-xs font-semibold text-brand border border-brand px-3 py-1.5 rounded-full"
							>
								Login
							</Link>
						)}
						<MobileNavMenu links={mobileMenuLinks} />
					</div>

					{/* Desktop right side */}
					<div className="hidden lg:flex items-center gap-3">
						<ThemeToggle compact />
						{user ? (
							<AvatarDropdown user={user} />
						) : (
							<>
								<Link
									href="/login"
									className="px-5 py-2 text-sm font-semibold text-brand border border-brand rounded-full hover:bg-brand-50 transition-colors"
								>
									Login
								</Link>
								<Link
									href="/register"
									className="px-5 py-2 text-sm font-semibold text-white bg-brand rounded-full hover:bg-brand-dark transition-colors"
								>
									Register Free
								</Link>
							</>
						)}
					</div>
				</div>
			</div>
		</header>
	);
}
