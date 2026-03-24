// ARCHIVO: src/features/pdf/QuotePDF.tsx
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type { Quote } from '../../types';

const N = '#1B3A6B'; const ND = '#0D2040'; const G = '#F5C518';
const W = '#FFFFFF'; const GR = '#64748B'; const GL = '#F8FAFC'; const TX = '#1E293B'; const BD = '#E2E8F0';

const S = StyleSheet.create({
  // Portada
  cover: { backgroundColor: W, padding: 0 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5, height: 24,
    backgroundColor: 'rgba(0,0,0,0.55)', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'flex-end', paddingHorizontal: 30, gap: 24 },
  topTxt: { color: 'rgba(255,255,255,0.85)', fontSize: 7.5, fontFamily: 'Helvetica' },
  heroBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 460, objectFit: 'cover' },
  diag: { position: 'absolute', top: 265, left: -60, width: 440, height: 255,
    backgroundColor: W, transform: 'rotate(-12deg)' },
  logoZone: { position: 'absolute', bottom: 148, left: 38 },
  logo: { width: 170, height: 'auto' },
  band: { position: 'absolute', bottom: 52, left: 0, right: 0, height: 56,
    backgroundColor: N, justifyContent: 'center', paddingHorizontal: 40 },
  bandTxt: { color: W, fontSize: 13, fontFamily: 'Helvetica' },
  foot: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 52,
    backgroundColor: ND, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly' },
  fi: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  fd: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: G },
  ft: { color: W, fontSize: 8.5, fontFamily: 'Helvetica' },
  // Interior
  inner: { backgroundColor: W, padding: 0 },
  iHead: { height: 46, backgroundColor: N, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 34 },
  iHL: { width: 52, height: 'auto' },
  iHR: { color: 'rgba(255,255,255,0.6)', fontSize: 7.5, fontFamily: 'Helvetica' },
  body: { paddingHorizontal: 34, paddingTop: 18, paddingBottom: 50 },
  secT: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: N, textTransform: 'uppercase',
    letterSpacing: 1.1, paddingBottom: 4, borderBottomWidth: 2, borderBottomColor: G,
    marginBottom: 7, marginTop: 12 },
  tbl: { borderWidth: 1, borderColor: BD, borderRadius: 3, overflow: 'hidden', marginBottom: 9 },
  thead: { flexDirection: 'row', backgroundColor: N, minHeight: 22, alignItems: 'center' },
  thC: { paddingHorizontal: 7, paddingVertical: 5, fontSize: 8, fontFamily: 'Helvetica-Bold', color: W, flex: 1 },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BD, minHeight: 20, alignItems: 'center' },
  trA: { backgroundColor: GL },
  tdK: { width: '38%', paddingHorizontal: 7, paddingVertical: 4.5, fontSize: 8,
    fontFamily: 'Helvetica-Bold', color: GR, borderRightWidth: 1, borderRightColor: BD },
  tdV: { flex: 1, paddingHorizontal: 7, paddingVertical: 4.5, fontSize: 8, color: TX },
  priceBox: { marginTop: 12, padding: 14, backgroundColor: '#EFF6FF', borderWidth: 1,
    borderColor: '#BFDBFE', borderRadius: 5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pL: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: N, marginBottom: 2 },
  pS: { fontSize: 7, color: GR },
  pA: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: N },
  pI: { fontSize: 7, color: GR, textAlign: 'right', marginTop: 2 },
  condR: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4.5, gap: 5 },
  condB: { width: 4, height: 4, borderRadius: 2, backgroundColor: G, marginTop: 3, flexShrink: 0 },
  condT: { fontSize: 8, color: TX, flex: 1, lineHeight: 1.5 },
  iFoot: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 30, backgroundColor: ND,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 34 },
  iFT: { fontSize: 7, color: 'rgba(255,255,255,0.5)', fontFamily: 'Helvetica' },
  badge: { backgroundColor: G, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2 },
  badgeT: { fontSize: 6, fontFamily: 'Helvetica-Bold', color: ND },
});

const v = (val: any) => (val !== undefined && val !== null && String(val).trim() !== '') ? String(val) : '—';
const TR = ({ label, value, alt }: { label: string; value?: any; alt?: boolean }) => (
  <View style={[S.tr, alt ? S.trA : {}]}>
    <Text style={S.tdK}>{label}</Text><Text style={S.tdV}>{v(value)}</Text>
  </View>
);
const Sec = ({ t }: { t: string }) => <Text style={S.secT}>{t}</Text>;
const Cond = ({ text }: { text: string }) => (
  <View style={S.condR}><View style={S.condB}/><Text style={S.condT}>{text}</Text></View>
);

