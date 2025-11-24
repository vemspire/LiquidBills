import React from 'react';
import { CheckCircle2, Circle, Edit2 } from 'lucide-react';
import { Bill, CATEGORY_ICONS } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { GlassCard } from './ui/GlassCard';

interface BillItemProps {
  bill: Bill;
  onTogglePaid: (id: string) => void;
  onEdit: (bill: Bill) => void;
  index: number;
}

export const BillItem: React.FC<BillItemProps> = ({ bill, onTogglePaid, onEdit, index }) => {
  const isPaid = bill.isPaid;
  // Added !important to ensure colors override glass defaults on iOS
  const statusColor = isPaid ? '!bg-green-500/30 !border-green-400/40' : '!bg-red-500/30 !border-red-400/40';
  const iconColor = isPaid ? 'text-green-300' : 'text-red-300';

  return (
    <div 
      className="animate-enter-ios opacity-0 fill-mode-forwards"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <GlassCard 
        className={`p-4 border ${statusColor}`}
        interactive
        onClick={() => onTogglePaid(bill.id)}
      >
        {/* 
            Fix: Added an inner container with 'flex w-full' 
            to handle layout inside the GlassCard's z-index wrapper 
        */}
        <div className="flex items-center justify-between w-full">
            
            {/* LEFT SIDE: Icon & Info */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className={`p-3 rounded-full bg-white/10 text-2xl shadow-inner shrink-0`}>
                    {CATEGORY_ICONS[bill.category]}
                </div>
                
                <div className="flex flex-col min-w-0 overflow-hidden">
                    <span className={`font-semibold text-lg truncate transition-all duration-300 ${isPaid ? 'text-white/50 line-through decoration-white/30' : 'text-white'}`}>
                    {bill.name}
                    </span>
                    <span className="text-xs text-white/50 truncate">
                    {formatDate(bill.dueDate)} • {bill.isRecurring ? '🔄 Cykliczny' : 'Jednorazowy'}
                    </span>
                </div>
            </div>

            {/* RIGHT SIDE: Amount, Status, Edit Button */}
            <div className="flex items-center gap-3 ml-2 shrink-0">
                <div className="flex flex-col items-end text-right">
                    <span className={`font-bold text-lg tracking-tight ${isPaid ? 'text-green-200' : 'text-white'}`}>
                    {formatCurrency(bill.amount)}
                    </span>
                    <div className="flex items-center gap-1 mt-1">
                        {isPaid ? (
                            <CheckCircle2 size={14} className="text-green-300" />
                        ) : (
                            <Circle size={14} className="text-red-300/70" />
                        )}
                        <span className={`text-[10px] uppercase tracking-wider font-bold ${iconColor}`}>
                        {isPaid ? 'Zapłacone' : 'Do zapłaty'}
                        </span>
                    </div>
                </div>

                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit(bill);
                    }}
                    className="p-2.5 ml-1 rounded-full bg-white/5 hover:bg-white/20 text-white/60 hover:text-white transition-all active:scale-90"
                >
                    <Edit2 size={16} />
                </button>
            </div>
        </div>
      </GlassCard>
    </div>
  );
};