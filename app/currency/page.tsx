import { getCurrencySettings, getLiveBdtRate } from "@/lib/currency";
import { prisma } from "@/lib/prisma";
import { BankCalculator } from "./calculator";

async function getBankRates() {
  try {
    const rows = await prisma.bankRate.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return rows.map((r) => ({ id: r.id, bankName: r.bankName, rate: Number(r.rate) }));
  } catch {
    return [];
  }
}

export default async function CurrencyPage() {
  const [settings, liveRate, banks] = await Promise.all([
    getCurrencySettings(),
    getLiveBdtRate(),
    getBankRates(),
  ]);

  // Effective rate for the calculator and top bar
  const effectiveRate =
    settings.source === "manual"
      ? settings.manualRate
      : (liveRate ?? settings.manualRate);

  const isManual = settings.source === "manual";

  const maxRate = banks.length > 0 ? Math.max(...banks.map((b) => b.rate)) : 0;

  return (
    <div className="min-h-screen bg-muted">
      {/* Hero */}
      <div className="bg-white border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <span className="inline-block text-xs font-bold uppercase tracking-wider text-brand bg-brand-50 px-3 py-1 rounded-full mb-3">
            Currency Converter
          </span>
          <h1 className="text-3xl font-bold text-foreground">SGD Exchange Rates</h1>
          <p className="text-muted-foreground mt-2">Live rates updated hourly. Base currency: Singapore Dollar (SGD).</p>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`w-2 h-2 rounded-full ${isManual ? "bg-blue-400" : "bg-green-400 animate-pulse"}`}
            />
            <p className="text-xs text-muted-foreground">
              Reference rate: 1 SGD = <strong className="text-foreground">{effectiveRate.toFixed(2)} ৳ BDT</strong>
              {" · "}{isManual ? "Admin rate" : "Live"}
            </p>
          </div>
          {settings.manualPhpRate != null && (
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <p className="text-xs text-muted-foreground">
                Reference rate: 1 SGD = <strong className="text-foreground">{settings.manualPhpRate.toFixed(2)} ₱ PHP</strong>
                {" · "}Admin rate
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Calculator */}
        <BankCalculator
          defaultRate={effectiveRate}
          isManual={isManual}
          manualPhpRate={settings.manualPhpRate}
        />

        {/* Bank rate cards */}
        {banks.length > 0 ? (
          <div>
            <h2 className="text-base font-semibold text-foreground mb-1">
              Bank Rates · 1 SGD = ? ৳ BDT
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              For comparison only. Sending or withdrawing money always uses the rate shown in the calculator above.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {banks.map((bank) => {
                const isBest = bank.rate === maxRate;
                return (
                  <div
                    key={bank.id}
                    className={`bg-white rounded-2xl border p-5 relative overflow-hidden transition-shadow hover:shadow-sm ${
                      isBest ? "border-green-300 ring-1 ring-green-200" : "border-border"
                    }`}
                  >
                    {isBest && (
                      <span className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        Best Rate
                      </span>
                    )}
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-foreground leading-tight">{bank.bankName}</p>
                    </div>
                    <p className="text-3xl font-bold text-foreground">
                      {bank.rate.toFixed(2)}
                      <span className="text-lg font-normal text-muted-foreground ml-1">৳</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      1 SGD · {(1 / bank.rate).toFixed(6)} BDT per ৳
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground text-sm">
            No bank rates configured yet. Admin will add them shortly.
          </div>
        )}

        {/* Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-sm text-blue-800">
          <strong>Note:</strong> Exchange rates are indicative only. Actual rates at banks or remittance services may vary. Always confirm with your provider before transferring money.
        </div>
      </div>
    </div>
  );
}
