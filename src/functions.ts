import { publicEncrypt } from "node:crypto";
import publicKey from './public';
import axios from 'axios';
import { exec } from "node:child_process";

let BaseUrl = '34.34.34.34';
//let BaseUrl = '192.168.3.57';

const setBaseUrl = function (url: string) {
    BaseUrl = url;
}

const encryptWithPublicKey = function (string: string) {
    if (string) {
        const encrypted = publicEncrypt(publicKey, Buffer.from(string));
        return encrypted.toString('base64');
    }
    return '';
};

const getDefaultHeaders = function (cookie?: string) {
    return {
        'Host': BaseUrl,
        'Connection': 'keep-alive',
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7',
        'Cookie': cookie || '',
    };
};

async function loginToDeeperDevice(username: string, password: string): Promise<any> {
    password = encryptWithPublicKey(password);
    const url = `http://${BaseUrl}/api/admin/login`;
    const headers = getDefaultHeaders();

    const data = {
        username: username,
        password: password,
    };

    try {
        const response = await axios.post(url, data, { headers });
        const cookies = response.headers['set-cookie'];
        if (cookies && cookies.length > 0) {
            const cookie = cookies[0].split(';')[0]; // Extract the first cookie
            return {
                success: true,
                data: cookie,
            };
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

async function setDpnMode(cookie: string, mode: string, tunnelCode: string): Promise<boolean> {
    const url = `http://${BaseUrl}/api/smartRoute/setDpnMode`;
    const headers = getDefaultHeaders(cookie);

    let dpnMode = '';
    if (mode.includes('direct')) {
        dpnMode = 'disabled';
    } else if (mode.includes('smart')) {
        dpnMode = 'smart';
    } else if (mode.includes('full')) {
        dpnMode = 'full';
    }

    const data = {
        dpnMode: dpnMode,
        tunnelCode: tunnelCode,
    };

    try {
        const response = await axios.post(url, data, { headers });
        console.warn('setDpnMode response data:', response.data);
        return response.data && response.data.success === true;
    } catch (error) {
        console.error('Error:', error);
    }
    return false;
}

async function refreshTunnel(cookie: string, tunnelCode: string): Promise<{ success: boolean; error?: string }> {
    const url = `http://${BaseUrl}/api/smartRoute/refreshTunnel`;
    const headers = getDefaultHeaders(cookie);
    const data = { tunnelCode };

    try {
        const response = await axios.post(url, data, { headers });
        return {
            success: response.data && response.data.success === true,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

async function switchNode(
    cookie: string,
    tunnelCode: string,
    currentIp: string
): Promise<{ success: boolean; activeIp?: string; activeNum?: number; error?: string }> {
    const url = `http://${BaseUrl}/api/smartRoute/switchNode`;
    const headers = getDefaultHeaders(cookie);
    const data = { tunnelCode, currentIp };

    try {
        const response = await axios.post(url, data, { headers });
        return {
            success: response.data && response.data.success === true,
            activeIp: response.data?.activeIp,
            activeNum: response.data?.activeNum,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

async function listTunnels(cookie: string): Promise<any> {
    const url = `http://${BaseUrl}/api/smartRoute/listTunnels`;
    const headers = getDefaultHeaders(cookie);

    try {
        const response = await axios.get(url, { headers });
        return {
            success: true,
            data: response.data,
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            success: false
        };
    }
}

async function getDpnMode(cookie: string): Promise<any> {
    const url = `http://${BaseUrl}/api/smartRoute/getDpnMode`;
    const headers = getDefaultHeaders(cookie);

    try {
        const response = await axios.get(url, { headers });
        return {
            success: true,
            data: response.data,
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

async function listApps(cookie: string): Promise<any> {
    const url = `http://${BaseUrl}/api/appRelocator/apps`;
    const headers = getDefaultHeaders(cookie);

    try {
        const response = await axios.get(url, { headers });
        const data = response.data;
        if (Array.isArray(data)) {
            const categoryObj = data.find((item: any) => item.category === 'allCategories');
            if (categoryObj && Array.isArray(categoryObj.appsBySubcategory)) {
                const subcatObj = categoryObj.appsBySubcategory.find((sub: any) => sub.subcategory === 'allCountries');
                if (subcatObj && Array.isArray(subcatObj.apps)) {
                    const appNames = subcatObj.apps.map((app: any) => app.app);
                    return {
                        success: true,
                        data: appNames,
                    };
                }
            }
        }
        return {
            success: false,
            error: 'Invalid data structure for fetching apps',
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

async function addApp(cookie: string, appName: string, tunnelCode: string): Promise<{ success: boolean; error?: string }> {
    const url = `http://${BaseUrl}/api/appRelocator/addApp`;
    const headers = getDefaultHeaders(cookie);

    const data = {
        appName,
        tunnelCode,
    };

    try {
        const response = await axios.post(url, data, { headers });
        return {
            success: response.data && response.data.success === true,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

async function addTunnel(cookie: string, regionCode: string, countryCode: string): Promise<{ success: boolean; error?: string }> {
    const url = `http://${BaseUrl}/api/smartRoute/addTunnel`;
    const headers = getDefaultHeaders(cookie);

    const data = {
        regionCode,
        countryCode,
    };

    try {
        const response = await axios.post(url, data, { headers });
        return {
            success: response.data && response.data.success === true,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

async function deleteTunnels(cookie: string, tunnelCodes: string[]): Promise<{ success: boolean; error?: string }> {
    const url = `http://${BaseUrl}/api/smartRoute/deleteTunnels`;
    const headers = getDefaultHeaders(cookie);

    try {
        const response = await axios.post(url, tunnelCodes, { headers });
        return {
            success: response.data && response.data.success === true,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

async function setCategoryStates(
    cookie: string,
    states: { [key: string]: number },
    pornStateChanged: boolean,
    socialStateChanged: boolean,
    gameStateChanged: boolean
): Promise<{ success: boolean; error?: string }> {
    const url = `http://${BaseUrl}/api/security/setCategoryStates`;
    const headers = getDefaultHeaders(cookie);

    const data = {
        states,
        pornStateChanged,
        socialStateChanged,
        gameStateChanged,
    };

    try {
        const response = await axios.post(url, data, { headers });
        return {
            success: response.data && response.data.success === true,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

async function getUrlFilterData(cookie: string): Promise<{ success: boolean; data?: { [key: string]: number }; error?: string }> {
    const url = `http://${BaseUrl}/api/security/getUrlFilterData`;
    const headers = getDefaultHeaders(cookie);

    try {
        const response = await axios.get(url, { headers });
        const categoryStates = response.data?.categoryStates;
        console.warn('getUrlFilterData response data:', response.data);
        if (categoryStates && typeof categoryStates === 'object') {
            return {
                success: true,
                data: categoryStates as { [key: string]: number },
            };
        } else {
            return {
                success: false,
                error: 'No categoryStates data found',
            };
        }
    } catch (error) {
        console.error('Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

async function setAdsFilter(
    cookie: string,
    enable: boolean
): Promise<{ success: boolean; error?: string }> {
    const url = `http://${BaseUrl}/api/tproxy/adsFilter`;
    const headers = getDefaultHeaders(cookie);

    const data = {
        type: 'httpsFilter',
        enable,
    };

    try {
        const response = await axios.post(url, data, { headers });
        return {
            success: response.data && response.data.success === true,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

async function setSslBypass(
    cookie: string,
    enable: boolean
): Promise<{ success: boolean; error?: string }> {
    const url = `http://${BaseUrl}/api/tproxy/sslBypass`;
    const headers = getDefaultHeaders(cookie);

    const data = {
        enable,
    };

    try {
        const response = await axios.post(url, data, { headers });
        return {
            success: response.data && response.data.success === true,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

async function getAdsFilter(
    cookie: string
): Promise<{ success: boolean; enable?: boolean; error?: string }> {
    const url = `http://${BaseUrl}/api/tproxy/adsFilter`;
    const headers = getDefaultHeaders(cookie);

    try {
        const response = await axios.get(url, { headers });
        return {
            success: response.data && response.data.success === true,
            enable: response.data?.enable,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

async function rebootDevice(cookie: string): Promise<{ success: boolean; error?: string }> {
    const url = `http://${BaseUrl}/api/admin/reboot`;
    const headers = getDefaultHeaders(cookie);

    try {
        await axios.post(url, undefined, { headers, timeout: 1000 });
        return { success: true };
    } catch (error: any) {
        if (
            error.code === 'ECONNABORTED' ||
            error.code === 'ECONNRESET' ||
            error.message?.includes('aborted') ||
            error.message?.includes('socket hang up') ||
            error.message?.includes('timeout')
        ) {
            return { success: true };
        }
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

export interface AccessControlDevice {
    mac: string;
    createdAt: number;
    name: string;
    routeMode: string;
    regionCode: string | null;
    httpsFilter: boolean;
    remark: string;
    pinned: boolean;
    bypass: string[];
    bwLimit: number;
    ip: string;
}

interface AccessControlListResponse {
    online: AccessControlDevice[];
    offline: AccessControlDevice[];
}

async function listAccessControl(cookie: string): Promise<{ success: boolean; data?: AccessControlListResponse; error?: string }> {
    const url = `http://${BaseUrl}/api/accessControl/list`;
    const headers = getDefaultHeaders(cookie);

    try {
        const response = await axios.get(url, { headers });
        return {
            success: true,
            data: response.data as AccessControlListResponse,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

async function setOneAccessControl(cookie: string, updates: AccessControlDevice): Promise<{ success: boolean; error?: string }> {
    const url = `http://${BaseUrl}/api/accessControl/setOne`;
    const headers = getDefaultHeaders(cookie);

    const data = {
        ...updates,
    };

    console.warn('setOneAccessControl data:', data);
    try {
        const response = await axios.post(url, data, { headers });
        return {
            success: response.data && response.data.success === true,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

async function switchAccessControl(cookie: string, value: boolean): Promise<{ success: boolean; error?: string }> {
    const url = `http://${BaseUrl}/api/accessControl/switch`;
    const headers = getDefaultHeaders(cookie);
    const data = { value };

    try {
        const response = await axios.post(url, data, { headers });
        return {
            success: response.data && response.data.success === true,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

async function getAccessControlSwitch(cookie: string): Promise<{ success: boolean; value?: boolean; error?: string }> {
    const url = `http://${BaseUrl}/api/accessControl/switch`;
    const headers = getDefaultHeaders(cookie);

    try {
        const response = await axios.get(url, { headers });
        return {
            success: typeof response.data?.value === 'boolean',
            value: response.data?.value,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Ensure the access control switch is set to the desired value.
 * @param cookie Authentication cookie
 * @param value Desired switch value
 * @returns {Promise<{ success: boolean; error?: string }>}
 */
async function ensureAccessControlSwitch(cookie: string, value: boolean): Promise<{ success: boolean; error?: string }> {
    const current = await getAccessControlSwitch(cookie);
    if (!current.success) {
        return { success: false, error: current.error || 'Failed to get current switch state' };
    }
    if (current.value === value) {
        return { success: true };
    }
    const result = await switchAccessControl(cookie, value);
    return { success: result.success, error: result.error };
}

async function getSharingConfig(
    cookie: string
): Promise<{
    success: boolean;
    sharingEnabled?: boolean;
    btEnabled?: boolean;
    smtpEnabled?: boolean;
    maxBandwidth?: string;
    dnsBlacklistForSharing?: boolean;
    error?: string;
}> {
    const url = `http://${BaseUrl}/api/sharing/getSharingConfig`;
    const headers = getDefaultHeaders(cookie);

    try {
        const response = await axios.get(url, { headers });
        return {
            success: response.data?.success === true,
            sharingEnabled: response.data?.sharingEnabled,
            btEnabled: response.data?.btEnabled,
            smtpEnabled: response.data?.smtpEnabled,
            maxBandwidth: response.data?.maxBandwidth,
            dnsBlacklistForSharing: response.data?.dnsBlacklistForSharing,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Generic function to set sharing config (bt, smtp, sharing).
 * @param cookie Authentication cookie
 * @param type 'btEnabled' | 'smtpEnabled' | 'sharingEnabled'
 * @param value boolean value to set
 */
async function setSharingConfig(
    cookie: string,
    type: 'btEnabled' | 'smtpEnabled' | 'sharingEnabled',
    value: boolean
): Promise<{ success: boolean; error?: string }> {
    let url = '';
    let data: any = {};
    const headers = getDefaultHeaders(cookie);

    if (type === 'btEnabled') {
        url = `http://${BaseUrl}/api/sharing/setBtSharing`;
        data = { btEnabled: value };
    } else if (type === 'smtpEnabled') {
        url = `http://${BaseUrl}/api/sharing/setSmtpSharing`;
        data = { smtpEnabled: value };
    } else if (type === 'sharingEnabled') {
        url = `http://${BaseUrl}/api/sharing/setSharingState`;
        data = { sharingEnabled: value };
    } else {
        return { success: false, error: 'Invalid sharing config type' };
    }

    try {
        const response = await axios.post(url, data, { headers });
        return {
            success: response.data && response.data.success === true,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Set BT sharing state.
 */
async function setBtSharing(
    cookie: string,
    btEnabled: boolean
): Promise<{ success: boolean; error?: string }> {
    return setSharingConfig(cookie, 'btEnabled', btEnabled);
}

async function setSmtpSharing(cookie: string, smtpEnabled: boolean) {
    return setSharingConfig(cookie, 'smtpEnabled', smtpEnabled);
}
async function setSharingState(cookie: string, sharingEnabled: boolean) {
    return setSharingConfig(cookie, 'sharingEnabled', sharingEnabled);
}

/**
 * Set sharing traffic limit (unit is always GB).
 * @param cookie Authentication cookie
 * @param number Monthly traffic limit number (in GB)
 */
async function setSharingTrafficLimit(
    cookie: string,
    number: number
): Promise<{ success: boolean; error?: string }> {
    const url = `http://${BaseUrl}/api/sharing/setTrafficLimit`;
    const headers = getDefaultHeaders(cookie);
    const data = { number, unit: 'GB' };

    try {
        const response = await axios.post(url, data, { headers });
        return {
            success: response.data && response.data.success === true,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Set sharing bandwidth limit.
 * @param cookie Authentication cookie
 * @param number Bandwidth limit number (in Mbps)
 */
async function setSharingBandwidthLimit(
    cookie: string,
    number: number
): Promise<{ success: boolean; error?: string }> {
    const url = `http://${BaseUrl}/api/sharing/setBandwidthLimit`;
    const headers = getDefaultHeaders(cookie);
    number = number * 1024;
    const data = { number };

    try {
        const response = await axios.post(url, data, { headers });
        return {
            success: response.data && response.data.success === true,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Get session info from the device.
 * @param cookie Authentication cookie
 * @returns Session info object
 */
async function getSessionInfo(cookie: string): Promise<{
    success: boolean;
    data?: {
        maxSessionNum: string;
        currSessionNum: string;
        tcpSessionNum: string;
        udpSessionNum: string;
        icmpSessionNum: string;
        tunnelSessionNum: string;
    };
    error?: string;
}> {
    const url = `http://${BaseUrl}/api/system-info/session-info`;
    const headers = getDefaultHeaders(cookie);

    try {
        const response = await axios.get(url, { headers });
        return {
            success: true,
            data: response.data,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

async function getHardwareInfo(cookie: string): Promise<{
    success: boolean;
    data?: {
        SN: string;
        deviceId: string;
        cpuCount: number;
        cpuModel: string;
        totalMem: number;
        tempInCelsius: number;
    };
    error?: string;
}> {
    const url = `http://${BaseUrl}/api/system-info/hardware-info`;
    const headers = getDefaultHeaders(cookie);

    try {
        const response = await axios.get(url, { headers });
        return {
            success: true,
            data: response.data,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}


async function getSoftwareInfo(cookie: string): Promise<{ success: boolean; data?: { softwareVersion: string; appSigVersion: string; builtinRuleVersion: string; urlSigVersion: string }; error?: string }> {
    const url = `http://${BaseUrl}/api/system-info/software-info`;
    const headers = getDefaultHeaders(cookie);

    try {
        const response = await axios.get(url, { headers });
        return {
            success: true,
            data: response.data,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Ping an IP address to check connectivity.
 * @param ip IP address to ping
 * @returns Promise resolving to true if reachable, false otherwise
 */
async function pingIp(ip: string): Promise<boolean> {
    return new Promise((resolve) => {
        // Use -c 1 for Unix, -n 1 for Windows
        const platform = process.platform;
        const cmd = platform === "win32" ? `ping -n 1 ${ip}` : `ping -c 1 ${ip}`;
        exec(cmd, (error) => {
            resolve(!error);
        });
    });
}

async function getNetworkAddress(cookie: string): Promise<{ success: boolean; data?: { ip: string; pubIp: string; routerMac: string; gatewayMac: string }; error?: string }> {
    const url = `http://${BaseUrl}/api/system-info/network-address`;
    const headers = getDefaultHeaders(cookie);

    try {
        const response = await axios.get(url, { headers });
        return {
            success: true,
            data: response.data,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

export {
    getNetworkAddress,
    getSoftwareInfo,
    getHardwareInfo,
    getSessionInfo,
    deleteTunnels,
    rebootDevice,
    getAdsFilter,
    setSslBypass,
    setAdsFilter,
    getUrlFilterData,
    setCategoryStates,
    loginToDeeperDevice,
    setDpnMode,
    listTunnels,
    switchNode,
    refreshTunnel,
    pingIp,
    encryptWithPublicKey,
    getDpnMode,
    listApps,
    addApp,
    addTunnel,
    setBaseUrl,
    listAccessControl,
    setOneAccessControl,
    switchAccessControl,
    getAccessControlSwitch,
    ensureAccessControlSwitch,
    setSharingState,
    setBtSharing,
    setSharingConfig,
    getSharingConfig,
    setSmtpSharing,
    setSharingTrafficLimit,
    setSharingBandwidthLimit,
};

