// ARCHIVO: src/features/pdf/QuotePDF.tsx
// PDF — fuente Plus Jakarta Sans, tamaños aumentados ~1.5-2pt

import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type { Quote } from '../../types';
import { generateFloorNomenclature, autoRails } from '../../data/engineRules';

// Fuentes: Helvetica estándar (siempre disponible en @react-pdf).
// Para usar Plus Jakarta Sans en el PDF, descarga los .ttf desde Google Fonts,
// colócalos en /public/fonts/ y registra con Font.register({ family:'PJSans', src:'/fonts/PlusJakartaSans-Regular.ttf' }).
const PJSans     = 'Helvetica';
const PJSansBold = 'Helvetica-Bold';

// ── PALETA ───────────────────────────────────────────────────
const NAVY  = '#1B3A6B';
const GOLD  = '#F5C518';
const WHITE = '#FFFFFF';
const GRAY  = '#555555';
const LGRAY = '#F5F5F5';
const BLK   = '#1A1A1A';

// ── IMAGEN POR MODELO ────────────────────────────────────────
const ELEVATOR_PATHS: Record<string, string> = {
  'MRL-G':     '/pdf/elevator-mrl-g.png',
  'MRL-L':     '/pdf/elevator-mrl-l.png',
  'MR':        '/pdf/elevator-mr.png',
  'HYD':       '/pdf/elevator-hyd.png',
  'Home Lift': '/pdf/elevator-hyd.png',
};
const elevatorImage = (model: string): string =>
  ELEVATOR_PATHS[model] || '/pdf/elevator-mr.png';

const MODEL_LABELS: Record<string, string> = {
  'MR':        'Con Cuarto de Máquinas (MR)',
  'MRL-L':     'Sin Cuarto de Máquinas — Chasis L (MRL-L)',
  'MRL-G':     'Sin Cuarto de Máquinas — Chasis G (MRL-G)',
  'HYD':       'Hidráulico (HyD)',
  'Home Lift': 'Home Lift Residencial',
};

// ── SEGURIDADES ADICIONALES ──────────────────────────────────
export const TODAS_SEGURIDADES = [
  'Sistema de paracaídas',
  'Sensor de carga (báscula de sobrecarga)',
  'Sensor de velocidad',
];

