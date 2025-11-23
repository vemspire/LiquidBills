
import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, Tag, Repeat, AlertCircle, Clock } from 'lucide-react';
import { Bill, BillCategory, CATEGORY_ICONS, BillFrequency } from '../types';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bill: Bill, isNew: boolean, createRecurringSeries: boolean, updateFuture: boolean) => void;
  onDelete: (id: string) => void;
  initialBill: Bill | null;
  currentDateContext: Date;
  existingBills: Bill[]; // Needed for duplicate check
}

export const EditModal: React.FC<EditModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  onDelete,
  initialBill,
  currentDateContext,
  existingBills
}) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<BillCategory>(BillCategory.OTHER);
  const [date, setDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<BillFrequency>(BillFrequency.MONTHLY);
  const [isPaid, setIsPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (initialBill) {
        setName(initialBill.name);
        setAmount(initialBill.amount.toString());
        setCategory(initialBill.category);
        setDate(initialBill.dueDate.split('T')[0]);
        setIsRecurring(initialBill.isRecurring);
        setFrequency(initialBill.frequency || BillFrequency.MONTHLY);
        setIsPaid(initialBill.isPaid);
      } else {
        // Reset for new bill
        setName('');
        setAmount('');
        setCategory(BillCategory.OTHER);
        // Default to today or the first of the currently viewed month
        const defaultDate = new Date(currentDateContext);
        const today = new Date();
        if (defaultDate.getMonth() === today.getMonth() && defaultDate.getFullYear() === today.getFullYear()) {
            setDate(today.toISOString().split('T')[0]);
        } else {
            defaultDate.setDate(1);
            setDate(defaultDate.toISOString().split('T')[0]);
        }
        setIsRecurring(false);
        setFrequency(BillFrequency.MONTHLY);
        setIsPaid(false);
      }
    }
  }, [isOpen, initialBill, currentDateContext]);

  const validateDuplicate = (checkName: string, checkDateStr: string): boolean => {
    const checkDate = new Date(checkDateStr);
    const duplicate = existingBills.find(b => {
        // Skip self if editing
        if (initialBill && b.id === initialBill.id) return false;
        
        const bDate = new Date(b.dueDate);
        const sameMonth = bDate.getMonth() === checkDate.getMonth();
        const sameYear = bDate.getFullYear() === checkDate.getFullYear();
        const sameName = b.name.trim().toLowerCase() === checkName.trim().toLowerCase();
        
        return sameMonth && sameYear && sameName;
    });

    return !!duplicate;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !amount || !date) {
        setError("Wypełnij wszystkie pola.");
        return;
    }

    // Duplicate Check
    if (validateDuplicate(name, date)) {
        setError(`Rachunek "${name}" już istnieje w tym miesiącu.`);
        return;
    }

    const billData: Bill = {
      id: initialBill ? initialBill.id : '',
      name: name.trim(),
      amount: parseFloat(amount),
      category,
      dueDate: new Date(date).toISOString(),
      isRecurring,
      frequency: isRecurring ? frequency : undefined,
      isPaid,
      seriesId: initialBill?.seriesId
    };

    let updateFuture = false;
    // Logic to ask about updating series if editing a recurring bill
    if (initialBill && initialBill.seriesId && initialBill.isRecurring) {
        // Simple confirmation using window for now, could be a custom UI modal later
        // Only ask if critical data changed
        if (initialBill.amount !== parseFloat(amount) || initialBill.name !== name) {
             const result = window.confirm("To rachunek cykliczny. Czy chcesz zaktualizować cenę/nazwę również dla przyszłych rachunków z tej serii?");
             updateFuture = result;
        }
    }

    const createSeries = !initialBill && isRecurring;
    
    onSave(billData, !initialBill, createSeries, updateFuture);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" 
        onClick={onClose}
      />

      <div className="relative w-full sm:max-w-md bg-[#1a1a1a] sm:rounded-3xl rounded-t-3xl border-t sm:border border-white/10 shadow-2xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
            {initialBill ? 'Edytuj Rachunek' : 'Nowy Rachunek'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
            <X className="text-white/70" size={24} />
          </button>
        </div>

        {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
                <AlertCircle size={18} />
                <span>{error}</span>
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Amount Input */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <DollarSign size={20} className="text-white/40 group-focus-within:text-blue-400" />
            </div>
            <input 
              type="number" 
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-black/20 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-3xl font-bold text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 transition-all"
              autoFocus={!initialBill}
            />
          </div>

          {/* Name Input */}
          <div className="space-y-2">
            <label className="text-xs text-white/40 uppercase tracking-widest font-bold ml-1">Nazwa</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="np. Netflix, Czynsz..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:bg-white/10 transition-all"
            />
          </div>

          {/* Date & Category Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-white/40 uppercase tracking-widest font-bold ml-1 flex items-center gap-1">
                <Calendar size={12} /> Data
              </label>
              <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:bg-white/10 transition-all [color-scheme:dark]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-white/40 uppercase tracking-widest font-bold ml-1 flex items-center gap-1">
                 <Tag size={12} /> Kategoria
              </label>
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value as BillCategory)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:bg-white/10 transition-all appearance-none"
              >
                {Object.values(BillCategory).map((cat) => (
                  <option key={cat} value={cat} className="bg-gray-900 text-white">
                     {CATEGORY_ICONS[cat]} {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Recurring Toggles */}
          <div className="space-y-3">
            <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isRecurring ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-white/40'}`}>
                        <Repeat size={20} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-white">Powtarzalny</span>
                        <span className="text-xs text-white/40">Tworzy serię rachunków</span>
                    </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                </label>
            </div>
            
            {/* Frequency Selector - Only if Recurring */}
            {isRecurring && (
                 <div className="p-4 bg-white/5 rounded-2xl border border-white/5 animate-slide-up">
                    <div className="flex items-center gap-2 mb-3 text-white/60">
                         <Clock size={14} />
                         <span className="text-xs font-bold uppercase tracking-wide">Częstotliwość</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { label: 'Co miesiąc', val: BillFrequency.MONTHLY },
                            { label: 'Co kwartał', val: BillFrequency.QUARTERLY },
                            { label: 'Co pół roku', val: BillFrequency.SEMIANNUAL },
                            { label: 'Co rok', val: BillFrequency.ANNUAL },
                        ].map((opt) => (
                            <button
                                key={opt.val}
                                type="button"
                                onClick={() => setFrequency(opt.val)}
                                className={`py-2 px-3 rounded-xl text-xs font-medium transition-all ${frequency === opt.val ? 'bg-blue-500 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                 </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
             {initialBill && (
                 <button 
                    type="button"
                    onClick={() => onDelete(initialBill.id)}
                    className="flex-1 py-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold rounded-2xl border border-red-500/20 transition-all"
                 >
                    Usuń
                 </button>
             )}
             <button 
                type="submit"
                className="flex-[2] py-4 bg-white text-black font-bold rounded-2xl shadow-lg shadow-white/10 hover:scale-[1.02] transition-transform"
             >
                {initialBill ? 'Zapisz Zmiany' : 'Dodaj Rachunek'}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};
