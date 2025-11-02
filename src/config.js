<<<<<<< HEAD

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
=======
export const API_URL = 'https://soucauwn16.execute-api.ap-south-1.amazonaws.com/prod';

export const API = {
  getData: async (table) => {
    const response = await fetch(`${API_URL}/data?table=${table}`);
    return response.json();
  },
  
  saveData: async (table, item) => {
    const response = await fetch(`${API_URL}/data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, item })
    });
    return response.json();
  },
  
  deleteData: async (table, key) => {
    const response = await fetch(`${API_URL}/data`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, key })
    });
    return response.json();
  },
  
  backup: async () => {
    const response = await fetch(`${API_URL}/backup`, {
      method: 'POST'
    });
    return response.json();
  }
};
>>>>>>> 01a218b02226c3fea1d954794db6943aa4d30da1
