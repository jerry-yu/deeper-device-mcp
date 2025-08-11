
import axios from 'axios';
import { loginToDeeperDevice, setDpnMode, listTunnels, getDpnMode, listApps, addApp, addTunnel, deleteTunnels, setCategoryStates, getUrlFilterData, setAdsFilter, setSslBypass, getAdsFilter, rebootDevice, listAccessControl, setOneAccessControl, switchAccessControl, getAccessControlSwitch, ensureAccessControlSwitch, getSharingConfig, setSharingConfig, setSharingTrafficLimit, setSharingBandwidthLimit, getSessionInfo, getHardwareInfo, getSoftwareInfo, getNetworkAddress } from '../functions';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('loginToDeeperDevice', () => {
  it('should return a cookie on successful login', async () => {
    const response = {
      headers: {
        'set-cookie': ['session=12345; Path=/; HttpOnly'],
      },
    };
    mockedAxios.post.mockResolvedValue(response);

    const result = await loginToDeeperDevice('admin', 'password');

    expect(result.success).toBe(true);
    expect(result.data).toBe('session=12345');
  });

  it('should return an error on failed login', async () => {
    mockedAxios.post.mockRejectedValue(new Error('Request failed'));

    const result = await loginToDeeperDevice('admin', 'wrongpassword');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Request failed');
  });
});

describe('setDpnMode', () => {
  it('should return true on success', async () => {
    mockedAxios.post.mockResolvedValue({ data: { success: true } });

    const result = await setDpnMode('cookie', 'smart', 'tunnel');

    expect(result).toBe(true);
  });

  it('should return false on failure', async () => {
    mockedAxios.post.mockResolvedValue({ data: { success: false } });

    const result = await setDpnMode('cookie', 'smart', 'tunnel');

    expect(result).toBe(false);
  });
});

describe('listTunnels', () => {
  it('should return data on success', async () => {
    const response = { data: ['tunnel1', 'tunnel2'] };
    mockedAxios.get.mockResolvedValue(response);

    const result = await listTunnels('cookie');

    expect(result.success).toBe(true);
    expect(result.data).toEqual(response.data);
  });

  it('should return success false on error', async () => {
    mockedAxios.get.mockRejectedValue(new Error('Error'));

    const result = await listTunnels('cookie');

    expect(result.success).toBe(false);
  });
});

describe('getDpnMode', () => {
  it('should return data on success', async () => {
    const response = { data: { mode: 'smart' } };
    mockedAxios.get.mockResolvedValue(response);

    const result = await getDpnMode('cookie');

    expect(result.success).toBe(true);
    expect(result.data).toEqual(response.data);
  });

  it('should return success false on error', async () => {
    mockedAxios.get.mockRejectedValue(new Error('Error'));

    const result = await getDpnMode('cookie');

    expect(result.success).toBe(false);
  });
});

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('listApps', () => {
  it('should return app names on success', async () => {
    const response = {
      data: [
        {
          category: 'allCategories',
          appsBySubcategory: [
            {
              subcategory: 'allCountries',
              apps: [{ app: 'app1' }, { app: 'app2' }],
            },
          ],
        },
      ],
    };
    mockedAxios.get.mockResolvedValue(response);

    const result = await listApps('cookie');

    expect(result.success).toBe(true);
    expect(result.data).toEqual(['app1', 'app2']);
  });

  it('should return success false on error', async () => {
    mockedAxios.get.mockRejectedValue(new Error('Error'));

    const result = await listApps('cookie');

    expect(result.success).toBe(false);
  });
});

describe('addApp', () => {
  it('should return success true on success', async () => {
    mockedAxios.post.mockResolvedValue({ data: { success: true } });

    const result = await addApp('cookie', 'appName', 'tunnelCode');

    expect(result.success).toBe(true);
  });

  it('should return success false on error', async () => {
    mockedAxios.post.mockRejectedValue(new Error('Error'));

    const result = await addApp('cookie', 'appName', 'tunnelCode');

    expect(result.success).toBe(false);
  });
});

describe('addTunnel', () => {
  it('should return success true on success', async () => {
    mockedAxios.post.mockResolvedValue({ data: { success: true } });

    const result = await addTunnel('cookie', 'regionCode', 'countryCode');

    expect(result.success).toBe(true);
  });

  it('should return success false on error', async () => {
    mockedAxios.post.mockRejectedValue(new Error('Error'));

    const result = await addTunnel('cookie', 'regionCode', 'countryCode');

    expect(result.success).toBe(false);
  });
});

describe('deleteTunnels', () => {
  it('should return success true on success', async () => {
    mockedAxios.post.mockResolvedValue({ data: { success: true } });

    const result = await deleteTunnels('cookie', ['tunnel1', 'tunnel2']);

    expect(result.success).toBe(true);
  });

  it('should return success false on error', async () => {
    mockedAxios.post.mockRejectedValue(new Error('Error'));

    const result = await deleteTunnels('cookie', ['tunnel1', 'tunnel2']);

    expect(result.success).toBe(false);
  });
});

describe('setCategoryStates', () => {
  it('should return success true on success', async () => {
    mockedAxios.post.mockResolvedValue({ data: { success: true } });

    const result = await setCategoryStates(
      'cookie',
      { porn: 1 },
      true,
      false,
      false
    );

    expect(result.success).toBe(true);
  });
});

