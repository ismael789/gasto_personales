export const DEFAULT_PREFERENCES = {
  currency: "$",
  density: "comfortable",
  pageSize: 10,
};

export function loadPreferences() {
  try {
    return {
      ...DEFAULT_PREFERENCES,
      ...JSON.parse(localStorage.getItem("gastos_preferences") || "{}"),
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(preferences) {
  localStorage.setItem("gastos_preferences", JSON.stringify(preferences));
}

export function formatMoney(value, preferences = loadPreferences()) {
  return `${preferences.currency || "$"}${Number(value || 0).toFixed(2)}`;
}
