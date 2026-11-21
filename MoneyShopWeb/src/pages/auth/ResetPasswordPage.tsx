import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';
import { authApi } from '@/services/api/authApi';

const MIN_LENGTH = 8;

const serverMessage = (err: unknown) =>
  axios.isAxiosError(err) && typeof err.response?.data?.message === 'string' ? err.response.data.message as string : null;

/** The page behind the link from the "Am uitat parola" email: choose a new password. */
export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<'checking' | 'ready' | 'invalid'>(token ? 'checking' : 'invalid');
  const [invalidMessage, setInvalidMessage] = useState('Linkul nu este valid sau a fost deja folosit.');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    let active = true;
    authApi.checkResetToken(token)
      .then(() => { if (active) setState('ready'); })
      .catch(err => {
        if (!active) return;
        setInvalidMessage(serverMessage(err) ?? 'Linkul nu este valid sau a fost deja folosit.');
        setState('invalid');
      });
    return () => { active = false; };
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < MIN_LENGTH) { setError(`Parola trebuie să aibă cel puțin ${MIN_LENGTH} caractere.`); return; }
    if (password !== confirm) { setError('Parolele nu coincid.'); return; }
    setSaving(true);
    try {
      await authApi.resetPassword(token, password);
      toast.success('Parola a fost schimbată. Te poți autentifica.');
      navigate('/auth/login', { replace: true });
    } catch (err) {
      const message = serverMessage(err) ?? 'Nu am putut schimba parola. Încearcă din nou.';
      if (axios.isAxiosError(err) && (err.response?.status === 410 || err.response?.data?.code === 'invalid')) {
        setInvalidMessage(message);
        setState('invalid');
      } else {
        setError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  const input = 'w-full h-12 pl-11 pr-11 rounded-2xl bg-dark-800 border border-dark-600 text-light-90 placeholder:text-light-50 focus:border-brand-primary focus:outline-none transition-colors';

  return (
    <div className="bg-white rounded-3xl p-8 shadow-lg shadow-black/5">
      <Link to="/auth/login" className="flex items-center gap-1 text-sm text-light-60 hover:text-light-80 mb-6">
        <ArrowLeft size={16} /> Înapoi la autentificare
      </Link>

      <h1 className="text-2xl font-medium text-light-100 mb-2">Alege o parolă nouă</h1>

      {state === 'checking' && (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-light-50" aria-label="Se verifică linkul" /></div>
      )}

      {state === 'invalid' && (
        <div className="py-4">
          <p role="alert" className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{invalidMessage}</p>
          <Link to="/auth/forgot-password" className="block w-full rounded-full bg-brand-primary py-3 text-center font-semibold text-white hover:bg-brand-primary/90">
            Cere un link nou
          </Link>
        </div>
      )}

      {state === 'ready' && (
        <form onSubmit={submit} className="mt-6 space-y-5" noValidate>
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-light-70 mb-1.5">Parolă nouă</label>
            <div className="relative">
              <KeyRound size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-light-50" aria-hidden="true" />
              <input
                id="new-password"
                type={show ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={`Cel puțin ${MIN_LENGTH} caractere`}
                className={input}
              />
              <button
                type="button"
                onClick={() => setShow(s => !s)}
                aria-label={show ? 'Ascunde parola' : 'Arată parola'}
                aria-pressed={show}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-light-50 hover:text-light-80"
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-light-70 mb-1.5">Repetă parola</label>
            <div className="relative">
              <KeyRound size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-light-50" aria-hidden="true" />
              <input
                id="confirm-password"
                type={show ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className={input}
              />
            </div>
          </div>
          {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full h-12 rounded-full bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {saving ? 'Se salvează...' : 'Salvează parola'}
          </button>
        </form>
      )}
    </div>
  );
}
