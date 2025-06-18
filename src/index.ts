import express, { Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { publicEncrypt } from 'node:crypto';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';
import { CallToolResult, isInitializeRequest, ReadResourceResult, SUPPORTED_PROTOCOL_VERSIONS } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import publicKey from './public';

let cookie: string | null = null;

export const encryptWithPublicKey = function (string: string) {
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
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    Accept: 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    Origin: 'http://192.168.3.57',
    Referer: 'http://192.168.3.57/login',
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

async function setDpnMode(mode: string): Promise<boolean> {
  const url = 'http://192.168.3.57/api/smartRoute/setDpnMode';
  const headers = {
    'Host': '192.168.3.57',
    'Connection': 'keep-alive',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    'Origin': 'http://192.168.3.57',
    'Referer': 'http://192.168.3.57/admin/route-mode',
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
    tunnelCode: 'KR',
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
    'set-dpn-mode',
    'set Deeper device DPN mode.',
    {
      dpnMode: z.string().describe("The DPN mode to set: 'direct' for Direct routing, 'smart' for Smart routing, or 'full' for Full routing.").default('smart'),
    },
    async ({ dpnMode }): Promise<CallToolResult> => {

      const success = await setDpnMode(dpnMode);
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

  return server;
}

// // stdio transport example
// async function main() {
//   const server = getServer();
//   const transport = new StdioServerTransport();
//   await server.connect(transport);
// }

// main().catch(console.error);

const MCP_PORT = 3000;
const app = express();
app.use(express.json());

// Store transports by session ID
const transports: Record<string, SSEServerTransport> = {};

// SSE endpoint for establishing the stream
app.get('/sse', async (req: Request, res: Response) => {
  console.log('Received GET request to /sse (establishing SSE stream)');

  try {
    // Create a new SSE transport for the client
    // The endpoint for POST messages is '/messages'
    const transport = new SSEServerTransport('/sse', res);

    // Store the transport by session ID
    const sessionId = transport.sessionId;
    transports[sessionId] = transport;

    // Set up onclose handler to clean up transport when closed
    transport.onclose = () => {
      console.log(`SSE transport closed for session ${sessionId}`);
      delete transports[sessionId];
    };

    // Connect the transport to the MCP server
    const server = getServer();
    await server.connect(transport);

    console.log(`Established SSE stream with session ID: ${sessionId}`);
  } catch (error) {
    console.error('Error establishing SSE stream:', error);
    if (!res.headersSent) {
      res.status(500).send('Error establishing SSE stream');
    }
  }
});

// Messages endpoint for receiving client JSON-RPC requests
app.post('/sse', async (req: Request, res: Response) => {
  console.log('Received POST request to /sse');

  // Extract session ID from URL query parameter
  // In the SSE protocol, this is added by the client based on the endpoint event
  const sessionId = req.query.sessionId as string | undefined;

  if (!sessionId) {
    console.error('No session ID provided in request URL');
    res.status(400).send('Missing sessionId parameter');
    return;
  }

  const transport = transports[sessionId];
  if (!transport) {
    console.error(`No active transport found for session ID: ${sessionId}`);
    res.status(404).send('Session not found');
    return;
  }

  try {
    // Handle the POST message with the transport
    await transport.handlePostMessage(req, res, req.body);
  } catch (error) {
    console.error('Error handling request:', error);
    if (!res.headersSent) {
      res.status(500).send('Error handling request');
    }
  }
});

// Start the server
app.listen(MCP_PORT, () => {
  console.log(`Simple SSE Server listening on port ${MCP_PORT}`);
});

// Handle server shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');

  // Close all active transports to properly clean up resources
  for (const sessionId in transports) {
    try {
      console.log(`Closing transport for session ${sessionId}`);
      await transports[sessionId].close();
      delete transports[sessionId];
    } catch (error) {
      console.error(`Error closing transport for session ${sessionId}:`, error);
    }
  }
  console.log('Server shutdown complete');
  process.exit(0);
});

// async function handleSSE(req: http.IncomingMessage, res: http.ServerResponse, url: URL, sessions: Map<string, SSEServerTransport>) {
//   const server = getServer();
//   if (req.method === 'POST') {
//     const sessionId = url.searchParams.get('sessionId');
//     if (!sessionId) {
//       res.statusCode = 400;
//       return res.end('Missing sessionId');
//     }

//     const transport = sessions.get(sessionId);
//     if (!transport) {
//       res.statusCode = 404;
//       return res.end('Session not found');
//     }

//     return await transport.handlePostMessage(req, res);
//   } else if (req.method === 'GET') {
//     const transport = new SSEServerTransport('/sse', res);
//     sessions.set(transport.sessionId, transport);
//     await server.connect(transport);
//     res.on('close', () => {
//       sessions.delete(transport.sessionId);
//       // eslint-disable-next-line no-console
//       server.close().catch(e => console.error(e));
//     });
//     return;
//   }

//   res.statusCode = 405;
//   res.end('Method not allowed');
// }
