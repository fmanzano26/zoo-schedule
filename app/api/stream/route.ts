// app/api/stream/route.ts
import sseBus from "@/lib/sse-bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      // primera línea: reintento del cliente si se corta
      controller.enqueue(new TextEncoder().encode("retry: 5000\n\n"));

      // función para enviar datos SSE
      const send = (payload: unknown) => {
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`)
        );
      };

      // suscripción al bus
      const unsubscribe = sseBus.subscribe(() => send({ event: "changed" }));

      // keep-alive para que algunos proxies no cierren la conexión
      const keepAlive = setInterval(() => {
        controller.enqueue(new TextEncoder().encode(": keepalive\n\n"));
      }, 25000);

      // limpieza cuando el cliente cierra
      (controller as any)._cleanup = () => {
        clearInterval(keepAlive);
        unsubscribe();
      };
    },
    cancel() {
      // @ts-ignore
      this._cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // opcional si pruebas desde otro origen:
      "Access-Control-Allow-Origin": "*",
    },
  });
}
