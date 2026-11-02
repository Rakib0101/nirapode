import { getSiteContactSettings } from "./site-contact";

export interface EmailLayoutOptions {
  title?: string;
  badge?: string;
  bodyHtml: string;
  preheader?: string;
  actionUrl?: string;
  actionText?: string;
}

/**
 * Brand-consistent responsive email layout for Nirapode
 * Features:
 * - Brand Navy & Indigo Header with Nirapode Logo/Wordmark
 * - Clean Card Container with Emerald / Indigo accents
 * - Responsive Mobile-friendly typography
 * - Dynamic Footer with live contact info (Email, Hotline, WhatsApp)
 * - Anti-spam compliance and legal footer
 */
export async function renderBrandEmail(opts: EmailLayoutOptions): Promise<string> {
  const contact = await getSiteContactSettings().catch(() => null);
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://nirapode.com").replace(/\/+$/, "");
  const logoUrl = `${baseUrl}/logo-dark.png`;

  const supportEmail = contact?.supportEmail || "support@nirapode.com";
  const supportPhone = contact?.supportPhone || "+65 8123 4567";
  const whatsappNumber = contact?.whatsappNumber || "+65 8123 4567";
  const year = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${opts.title ? `${opts.title} - Nirapode` : "Nirapode"}</title>
  <style>
    /* Reset */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; display: block; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .mobile-p-20 { padding: 24px 18px !important; }
      .mobile-header { padding: 24px 18px !important; }
      .mobile-footer { padding: 24px 18px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9;">
  ${
    opts.preheader
      ? `<div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all;">${opts.preheader}</div>`
      : ""
  }
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 32px 12px;">
        <!-- Email Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06); border: 1px solid #e2e8f0;" class="email-container">
          
          <!-- Header: Brand Deep Navy with Logo -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%); background-color: #1e1b4b; padding: 32px 36px 28px;" class="mobile-header">
              <a href="${baseUrl}" target="_blank" style="text-decoration: none; display: inline-block;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center">
                      <img src="${logoUrl}" alt="Nirapode" width="168" height="42" style="max-width: 168px; height: auto; display: block; border: 0;" />
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-top: 8px;">
                      <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #a5b4fc; font-weight: 600;">
                        Community · Market · Exchange
                      </span>
                    </td>
                  </tr>
                </table>
              </a>
              ${
                opts.badge
                  ? `
                  <div style="margin-top: 14px;">
                    <span style="display: inline-block; padding: 4px 12px; background-color: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 9999px; font-size: 11px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.8px;">
                      ${opts.badge}
                    </span>
                  </div>
                  `
                  : ""
              }
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 36px 36px 32px;" class="mobile-p-20">
              ${
                opts.title
                  ? `<h1 style="margin: 0 0 18px; font-size: 20px; font-weight: 700; color: #0f172a; line-height: 1.35; letter-spacing: -0.3px;">${opts.title}</h1>`
                  : ""
              }
              <div style="font-size: 14px; line-height: 1.65; color: #334155;">
                ${opts.bodyHtml}
              </div>

              ${
                opts.actionUrl && opts.actionText
                  ? `
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0 10px;">
                    <tr>
                      <td align="center" style="border-radius: 12px; background-color: #4f46e5;">
                        <a href="${opts.actionUrl}" target="_blank" style="display: inline-block; padding: 13px 28px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 12px; background-color: #4f46e5; border: 1px solid #4338ca; box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);">
                          ${opts.actionText} &rarr;
                        </a>
                      </td>
                    </tr>
                  </table>
                  `
                  : ""
              }
            </td>
          </tr>

          <!-- Footer: Brand Contact Information & Links -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 28px 36px;" class="mobile-footer">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <p style="margin: 0 0 8px; font-size: 12px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
                      Need Help? Nirapode Support Team
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.8;">
                      📧 Email: <a href="mailto:${supportEmail}" style="color: #4f46e5; text-decoration: none; font-weight: 600;">${supportEmail}</a>
                      <span style="color: #cbd5e1; margin: 0 6px;">&bull;</span>
                      💬 WhatsApp: <a href="https://wa.me/${whatsappNumber.replace(/\D/g, "")}" style="color: #10b981; text-decoration: none; font-weight: 600;">${whatsappNumber}</a>
                    </p>
                    <p style="margin: 2px 0 0; font-size: 12px; color: #64748b;">
                      📞 Hotline: <span style="color: #334155; font-weight: 600;">${supportPhone}</span>
                    </p>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="border-top: 1px dashed #cbd5e1; padding-top: 14px;">
                    <p style="margin: 0 0 6px; font-size: 11px; color: #94a3b8;">
                      &copy; ${year} Nirapode Platform. All rights reserved.
                    </p>
                    <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                      <a href="${baseUrl}/privacy" style="color: #64748b; text-decoration: underline; margin-right: 12px;">Privacy Policy</a>
                      <a href="${baseUrl}/terms" style="color: #64748b; text-decoration: underline; margin-right: 12px;">Terms of Service</a>
                      <a href="${baseUrl}/contact" style="color: #64748b; text-decoration: underline;">Contact Support</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