describe('getUrlFilterData', () => {
  it('should return data on success', async () => {
    const response = { data: { categoryStates: { porn: 1 } } };
    mockedAxios.get.mockResolvedValue(response);

    const result = await getUrlFilterData('cookie');

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ porn: 1 });
  });
});

describe('setAdsFilter', () => {
  it('should return success true on success', async () => {
    mockedAxios.post.mockResolvedValue({ data: { success: true } });

    const result = await setAdsFilter('cookie', true);

    expect(result.success).toBe(true);
  });
});

describe('setSslBypass', () => {
  it('should return success true on success', async () => {
    mockedAxios.post.mockResolvedValue({ data: { success: true } });

    const result = await setSslBypass('cookie', true);

    expect(result.success).toBe(true);
  });
});

describe('getAdsFilter', () => {
  it('should return data on success', async () => {
    const response = { data: { success: true, enable: true } };
    mockedAxios.get.mockResolvedValue(response);

    const result = await getAdsFilter('cookie');

    expect(result.success).toBe(true);
    expect(result.enable).toBe(true);
  });
});

describe('rebootDevice', () => {
  it('should return success true on success', async () => {
    mockedAxios.post.mockResolvedValue({ data: { success: true } });

    const result = await rebootDevice('cookie');

    expect(result.success).toBe(true);
  });
});

describe('listAccessControl', () => {
  it('should return data on success', async () => {
    const response = { data: { online: [], offline: [] } };
    mockedAxios.get.mockResolvedValue(response);

    const result = await listAccessControl('cookie');

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ online: [], offline: [] });
  });
});

describe('setOneAccessControl', () => {
  it('should return success true on success', async () => {
    mockedAxios.post.mockResolvedValue({ data: { success: true } });

    const result = await setOneAccessControl('cookie', {} as any);

    expect(result.success).toBe(true);
  });
});

describe('switchAccessControl', () => {
  it('should return success true on success', async () => {
    mockedAxios.post.mockResolvedValue({ data: { success: true } });

    const result = await switchAccessControl('cookie', true);

    expect(result.success).toBe(true);
  });
});

describe('getAccessControlSwitch', () => {
  it('should return data on success', async () => {
    const response = { data: { value: true } };
    mockedAxios.get.mockResolvedValue(response);

    const result = await getAccessControlSwitch('cookie');

    expect(result.success).toBe(true);
    expect(result.value).toBe(true);
  });
});

describe('ensureAccessControlSwitch', () => {
  it('should return success true if switch is already in desired state', async () => {
    mockedAxios.get.mockResolvedValue({ data: { value: true } });

    const result = await ensureAccessControlSwitch('cookie', true);

    expect(result.success).toBe(true);
  });

  it('should call switchAccessControl if switch is not in desired state', async () => {
    mockedAxios.get.mockResolvedValue({ data: { value: false } });
    mockedAxios.post.mockResolvedValue({ data: { success: true } });

    const result = await ensureAccessControlSwitch('cookie', true);

    expect(result.success).toBe(true);
  });
});

describe('getSharingConfig', () => {
  it('should return data on success', async () => {
    const response = { data: { sharingEnabled: true } };
    mockedAxios.get.mockResolvedValue(response);

    const result = await getSharingConfig('cookie');

    expect(result.sharingEnabled).toBe(true);
  });
});

describe('setSharingConfig', () => {
  it('should return success true on success', async () => {
    mockedAxios.post.mockResolvedValue({ data: { success: true } });

    const result = await setSharingConfig('cookie', 'btEnabled', true);

    expect(result.success).toBe(true);
  });
});

describe('setSharingTrafficLimit', () => {
  it('should return success true on success', async () => {
    mockedAxios.post.mockResolvedValue({ data: { success: true } });

    const result = await setSharingTrafficLimit('cookie', 100);

    expect(result.success).toBe(true);
  });
});

describe('setSharingBandwidthLimit', () => {
  it('should return success true on success', async () => {
    mockedAxios.post.mockResolvedValue({ data: { success: true } });

    const result = await setSharingBandwidthLimit('cookie', 100);

    expect(result.success).toBe(true);
  });
});

describe('getSessionInfo', () => {
  it('should return data on success', async () => {
    const response = { data: { maxSessionNum: '100' } };
    mockedAxios.get.mockResolvedValue(response);

    const result = await getSessionInfo('cookie');

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ maxSessionNum: '100' });
  });
});

describe('getHardwareInfo', () => {
  it('should return data on success', async () => {
    const response = { data: { SN: '123' } };
    mockedAxios.get.mockResolvedValue(response);

    const result = await getHardwareInfo('cookie');

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ SN: '123' });
  });
});

describe('getSoftwareInfo', () => {
  it('should return data on success', async () => {
    const response = { data: { softwareVersion: '1.0' } };
    mockedAxios.get.mockResolvedValue(response);

    const result = await getSoftwareInfo('cookie');

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ softwareVersion: '1.0' });
  });
});

describe('getNetworkAddress', () => {
  it('should return data on success', async () => {
    const response = { data: { ip: '1.2.3.4' } };
    mockedAxios.get.mockResolvedValue(response);

    const result = await getNetworkAddress('cookie');

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ ip: '1.2.3.4' });
  });
});
