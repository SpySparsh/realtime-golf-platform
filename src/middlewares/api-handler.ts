import type { NextRequest } from "next/server";
import { errorResponse } from "@/utils/api-response";

type Handler<TArgs extends unknown[] = []> = (
  request: NextRequest,
  ...args: TArgs
) => Promise<Response>;

export function withApiHandler<TArgs extends unknown[]>(handler: Handler<TArgs>) {
  return async (request: NextRequest, ...args: TArgs) => {
    try {
      return await handler(request, ...args);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

