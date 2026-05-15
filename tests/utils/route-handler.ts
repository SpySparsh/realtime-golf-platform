import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { NextRequest } from "next/server";

type RouteHandler = (request: NextRequest) => Promise<Response>;

export function createRouteHandlerServer(handler: RouteHandler) {
  return createServer(async (request: IncomingMessage, response: ServerResponse) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const nextRequest = new NextRequest(`http://localhost${request.url ?? "/"}`, {
      method: request.method,
      headers: request.headers as Record<string, string>,
      body,
    });

    const routeResponse = await handler(nextRequest);
    response.statusCode = routeResponse.status;
    routeResponse.headers.forEach((value, key) => response.setHeader(key, value));
    response.end(Buffer.from(await routeResponse.arrayBuffer()));
  });
}
