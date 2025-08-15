import axiosInstance from '../axios/axiosInstance';
import { BaseResponse } from '../axios/axiosInstance';

interface TunnelListResponse extends BaseResponse {
    data: Array<{
        id: number;
        name: string;
        localip: string;
        type: string;
        nport: number;
        dorp: string;
        node: string;
        state: string;
        userid: number;
        encryption: string;
        compression: string;
        ap: string;
        uptime: string;
        client_version: string;
        today_traffic_in: number;
        today_traffic_out: number;
        cur_conns: number;
        nodestate: string;
        ip: string | null;
    }> | null;
}

export const getTunnelList = (token: string): Promise<TunnelListResponse> => {
    return axiosInstance.get('/tunnels', {
        params: { token },
    });
};

interface CreateTunnelResponse extends BaseResponse {
    data: {
        id: number | null;
        name: string;
        localip: string;
        type: string;
        nport: number;
        dorp: string;
        node: string;
        state: string;
        userid: number;
        encryption: string;
        compression: string;
        ap: string;
        uptime: string | null;
        client_version: string;
        today_traffic_in: number;
        today_traffic_out: number;
        cur_conns: number;
        nodestate: string | null;
        ip: string | null;
    };
}

export const createTunnel = (params: {
    token: string;
    tunnelname: string;
    node: string;
    porttype: string;
    localport: number;
    encryption: boolean;
    compression: boolean;
    localip?: string;
    remoteport?: number;
    banddomain?: string;
    extraparams?: string;
}): Promise<CreateTunnelResponse> => {
    return axiosInstance.post('/tunnels', params);
};

export const deleteTunnel = (token: string, tunnelid: number): Promise<BaseResponse> => {
    return axiosInstance.post('/tunnels', { token, tunnelid });
};

export const updateTunnel = (params: {
    tunnelid: number;
    token: string;
    tunnelname?: string;
    node?: string;
    localip?: string;
    porttype?: string;
    localport?: number;
    remoteport?: number;
    banddomain?: string;
    encryption?: boolean;
    compression?: boolean;
    extraparams?: string;
}): Promise<BaseResponse> => {
    return axiosInstance.post('/tunnels', params);
};

interface GetTunnelConfigResponse extends BaseResponse {
    data: string;
}

export const getTunnelConfig = (
    token: string,
    node: string,
    tunnel_names?: string
): Promise<GetTunnelConfigResponse> => {
    return axiosInstance.get('/tunnel_config', {
        params: { token, node, tunnel_names },
    });
};

interface GetTunnelLast7daysResponse extends BaseResponse {
    data: {
        traffic_in: number[];
        traffic_out: number[];
    };
}

export const getTunnelLast7days = (token: string, tunnel_id: number): Promise<GetTunnelLast7daysResponse> => {
    return axiosInstance.get('/tunnel/last7days', {
        params: { token, tunnel_id },
    });
};
