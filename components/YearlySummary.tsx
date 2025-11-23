import React, { useMemo } from 'react';
import { Bill, BillCategory, CATEGORY_ICONS } from '../types';
import { formatCurrency } from '../utils';
import { GlassCard } from './ui/GlassCard';

interface YearlySummaryProps {
  bills: Bill[];
  year: number;
}

export const YearlySummary: React.FC<YearlySummaryProps> = ({ bills, year }) => {
  // Filter bills for the specific year
  const yearlyBills = useMemo(() => {
    return bills.filter(b => new Date(b.dueDate).getFullYear() === year);
  }, [bills, year]);

  // Calculate monthly totals for the chart
  const monthlyData = useMemo(() => {
    const data = new Array(12).fill(0);
    yearlyBills.forEach(bill => {
      const monthIndex = new Date(bill.dueDate).getMonth();
      data[monthIndex] += bill.amount;
    });
    return data;
  }, [yearlyBills]);

  // Calculate category totals
  const categoryData = useMemo(() => {
    const categories: Record<string, number> = {};
    let total = 0;

    yearlyBills.forEach(bill => {
      categories[bill.category] = (categories[bill.category] || 0) + bill.amount;
      total += bill.amount;
    });

    return Object.entries(categories)
      .map(([cat, amount]) => ({
        category: cat as BillCategory,
        amount,
        percentage: total === 0 ? 0 : (amount / total) * 100
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [yearlyBills]);

  const totalYearly = monthlyData.reduce((a, b) => a + b, 0);
  const maxMonthValue = Math.max(...monthlyData, 1); // Avoid division by zero
  const monthNames = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Total Year Card */}
      <GlassCard className="p-6 text-center bg-blue-900/10 border-blue-500/20">
        <span className="text-sm font-bold text-blue-300 uppercase tracking-widest">Wydano w {year}</span>
        <h2 className="text-4xl font-extrabold mt-2 text-white drop-shadow-lg">
          {formatCurrency(totalYearly)}
        </h2>
        <p className="text-xs text-white/50 mt-1">
          Średnio {formatCurrency(totalYearly / 12)} / msc
        </p>
      </GlassCard>

      {/* Monthly Chart */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
        <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-6 ml-1">
          Wykres miesięczny
        </h3>
        <div className="flex items-end justify-between h-48 gap-2">
          {monthlyData.map((amount, index) => {
            const heightPercentage = (amount / maxMonthValue) * 100;
            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="w-full relative flex items-end h-full">
                  <div 
                    style={{ height: `${heightPercentage}%` }}
                    className={`w-full rounded-t-md min-h-[4px] transition-all duration-1000 ease-out relative group-hover:bg-blue-400
                      ${amount > 0 ? 'bg-white/20' : 'bg-white/5'}
                    `}
                  >
                     {/* Tooltip for value */}
                     {amount > 0 && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/10 z-10">
                            {Math.round(amount)} zł
                        </div>
                     )}
                  </div>
                </div>
                <span className="text-[9px] text-white/30 font-medium uppercase">{monthNames[index]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category Breakdown */}
      <div>
        <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest mb-4 ml-1">
          Według Kategorii
        </h3>
        <div className="space-y-3">
          {categoryData.length === 0 ? (
             <p className="text-white/30 text-center py-4 text-sm">Brak danych dla tego roku.</p>
          ) : (
            categoryData.map((item) => (
                <GlassCard key={item.category} className="p-4 flex items-center gap-4">
                <div className="text-2xl bg-white/5 p-2 rounded-full">
                    {CATEGORY_ICONS[item.category]}
                </div>
                <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold">{item.category}</span>
                        <span className="font-bold text-white/80">{formatCurrency(item.amount)}</span>
                    </div>
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                        <div 
                            className="bg-purple-400 h-full rounded-full" 
                            style={{ width: `${item.percentage}%` }}
                        />
                    </div>
                </div>
                </GlassCard>
            ))
          )}
        </div>
      </div>
    </div>
  );
};