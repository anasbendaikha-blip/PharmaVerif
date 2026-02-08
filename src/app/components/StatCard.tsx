import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from './ui/card';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  iconColor?: string;
  iconBgColor?: string;
}

export function StatCard({ title, value, icon: Icon, trend, iconColor = 'text-blue-600', iconBgColor = 'bg-blue-100' }: StatCardProps) {
  return (
    <Card className="h-full">
      <CardContent className="p-6 flex flex-col h-full">
        {/* Header: Titre et Icône alignés */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600 font-medium">{title}</p>
          <div className={`${iconBgColor} p-2.5 rounded-lg flex-shrink-0`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>

        {/* Chiffre principal - avec espace pour éviter superposition */}
        <div className="flex-1 flex items-center">
          <p className="text-3xl font-bold text-gray-900 break-words w-full">{value}</p>
        </div>

        {/* Trend en bas */}
        {trend && (
          <div className={`text-sm flex items-center gap-1 mt-3 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            <span>{trend.isPositive ? '↑' : '↓'}</span>
            <span className="font-medium">{Math.abs(trend.value)}%</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}