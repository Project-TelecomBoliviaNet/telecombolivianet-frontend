import { useEffect, useState } from 'react';
import { Save, Loader2, CheckCircle2, AlertCircle, Wifi, Bell, Shield } from 'lucide-react';
import { settingsService } from '@/services/settingsService';
import { extractApiError } from '@/utils/apiError';

// ══════════════════════════════════════════════════════════════
// SettingsPage — Configuración general del sistema
// Ruta: /settings  |  Acceso: solo Admin
//
// GET  /api/admin/settings  — carga valores actuales al montar
// PUT  /api/admin/settings  — guarda y aplica en runtime
//
// Secciones:
//  1. WhatsApp Business — token y número
//  2. Alertas SLA — horas de anticipación y horario laboral
//  3. Seguridad — intentos de login
// ══════════════════════════════════════════════════════════════

function Section({ title, icon, children }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
        {icon} {title}
      </h2>
      {children}
    </div>
  );
}

function Field({ label, help, children }: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {help && <p className="text-xs text-gray-400 mt-1">{help}</p>}
    </div>
  );
}

const INPUT_CLS = "border rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-300";

export default function SettingsPage() {
  // WhatsApp
  const [waToken,  setWaToken]  = useState('');
  const [waPhone,  setWaPhone]  = useState('');
  const [waVer,    setWaVer]    = useState('v18.0');

  // SLA
  const [slaHoras,  setSlaHoras]  = useState('4');
  const [slaInicio, setSlaInicio] = useState('7');
  const [slaFin,    setSlaFin]    = useState('22');

  // Security
  const [maxLogin, setMaxLogin] = useState('5');

  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState('');

  // ── Cargar valores actuales al montar ─────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const s = await settingsService.get();
        setWaToken(s.WhatsAppToken         ?? '');
        setWaPhone(s.WhatsAppPhoneNumberId ?? '');
        setWaVer(s.WhatsAppApiVersion      ?? 'v18.0');
        setSlaHoras(String(s.SlaHorasAnticipacion  ?? 4));
        setSlaInicio(String(s.SlaHoraInicioLaboral ?? 7));
        setSlaFin(String(s.SlaHoraFinLaboral       ?? 22));
        setMaxLogin(String(s.MaxFailedLoginAttempts ?? 5));
      } catch {
        setError('No se pudo cargar la configuración actual.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Guardar ───────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true); setSaved(false); setError('');
    try {
      await settingsService.save({
        WhatsAppToken:          waToken,
        WhatsAppPhoneNumberId:  waPhone,
        WhatsAppApiVersion:     waVer,
        SlaHorasAnticipacion:   parseInt(slaHoras,  10),
        SlaHoraInicioLaboral:   parseInt(slaInicio, 10),
        SlaHoraFinLaboral:      parseInt(slaFin,    10),
        MaxFailedLoginAttempts: parseInt(maxLogin,  10),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setError(extractApiError(e, 'No se pudo guardar. Verifica los valores.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-medium text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Parámetros generales del sistema TelecomBoliviaNet
        </p>
      </div>

      {/* Error de carga */}
      {error && !saving && (
        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* WhatsApp */}
      <Section title="WhatsApp Business API" icon={<Wifi className="w-4 h-4 text-green-600" />}>
        <Field label="Token de acceso (Bearer)" help="Obtener en developers.facebook.com → Tu App → WhatsApp → API Setup">
          <input
            type="password"
            value={waToken}
            onChange={e => setWaToken(e.target.value)}
            placeholder="EAAxxxxxxxxxxxxxxxx"
            className={INPUT_CLS}
          />
        </Field>
        <Field label="Phone Number ID" help="ID numérico del número de teléfono de negocio en Meta">
          <input
            type="text"
            value={waPhone}
            onChange={e => setWaPhone(e.target.value)}
            placeholder="1234567890"
            className={INPUT_CLS}
          />
        </Field>
        <Field label="Versión de API" help="Por defecto v18.0 — actualizar cuando Meta publique nueva versión">
          <select
            value={waVer}
            onChange={e => setWaVer(e.target.value)}
            className={INPUT_CLS}
          >
            <option value="v18.0">v18.0</option>
            <option value="v19.0">v19.0</option>
            <option value="v20.0">v20.0</option>
            <option value="v21.0">v21.0</option>
          </select>
        </Field>
      </Section>

      {/* SLA */}
      <Section title="Alertas SLA y horario laboral" icon={<Bell className="w-4 h-4 text-blue-600" />}>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Horas de anticipación SLA" help="Alerta N horas antes del vencimiento">
            <input
              type="number" min={1} max={24} value={slaHoras}
              onChange={e => setSlaHoras(e.target.value)}
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Hora inicio laboral" help="Hora en formato 24h">
            <input
              type="number" min={0} max={23} value={slaInicio}
              onChange={e => setSlaInicio(e.target.value)}
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Hora fin laboral" help="Hora en formato 24h">
            <input
              type="number" min={0} max={23} value={slaFin}
              onChange={e => setSlaFin(e.target.value)}
              className={INPUT_CLS}
            />
          </Field>
        </div>
      </Section>

      {/* Seguridad */}
      <Section title="Seguridad" icon={<Shield className="w-4 h-4 text-red-600" />}>
        <Field label="Intentos de login antes de bloquear cuenta" help="Entre 3 y 10 intentos">
          <input
            type="number" min={3} max={10} value={maxLogin}
            onChange={e => setMaxLogin(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </Field>
      </Section>

      {/* Footer */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Save className="w-4 h-4" />}
          Guardar configuración
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-green-700">
            <CheckCircle2 className="w-4 h-4" /> Guardado y aplicado correctamente
          </span>
        )}
        {error && saving === false && saved === false && (
          <span className="flex items-center gap-1.5 text-sm text-red-600">
            <AlertCircle className="w-4 h-4" /> {error}
          </span>
        )}
      </div>
    </div>
  );
}
