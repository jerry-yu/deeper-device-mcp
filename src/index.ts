import express, { Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { nullable, z } from 'zod';
import { CallToolResult, isInitializeRequest, ReadResourceResult, SUPPORTED_PROTOCOL_VERSIONS } from '@modelcontextprotocol/sdk/types.js';
import { getAdsFilter, setSslBypass, setAdsFilter, getUrlFilterData, setCategoryStates, loginToDeeperDevice, setDpnMode, listTunnels, getDpnMode, listApps, addApp, setBaseUrl, addTunnel } from './functions';

let cookie: string | null = null;

// Global mapping of DPN modes to their corresponding tunnel codes
// This record is mutable and will be updated in getDpnMode to reflect the latest mapping.
const DPN_MODE_TUNNEL_CODE: Record<string, string> = {
  'direct': 'DIRECT'
};


const getServer = () => {
  // Create an MCP server with implementation details
  const server = new McpServer({
    name: 'deeper-device-mcp-server',
    version: '1.0.0',
  }, {
    capabilities: { logging: {} },
    instructions: `# Deeper Device Control Protocol

You are an agent controlling a Deeper Network device. Follow these instructions to manage the device's DPN (Decentralized Private Network) settings.

## Core Concepts

*   **DPN Mode**: Determines how your internet traffic is routed.
    *   **direct**: Bypasses the DPN.
    *   **smart**: Routes traffic through the DPN based on intelligent rules.
    *   **full**: Routes all traffic through the DPN.
*   **Tunnel**: A secure connection to a specific country's server, used in 'smart' and 'full' DPN modes.
*   **Tunnel Code**: A two-letter country code (e.g., 'US', 'JP') that identifies a tunnel.
*   **Region Code**: A code representing a continent or major region (e.g., 'AMN' for North America, 'ASE' for East Asia). Tunnels are grouped by region.
*   **App Tunnel**: You can assign a specific tunnel to individual applications, overriding the main DPN mode for that app.

## Workflow

1.  **Login**: Always start by logging into the device using the 'loginToDeeperDevice' tool. This is a mandatory first step.
2.  **Check Status**: Use 'getDpnMode' to see the current DPN mode and the tunnels assigned to 'smart' and 'full' modes.
3.  **List Tunnels**: Use 'listTunnels' to see the list of currently active tunnels you can use.
4.  **Add Tunnels (If Needed)**: If the tunnel you want to use is not in the active list, you must add it first using the 'addTunnel' tool. This requires both a 'tunnelCode' and its corresponding 'regionCode'.
5.  **Set DPN Mode**: Use 'setDpnMode' to change the global DPN mode. You must provide the 'tunnelCode' you want to use for that mode.
6.  **Manage Apps**:
    *   Use 'listApps' to see all applications that can have their own tunnel settings.
    *   Use 'setAppTunnelCode' to assign a specific 'tunnelCode' to an application.

## Reference: Region and Tunnel Codes

### Region Codes
| Code  | Region                  |
| :---- | :---------------------- |
| AMN   | North America           |
| AMC   | The Caribbean           |
| AMM   | Central America         |
| AMS   | South America           |
| ASC   | Central Asia            |
| ASE   | East Asia               |
| ASW   | West Asia               |
| ASS   | South Asia              |
| ASD   | Southeast Asia          |
| AFN   | North Africa            |
| AFM   | Middle Africa           |
| AFE   | East Africa             |
| AFW   | West Africa             |
| AFS   | South Africa            |
| EUN   | North Europe            |
| EUE   | East Europe             |
| EUW   | West Europe             |
| EUS   | South Europe            |
| OCP   | Polynesia               |
| OCA   | Australia & New Zealand |
| OCM   | Melanesia               |
| OCN   | Micronesia              |

### Tunnel Codes (Country Codes)
A two-letter code representing the country. Refer to standard ISO 3166-1 alpha-2 country codes.
Example: 'US' for United States, 'CA' for Canada, 'DE' for Germany.
The full list of available tunnel codes can be retrieved via the 'listTunnels' tool after logging in.`
  });


  server.tool(
    'loginToDeeperDevice',
    'Logs into the Deeper device to establish a session and obtain an auth cookie.',
    {
      username: z.string().describe('The username for authentication.').default('admin'),
      password: z.string().describe('The password for authentication.').default('yubo12345'),
    },
    async ({ username, password }): Promise<CallToolResult> => {

      const result = await loginToDeeperDevice(username, password);
      if (result.success) {
        cookie = result.data; // Store the cookie for future use
        console.log(`Login successful, cookie: ${cookie}`);
        return {
          content: [
            {
              type: 'text',
              text: `loginToDeeperDevice success`,
            }
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `loginToDeeperDevice failed: ${result.error}`,
            }
          ],
        };
      }
    }
  );

  server.tool(
    'setDpnMode',
    'Sets the DPN mode and the associated tunnel for that mode.',
    {
      dpnMode: z.string().describe("The DPN mode to set: 'direct' for Direct routing, 'smart' for Smart routing, or 'full' for Full routing.").default('smart'),
      tunnelCode: z.string().describe(`tunnel code`).nullable(),
    },
    async ({ dpnMode, tunnelCode }): Promise<CallToolResult> => {
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
        if (DPN_MODE_TUNNEL_CODE[dpnMode]) {
          tunnelCode = DPN_MODE_TUNNEL_CODE[dpnMode];
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
              DPN_MODE_TUNNEL_CODE['smart'] = smartTunnel;
            }
            if (typeof fullTunnel === 'string') {
              DPN_MODE_TUNNEL_CODE['full'] = fullTunnel;
            }
            if (typeof result.data.tunnelCode === 'string') {
              DPN_MODE_TUNNEL_CODE['curMode'] = dpnMode;
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
    'setBaseUrl',
    'Configures the base URL for API calls to the Deeper device. Default: 34.34.34.34.',
    {
      baseUrl: z.string().describe('The base URL to use for the Deeper device API.').default('34.34.34.34'),
    },
    async ({ baseUrl }): Promise<CallToolResult> => {
      setBaseUrl(baseUrl);
      return {
        content: [
          {
            type: 'text',
            text: `Base URL set to ${baseUrl}. You can now use other tools with this base URL.`,
          }
        ],
      };
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

  server.tool(
    'setParentalControl',
    'Configures parental control states for porn, social, and game categories. Supports blocking, timed unblocking, or unblocking. Only changed states will be updated.',
    {
      porn: z.number().nullable().describe('Porn category state: 0 (not block), 1 (block), 2 (unblock 2 hours), 4 (unblock 4 hours), 8 (unblock 8 hours)'),
      social: z.number().nullable().describe('Social category state: 0 (not block), 1 (block), 2 (unblock 2 hours), 4 (unblock 4 hours), 8 (unblock 8 hours)'),
      game: z.number().nullable().describe('Game category state: 0 (not block), 1 (block), 2 (unblock 2 hours), 4 (unblock 4 hours), 8 (unblock 8 hours)'),
    },
    async ({ porn, social, game }): Promise<CallToolResult> => {
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
        const filterDataResult = await getUrlFilterData(cookie);
        if (!filterDataResult.success || !filterDataResult.data) {
          return {
            content: [
              {
                type: 'text',
                text: `Failed to get current parental control states: ${filterDataResult.error}`,
              }
            ],
          };
        }
        let current = filterDataResult.data;
        console.log('Current parental control states:', current);

        const pornStateChanged = (porn !== null);
        const socialStateChanged = (social !== null);
        const gameStateChanged = (game !== null);

        if (pornStateChanged) {
          current.porn = porn;
        }
        if (socialStateChanged) {
          current.social = social;
        }
        if (gameStateChanged) {
          current.game = game;
        }
        console.log('Updated parental control states:', current);
        console.log('Changes:', pornStateChanged, socialStateChanged, gameStateChanged);

        const setResult = await setCategoryStates(cookie, current, pornStateChanged, socialStateChanged, gameStateChanged);
        if (setResult) {
          return {
            content: [
              {
                type: 'text',
                text: `Parental control updated. Changed: ${[
                  pornStateChanged ? 'porn' : null,
                  socialStateChanged ? 'social' : null,
                  gameStateChanged ? 'game' : null
                ].filter(Boolean).join(', ') || 'none'}.`,
              }
            ],
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: `Failed to update parental control states.`,
              }
            ],
          };
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `setParentalControl error: ${error.message || error}`,
            }
          ],
        };
      }
    }
  );

  server.tool(
    'setAdsFilter',
    'Enables or disables the ad filter on the Deeper device.',
    {
      enabled: z.boolean().describe('Set to true to enable ad filtering, false to disable.'),
    },
    async ({ enabled }): Promise<CallToolResult> => {
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
        const result = await setAdsFilter(cookie, enabled);
        if (result.success) {
          return {
            content: [
              {
                type: 'text',
                text: `Ad filter has been ${enabled ? 'enabled' : 'disabled'} successfully.`,
              }
            ],
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: `setAdsFilter failed: ${result.error}`,
              }
            ],
          };
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `setAdsFilter error: ${error.message || error}`,
            }
          ],
        };
      }
    }
  );

  server.tool(
    'setSslBypass',
    'Allows or disallows devices without certificates to connect to the network. Requires ad filter to be enabled first.',
    {
      enabled: z.boolean().describe('Set to true to allow devices without certificates, false to disallow.'),
    },
    async ({ enabled }): Promise<CallToolResult> => {
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
        // Check if ads filter is enabled before allowing ssl bypass
        if (enabled) {
          const adsFilterStatus = await getAdsFilter(cookie);
          if (!adsFilterStatus.success) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Failed to get ad filter status: ${adsFilterStatus.error}`,
                }
              ],
            };
          }
          if (!adsFilterStatus.enable) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Ad filter must be enabled before allowing SSL bypass. Please enable ad filter first.`,
                }
              ],
            };
          }
        }
        const result = await setSslBypass(cookie, enabled);
        if (result.success) {
          return {
            content: [
              {
                type: 'text',
                text: `SSL bypass has been ${enabled ? 'enabled' : 'disabled'} successfully.`,
              }
            ],
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: `setSslBypass failed: ${result.error}`,
              }
            ],
          };
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `setSslBypass error: ${error.message || error}`,
            }
          ],
        };
      }
    }
  );

  return server;
}


