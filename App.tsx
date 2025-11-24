
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, ChevronLeft, ChevronRight, PieChart, LayoutDashboard, CalendarRange, List, Loader2, WifiOff, DownloadCloud, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Bill, MonthlyStats, BillFrequency } from './types';
import { GlassCard } from './components/ui/GlassCard';
import { BillItem } from './components/BillItem';
import { EditModal } from './components/EditModal';
import { YearlySummary } from './components/YearlySummary';
import { formatCurrency, getMonthYearLabel } from './utils';
import { supabase, isSupabaseConfigured } from './supabaseClient';

type ViewMode = 'month' | 'year';
const CACHE_KEY = 'liquid_bills_local_cache';

const App: React.FC = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true); // Initial load (first time ever)
  const [isSyncing, setIsSyncing] = useState(false); // Background sync
  const [syncSuccess, setSyncSuccess] = useState(false); // Persistent success state
  const [error, setError] = useState<string | null>(null);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);

  // --- Data Loading Logic ---

  const loadFromCache = () => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
        try {
            const parsed = JSON.parse(cached);
            setBills(parsed);
            setLoading(false); // Content available, stop blocking loader
            return true;
        } catch (e) {
            console.error("Cache parse error", e);
            return false;
        }
    }
    return false;
  };

  const fetchBills = async (isBackgroundRefresh = false) => {
    try {
      if (!isBackgroundRefresh) setLoading(true);
      setIsSyncing(true);
      setError(null);
      
      // Note: We don't reset syncSuccess here immediately to avoid icon flickering 
      // if the user hits refresh manually. We update it at the end.

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
        frequency: item.frequency,
        category: item.category,
        seriesId: item.series_id
      }));

      // INTELLIGENT UPDATE:
      // Compare new data with what we currently have in localStorage (source of truth for current view).
      // If strings match, data is identical. DO NOT call setBills to avoid React re-render/flash.
      const currentCache = localStorage.getItem(CACHE_KEY);
      const newCache = JSON.stringify(formattedBills);

      if (currentCache !== newCache) {
          setBills(formattedBills);
          localStorage.setItem(CACHE_KEY, newCache);
      } else {
          console.log("Data is up to date, skipping render update.");
      }

      // Mark sync as successful permanently (until next error or sync start)
      setSyncSuccess(true);

    } catch (err: any) {
      console.error('Error fetching bills:', err);
      setSyncSuccess(false); // Clear success icon on error
      
      if (err.message === "MISSING_CONFIG") {
          setError("Brak konfiguracji bazy danych.");
      } else if (err.message && (err.message.includes('fetch') || err.message.includes('network'))) {
          // If network fails but we have cache, don't show full screen error, just a toast/log
          if (bills.length === 0) {
             setError("Problem z połączeniem internetowym.");
          }
      } else {
          setError("Nie udało się pobrać danych.");
      }
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    // 1. Try to load from cache immediately
    const hasCache = loadFromCache();
    
    // 2. Fetch fresh data (background if cache exists, foreground if not)
    fetchBills(hasCache);
  }, []);

  // Filter bills for the currently selected month and year
  const filteredBills = useMemo(() => {
    return bills.filter(bill => {
      const billDate = new Date(bill.dueDate);
      return (
        billDate.getMonth() === currentDate.getMonth() &&
        billDate.getFullYear() === currentDate.getFullYear()
      );
    }).sort((a, b) => {
        // 1. Primary Sort: Category (Alphabetical)
        const categoryCompare = a.category.localeCompare(b.category);
        if (categoryCompare !== 0) {
            return categoryCompare;
        }
        // 2. Secondary Sort: Due Date (Ascending)
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
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

  const handleExportCSV = () => {
    if (bills.length === 0) {
      alert("Brak danych do eksportu.");
      return;
    }

    const headers = ["Nazwa", "Kwota", "Data", "Kategoria", "Status", "Powtarzalny"];
    const csvContent = [
      headers.join(","),
      ...bills.map(bill => {
        const date = new Date(bill.dueDate).toLocaleDateString('pl-PL');
        const status = bill.isPaid ? "Zapłacone" : "Do zapłaty";
        const recurring = bill.isRecurring ? "Tak" : "Nie";
        return `"${bill.name}",${bill.amount},${date},${bill.category},${status},${recurring}`;
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `backup_rachunki_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleBillPaid = async (id: string) => {
    if (!isSupabaseConfigured) return;

    const billToUpdate = bills.find(b => b.id === id);
    if (!billToUpdate) return;

    const newStatus = !billToUpdate.isPaid;

    // Optimistic Update
    const updatedBills = bills.map(bill => 
      bill.id === id ? { ...bill, isPaid: newStatus } : bill
    );
    setBills(updatedBills);
    localStorage.setItem(CACHE_KEY, JSON.stringify(updatedBills)); // Update Cache immediately

    try {
      const { error } = await supabase
        .from('bills')
        .update({ is_paid: newStatus })
        .eq('id', id);

      if (error) throw error;
      setSyncSuccess(true);
    } catch (err) {
      console.error("Error updating status:", err);
      // Revert if error
      const revertedBills = bills.map(bill => 
        bill.id === id ? { ...bill, isPaid: !newStatus } : bill
      );
      setBills(revertedBills);
      localStorage.setItem(CACHE_KEY, JSON.stringify(revertedBills));
      setSyncSuccess(false);
      alert("Błąd synchronizacji. Sprawdź połączenie.");
    }
  };

  const handleDeleteBill = async (id: string) => {
    if (!isSupabaseConfigured) return;

    // Optimistic delete
    const previousBills = [...bills];
    const newBills = bills.filter(b => b.id !== id);
    setBills(newBills);
    localStorage.setItem(CACHE_KEY, JSON.stringify(newBills));
    setIsModalOpen(false);

    try {
        const { error } = await supabase
            .from('bills')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        setSyncSuccess(true);
    } catch (err) {
        console.error("Error deleting:", err);
        setBills(previousBills);
        localStorage.setItem(CACHE_KEY, JSON.stringify(previousBills));
        setSyncSuccess(false);
        alert("Błąd podczas usuwania.");
    }
  };

  const handleSaveBill = async (billData: Bill, isNew: boolean, createSeries: boolean, updateFuture: boolean) => {
    if (!isSupabaseConfigured) {
        alert("Brak połączenia z bazą. Nie można zapisać.");
        return;
    }
    
    setIsSyncing(true);

    const preparePayload = (b: Bill) => ({
        name: b.name,
        amount: b.amount,
        due_date: b.dueDate,
        is_paid: b.isPaid,
        is_recurring: b.isRecurring,
        frequency: b.frequency,
        category: b.category,
        series_id: b.seriesId || null
    });

    try {
        if (isNew) {
            if (createSeries) {
                const seriesId = crypto.randomUUID();
                const newBillsPayload = [];
                const startDate = new Date(billData.dueDate);
                const freq = billData.frequency || BillFrequency.MONTHLY;
                
                // Calculate roughly 1 year worth of bills based on frequency
                const count = Math.ceil(12 / freq) + 1;

                for (let i = 0; i < count; i++) {
                    const nextDate = new Date(startDate);
                    nextDate.setMonth(startDate.getMonth() + (i * freq));
                    
                    newBillsPayload.push({
                        ...preparePayload({ ...billData, seriesId }),
                        due_date: nextDate.toISOString(),
                        is_paid: i === 0 ? billData.isPaid : false
                    });
                }
                
                const { data, error } = await supabase.from('bills').insert(newBillsPayload).select();
                if (error) throw error;
                
                if (data) {
                    await fetchBills(true); // Full refresh to get IDs
                }

            } else {
                const { data, error } = await supabase.from('bills').insert(preparePayload(billData)).select();
                if (error) throw error;
                if (data) {
                     const addedBill = {
                        ...billData,
                        id: data[0].id,
                        seriesId: data[0].series_id
                     };
                     const newTotal = [...bills, addedBill];
                     setBills(newTotal);
                     localStorage.setItem(CACHE_KEY, JSON.stringify(newTotal));
                }
            }
        } else {
            // EDIT EXISTING
            const originalBill = bills.find(b => b.id === billData.id);
            const wasRecurring = originalBill?.isRecurring;
            const isNowRecurring = billData.isRecurring;
            
            // 1. Handle Turning OFF Recurring
            if (wasRecurring && !isNowRecurring) {
                const confirmed = confirm("Wyłączyłeś opcję 'Powtarzalny'. Czy chcesz usunąć wszystkie przyszłe rachunki z tej serii?");
                
                if (confirmed) {
                    let deleteQuery = supabase.from('bills').delete();
                    const currentDueDate = billData.dueDate;

                    if (originalBill?.seriesId) {
                        deleteQuery = deleteQuery
                            .eq('series_id', originalBill.seriesId)
                            .gt('due_date', currentDueDate);
                    } else {
                        deleteQuery = deleteQuery
                            .eq('name', originalBill?.name)
                            .eq('amount', originalBill?.amount)
                            .gt('due_date', currentDueDate);
                    }

                    const { error: deleteError } = await deleteQuery;
                    if (deleteError) throw deleteError;
                    
                    // Unlink the series ID from this bill since it's now solo
                    billData.seriesId = undefined; 
                }
            }

            // 2. Handle Update Series (e.g. Price Change, Frequency Change)
            if (wasRecurring && isNowRecurring && updateFuture && originalBill?.seriesId) {
                 
                 // Strategy: Update current -> Delete Future -> Regenerate Future
                 // This ensures dates and amounts are consistent if frequency or price changed
                 
                 // A. Update Current Bill
                 const { error: updateError } = await supabase
                    .from('bills')
                    .update(preparePayload(billData))
                    .eq('id', billData.id);

                 if (updateError) throw updateError;

                 // B. Delete Future Bills in this series
                 const { error: deleteError } = await supabase
                    .from('bills')
                    .delete()
                    .eq('series_id', originalBill.seriesId)
                    .gt('due_date', billData.dueDate); // strict greater than
                 
                 if (deleteError) throw deleteError;

                 // C. Regenerate Future Bills
                 const newBillsPayload = [];
                 const startDate = new Date(billData.dueDate);
                 const freq = billData.frequency || BillFrequency.MONTHLY;
                 
                 // Generate 1 year worth from current bill
                 const count = Math.ceil(12 / freq); 

                 for (let i = 1; i <= count; i++) { // Start from 1, future only
                    const nextDate = new Date(startDate);
                    nextDate.setMonth(startDate.getMonth() + (i * freq));
                    
                    newBillsPayload.push({
                        ...preparePayload({ ...billData, seriesId: originalBill.seriesId }),
                        due_date: nextDate.toISOString(),
                        is_paid: false // Future bills default to unpaid
                    });
                 }

                 if (newBillsPayload.length > 0) {
                     const { error: insertError } = await supabase.from('bills').insert(newBillsPayload);
                     if (insertError) throw insertError;
                 }
                 
                 await fetchBills(true); // Full refresh required
                 return; // Exit
            }
            
            // 3. Simple Update (Single Bill or Series NO update future)
            if (!(wasRecurring && isNowRecurring && updateFuture && originalBill?.seriesId)) {
                const payload = preparePayload(billData);
                // If it was recurring and now is not, we already handled delete future, 
                // but we must ensure this specific bill is updated correctly to not be series
                if (wasRecurring && !isNowRecurring) {
                    payload.series_id = null;
                }

                const { error } = await supabase
                    .from('bills')
                    .update(payload)
                    .eq('id', billData.id);
                
                if (error) throw error;

                 // Update Local State Single
                 const currentBills = bills.map(b => b.id === billData.id ? billData : b);
                 setBills(currentBills);
                 localStorage.setItem(CACHE_KEY, JSON.stringify(currentBills));
            }
        }
        setSyncSuccess(true);
    } catch (err) {
        console.error("Error saving bill:", err);
        setSyncSuccess(false);
        alert("Wystąpił błąd podczas zapisywania. Upewnij się, że dodałeś kolumnę 'frequency' do bazy danych.");
    } finally {
        setIsSyncing(false);
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
    <div className="relative min-h-screen w-full text-white font-sans selection:bg-purple-500/30">
      
      {/* Main Content Container - Handles Safe Area Bottom Padding */}
      <div className="relative z-10 max-w-lg mx-auto pb-[calc(6rem+env(safe-area-inset-bottom))]">
        
        {/* Header Section - Handles Safe Area Top Padding */}
        <header className="pt-[calc(3rem+env(safe-area-inset-top))] px-6 pb-6 sticky top-0 z-20 bg-black/5 backdrop-blur-md border-b border-white/5 transition-all">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
                <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/50">
                Liquid Bills
                </h1>
                
                <div className="flex gap-2">
                    {/* Sync Indicator */}
                    <div className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5">
                        {isSyncing ? (
                            <RefreshCw size={14} className="text-blue-400 animate-spin" />
                        ) : syncSuccess ? (
                            <CheckCircle2 size={16} className="text-green-400" />
                        ) : error ? (
                            <WifiOff size={14} className="text-red-400" />
                        ) : (
                             <div className="w-2 h-2 rounded-full bg-white/20" />
                        )}
                    </div>

                    <button 
                        onClick={handleExportCSV}
                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                        title="Pobierz backup CSV"
                    >
                        <DownloadCloud size={18} />
                    </button>
                </div>
            </div>
            
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
          <div className={`flex items-center justify-between bg-white/5 p-1 rounded-2xl border border-white/10 transition-colors duration-500`}>
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
        ) : error && bills.length === 0 ? (
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
                <div className="px-6 mt-8">
                <h2 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-4 ml-1 flex justify-between">
                    <span>Twoje Rachunki</span>
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
                    <div className="space-y-4">
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
            <div className="px-6 mt-4">
                <YearlySummary bills={bills} year={currentDate.getFullYear()} />
            </div>
        )}

        {/* Floating Action Button - Fixed above Safe Area */}
        {viewMode === 'month' && !loading && (
            <>
                {/* Gradient Fade at bottom for smoother scroll effect */}
                <div className="fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black via-black/80 to-transparent z-30 pointer-events-none" />
                
                <div className="fixed bottom-[calc(2rem+env(safe-area-inset-bottom))] left-0 right-0 flex justify-center z-50 pointer-events-none">
                    <button 
                        onClick={openAddModal}
                        className="pointer-events-auto group flex items-center justify-center w-16 h-16 bg-white text-black rounded-full shadow-[0_0_40px_-10px_rgba(255,255,255,0.5)] hover:scale-110 active:scale-95 transition-all duration-300"
                    >
                        <Plus size={32} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>
            </>
        )}

      </div>

      <EditModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveBill}
        onDelete={handleDeleteBill}
        initialBill={editingBill}
        currentDateContext={currentDate}
        existingBills={bills}
      />
    </div>
  );
};

export default App;
