import { useNavigate } from 'react-router-dom';
import { FileText, Shield, Lock, Scale, ArrowUpRight, ChevronRight } from 'lucide-react';

const legalItems = [
  { label: 'Termeni si conditii', path: '/profile/legal/terms', icon: FileText, desc: 'Conditiile de utilizare a platformei' },
  { label: 'Politica de confidentialitate', path: '/profile/legal/privacy', icon: Lock, desc: 'Cum protejam datele tale' },
  { label: 'Mandat de intermediere', path: '/profile/legal/mandate', icon: Scale, desc: 'Termenii mandatului de creditare' },
  { label: 'Conformitate', path: '/profile/legal/compliance', icon: Shield, desc: 'Pachet oficial de conformitate' },
  { label: 'Transfer date', path: '/profile/legal/data-transfer', icon: ArrowUpRight, desc: 'Politica de transmitere catre brokeri' },
];

export default function LegalMenuPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-light-100">Documente legale</h1>
      <p className="text-sm text-light-60">Consulta documentele legale ale platformei MoneyShop</p>

      <div className="space-y-2">
        {legalItems.map(item => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="flex items-center justify-between w-full bg-dark-700 border border-dark-400 rounded-xl px-5 py-4 hover:border-brand-primary/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-primary/5 transition-all duration-200 group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary group-hover:bg-brand-primary/20 transition-colors">
                <item.icon size={20} />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-light-90">{item.label}</p>
                <p className="text-xs text-light-60">{item.desc}</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-light-50 group-hover:text-brand-primary transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
}
