import { Router } from "express";
import { prisma } from "../prisma";
import { authenticate, authorize } from "../middleware/auth";
import { parsePagination, paginatedResponse } from "../utils/pagination";
import type { CustomerStatus, CustomerType, Prisma } from "../../generated/prisma/client";

const router = Router();

router.use(authenticate);

router.get("/", authorize("ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"), async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const search = String(req.query.search ?? "").trim();
    const status = req.query.status as CustomerStatus | undefined;
    const type = req.query.type as CustomerType | undefined;

    const where: Prisma.CustomerWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { mobile: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { businessName: { contains: search, mode: "insensitive" } },
      ];
    }
    if (status) where.status = status;
    if (type) where.type = type;

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.customer.count({ where }),
    ]);

    res.json(paginatedResponse(customers, total, page, limit));
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch customers" });
  }
});

router.get("/:id", authorize("ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"), async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        followUps: {
          orderBy: { createdAt: "desc" },
          include: { createdBy: { select: { id: true, name: true } } },
        },
        challans: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }
    res.json({ success: true, data: customer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch customer" });
  }
});

router.post("/", authorize("ADMIN", "SALES"), async (req, res) => {
  try {
    const { name, mobile, email, businessName, gstNumber, type, address, status, followUpDate, notes } =
      req.body;

    if (!name || !mobile || !type) {
      return res.status(400).json({ success: false, message: "Name, mobile, and type are required" });
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        mobile,
        email,
        businessName,
        gstNumber,
        type,
        address,
        status,
        followUpDate: followUpDate ? new Date(followUpDate) : undefined,
        notes,
      },
    });

    res.status(201).json({ success: true, data: customer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to create customer" });
  }
});

router.put("/:id", authorize("ADMIN", "SALES"), async (req, res) => {
  try {
    const { name, mobile, email, businessName, gstNumber, type, address, status, followUpDate, notes } =
      req.body;

    const existing = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: {
        name,
        mobile,
        email,
        businessName,
        gstNumber,
        type,
        address,
        status,
        followUpDate: followUpDate ? new Date(followUpDate) : followUpDate === null ? null : undefined,
        notes,
      },
    });

    res.json({ success: true, data: customer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to update customer" });
  }
});

router.delete("/:id", authorize("ADMIN"), async (req, res) => {
  try {
    const existing = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    await prisma.customer.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Customer deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to delete customer" });
  }
});

router.post("/:id/followups", authorize("ADMIN", "SALES"), async (req, res) => {
  try {
    const { note, followUpDate } = req.body;
    if (!note) {
      return res.status(400).json({ success: false, message: "Note is required" });
    }

    const customer = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    const followUp = await prisma.$transaction(async (tx) => {
      const created = await tx.customerFollowUp.create({
        data: {
          customerId: req.params.id!,
          note,
          followUpDate: followUpDate ? new Date(followUpDate) : undefined,
          createdById: req.user!.id,
        },
        include: { createdBy: { select: { id: true, name: true } } },
      });

      if (followUpDate) {
        await tx.customer.update({
          where: { id: req.params.id },
          data: { followUpDate: new Date(followUpDate) },
        });
      }

      return created;
    });

    res.status(201).json({ success: true, data: followUp });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to add follow-up" });
  }
});

export default router;
