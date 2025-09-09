// src/lib/http.ts
export type ApiResult = { ok?: true; error?: string };

type JsonLike = Record<string, unknown> & { error?: string | undefined };

function hasError(x: unknown): x is JsonLike {
  if (typeof x !== "object" || x === null) return false;
  const rec = x as Record<string, unknown>;
  return (
    "error" in rec && (rec.error === undefined || typeof rec.error === "string")
  );
}

export async function postJSON<T extends JsonLike = ApiResult>(
  url: string,
  body: unknown
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body),
  });

  const ct = res.headers.get("content-type") ?? "";
  const raw: unknown = ct.includes("application/json")
    ? await res.json()
    : { error: await res.text() };

  if (!res.ok || (hasError(raw) && raw.error)) {
    const msg = hasError(raw) && raw.error ? raw.error : `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return raw as T;
}