// ── ESTILOS ──────────────────────────────────────────────────
const S = StyleSheet.create({
  page:     { backgroundColor: WHITE, padding: 0, fontFamily: PJSans },
  stripTop:  { position: 'absolute', top: 0, left: 0,   width: 55,  height: 8, backgroundColor: GOLD },
  stripTop2: { position: 'absolute', top: 0, left: 55,  width: 120, height: 8, backgroundColor: NAVY },
  stripBot:  { position: 'absolute', bottom: 0, left: 0,   width: 160, height: 8, backgroundColor: GOLD },
  stripBot2: { position: 'absolute', bottom: 0, left: 160, width: 80,  height: 8, backgroundColor: NAVY },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 30, paddingVertical: 13,
    backgroundColor: WHITE, borderBottomWidth: 3, borderBottomColor: GOLD,
  },
  headerRight: { alignItems: 'flex-end' },
  headerTitle: { fontSize: 9.5, color: NAVY, fontFamily: PJSansBold, letterSpacing: 0.3 },
  headerSub:   { fontSize: 8.5, color: GRAY, marginTop: 1.5 },

  body: { paddingHorizontal: 30, paddingTop: 14, paddingBottom: 52 },

  secTitle: {
    fontSize: 12, fontFamily: PJSansBold, color: NAVY,
    marginBottom: 7, marginTop: 12,
    paddingBottom: 4, borderBottomWidth: 1.5, borderBottomColor: GOLD,
  },
  secNum: { fontSize: 11.5, fontFamily: PJSansBold, color: NAVY, marginBottom: 5, marginTop: 7 },

  tblHeader: { flexDirection: 'row', backgroundColor: NAVY, minHeight: 26, alignItems: 'center' },
  tblHCell:  { flex: 1, paddingHorizontal: 9, paddingVertical: 5, fontSize: 10, fontFamily: PJSansBold, color: WHITE },
  tblRow:    { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E0E0E0', minHeight: 22, alignItems: 'center' },
  tblAlt:    { backgroundColor: LGRAY },
  tblCell:   { flex: 1, paddingHorizontal: 9, paddingVertical: 5, fontSize: 10, color: BLK },
  tblBold:   { flex: 1, paddingHorizontal: 9, paddingVertical: 5, fontSize: 10, fontFamily: PJSansBold, color: BLK },

  specRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#EBEBEB', minHeight: 19, alignItems: 'center' },
  specKey: { width: '42%', paddingHorizontal: 8, paddingVertical: 3, fontSize: 9.5, fontFamily: PJSansBold, color: NAVY, borderRightWidth: 1, borderRightColor: '#EBEBEB' },
  specVal: { flex: 1, paddingHorizontal: 8, paddingVertical: 3, fontSize: 9.5, color: BLK },

  infoBox:     { padding: 8, borderRadius: 4, marginBottom: 7, backgroundColor: '#EBF0FB', borderLeftWidth: 3, borderLeftColor: NAVY },
  infoBoxGold: { padding: 8, borderRadius: 4, marginBottom: 7, backgroundColor: '#FFFBEB', borderLeftWidth: 3, borderLeftColor: GOLD },
  infoTitle:   { fontSize: 10, fontFamily: PJSansBold, color: NAVY, marginBottom: 4 },
  infoText:    { fontSize: 9.5, color: BLK, lineHeight: 1.6 },

  bulletRow:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  bulletDot:  { width: 4, height: 4, borderRadius: 2, backgroundColor: GOLD, marginTop: 4, marginRight: 6, flexShrink: 0 },
  bulletText: { fontSize: 9.5, color: BLK, flex: 1, lineHeight: 1.6 },

  para: { fontSize: 10, color: BLK, lineHeight: 1.6, marginBottom: 6 },

  cols: { flexDirection: 'row', gap: 14, marginBottom: 6 },
  col:  { flex: 1 },

  condTable: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 4, overflow: 'hidden', marginBottom: 9 },
  condHead:  { flexDirection: 'row', backgroundColor: NAVY, minHeight: 24, alignItems: 'center' },
  condHCell: { flex: 1, paddingHorizontal: 9, paddingVertical: 5, fontSize: 9.5, fontFamily: PJSansBold, color: WHITE },
  condRow:   { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E0E0E0', minHeight: 20, alignItems: 'flex-start' },
  condCell:  { flex: 1, paddingHorizontal: 9, paddingVertical: 4, fontSize: 9, color: BLK, lineHeight: 1.5 },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 32,
    backgroundColor: NAVY, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 24,
  },
  footerTxt:  { fontSize: 8.5, color: 'rgba(255,255,255,0.65)' },
  footerGold: { fontSize: 8.5, color: GOLD, fontFamily: PJSansBold },
});

// ── HELPERS ──────────────────────────────────────────────────
const v = (val: any, fb = '—') =>
  (val !== undefined && val !== null && String(val).trim() !== '') ? String(val) : fb;

const Spec = ({ label, value, alt }: { label: string; value?: any; alt?: boolean }) => (
  <View style={[S.specRow, alt ? { backgroundColor: LGRAY } : {}]}>
    <Text style={S.specKey}>{label}</Text>
    <Text style={S.specVal}>{v(value)}</Text>
  </View>
);

const Bullet = ({ text }: { text: string }) => (
  <View style={S.bulletRow}>
    <View style={S.bulletDot} />
    <Text style={S.bulletText}>{text}</Text>
  </View>
);

const IHeader = ({ folio, client, page }: { folio: string; client: string; page: number }) => (
  <View style={S.header}>
    <View>
      <Text style={{ fontSize: 16, fontFamily: PJSansBold, color: NAVY, letterSpacing: 0.3 }}>ALAMEX</Text>
      <Text style={{ fontSize: 9, color: GRAY, letterSpacing: 0.2 }}>Elevadores</Text>
    </View>
    <View style={S.headerRight}>
      <Text style={S.headerTitle}>Elevadores Alamex · www.alam.mx</Text>
      <Text style={S.headerSub}>Ref: {folio}  ·  {client}  ·  Pág. {page}</Text>
    </View>
  </View>
);

const IFooter = ({ seller, title }: { seller: string; title: string }) => (
  <View style={S.footer}>
    <Text style={S.footerTxt}>Elevadores Alamex S.A. de C.V.  ·  +5255 5532 2739  ·  info@alam.mx</Text>
    <Text style={S.footerGold}>{seller}  ·  {title}</Text>
    <Text style={S.footerTxt}>www.alam.mx</Text>
  </View>
);

// ── DOCUMENTO ────────────────────────────────────────────────
interface Props {
  quote:        Quote;
  seller?:      string;
  sellerTitle?: string;
  cabinImage?:  string;
  wallImg?:     string;
  floorImg?:    string;
  plafonImg?:   string;
}

