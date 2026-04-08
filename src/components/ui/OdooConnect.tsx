// ARCHIVO: src/components/ui/OdooConnect.tsx
// Este componente ya no es necesario.
// Las credenciales de Odoo ahora se configuran como variables de entorno
// en Vercel (ODOO_URL, ODOO_DB, ODOO_UID, ODOO_API_KEY) y el proxy
// las usa server-side. No hay configuración por usuario.

interface Props {
  onClose: () => void;
}

export default function OdooConnect({ onClose }: Props) {
  return null;
}
