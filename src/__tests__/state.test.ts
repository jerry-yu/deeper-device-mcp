
import { getCookie, setCookie, getDeviceList, setDeviceList, getDpnTunnelCode, setDpnTunnelCode } from '../state';

describe('state', () => {
  it('should set and get the cookie', () => {
    const cookie = 'test-cookie';
    setCookie(cookie);
    expect(getCookie()).toBe(cookie);
  });

  it('should set and get the device list', () => {
    const deviceList = [{ mac: 'test-mac' }] as any;
    setDeviceList(deviceList);
    expect(getDeviceList()).toBe(deviceList);
  });

  it('should set and get the DPN tunnel code', () => {
    const mode = 'smart';
    const code = 'US';
    setDpnTunnelCode(mode, code);
    expect(getDpnTunnelCode(mode)).toBe(code);
  });
});
