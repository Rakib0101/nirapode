"use client";

import { useActionState, useRef, useState } from "react";
import { saveShare4ClosedDatesAction } from "@/app/actions/admin-settings";

const WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

export function Share4ClosedDatesForm({
  closedWeekdays,
  closedDates,
}: {
  closedWeekdays: number[];
  closedDates: string[];
}) {
  const [state, action, pending] = useActionState(saveShare4ClosedDatesAction, null);
  const [weekdays, setWeekdays] = useState<number[]>(closedWeekdays);
  const [dates, setDates] = useState<string[]>(closedDates);
  const [dateInput, setDateInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function toggleWeekday(value: number) {
    setWeekdays((prev) => (prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value].sort()));
  }

  function addDate() {
    if (!dateInput || dates.includes(dateInput)) return;
    setDates((prev) => [...prev, dateInput].sort());
    setDateInput("");
    inputRef.current?.focus();
  }

  function removeDate(d: string) {
    setDates((prev) => prev.filter((x) => x !== d));
  }

  function handleSubmit(formData: FormData) {
    weekdays.forEach((d) => formData.append("closedWeekdays", String(d)));
    formData.set("closedDates", JSON.stringify(dates));
    action(formData);
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Block the Share 4 preferred-date picker on recurring weekdays (e.g. every Sat/Sun) and/or specific one-off dates (public holidays).
      </p>

      <div>
        <p className="text-xs font-medium text-foreground mb-1.5">Closed weekdays</p>
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAYS.map((w) => {
            const active = weekdays.includes(w.value);
            return (
              <button
                key={w.value}
                type="button"
                onClick={() => toggleWeekday(w.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  active
                    ? "bg-brand text-white border-brand"
                    : "bg-white text-foreground border-border hover:border-brand"
                }`}
              >
                {w.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-foreground mb-1.5">Closed one-off dates (public holidays)</p>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          />
          <button
            type="button"
            onClick={addDate}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-brand text-white hover:bg-brand-dark transition-colors text-lg font-bold shrink-0"
          >
            +
          </button>
        </div>

        {dates.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {dates.map((d) => (
              <span key={d} className="inline-flex items-center gap-1.5 text-xs font-semibold bg-brand-50 border border-brand/30 text-brand px-2.5 py-1.5 rounded-lg">
                {new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })}
                <button type="button" onClick={() => removeDate(d)} className="text-brand/60 hover:text-red-500 leading-none transition-colors">
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2.5 rounded-lg">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 px-4 py-2.5 rounded-lg">
          Closed dates saved successfully.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-brand text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-brand/90 transition-colors disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save Closed Dates"}
      </button>
    </form>
  );
}
