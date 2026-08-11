import { prisma } from "../prisma";

export async function generateChallanNumber(): Promise<string> {
  const last = await prisma.challan.findFirst({
    orderBy: { createdAt: "desc" },
    select: { challanNumber: true },
  });

  let next = 1;
  if (last?.challanNumber) {
    const match = last.challanNumber.match(/SC-(\d+)/);
    if (match?.[1]) next = parseInt(match[1], 10) + 1;
  }

  return `SC-${String(next).padStart(5, "0")}`;
}
