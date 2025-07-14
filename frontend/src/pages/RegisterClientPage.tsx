import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, AlertCircle, ChevronRight, Check } from 'lucide-react';
import { clientService, planService } from '@/services/clientService';
import { useAuthStore } from '@/store/authStore';
import { usePageTitle } from '@/hooks/usePageTitle';
import type { PlanDto } from '@/types/client.types';
import { extractApiError } from '@/utils/apiError';

// ── Esquema Zod ───────────────────────────────────────────────────────────────
const schema = z.object({
  FullName:        z.string().min(2, 'Obligatorio').max(150),
  IdentityCard:    z.string().min(1, 'Obligatorio').max(20),
  PhoneMain:       z.string().min(7, 'Obligatorio').max(20),
  PhoneSecondary:  z.string().optional(),
  Zone:            z.string().min(2, 'Obligatorio'),
  Street:          z.string().optional(),
  LocationRef:     z.string().optional(),
  WinboxNumber:    z.string().min(1, 'Obligatorio').max(50),
  InstallationDate: z.string().min(1, 'Obligatorio'),
  InstalledByUserId: z.string().uuid('Selecciona el técnico'),
  PlanId:          z.string().uuid('Selecciona un plan'),
  HasTvCable:      z.boolean(),
  OnuSerialNumber: z.string().optional(),
  InstallationCost: z.coerce.number().min(0, 'No puede ser negativo'),
  PaidInstallation: z.boolean(),
  PaidFirstMonth:   z.boolean(),
  PaymentMethod:    z.string().optional(),
  Bank:             z.string().optional(),
  PhysicalReceiptNumber: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

// ── Sección del formulario ────────────────────────────────────────────────────
function Section({ number, title, children }: {
  number: number; title: string; children: ReactNode;
}) {
  return (
    <div className="card p-6 mb-4">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
          {number}
        </div>
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {children}
      </div>
    </div>
  );
}

function Field({ label, error, children, full }: {
  label: string; error?: string; children: ReactNode; full?: boolean;
}) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="label">{label}</label>
      {children}
      {error && <p className="error-msg">{error}</p>}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function RegisterClientPage() {
  usePageTitle('Registrar Cliente');
  const navigate = useNavigate();
  const userId = useAuthStore(s => s.userId); // FIX-25

  const [plans,      setPlans]      = useState<PlanDto[]>([]);
  const [nextTbn,    setNextTbn]    = useState('TBN-····');
  const [serverError, setServerError] = useState('');
  const [saving,     setSaving]     = useState(false);

  const {
    register, handleSubmit, watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      HasTvCable:       false,
      PaidInstallation: false,
      PaidFirstMonth:   false,
      InstallationCost: 100,
      InstallationDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' }).format(new Date()),
      InstalledByUserId: userId ?? '',
    },
  });

  const paidInstallation = watch('PaidInstallation');
  const paidFirstMonth   = watch('PaidFirstMonth');
  const paymentMethod    = watch('PaymentMethod');
  const selectedPlanId   = watch('PlanId');
  const showPayment      = paidInstallation || paidFirstMonth;
  const showBank         = paymentMethod === 'DepositoBancario' || paymentMethod === 'QR';

  const selectedPlan = plans.find(p => p.Id === selectedPlanId);

  useEffect(() => {
    planService.getAll(true).then(setPlans).catch(() => {});
    clientService.peekTbn().then(setNextTbn).catch(() => {});
  }, []);

  const onSubmit = async (data: FormData) => {
    setServerError(''); setSaving(true);
    try {
      const client = await clientService.register({
        ...data,
        InstallationDate: data.InstallationDate,
        PhoneSecondary:   data.PhoneSecondary || undefined,
        Street:           data.Street || undefined,
        LocationRef:      data.LocationRef || undefined,
        OnuSerialNumber:  data.OnuSerialNumber || undefined,
        PaymentMethod:    (data.PaymentMethod as any) || undefined,
        Bank:             data.Bank || undefined,
        PhysicalReceiptNumber: data.PhysicalReceiptNumber || undefined,
      });
      navigate(`/clients/${client.Id}`);
    } catch (err: unknown) {
      setServerError(extractApiError(err, 'Error al registrar el cliente.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">

      {/* Cabecera */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <button onClick={() => navigate('/clients')} className="hover:text-gray-900">Clientes</button>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">Registrar cliente</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Nuevo cliente</h1>
        <div className="text-right">
          <p className="text-xs text-gray-400">Código asignado</p>
          <p className="font-mono font-bold text-blue-700 text-lg">{nextTbn}</p>
        </div>
      </div>

      {serverError && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4 mb-5">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">{serverError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>

        {/* ── Sección 1: Datos personales ─────────────────────────────────── */}
        <Section number={1} title="Datos personales">
          <Field label="Nombre completo *" error={errors.FullName?.message} full>
            <input type="text" className={`input-field ${errors.FullName ? 'input-error' : ''}`}
              placeholder="María González López" {...register('FullName')} />
          </Field>
          <Field label="Carnet de identidad *" error={errors.IdentityCard?.message}>
            <input type="text" className={`input-field ${errors.IdentityCard ? 'input-error' : ''}`}
              placeholder="7654321" {...register('IdentityCard')} />
          </Field>
          <Field label="Teléfono principal (WhatsApp) *" error={errors.PhoneMain?.message}>
            <input type="text" className={`input-field ${errors.PhoneMain ? 'input-error' : ''}`}
              placeholder="77712345" {...register('PhoneMain')} />
          </Field>
          <Field label="Teléfono secundario" error={errors.PhoneSecondary?.message}>
            <input type="text" className="input-field"
              placeholder="Opcional" {...register('PhoneSecondary')} />
          </Field>
        </Section>

        {/* ── Sección 2: Ubicación ────────────────────────────────────────── */}
        <Section number={2} title="Ubicación">
          <Field label="Zona o barrio *" error={errors.Zone?.message}>
            <input type="text" className={`input-field ${errors.Zone ? 'input-error' : ''}`}
              placeholder="Loma Linda" {...register('Zone')} />
          </Field>
          <Field label="Calle y número" error={errors.Street?.message}>
            <input type="text" className="input-field"
              placeholder="Calle 3, Nro. 45" {...register('Street')} />
          </Field>
          <Field label="Referencia de ubicación" error={errors.LocationRef?.message} full>
            <input type="text" className="input-field"
              placeholder="Frente a la cancha, portón azul" {...register('LocationRef')} />
          </Field>
        </Section>

        {/* ── Sección 3: Instalación ──────────────────────────────────────── */}
        <Section number={3} title="Datos de instalación">
          <Field label="Número Winbox *" error={errors.WinboxNumber?.message}>
            <input type="text" className={`input-field ${errors.WinboxNumber ? 'input-error' : ''}`}
              placeholder="vc-loma-045" {...register('WinboxNumber')} />
          </Field>
          <Field label="Fecha de instalación *" error={errors.InstallationDate?.message}>
            <input type="date" className={`input-field ${errors.InstallationDate ? 'input-error' : ''}`}
              {...register('InstallationDate')} />
          </Field>
          <Field label="Plan contratado *" error={errors.PlanId?.message}>
            <select className={`input-field ${errors.PlanId ? 'input-error' : ''}`}
              {...register('PlanId')}>
              <option value="">Selecciona un plan</option>
              {plans.map(p => (
                <option key={p.Id} value={p.Id}>{p.DisplayLabel}</option>
              ))}
            </select>
          </Field>
          <Field label="Número de serie ONU">
            <input type="text" className="input-field"
              placeholder="Opcional" {...register('OnuSerialNumber')} />
          </Field>
          <Field label="¿Incluye TV cable?">
            <label className="flex items-center gap-2 mt-1 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded" {...register('HasTvCable')} />
              <span className="text-sm text-gray-700">Sí, incluye TV cable</span>
            </label>
          </Field>
        </Section>

        {/* ── Sección 4: Pago en la instalación ──────────────────────────── */}
        <Section number={4} title="Pago en la instalación">
          <Field label="Costo de instalación (Bs.) *" error={errors.InstallationCost?.message}>
            <input type="number" min="0" step="0.01"
              className={`input-field ${errors.InstallationCost ? 'input-error' : ''}`}
              {...register('InstallationCost')} />
          </Field>
          <div className="sm:col-span-2 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded" {...register('PaidInstallation')} />
              <span className="text-sm text-gray-700">
                ¿Pagó el costo de instalación ahora? (Bs. {watch('InstallationCost') || 0})
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded" {...register('PaidFirstMonth')} />
              <span className="text-sm text-gray-700">
                ¿Pagó el primer mes ahora?
                {selectedPlan ? ` (Bs. ${selectedPlan.MonthlyPrice})` : ''}
              </span>
            </label>
          </div>

          {showPayment && (
            <>
              <Field label="Método de pago *" error={errors.PaymentMethod?.message}>
                <select className={`input-field ${errors.PaymentMethod ? 'input-error' : ''}`}
                  {...register('PaymentMethod')}>
                  <option value="">Seleccionar</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="DepositoBancario">Depósito bancario</option>
                  <option value="QR">QR</option>
                </select>
              </Field>
              {showBank && (
                <Field label="Banco *" error={errors.Bank?.message}>
                  <input type="text" className={`input-field ${errors.Bank ? 'input-error' : ''}`}
                    placeholder="BancoUnión, Mercantil…" {...register('Bank')} />
                </Field>
              )}
              <Field label="N.º de recibo físico">
                <input type="text" className="input-field"
                  placeholder="Opcional" {...register('PhysicalReceiptNumber')} />
              </Field>
            </>
          )}
        </Section>

        {/* Botones */}
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate('/clients')} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="btn-primary px-8">
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Registrando...</>
              : <><Check className="w-4 h-4" /> Registrar cliente</>}
          </button>
        </div>
      </form>
    </div>
  );
}
