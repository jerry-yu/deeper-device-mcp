import { publicEncrypt } from "node:crypto";
import publicKey from './public';
import axios from 'axios';


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
        console.log('setDpnMode response data:', response.data);
        return response.data && response.data.success === true;
    } catch (error) {
        console.error('Error:', error);
    }
    return false;
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
        console.log('getUrlFilterData response data:', response.data);
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

export {getUrlFilterData,setCategoryStates, loginToDeeperDevice, setDpnMode, listTunnels, encryptWithPublicKey, getDpnMode, listApps, addApp ,addTunnel ,setBaseUrl};
