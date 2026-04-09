// ARCHIVO: src/features/pdf/QuotePDF.tsx
// PDF completo — machote real de Alamex con imágenes de modelos
// 6 páginas: Portada / Cotización / Especificaciones / Puertas+Seguridades / Cabina / Condiciones

import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type { Quote } from '../../types';
import { generateFloorNomenclature, autoRails, autoTractionLabel } from '../../data/engineRules';

// ── PALETA ───────────────────────────────────────────────────
const NAVY  = '#1B3A6B';
const NAVY2 = '#132D54';
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

// ── TODAS LAS SEGURIDADES DISPONIBLES ───────────────────────
export const TODAS_SEGURIDADES = [
  'Sistema de paracaídas',
  'Sensor de carga (báscula de sobrecarga)',
  'Sensor de velocidad',
  'Cortina de luz',
  'Rescate automático en caso de corte de luz',
  'Sistema anti-incendio / Alarma de incendio',
  'Sensor sísmico',
  'Amortiguadores',
  'Botón de alarma',
  'Nivelación automática',
  'Apagado automático de luz de cabina',
  'Ventilador de cabina',
  'Scanner de error (Español + 5 idiomas)',
  'Botoneras Punto Matriz (COP y LOP)',
  'Protección de atascamiento y recalentamiento del motor',
  'Puerta abierta con botón de piso',
];

// ── TODOS LOS EXTRAS DE DESCRIPCIÓN DISPONIBLES ─────────────
export const TODOS_EXTRAS_DESC = [
  'Pasamanos',
  'Rescate Automático',
  'Sensor sísmico',
  'Sensor de carga',
  'Cortina de luz',
  'Alarma incendio',
  'Voz en off',
  'Ventilador',
];

