import { Router } from "express";
import { prisma } from "../prisma";
import { authenticate, authorize } from "../middleware/auth";
import { parsePagination, paginatedResponse } from "../utils/pagination";
import { generateChallanNumber } from "../utils/challanNumber";
import type { ChallanStatus, Prisma } from "../../generated/prisma/client";

const router = Router();

router.use(authenticate);

interface ChallanItemInput {
  productId: string;
  quantity: number;
}

async function buildChallanItems(items: ChallanItemInput[]) {
  if (!items?.length) {
    throw new Error("At least one product is required");
  }

  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });

  if (products.length !== productIds.length) {
    throw new Error("One or more products not found");
  }

  const productMap = new Map(products.map((p) => [p.id, p]));

  return items.map((item) => {
    if (!item.quantity || item.quantity <= 0) {
      throw new Error("Each item must have quantity greater than 0");
    }
    const product = productMap.get(item.productId)!;
    return {
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      unitPrice: product.unitPrice,
      quantity: item.quantity,
    };
  });
}

router.get("/", authorize("ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"), async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const search = String(req.query.search ?? "").trim();
    const status = req.query.status as ChallanStatus | undefined;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    const where: Prisma.ChallanWhereInput = {};
    if (search) {
      where.challanNumber = { contains: search, mode: "insensitive" };
    }
    if (status) where.status = status;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [challans, total] = await Promise.all([
      prisma.challan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { id: true, name: true, businessName: true } },
          createdBy: { select: { id: true, name: true } },
          items: true,
        },
      }),
      prisma.challan.count({ where }),
    ]);

    res.json(paginatedResponse(challans, total, page, limit));
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch challans" });
  }
});

router.get("/next-number", authorize("ADMIN", "SALES"), async (_req, res) => {
  try {
    const challanNumber = await generateChallanNumber();
    res.json({ success: true, data: { challanNumber } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to generate challan number" });
  }
});

router.get("/:id", authorize("ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"), async (req, res) => {
  try {
    const challan = await prisma.challan.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        createdBy: { select: { id: true, name: true, email: true } },
        items: true,
      },
    });
    if (!challan) {
      return res.status(404).json({ success: false, message: "Challan not found" });
    }
    res.json({ success: true, data: challan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch challan" });
  }
});

router.post("/", authorize("ADMIN", "SALES"), async (req, res) => {
  try {
    const { customerId, items, status } = req.body;

    if (!customerId) {
      return res.status(400).json({ success: false, message: "Customer is required" });
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    const builtItems = await buildChallanItems(items);
    const totalQuantity = builtItems.reduce((sum, i) => sum + i.quantity, 0);
    const challanNumber = await generateChallanNumber();
    const challanStatus: ChallanStatus = status === "CONFIRMED" ? "CONFIRMED" : "DRAFT";

    if (challanStatus === "CONFIRMED") {
      const challan = await confirmChallanTransaction({
        customerId,
        challanNumber,
        totalQuantity,
        items: builtItems,
        createdById: req.user!.id,
      });
      return res.status(201).json({ success: true, data: challan });
    }

    const challan = await prisma.challan.create({
      data: {
        challanNumber,
        customerId,
        totalQuantity,
        status: "DRAFT",
        createdById: req.user!.id,
        items: { create: builtItems },
      },
      include: {
        customer: true,
        items: true,
        createdBy: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ success: true, data: challan });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Failed to create challan";
    const status = message.includes("Insufficient stock") || message.includes("required") ? 400 : 500;
    res.status(status).json({ success: false, message });
  }
});

router.put("/:id", authorize("ADMIN", "SALES"), async (req, res) => {
  try {
    const { customerId, items } = req.body;

    const existing = await prisma.challan.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Challan not found" });
    }
    if (existing.status !== "DRAFT") {
      return res.status(400).json({ success: false, message: "Only draft challans can be edited" });
    }

    const builtItems = await buildChallanItems(items);
    const totalQuantity = builtItems.reduce((sum, i) => sum + i.quantity, 0);

    const challan = await prisma.$transaction(async (tx) => {
      await tx.challanItem.deleteMany({ where: { challanId: existing.id } });
      return tx.challan.update({
        where: { id: existing.id },
        data: {
          customerId: customerId || existing.customerId,
          totalQuantity,
          items: { create: builtItems },
        },
        include: {
          customer: true,
          items: true,
          createdBy: { select: { id: true, name: true } },
        },
      });
    });

    res.json({ success: true, data: challan });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Failed to update challan";
    res.status(400).json({ success: false, message });
  }
});

router.post("/:id/confirm", authorize("ADMIN", "SALES"), async (req, res) => {
  try {
    const existing = await prisma.challan.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Challan not found" });
    }
    if (existing.status !== "DRAFT") {
      return res.status(400).json({ success: false, message: "Only draft challans can be confirmed" });
    }

    const challan = await confirmChallanTransaction({
      challanId: existing.id,
      customerId: existing.customerId,
      challanNumber: existing.challanNumber,
      totalQuantity: existing.totalQuantity,
      items: existing.items.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        productSku: i.productSku,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
      })),
      createdById: existing.createdById,
    });

    res.json({ success: true, data: challan });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Failed to confirm challan";
    res.status(message.includes("Insufficient stock") ? 400 : 500).json({ success: false, message });
  }
});

