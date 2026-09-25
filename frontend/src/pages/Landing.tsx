import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';

const flights = [
  {
    src: 'https://images.unsplash.com/photo-1770567891948-6b99c393272d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    alt: 'Commercial airplane ascending through a clear blue sky',
  },
  {
    src: 'https://images.unsplash.com/photo-1582466520141-47227313dfe2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    alt: 'White airplane flying across the sky',
  },
];

const EMPLOYEE_ID_LENGTH = 12;
const OTP_LENGTH = 6;

export default function Landing() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'login' | 'otp'>('login');
  const [officerId, setOfficerId] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);

  async function handleSend() {
    if (requestingOtp) return;

    if (officerId.length !== EMPLOYEE_ID_LENGTH) {
      setError(`Employee ID must contain exactly ${EMPLOYEE_ID_LENGTH} characters.`);
      return;
    }

    setRequestingOtp(true);
    setError('');

    try {
      const response = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          employee_id: officerId,
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.message || 'Unable to send the OTP. Please try again.');
      }

      setStep('otp');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to request the OTP.');
    } finally {
      setRequestingOtp(false);
    }
  }

  async function handleVerify() {
    if (verifying) return;

    if (otp.length !== OTP_LENGTH) {
      setError(`Enter the ${OTP_LENGTH}-digit verification code.`);
      return;
    }

    setVerifying(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          employee_id: officerId,
          otp,
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.message || 'OTP verification failed. Please try again.');
      }

      navigate('/dashboard');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to verify the OTP.');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="min-h-screen bg-amber-50/40">
      <TopBar title="Border Officer Access" />

      <div className="flag-stage relative min-h-[17rem] overflow-hidden border-b border-orange-100">
        <div className="flag-flow absolute inset-0 opacity-90" aria-hidden="true">
          <div className="h-1/3 bg-orange-400/85" />
          <div className="relative flex h-1/3 items-center justify-center bg-white/95">
            <div className="chakra-watermark size-20 rounded-full border-2 border-blue-800/25" />
          </div>
          <div className="h-1/3 bg-emerald-600/85" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-navy/90 via-navy/35 to-transparent" />

        <div className="relative mx-auto flex min-h-[17rem] max-w-6xl items-center justify-between gap-8 px-6 py-7 lg:px-10">
          <div className="max-w-md text-white">
            <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.24em] text-orange-200">Seva · Suraksha · Samman</div>
            <div className="text-3xl font-bold leading-tight tracking-tight">Secure borders.<br />Welcoming journeys.</div>
            <p className="mt-3 text-xs leading-relaxed text-white/65">Identity intelligence rooted in service, vigilance, and respect for every traveler.</p>
          </div>

          <div className="hidden w-[28rem] md:block">
            <div className="relative h-36 overflow-hidden">
              {flights.map((flight, index) => (
                <figure
                  key={flight.src}
                  className={`flight-card absolute top-2 w-52 overflow-hidden rounded-2xl border-4 border-white/80 bg-white shadow-2xl ${index === 1 ? 'flight-card-delayed' : ''}`}
                >
                  <img src={flight.src} alt={flight.alt} className="h-24 w-full object-cover" />
                  <figcaption className="px-3 py-2 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                    Safe passage · Indian skies
                  </figcaption>
                </figure>
              ))}
            </div>
            <blockquote className="mt-1 text-center text-xs italic text-white/80">
              “Every journey deserves a secure beginning and a dignified welcome.”
            </blockquote>
          </div>
        </div>
      </div>

      <div className="heritage-grid mx-auto grid max-w-6xl items-start gap-10 px-6 py-10 lg:grid-cols-[1fr_25rem] lg:px-10">
        <div className="pt-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-orange-700">
            <span className="size-1.5 rounded-full bg-orange-500" />
            National identity operations
          </div>
          <div className="mt-5 max-w-xl text-4xl font-bold leading-tight tracking-tight text-slate-900">
            Intelligence with the spirit of India.
          </div>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-slate-500">
            Authenticate documents, verify live biometrics, and assess risk through one secure and explainable workflow.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            {['Document integrity', 'Live biometric match', 'Responsible risk review'].map((item, index) => (
              <div key={item} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <span className={`size-2 rounded-full ${index === 0 ? 'bg-orange-400' : index === 1 ? 'bg-blue-700' : 'bg-emerald-600'}`} />
                <span className="text-[10px] font-semibold text-slate-600">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-xl shadow-orange-100/60">
          <div className="flex h-1" aria-hidden="true">
            <span className="flex-1 bg-orange-400" />
            <span className="flex-1 bg-white" />
            <span className="flex-1 bg-emerald-600" />
          </div>
          <div className="border-b border-slate-100 px-6 py-5">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-orange-600">Authorized access</div>
            <div className="mt-2 text-xl font-bold text-slate-900">{step === 'login' ? 'Officer sign in' : 'Verify your identity'}</div>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {step === 'login' ? 'Use your assigned credentials to enter the operations workspace.' : 'Enter the code sent to your registered device.'}
            </p>
          </div>

          <div className="p-6">
            {step === 'login' ? (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-600">Employee ID</label>
                  <span className="text-[10px] text-slate-400">{officerId.length}/{EMPLOYEE_ID_LENGTH}</span>
                </div>
                <input
                  type="text"
                  placeholder="e.g. OFF-2024-001"
                  value={officerId}
                  maxLength={EMPLOYEE_ID_LENGTH}
                  autoComplete="username"
                  onChange={(event) => {
                    setOfficerId(event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, EMPLOYEE_ID_LENGTH));
                    setError('');
                  }}
                  onKeyDown={(event) => event.key === 'Enter' && handleSend()}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-50"
                />
                {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
                <button
                  onClick={handleSend}
                  disabled={requestingOtp}
                  className="mt-5 w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {requestingOtp ? 'Requesting OTP…' : 'Request OTP'}
                </button>
              </>
            ) : (
              <>
                <label className="mb-2 block text-xs font-semibold text-slate-600">Verification code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  value={otp}
                  maxLength={OTP_LENGTH}
                  autoComplete="one-time-code"
                  onChange={(event) => {
                    setOtp(event.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH));
                    setError('');
                  }}
                  onKeyDown={(event) => event.key === 'Enter' && handleVerify()}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm font-semibold tracking-[0.35em] text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-50"
                />
                {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
                <button
                  onClick={handleVerify}
                  disabled={verifying}
                  className="mt-5 w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {verifying ? 'Verifying…' : 'Verify and sign in'}
                </button>
                <button onClick={() => { setStep('login'); setError(''); }} className="mt-3 w-full py-2 text-xs font-medium text-slate-400 transition hover:text-slate-600">
                  Back to sign in
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50 px-6 py-3 text-[10px] text-slate-400">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Encrypted officer authentication
          </div>
        </div>
      </div>
    </div>
  );
}
