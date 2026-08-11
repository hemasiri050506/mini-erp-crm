import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, formatCurrency, formatDate } from "../services/api";
import { Alert, Button, Card, Input, LoadingSpinner, PageHeader, StatusBadge } from "../components/ui";
import type { Product } from "../types";

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "", sku: "", category: "", unitPrice: "", currentStock: "0", minStock: "0", warehouse: "",
  });

  useEffect(() => {
    if (!id) return;
    api.getProduct(id).then((res) => {
      const p = res.data;
      setForm({
        name: p.name, sku: p.sku, category: p.category || "",
        unitPrice: String(p.unitPrice), currentStock: String(p.currentStock),
        minStock: String(p.minStock), warehouse: p.warehouse || "",
      });
    }).finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const body = {
      ...form,
      unitPrice: parseFloat(form.unitPrice),
      currentStock: parseInt(form.currentStock, 10),
      minStock: parseInt(form.minStock, 10),
    };
    try {
      if (isEdit && id) {
        await api.updateProduct(id, body);
        navigate(`/products/${id}`);
      } else {
        const res = await api.createProduct(body);
        navigate(`/products/${res.data.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title={isEdit ? "Edit Product" : "Add Product"} />
      {error && <div className="mb-4"><Alert message={error} /></div>}
      <Card>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <Input label="Product Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="SKU *" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
          <Input label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <Input label="Unit Price *" type="number" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} required />
          {!isEdit && (
            <Input label="Initial Stock" type="number" value={form.currentStock} onChange={(e) => setForm({ ...form, currentStock: e.target.value })} />
          )}
          <Input label="Minimum Stock Alert" type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} />
          <Input label="Warehouse Location" value={form.warehouse} onChange={(e) => setForm({ ...form, warehouse: e.target.value })} />
          <div className="flex gap-3 sm:col-span-2">
            <Button type="submit">Save Product</Button>
            <Link to={isEdit && id ? `/products/${id}` : "/products"}><Button type="button" variant="secondary">Cancel</Button></Link>
          </div>
        </form>
      </Card>
    </div>
  );
}

export function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.getProduct(id).then((res) => setProduct(res.data)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!product) return null;

  return (
    <div>
      <PageHeader title={product.name} subtitle={product.sku} action={<Link to={`/products/${id}/edit`}><Button>Edit</Button></Link>} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Category</dt><dd>{product.category || "-"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Unit Price</dt><dd>{formatCurrency(product.unitPrice)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Current Stock</dt><dd className={product.currentStock <= product.minStock ? "font-medium text-red-600" : ""}>{product.currentStock}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Min Stock</dt><dd>{product.minStock}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Warehouse</dt><dd>{product.warehouse || "-"}</dd></div>
          </dl>
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold">Recent Movements</h2>
          <div className="space-y-2">
            {product.movements?.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 text-sm">
                <div>
                  <StatusBadge status={m.type} />
                  <span className="ml-2">{m.quantity} units</span>
                </div>
                <span className="text-xs text-slate-500">{formatDate(m.createdAt)}</span>
              </div>
            ))}
            {!product.movements?.length && <p className="text-sm text-slate-500">No movements yet</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
