import type { Request, Response, NextFunction } from "express";

export function notFound(req: Request, res: Response) {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error("SERVER_ERROR:", err);
  const message = err instanceof Error ? err.message : "Internal server error";
  res.status(500).json({ success: false, message });
}