router.post("/:id/cancel", authorize("ADMIN", "SALES"), async (req, res) => {
  try {
    const existing = await prisma.challan.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Challan not found" });
    }
    if (existing.status === "CANCELLED") {
      return res.status(400).json({ success: false, message: "Challan is already cancelled" });
    }

    const challan = await prisma.$transaction(async (tx) => {
      if (existing.status === "CONFIRMED") {
        for (const item of existing.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { increment: item.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              quantity: item.quantity,
              type: "IN",
              reason: `Challan ${existing.challanNumber} cancelled - stock restored`,
              createdById: req.user!.id,
            },
          });
        }
      }

      return tx.challan.update({
        where: { id: existing.id },
        data: { status: "CANCELLED" },
        include: { customer: true, items: true, createdBy: { select: { id: true, name: true } } },
      });
    });

    res.json({ success: true, data: challan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to cancel challan" });
  }
});

interface ConfirmChallanInput {
  challanId?: string;
  customerId: string;
  challanNumber: string;
  totalQuantity: number;
  items: Array<{
    productId: string;
    productName: string;
    productSku: string;
    unitPrice: Prisma.Decimal | number;
    quantity: number;
  }>;
  createdById: string;
}

async function confirmChallanTransaction(input: ConfirmChallanInput) {
  return prisma.$transaction(async (tx) => {
    for (const item of input.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        throw new Error(`Product ${item.productName} not found`);
      }
      if (product.currentStock < item.quantity) {
        throw new Error(
          `Insufficient stock for product ${product.name}. Available: ${product.currentStock}, Requested: ${item.quantity}`
        );
      }
    }

    for (const item of input.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { currentStock: { decrement: item.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          quantity: item.quantity,
          type: "OUT",
          reason: `Sales Challan ${input.challanNumber}`,
          createdById: input.createdById,
        },
      });
    }

    if (input.challanId) {
      return tx.challan.update({
        where: { id: input.challanId },
        data: { status: "CONFIRMED" },
        include: {
          customer: true,
          items: true,
          createdBy: { select: { id: true, name: true } },
        },
      });
    }

    return tx.challan.create({
      data: {
        challanNumber: input.challanNumber,
        customerId: input.customerId,
        totalQuantity: input.totalQuantity,
        status: "CONFIRMED",
        createdById: input.createdById,
        items: {
          create: input.items.map((i) => ({
            productId: i.productId,
            productName: i.productName,
            productSku: i.productSku,
            unitPrice: i.unitPrice,
            quantity: i.quantity,
          })),
        },
      },
      include: {
        customer: true,
        items: true,
        createdBy: { select: { id: true, name: true } },
      },
    });
  });
}

export default router;
