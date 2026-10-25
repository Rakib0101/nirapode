"use client";

import Link from "next/link";
import { useState } from "react";

type Props = {
	defaultRate: number;
	isManual: boolean;
	manualPhpRate?: number | null;
};

type ConversionMode = "SGD_BDT" | "BDT_PHP";

export function BankCalculator({ defaultRate, isManual, manualPhpRate }: Props) {
	const [mode, setMode] = useState<ConversionMode>("SGD_BDT");
	const [amount, setAmount] = useState("100");
	const [reversed, setReversed] = useState(false);

	const isSgdBdt = mode === "SGD_BDT";
	const rate = isSgdBdt ? defaultRate : (manualPhpRate ?? 0.484);

	const numAmount = parseFloat(amount) || 0;
	const result = reversed ? (rate > 0 ? numAmount / rate : 0) : numAmount * rate;

	// Calculate BDT equivalent for deposit/withdraw links
	let bdtAmount = 0;
	if (isSgdBdt) {
		bdtAmount = reversed ? numAmount : result;
	} else {
		bdtAmount = reversed ? result : numAmount;
	}
	const bdtParam = bdtAmount > 0 ? `?amount=${bdtAmount.toFixed(2)}` : "";

	const baseLabel = isSgdBdt ? "SGD" : "BDT";
	const baseSymbol = isSgdBdt ? "$" : "৳";
	const targetLabel = isSgdBdt ? "BDT" : "PHP";
	const targetSymbol = isSgdBdt ? "৳" : "₱";

	const fromCurrency = reversed ? targetLabel : baseLabel;
	const toCurrency = reversed ? baseLabel : targetLabel;
	const fromSymbol = reversed ? targetSymbol : baseSymbol;
	const toSymbol = reversed ? baseSymbol : targetSymbol;

	return (
		<div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
				<div>
					<h2 className="font-semibold text-foreground">Currency Converter</h2>
					<p className="text-xs text-muted-foreground mt-0.5">
						Live rates for deposits, transfers, and wallet withdrawals
					</p>
				</div>
				{manualPhpRate != null && (
					<div className="inline-flex rounded-xl bg-muted p-1 border border-border">
						<button
							type="button"
							onClick={() => { setMode("SGD_BDT"); setReversed(false); }}
							className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
								isSgdBdt ? "bg-white text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
							}`}
						>
							SGD ↔ BDT (Dollar–Taka)
						</button>
						<button
							type="button"
							onClick={() => { setMode("BDT_PHP"); setReversed(false); }}
							className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
								!isSgdBdt ? "bg-white text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
							}`}
						>
							BDT ↔ PHP (Taka–Pesos)
						</button>
					</div>
				)}
			</div>

			<div className="flex flex-row gap-3 items-end">
				{/* Amount input */}
				<div className="flex-1">
					<label className="block text-xs font-medium text-muted-foreground mb-1.5">
						{fromCurrency} Amount
					</label>
					<div className="flex items-center rounded-xl border border-border focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
						<span className="pl-3.5 pr-1.5 text-sm font-medium text-muted-foreground shrink-0">
							{fromSymbol}
						</span>
						<input
							type="number"
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
							min={0}
							step="any"
							className="w-full min-w-0 pr-3.5 py-2.5 rounded-r-xl bg-transparent text-foreground text-lg font-semibold focus:outline-none"
						/>
					</div>
				</div>

				{/* Swap button */}
				<button
					type="button"
					onClick={() => setReversed((v) => !v)}
					className="w-10 h-10 rounded-xl border border-border flex items-center justify-center hover:bg-muted transition-colors shrink-0 mb-0.5 cursor-pointer"
					title="Swap direction"
				>
					<svg
						className="w-4 h-4 text-muted-foreground"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
						/>
					</svg>
				</button>
			</div>

			{/* Result */}
			<div className="mt-5 bg-brand-50 rounded-xl px-5 py-4">
				<p className="text-xs text-muted-foreground">
					{amount || "0"} {fromCurrency} =
				</p>
				<p className="text-3xl font-bold text-brand mt-0.5">
					{toSymbol}{" "}
					{result.toLocaleString("en-US", {
						minimumFractionDigits: 2,
						maximumFractionDigits: 2,
					})}
					<span className="text-base font-normal text-brand/70 ml-2">
						{toCurrency}
					</span>
				</p>
				<p className="text-xs text-muted-foreground mt-2">
					Rate: 1 {baseLabel} = {rate.toFixed(4)} {targetSymbol} {targetLabel}
					<span className="ml-1 text-brand/70">
						({isSgdBdt ? (isManual ? "Admin rate" : "Live rate") : "Withdrawal rate"})
					</span>
				</p>
			</div>

			{/* Wallet Actions */}
			<div className="flex flex-col sm:flex-row gap-3 mt-4">
				<Link
					href={`/dashboard/deposit${bdtParam}`}
					className="flex-1 text-center bg-brand text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-brand-dark transition-colors shadow-xs"
				>
					Deposit to Wallet
				</Link>
				<Link
					href={`/dashboard/withdraw${bdtParam}`}
					className="flex-1 text-center border border-border text-foreground text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-muted transition-colors"
				>
					{!isSgdBdt ? "Withdraw to GCash (Pesos)" : "Withdraw from Wallet"}
				</Link>
			</div>
		</div>
	);
}
