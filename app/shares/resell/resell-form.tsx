"use client";

import { useActionState, useState } from "react";
import { createShareListingAction } from "@/app/actions/shares";

type Ownership = {
	id: string;
	quantity: number;
	purchasePrice: unknown;
	project: { id: string; name: string; sharePriceSgd: unknown; status: string };
};

export function ResellForm({
	ownerships,
	selectedId,
	sellableByOwnership,
}: {
	ownerships: Ownership[];
	selectedId: string | null;
	sellableByOwnership: Record<string, number[]>;
}) {
	const [state, action, pending] = useActionState(
		createShareListingAction,
		null,
	);
	const [ownershipId, setOwnershipId] = useState(
		selectedId ?? ownerships[0]?.id ?? "",
	);
	const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
	const [price, setPrice] = useState("");

	const selected = ownerships.find((o) => o.id === ownershipId);
	const sellableNumbers = sellableByOwnership[ownershipId] ?? [];
	const marketPrice = selected
		? Number(selected.project.sharePriceSgd)
		: 0;
	const qty = selectedNumbers.length;
	const total = qty * Number(price || 0);

	function toggleNumber(n: number) {
		setSelectedNumbers((prev) =>
			prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n].sort((a, b) => a - b),
		);
	}

	if (state?.success) {
		return (
			<div className="px-7 py-12 text-center">
				<div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
					<svg
						className="w-7 h-7 text-green-500"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				</div>
				<p className="font-bold text-foreground text-lg mb-1">
					Listing Submitted!
				</p>
				<p className="text-sm text-muted-foreground">{state.message}</p>
			</div>
		);
	}

	return (
		<form action={action} className="p-7 space-y-5">
			<input type="hidden" name="shareNumbers" value={JSON.stringify(selectedNumbers)} />

			{/* Select project */}
			<div>
				<label className="block text-sm font-medium text-foreground mb-1.5">
					Select Project
				</label>
				<select
					name="ownershipId"
					value={ownershipId}
					onChange={(e) => {
						setOwnershipId(e.target.value);
						setSelectedNumbers([]);
						setPrice("");
					}}
					className="w-full px-3.5 py-2.5 rounded-xl border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-sm"
				>
					{ownerships.map((o) => (
						<option key={o.id} value={o.id}>
							{o.project.name} — {o.quantity} shares owned
						</option>
					))}
				</select>
				{selected && (
					<p className="text-xs text-muted-foreground mt-1">
						Market price:{" "}
						<span className="font-semibold text-foreground">
							৳{marketPrice.toFixed(2)}
						</span>{" "}
						per share · Bought at:{" "}
						<span className="font-semibold text-foreground">
							৳{Number(selected.purchasePrice).toFixed(2)}
						</span>
					</p>
				)}
			</div>

			{/* Share number picker */}
			<div>
				<div className="flex items-center justify-between mb-1.5">
					<label className="text-sm font-medium text-foreground">
						Select Share Numbers to Sell
					</label>
					<span className="text-xs text-muted-foreground">{sellableNumbers.length} sellable</span>
				</div>

				{sellableNumbers.length === 0 ? (
					<p className="text-xs text-muted-foreground border border-border rounded-lg px-3 py-4 text-center">
						No share numbers available to list — they may already be listed for resale.
					</p>
				) : (
					<div className="grid grid-cols-4 gap-1.5 max-h-56 overflow-y-auto p-1 border border-border rounded-lg">
						{sellableNumbers.map((n) => {
							const isSelected = selectedNumbers.includes(n);
							return (
								<button
									key={n}
									type="button"
									onClick={() => toggleNumber(n)}
									className={`px-2 py-1.5 rounded-md text-xs font-mono font-medium transition-colors ${
										isSelected
											? "bg-brand text-white"
											: "bg-muted text-muted-foreground hover:bg-brand-50 hover:text-brand"
									}`}
								>
									#{String(n).padStart(6, "0")}
								</button>
							);
						})}
					</div>
				)}
				<p className="text-xs text-muted-foreground mt-1">
					{qty} share{qty !== 1 ? "s" : ""} selected
				</p>
			</div>

			{/* Asking price */}
			<div>
				<label className="block text-sm font-medium text-foreground mb-1.5">
					Asking Price per Share (৳)
				</label>
				<input
					type="number"
					name="askingPrice"
					min={1}
					step="0.01"
					placeholder={`Market price: ${marketPrice.toFixed(2)}`}
					value={price}
					onChange={(e) => setPrice(e.target.value)}
					required
					className="w-full px-3.5 py-2.5 rounded-xl border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-sm"
				/>
				{price && Number(price) > 0 && (
					<div className="mt-1.5 flex items-center justify-between text-xs">
						<span className="text-muted-foreground">
							Total listing value:{" "}
							<span className="font-bold text-foreground">
								৳{total.toFixed(2)}
							</span>
						</span>
						{Number(price) !== marketPrice && (
							<span
								className={`font-semibold ${Number(price) > marketPrice ? "text-red-500" : "text-green-600"}`}
							>
								{Number(price) > marketPrice
									? `+${(((Number(price) - marketPrice) / marketPrice) * 100).toFixed(1)}% above market`
									: `${(((Number(price) - marketPrice) / marketPrice) * 100).toFixed(1)}% below market`}
							</span>
						)}
					</div>
				)}
			</div>

			{state?.error && (
				<div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
					{state.error}
				</div>
			)}

			<button
				type="submit"
				disabled={pending || qty === 0}
				className="w-full bg-brand text-white rounded-xl py-3 text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
			>
				{pending ? "Submitting…" : "Submit Resell Listing"}
			</button>
		</form>
	);
}
