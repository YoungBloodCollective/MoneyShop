import { Star, Shield, Calculator, Clock, Users, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useInView } from '@/hooks/useInView';

const reviews = [
  { name: 'Andrei M.', text: 'Am obtinut un credit ipotecar cu cea mai buna dobanda de pe piata. Recomand!', stars: 5 },
  { name: 'Elena P.', text: 'Procesul a fost simplu si transparent. In 3 zile am avut banii in cont.', stars: 5 },
  { name: 'Mihai D.', text: 'MoneyShop mi-a gasit o oferta cu 2% mai putin decat banca mea. Excelent!', stars: 5 },
  { name: 'Ioana R.', text: 'Serviciu profesionist, broker dedicat care m-a ghidat pas cu pas.', stars: 4 },
  { name: 'Cristian V.', text: 'Am refinantat si economisesc 400 lei pe luna. Mersi MoneyShop!', stars: 5 },
  { name: 'Maria L.', text: 'Platforma e foarte usor de utilizat, chiar si de pe telefon.', stars: 5 },
];

const features = [
  { icon: Calculator, title: 'Simulator instant', desc: 'Afla in 2 minute cat poti imprumuta si la ce rata lunara.' },
  { icon: Shield, title: '100% sigur', desc: 'Date criptate, brokeri autorizati ANPC, conformitate GDPR.' },
  { icon: Clock, title: 'Raspuns rapid', desc: 'Primesti oferte personalizate in maxim 24 de ore.' },
  { icon: Users, title: 'Broker autorizat de credite', desc: 'Un specialist financiar te ghideaza de la simulare pana la semnare.' },
];

const stats = [
  { value: '5.000+', label: 'Clienti multumiti' },
  { value: '120M+', label: 'RON credite intermediate' },
  { value: '10+', label: 'Banci partenere' },
  { value: '98%', label: 'Rata de aprobare' },
];

function RevealSection({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, isVisible } = useInView(0.1);
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function AboutPage() {
  const navigate = useNavigate();
  const statsView = useInView(0.2);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-16">
      <RevealSection>
        <div className="text-center space-y-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Despre <span className="text-blue-600">MoneyShop</span><sup className="text-lg text-gray-400">&reg;</sup>
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            MoneyShop&reg; este o platform&#259; digital&#259; de analiz&#259; &#537;i intermediere financiar&#259;, care faciliteaz&#259; accesul utilizatorilor la informa&#539;ii privind op&#539;iunile de credit disponibile &#238;n pia&#539;&#259;.
          </p>
        </div>
      </RevealSection>
      <div ref={statsView.ref} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={`bg-white rounded-2xl p-5 text-center shadow-sm border border-gray-100 transition-all duration-700 ease-out ${statsView.isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'}`}
            style={{ transitionDelay: `${i * 100}ms` }}
          >
            <p className="text-2xl sm:text-3xl font-bold text-blue-600">{s.value}</p>
            <p className="text-sm text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>
      <RevealSection>
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Cine suntem</h2>
          <p className="text-gray-600 leading-relaxed">
            Prin intermediul platformei, utilizatorii pot ob&#539;ine o evaluare orientativ&#259; a eligibilit&#259;&#539;ii pentru produse de creditare, pe baza datelor furnizate &#537;i, dup&#259; caz, a informa&#539;iilor ob&#539;inute cu acordul acestora de la institu&#539;ii relevante.
          </p>
          <p className="text-gray-600 leading-relaxed">
            MoneyShop&reg; nu este institu&#539;ie de credit &#537;i nu acord&#259; &#238;mprumuturi. Platforma nu emite oferte ferme de credit &#537;i nu garanteaz&#259; aprobarea finan&#539;&#259;rii.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Serviciile oferite au caracter informativ &#537;i de intermediere, iar condi&#539;iile finale de creditare sunt stabilite exclusiv de c&#259;tre institu&#539;iile financiare partenere, &#238;n urma analizei proprii.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Transmiterea datelor c&#259;tre brokeri sau institu&#539;ii financiare se realizeaz&#259; doar cu acordul expres al utilizatorului.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <div className="flex items-center gap-2 text-green-600 font-medium text-sm">
              <CheckCircle size={18} /> F&#259;r&#259; costuri pentru serviciile de intermediere
            </div>
            <div className="flex items-center gap-2 text-green-600 font-medium text-sm">
              <CheckCircle size={18} /> Proces digital de analiz&#259; preliminar&#259;
            </div>
            <div className="flex items-center gap-2 text-green-600 font-medium text-sm">
              <CheckCircle size={18} /> Conectare c&#259;tre brokeri autoriza&#539;i
            </div>
          </div>
        </div>
      </RevealSection>
      <RevealSection>
        <div>
          <h2 className="text-xl font-bold text-gray-900 text-center mb-8">De ce MoneyShop?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((f, i) => (
              <RevealSection key={f.title} delay={i * 100}>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-start gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                    <f.icon size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{f.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{f.desc}</p>
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </RevealSection>
      <RevealSection>
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-6">Certificari si conformitate</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Autorizat ANPC', sub: 'Intermediar de credit autorizat' },
              { label: 'Conformitate GDPR', sub: 'Date protejate conform UE 2016/679' },
              { label: 'Securitate bancara', sub: 'Criptare AES-256, TLS 1.3' },
            ].map(b => (
              <div key={b.label} className="flex items-start gap-3 p-4 rounded-xl bg-blue-50/50">
                <CheckCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900 text-sm">{b.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{b.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </RevealSection>
      <RevealSection>
        <div>
          <h2 className="text-xl font-bold text-gray-900 text-center mb-8">Ce spun clientii nostri</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reviews.map((r, i) => (
              <RevealSection key={i} delay={i * 80}>
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: r.stars }).map((_, si) => (
                      <Star key={si} size={14} className="fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">"{r.text}"</p>
                  <p className="text-xs font-medium text-gray-900">{r.name}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </RevealSection>
      <RevealSection>
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-3xl p-8 sm:p-10 text-center text-white">
          <h2 className="text-2xl font-bold mb-3">Pregatit sa gasesti creditul perfect?</h2>
          <p className="text-blue-100 mb-6 max-w-lg mx-auto">
            Foloseste simulatorul nostru gratuit si afla in 2 minute cat poti imprumuta.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-8 py-3 rounded-full bg-white text-blue-600 font-semibold hover:bg-blue-50 transition-colors hover:shadow-lg hover:shadow-white/20 hover:-translate-y-0.5 transition-all duration-300"
          >
            Incepe simularea
          </button>
        </div>
      </RevealSection>
    </div>
  );
}
