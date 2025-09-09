import { ReactNode } from 'react';
import Card from './Card';

export default function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="p-4">
      <h3 className="mb-3 font-medium">{title}</h3>
      <div className="overflow-x-auto">{children}</div>
    </Card>
  );
}

