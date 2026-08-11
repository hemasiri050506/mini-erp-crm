import { Router } from "express";
import { prisma } from "../prisma";
import { authenticate, authorize } from "../middleware/auth";
import { parsePagination, paginatedResponse } from "../utils/pagination";
import type { Prisma } from "../../generated/prisma/client";

const router = Router();

router.use(authenticate);

router.get("/", authorize("ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"), async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const search = String(req.query.search ?? "").trim();
    const category = String(req.query.category ?? "").trim();
    const lowStock = req.query.lowStock === "true";

    const where: Prisma.ProductWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
      ];
    }
    if (category) where.category = { equals: category, mode: "insensitive" };

    let products = await prisma.product.findMany({
      where,
      skip: lowStock ? undefined : skip,
      take: lowStock ? undefined : limit,
      orderBy: { createdAt: "desc" },
    });

    if (lowStock) {
      products = products.filter((p) => p.currentStock <= p.minStock);
      const total = products.length;
      products = products.slice(skip, skip + limit);
      return res.json(paginatedResponse(products, total, page, limit));
    }

    const total = await prisma.product.count({ where });
    res.json(paginatedResponse(products, total, page, limit));
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch products" });
  }
});

router.get("/categories/list", authorize("ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"), async (_req, res) => {
  try {
    const products = await prisma.product.findMany({
      select: { category: true },
      distinct: ["category"],
    });
    const categories = products.map((p) => p.category).filter(Boolean);
    res.json({ success: true, data: categories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch categories" });
  }
});

router.get("/:id", authorize("ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"), async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        movements: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { createdBy: { select: { id: true, name: true } } },
        },
      },
    });
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    res.json({ success: true, data: product });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch product" });
  }
});

router.post("/", authorize("ADMIN", "WAREHOUSE"), async (req, res) => {
  try {
    const { name, sku, category, unitPrice, currentStock, minStock, warehouse } = req.body;

    if (!name || !sku || unitPrice === undefined) {
      return res.status(400).json({ success: false, message: "Name, SKU, and unit price are required" });
    }

    const existing = await prisma.product.findUnique({ where: { sku } });
    if (existing) {
      return res.status(400).json({ success: false, message: "SKU already exists" });
    }

    const product = await prisma.product.create({
      data: {
        name,
        sku,
        category,
        unitPrice,
        currentStock: currentStock ?? 0,
        minStock: minStock ?? 0,
        warehouse,
      },
    });

    res.status(201).json({ success: true, data: product });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to create product" });
  }
});

router.put("/:id", authorize("ADMIN", "WAREHOUSE"), async (req, res) => {
  try {
    const { name, sku, category, unitPrice, minStock, warehouse } = req.body;

    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (sku && sku !== existing.sku) {
      const skuTaken = await prisma.product.findUnique({ where: { sku } });
      if (skuTaken) {
        return res.status(400).json({ success: false, message: "SKU already exists" });
      }
    }

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { name, sku, category, unitPrice, minStock, warehouse },
    });

    res.json({ success: true, data: product });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to update product" });
  }
});

router.delete("/:id", authorize("ADMIN"), async (req, res) => {
  try {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Product deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to delete product" });
  }
});

export default router;
