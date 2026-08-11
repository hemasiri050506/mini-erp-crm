import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatDate } from "../services/api";
import { Card, LoadingSpinner, PageHeader, StatusBadge } from "../components/ui";
import type { DashboardStats } from "../types";

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboard().then((res) => setStats(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!stats) return null;

  const cards = [
    { label: "Total Customers", value: stats.totalCustomers, color: "text-blue-600" },
    { label: "Total Products", value: stats.totalProducts, color: "text-emerald-600" },
    { label: "Low Stock Items", value: stats.lowStockCount, color: "text-red-600" },
    { label: "Today's Challans", value: stats.todayChallans, color: "text-purple-600" },
    { label: "Draft Challans", value: stats.draftChallans, color: "text-slate-600" },
    { label: "Confirmed Challans", value: stats.confirmedChallans, color: "text-blue-600" },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Overview of your ERP operations" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label}>
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className={`mt-2 text-3xl font-bold ${card.color}`}>{card.value}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Stock Movements</h2>
          <Link to="/inventory" className="text-sm text-blue-600 hover:underline">View all</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="pb-2 pr-4">Product</th>
                <th className="pb-2 pr-4">Type</th>
                <th className="pb-2 pr-4">Qty</th>
                <th className="pb-2 pr-4">By</th>
                <th className="pb-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentMovements.map((m) => (
                <tr key={m.id} className="border-b border-slate-100">
                  <td className="py-3 pr-4">{m.product?.name}</td>
                  <td className="py-3 pr-4"><StatusBadge status={m.type} /></td>
                  <td className="py-3 pr-4">{m.quantity}</td>
                  <td className="py-3 pr-4">{m.createdBy?.name}</td>
                  <td className="py-3">{formatDate(m.createdAt)}</td>
                </tr>
              ))}
              {stats.recentMovements.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-slate-500">No movements yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
