// ARCHIVO: src/services/emailService.ts
// Servicio de correo via Zoho OAuth + Supabase Edge Function

import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export interface EmailPayload {
  to:               string;
  subject:          string;
  bodyHtml:         string;
  attachmentBase64?: string;   // PDF en base64 (opcional)
  attachmentName?:  string;
}

/** Enviar correo usando la cuenta Zoho del vendedor autenticado */
export async function sendEmail(payload: EmailPayload): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sin sesión activa');

  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || 'Error enviando correo');
}

/** Construir el HTML del correo de cotización */
export function buildQuoteEmailHTML(params: {
  clientName:  string;
  folio:       string;
  model:       string;
  total:       string;
  sellerName:  string;
  sellerTitle: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; color: #1a1a1a; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(90deg, #051338, #0A2463); padding: 28px 32px; border-bottom: 3px solid #D4AF37;">
    <h1 style="color: white; font-size: 22px; margin: 0; font-weight: 900; letter-spacing: 1px;">ALAMEX</h1>
    <p style="color: #D4AF37; font-size: 11px; margin: 4px 0 0; letter-spacing: 2px; text-transform: uppercase;">Ascending Together</p>
  </div>

  <div style="padding: 32px;">
    <p style="font-size: 15px; color: #0A2463;">Estimado/a <strong>${params.clientName}</strong>,</p>
    <p style="color: #444; line-height: 1.6;">
      Adjunto encontrará la propuesta económica <strong>${params.folio}</strong> para el suministro e instalación 
      del sistema de elevación <strong>${params.model}</strong> que solicitó.
    </p>

    <div style="background: #0A2463; border-radius: 12px; padding: 20px 24px; margin: 24px 0; text-align: center;">
      <p style="color: #D4AF37; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px;">Inversión total</p>
      <p style="color: #D4AF37; font-size: 28px; font-weight: 900; margin: 0;">${params.total}</p>
      <p style="color: rgba(255,255,255,0.4); font-size: 11px; margin: 4px 0 0;">+ IVA (16%)</p>
    </div>

    <p style="color: #444; line-height: 1.6;">
      El documento adjunto contiene todas las especificaciones técnicas, condiciones comerciales y formas de pago.
      Quedamos a sus órdenes para cualquier aclaración.
    </p>

    <div style="border-top: 1px solid #e2e8f0; margin-top: 32px; padding-top: 20px;">
      <p style="margin: 0; font-weight: bold; color: #0A2463; font-size: 14px;">${params.sellerName}</p>
      <p style="margin: 4px 0 0; color: #64748b; font-size: 12px;">${params.sellerTitle}</p>
      <p style="margin: 4px 0 0; color: #64748b; font-size: 12px;">Elevadores Alamex S.A. de C.V.</p>
      <p style="margin: 4px 0 0; color: #64748b; font-size: 12px;">+5255 5532 2739 · info@alam.mx · <a href="https://alam.mx" style="color: #D4AF37;">www.alam.mx</a></p>
    </div>
  </div>

  <div style="background: #f8fafc; padding: 16px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
    <p style="color: #94a3b8; font-size: 11px; margin: 0;">© ${new Date().getFullYear()} Elevadores Alamex S.A. de C.V. · Ciudad de México</p>
  </div>
</body>
</html>`;
}
