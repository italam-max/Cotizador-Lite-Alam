// ARCHIVO: src/services/pdfMerge.tsx
// Fusiona la portada oficial (PDF estático) con las páginas dinámicas.
// La generación del blob de react-pdf la hace el componente llamante.

/**
 * Toma el blob generado por react-pdf (páginas 2-N),
 * lo fusiona con la portada oficial modificada con los datos reales,
 * y descarga el PDF final.
 */
export async function mergeAndDownload(
  contentBlob: Blob,
  folio: string,
  clientName: string,
  filename: string
): Promise<void> {
  const finalBlob = await mergePDFs(contentBlob, folio, clientName);
  const url = URL.createObjectURL(finalBlob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Misma lógica pero devuelve el Blob (para envío por email, etc.)
 */
export async function mergeToBlob(
  contentBlob: Blob,
  folio: string,
  clientName: string
): Promise<Blob> {
  return mergePDFs(contentBlob, folio, clientName);
}

// ── Lógica interna de fusión ──────────────────────────────────
async function mergePDFs(
  contentBlob: Blob,
  folio: string,
  clientName: string
): Promise<Blob> {
  const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');

  // 1. Cargar portada oficial
  const coverRes = await fetch('/pdf/portada-alamex.pdf');
  if (!coverRes.ok) throw new Error('No se encontró /pdf/portada-alamex.pdf en la carpeta public/pdf/');
  const coverBytes = await coverRes.arrayBuffer();
  const coverDoc   = await PDFDocument.load(coverBytes);
  const coverPage  = coverDoc.getPage(0);

  const pageH = coverPage.getHeight(); // 568 pts
  const font  = await coverDoc.embedFont(StandardFonts.Helvetica);
  const fontB = await coverDoc.embedFont(StandardFonts.HelveticaBold);
  const today = new Date().toLocaleDateString('es-MX', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  // Color de fondo de la zona "Propuesta xxx" en la portada → navy oscuro
  const navy = rgb(19/255, 45/255, 84/255);

  // 2. Borrar texto placeholder y escribir datos reales
  // "Propuesta xxxxxxxxxxx" está en y=460.3 (pdfplumber desde arriba)
  // pdf-lib mide desde abajo: y_pdflib = pageH - y_plumber - lineHeight

  // Línea 1 — folio
  coverPage.drawRectangle({ x: 13, y: pageH - 473, width: 310, height: 16, color: navy });
  coverPage.drawText(`Propuesta  ${folio}`, {
    x: 14, y: pageH - 470,
    size: 11, font, color: rgb(1, 1, 1),
  });

  // Línea 2 — cliente (dorado)
  coverPage.drawRectangle({ x: 13, y: pageH - 491, width: 310, height: 16, color: navy });
  coverPage.drawText(clientName.substring(0, 45), {
    x: 14, y: pageH - 488,
    size: 12, font: fontB, color: rgb(245/255, 197/255, 24/255),
  });

  // Línea 3 — fecha (gris claro)
  coverPage.drawRectangle({ x: 13, y: pageH - 505, width: 310, height: 13, color: navy });
  coverPage.drawText(`Ciudad de México a ${today}`, {
    x: 14, y: pageH - 503,
    size: 8, font, color: rgb(0.72, 0.72, 0.72),
  });

  const coverModBytes = await coverDoc.save();

  // 3. Fusionar portada + contenido
  const finalDoc     = await PDFDocument.create();
  const modCoverDoc  = await PDFDocument.load(coverModBytes);
  const contentBytes = await contentBlob.arrayBuffer();
  const contentDoc   = await PDFDocument.load(contentBytes);

  const [p0] = await finalDoc.copyPages(modCoverDoc, [0]);
  finalDoc.addPage(p0);

  const n = contentDoc.getPageCount();
  const pages = await finalDoc.copyPages(contentDoc, Array.from({ length: n }, (_, i) => i));
  pages.forEach(p => finalDoc.addPage(p));

  finalDoc.setTitle(`Propuesta ${folio} — ${clientName}`);
  finalDoc.setAuthor('Elevadores Alamex S.A. de C.V.');
  finalDoc.setCreator('Cotizador Alamex 2.0');

  const finalBytes = await finalDoc.save();
  return new Blob([finalBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}
