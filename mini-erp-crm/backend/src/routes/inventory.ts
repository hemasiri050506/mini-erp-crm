import { Router } from "express";
import { prisma } from "../prisma";
import { authenticate, authorize } from "../middleware/auth";
import { parsePagination, paginatedResponse } from "../utils/pagination";
import type { MovementType, Prisma } from "../../generated/prisma/client";

const router = Router();

router.use(authenticate);

router.get("/", authorize("ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"), async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const search = String(req.query.search ?? "").trim();
    const lowStockOnly = req.query.lowStock === "true";

    const where: Prisma.ProductWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ];
    }

    let products = await prisma.product.findMany({ where, orderBy: { name: "asc" } });
    if (lowStockOnly) {
      products = products.filter((p) => p.currentStock <= p.minStock);
    }

    const total = products.length;
    const paged = products.slice(skip, skip + limit);

    res.json({
      success: true,
      data: paged.map((p) => ({
        ...p,
        isLowStock: p.currentStock <= p.minStock,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch inventory" });
  }
});

router.get("/low-stock", authorize("ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"), async (_req, res) => {
  try {
    const products = await prisma.product.findMany({ orderBy: { currentStock: "asc" } });
    const lowStock = products.filter((p) => p.currentStock <= p.minStock);
    res.json({ success: true, data: lowStock });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch low stock products" });
  }
});

router.get("/movements", authorize("ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"), async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const productId = req.query.productId as string | undefined;
    const type = req.query.type as MovementType | undefined;

    const where: Prisma.StockMovementWhereInput = {};
    if (productId) where.productId = productId;
    if (type) where.type = type;

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          product: { select: { id: true, name: true, sku: true } },
          createdBy: { select: { id: true, name: true } },
        },
      }),
      prisma.stockMovement.count({ where }),
    ]);

    res.json(paginatedResponse(movements, total, page, limit));
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch stock movements" });
  }
});

router.post("/:productId/stock", authorize("ADMIN", "WAREHOUSE"), async (req, res) => {
  try {
    const { quantity, type, reason } = req.body;
    const productId = req.params.productId!;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ success: false, message: "Quantity must be greater than 0" });
    }
    if (!type || !["IN", "OUT"].includes(type)) {
      return res.status(400).json({ success: false, message: "Type must be IN or OUT" });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (type === "OUT" && product.currentStock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock for product ${product.name}. Available: ${product.currentStock}, Requested: ${quantity}`,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: {
          currentStock: type === "IN" ? product.currentStock + quantity : product.currentStock - quantity,
        },
      });

      const movement = await tx.stockMovement.create({
        data: {
          productId,
          quantity,
          type,
          reason: reason || (type === "IN" ? "Manual stock IN" : "Manual stock OUT"),
          createdById: req.user!.id,
        },
        include: {
          product: { select: { id: true, name: true, sku: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });

      return { product: updatedProduct, movement };
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to update stock" });
  }
});

export default router;
