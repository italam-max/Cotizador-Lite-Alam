// ARCHIVO: src/services/pdfMerge.tsx

export async function mergeAndDownload(
  contentBlob: Blob,
  folio: string,
  clientName: string,
  filename: string,
  installationCity?: string | null
): Promise<void> {
  const finalBlob = await mergePDFs(contentBlob, folio, clientName, installationCity);
  const url = URL.createObjectURL(finalBlob);
  const a   = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export async function mergeToBlob(
  contentBlob: Blob, folio: string, clientName: string, installationCity?: string | null
): Promise<Blob> {
  return mergePDFs(contentBlob, folio, clientName, installationCity);
}

async function mergePDFs(contentBlob: Blob, folio: string, clientName: string, installationCity?: string | null): Promise<Blob> {
  const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');

  const coverRes = await fetch('/pdf/portada-alamex.pdf');
  if (!coverRes.ok) throw new Error('No se encontró /pdf/portada-alamex.pdf');
  const coverBytes = await coverRes.arrayBuffer();
  const coverDoc   = await PDFDocument.load(coverBytes);
  const coverPage  = coverDoc.getPage(0);

  const pageH = coverPage.getHeight(); // 568.0 pts
  const font  = await coverDoc.embedFont(StandardFonts.Helvetica);
  const fontB = await coverDoc.embedFont(StandardFonts.HelveticaBold);
  const today = new Date().toLocaleDateString('es-MX', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  // Color navy exacto de la banda inferior de la portada
  // Medido del PDF: la zona de texto va de top=430 a top=530 (pdfplumber)
  // En pdf-lib (desde abajo): y = pageH - pdfplumber_bottom
  // "Propuesta xxx": top=460.3, bottom=471.3
  // Banda navy visible: de pdfplumber y≈430 a y≈530 → pdf-lib y≈38 a y≈138
  const navy = rgb(13/255, 30/255, 65/255); // #0D1E41 — navy oscuro de la portada

  // Cubrir la banda navy donde va el texto de folio/cliente.
  // Subido 25 pts respecto al layout anterior para no tapar la sección
  // "OFICINAS CDMX / OFICINAS GDL" que queda justo debajo de la banda.
  coverPage.drawRectangle({
    x: 0,
    y: pageH - 505,  // era pageH - 530; subido 25 pts
    width: 340,
    height: 100,
    color: navy,
  });

  // Línea 1 — "Propuesta FOLIO"
  coverPage.drawText(`Propuesta  ${folio}`, {
    x: 14,
    y: pageH - 446,  // era pageH - 471; subido 25 pts
    size: 11, font, color: rgb(1, 1, 1),
  });

  // Línea 2 — nombre del cliente (dorado, más grande)
  coverPage.drawText(clientName.substring(0, 45), {
    x: 14,
    y: pageH - 465,  // era pageH - 490; subido 25 pts
    size: 13, font: fontB, color: rgb(245/255, 197/255, 24/255),
  });

  // Línea 3 — ciudad + fecha (gris claro)
  const cityLabel = (installationCity && installationCity.trim()) ? installationCity.trim() : 'Ciudad de México';
  coverPage.drawText(`${cityLabel} a ${today}`, {
    x: 14,
    y: pageH - 482,  // era pageH - 507; subido 25 pts
    size: 8, font, color: rgb(0.75, 0.75, 0.75),
  });

  const coverModBytes = await coverDoc.save();

  // Fusionar portada + contenido
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