// stdio transport
async function main() {
  const server = getServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

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
// }

main().catch(console.error);

// const MCP_PORT = 3000;
// const app = express();
// app.use(express.json());

// // Store transports by session ID
// const transports: Record<string, SSEServerTransport> = {};

// // SSE endpoint for establishing the stream
// app.get('/sse', async (req: Request, res: Response) => {
//   console.log('Received GET request to /sse (establishing SSE stream)');

//   try {
//     // Create a new SSE transport for the client
//     // The endpoint for POST messages is '/messages'
//     const transport = new SSEServerTransport('/sse', res);

//     // Store the transport by session ID
//     const sessionId = transport.sessionId;
//     transports[sessionId] = transport;

//     // Set up onclose handler to clean up transport when closed
//     transport.onclose = () => {
//       console.log(`SSE transport closed for session ${sessionId}`);
//       delete transports[sessionId];
//     };

//     // Connect the transport to the MCP server
//     const server = getServer();
//     await server.connect(transport);

//     console.log(`Established SSE stream with session ID: ${sessionId}`);
//   } catch (error) {
//     console.error('Error establishing SSE stream:', error);
//     if (!res.headersSent) {
//       res.status(500).send('Error establishing SSE stream');
//     }
//   }
// });

// // Messages endpoint for receiving client JSON-RPC requests
// app.post('/sse', async (req: Request, res: Response) => {
//   console.log('Received POST request to /sse');

//   // Extract session ID from URL query parameter
//   // In the SSE protocol, this is added by the client based on the endpoint event
//   const sessionId = req.query.sessionId as string | undefined;

//   if (!sessionId) {
//     console.error('No session ID provided in request URL');
//     res.status(400).send('Missing sessionId parameter');
//     return;
//   }

//   const transport = transports[sessionId];
//   if (!transport) {
//     console.error(`No active transport found for session ID: ${sessionId}`);
//     res.status(404).send('Session not found');
//     return;
//   }

//   try {
//     // Handle the POST message with the transport
//     await transport.handlePostMessage(req, res, req.body);
//   } catch (error) {
//     console.error('Error handling request:', error);
//     if (!res.headersSent) {
//       res.status(500).send('Error handling request');
//     }
//   }
// });

// // Start the server
// app.listen(MCP_PORT, () => {
//   console.log(`Simple SSE Server listening on port ${MCP_PORT}`);
// });

// // Handle server shutdown
// process.on('SIGINT', async () => {
//   console.log('Shutting down server...');

//   // Close all active transports to properly clean up resources
//   for (const sessionId in transports) {
//     try {
//       console.log(`Closing transport for session ${sessionId}`);
//       await transports[sessionId].close();
//       delete transports[sessionId];
//     } catch (error) {
//       console.error(`Error closing transport for session ${sessionId}:`, error);
//     }
//   }
//   console.log('Server shutdown complete');
//   process.exit(0);
// });