export function QuotePDFDocument({
  quote: q,
  seller = 'Ejecutivo de Ventas',
  sellerTitle = 'Ventas',
  cabinImage,
  wallImg,
  floorImg,
  plafonImg,
}: Props) {
  const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
  const quoteDate = q.project_date
    ? new Date(q.project_date + 'T12:00:00').toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

  const isMR  = q.model === 'MR';
  const isHyd = q.model === 'HYD' || q.model === 'Home Lift';

  const isPricePerSystem = q.system_type && q.system_type !== 'Simplex';
  const elevatorTotal    = isPricePerSystem ? (q.price || 0) : (q.price || 0) * q.quantity;
  const laborTotal       = q.labor_price || 0;
  const total            = elevatorTotal + laborTotal;
  const iva              = total * 0.16;
  const totalConIVA      = total * 1.16;
  const machineRoom      = isMR ? 'Con Cuarto de Máquinas' : isHyd ? 'N/A (Hidráulico)' : 'Sin Cuarto de Máquinas';
  const modelLabel       = MODEL_LABELS[q.model] || q.model;
  const groupLabel       = q.system_type || (q.quantity > 1
    ? (q.quantity === 2 ? 'Duplex' : q.quantity === 3 ? 'Triplex' : `Grupo ${q.quantity}`)
    : 'Simplex');

  const terms = q.commercial_terms || {
    paymentMethod:      '50% Anticipo a la firma del Contrato\n25% Al aviso de embarque\n20% Al aviso de entrega del equipo en obra\n05% Al aviso de entrega en funcionamiento',
    paymentMethodLabor: '50% A la firma de contrato\n25% Al aviso de inicio de instalación\n20% Al termino del montaje\n05% Al aviso de entrega funcionando',
    deliveryTime:       'A confirmar tras anticipo',
    warranty:           '12 meses en partes y mano de obra',
    validity:           '30 días naturales',
    generalConditions:  'Obra civil por cuenta del cliente.',
  };

  const opts = q.pdf_options ?? {};
  const seguridadesActivas: string[] = opts.seguridades ?? TODAS_SEGURIDADES;

  return (
    <Document title={`Propuesta ${q.folio} — ${q.client_name}`} author="Elevadores Alamex">

      {/* ══ PÁG 2 — COTIZACIÓN ══ */}
      <Page size="LETTER" style={S.page}>
        <View style={S.stripTop} /><View style={S.stripTop2} />
        <IHeader folio={q.folio} client={q.client_name} page={2} />

        <View style={S.body}>
          <Text style={{ fontSize: 11.5, color: NAVY, fontFamily: PJSansBold, marginBottom: 5 }}>
            Estimado/a {q.client_name}
          </Text>
          <Text style={S.para}>
            Atendiendo su solicitud para cotizar {q.quantity} Elevador{q.quantity > 1 ? 'es' : ''} de{' '}
            <Text style={{ fontFamily: PJSansBold }}>{(q.use_type || 'PASAJEROS').toUpperCase()}</Text>,
            y tomando como base la información suministrada, hacemos llegar la propuesta económica
            para el suministro e instalación del (los) equipo(s) con las características descritas.
          </Text>

          {/* Referencia */}
          <View style={{ flexDirection: 'row', gap: 18, marginBottom: 12, flexWrap: 'wrap' }}>
            {[
              { label: 'Referencia:',          value: q.folio },
              { label: 'Fecha:',               value: quoteDate },
              ...(q.client_email    ? [{ label: 'Contacto:', value: q.client_email }] : []),
              ...(q.installation_city ? [{ label: 'Lugar de instalación:', value: q.installation_city }] : []),
            ].map(({ label, value }) => (
              <View key={label} style={{ flexDirection: 'row', gap: 4 }}>
                <Text style={{ fontSize: 10, fontFamily: PJSansBold, color: NAVY }}>{label}</Text>
                <Text style={{ fontSize: 10, color: BLK }}>{value}</Text>
              </View>
            ))}
          </View>

          <Text style={S.secNum}>1.  COTIZACIÓN DE PROYECTO</Text>

          {/* Tabla de precio */}
          <View style={{ borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 4, overflow: 'hidden', marginBottom: 9 }}>
            <View style={S.tblHeader}>
              <Text style={[S.tblHCell, { flex: 3 }]}>Descripción</Text>
              <Text style={[S.tblHCell, { textAlign: 'right' }]}>Importe</Text>
            </View>

            {/* Fila equipos */}
            <View style={[S.tblRow, { alignItems: 'flex-start', paddingVertical: 7 }]}>
              <View style={[S.tblCell, { flex: 3 }]}>
                <Text style={{ fontSize: 10.5, fontFamily: PJSansBold, color: BLK }}>
                  {isPricePerSystem
                    ? `Sistema ${q.system_type} — ${q.quantity} Elevador${q.quantity > 1 ? 'es' : ''} de ${(q.use_type || 'Pasajeros').toUpperCase()} ${q.model}`
                    : `${q.quantity} Elevador${q.quantity > 1 ? 'es' : ''} de ${(q.use_type || 'Pasajeros').toUpperCase()} ${q.model}`
                  }{' — '}{q.stops} niveles / {q.capacity} Kg / {q.persons} personas
                  {q.cabin_floor  ? ` / Piso ${q.cabin_floor}`   : ''}
                  {q.cabin_finish ? ` / Cabina ${q.cabin_finish}` : ''}
                  {q.door_type    ? ` / Puertas ${q.door_type}`   : ''}
                </Text>
              </View>
              <Text style={[S.tblBold, { textAlign: 'right' }]}>{fmt.format(elevatorTotal)} {q.currency || 'MXN'}</Text>
            </View>

            {/* Mano de obra */}
            {laborTotal > 0 && (
              <View style={[S.tblRow, S.tblAlt, { alignItems: 'flex-start', paddingVertical: 6 }]}>
                <View style={[S.tblCell, { flex: 3 }]}>
                  <Text style={{ fontSize: 10.5, fontFamily: PJSansBold, color: BLK, marginBottom: 1 }}>
                    Mano de Obra
                  </Text>
                  <Text style={{ fontSize: 9, color: GRAY }}>
                    Instalación y puesta en marcha por personal técnico especializado
                  </Text>
                </View>
                <Text style={[S.tblBold, { textAlign: 'right' }]}>{fmt.format(laborTotal)} {q.currency || 'MXN'}</Text>
              </View>
            )}

            {/* IVA */}
            <View style={[S.tblRow, laborTotal > 0 ? {} : S.tblAlt]}>
              <Text style={[S.tblCell, { flex: 3 }]}>IVA (16%)</Text>
              <Text style={[S.tblBold, { textAlign: 'right' }]}>{fmt.format(iva)} {q.currency || 'MXN'}</Text>
            </View>

            {/* Total */}
            <View style={[S.tblRow, { backgroundColor: NAVY }]}>
              <Text style={[S.tblBold, { flex: 3, color: WHITE }]}>Total Con IVA</Text>
              <Text style={[S.tblBold, { textAlign: 'right', color: GOLD, fontSize: 12 }]}>
                {fmt.format(totalConIVA)} {q.currency || 'MXN'}
              </Text>
            </View>
          </View>

          <View style={S.infoBoxGold}>
            <Text style={S.infoText}>
              * El transporte, instalación y puesta en marcha están incluidos en la propuesta.{'\n'}
              * Precios en {q.currency || 'MXN'}. Sujetos a variación en tipo de cambio si aplica.
            </Text>
          </View>

          {/* Resumen del proyecto */}
          <Text style={[S.secNum, { marginTop: 13 }]}>2.  RESUMEN DEL PROYECTO</Text>
          <View style={{ borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 4, overflow: 'hidden' }}>
            <View style={{ backgroundColor: NAVY, paddingHorizontal: 10, paddingVertical: 7 }}>
              <Text style={{ fontSize: 10, fontFamily: PJSansBold, color: WHITE }}>DATOS DEL PROYECTO</Text>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1, borderRightWidth: 1, borderRightColor: '#E0E0E0' }}>
                <View style={S.specRow}>
                  <Text style={[S.specKey, { fontSize: 9.5 }]}>Cliente</Text>
                  <Text style={[S.specVal, { fontSize: 9.5, fontFamily: PJSansBold }]}>{q.client_name}</Text>
                </View>
                {q.installation_city ? (
                  <View style={[S.specRow, { backgroundColor: LGRAY }]}>
                    <Text style={[S.specKey, { fontSize: 9.5 }]}>Lugar de instalación</Text>
                    <Text style={[S.specVal, { fontSize: 9.5 }]}>{q.installation_city}</Text>
                  </View>
                ) : null}
                <View style={[S.specRow, q.installation_city ? {} : { backgroundColor: LGRAY }]}>
                  <Text style={[S.specKey, { fontSize: 9.5 }]}>Referencia</Text>
                  <Text style={[S.specVal, { fontSize: 9.5 }]}>{q.folio}</Text>
                </View>
                <View style={[S.specRow, q.installation_city ? { backgroundColor: LGRAY } : {}]}>
                  <Text style={[S.specKey, { fontSize: 9.5 }]}>Tipo de sistema</Text>
                  <Text style={[S.specVal, { fontSize: 9.5 }]}>{groupLabel}</Text>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <View style={S.specRow}>
                  <Text style={[S.specKey, { fontSize: 9.5 }]}>Tiempo de entrega</Text>
                  <Text style={[S.specVal, { fontSize: 9.5 }]}>{terms.deliveryTime}</Text>
                </View>
                <View style={[S.specRow, { backgroundColor: LGRAY }]}>
                  <Text style={[S.specKey, { fontSize: 9.5 }]}>Garantía</Text>
                  <Text style={[S.specVal, { fontSize: 9.5 }]}>{terms.warranty}</Text>
                </View>
                <View style={S.specRow}>
                  <Text style={[S.specKey, { fontSize: 9.5 }]}>Validez de la propuesta</Text>
                  <Text style={[S.specVal, { fontSize: 9.5 }]}>{terms.validity || '30 días naturales'}</Text>
                </View>
                {isPricePerSystem && (
                  <View style={[S.specRow, { backgroundColor: LGRAY }]}>
                    <Text style={[S.specKey, { fontSize: 9.5 }]}>Precio del sistema</Text>
                    <Text style={[S.specVal, { fontSize: 9.5, color: NAVY, fontFamily: PJSansBold }]}>Cotizado por sistema completo</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        <View style={S.stripBot} /><View style={S.stripBot2} />
        <IFooter seller={seller} title={sellerTitle} />
      </Page>

      {/* ══ PÁG 3 — ESPECIFICACIONES TÉCNICAS ══ */}
      <Page size="LETTER" style={S.page}>
        <View style={S.stripTop} /><View style={S.stripTop2} />
        <IHeader folio={q.folio} client={q.client_name} page={3} />

        <View style={S.body}>
          <Text style={S.secTitle}>ESPECIFICACIONES TÉCNICAS DEL SISTEMA DE ELEVACIÓN</Text>
          <View style={{ flexDirection: 'row', gap: 14 }}>

            <View style={{ flex: 1 }}>
              <View style={{ borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 4, overflow: 'hidden' }}>
                <Spec label="TIPO"                   value={q.model} />
                <Spec label="CAPACIDAD"              value={`${q.capacity} Kg / ${q.persons} Pasajeros`} alt />
                <Spec label="NÚMERO DE PARADAS"      value={q.stops} />
                <Spec label="ENTRADAS DE PUERTAS"    value={q.door_side && q.door_side !== 'N/A' ? `${q.stops} — Apertura ${q.door_side}` : `${q.stops} al frente`} alt />
                <Spec label="RECORRIDO"              value={`${q.travel || 0} mm`} />
                <Spec label="CUBO (Frente × Fondo)"  value={`${q.shaft_width} mm × ${q.shaft_depth} mm`} alt />
                {(!q.model.includes('MRL') && !isHyd) && (
                  <>
                    <Spec label="FOSO"      value={`${q.pit} mm`} />
                    <Spec label="SOBREPASO" value={`${q.overhead} mm`} alt />
                  </>
                )}
                <Spec label="VELOCIDAD"              value={`${q.speed} m/seg`} />
                <Spec label="MÁQUINA"                value={machineRoom} alt />
                <Spec label="RIELES CABINA"          value={q.shaft_type ? q.shaft_type.split('/')[0]?.trim() : autoRails(q.model).cabin} />
                <Spec label="RIELES CONTRAPESO"      value={q.shaft_type ? q.shaft_type.split('/')[1]?.trim() : autoRails(q.model).counterweight} alt />
                <Spec label="CONTROL"                value="ALAMEX 220V / 14A" />
                <Spec label="PANEL CABINA (COP)"     value={q.control_group || 'Punto Matriz'} alt />
                <Spec label="PANEL PISO (LOP)"       value={q.control_group || 'Punto Matriz'} />
                <Spec label="TIPO DE GRUPO"          value={groupLabel} alt />
                <Spec label="NOMENCLATURA"           value={q.traction || generateFloorNomenclature(q.stops)} />
                <Spec label="ACABADO DE CABINA"      value={q.cabin_finish} alt />
                <Spec label="PISO DE CABINA"         value={q.cabin_floor} />
                <Spec label="PLAFÓN / COP"           value={q.cop_model} alt />
                {(() => {
                  try {
                    const ex: string[] = JSON.parse(q.cabin_model || '[]');
                    if (Array.isArray(ex) && ex.length > 0) {
                      const EL: Record<string, string> = {
                        'espejo-trasero':     'Espejo fondo',
                        'pasamanos-redondo':  'Pasam. redondo',
                        'pasamanos-cuadrado': 'Pasam. cuadrado',
                      };
                      const panPos = ['izquierdo','derecho','fondo'].filter(p => ex.includes(`panoramico-${p}`));
                      const panLabel = panPos.length === 3
                        ? 'Cabina panorámica completa'
                        : panPos.length > 0
                          ? `Panel panorámico (${panPos.join(', ')})`
                          : null;
                      const otherLabels = ex.filter(e => !e.startsWith('panoramico-')).map(e => EL[e] || e);
                      const allLabels = [...(panLabel ? [panLabel] : []), ...otherLabels];
                      if (allLabels.length === 0) return null;
                      return <Spec label="ACCESORIOS CABINA" value={allLabels.join(' / ')} />;
                    }
                  } catch { /* sin extras */ }
                  return null;
                })()}
                <Spec label="PUERTAS DE PISO"        value={q.use_type === 'Pasajeros' ? 'Acero Inoxidable (INOX)' : 'Pintura Epóxica Industrial'} alt />
                <Spec label="PUERTAS DE CABINA"      value={q.use_type === 'Pasajeros' ? 'Acero Inoxidable (INOX)' : 'Pintura Epóxica Industrial'} />
                <Spec label="NOMENCLATURA"           value={generateFloorNomenclature(q.stops)} alt />
              </View>
            </View>

            {/* Columna derecha */}
            <View style={{ width: 158, alignItems: 'center', paddingTop: 16 }}>
              <Image
                src={elevatorImage(q.model)}
                style={{ width: 154, height: cabinImage ? 175 : 250, objectFit: 'contain' }}
              />
              <Text style={{ fontSize: 8.5, color: NAVY, fontFamily: PJSansBold, marginTop: 4, textAlign: 'center' }}>
                {modelLabel}
              </Text>

              {cabinImage ? (
                <View style={{ marginTop: 8, alignItems: 'center', width: '100%' }}>
                  <View style={{ width: '100%', height: 1, backgroundColor: GOLD, marginBottom: 5 }} />
                  <Text style={{ fontSize: 8, color: GRAY, fontFamily: PJSansBold, textAlign: 'center', letterSpacing: 0.2, marginBottom: 4, textTransform: 'uppercase' }}>
                    Diseño de cabina
                  </Text>
                  <Image
                    src={cabinImage}
                    style={{ width: 154, height: 175, objectFit: 'cover', borderRadius: 4 }}
                  />
                </View>
              ) : null}
            </View>
          </View>

          {/* ── Materiales seleccionados ── */}
          {(wallImg || floorImg || plafonImg) && (
            <View style={{ marginTop: 12 }}>
              <View style={{ height: 1, backgroundColor: GOLD, marginBottom: 8 }} />
              <Text style={{ fontSize: 9, fontFamily: PJSansBold, color: NAVY, letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>
                Materiales seleccionados
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {wallImg ? (
                  <View style={{ alignItems: 'center', flex: 1 }}>
                    <Image src={wallImg} style={{ width: 55, height: 55, objectFit: 'cover', borderRadius: 4, borderWidth: 1, borderColor: '#E0E0E0' }} />
                    <Text style={{ fontSize: 9, color: GRAY, marginTop: 4, textAlign: 'center' }}>Acabado cabina</Text>
                    <Text style={{ fontSize: 9.5, color: BLK, fontFamily: PJSansBold, textAlign: 'center' }}>{q.cabin_finish}</Text>
                  </View>
                ) : null}
                {floorImg ? (
                  <View style={{ alignItems: 'center', flex: 1 }}>
                    <Image src={floorImg} style={{ width: 55, height: 55, objectFit: 'cover', borderRadius: 4, borderWidth: 1, borderColor: '#E0E0E0' }} />
                    <Text style={{ fontSize: 9, color: GRAY, marginTop: 4, textAlign: 'center' }}>Piso de cabina</Text>
                    <Text style={{ fontSize: 9.5, color: BLK, fontFamily: PJSansBold, textAlign: 'center' }}>{q.cabin_floor}</Text>
                  </View>
                ) : null}
                {plafonImg ? (
                  <View style={{ alignItems: 'center', flex: 1 }}>
                    <Image src={plafonImg} style={{ width: 55, height: 55, objectFit: 'cover', borderRadius: 4, borderWidth: 1, borderColor: '#E0E0E0' }} />
                    <Text style={{ fontSize: 9, color: GRAY, marginTop: 4, textAlign: 'center' }}>Plafón / COP</Text>
                    <Text style={{ fontSize: 9.5, color: BLK, fontFamily: PJSansBold, textAlign: 'center' }}>{q.cop_model}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          )}
        </View>

        <View style={S.stripBot} /><View style={S.stripBot2} />
        <IFooter seller={seller} title={sellerTitle} />
      </Page>

      {/* ══ PÁG 4 — PUERTAS · SEGURIDADES · CALIDAD · VENTAJAS ══ */}
      <Page size="LETTER" style={S.page}>
        <View style={S.stripTop} /><View style={S.stripTop2} />
        <IHeader folio={q.folio} client={q.client_name} page={4} />

        <View style={S.body}>
          <View style={S.cols}>

            <View style={S.col}>
              <Text style={S.secTitle}>PUERTAS</Text>
              <View style={{ borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 4, overflow: 'hidden', marginBottom: 9 }}>
                <Spec label="Puertas de piso"   value={`${q.stops} puertas`} />
                <Spec label="Puertas de cabina" value="1 puerta" alt />
                <Spec label="Tipo de puerta"    value={q.door_type} />
                <Spec label="Dimensiones"       value={`${q.door_width} mm × ${q.door_height} mm`} alt />
                <Spec label="Acabado"           value={q.use_type === 'Pasajeros' ? 'Acero Inoxidable (INOX)' : 'Pintura Epóxica Industrial'} />
              </View>

              {/* Normativa EN 81-20 + NOM-053 — dato informativo compacto */}
              <View style={S.infoBox}>
                <Text style={S.infoTitle}>Normativa aplicable: EN 81-20 (Estándar) + NOM-053</Text>
                {/* Bloque 1 */}
                <Text style={[S.infoText, { fontFamily: PJSansBold, marginTop: 4 }]}>Seguridad en cabina y cubo</Text>
                <Text style={S.infoText}>
                  Cabina cerrada · Paracaídas de seguridad · Frenos automáticos · Iluminación de emergencia · Botón de paro (rojo, en techo)
                </Text>
                {/* Bloque 2 */}
                <Text style={[S.infoText, { fontFamily: PJSansBold, marginTop: 4 }]}>Diseño e instalación</Text>
                <Text style={S.infoText}>
                  Puertas del cubo con chapa de seguridad (abre sin llave desde interior) · Dimensiones mínimas: 1.80 m × 0.70 m · Distancias libres en cubo
                </Text>
                {/* Bloque 3 */}
                <Text style={[S.infoText, { fontFamily: PJSansBold, marginTop: 4 }]}>Señalización y documentación</Text>
                <Text style={S.infoText}>
                  Capacidad (kg), máx. personas y fabricante indicados de forma indeleble · Leyendas de advertencia en montacargas
                </Text>
                {/* Bloque 4 */}
                <Text style={[S.infoText, { fontFamily: PJSansBold, marginTop: 4 }]}>Alcance y responsabilidad</Text>
                <Text style={S.infoText}>
                  Aplica a elevadores eléctricos de tracción nuevos · Responsable: contratista / empresa instaladora
                </Text>
              </View>
            </View>

            <View style={S.col}>
              {seguridadesActivas.length > 0 && (
                <>
                  <Text style={S.secTitle}>SEGURIDADES ADICIONALES</Text>
                  {seguridadesActivas.map((s, i) => <Bullet key={i} text={s} />)}
                </>
              )}

              <View style={[S.infoBoxGold, { marginTop: seguridadesActivas.length > 0 ? 9 : 0 }]}>
                <Text style={S.infoTitle}>Ventajas del sistema ALAMEX</Text>
                <Bullet text="Bajo consumo de energía eléctrica" />
                <Bullet text="Mayor confort en arranque y frenado" />
                <Bullet text="Sistema de rescate automático integrado" />
                <Bullet text="Diagnóstico en español y 5 idiomas más" />
              </View>
            </View>

          </View>
        </View>

        <View style={S.stripBot} /><View style={S.stripBot2} />
        <IFooter seller={seller} title={sellerTitle} />
      </Page>

      {/* ══ PÁG 5 — CONDICIONES COMERCIALES ══ */}
      <Page size="LETTER" style={S.page}>
        <View style={S.stripTop} /><View style={S.stripTop2} />
        <IHeader folio={q.folio} client={q.client_name} page={5} />

        <View style={S.body}>
          <Text style={S.secNum}>1.  TIEMPO DE ENTREGA</Text>
          <View style={S.infoBox}>
            <Text style={S.infoText}>{terms.deliveryTime}</Text>
          </View>

          <Text style={S.secNum}>2.  GARANTÍA</Text>
          <View style={S.infoBox}>
            <Text style={S.infoText}>
              {terms.warranty}. No incluye plafón, cabina ni puertas. Una vez terminados los
              mantenimientos de cortesía deberá contratar el mantenimiento ORO Alamex para
              conservar la garantía integral del equipo.
            </Text>
          </View>

          <Text style={S.secNum}>3.  MANTENIMIENTO GRATUITO</Text>
          <View style={S.infoBox}>
            <Text style={S.infoText}>
              Elevadores Alamex efectuará 3 servicios de mantenimiento mensual a partir de la
              entrega del equipo, en horario de Lunes a Viernes de 9:00 am a 5:00 pm.
            </Text>
          </View>

          <Text style={S.secNum}>4.  CONDICIONES GENERALES</Text>
          <View style={S.infoBox}>
            <Text style={S.infoText}>
              El equipo no está diseñado para trabajar a la intemperie ni expuesto a lluvia,
              rayos solares o altos niveles de humedad. No serán nuestra responsabilidad
              retrasos causados por fuerza mayor: huelgas, inundaciones, caso fortuito,
              dificultades de importación, etc.{'\n'}{terms.generalConditions}
            </Text>
          </View>

          <Text style={S.secNum}>5.  FORMAS DE PAGO</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 9 }}>
            {/* Tabla Equipo de Importación */}
            <View style={{ flex: 1, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 4, overflow: 'hidden' }}>
              <View style={S.condHead}>
                <Text style={S.condHCell}>Equipo de importación</Text>
              </View>
              {(terms.paymentMethod || '50% Anticipo a la firma del Contrato\n25% Al aviso de embarque\n20% Al aviso de entrega del equipo en obra\n05% Al aviso de entrega en funcionamiento')
                .split('\n').filter(l => l.trim()).map((line, i) => (
                  <View key={i} style={[S.condRow, i % 2 === 1 ? { backgroundColor: LGRAY } : {}]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingHorizontal: 7, paddingVertical: 4 }}>
                      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: GOLD, marginRight: 6, flexShrink: 0 }} />
                      <Text style={{ fontSize: 8.5, color: BLK, lineHeight: 1.5, flex: 1 }}>{line.trim()}</Text>
                    </View>
                  </View>
                ))
              }
            </View>
            {/* Tabla Mano de Obra */}
            <View style={{ flex: 1, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 4, overflow: 'hidden' }}>
              <View style={S.condHead}>
                <Text style={S.condHCell}>Mano de obra</Text>
              </View>
              {(terms.paymentMethodLabor || '50% A la firma de contrato\n25% Al aviso de inicio de instalación\n20% Al termino del montaje\n05% Al aviso de entrega funcionando')
                .split('\n').filter(l => l.trim()).map((line, i) => (
                  <View key={i} style={[S.condRow, i % 2 === 1 ? { backgroundColor: LGRAY } : {}]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingHorizontal: 7, paddingVertical: 4 }}>
                      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: GOLD, marginRight: 6, flexShrink: 0 }} />
                      <Text style={{ fontSize: 8.5, color: BLK, lineHeight: 1.5, flex: 1 }}>{line.trim()}</Text>
                    </View>
                  </View>
                ))
              }
            </View>
          </View>

          <Text style={S.secNum}>6.  VALIDEZ DE LA PROPUESTA</Text>
          <View style={S.infoBoxGold}>
            <Text style={{ fontSize: 10.5, color: BLK, fontFamily: PJSansBold }}>
              {terms.validity || '15 días naturales'}
            </Text>
          </View>

          {/* Firma */}
          <View style={{ marginTop: 8, alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 9.5, color: GRAY, marginBottom: 2 }}>Atentamente,</Text>
            <Text style={{ fontSize: 12, fontFamily: PJSansBold, color: NAVY }}>{seller}</Text>
            <Text style={{ fontSize: 9.5, color: GRAY }}>{sellerTitle}</Text>
            <Text style={{ fontSize: 9.5, color: GRAY }}>Elevadores Alamex S.A. de C.V.</Text>
            <Text style={{ fontSize: 9, color: GRAY, marginTop: 2 }}>Tel. +5255 5532 2739  ·  info@alam.mx</Text>
          </View>
        </View>

        <View style={S.stripBot} /><View style={S.stripBot2} />
        <IFooter seller={seller} title={sellerTitle} />
      </Page>

    </Document>
  );
}
