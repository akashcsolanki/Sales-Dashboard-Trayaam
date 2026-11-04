export async function api(path, body, method) {
  const response = await fetch("/api/" + path, {
    method: method || (body ? "POST" : "GET"),
    credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(
      "Backend unavailable. Start the Pages development server or finish cloud deployment.",
    );
  }
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}
