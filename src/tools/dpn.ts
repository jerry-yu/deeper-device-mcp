import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { setDpnMode, listTunnels, getDpnMode, listApps, addApp, addTunnel } from '../functions';
import { getCookie, getDpnTunnelCode, setDpnTunnelCode } from '../state';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export const addDpnTools = (server: McpServer) => {
  server.tool(
    'setDpnMode',
    'Sets the DPN mode and the associated tunnel for that mode.',
    {
      dpnMode: z.string().describe("The DPN mode to set: 'direct' for Direct routing, 'smart' for Smart routing, or 'full' for Full routing.").default('smart'),
      tunnelCode: z.string().describe(`tunnel code`).nullable(),
    },
    async ({ dpnMode, tunnelCode }): Promise<CallToolResult> => {
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

      if (!tunnelCode) {
        if (getDpnTunnelCode(dpnMode)) {
          tunnelCode = getDpnTunnelCode(dpnMode);
        } else {
          return {
            content: [
              {
                type: 'text',
                text: `tunnelCode is required for setting dpnMode, please use listTunnels tool to pick one available tunnel codes.`,
              }
            ],
          };
        }
      }
      const success = await setDpnMode(cookie, dpnMode, tunnelCode);
      if (success) {
        console.log(`set-dpn-mode successful, dpnMode: ${dpnMode}`);
        return {
          content: [
            {
              type: 'text',
              text: `set Deeper device DPN mode to ${dpnMode} success`,
            }
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `set Deeper device DPN mode to ${dpnMode} failed`,
            }
          ],
        };
      }
    }
  );

  server.tool(
    'listTunnels',
    'Lists the active tunnels available for DPN configuration.',
    {},
    async (): Promise<CallToolResult> => {
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
      try {
        const result = await listTunnels(cookie);
        if (result.success && Array.isArray(result.data)) {
          const tunnelCodes = result.data.map((t: any) => t.tunnelCode);
          return {
            content: [
              {
                type: 'text',
                text: tunnelCodes.join(', '),
              }
            ],
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: `listTunnels failed: ${result.error}`,
              }
            ],
          };
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `listTunnels error: ${error.message || error}`,
            }
          ],
        };
      }
    }
  );

  server.tool(
    'getDpnMode',
    'Retrieves the current DPN mode and the tunnels assigned to "smart" and "full" modes.',
    {},
    async (): Promise<CallToolResult> => {
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
      try {
        const result = await getDpnMode(cookie);
        if (result.success) {

          if (typeof result.data === 'object' && result.data !== null) {
            const { dpnMode, smartTunnel, fullTunnel } = result.data;
            if (typeof smartTunnel === 'string') {
              setDpnTunnelCode('smart', smartTunnel);
            }
            if (typeof fullTunnel === 'string') {
              setDpnTunnelCode('full', fullTunnel);
            }
            if (typeof result.data.tunnelCode === 'string') {
              setDpnTunnelCode('curMode', dpnMode);
            }
          }

          return {
            content: [
              {
                type: 'text',
                text: `Current DPN mode: ${result.data}`,
              }
            ],
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: `getDpnMode failed: ${result.error}`,
              }
            ],
          };
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `getDpnMode error: ${error.message || error}`,
            }
          ],
        };
      }
    }
  );

  server.tool(
    'listApps',
    'Lists all applications that can have their own dedicated DPN tunnel.',
    {},
    async (): Promise<CallToolResult> => {
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
      try {
        const result = await listApps(cookie);
        if (result.success && Array.isArray(result.data)) {
          // result.data is an array of strings like ['nbaLeaguePass', 'nbcSports']
          return {
            content: [
              {
                type: 'text',
                text: `Supported apps: ${result.data.join(', ')}`,
              }
            ],
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: `listApps failed: ${result.error}`,
              }
            ],
          };
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `listApps error: ${error.message || error}`,
            }
          ],
        };
      }
    }
  );

  server.tool(
    'setAppTunnelCode',
    'Assigns a specific tunnel to an application, overriding the main DPN mode for that app.',
    {
      appName: z.string().describe('The name of the app to set.'),
      tunnelCode: z.string().describe('The tunnel code to use for the app, if using Direct Access, the tunnel code is LL.'),
    },
    async ({ appName, tunnelCode }): Promise<CallToolResult> => {
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
      try {
        const result = await addApp(cookie, appName, tunnelCode);
        if (result.success) {
          return {
            content: [
              {
                type: 'text',
                text: `App "${appName}" added successfully with tunnel code "${tunnelCode}".`,
              }
            ],
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: `addApp failed: ${result.error}`,
              }
            ],
          };
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `addApp error: ${error.message || error}`,
            }
          ],
        };
      }
    }
  );

  server.tool(
    'addTunnel',
    'Adds a new tunnel to the active list, making it available for DPN configuration.',
    {
      regionCode: z.string().describe(`Regin code(e.g., 'AMN' for North America, 'ASE' for East Asia)`),
      tunnelCode: z.string().describe('Tunnel code to add.'),
    },
    async ({ regionCode, tunnelCode }): Promise<CallToolResult> => {
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
      try {
        const result = await addTunnel(cookie, regionCode, tunnelCode);
        if (result.success) {
          return {
            content: [
              {
                type: 'text',
                text: `Tunnel "${tunnelCode}" in region "${regionCode}" added successfully.`,
              }
            ],
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: `addTunnel failed: ${result.error}`,
              }
            ],
          };
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `addTunnel error: ${error.message || error}`,
            }
          ],
        };
      }
    }
  );
};