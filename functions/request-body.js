export class RequestError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// Enforce bytes while consuming, even with no or misleading Content-Length.
export async function readObjectBody(request, maxBytes = 32768) {
  const declared = Number(request.headers.get("Content-Length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    if (request.body) void request.body.cancel().catch(() => {});
    throw new RequestError("Request body too large", 413);
  }
  const reader = request.body?.getReader();
  const chunks = [];
  let size = 0;
  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) {
          void reader.cancel().catch(() => {});
          throw new RequestError("Request body too large", 413);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let parsed;
  try {
    parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new RequestError("Invalid JSON", 400);
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed))
    throw new RequestError("JSON body must be an object", 400);
  return parsed;
}
