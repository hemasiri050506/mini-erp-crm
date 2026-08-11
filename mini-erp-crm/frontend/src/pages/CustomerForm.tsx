import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, formatDate } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Alert, Button, Card, Input, LoadingSpinner, PageHeader, Select, StatusBadge, Textarea } from "../components/ui";
import type { Customer, CustomerType, CustomerStatus } from "../types";

export default function CustomerForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "", mobile: "", email: "", businessName: "", gstNumber: "",
    type: "RETAIL" as CustomerType, address: "", status: "LEAD" as CustomerStatus,
    followUpDate: "", notes: "",
  });

  useEffect(() => {
    if (!id) return;
    api.getCustomer(id).then((res) => {
      const c = res.data;
      setForm({
        name: c.name, mobile: c.mobile, email: c.email || "", businessName: c.businessName || "",
        gstNumber: c.gstNumber || "", type: c.type, address: c.address || "", status: c.status,
        followUpDate: c.followUpDate ? c.followUpDate.slice(0, 10) : "", notes: c.notes || "",
      });
    }).finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (isEdit && id) {
        await api.updateCustomer(id, form);
        navigate(`/customers/${id}`);
      } else {
        const res = await api.createCustomer(form);
        navigate(`/customers/${res.data.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title={isEdit ? "Edit Customer" : "Add Customer"} />
      {error && <div className="mb-4"><Alert message={error} /></div>}
      <Card>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <Input label="Customer Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Mobile *" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} required />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Business Name" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
          <Input label="GST Number" value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} />
          <Select label="Customer Type *" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as CustomerType })}>
            <option value="RETAIL">Retail</option>
            <option value="WHOLESALE">Wholesale</option>
            <option value="DISTRIBUTOR">Distributor</option>
          </Select>
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as CustomerStatus })}>
            <option value="LEAD">Lead</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </Select>
          <Input label="Follow-up Date" type="date" value={form.followUpDate} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} />
          <div className="sm:col-span-2">
            <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Textarea label="Notes" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex gap-3 sm:col-span-2">
            <Button type="submit">Save Customer</Button>
            <Link to={isEdit && id ? `/customers/${id}` : "/customers"}><Button type="button" variant="secondary">Cancel</Button></Link>
          </div>
        </form>
      </Card>
    </div>
  );
}

export function CustomerDetail() {
  const { id } = useParams();
  const { hasRole } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [note, setNote] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    if (!id) return;
    api.getCustomer(id).then((res) => setCustomer(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const addFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError("");
    try {
      await api.addFollowUp(id, { note, followUpDate: followUpDate || undefined });
      setNote("");
      setFollowUpDate("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add follow-up");
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!customer) return null;

  return (
    <div>
      <PageHeader
        title={customer.name}
        subtitle={customer.businessName}
        action={hasRole("ADMIN", "SALES") ? <Link to={`/customers/${id}/edit`}><Button>Edit</Button></Link> : undefined}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">Customer Details</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Mobile</dt><dd>{customer.mobile}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Email</dt><dd>{customer.email || "-"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">GST</dt><dd>{customer.gstNumber || "-"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Type</dt><dd><StatusBadge status={customer.type} /></dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd><StatusBadge status={customer.status} /></dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Address</dt><dd>{customer.address || "-"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Follow-up</dt><dd>{customer.followUpDate ? formatDate(customer.followUpDate) : "-"}</dd></div>
          </dl>
          {customer.notes && <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">{customer.notes}</p>}
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold">Follow-up Notes</h2>
          {error && <div className="mb-3"><Alert message={error} /></div>}
          {hasRole("ADMIN", "SALES") && (
            <form onSubmit={addFollowUp} className="mb-4 space-y-3">
              <Textarea placeholder="Add follow-up note..." value={note} onChange={(e) => setNote(e.target.value)} required />
              <Input type="date" label="Next follow-up date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
              <Button type="submit">Add Follow-up</Button>
            </form>
          )}
          <div className="space-y-3">
            {customer.followUps?.map((f) => (
              <div key={f.id} className="rounded-lg border border-slate-100 p-3 text-sm">
                <p>{f.note}</p>
                <p className="mt-1 text-xs text-slate-500">{f.createdBy.name} · {formatDate(f.createdAt)}</p>
              </div>
            ))}
            {!customer.followUps?.length && <p className="text-sm text-slate-500">No follow-ups yet</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
