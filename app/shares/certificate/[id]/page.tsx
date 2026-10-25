import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CertificatePrintControls } from "./print-controls";

export default async function ShareCertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const cert = await prisma.shareCertificate.findUnique({
    where: { id },
    include: {
      project: true,
      owner: { select: { fullName: true, nidNumber: true, email: true, phone: true } },
    },
  });

  if (!cert || !cert.owner) {
    notFound();
  }

  const certNumberFormatted = cert.code
    ? cert.code
    : `#${String(cert.shareNumber).padStart(6, "0")}`;

  const issueDate = cert.issuedAt
    ? cert.issuedAt.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4 print:p-0 print:bg-white flex flex-col items-center">
      {/* Print Controls Header */}
      <div className="w-full max-w-3xl mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <Link
          href="/dashboard"
          className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1.5"
        >
          ← Back to Dashboard
        </Link>
        <CertificatePrintControls
          certNumber={certNumberFormatted}
          projectName={cert.project.name}
          ownerName={cert.owner.fullName}
        />
      </div>

      {/* Official Certificate Paper Container */}
      <div className="w-full max-w-3xl bg-white border-8 border-double border-amber-600/60 rounded-2xl shadow-xl p-10 md:p-14 relative overflow-hidden print:shadow-none print:border-8 print:border-amber-700 print:w-full print:max-w-none print:m-0 print:rounded-none">
        {/* Background Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
          <span className="text-9xl font-black tracking-widest text-slate-900 rotate-[-25deg]">
            NIRAPODE
          </span>
        </div>

        {/* Decorative corner borders */}
        <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-amber-600" />
        <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-amber-600" />
        <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-amber-600" />
        <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-amber-600" />

        {/* Header */}
        <div className="text-center space-y-2 mb-8 border-b-2 border-amber-100 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 rounded-full border border-amber-200 text-amber-800 text-[11px] font-bold tracking-widest uppercase mb-1">
            Official Share Certificate
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 tracking-tight">
            NIRAPODE
          </h1>
          <p className="text-xs uppercase tracking-widest text-slate-500 font-medium">
            Community Investment & Development Network
          </p>
        </div>

        {/* Certificate Body */}
        <div className="text-center space-y-6">
          <p className="text-sm italic font-serif text-slate-600">
            This is to certify that
          </p>

          <div className="py-2 border-b border-dashed border-slate-300 max-w-md mx-auto">
            <p className="text-2xl sm:text-3xl font-bold font-serif text-slate-900">
              {cert.owner.fullName}
            </p>
            {cert.owner.nidNumber && (
              <p className="text-xs font-mono text-slate-500 mt-1">
                National ID / Passport: {cert.owner.nidNumber}
              </p>
            )}
          </div>

          <p className="text-sm font-serif text-slate-600 max-w-lg mx-auto leading-relaxed">
            is the recognized and lawful owner of <strong>1 (one)</strong> registered share in the community project:
          </p>

          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl py-3.5 px-6 max-w-lg mx-auto shadow-2xs">
            <p className="text-lg font-bold text-amber-950 font-serif">
              {cert.project.name}
            </p>
            <p className="text-xs text-amber-800 mt-0.5">
              Certificate Identifier: <strong className="font-mono text-sm tracking-wider text-amber-900">{certNumberFormatted}</strong>
            </p>
          </div>

          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Entitled to all rights, privileges, and dividend benefits pertaining to said share under the regulations of Nirapode.
          </p>
        </div>

        {/* Footer with Seal & Signatures */}
        <div className="mt-12 pt-8 border-t border-slate-200 grid grid-cols-3 items-end text-center">
          {/* Left: Issue Date */}
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-700">{issueDate}</p>
            <div className="w-24 h-px bg-slate-300 mx-auto" />
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Date of Issuance</p>
          </div>

          {/* Center: Official Seal */}
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full border-4 border-double border-amber-600 bg-amber-50/50 flex flex-col items-center justify-center p-1 text-center shadow-xs">
              <span className="text-[9px] font-black uppercase tracking-tighter text-amber-900 leading-tight">
                VERIFIED
              </span>
              <span className="text-lg text-amber-700">★</span>
              <span className="text-[8px] font-bold text-amber-800 uppercase tracking-widest">
                OFFICIAL
              </span>
            </div>
          </div>

          {/* Right: Authorized Signature */}
          <div className="space-y-1">
            <p className="text-xs font-serif font-bold italic text-slate-800">Authorized Officer</p>
            <div className="w-24 h-px bg-slate-300 mx-auto" />
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Nirapode</p>
          </div>
        </div>

        {/* Verification Footer text */}
        <div className="mt-8 pt-4 border-t border-dashed border-slate-200 text-center">
          <p className="text-[10px] font-mono text-slate-400">
            Certificate ID: {cert.id} · Verify authenticity at nirapode.vercel.app/shares/certificate/{cert.id}
          </p>
        </div>
      </div>
    </div>
  );
}
