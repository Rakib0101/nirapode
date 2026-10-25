"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { formatWhatsAppLink } from "@/lib/site-contact-types";
import { deductCvFeeAction } from "@/app/actions/cv-builder";

type UserProfile = {
  fullName: string;
  email: string;
  phone: string;
} | null;

type WorkExp = {
  company: string;
  role: string;
  location: string;
  years: string;
  description: string;
};

type Education = {
  degree: string;
  institute: string;
  year: string;
};

export function CvBuilderClient({
  user,
  whatsappNumber,
}: {
  user: UserProfile;
  whatsappNumber: string;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  // Form state
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [email, setEmail] = useState(user?.email || "");
  const [address, setAddress] = useState("Singapore");
  const [finPassport, setFinPassport] = useState("");
  const [dob, setDob] = useState("");
  const [nationality, setNationality] = useState("Bangladeshi");
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Shrinks the chosen photo in the browser to a passport-size JPEG data URL.
  // It never leaves the device — it's only drawn into the CV for printing.
  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError("Please choose an image file (JPG or PNG).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setPhotoError("Photo is too large — please choose one under 10 MB.");
      return;
    }
    setPhotoError(null);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const maxW = 360, maxH = 450;
      const scale = Math.min(1, maxW / img.width, maxH / img.height);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      setPhoto(canvas.toDataURL("image/jpeg", 0.85));
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      setPhotoError("Couldn't read that image. Please try another photo.");
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }
  const [sector, setSector] = useState("Construction / Process");
  const [summary, setSummary] = useState(
    "Hardworking, dedicated, and safety-conscious worker with extensive hands-on experience in Singapore. Proven track record of high productivity, teamwork, and adherence to Workplace Safety & Health regulations."
  );

  const [skills, setSkills] = useState<string[]>([
    "Workplace Safety & Health (CSOC / BCSS)",
    "CoreTrade Certified / SEC(K)",
    "Site Supervision & Quality Control",
    "Equipment & Tools Operation",
    "English & Basic Mandarin Communication",
  ]);
  const [newSkill, setNewSkill] = useState("");

  const [experiences, setExperiences] = useState<WorkExp[]>([
    {
      company: "Apex Engineering & Construction Pte Ltd",
      role: "Senior Construction Worker / Team Lead",
      location: "Singapore",
      years: "2021 – Present",
      description: "Supervised daily site activities, ensured strict compliance with MOM safety regulations, and coordinated structural works with project engineers.",
    },
    {
      company: "Sinoma Builders Pte Ltd",
      role: "General Construction Worker",
      location: "Singapore",
      years: "2018 – 2021",
      description: "Assisted in formwork, concrete pouring, site preparation, and scaffolding operations with zero incident record.",
    },
  ]);

  const [educations, setEducations] = useState<Education[]>([
    {
      degree: "Secondary School Certificate (SSC)",
      institute: "Dhaka Board, Bangladesh",
      year: "2016",
    },
  ]);

  function addSkill() {
    if (!newSkill.trim()) return;
    setSkills([...skills, newSkill.trim()]);
    setNewSkill("");
  }

  function removeSkill(idx: number) {
    setSkills(skills.filter((_, i) => i !== idx));
  }

  function addExperience() {
    setExperiences([
      ...experiences,
      {
        company: "",
        role: "",
        location: "Singapore",
        years: "",
        description: "",
      },
    ]);
  }

  function removeExperience(idx: number) {
    setExperiences(experiences.filter((_, i) => i !== idx));
  }

  function updateExperience(idx: number, field: keyof WorkExp, val: string) {
    const updated = [...experiences];
    updated[idx][field] = val;
    setExperiences(updated);
  }

  function addEducation() {
    setEducations([...educations, { degree: "", institute: "", year: "" }]);
  }

  function removeEducation(idx: number) {
    setEducations(educations.filter((_, i) => i !== idx));
  }

  function updateEducation(idx: number, field: keyof Education, val: string) {
    const updated = [...educations];
    updated[idx][field] = val;
    setEducations(updated);
  }

  const [deducting, setDeducting] = useState(false);
  const [deductError, setDeductError] = useState<string | null>(null);
  const [needDeposit, setNeedDeposit] = useState(false);
  const [deductedSuccess, setDeductedSuccess] = useState<string | null>(null);

  async function handleDownloadCv() {
    setDeductError(null);
    setDeductedSuccess(null);
    setNeedDeposit(false);

    if (!user) {
      setDeductError("Please log in to your Nirapode account before generating and downloading your CV.");
      return;
    }

    setDeducting(true);
    try {
      const res = await deductCvFeeAction();
      if (res.error) {
        setDeductError(res.error);
        if (res.needDeposit) setNeedDeposit(true);
        return;
      }

      setDeductedSuccess(`৳${res.fee?.toFixed(2) ?? "30.00"} deducted from your platform wallet. Opening PDF download...`);
      // Trigger print / save as PDF
      setTimeout(() => {
        window.print();
      }, 300);
    } catch {
      setDeductError("An unexpected error occurred while processing your request. Please try again.");
    } finally {
      setDeducting(false);
    }
  }

  const waSummary = `Hi Nirapode Support, here is my worker CV details:
*Name:* ${fullName}
*Phone:* ${phone}
*Passport/FIN:* ${finPassport || "N/A"}
*Sector:* ${sector}
*Nationality:* ${nationality}
*Experience:*
${experiences.map((e) => `- ${e.role} at ${e.company} (${e.years})`).join("\n")}
*Key Skills:* ${skills.join(", ")}
Please help me review and connect with prospective employers.`;

  const waUrl = formatWhatsAppLink(whatsappNumber, waSummary);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="print:hidden mb-8 border-b border-border pb-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <Link
              href="/services"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors"
            >
              ← Back to Services
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Worker CV / Resume Builder</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Create, download your PDF CV, and share it directly to WhatsApp for Singapore job applications.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Editor Column */}
        <div className="print:hidden lg:col-span-5 space-y-6">
          {/* Personal Info */}
          <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
            <h2 className="font-bold text-foreground text-sm flex items-center gap-2">
              <span>👤</span> Personal Information
            </h2>

            <div className="flex items-center gap-4">
              <div className="w-20 h-24 rounded-xl border border-dashed border-border bg-muted overflow-hidden flex items-center justify-center shrink-0">
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local data URL preview
                  <img src={photo} alt="Your photo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl text-muted-foreground">📷</span>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="inline-block cursor-pointer text-xs font-semibold px-3 py-2 rounded-xl bg-brand-50 text-brand hover:bg-brand-100 transition-colors">
                  {photo ? "Change Photo" : "Upload Photo"}
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="sr-only" />
                </label>
                {photo && (
                  <button type="button" onClick={() => setPhoto(null)} className="block text-xs text-red-600 hover:underline">
                    Remove photo
                  </button>
                )}
                <p className="text-[11px] text-muted-foreground">Passport-style photo, plain background</p>
                {photoError && <p className="text-[11px] text-red-600">{photoError}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Md Rakib Hossain"
                className="w-full text-sm px-3 py-2 rounded-xl border border-border focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Phone / WhatsApp</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+65 8123 4567"
                  className="w-full text-sm px-3 py-2 rounded-xl border border-border focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rakib@example.com"
                  className="w-full text-sm px-3 py-2 rounded-xl border border-border focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">FIN / Passport No</label>
                <input
                  type="text"
                  value={finPassport}
                  onChange={(e) => setFinPassport(e.target.value)}
                  placeholder="G1234567X / A0123456"
                  className="w-full text-sm px-3 py-2 rounded-xl border border-border focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Nationality</label>
                <input
                  type="text"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-xl border border-border focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Sector / Trade</label>
                <input
                  type="text"
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  placeholder="Construction / Marine / F&B"
                  className="w-full text-sm px-3 py-2 rounded-xl border border-border focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Current Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Tuas, Singapore"
                  className="w-full text-sm px-3 py-2 rounded-xl border border-border focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Professional Summary</label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={3}
                className="w-full text-xs px-3 py-2 rounded-xl border border-border focus:outline-none focus:ring-1 focus:ring-brand resize-none"
              />
            </div>
          </div>

          {/* Work Experience */}
          <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-foreground text-sm flex items-center gap-2">
                <span>💼</span> Work Experience
              </h2>
              <button
                type="button"
                onClick={addExperience}
                className="text-xs font-semibold text-brand hover:underline cursor-pointer"
              >
                + Add Experience
              </button>
            </div>

            {experiences.map((exp, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-2.5 relative">
                <button
                  type="button"
                  onClick={() => removeExperience(idx)}
                  className="absolute right-2 top-2 text-xs text-red-500 hover:text-red-700 cursor-pointer"
                >
                  ✕
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={exp.role}
                    onChange={(e) => updateExperience(idx, "role", e.target.value)}
                    placeholder="Job Title / Role"
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-white"
                  />
                  <input
                    type="text"
                    value={exp.company}
                    onChange={(e) => updateExperience(idx, "company", e.target.value)}
                    placeholder="Company Name"
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={exp.years}
                    onChange={(e) => updateExperience(idx, "years", e.target.value)}
                    placeholder="Years (e.g. 2021 – 2024)"
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-white"
                  />
                  <input
                    type="text"
                    value={exp.location}
                    onChange={(e) => updateExperience(idx, "location", e.target.value)}
                    placeholder="Location (e.g. Singapore)"
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-white"
                  />
                </div>
                <textarea
                  value={exp.description}
                  onChange={(e) => updateExperience(idx, "description", e.target.value)}
                  placeholder="Key duties and responsibilities..."
                  rows={2}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-border bg-white resize-none"
                />
              </div>
            ))}
          </div>

          {/* Skills */}
          <div className="bg-white rounded-2xl border border-border p-5 space-y-3">
            <h2 className="font-bold text-foreground text-sm flex items-center gap-2">
              <span>🛠️</span> Skills & Certifications
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                placeholder="e.g. BCSS / CSOC, Forklift License"
                className="flex-1 text-xs px-3 py-2 rounded-xl border border-border"
              />
              <button
                type="button"
                onClick={addSkill}
                className="bg-brand text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-brand-dark cursor-pointer"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-2">
              {skills.map((s, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 bg-muted text-foreground text-xs px-2.5 py-1 rounded-lg border border-border"
                >
                  {s}
                  <button
                    type="button"
                    onClick={() => removeSkill(idx)}
                    className="text-muted-foreground hover:text-red-500 font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Education */}
          <div className="bg-white rounded-2xl border border-border p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-foreground text-sm flex items-center gap-2">
                <span>🎓</span> Education
              </h2>
              <button
                type="button"
                onClick={addEducation}
                className="text-xs font-semibold text-brand hover:underline cursor-pointer"
              >
                + Add Education
              </button>
            </div>
            {educations.map((edu, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-muted/40 border border-border space-y-2 relative">
                <button
                  type="button"
                  onClick={() => removeEducation(idx)}
                  className="absolute right-2 top-2 text-xs text-red-500 cursor-pointer"
                >
                  ✕
                </button>
                <input
                  type="text"
                  value={edu.degree}
                  onChange={(e) => updateEducation(idx, "degree", e.target.value)}
                  placeholder="Degree / Certificate"
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-border bg-white"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={edu.institute}
                    onChange={(e) => updateEducation(idx, "institute", e.target.value)}
                    placeholder="School / Board"
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-white"
                  />
                  <input
                    type="text"
                    value={edu.year}
                    onChange={(e) => updateEducation(idx, "year", e.target.value)}
                    placeholder="Year (e.g. 2018)"
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-white"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live CV Preview Column (Also the printable area) */}
        <div className="lg:col-span-7">
          <div className="sticky top-6">
            <div className="bg-muted px-4 py-2 rounded-t-2xl border-t border-x border-border flex items-center justify-between print:hidden">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Live CV Preview
              </span>
              <span className="text-xs text-muted-foreground">A4 Standard Format</span>
            </div>

            <div
              ref={printRef}
              id="cv-printable"
              className="bg-white rounded-b-2xl lg:rounded-2xl border border-border shadow-md p-8 sm:p-10 space-y-6 text-foreground print:border-none print:shadow-none print:p-0 print:m-0"
            >
              {/* CV Top Header */}
              <div className="border-b-2 border-brand pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                {photo && (
                  // eslint-disable-next-line @next/next/no-img-element -- local data URL, must print
                  <img
                    src={photo}
                    alt={fullName || "Photo"}
                    className="w-24 h-28 object-cover rounded-lg border border-border shrink-0"
                  />
                )}
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight uppercase">
                    {fullName || "Your Full Name"}
                  </h1>
                  <p className="text-base font-semibold text-brand mt-1">{sector || "Worker / Specialist"}</p>
                </div>
                </div>
                <div className="text-xs sm:text-right text-muted-foreground space-y-1">
                  {phone && <p>📞 {phone}</p>}
                  {email && <p>✉️ {email}</p>}
                  {finPassport && <p>🪪 FIN/PP: {finPassport}</p>}
                  <p>📍 {address}</p>
                </div>
              </div>

              {/* Summary */}
              {summary && (
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand border-b border-border/80 pb-1">
                    Professional Summary
                  </h3>
                  <p className="text-xs leading-relaxed text-foreground/90">{summary}</p>
                </div>
              )}

              {/* Work Experience */}
              {experiences.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand border-b border-border/80 pb-1">
                    Work Experience in Singapore
                  </h3>
                  <div className="space-y-4">
                    {experiences.map((exp, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-xs font-bold text-foreground">
                            {exp.role || "Role"} — <span className="font-semibold text-muted-foreground">{exp.company || "Company"}</span>
                          </p>
                          <span className="text-[11px] font-medium text-muted-foreground">
                            {exp.years} {exp.location ? `(${exp.location})` : ""}
                          </span>
                        </div>
                        {exp.description && (
                          <p className="text-xs text-foreground/85 leading-relaxed pl-2 border-l-2 border-muted">
                            {exp.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills & Certifications */}
              {skills.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand border-b border-border/80 pb-1">
                    Skills & Safety Certifications
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {skills.map((s, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-xs text-foreground">
                        <span className="text-brand font-bold">✓</span>
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {educations.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand border-b border-border/80 pb-1">
                    Education & Background
                  </h3>
                  <div className="space-y-2">
                    {educations.map((edu, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <p className="font-semibold text-foreground">{edu.degree}</p>
                        <p className="text-muted-foreground">
                          {edu.institute} {edu.year ? `(${edu.year})` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer Note */}
              <div className="pt-4 border-t border-border text-[10px] text-muted-foreground text-center">
                Prepared via Nirapode Platform · Document Verification Available
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Alerts */}
      <div className="print:hidden mt-8 space-y-3 max-w-2xl mx-auto">
        {deductError && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-700 flex items-center justify-between gap-3">
            <span>{deductError}</span>
            {needDeposit && (
              <Link
                href="/dashboard/deposit"
                className="shrink-0 bg-red-600 hover:bg-red-700 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors"
              >
                Deposit Funds →
              </Link>
            )}
            {!user && (
              <Link
                href="/login"
                className="shrink-0 bg-red-600 hover:bg-red-700 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors"
              >
                Sign In →
              </Link>
            )}
          </div>
        )}

        {deductedSuccess && (
          <div className="rounded-xl bg-green-50 border border-green-200 p-3.5 text-xs text-green-700">
            {deductedSuccess}
          </div>
        )}
      </div>

      {/* Action buttons — below the form/preview so users review their CV first */}
      <div className="print:hidden mt-4 pt-6 border-t border-border flex flex-wrap items-center justify-center gap-2.5">
        <button
          type="button"
          onClick={handleDownloadCv}
          disabled={deducting}
          className="inline-flex items-center gap-2 bg-brand hover:bg-brand-dark text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-60"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          <span>{deducting ? "Processing Payment…" : "Download / Print PDF"}</span>
        </button>

        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5a] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-xs"
        >
          <span>Send CV to WhatsApp</span>
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
          </svg>
        </a>
      </div>
    </div>
  );
}
