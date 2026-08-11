import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatCurrency } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Button, Card, Input, LoadingSpinner, PageHeader, Pagination, Select } from "../components/ui";
import type { Product } from "../types";

export default function Products() {
  const { hasRole } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [lowStock, setLowStock] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: "10" };
    if (search) params.search = search;
    if (lowStock) params.lowStock = "true";
    api.getProducts(params).then((res) => {
      setProducts(res.data);
      setTotalPages(res.pagination.totalPages);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, lowStock]);

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Product catalog and pricing"
        action={hasRole("ADMIN", "WAREHOUSE") ? <Link to="/products/new"><Button>Add Product</Button></Link> : undefined}
      />

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Input placeholder="Search name, SKU..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={lowStock ? "true" : ""} onChange={(e) => { setLowStock(e.target.value === "true"); setPage(1); }}>
            <option value="">All Stock</option>
            <option value="true">Low Stock Only</option>
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
                  <th className="pb-2 pr-4">Product</th>
                  <th className="pb-2 pr-4">SKU</th>
                  <th className="pb-2 pr-4">Category</th>
                  <th className="pb-2 pr-4">Price</th>
                  <th className="pb-2 pr-4">Stock</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4 font-medium">{p.name}</td>
                    <td className="py-3 pr-4">{p.sku}</td>
                    <td className="py-3 pr-4">{p.category || "-"}</td>
                    <td className="py-3 pr-4">{formatCurrency(p.unitPrice)}</td>
                    <td className="py-3 pr-4">
                      <span className={p.currentStock <= p.minStock ? "font-medium text-red-600" : ""}>
                        {p.currentStock} / min {p.minStock}
                      </span>
                    </td>
                    <td className="py-3">
                      <Link to={`/products/${p.id}`} className="text-blue-600 hover:underline">View</Link>
                      {hasRole("ADMIN", "WAREHOUSE") && (
                        <> · <Link to={`/products/${p.id}/edit`} className="text-blue-600 hover:underline">Edit</Link></>
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
