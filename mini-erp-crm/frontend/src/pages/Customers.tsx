import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Button, Card, Input, LoadingSpinner, PageHeader, Pagination, Select, StatusBadge } from "../components/ui";
import type { Customer } from "../types";

export default function Customers() {
  const { hasRole } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: "10" };
    if (search) params.search = search;
    if (status) params.status = status;
    if (type) params.type = type;
    api.getCustomers(params).then((res) => {
      setCustomers(res.data);
      setTotalPages(res.pagination.totalPages);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, status, type]);

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Manage CRM customers and leads"
        action={hasRole("ADMIN", "SALES") ? <Link to="/customers/new"><Button>Add Customer</Button></Link> : undefined}
      />

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <Input placeholder="Search name, mobile, email..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            <option value="LEAD">Lead</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </Select>
          <Select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
            <option value="">All Types</option>
            <option value="RETAIL">Retail</option>
            <option value="WHOLESALE">Wholesale</option>
            <option value="DISTRIBUTOR">Distributor</option>
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
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">Mobile</th>
                  <th className="pb-2 pr-4">Type</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-slate-500">{c.businessName}</div>
                    </td>
                    <td className="py-3 pr-4">{c.mobile}</td>
                    <td className="py-3 pr-4"><StatusBadge status={c.type} /></td>
                    <td className="py-3 pr-4"><StatusBadge status={c.status} /></td>
                    <td className="py-3">
                      <Link to={`/customers/${c.id}`} className="text-blue-600 hover:underline">View</Link>
                      {hasRole("ADMIN", "SALES") && (
                        <> · <Link to={`/customers/${c.id}/edit`} className="text-blue-600 hover:underline">Edit</Link></>
                      )}
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
