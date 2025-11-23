
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, ChevronLeft, ChevronRight, PieChart, LayoutDashboard, CalendarRange, List, Loader2, WifiOff, Settings } from 'lucide-react';
import { Bill, MonthlyStats } from './types';
import { GlassCard } from './components/ui/GlassCard';
import { BillItem } from './components/BillItem';
import { EditModal } from './components/EditModal';
import { YearlySummary } from './components/YearlySummary';
import { formatCurrency, getMonthYearLabel } from './utils';
import { supabase, isSupabaseConfigured } from './supabaseClient';

type ViewMode = 'month' | 'year';

const App: React.FC = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);

  // --- Supabase Integration ---

  const fetchBills = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!isSupabaseConfigured) {
        throw new Error("MISSING_CONFIG");
      }

      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .order('due_date', { ascending: true });

      if (error) throw error;
      
      const formattedBills: Bill[] = (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        amount: item.amount,
        dueDate: item.due_date,
        isPaid: item.is_paid,
        isRecurring: item.is_recurring,
        category: item.category
      }));

      setBills(formattedBills);
    } catch (err: any) {
      console.error('Error fetching bills:', err);
      
      if (err.message === "MISSING_CONFIG") {
          setError("Brak konfiguracji bazy danych.");
      } else if (err.message && (err.message.includes('fetch') || err.message.includes('network'))) {
          setError("Problem z połączeniem internetowym.");
      } else {
          setError("Nie udało się pobrać danych. Sprawdź konfigurację Supabase.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  // Filter bills for the currently selected month and year
  const filteredBills = useMemo(() => {
    return bills.filter(bill => {
      const billDate = new Date(bill.dueDate);
      return (
        billDate.getMonth() === currentDate.getMonth() &&
        billDate.getFullYear() === currentDate.getFullYear()
      );
    }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [bills, currentDate]);

  // Calculate statistics
  const stats: MonthlyStats = useMemo(() => {
    return filteredBills.reduce((acc, bill) => {
      acc.total += bill.amount;
      if (bill.isPaid) {
        acc.paid += bill.amount;
      } else {
        acc.pending += bill.amount;
      }
      return acc;
    }, { total: 0, paid: 0, pending: 0 });
  }, [filteredBills]);

  const percentagePaid = stats.total === 0 ? 0 : Math.round((stats.paid / stats.total) * 100);

  const handlePrev = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (viewMode === 'month') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setFullYear(prev.getFullYear() - 1);
      }
      return newDate;
    });
  };

  const handleNext = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (viewMode === 'month') {
        newDate.setMonth(prev.getMonth() + 1);
      } else {
        newDate.setFullYear(prev.getFullYear() + 1);
      }
      return newDate;
    });
  };

  const toggleBillPaid = async (id: string) => {
    if (!isSupabaseConfigured) return;

    const billToUpdate = bills.find(b => b.id === id);
    if (!billToUpdate) return;

    const newStatus = !billToUpdate.isPaid;

    // Optimistic Update (natychmiastowa zmiana w UI)
    setBills(prev => prev.map(bill => 
      bill.id === id ? { ...bill, isPaid: newStatus } : bill
    ));

    try {
      const { error } = await supabase
        .from('bills')
        .update({ is_paid: newStatus })
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error("Error updating status:", err);
      // Revert if error
      setBills(prev => prev.map(bill => 
        bill.id === id ? { ...bill, isPaid: !newStatus } : bill
      ));
      alert("Błąd synchronizacji. Sprawdź połączenie.");
    }
  };

  const handleDeleteBill = async (id: string) => {
    if (!isSupabaseConfigured) return;

    // Optimistic delete
    const previousBills = [...bills];
    setBills(prev => prev.filter(b => b.id !== id));
    setIsModalOpen(false);

    try {
        const { error } = await supabase
            .from('bills')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
    } catch (err) {
        console.error("Error deleting:", err);
        setBills(previousBills);
        alert("Błąd podczas usuwania.");
    }
  };

  const handleSaveBill = async (billData: Bill, isNew: boolean, createSeries: boolean) => {
    if (!isSupabaseConfigured) {
        alert("Brak połączenia z bazą. Nie można zapisać.");
        return;
    }

    // Przygotowanie danych do wysyłki (format bazy danych snake_case)
    const preparePayload = (b: Bill) => ({
        name: b.name,
        amount: b.amount,
        due_date: b.dueDate,
        is_paid: b.isPaid,
        is_recurring: b.isRecurring,
        category: b.category
    });

    try {
        if (isNew) {
            if (createSeries) {
                // Create for next 12 months including current
                const newBillsPayload = [];
                const startDate = new Date(billData.dueDate);
                
                for (let i = 0; i < 12; i++) {
                    const nextDate = new Date(startDate);
                    nextDate.setMonth(startDate.getMonth() + i);
                    
                    newBillsPayload.push({
                        ...preparePayload(billData),
                        due_date: nextDate.toISOString(),
                        is_paid: i === 0 ? billData.isPaid : false // Only first one might be paid
                    });
                }
                
                const { data, error } = await supabase.from('bills').insert(newBillsPayload).select();
                if (error) throw error;
                
                // Refresh local state with real data from DB (with real IDs)
                if (data) {
                    const addedBills = data.map((item: any) => ({
                        id: item.id,
                        name: item.name,
                        amount: item.amount,
                        dueDate: item.due_date,
                        isPaid: item.is_paid,
                        isRecurring: item.is_recurring,
                        category: item.category
                    }));
                    setBills(prev => [...prev, ...addedBills]);
                }

            } else {
                const { data, error } = await supabase.from('bills').insert(preparePayload(billData)).select();
                if (error) throw error;
                if (data) {
                     const addedBill = {
                        ...billData,
                        id: data[0].id // Use real ID from DB
                     };
                     setBills(prev => [...prev, addedBill]);
                }
            }
        } else {
            // Update
            const { error } = await supabase
                .from('bills')
                .update(preparePayload(billData))
                .eq('id', billData.id);
            
            if (error) throw error;

            setBills(prev => prev.map(b => b.id === billData.id ? billData : b));
        }
    } catch (err) {
        console.error("Error saving bill:", err);
        alert("Wystąpił błąd podczas zapisywania.");
    }
  };

  const openAddModal = () => {
    setEditingBill(null);
    setIsModalOpen(true);
  };

  const openEditModal = (bill: Bill) => {
    setEditingBill(bill);
    setIsModalOpen(true);
  };

  return (
    <div className="relative min-h-screen w-full bg-black text-white font-sans overflow-x-hidden selection:bg-purple-500/30">
      
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0">
         <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/30 rounded-full blur-[120px] animate-blob"></div>
         <div className="absolute top-[40%] right-[-10%] w-[400px] h-[400px] bg-pink-600/20 rounded-full blur-[100px] animate-blob animation-delay-2000"></div>
         <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] bg-purple-900/30 rounded-full blur-[120px] animate-blob animation-delay-4000"></div>
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
      </div>

      <div className="relative z-10 max-w-lg mx-auto pb-24">
        
        {/* Header Section */}
        <header className="pt-12 px-6 pb-6 sticky top-0 z-20 bg-black/5 backdrop-blur-md border-b border-white/5">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/50">
              LiquidBills
            </h1>
            
            {/* View Mode Toggle */}
            <div className="flex bg-white/5 p-1 rounded-full border border-white/10">
                <button 
                    onClick={() => setViewMode('month')}
                    className={`p-2 rounded-full transition-all ${viewMode === 'month' ? 'bg-white/10 text-white' : 'text-white/40'}`}
                >
                    <List size={20} />
                </button>
                <button 
                    onClick={() => setViewMode('year')}
                    className={`p-2 rounded-full transition-all ${viewMode === 'year' ? 'bg-white/10 text-white' : 'text-white/40'}`}
                >
                    <CalendarRange size={20} />
                </button>
            </div>
          </div>

          {/* Date Selector */}
          <div className="flex items-center justify-between bg-white/5 p-1 rounded-2xl border border-white/10">
            <button onClick={handlePrev} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
              <ChevronLeft size={20} className="text-white/70" />
            </button>
            <span className="font-semibold text-lg capitalize tracking-wide">
              {viewMode === 'month' ? getMonthYearLabel(currentDate) : currentDate.getFullYear()}
            </span>
            <button onClick={handleNext} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
              <ChevronRight size={20} className="text-white/70" />
            </button>
          </div>
        </header>

        {loading ? (
           <div className="flex flex-col items-center justify-center h-[50vh] text-white/50 gap-4 animate-pulse">
               <Loader2 className="animate-spin" size={32} />
               <span>Ładowanie z chmury...</span>
           </div> 
        ) : error ? (
           <div className="flex flex-col items-center justify-center h-[50vh] text-red-400 gap-4 p-6 text-center">
               <div className="p-4 bg-red-500/10 rounded-full border border-red-500/20"><WifiOff size={32} /></div>
               <h3 className="text-xl font-bold text-white">Błąd Połączenia</h3>
               <p className="text-white/60 text-sm">{error}</p>
               
               {!isSupabaseConfigured && (
                 <div className="mt-4 p-4 bg-white/5 rounded-xl text-left border border-white/10">
                    <p className="text-xs text-white/40 mb-2 font-bold uppercase">Konfiguracja Netlify:</p>
                    <code className="text-[10px] text-blue-300 block mb-1">VITE_SUPABASE_URL</code>
                    <code className="text-[10px] text-blue-300 block">VITE_SUPABASE_ANON_KEY</code>
                 </div>
               )}
               
               <button 
                onClick={() => fetchBills()}
                className="mt-4 px-6 py-2 bg-white text-black font-bold rounded-xl text-sm hover:scale-105 transition-transform"
               >
                 Spróbuj ponownie
               </button>
           </div>
        ) : viewMode === 'month' ? (
            <>
                {/* Dashboard Cards (Month View) */}
                <div className="px-6 mt-4 grid grid-cols-2 gap-4 animate-slide-up">
                <GlassCard className="p-5 flex flex-col justify-between h-32 bg-green-900/10 border-green-500/20">
                    <div className="flex justify-between items-start">
                    <div className="p-2 rounded-full bg-green-500/20 text-green-400">
                        <PieChart size={18} />
                    </div>
                    <span className="text-xs font-bold text-green-400/80 uppercase">Zapłacone</span>
                    </div>
                    <div>
                    <span className="text-2xl font-bold block">{formatCurrency(stats.paid)}</span>
                    <div className="w-full bg-green-900/30 h-1.5 mt-2 rounded-full overflow-hidden">
                        <div className="bg-green-400 h-full rounded-full transition-all duration-1000" style={{ width: `${percentagePaid}%` }}></div>
                    </div>
                    </div>
                </GlassCard>

                <GlassCard className="p-5 flex flex-col justify-between h-32 bg-red-900/10 border-red-500/20">
                    <div className="flex justify-between items-start">
                    <div className="p-2 rounded-full bg-red-500/20 text-red-400">
                        <PieChart size={18} />
                    </div>
                    <span className="text-xs font-bold text-red-400/80 uppercase">Do zapłaty</span>
                    </div>
                    <div>
                    <span className="text-2xl font-bold block">{formatCurrency(stats.pending)}</span>
                    <span className="text-xs text-white/40 mt-1 block">Z {formatCurrency(stats.total)}</span>
                    </div>
                </GlassCard>
                </div>

                {/* List Section */}
                <div className="px-6 mt-8 animate-slide-up">
                <h2 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-4 ml-1">
                    Twoje Rachunki
                </h2>
                
                {filteredBills.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center opacity-50">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                            <LayoutDashboard size={32} className="text-white/30" />
                        </div>
                        <p className="text-white/60">Brak rachunków w tym miesiącu.</p>
                        <p className="text-xs text-white/30 mt-1">Dodaj pierwszy przyciskiem poniżej.</p>
                    </div>
                ) : (
                    <div className="space-y-4 pb-20">
                        {filteredBills.map(bill => (
                            <BillItem 
                                key={bill.id} 
                                bill={bill} 
                                onTogglePaid={toggleBillPaid}
                                onEdit={openEditModal}
                            />
                        ))}
                    </div>
                )}
                </div>
            </>
        ) : (
            /* Year View */
            <div className="px-6 mt-4 pb-20">
                <YearlySummary bills={bills} year={currentDate.getFullYear()} />
            </div>
        )}

        {/* Floating Action Button - Only in Month View */}
        {viewMode === 'month' && !loading && !error && (
            <div className="fixed bottom-8 left-0 right-0 flex justify-center z-40 pointer-events-none">
                <button 
                    onClick={openAddModal}
                    className="pointer-events-auto group flex items-center justify-center w-16 h-16 bg-white text-black rounded-full shadow-[0_0_40px_-10px_rgba(255,255,255,0.5)] hover:scale-110 active:scale-95 transition-all duration-300"
                >
                    <Plus size={32} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-300" />
                </button>
            </div>
        )}

      </div>

      <EditModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveBill}
        onDelete={handleDeleteBill}
        initialBill={editingBill}
        currentDateContext={currentDate}
      />
    </div>
  );
};

export default App;
