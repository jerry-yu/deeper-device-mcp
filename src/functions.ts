import { publicEncrypt } from "node:crypto";
import publicKey from './public';
import axios from 'axios';



const encryptWithPublicKey = function (string: string) {
    if (string) {
        const encrypted = publicEncrypt(publicKey, Buffer.from(string));
        return encrypted.toString('base64');
    }
    return '';
};

async function loginToDeeperDevice(username: string, password: string): Promise<any> {
    password = encryptWithPublicKey(password);
    const url = 'http://192.168.3.57/api/admin/login';
    const headers = {
        Host: '192.168.3.57',
        Connection: 'keep-alive',
        //'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
       // Origin: 'http://192.168.3.57',
        //Referer: 'http://192.168.3.57/login',
        'Accept-Encoding': 'gzip, deflate',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7',
    };

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
    const url = 'http://192.168.3.57/api/smartRoute/setDpnMode';
    const headers = {
        'Host': '192.168.3.57',
        'Connection': 'keep-alive',
        //'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        //'Origin': 'http://192.168.3.57',
        //'Referer': 'http://192.168.3.57/admin/route-mode',
        'Accept-Encoding': 'gzip, deflate',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7',
        'Cookie': '' + (cookie || ''), // Use the stored cookie
    };

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
        tunnelCode: tunnelCode || 'KR',
    };

    try {
        const response = await axios.post(url, data, { headers });
        console.log('Response data:', response.data);
        return true;
    } catch (error) {
        console.error('Error:', error);
    }
    return false;
}

async function listTunnels(cookie: string): Promise<any> {
    const url = 'http://192.168.3.57/api/smartRoute/listTunnels';
    const headers = {
        'Host': '192.168.3.57',
        'Connection': 'keep-alive',
        //'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        //'Referer': 'http://192.168.3.57/admin/app-relocator',
        'Accept-Encoding': 'gzip, deflate',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7',
        'Cookie': cookie || '',
    };

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
    const url = 'http://192.168.3.57/api/smartRoute/getDpnMode';
    const headers = {
        'Host': '192.168.3.57',
        'Connection': 'keep-alive',
        // 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7',
        'Cookie': cookie || '',
    };

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

export { loginToDeeperDevice, setDpnMode, listTunnels, encryptWithPublicKey, getDpnMode };
