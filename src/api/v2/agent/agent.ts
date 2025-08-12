import axiosInstance from '../axios/axiosInstance';
import { BaseResponse } from '../axios/axiosInstance';

export interface AgentStatusResponse extends BaseResponse {
  data: any;
}

export const getAgentStatus = async (node_id: number): Promise<AgentStatusResponse> => {
  return axiosInstance.get('/node_agent/status', { params: { node_id } });
};

export const getAdminVersion = async (node_id: number): Promise<BaseResponse> => {
  return axiosInstance.get('/node_admin/version', { params: { node_id } });
};

export const getServerConfig = async (node_id: number): Promise<BaseResponse> => {
  return axiosInstance.get('/node_admin/server-config', { params: { node_id } });
};

export const setServerConfig = async (node_id: number, config: any): Promise<BaseResponse> => {
  return axiosInstance.put('/node_admin/server-config', { node_id, config });
};

export const getProxies = async (node_id: number, type: string): Promise<BaseResponse> => {
  return axiosInstance.get('/node_admin/proxies', { params: { node_id, type } });
};

export const getClients = async (node_id: number): Promise<BaseResponse> => {
  return axiosInstance.get('/node_admin/clients', { params: { node_id } });
};

export const clientCmd = async (node_id: number, payload: any): Promise<BaseResponse> => {
  return axiosInstance.post('/node_admin/client/cmd', { node_id, ...payload });
};

export const reloadPermissions = async (node_id: number, users: any[]): Promise<BaseResponse> => {
  return axiosInstance.post('/node_agent/reload_permissions', { node_id, users });
};

export const logsStreamUrl = (node_id: number): string => {
  // 直接拼接到同域 API，下游会 307 跳转到节点
  const base = (import.meta as any).env?.VITE_API_BASE_URL || '';
  return `${base}/node_admin/logs/stream?node_id=${node_id}`;
};


