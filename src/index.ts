import express, { Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';
import { CallToolResult, isInitializeRequest, ReadResourceResult, SUPPORTED_PROTOCOL_VERSIONS } from '@modelcontextprotocol/sdk/types.js';
import { loginToDeeperDevice, setDpnMode, listTunnels,getDpnMode } from './functions';

let cookie: string | null = null;

// Global mapping of DPN modes to their corresponding tunnel codes
// This record is mutable and will be updated in getDpnMode to reflect the latest mapping.
const DPN_MODE_TUNNEL_CODE: Record<string, string>  = {
  'direct': 'DIRECT'};

const getServer = () => {
  // Create an MCP server with implementation details
  const server = new McpServer({
    name: 'deeper-device-operation-http-server',
    version: '1.0.0',
  }, { capabilities: { logging: {} } });


  server.tool(
    'loginToDeeperDevice',
    'Login to a Deeper device using the provided username and password.',
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
    'set Deeper device DPN mode.',
    {
      dpnMode: z.string().describe("The DPN mode to set: 'direct' for Direct routing, 'smart' for Smart routing, or 'full' for Full routing.").default('smart'),
      tunnelCode: z.string().describe("tunnelCode is the English abbreviation of the country name, which is used to specify the country where the proxy for the traffic used by the dpnmode of the deeper device is located").nullable(),
    },
    async ({ dpnMode,tunnelCode }): Promise<CallToolResult> => {
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
      if (!tunnelCode) {return {content:[]};}
      const success = await setDpnMode(cookie, dpnMode,tunnelCode);
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
    'Get the English abbreviation of the country where the current tunnel proxy are located. It can be used to set the DPN mode.',
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
    'Get the current DPN mode of the Deeper device.',
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

  return server;
}


// stdio transport
// async function main() {
//   const server = getServer();
//   const transport = new StdioServerTransport();
//   await server.connect(transport);
// }

async function main()  {
  const result = await loginToDeeperDevice('admin', 'yubo12345');
  if (result.success) {
    cookie = result.data;
  }
  if (!cookie) {
    console.error('Login failed, no cookie received.');
    return;
  }
  const tunnels = await listTunnels(cookie);
  if (tunnels.success) {
    console.log('Available tunnels:', tunnels.data);
  }
  const models = await getDpnMode(cookie);
  if (models.success) {
    console.log('Current DPN mode:', models.data);
  }
  const setResult = await setDpnMode(cookie, 'smart', DPN_MODE_TUNNEL_CODE['smart']);
  if (setResult) {
    console.log('DPN mode set successfully.');
  }
  else {
    console.error('Failed to set DPN mode.');
  }
}

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