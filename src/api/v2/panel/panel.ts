import axios from '../axios/axiosInstance';

export async function getPanelInfo() {
  const base = (import.meta as any).env?.VITE_API_BASE_URL || '';
  const resp = await axios.get(base + '/panel/info');
  return resp.data;
}


