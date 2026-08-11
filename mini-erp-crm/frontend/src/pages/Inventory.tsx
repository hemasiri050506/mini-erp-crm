import { useEffect, useState } from "react";
import { api, formatDate } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Alert, Button, Card, Input, LoadingSpinner, PageHeader, Pagination, Select, StatusBadge } from "../components/ui";
import type { Product, StockMovement } from "../types";

export default function Inventory() {
  const { hasRole } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [page, setPage] = useState(1);
  const [movPage, setMovPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [movTotalPages, setMovTotalPages] = useState(1);
  const [lowStock, setLowStock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [type, setType] = useState<"IN" | "OUT">("IN");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = () => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: "10" };
    if (lowStock) params.lowStock = "true";
    Promise.all([
      api.getInventory(params),
      api.getMovements({ page: String(movPage), limit: "10" }),
    ]).then(([inv, mov]) => {
      setProducts(inv.data);
      setTotalPages(inv.pagination.totalPages);
      setMovements(mov.data);
      setMovTotalPages(mov.pagination.totalPages);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, movPage, lowStock]);

  const handleStockUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setError("");
    setSuccess("");
    try {
      await api.updateStock(selectedProduct, {
        quantity: parseInt(quantity, 10),
        type,
        reason,
      });
      setSuccess(`Stock ${type === "IN" ? "added" : "removed"} successfully`);
      setQuantity("");
      setReason("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update stock");
    }
  };

  if (loading && products.length === 0) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Inventory" subtitle="Stock levels and movement history" />

      {hasRole("ADMIN", "WAREHOUSE") && (
        <Card className="mb-6">
          <h2 className="mb-4 font-semibold">Stock Movement</h2>
          {error && <div className="mb-3"><Alert message={error} /></div>}
          {success && <div className="mb-3"><Alert message={success} type="success" /></div>}
          <form onSubmit={handleStockUpdate} className="grid gap-3 sm:grid-cols-5">
            <Select label="Product" value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} required>
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} (Stock: {p.currentStock})</option>
              ))}
            </Select>
            <Select label="Type" value={type} onChange={(e) => setType(e.target.value as "IN" | "OUT")}>
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
            </Select>
            <Input label="Quantity" type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
            <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="flex items-end">
              <Button type="submit" className="w-full">Update Stock</Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Current Inventory</h2>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={lowStock} onChange={(e) => { setLowStock(e.target.checked); setPage(1); }} />
            Low stock only
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="pb-2 pr-4">Product</th>
                <th className="pb-2 pr-4">SKU</th>
                <th className="pb-2 pr-4">Stock</th>
                <th className="pb-2 pr-4">Min</th>
                <th className="pb-2">Location</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-slate-100">
                  <td className="py-3 pr-4">{p.name}</td>
                  <td className="py-3 pr-4">{p.sku}</td>
                  <td className={`py-3 pr-4 ${p.isLowStock || p.currentStock <= p.minStock ? "font-medium text-red-600" : ""}`}>
                    {p.currentStock}
                  </td>
                  <td className="py-3 pr-4">{p.minStock}</td>
                  <td className="py-3">{p.warehouse || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </Card>

      <Card>
        <h2 className="mb-4 font-semibold">Movement Log</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="pb-2 pr-4">Product</th>
                <th className="pb-2 pr-4">Type</th>
                <th className="pb-2 pr-4">Qty</th>
                <th className="pb-2 pr-4">Reason</th>
                <th className="pb-2 pr-4">By</th>
                <th className="pb-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id} className="border-b border-slate-100">
                  <td className="py-3 pr-4">{m.product?.name}</td>
                  <td className="py-3 pr-4"><StatusBadge status={m.type} /></td>
                  <td className="py-3 pr-4">{m.quantity}</td>
                  <td className="py-3 pr-4">{m.reason || "-"}</td>
                  <td className="py-3 pr-4">{m.createdBy?.name}</td>
                  <td className="py-3">{formatDate(m.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={movPage} totalPages={movTotalPages} onPageChange={setMovPage} />
      </Card>
    </div>
  );
}
