let cookie: string | null = null;

// Global mapping of DPN modes to their corresponding tunnel codes
// This record is mutable and will be updated in getDpnMode to reflect the latest mapping.
const DPN_MODE_TUNNEL_CODE: Record<string, string> = {
  'direct': 'DIRECT'
};

export const getCookie = () => cookie;
export const setCookie = (newCookie: string) => {
  cookie = newCookie;
};

export const getDpnTunnelCode = (mode: string) => DPN_MODE_TUNNEL_CODE[mode];
export const setDpnTunnelCode = (mode: string, code: string) => {
  DPN_MODE_TUNNEL_CODE[mode] = code;
};