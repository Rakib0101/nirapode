"use client";

import { useState } from "react";
import { formatWhatsAppLink } from "@/lib/site-contact-types";

type FloatingWhatsAppProps = {
  whatsappNumber?: string;
  defaultMessage?: string;
};

export function FloatingWhatsApp({ whatsappNumber, defaultMessage }: FloatingWhatsAppProps) {
  const [isOpen, setIsOpen] = useState(false);
  const number = whatsappNumber || "+6581234567";
  const msg = defaultMessage || "Hello Nirapode support team, I need some assistance.";
  const link = formatWhatsAppLink(number, msg);

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="mb-3 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-border p-4 transition-all duration-200 animate-in fade-in slide-in-from-bottom-3">
          <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#25D366] text-white flex items-center justify-center font-bold text-lg shadow-sm">
                💬
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Nirapode Support</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[11px] text-muted-foreground">Official WhatsApp Support</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground hover:text-foreground text-xs p-1 rounded-md cursor-pointer"
            >
              ✕
            </button>
          </div>

          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            Need help or have questions? Chat directly with our official support team on WhatsApp.
          </p>

          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5a] text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition-colors shadow-xs"
          >
            <span>Start WhatsApp Chat</span>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.969.587 1.771.889 2.796.89h.005c3.182 0 5.768-2.587 5.768-5.766.001-3.18-2.585-5.767-5.768-5.767zm7.579 5.766c-.002 4.181-3.402 7.581-7.584 7.581-1.302 0-2.529-.333-3.606-.915l-4.004 1.05 1.069-3.907c-.663-1.121-1.043-2.43-1.043-3.809.002-4.182 3.403-7.581 7.584-7.581 4.181 0 7.584 3.399 7.584 7.581z" />
            </svg>
          </a>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Open WhatsApp Chat"
        className="group relative flex items-center justify-center w-13 h-13 rounded-full bg-[#25D366] text-white shadow-xl hover:bg-[#1ebe5a] hover:scale-105 transition-all duration-200 cursor-pointer"
      >
        <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
        </svg>
      </button>
    </div>
  );
}
