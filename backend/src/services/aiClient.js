const DEFAULT_TIMEOUT_MS = 8000;

function getAiBaseUrl() {
  return process.env.AI_SERVICE_URL || "http://localhost:8000";
}

async function fetchJson(path, payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(`${getAiBaseUrl()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`AI service error (${res.status}): ${body || "unknown"}`);
    }

    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function getMachineRecommendations(payload) {
  return fetchJson("/recommendations/machines", payload);
}

module.exports = {
  getMachineRecommendations
};
