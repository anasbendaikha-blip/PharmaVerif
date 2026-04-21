import { cn } from '../ui/utils';

const SUPPLIER_COLORS: Record<string, string> = {
  CERP: '#0F3C61',
  OCP: '#0B4F9B',
  ALLIANCE: '#C73434',
  PHOENIX: '#7D1515',
  BIOGARAN: '#1F7F45',
  ARROW: '#3c6293',
  TEVA: '#2a4d7a',
  MYLAN: '#17304f',
};

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

interface SupplierBadgeProps {
  supplier: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function SupplierBadge({ supplier, size = 'md', className }: SupplierBadgeProps) {
  const key = supplier.toUpperCase();
  const bg = SUPPLIER_COLORS[key] || '#47536a';
  const dim = size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-[12px]';

  return (
    <div
      className={cn('rounded-full text-white grid place-items-center font-semibold shrink-0', dim, className)}
      style={{ backgroundColor: bg }}
    >
      {getInitials(supplier)}
    </div>
  );
}
