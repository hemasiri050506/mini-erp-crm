import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatDate } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Button, Card, Input, LoadingSpinner, PageHeader, Pagination, Select, StatusBadge } from "../components/ui";
import type { Challan } from "../types";

export default function Challans() {
  const { hasRole } = useAuth();
  const [challans, setChallans] = useState<Challan[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: "10" };
    if (search) params.search = search;
    if (status) params.status = status;
    api.getChallans(params).then((res) => {
      setChallans(res.data);
      setTotalPages(res.pagination.totalPages);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, status]);

  return (
    <div>
      <PageHeader
        title="Sales Challans"
        subtitle="Create and manage sales challans"
        action={hasRole("ADMIN", "SALES") ? <Link to="/challans/new"><Button>Create Challan</Button></Link> : undefined}
      />

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Input placeholder="Search challan number..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
          <Button onClick={() => { setPage(1); load(); }}>Search</Button>
        </div>
      </Card>

      {loading ? <LoadingSpinner /> : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-2 pr-4">Challan #</th>
                  <th className="pb-2 pr-4">Customer</th>
                  <th className="pb-2 pr-4">Items</th>
                  <th className="pb-2 pr-4">Total Qty</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {challans.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4 font-medium">{c.challanNumber}</td>
                    <td className="py-3 pr-4">{c.customer?.name}</td>
                    <td className="py-3 pr-4">{c.items.length}</td>
                    <td className="py-3 pr-4">{c.totalQuantity}</td>
                    <td className="py-3 pr-4"><StatusBadge status={c.status} /></td>
                    <td className="py-3 pr-4">{formatDate(c.createdAt)}</td>
                    <td className="py-3">
                      <Link to={`/challans/${c.id}`} className="text-blue-600 hover:underline">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </Card>
      )}
    </div>
  );
}

