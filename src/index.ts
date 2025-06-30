import express, { Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';
import { CallToolResult, isInitializeRequest, ReadResourceResult, SUPPORTED_PROTOCOL_VERSIONS } from '@modelcontextprotocol/sdk/types.js';
import { loginToDeeperDevice, setDpnMode, listTunnels, getDpnMode, listApps, addApp, setBaseUrl, addTunnel } from './functions';

import { createLibp2p } from 'libp2p';
import { tcp } from '@libp2p/tcp';
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { multiaddr } from 'multiformats/multiaddr';
import { PeerId } from 'peer-id';
import { pipe } from 'it-pipe';

let cookie: string | null = null;
let libp2pNode: Awaited<ReturnType<typeof createNode>>;

// Global mapping of DPN modes to their corresponding tunnel codes
// This record is mutable and will be updated in getDpnMode to reflect the latest mapping.
const DPN_MODE_TUNNEL_CODE: Record<string, string> = {
  'direct': 'DIRECT'
};

async function createNode() {
  const node = await createLibp2p({
    transports: [
      tcp()
    ],
    connectionEncrypters: [
      noise()
    ],
    streamMuxers: [
      yamux()
    ]
  });

  console.log('Libp2p node started with ID:', node.peerId.toString());
  console.log('Listening on addresses:', node.getMultiaddrs().map((ma) => ma.toString()));

  node.handle('/mcp/1.0.0', async ({ stream }) => {
    console.log('Received incoming stream from peer');
    // Handle incoming stream data here
    // For now, just log it
    for await (const chunk of stream.source) {
      console.log('Received data:', new TextDecoder().decode(chunk));
    }
  });

  return node;
}

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
*   **Region Code**: A code representing a continent or major region (e.g., 'AMN' for North America, 'EUE' for East Europe). Tunnels are grouped by region.
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
      regionCode: z.string().describe(`Regin code`),
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
    'addTunnel',
    'Adds a new tunnel to the active list, making it available for DPN configuration.',
    {
      regionCode: z.string().describe(`Regin code`),
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
    'connectToPeer',
    'Connects to a libp2p peer using its multiaddr.',
    {
      multiaddr: z.string().describe('The multiaddr of the peer to connect to (e.g., "/ip4/127.0.0.1/tcp/4001/p2p/Qm...").'),
    },
    async ({ multiaddr: peerMultiaddr }): Promise<CallToolResult> => {
      try {
        const ma = multiaddr(peerMultiaddr);
        await libp2pNode.dial(ma);
        return {
          content: [
            {
              type: 'text',
              text: `Successfully connected to peer: ${peerMultiaddr}`,
            }
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to connect to peer ${peerMultiaddr}: ${error.message || error}`,
            }
          ],
        };
      }
    }
  );

  server.tool(
    'sendP2PMessage',
    'Sends a message to a connected libp2p peer.',
    {
      peerId: z.string().describe('The PeerId of the connected peer to send the message to.'),
      message: z.string().describe('The message to send.'),
    },
    async ({ peerId, message }): Promise<CallToolResult> => {
      try {
        const targetPeerId = PeerId.parse(peerId);
        const connection = libp2pNode.getConnections(targetPeerId)[0];
        if (!connection) {
          return {
            content: [
              {
                type: 'text',
                text: `No active connection to peer ${peerId}. Please connect first.`,
              }
            ],
          };
        }
        const stream = await connection.newStream(['/mcp/1.0.0']);
        await pipe(
          [new TextEncoder().encode(message)],
          stream.sink
        );
        return {
          content: [
            {
              type: 'text',
              text: `Message sent to peer ${peerId}: ${message}`,
            }
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to send message to peer ${peerId}: ${error.message || error}`,
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
  libp2pNode = await createNode();
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
//     console.log('App added successfully:', addResult.data);
//   } else {
//     console.error('Failed to add app:', addResult.error);
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

// process.on('SIGTERM', async () => {
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

// // HTTP transport
// // const server = getServer();
// // const transport = new StreamableHTTPServerTransport();
// // server.connect(transport);

// // const app = express();
// // app.use(express.json());
// // app.post('/mcp', transport.handler);
// // app.listen(3000, () => console.log('MCP server listening on port 3000'));
// // console.log('MCP server started on port 3000');

main().catch(console.error);