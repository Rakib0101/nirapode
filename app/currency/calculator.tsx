"use client";

import Link from "next/link";
import { useState } from "react";

type Props = {
	defaultRate: number;
	isManual: boolean;
	manualPhpRate?: number | null;
};

const CURRENCY_META = {
	BDT: { symbol: "৳", label: "BDT" },
	PHP: { symbol: "₱", label: "PHP" },
} as const;

export function BankCalculator({ defaultRate, isManual, manualPhpRate }: Props) {
	const [amount, setAmount] = useState("1");
	const [reversed, setReversed] = useState(false); // false = SGD→target, true = target→SGD
	const [target, setTarget] = useState<"BDT" | "PHP">("BDT");

	const rate = target === "PHP" ? (manualPhpRate ?? defaultRate) : defaultRate;

	const numAmount = parseFloat(amount) || 0;
	const result = reversed ? numAmount / rate : numAmount * rate;
	// Deposits/withdrawals are always in BDT — whichever side of the
	// conversion that is becomes the amount carried over to those forms.
	// Only meaningful when converting against BDT (not PHP).
	const bdtAmount = target === "BDT" ? (reversed ? numAmount : result) : 0;
	const bdtParam = bdtAmount > 0 ? `?amount=${bdtAmount.toFixed(2)}` : "";

	const fromCurrency = reversed ? CURRENCY_META[target].label : "SGD";
	const toCurrency = reversed ? "SGD" : CURRENCY_META[target].label;
	const fromSymbol = reversed ? CURRENCY_META[target].symbol : "$";
	const toSymbol = reversed ? "$" : CURRENCY_META[target].symbol;

	return (
		<div className="bg-white rounded-2xl border border-border p-6">
			<div className="flex items-center justify-between mb-5">
				<h2 className="font-semibold text-foreground">Convert Currency</h2>
				{manualPhpRate != null && (
					<select
						value={target}
						onChange={(e) => setTarget(e.target.value as "BDT" | "PHP")}
						className="text-xs font-semibold text-foreground bg-muted border border-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand cursor-pointer"
					>
						<option value="BDT">BDT</option>
						<option value="PHP">PHP</option>
					</select>
				)}
			</div>

			<div className="flex flex-row gap-3 items-end">
				{/* Amount input */}
				<div className="flex-1">
					<label className="block text-xs text-muted-foreground mb-1.5">
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
					className="w-10 h-10 rounded-xl border border-border flex items-center justify-center hover:bg-muted transition-colors shrink-0 mb-0.5"
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
				<p className="text-sm text-muted-foreground">
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
					Rate: 1 SGD = {rate.toFixed(4)} {CURRENCY_META[target].symbol} {CURRENCY_META[target].label}
					<span className="ml-1 text-brand/70">
						({target === "PHP" ? "Admin rate" : isManual ? "Admin rate" : "Live rate"})
					</span>
				</p>
			</div>

			{target === "BDT" ? (
			<div className="flex flex-col sm:flex-row gap-3 mt-4">
				<Link
					href={`/dashboard/deposit${bdtParam}`}
					className="flex-1 text-center bg-brand text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-brand-dark transition-colors"
				>
					Deposit to Wallet
				</Link>
				<Link
					href={`/dashboard/withdraw${bdtParam}`}
					className="flex-1 text-center border border-border text-foreground text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-muted transition-colors"
				>
					Withdraw from Wallet
				</Link>
			</div>
			) : (
				<p className="mt-4 text-xs text-muted-foreground text-center">
					Wallet deposits and withdrawals are in BDT — switch the currency above to BDT to continue.
				</p>
			)}
		</div>
	);
}
