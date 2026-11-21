import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { apiClient } from '@/services/api/apiClient';
import { SlotPicker } from '@/components/booking/SlotPicker';
import { trackLeadConversion } from '@/lib/adsConversion';

const MIN_SALARY = 2500;

interface Props {
  brokerSlug: string | null;
  brokerFirstName: string;
  /** From the simulator, so the broker sees what the client was looking at. */
  amount: number;
  months: number;
  onClose: () => void;
}

const serverMessage = (err: unknown) =>
  axios.isAxiosError(err) && typeof err.response?.data?.message === 'string' ? err.response.data.message as string : null;

/**
 * "Programează un apel" on a broker's own site: four fields and a free time from that broker's
 * calendar. No account needed; the client confirms from the email and can move or cancel there.
 */
export function BrokerBookingModal({ brokerSlug, brokerFirstName, amount, months, onClose }: Props) {
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [salary, setSalary] = useState('');
  const [slot, setSlot] = useState<string | null>(null);
  const [slotsKey, setSlotsKey] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');

  // Latest onClose without re-running the open/close effect when the parent re-renders.
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });

  useEffect(() => {
    const trigger = document.activeElement;
    panelRef.current?.querySelector<HTMLInputElement>('input')?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  }, []);

  const validate = () => {
    const next: Record<string, string> = {};
    if (name.trim().split(/\s+/).filter(Boolean).length < 2) next.name = 'Scrie numele și prenumele.';
    if (phone.replace(/\D/g, '').length < 10) next.phone = 'Scrie un număr de telefon complet (10 cifre).';
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'Adresa de email nu pare corectă.';
    if (!salary || Number(salary) < MIN_SALARY) next.salary = `Venitul net minim acceptat de bănci este ${MIN_SALARY.toLocaleString('ro-RO')} lei.`;
    if (!agreed) next.agreed = 'Bifează acordul ca să putem prelucra cererea.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!validate()) return;
    const [nume, ...rest] = name.trim().split(/\s+/);
    setSending(true);
    try {
      const { data } = await apiClient.post<{ id?: number; scheduledAt?: string | null; confirmationSent?: boolean }>('/appointments', {
        brokerSlug: brokerSlug ?? undefined,
        scheduledAt: slot ?? undefined,
        nume,
        prenume: rest.join(' '),
        telefon: phone.trim(),
        email: email.trim() || undefined,
        tipCredit: 'Nevoi personale',
        salariuNet: Number(salary),
      });
      trackLeadConversion({ appointmentId: data?.id, email, phone });
      navigate('/multumim', {
        state: { scheduledAt: data?.scheduledAt ?? null, confirmationSent: !!data?.confirmationSent, brokerFirstName, amount, months },
      });
    } catch (err) {
      const code = axios.isAxiosError(err) ? err.response?.data?.code : undefined;
      if (code === 'slot_taken') {
        setSlot(null);
        setSlotsKey(k => k + 1);
        setFormError('Ora aleasă tocmai a fost ocupată. Alege altă oră.');
      } else if (code === 'salary_too_low') {
        setErrors(prev => ({ ...prev, salary: `Venitul net minim acceptat de bănci este ${MIN_SALARY.toLocaleString('ro-RO')} lei.` }));
      } else if (axios.isAxiosError(err) && err.response?.status === 409) {
        setFormError(serverMessage(err) ?? `Te avem deja pe listă. ${brokerFirstName} te va contacta în curând.`);
      } else {
        setFormError('Nu am putut trimite cererea. Încearcă din nou sau sună-mă direct.');
      }
    } finally {
      setSending(false);
    }
  };

  const field = 'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';
  const label = 'mb-1 block text-sm font-medium text-gray-700';
  const err = (key: string) => errors[key] && <p id={`bb-${key}-error`} className="mt-1 text-xs text-red-600">{errors[key]}</p>;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 sm:items-center" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bb-title"
        className="max-h-[94vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl sm:max-w-lg sm:rounded-3xl sm:p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="bb-title" className="text-lg font-bold text-gray-900">Programează un apel cu {brokerFirstName}</h2>
            <p className="mt-1 text-sm text-gray-600">Discuție gratuită de 15 minute, fără obligații. Alegi tu ora.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Închide" className="rounded-lg p-1 text-2xl leading-none text-gray-400 hover:text-gray-700">×</button>
        </div>

        <form onSubmit={submit} noValidate className="space-y-4">
          <div>
            <label htmlFor="bb-name" className={label}>Nume și prenume</label>
            <input id="bb-name" autoComplete="name" value={name} onChange={e => setName(e.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'bb-name-error' : undefined} className={field} />
            {err('name')}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="bb-phone" className={label}>Telefon</label>
              <input id="bb-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="07xx xxx xxx" value={phone} onChange={e => setPhone(e.target.value)} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? 'bb-phone-error' : undefined} className={field} />
              {err('phone')}
            </div>
            <div>
              <label htmlFor="bb-salary" className={label}>Venit net lunar (lei)</label>
              <input id="bb-salary" type="number" inputMode="numeric" min={0} step={100} value={salary} onChange={e => setSalary(e.target.value)} aria-invalid={!!errors.salary} aria-describedby={errors.salary ? 'bb-salary-error' : undefined} className={field} />
              {err('salary')}
            </div>
          </div>
          <div>
            <label htmlFor="bb-email" className={label}>Email <span className="font-normal text-gray-400">(pentru confirmare și reminder)</span></label>
            <input id="bb-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'bb-email-error' : undefined} className={field} />
            {err('email')}
          </div>

          <fieldset>
            <legend className={label}>Când te sun?</legend>
            <SlotPicker key={slotsKey} brokerSlug={brokerSlug} value={slot} onChange={setSlot} accent="blue" />
          </fieldset>

          <label className="flex items-start gap-3 text-sm text-gray-600">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} aria-invalid={!!errors.agreed} className="mt-0.5 h-5 w-5 shrink-0 rounded border-gray-300 accent-indigo-600" />
            <span>
              Sunt de acord cu <a href="/legal" target="_blank" rel="noopener noreferrer" className="font-medium text-indigo-600 underline">termenii și politica de prelucrare a datelor</a> și am peste 18 ani.
            </span>
          </label>
          {err('agreed')}

          {formError && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}

          <button type="submit" disabled={sending} className="w-full rounded-full bg-indigo-600 py-3.5 text-base font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60">
            {sending ? 'Se trimite…' : slot ? 'Programează apelul' : 'Trimite cererea, mă suni tu'}
          </button>
          <p className="text-center text-xs text-gray-500">Simulare: {amount.toLocaleString('ro-RO')} lei pe {months} luni. MoneyShop nu acordă credite; intermediem gratuit cererea ta către bănci.</p>
        </form>
      </div>
    </div>
  );
}
