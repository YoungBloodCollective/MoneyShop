import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBroker, useBrokerContact } from '@/context/brokerContextValue';
import { useAuth } from '@/hooks/useAuth';
import { eligibilityApi } from '@/services/api/eligibilityApi';
import { DEFAULT_CONFIG } from '@/lib/eligibility/config';
import './brokerHome.css';

const FONTS_URL = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700;800&display=swap';
const AMOUNT_MIN = 5000;
const AMOUNT_MAX = 250000;
const TERM_YEARS = [2, 3, 4, 5];

const fmt = (n: number) => new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0 }).format(n);
const pct = (n: number) => `${n.toLocaleString('ro-RO', { maximumFractionDigits: 2 })}%`;

function monthlyPayment(amount: number, annualRate: number, months: number) {
  const r = annualRate / 1200;
  return r ? (amount * r) / (1 - Math.pow(1 + r, -months)) : amount / months;
}

function rangeFill(value: number, min: number, max: number) {
  const p = max > min ? ((value - min) / (max - min)) * 100 : 100;
  return { background: `linear-gradient(to right,#6355ef ${p}%,#e9e8f4 ${p}%)` };
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('');
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

export default function BrokerHomePage() {
  const navigate = useNavigate();
  const { profile } = useBroker();
  const contact = useBrokerContact();
  const { isAuthenticated } = useAuth();
  const [rates, setRates] = useState({
    aprMin: DEFAULT_CONFIG.np.aprMin,
    aprMax: DEFAULT_CONFIG.np.aprMax,
    maxTermMonths: DEFAULT_CONFIG.np.maxTermMonths,
  });
  const [amount, setAmount] = useState(50000);
  const [years, setYears] = useState(5);
  const [rate, setRate] = useState(DEFAULT_CONFIG.np.aprMin);
  const [contactOpen, setContactOpen] = useState(false);

  useEffect(() => {
    if (document.getElementById('bh-fonts')) return;
    const link = document.createElement('link');
    link.id = 'bh-fonts';
    link.rel = 'stylesheet';
    link.href = FONTS_URL;
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    eligibilityApi.getRates()
      .then(r => {
        setRates(r.np);
        setRate(r.np.aprMin);
        setYears(y => Math.min(y, Math.max(TERM_YEARS[0], Math.floor(r.np.maxTermMonths / 12))));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!contactOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setContactOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [contactOpen]);

  if (!profile) return null;

  const terms = TERM_YEARS.filter(y => y * 12 <= rates.maxTermMonths);
  const months = years * 12;
  const payment = Math.round(monthlyPayment(amount, rate, months));
  const accountPath = isAuthenticated ? '/dashboard' : '/auth/login';
  const firstName = profile.displayName.split(/\s+/)[0];

  return (
    <div className="bh">
      <header className="wrap top">
        <a className="brand" href="#acasa" onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
          <i>↗</i>money<span>shop</span>
        </a>
        <nav className="nav">
          <a href="#simulator" onClick={e => { e.preventDefault(); scrollToId('simulator'); }}>Simulator</a>
          <a href="#servicii" onClick={e => { e.preventDefault(); scrollToId('servicii'); }}>Servicii</a>
          <a href="#cum-functioneaza" onClick={e => { e.preventDefault(); scrollToId('cum-functioneaza'); }}>Cum funcționează</a>
        </nav>
        <Link className="login" to={accountPath}>{isAuthenticated ? 'Contul meu ↗' : 'Intră în cont ↗'}</Link>
      </header>
      <main className="wrap" id="acasa">
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow"><b></b> Simplu. Digital. Cu un broker real.</span>
            <h1>Creditul potrivit.<br /><em>Fără bătăi de cap.</em></h1>
            <p className="sub">Simulezi rata în câteva secunde. Eu te ajut să găsești o soluție potrivită pentru tine.</p>
            <button className="primary" onClick={() => scrollToId('simulator')}>Calculează rata <span>↗</span></button>
            <button className="ghost" onClick={() => setContactOpen(true)}>Vorbește cu mine →</button>
          </div>
          <div className="hero-visual">
            <div className="orb">
              <svg viewBox="0 0 280 280" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <rect x="58" y="28" width="166" height="224" rx="26" fill="#FDFDFF" transform="rotate(9 58 28)" />
                <rect x="70" y="46" width="135" height="186" rx="18" fill="#EDEBFF" transform="rotate(9 70 46)" />
                <rect x="93" y="85" width="92" height="18" rx="9" fill="#C6BFFF" transform="rotate(9 93 85)" />
                <rect x="87" y="123" width="107" height="43" rx="13" fill="#6453ED" transform="rotate(9 87 123)" />
                <path d="M116 145L130 157L158 128" stroke="white" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="100" y="185" width="71" height="10" rx="5" fill="#C6BFFF" transform="rotate(9 100 185)" />
              </svg>
            </div>
            <div className="float f1"><div className="icon">✓</div><div><strong>Proces 100% online</strong><br /><small>În ritmul tău</small></div></div>
            <div className="float f2"><div className="icon">↗</div><div><strong>Broker dedicat</strong><br /><small>Asistență personală</small></div></div>
          </div>
        </section>
        <div className="broker-strip">
          <div className="broker-info">
            <div className="avatar">{initials(profile.displayName)}</div>
            <div>
              <strong>{profile.displayName} <span className="verified">✦</span></strong>
              <small>Broker de credite • Pagina mea MoneyShop</small>
            </div>
          </div>
          <div className="contact">
            <a href={contact.phoneHref}>☎ Sună-mă</a>
            <a className="whatsapp" href={`mailto:${contact.email}`}>✉ Mesaj</a>
          </div>
        </div>
        <section className="section" id="simulator">
          <div className="sectionhead">
            <div>
              <span className="kicker">Simulator interactiv</span>
              <h2>Cât ar fi rata ta?</h2>
              <p>Miști cursorul și vezi rata instant.</p>
            </div>
          </div>
          <div className="sim-layout">
            <div className="card sim-form">
              <div className="rowhead">
                <label htmlFor="bh-amount">De câți bani ai nevoie?</label>
                <span className="value">{fmt(amount)} lei</span>
              </div>
              <input
                id="bh-amount"
                aria-label="Suma creditului"
                className="range"
                type="range"
                min={AMOUNT_MIN}
                max={AMOUNT_MAX}
                step={1000}
                value={amount}
                onChange={e => setAmount(+e.target.value)}
                style={rangeFill(amount, AMOUNT_MIN, AMOUNT_MAX)}
              />
              <div className="limits"><span>{fmt(AMOUNT_MIN)} lei</span><span>{fmt(AMOUNT_MAX)} lei</span></div>
              <div className="divider"></div>
              <div className="rowhead"><label>În cât timp vrei să rambursezi?</label></div>
              <div className="pillset">
                {terms.map(y => (
                  <button key={y} className={`pill${y === years ? ' active' : ''}`} onClick={() => setYears(y)}>{y} ani</button>
                ))}
              </div>
              <div className="divider"></div>
              <div className="rowhead">
                <label htmlFor="bh-rate">DAE orientativă</label>
                <span className="value">{pct(rate)}</span>
              </div>
              <input
                id="bh-rate"
                className="range"
                type="range"
                min={rates.aprMin}
                max={rates.aprMax}
                step={0.01}
                value={rate}
                onChange={e => setRate(+e.target.value)}
                style={rangeFill(rate, rates.aprMin, rates.aprMax)}
              />
              <div className="limits"><span>{pct(rates.aprMin)}</span><span>{pct(rates.aprMax)}</span></div>
            </div>
            <div className="card sim-result">
              <div>
                <span className="result-label">Rata ta lunară estimată</span>
                <div className="payment">{fmt(payment)} <small>lei/lună</small></div>
                <div className="result-detail">
                  <div>Sumă solicitată<b>{fmt(amount)} lei</b></div>
                  <div>Perioadă<b>{months} luni</b></div>
                </div>
              </div>
              <div>
                <button className="whitebtn" onClick={() => navigate(`/dashboard/apply?tip=NP&suma=${amount}&luni=${months}`)}>
                  Vreau o ofertă personalizată →
                </button>
                <p className="note">
                  Calcul orientativ pentru un credit de nevoi personale, cu DAE între {pct(rates.aprMin)} și {pct(rates.aprMax)} în funcție de profilul tău. Nu reprezintă o ofertă de credit sau o aprobare.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="section" id="servicii">
          <div className="sectionhead">
            <div>
              <span className="kicker">Totul într-un singur loc</span>
              <h2>Contul tău. Totul simplu.</h2>
              <p>Documente, informații și solicitări — fără drumuri inutile.</p>
            </div>
          </div>
          <div className="tiles">
            <Link className="tile" to="/profile/kyc">
              <div className="tileicon">📄</div>
              <strong>Documentele mele</strong>
              <span>Încarcă documentele direct de pe telefon.</span>
              <span className="arrow">↗</span>
            </Link>
            <Link className="tile" to="/profile/bc-report">
              <div className="tileicon">📊</div>
              <strong>Rapoarte financiare</strong>
              <span>Raportul de la Biroul de Credit. ANAF în curând.</span>
              <span className="arrow">↗</span>
            </Link>
            <Link className="tile" to="/acord">
              <div className="tileicon">✍️</div>
              <strong>Acorduri & semnături</strong>
              <span>Parcurgi și semnezi documentele digital.</span>
              <span className="arrow">↗</span>
            </Link>
          </div>
        </section>
        <section className="section" id="cum-functioneaza">
          <div className="sectionhead">
            <div>
              <span className="kicker">Trei pași</span>
              <h2>Atât de simplu.</h2>
            </div>
          </div>
          <div className="steps">
            <div className="step"><span className="stepnum">1</span><div><b>Calculezi rata</b><small>În mai puțin de un minut</small></div></div>
            <div className="step"><span className="stepnum">2</span><div><b>Te conectezi în MoneyShop</b><small>Un singur cont, oriunde ai intra</small></div></div>
            <div className="step"><span className="stepnum">3</span><div><b>Discuți cu brokerul tău</b><small>Primești îndrumare personalizată</small></div></div>
          </div>
        </section>
        <footer className="footer">
          <span>© {new Date().getFullYear()} MoneyShop FINTECH SRL</span>
          <span>
            <Link to="/legal">Confidențialitate</Link> · <Link to="/legal">Termeni</Link> · <a href={`mailto:${contact.email}`}>Contact</a>
          </span>
        </footer>
      </main>
      <nav className="mobilebar" aria-label="Navigare mobilă">
        <button className="active" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><span className="emoji">⌂</span>Acasă</button>
        <button onClick={() => scrollToId('simulator')}><span className="emoji">◉</span>Simulator</button>
        <button onClick={() => navigate('/profile/kyc')}><span className="emoji">▤</span>Documente</button>
        <button onClick={() => navigate(accountPath)}><span className="emoji">♙</span>Contul meu</button>
      </nav>
      <div className={`overlay${contactOpen ? ' show' : ''}`} onClick={e => e.target === e.currentTarget && setContactOpen(false)}>
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="bh-contact-title">
          <div className="modalhead">
            <h3 id="bh-contact-title">Vorbește cu {firstName} 👋</h3>
            <button className="x" aria-label="Închide" onClick={() => setContactOpen(false)}>×</button>
          </div>
          <p>Ai o întrebare despre credit? Alege cum preferi să discutăm.</p>
          <a className="primary full" href={contact.phoneHref}>☎ Sună la {contact.phone}</a>
          <a className="login full" style={{ display: 'flex', justifyContent: 'center' }} href={`mailto:${contact.email}`}>✉ Scrie-mi pe email</a>
        </div>
      </div>
    </div>
  );
}
