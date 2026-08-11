import { Router } from "express";
import { prisma } from "../prisma";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.use(authenticate);
router.use(authorize("ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"));

router.get("/stats", async (_req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalCustomers, totalProducts, products, todayChallans, draftChallans, confirmedChallans, recentMovements] =
      await Promise.all([
        prisma.customer.count(),
        prisma.product.count(),
        prisma.product.findMany({ select: { currentStock: true, minStock: true } }),
        prisma.challan.count({ where: { createdAt: { gte: today, lt: tomorrow } } }),
        prisma.challan.count({ where: { status: "DRAFT" } }),
        prisma.challan.count({ where: { status: "CONFIRMED" } }),
        prisma.stockMovement.findMany({
          take: 10,
          orderBy: { createdAt: "desc" },
          include: {
            product: { select: { name: true, sku: true } },
            createdBy: { select: { name: true } },
          },
        }),
      ]);

    const lowStockCount = products.filter((p) => p.currentStock <= p.minStock).length;

    res.json({
      success: true,
      data: {
        totalCustomers,
        totalProducts,
        lowStockCount,
        todayChallans,
        draftChallans,
        confirmedChallans,
        recentMovements,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch dashboard stats" });
  }
});

export default router;
