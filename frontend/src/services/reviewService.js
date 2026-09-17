const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export async function analyzeCode(
  developerId,
  language,
  sourceCode
) {
  const response = await fetch(`${API_BASE_URL}/api/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        developerId,
        language,
        sourceCode,
      }),
  });

  if (!response.ok) {
    throw await getApiError(response, "Unable to analyze the code. Please try again.");
  }

  return response.json();
}

export async function rescanCode(
  reviewId,
  sourceCode
) {
  const response = await fetch(`${API_BASE_URL}/api/reviews/${reviewId}/rescan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sourceCode,
      }),
  });

  if (!response.ok) {
    throw await getApiError(response, "Unable to rescan the code. Please try again.");
  }

  return response.json();
}

async function getApiError(response, fallbackMessage) {
  try {
    const payload = await response.json();
    return new Error(payload.error?.message || fallbackMessage);
  } catch {
    return new Error(fallbackMessage);
  }
}