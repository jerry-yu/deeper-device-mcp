import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { getServer } from './server';

async function main() {
  const server = getServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}


// import { listAccessControl, setOneAccessControl } from './functions';
// import { loginToDeeperDevice, listTunnels, getDpnMode, setDpnMode, listApps, addApp, getUrlFilterData, setCategoryStates, rebootDevice } from './functions';

// let cookie: string | null = null;
// async function main() {
//   const result = await loginToDeeperDevice('admin', 'yubo12345');
//   if (result.success) {
//     cookie = result.data;
//   }
//   if (!cookie) {
//     console.error('Login failed, no cookie received.');
//     return;
//   }
//   const tunnels = await listTunnels(cookie);
//   if (tunnels.success) {
//     console.log('Available tunnels:', tunnels.data);
//   }
//   const models = await getDpnMode(cookie);
//   if (models.success) {
//     console.log('Current DPN mode:', models.data);
//   }
//   const setResult = await setDpnMode(cookie, 'smart', 'KR');
//   if (setResult) {
//     console.log('DPN mode set successfully.');
//   }
//   else {
//     console.error('Failed to set DPN mode.');
//   }
//   const apps = await listApps(cookie);
//   if (apps.success) {
//     console.log('Available apps:', apps.data);
//   }
//   else {
//     console.error('Failed to list apps:', apps.error);
//   }

//   const addResult = await addApp(cookie, 'nbaLeaguePass', 'KR');
//   if (addResult.success) {
//     console.log('App added successfully:');
//   } else {
//     console.error('Failed to add app:', addResult.error);
//   }

//   const urlFilterData = await getUrlFilterData(cookie);
//   if (urlFilterData.success && urlFilterData.data) {
//     console.log('Current URL filter data:', urlFilterData.data);
//   }
//   else {
//     console.error('Failed to get URL filter data:', urlFilterData.error);
//   }

//   let curFilterData = urlFilterData.data;
//   if (!curFilterData) {
//     console.error('No URL filter data found, initializing with default values.');
//     return;
//   }

//   if (curFilterData.porn === 0) {
//     curFilterData.porn = 4; //
//   } else {
//     curFilterData.porn = 0;
//   }

//   const parentalControlResult = await setCategoryStates(cookie, curFilterData, true, false, false);
//   if (parentalControlResult) {
//     console.log('Parental control states updated successfully.');
//   }
//   else {
//     console.error('Failed to update parental control states.');
//   }

//   const urlFilterData2 = await getUrlFilterData(cookie);
//   if (urlFilterData2.success && urlFilterData2.data) {
//     console.log('Current URL filter data:', urlFilterData2.data);
//   }
//   else {
//     console.error('Failed to get URL filter data:', urlFilterData2.error);
//   }

//   // const rebootResult = await rebootDevice(cookie);
//   // if (rebootResult.success) {
//   //   console.log('Device reboot initiated successfully.');
//   // }
//   // else {
//   //   console.error('Failed to initiate device reboot:', rebootResult.error);
//   // }
//   // console.log('Please wait for the device to reboot and reconnect.');

//   const listAccessControlResult = await listAccessControl(cookie);
//   if (listAccessControlResult.success) {
//     console.log('Current access control settings:', listAccessControlResult.data);
//   }
//   else {
//     console.error('Failed to list access control:', listAccessControlResult.error);
//   }

//   const setAccessControlResult = await setOneAccessControl(cookie, {
//     mac: "80:fa:5b:70:49:c5", 
//     createdAt: 1710557445000, 
//     name: "yubo-hasse", 
//     routeMode: "smart", 
//     regionCode: "JP", 
//     httpsFilter: true, 
//     remark: "test", 
//     pinned: false, 
//     bypass: ["youtube", "spotify"],
//      bwLimit: 0, 
//      ip: "192.168.3.155"
//   }
//   );
//   if (setAccessControlResult.success) {
//     console.log('Access control set successfully.');
//   }
//   else {
//     console.error('Failed to set access control:', setAccessControlResult.error);
//   }

//   const listAccessControlResult2 = await listAccessControl(cookie);
//   if (listAccessControlResult2.success) {
//     console.log('Current access control settings:', listAccessControlResult2.data);
//   }
//   else {
//     console.error('Failed to list access control:', listAccessControlResult2.error);
//   }
// }


main().catch(console.error);