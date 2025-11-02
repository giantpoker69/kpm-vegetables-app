
// src/config.js
export const API = {
  baseUrl: "https://soucauwn16.execute-api.ap-south-1.amazonaws.com/prod/",
  getData: async (path) => {
    const url = `${API.baseUrl}${path}`;
    const res = await fetch(url);
    return res.json();
  },
  saveData: async (path, payload) => {
    const url = `${API.baseUrl}${path}`;
    // fallback simple save using POST to /data
    try {
      const res = await fetch(`${API.baseUrl}data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: path, item: payload }),
      });
      return res.json();
    } catch (e) {
      console.error("saveData error:", e);
      return { error: e.message };
    }
  }
};
export default API;
