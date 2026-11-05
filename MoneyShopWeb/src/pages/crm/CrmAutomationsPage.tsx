import { useEffect, useState } from 'react';
import {
  Workflow, Clock, UserPlus, Cake, FileWarning, MessageSquare, CheckCircle2,
} from 'lucide-react';
import { PageHeader } from './crmShared';

interface AutomationDef {
  id: string;
  icon: typeof Clock;
  title: string;
  trigger: string;
  action: string;
  defaultOn: boolean;
}

const AUTOMATIONS: AutomationDef[] = [
  { id: 'welcome_lead', icon: UserPlus, title: 'Mesaj de bun venit', trigger: 'Când intră un lead nou', action: 'Trimite SMS + email de întâmpinare', defaultOn: true },
  { id: 'missing_docs', icon: FileWarning, title: 'Reminder documente lipsă', trigger: 'La 2 zile după „Nevoie documente”', action: 'Notifică clientul ce documente lipsesc', defaultOn: true },
  { id: 'followup_7d', icon: Clock, title: 'Follow-up fără răspuns', trigger: 'La 7 zile fără activitate pe dosar', action: 'Trimite mesaj de reactivare', defaultOn: false },
  { id: 'birthday', icon: Cake, title: 'Felicitare de ziua clientului', trigger: 'În ziua de naștere a clientului', action: 'Trimite un mesaj personalizat', defaultOn: true },
  { id: 'offer_ready', icon: MessageSquare, title: 'Notificare ofertă transmisă', trigger: 'Când statusul devine „Ofertă transmisă”', action: 'Anunță clientul că are o ofertă', defaultOn: true },
  { id: 'approved', icon: CheckCircle2, title: 'Felicitare la aprobare', trigger: 'Când dosarul e aprobat de bancă', action: 'Trimite felicitări + pașii următori', defaultOn: false },
];

const STORAGE_KEY = 'moneyshop:crm-automations';

function loadState(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return Object.fromEntries(AUTOMATIONS.map(a => [a.id, a.defaultOn]));
}

export default function CrmAutomationsPage() {
  const [state, setState] = useState<Record<string, boolean>>(loadState);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [state]);

  const activeCount = Object.values(state).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Automatizări" subtitle={`${activeCount} din ${AUTOMATIONS.length} active`} />

      <div className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm text-indigo-800">
        <Workflow className="mt-0.5 h-5 w-5 shrink-0" />
        <p>Pornește automatizările pe care vrei să le ruleze CRM-ul în numele tău. Fiecare se declanșează automat la evenimentul descris.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {AUTOMATIONS.map(a => {
          const Icon = a.icon;
          const on = state[a.id] ?? a.defaultOn;
          return (
            <div key={a.id} className={`rounded-2xl border bg-white p-5 shadow-sm transition-colors ${on ? 'border-brand-primary/30' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${on ? 'bg-brand-primary/10 text-brand-primary' : 'bg-slate-100 text-slate-400'}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{a.title}</h3>
                    <div className="mt-1 text-xs text-slate-500">
                      <div><span className="font-medium text-slate-600">Când:</span> {a.trigger}</div>
                      <div><span className="font-medium text-slate-600">Acțiune:</span> {a.action}</div>
                    </div>
                  </div>
                </div>
                <button
                  role="switch"
                  aria-checked={on}
                  onClick={() => setState(s => ({ ...s, [a.id]: !on }))}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? 'bg-brand-primary' : 'bg-slate-300'}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
