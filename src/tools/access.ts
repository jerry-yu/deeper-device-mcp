import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { listAccessControl, setOneAccessControl, AccessControlDevice, ensureAccessControlSwitch, getAccessControlSwitch, switchAccessControl } from '../functions';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getCookie, setDeviceList, getDeviceList } from '../state';
import { logToFile } from '../logger';

export const addAccesscontrolTool = (server: McpServer) => {
  server.tool(
    'listAccessControl',
    'List all devices in the access control list, separated into online and offline devices.',
    {
    },
    async (): Promise<CallToolResult> => {
      try {
        const cookie = getCookie();
        if (!cookie) {
          return {
            content: [
              {
                type: 'text',
                text: `Please login to Deeper device first using loginToDeeperDevice tool.`,
              }
            ],
          };
        }
        const result = await listAccessControl(cookie);
        if (result.success) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result.data, null, 2),
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: `Failed to list access control devices: ${result.error}`,
              },
            ],
          };
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    },
  );

  server.tool(
    'setAccessControl',
    `Starts the process of configuring a device's access control settings. It lists all devices and asks for which one to modify.`,
    {
    },
    async (): Promise<CallToolResult> => {
      try {
        const cookie = getCookie();
        if (!cookie) {
          return {
            content: [
              {
                type: 'text',
                text: `Please login to Deeper device first using loginToDeeperDevice tool.`,
              }
            ],
          };
        }
        const result = await listAccessControl(cookie);
        if (result.success && result.data) {
          const allDevices = [...result.data.online, ...result.data.offline];
          setDeviceList(allDevices);
          logToFile(`setAccessControl: Fetched and stored ${allDevices.length} devices.`);

          const formattedList = allDevices.map((device, index) =>
            `${index + 1}. ${device.name} (${device.mac})`
          ).join('\n');

          return {
            content: [
              {
                type: 'text',
                text: `Here are the devices:\n${formattedList}\nPlease use 'updateOneAccessControlDevice' with the device index and the settings you want to change.`,
              },
            ],
          };
        } else {
          logToFile(`setAccessControl: Failed to list devices. Error: ${result.error}`);
          return {
            content: [
              {
                type: 'text',
                text: `Failed to list access control devices: ${result.error}`,
              },
            ],
          };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logToFile(`setAccessControl: An unexpected error occurred: ${errorMessage}`);
        return {
          content: [
            {
              type: 'text',
              text: `An unexpected error occurred: ${errorMessage}`,
            },
          ],
        };
      }
    },
  );

  server.tool(
    'updateOneAccessControlDevice',
    `Configure a single device's access control settings by its index. Only provide the fields you want to change. The mac, ip, and regionCode fields cannot be modified.`,
    {
      index: z.number().int().positive().describe('The index of the device to update, as provided by setAccessControl.'),
      routeMode: z
        .string()
        .optional()
        .describe('The routing mode for the device (e.g., "direct", "smart", "full").'),
      httpsFilter: z
        .boolean()
        .optional()
        .describe(
          'Whether HTTPS filtering is enabled. If set to true, AdsFilter must be enabled.',
        ),
      bypass: z.array(z.string()).optional().describe('List of bypassed domains for the device.'),
      remark: z.string().optional().describe('A remark for the device.'),
      pinned: z.boolean().optional().describe('Whether the device is pinned.'),
      bwLimit: z.number().optional().describe('Bandwidth limit for the device.'),
    },
    async ({ index, ...deviceUpdates }): Promise<CallToolResult> => {
      try {
        const cookie = getCookie();
        if (!cookie) {
          logToFile('updateOneAccessControlDevice: Aborted. No cookie found.');
          return {
            content: [
              {
                type: 'text',
                text: `Please login to Deeper device first using loginToDeeperDevice tool.`,
              },
            ],
          };
        }

        // Ensure the access control switch is enabled before proceeding
        const ensureResult = await ensureAccessControlSwitch(cookie, true);
        if (!ensureResult.success) {
          logToFile(`updateOneAccessControlDevice: Failed to enable access control switch: ${ensureResult.error}`);
          return {
            content: [
              {
                type: 'text',
                text: `Failed to enable access control switch: ${ensureResult.error}`,
              },
            ],
          };
        }
        logToFile('updateOneAccessControlDevice: Access control switch enabled.');

        const deviceList = getDeviceList();
        if (!deviceList) {
          logToFile('updateOneAccessControlDevice: Aborted. Device list not found in state.');
          return {
            content: [
              {
                type: 'text',
                text: `Device list not found. Please run 'setAccessControl' first to select a device.`,
              },
            ],
          };
        }
        logToFile(`updateOneAccessControlDevice: Retrieved ${deviceList.length} devices from state.`);

        const deviceIndex = index === 0 ? 1 : index - 1;
        if (deviceIndex < 0 || deviceIndex >= deviceList.length) {
          logToFile(`updateOneAccessControlDevice: Aborted. Invalid index ${index}.`);
          return {
            content: [
              {
                type: 'text',
                text: `Invalid index ${index}. Please provide an index between 1 and ${deviceList.length}.`,
              },
            ],
          };
        }

        const existingDevice = deviceList[deviceIndex];
        logToFile(`updateOneAccessControlDevice: Selected device at index ${index}: ${JSON.stringify(existingDevice)}`);
        logToFile(`updateOneAccessControlDevice: Received updates: ${JSON.stringify(deviceUpdates)}`);

        const updatedDevice: AccessControlDevice = {
          ...existingDevice,
          ...deviceUpdates,
        };
        logToFile(`updateOneAccessControlDevice: Sending updated device to API: ${JSON.stringify(updatedDevice)}`);

        const setResult = await setOneAccessControl(cookie, updatedDevice);
        logToFile(`updateOneAccessControlDevice: API response: ${JSON.stringify(setResult)}`);

        if (setResult.success) {
          return {
            content: [
              {
                type: 'text',
                text: `Successfully updated device ${existingDevice.name} (${existingDevice.mac}).`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: `Failed to update device ${existingDevice.name} (${existingDevice.mac}): ${setResult.error}`,
              },
            ],
          };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logToFile(`updateOneAccessControlDevice: An unexpected error occurred: ${errorMessage}`);
        return {
          content: [
            {
              type: 'text',
              text: `An unexpected error occurred: ${errorMessage}`,
            },
          ],
        };
      }
    },
  );
};