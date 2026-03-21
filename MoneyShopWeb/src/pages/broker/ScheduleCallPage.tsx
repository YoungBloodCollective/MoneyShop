import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Calendar, Clock, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '13:00', '13:30', '14:00', '14:30', '15:00',
  '15:30', '16:00', '16:30', '17:00',
];

function getNextWeekdays(count: number): Date[] {
  const days: Date[] = [];
  const date = new Date();
  date.setDate(date.getDate() + 1); // Start from tomorrow
  while (days.length < count) {
    const day = date.getDay();
    if (day !== 0 && day !== 6) { // Skip weekends
      days.push(new Date(date));
    }
    date.setDate(date.getDate() + 1);
  }
  return days;
}

const DAY_NAMES = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sam'];
const MONTH_NAMES = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ScheduleCallPage() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const availableDays = useMemo(() => getNextWeekdays(10), []);

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error('Selecteaza o data si o ora');
      return;
    }
    setLoading(true);
    try {
      // TODO: API call to schedule the call
      // await brokerApi.scheduleCall({ date: selectedDate, time: selectedTime, note });
      await new Promise(r => setTimeout(r, 800)); // Simulate API call
      setSubmitted(true);
      toast.success('Apel programat cu succes!');
    } catch {
      toast.error('Eroare la programare. Incearca din nou.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-success-500/15 flex items-center justify-center">
          <CheckCircle size={40} className="text-success-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-light-100 mb-2">Apel programat!</h1>
          <p className="text-light-60">
            Un broker te va contacta pe <span className="text-light-90 font-medium">{selectedDate}</span> la ora <span className="text-light-90 font-medium">{selectedTime}</span>.
          </p>
        </div>
        <div className="bg-dark-700 border border-dark-400 rounded-xl p-4 text-sm text-light-50">
          Asigura-te ca esti disponibil la numarul de telefon din contul tau.
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-6 py-3 rounded-full bg-brand-primary text-white font-medium hover:bg-brand-primary/90 transition-all"
        >
          Inapoi la dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-light-60 hover:text-light-80">
        <ArrowLeft size={16} /> Inapoi
      </button>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-brand-primary/15 flex items-center justify-center">
          <Phone size={20} className="text-brand-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-light-100">Programeaza un apel</h1>
          <p className="text-sm text-light-60">Un broker te va suna la ora aleasa</p>
        </div>
      </div>

      {/* Date selection */}
      <div className="bg-dark-700 border border-dark-400 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={18} className="text-brand-primary" />
          <h2 className="text-sm font-semibold text-light-100">Alege data</h2>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {availableDays.map(day => {
            const dateStr = day.toISOString().split('T')[0];
            const isSelected = selectedDate === dateStr;
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`flex flex-col items-center p-2.5 rounded-xl transition-all ${
                  isSelected
                    ? 'bg-brand-primary text-white'
                    : 'bg-dark-600 text-light-60 hover:bg-dark-500'
                }`}
              >
                <span className="text-[10px] uppercase">{DAY_NAMES[day.getDay()]}</span>
                <span className="text-lg font-bold">{day.getDate()}</span>
                <span className="text-[10px]">{MONTH_NAMES[day.getMonth()]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time selection */}
      {selectedDate && (
        <div className="bg-dark-700 border border-dark-400 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-brand-primary" />
            <h2 className="text-sm font-semibold text-light-100">Alege ora</h2>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {TIME_SLOTS.map(time => {
              const isSelected = selectedTime === time;
              return (
                <button
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-brand-primary text-white'
                      : 'bg-dark-600 text-light-60 hover:bg-dark-500'
                  }`}
                >
                  {time}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Note */}
      {selectedDate && selectedTime && (
        <div className="bg-dark-700 border border-dark-400 rounded-2xl p-5">
          <label className="block text-sm font-medium text-light-70 mb-2">Nota (optional)</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Ex: Vreau sa discut despre refinantarea unui credit ipotecar..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-dark-600 border border-dark-400 text-light-90 placeholder:text-light-50 focus:border-brand-primary focus:outline-none transition-colors resize-none text-sm"
          />
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!selectedDate || !selectedTime || loading}
        className="w-full h-12 rounded-full bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-brand-primary/25 flex items-center justify-center gap-2"
      >
        <Phone size={18} />
        {loading ? 'Se programeaza...' : 'Programeaza apelul'}
      </button>
    </div>
  );
}