const ML: Record<string, string> = {
  'MR': 'Con Cuarto de Máquinas (MR)', 'MRL-L': 'Sin Cuarto — Chasis L (MRL-L)',
  'MRL-G': 'Sin Cuarto — Chasis G (MRL-G)', 'HYD': 'Hidráulico (HyD)', 'Home Lift': 'Home Lift',
};

interface Props { quote: Quote; seller?: string; sellerTitle?: string }

export function QuotePDFDocument({ quote: q, seller = 'Ejecutivo de Ventas', sellerTitle = 'Ventas' }: Props) {
  const fmt  = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
  const total = (q.price || 0) * (q.quantity || 1);
  const today = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  const isMRL = q.model.includes('MRL');
  const model = ML[q.model] || q.model;
  const terms = q.commercial_terms || {
    paymentMethod: '50% Anticipo — 40% Contra Embarque — 10% Contra Entrega',
    deliveryTime:  'A confirmar tras anticipo', warranty: '12 meses en partes y mano de obra',
    validity: '30 días naturales', currency: 'MXN',
    generalConditions: 'Obra civil por cuenta del cliente.',
  };

  return (
    <Document title={`${q.folio} — ${q.client_name}`} author="Elevadores Alamex">

      {/* PÁG 1 — PORTADA */}
      <Page size="LETTER" style={S.cover}>
        <View style={S.topBar}>
          <Text style={S.topTxt}>+5255 5532 2739</Text>
          <Text style={S.topTxt}>www.alam.mx</Text>
          <Text style={S.topTxt}>info@alam.mx</Text>
        </View>
        <Image src="/images/fondo-login.jpg" style={S.heroBg} />
        <View style={S.diag} />
        <View style={S.logoZone}>
          <Image src="/images/logo-alamex-dark.png" style={S.logo} />
        </View>
        <View style={S.band}>
          <Text style={S.bandTxt}>Propuesta  {q.folio}  —  {q.client_name}</Text>
        </View>
        <View style={S.foot}>
          {['+5255 5532 2739','www.alam.mx','info@alam.mx'].map(t => (
            <View key={t} style={S.fi}><View style={S.fd}/><Text style={S.ft}>{t}</Text></View>
          ))}
        </View>
      </Page>

      {/* PÁG 2 — ESPECIFICACIONES */}
      <Page size="LETTER" style={S.inner}>
        <View style={S.iHead}>
          <Image src="/images/logo-alamex.png" style={S.iHL}/>
          <Text style={S.iHR}>Ref: {q.folio}  ·  Pág. 2</Text>
        </View>
        <View style={S.body}>
          <Sec t="Datos del Proyecto"/>
          <View style={S.tbl}>
            <TR label="Cliente"      value={q.client_name}/>
            <TR label="Referencia"   value={q.folio} alt/>
            <TR label="Fecha"        value={q.project_date}/>
            <TR label="Tipo de Uso"  value={q.use_type} alt/>
            <TR label="Cantidad"     value={`${q.quantity} equipo(s)`}/>
          </View>
          <Sec t="Especificaciones Técnicas"/>
          <View style={S.tbl}>
            <TR label="Modelo"           value={model}/>
            <TR label="Capacidad"        value={`${q.capacity} kg / ${q.persons} personas`} alt/>
            <TR label="Velocidad"        value={`${q.speed} m/s`}/>
            <TR label="Paradas"          value={q.stops} alt/>
            <TR label="Recorrido"        value={`${((q.travel||0)/1000).toFixed(2)} m`}/>
            {!isMRL && <TR label="Fosa"  value={`${q.pit} mm`} alt/>}
            {!isMRL && <TR label="Huida" value={`${q.overhead} mm`}/>}
            <TR label="Ancho Cubo"       value={`${q.shaft_width} mm`} alt/>
            <TR label="Fondo Cubo"       value={`${q.shaft_depth} mm`}/>
            <TR label="Control"          value={q.control_group} alt/>
            <TR label="Normativa"        value={q.norm}/>
            {q.model === 'MRL-L' && q.door_side && q.door_side !== 'N/A' && (
              <TR label="Apertura" value={q.door_side} alt/>
            )}
          </View>
          <Sec t="Acabados y Componentes"/>
          <View style={S.tbl}>
            <TR label="Puertas"     value={q.door_type}/>
            <TR label="Ancho Paso"  value={`${q.door_width} mm`} alt/>
            <TR label="Alto Paso"   value={`${q.door_height} mm`}/>
            <TR label="Cabina"      value={q.cabin_finish} alt/>
            <TR label="Piso"        value={q.cabin_floor}/>
            <TR label="Botoneras"   value={q.cop_model} alt/>
          </View>
        </View>
        <View style={S.iFoot}>
          <Text style={S.iFT}>Elevadores Alamex S.A. de C.V.  ·  {seller}  ·  {sellerTitle}</Text>
          <View style={S.badge}><Text style={S.badgeT}>CONFIDENCIAL</Text></View>
          <Text style={S.iFT}>+5255 5532 2739  ·  alam.mx</Text>
        </View>
      </Page>

      {/* PÁG 3 — ECONÓMICA */}
      <Page size="LETTER" style={S.inner}>
        <View style={S.iHead}>
          <Image src="/images/logo-alamex.png" style={S.iHL}/>
          <Text style={S.iHR}>Propuesta Económica  ·  {q.folio}  ·  Pág. 3</Text>
        </View>
        <View style={S.body}>
          <Sec t="Propuesta Económica"/>
          <View style={S.tbl}>
            <View style={S.thead}>
              <Text style={[S.thC, { flex: 3 }]}>Descripción</Text>
              <Text style={[S.thC, { flex: 0.5, textAlign: 'center' }]}>Cant.</Text>
              <Text style={[S.thC, { textAlign: 'right' }]}>P. Unit.</Text>
              <Text style={[S.thC, { textAlign: 'right' }]}>Total</Text>
            </View>
            <View style={S.tr}>
              <Text style={[S.tdV, { flex: 3 }]}>Elevador {q.use_type} {model} — {q.capacity} kg / {q.stops} par. / {q.speed} m/s</Text>
              <Text style={[S.tdV, { flex: 0.5, textAlign: 'center' }]}>{q.quantity}</Text>
              <Text style={[S.tdV, { textAlign: 'right' }]}>{fmt.format(q.price||0)}</Text>
              <Text style={[S.tdV, { textAlign: 'right', fontFamily: 'Helvetica-Bold' }]}>{fmt.format(total)}</Text>
            </View>
          </View>
          <View style={S.priceBox}>
            <View>
              <Text style={S.pL}>Inversión Total (Sin IVA)</Text>
              <Text style={S.pS}>{q.quantity} equipo(s) · Precio en Moneda Nacional</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={S.pA}>{fmt.format(total)}</Text>
              <Text style={S.pI}>Con IVA (16%): {fmt.format(total*1.16)}</Text>
            </View>
          </View>
          <Sec t="Términos y Condiciones"/>
          <Cond text={`Forma de pago: ${terms.paymentMethod}`}/>
          <Cond text={`Tiempo de entrega: ${terms.deliveryTime}`}/>
          <Cond text={`Garantía: ${terms.warranty}`}/>
          <Cond text={`Vigencia: ${terms.validity}`}/>
          <Cond text="El suministro incluye equipo completo, instalación y puesta en marcha conforme a normativa."/>
          <Cond text={terms.generalConditions}/>
          <View style={{ marginTop: 26, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View>
              <Text style={{ fontSize: 7.5, color: GR, marginBottom: 3 }}>Elaborado por:</Text>
              <Text style={{ fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: N }}>{seller}</Text>
              <Text style={{ fontSize: 7.5, color: GR }}>{sellerTitle} · Elevadores Alamex S.A. de C.V.</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 7, color: GR }}>Emisión: {today}</Text>
              <Text style={{ fontSize: 7, color: GR, marginTop: 2 }}>Ref: {q.folio}</Text>
            </View>
          </View>
        </View>
        <View style={S.iFoot}>
          <Text style={S.iFT}>Elevadores Alamex S.A. de C.V.  ·  +5255 5532 2739  ·  info@alam.mx</Text>
          <View style={S.badge}><Text style={S.badgeT}>CONFIDENCIAL</Text></View>
          <Text style={S.iFT}>Pág. 3</Text>
        </View>
      </Page>
    </Document>
  );
}