// ── ESTILOS ──────────────────────────────────────────────────
const S = StyleSheet.create({
  page: { backgroundColor: WHITE, padding: 0, fontFamily: 'Helvetica' },
  stripTop:  { position: 'absolute', top: 0, left: 0,   width: 55,  height: 8, backgroundColor: GOLD  },
  stripTop2: { position: 'absolute', top: 0, left: 55,  width: 120, height: 8, backgroundColor: NAVY  },
  stripBot:  { position: 'absolute', bottom: 0, left: 0,   width: 160, height: 8, backgroundColor: GOLD  },
  stripBot2: { position: 'absolute', bottom: 0, left: 160, width: 80,  height: 8, backgroundColor: NAVY  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 30, paddingVertical: 12,
    backgroundColor: WHITE, borderBottomWidth: 3, borderBottomColor: GOLD,
  },
  headerRight: { alignItems: 'flex-end' },
  headerTitle: { fontSize: 8, color: NAVY, fontFamily: 'Helvetica-Bold', letterSpacing: 0.5 },
  headerSub:   { fontSize: 7, color: GRAY, marginTop: 1 },
  body: { paddingHorizontal: 30, paddingTop: 16, paddingBottom: 44 },
  secTitle: {
    fontSize: 11, fontFamily: 'Helvetica-Bold', color: NAVY,
    marginBottom: 8, marginTop: 12,
    paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: GOLD,
  },
  secNum: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 8, marginTop: 10 },
  tblHeader: { flexDirection: 'row', backgroundColor: NAVY, minHeight: 24, alignItems: 'center' },
  tblHCell:  { flex: 1, paddingHorizontal: 8, paddingVertical: 5, fontSize: 9, fontFamily: 'Helvetica-Bold', color: WHITE },
  tblRow:    { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E0E0E0', minHeight: 20, alignItems: 'center' },
  tblAlt:    { backgroundColor: LGRAY },
  tblCell:   { flex: 1, paddingHorizontal: 8, paddingVertical: 5, fontSize: 9, color: BLK },
  tblBold:   { flex: 1, paddingHorizontal: 8, paddingVertical: 5, fontSize: 9, fontFamily: 'Helvetica-Bold', color: BLK },
  specRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#EBEBEB', minHeight: 20, alignItems: 'center' },
  specKey: { width: '42%', paddingHorizontal: 8, paddingVertical: 5, fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: NAVY, borderRightWidth: 1, borderRightColor: '#EBEBEB' },
  specVal: { flex: 1, paddingHorizontal: 8, paddingVertical: 5, fontSize: 8.5, color: BLK },
  infoBox:     { padding: 10, borderRadius: 4, marginBottom: 10, backgroundColor: '#EBF0FB', borderLeftWidth: 3, borderLeftColor: NAVY },
  infoBoxGold: { padding: 10, borderRadius: 4, marginBottom: 10, backgroundColor: '#FFFBEB', borderLeftWidth: 3, borderLeftColor: GOLD },
  infoTitle:   { fontSize: 9, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 3 },
  infoText:    { fontSize: 8.5, color: BLK, lineHeight: 1.5 },
  bulletRow:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  bulletDot:  { width: 5, height: 5, borderRadius: 2.5, backgroundColor: GOLD, marginTop: 3.5, marginRight: 6, flexShrink: 0 },
  bulletText: { fontSize: 8.5, color: BLK, flex: 1, lineHeight: 1.5 },
  para: { fontSize: 8.5, color: BLK, lineHeight: 1.5, marginBottom: 6 },
  cols: { flexDirection: 'row', gap: 14, marginBottom: 8 },
  col:  { flex: 1 },
  condTable: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 3, overflow: 'hidden', marginBottom: 10 },
  condHead:  { flexDirection: 'row', backgroundColor: NAVY, minHeight: 22, alignItems: 'center' },
  condHCell: { flex: 1, paddingHorizontal: 8, paddingVertical: 5, fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: WHITE },
  condRow:   { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E0E0E0', minHeight: 18, alignItems: 'flex-start' },
  condCell:  { flex: 1, paddingHorizontal: 8, paddingVertical: 4, fontSize: 8, color: BLK, lineHeight: 1.4 },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 28,
    backgroundColor: NAVY, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 24,
  },
  footerTxt:  { fontSize: 7, color: 'rgba(255,255,255,0.65)', fontFamily: 'Helvetica' },
  footerGold: { fontSize: 7, color: GOLD, fontFamily: 'Helvetica-Bold' },
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
    <View style={{ flexDirection: 'column', justifyContent: 'center' }}>
      <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#1B3A6B', letterSpacing: 0.5 }}>ALAMEX</Text>
      <Text style={{ fontSize: 7, color: '#555', letterSpacing: 0.3 }}>Elevadores</Text>
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
  quote: q, seller = 'Ejecutivo de Ventas', sellerTitle = 'Ventas',
  cabinImage, wallImg, floorImg, plafonImg
}: Props) {
  const fmt   = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
  const today = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  const isMRL = q.model.includes('MRL');
  const isMR  = q.model === 'MR';
  const isHyd = q.model === 'HYD' || q.model === 'Home Lift';

  const total       = (q.price || 0) * q.quantity;
  const iva         = total * 0.16;
  const totalConIVA = total * 1.16;
  const machineRoom = isMR ? 'Con Cuarto de Máquinas' : isHyd ? 'N/A (Hidráulico)' : 'Sin Cuarto de Máquinas';
  const modelLabel  = MODEL_LABELS[q.model] || q.model;

  const terms = q.commercial_terms || {
    paymentMethod: '50% Anticipo / 25% Embarque / 20% Entrega / 05% Puesta en marcha',
    deliveryTime:  '6 meses a partir de firma de contrato y anticipo',
    warranty:      '3 años a partir de la entrega del equipo funcionando',
    validity:      '15 días naturales',
    generalConditions: 'Obra civil por cuenta del cliente.',
  };

  // ── Opciones PDF con defaults (todo activo si no hay config) ─
  const opts = q.pdf_options ?? {};
  const seguridadesActivas: string[] = opts.seguridades ?? TODAS_SEGURIDADES;
  const extrasDescActivos: string[]  = opts.extras_descripcion ?? TODOS_EXTRAS_DESC;
  const mostrarNormativa             = opts.mostrar_normativa   ?? true;
  const mostrarCalidad               = opts.mostrar_calidad     ?? true;
  const mostrarVentajas              = opts.mostrar_ventajas    ?? true;

  // Descripción de la cotización con extras opcionales
  const extrasStr = extrasDescActivos.length > 0
    ? ' / ' + extrasDescActivos.join(' / ')
    : '';

  return (
    <Document title={`Propuesta ${q.folio} — ${q.client_name}`} author="Elevadores Alamex">

      {/* ══ PÁG 2 — COTIZACIÓN ══ */}
      <Page size="LETTER" style={S.page}>
        <View style={S.stripTop} /><View style={S.stripTop2} />
        <IHeader folio={q.folio} client={q.client_name} page={2} />
        <View style={S.body}>
          <Text style={{ fontSize: 9.5, color: NAVY, fontFamily: 'Helvetica-Bold', marginBottom: 4 }}>
            Estimado/a {q.client_name}
          </Text>
          <Text style={S.para}>
            Atendiendo su solicitud para cotizar {q.quantity} Elevador{q.quantity > 1 ? 'es' : ''} de{' '}
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>{(q.use_type || 'PASAJEROS').toUpperCase()}</Text>,
            y tomando como base la información suministrada, hacemos llegar la propuesta económica
            para el suministro e instalación del (los) equipo(s) con las características descritas.
          </Text>
          <View style={{ flexDirection: 'row', gap: 16, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: NAVY }}>Referencia:</Text>
              <Text style={{ fontSize: 8.5, color: BLK }}>{q.folio}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: NAVY }}>Fecha:</Text>
              <Text style={{ fontSize: 8.5, color: BLK }}>{today}</Text>
            </View>
            {q.client_email
              ? <View style={{ flexDirection: 'row', gap: 4 }}>
                  <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: NAVY }}>Contacto:</Text>
                  <Text style={{ fontSize: 8.5, color: BLK }}>{q.client_email}</Text>
                </View>
              : <View />}
          </View>

          <Text style={S.secNum}>1.  COTIZACIÓN DE PROYECTO</Text>

          <View style={{ borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
            <View style={S.tblHeader}>
              <Text style={[S.tblHCell, { flex: 3 }]}>Descripción</Text>
              <Text style={[S.tblHCell, { textAlign: 'right' }]}>Precio Equipo</Text>
              <Text style={[S.tblHCell, { textAlign: 'right' }]}>Mano de Obra</Text>
            </View>
            <View style={[S.tblRow, { alignItems: 'flex-start', paddingVertical: 6 }]}>
              <View style={[S.tblCell, { flex: 3 }]}>
                <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: BLK, marginBottom: 2 }}>
                  {q.quantity} Elevador{q.quantity > 1 ? 'es' : ''} de {(q.use_type || 'Pasajeros').toUpperCase()}{' '}
                  {q.model} / {q.stops} niveles / {q.capacity} Kg / {q.persons} personas
                  {q.cabin_floor  ? ` / piso en ${q.cabin_floor}`  : ''}
                  {q.cabin_finish ? ` / Cabina ${q.cabin_finish}`  : ''}
                  {q.door_type    ? ` / Puertas ${q.door_type}`    : ''}
                  {extrasStr}
                </Text>
              </View>
              <Text style={[S.tblBold, { textAlign: 'right' }]}>{fmt.format(total)} {q.currency || 'MXN'}</Text>
              <Text style={[S.tblCell, { textAlign: 'right' }]}>—</Text>
            </View>
            <View style={[S.tblRow, S.tblAlt]}>
              <Text style={[S.tblCell, { flex: 3 }]}>IVA (16%)</Text>
              <Text style={[S.tblBold, { textAlign: 'right' }]}>{fmt.format(iva)} {q.currency || 'MXN'}</Text>
              <Text style={[S.tblCell, { textAlign: 'right' }]}>—</Text>
            </View>
            <View style={[S.tblRow, { backgroundColor: NAVY }]}>
              <Text style={[S.tblBold, { flex: 3, color: WHITE }]}>Total Con IVA</Text>
              <Text style={[S.tblBold, { textAlign: 'right', color: GOLD, fontSize: 11 }]}>
                {fmt.format(totalConIVA)} {q.currency || 'MXN'}
              </Text>
              <Text style={[S.tblCell, { textAlign: 'right', color: WHITE }]}>—</Text>
            </View>
          </View>

          <View style={S.infoBoxGold}>
            <Text style={S.infoText}>
              * El transporte, instalación y puesta en marcha se cotiza por separado según la ubicación del proyecto.{'\n'}
              * Precios en {q.currency || 'MXN'}. Sujetos a variación en tipo de cambio si aplica.
            </Text>
          </View>
        </View>
        <View style={S.stripBot} /><View style={S.stripBot2} />
        <IFooter seller={seller} title={sellerTitle} />
      </Page>

      {/* ══ PÁG 3 — ESPECIFICACIONES ══ */}
      <Page size="LETTER" style={S.page}>
        <View style={S.stripTop} /><View style={S.stripTop2} />
        <IHeader folio={q.folio} client={q.client_name} page={3} />
        <View style={S.body}>
          <Text style={S.secTitle}>ESPECIFICACIONES TÉCNICAS DEL SISTEMA DE ELEVACIÓN</Text>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <View style={{ flex: 1 }}>
              <View style={{ borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 3, overflow: 'hidden' }}>
                <Spec label="TIPO"                  value={q.model} />
                <Spec label="CAPACIDAD"             value={`${q.capacity} Kg / ${q.persons} Pasajeros`} alt />
                <Spec label="NÚMERO DE PARADAS"     value={q.stops} />
                <Spec label="ENTRADAS DE PUERTAS"   value={q.door_side && q.door_side !== 'N/A' ? `${q.stops} — Apertura ${q.door_side}` : `${q.stops} al frente`} alt />
                <Spec label="RECORRIDO"             value={`${q.travel || 0} mm`} />
                <Spec label="CUBO (Frente × Fondo)" value={`${q.shaft_width} mm × ${q.shaft_depth} mm`} alt />
                {(!isMRL && !isHyd) && (
                  <View>
                    <Spec label="FOSO"      value={`${q.pit} mm`} />
                    <Spec label="SOBREPASO" value={`${q.overhead} mm`} alt />
                  </View>
                )}
                <Spec label="VELOCIDAD"             value={`${q.speed} m/seg`} />
                <Spec label="MÁQUINA"               value={machineRoom} alt />
                <Spec label="RIELES CABINA"         value={autoRails(q.model).cabin} />
                <Spec label="RIELES CONTRAPESO"     value={autoRails(q.model).counterweight} alt />
                <Spec label="SISTEMA DE TRACCIÓN"   value={autoTractionLabel(q.model, String(q.speed))} />
                <Spec label="CONTROL"               value="ALAMEX" alt />
                <Spec label="PANEL CABINA (COP)"    value="Punto Matriz" />
                <Spec label="PANEL PISO (LOP)"      value="Punto Matriz" alt />
                <Spec label="TIPO DE GRUPO"         value={q.quantity > 1 ? (q.quantity === 2 ? 'Duplex' : q.quantity === 3 ? 'Triplex' : `Grupo ${q.quantity}`) : 'Simplex'} />
                <Spec label="MODELO DE CABINA"      value={q.cabin_model || 'CLX-102B'} alt />
                <Spec label="ACABADO DE CABINA"     value={q.cabin_finish || 'INOX'} />
                <Spec label="PUERTAS DE PISO"       value={q.use_type === 'Pasajeros' ? 'INOX' : 'Pintura Epóxica'} alt />
                <Spec label="PUERTAS DE CABINA"     value={q.use_type === 'Pasajeros' ? 'INOX' : 'Pintura Epóxica'} />
                <Spec label="PISO DE CABINA"        value={q.cabin_floor || 'Granito'} alt />
                <Spec label="PLAFÓN"                value={q.cop_model || 'LV-29'} />
                <Spec label="NOMENCLATURA"          value={generateFloorNomenclature(q.stops)} alt />
                <Spec label="NORMATIVA"             value={q.norm || 'EN 81-20'} />
              </View>
            </View>
            <View style={{ width: 135, alignItems: 'center', paddingTop: 20 }}>
              <Image src={elevatorImage(q.model)} style={{ width: 125, height: 255, objectFit: 'contain' }} />
              <Text style={{ fontSize: 7.5, color: NAVY, fontFamily: 'Helvetica-Bold', marginTop: 6, textAlign: 'center' }}>
                {modelLabel}
              </Text>
            </View>
          </View>
        </View>
        <View style={S.stripBot} /><View style={S.stripBot2} />
        <IFooter seller={seller} title={sellerTitle} />
      </Page>

      {/* ══ PÁG 4 — PUERTAS + SEGURIDADES ══ */}
      <Page size="LETTER" style={S.page}>
        <View style={S.stripTop} /><View style={S.stripTop2} />
        <IHeader folio={q.folio} client={q.client_name} page={4} />
        <View style={S.body}>
          <View style={S.cols}>
            <View style={S.col}>
              <Text style={S.secTitle}>PUERTAS</Text>
              <View style={{ borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
                <Spec label="Puertas de piso"   value={`${q.stops} puertas`} />
                <Spec label="Puertas de cabina" value="1 puerta" alt />
                <Spec label="Tipo de puerta"    value={q.door_type || 'Automática Central'} />
                <Spec label="Dimensiones"       value={`${q.door_width} mm × ${q.door_height} mm`} alt />
                <Spec label="Acabado"           value={q.use_type === 'Pasajeros' ? 'Acero Inoxidable (INOX)' : 'Pintura Epóxica Industrial'} />
              </View>
              {/* Normativa — opcional */}
              {mostrarNormativa && (
                <View style={S.infoBox}>
                  <Text style={S.infoTitle}>Normativa aplicable</Text>
                  <Text style={S.infoText}>
                    Nuestros equipos cumplen con la Normativa{' '}
                    <Text style={{ fontFamily: 'Helvetica-Bold' }}>{q.norm || 'EN 81-20'}</Text> europea y NOM-53 mexicana.
                  </Text>
                </View>
              )}
            </View>
            <View style={S.col}>
              {/* Seguridades — solo las activas */}
              {seguridadesActivas.length > 0 && (
                <View>
                  <Text style={S.secTitle}>SEGURIDADES INCLUIDAS</Text>
                  {seguridadesActivas.map((s, i) => <Bullet key={i} text={s} />)}
                </View>
              )}
            </View>
          </View>
        </View>
        <View style={S.stripBot} /><View style={S.stripBot2} />
        <IFooter seller={seller} title={sellerTitle} />
      </Page>

      {/* ══ PÁG 5 — CABINA ══ */}
      <Page size="LETTER" style={S.page}>
        <View style={S.stripTop} /><View style={S.stripTop2} />
        <IHeader folio={q.folio} client={q.client_name} page={5} />
        <View style={S.body}>
          <View style={S.cols}>
            <View style={S.col}>
              <Text style={S.secTitle}>CABINA</Text>
              <View style={{ borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
                <Spec label="Modelo"      value={q.cabin_model || 'CLX-102B'} />
                <Spec label="Acabado"     value={q.cabin_finish || 'INOX'} alt />
                <Spec label="Capacidad"   value={`${q.capacity} Kg / ${q.persons} personas`} />
                <Spec label="Piso"        value={q.cabin_floor || 'Granito'} alt />
                <Spec label="Plafón"      value={q.cop_model || 'LV-29'} />
                <Spec label="Tipo de uso" value={q.use_type || 'Pasajeros'} alt />
              </View>
              {/* Calidad y estándares — opcional */}
              {mostrarCalidad && (
                <View style={S.infoBox}>
                  <Text style={S.infoTitle}>Calidad y estándares</Text>
                  <Text style={S.infoText}>
                    Cabinas construidas bajo los estándares NOM-53 y EN-81 para uso habitacional,
                    residencial e industrial con alto rendimiento. Materiales de primera calidad.
                  </Text>
                </View>
              )}
            </View>
            <View style={S.col}>
              <Text style={S.secTitle}>SISTEMA DE CONTROL</Text>
              <View style={{ borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
                <Spec label="Control"      value="ALAMEX 220V / 14A" />
                <Spec label="Botonera COP" value="Punto Matriz" alt />
                <Spec label="Botonera LOP" value="Punto Matriz" />
                <Spec label="Diagnóstico"  value="Scanner multilenguaje" alt />
                <Spec label="Nomenclatura" value={generateFloorNomenclature(q.stops)} />
              </View>
              {/* Ventajas ALAMEX — opcional */}
              {mostrarVentajas && (
                <View style={S.infoBoxGold}>
                  <Text style={S.infoTitle}>Ventajas del sistema ALAMEX</Text>
                  <Bullet text="Bajo consumo de energía eléctrica" />
                  <Bullet text="Mayor confort en arranque y frenado" />
                  <Bullet text="Sistema de rescate automático integrado" />
                  <Bullet text="Diagnóstico en español y 5 idiomas más" />
                </View>
              )}
            </View>
          </View>
        </View>
        <View style={S.stripBot} /><View style={S.stripBot2} />
        <IFooter seller={seller} title={sellerTitle} />
      </Page>

      {/* ══ PÁG 6 — CONDICIONES ══ */}
      <Page size="LETTER" style={S.page}>
        <View style={S.stripTop} /><View style={S.stripTop2} />
        <IHeader folio={q.folio} client={q.client_name} page={6} />
        <View style={S.body}>
          <Text style={S.secNum}>1.  TIEMPO DE ENTREGA</Text>
          <View style={S.infoBox}>
            <Text style={S.infoText}>{terms.deliveryTime}</Text>
          </View>
          <Text style={S.secNum}>2.  GARANTÍA</Text>
          <View style={S.infoBox}>
            <Text style={S.infoText}>
              {terms.warranty}. No incluye plafón, cabina, puertas. Una vez terminados los
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
          <View style={S.condTable}>
            <View style={S.condHead}>
              <Text style={S.condHCell}>Equipo de importación</Text>
              <Text style={S.condHCell}>Transporte y Mano de Obra</Text>
            </View>
            {[
              ['50% Anticipo a la firma del Contrato', '50% Anticipo a la firma del Contrato'],
              ['25% Al aviso de embarque', '25% Al aviso de Inicio de Instalación'],
              ['20% Al aviso de entrega del equipo en obra', '20% veinte días después del inicio'],
              ['05% Al aviso de entrega en funcionamiento', '05% Al aviso de entrega en funcionamiento'],
            ].map(([a, b], i) => (
              <View key={i} style={[S.condRow, i % 2 === 1 ? { backgroundColor: LGRAY } : {}]}>
                <Text style={S.condCell}>{a}</Text>
                <Text style={S.condCell}>{b}</Text>
              </View>
            ))}
          </View>
          <Text style={S.secNum}>6.  VALIDEZ DE LA PROPUESTA</Text>
          <View style={S.infoBoxGold}>
            <Text style={{ fontSize: 9, color: BLK, fontFamily: 'Helvetica-Bold' }}>
              {terms.validity || '15 días naturales'}
            </Text>
          </View>
          <View style={{ marginTop: 18, alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 9, color: GRAY, marginBottom: 3 }}>Atentamente,</Text>
            <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: NAVY }}>{seller}</Text>
            <Text style={{ fontSize: 8.5, color: GRAY }}>{sellerTitle}</Text>
            <Text style={{ fontSize: 8.5, color: GRAY }}>Elevadores Alamex S.A. de C.V.</Text>
            <Text style={{ fontSize: 8, color: GRAY, marginTop: 2 }}>Tel. +5255 5532 2739  ·  info@alam.mx</Text>
          </View>
        </View>
        <View style={S.stripBot} /><View style={S.stripBot2} />
        <IFooter seller={seller} title={sellerTitle} />
      </Page>

    </Document>
  );
}
