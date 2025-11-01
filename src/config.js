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