import React from 'react';
import { CheckCircle2, Circle, Edit2 } from 'lucide-react';
import { Bill, CATEGORY_ICONS } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { GlassCard } from './ui/GlassCard';

interface BillItemProps {
  bill: Bill;
  onTogglePaid: (id: string) => void;
  onEdit: (bill: Bill) => void;
}

export const BillItem: React.FC<BillItemProps> = ({ bill, onTogglePaid, onEdit }) => {
  const isPaid = bill.isPaid;
  const statusColor = isPaid ? 'bg-green-500/20 border-green-400/30' : 'bg-red-500/20 border-red-400/30';
  const iconColor = isPaid ? 'text-green-400' : 'text-red-400';

  return (
    <GlassCard 
      className={`mb-4 flex items-center justify-between p-4 border ${statusColor}`}
    >
      <div className="flex items-center gap-4 flex-1" onClick={() => onTogglePaid(bill.id)}>
        <div className={`p-3 rounded-full bg-white/5 text-2xl`}>
          {CATEGORY_ICONS[bill.category]}
        </div>
        
        <div className="flex flex-col">
          <span className={`font-semibold text-lg ${isPaid ? 'text-white/60 line-through' : 'text-white'}`}>
            {bill.name}
          </span>
          <span className="text-xs text-white/50">
            {formatDate(bill.dueDate)} • {bill.isRecurring ? '🔄 Co miesiąc' : '1 raz'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end">
          <span className={`font-bold text-lg ${isPaid ? 'text-green-300' : 'text-white'}`}>
            {formatCurrency(bill.amount)}
          </span>
          <span className={`text-[10px] uppercase tracking-wider font-bold ${iconColor}`}>
            {isPaid ? 'Zapłacone' : 'Do zapłaty'}
          </span>
        </div>

        <button 
            onClick={(e) => {
                e.stopPropagation();
                onEdit(bill);
            }}
            className="p-2 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors"
        >
            <Edit2 size={16} />
        </button>
      </div>
    </GlassCard>
  );
};