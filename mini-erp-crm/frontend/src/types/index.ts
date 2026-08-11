export type Role = "ADMIN" | "SALES" | "WAREHOUSE" | "ACCOUNTS";
export type CustomerType = "RETAIL" | "WHOLESALE" | "DISTRIBUTOR";
export type CustomerStatus = "LEAD" | "ACTIVE" | "INACTIVE";
export type MovementType = "IN" | "OUT";
export type ChallanStatus = "DRAFT" | "CONFIRMED" | "CANCELLED";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  businessName?: string;
  gstNumber?: string;
  type: CustomerType;
  address?: string;
  status: CustomerStatus;
  followUpDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  followUps?: CustomerFollowUp[];
  challans?: Challan[];
}

export interface CustomerFollowUp {
  id: string;
  note: string;
  followUpDate?: string;
  createdAt: string;
  createdBy: { id: string; name: string };
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category?: string;
  unitPrice: string | number;
  currentStock: number;
  minStock: number;
  warehouse?: string;
  isLowStock?: boolean;
  movements?: StockMovement[];
}

export interface StockMovement {
  id: string;
  productId: string;
  quantity: number;
  type: MovementType;
  reason?: string;
  createdAt: string;
  product?: { id: string; name: string; sku: string };
  createdBy?: { id: string; name: string };
}

export interface ChallanItem {
  id?: string;
  productId: string;
  productName: string;
  productSku: string;
  unitPrice: string | number;
  quantity: number;
}

export interface Challan {
  id: string;
  challanNumber: string;
  customerId: string;
  totalQuantity: number;
  status: ChallanStatus;
  createdAt: string;
  customer?: Customer;
  items: ChallanItem[];
  createdBy?: { id: string; name: string };
}

export interface DashboardStats {
  totalCustomers: number;
  totalProducts: number;
  lowStockCount: number;
  todayChallans: number;
  draftChallans: number;
  confirmedChallans: number;
  recentMovements: StockMovement[];
}
