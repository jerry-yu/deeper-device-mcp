import express, { Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { CallToolResult, isInitializeRequest, ReadResourceResult, SUPPORTED_PROTOCOL_VERSIONS } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';

let cookie: string | null = null;

async function loginToDeeperDevice(username: string, password: string): Promise<any> {
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
      password: z.string().describe('The password for authentication.').default('OGYiunj5DKdgQpZToLza/48IadDkytY1lg1mQG9Tgt3/mc+dO25cTpQwVAg41roIlIPqdORSWpw1PFBHTZ6v+KeZrf0MYwz1Fr7Us9FErN25Q99oT/qeN7uf5dJPrkmBlZCaCtJZh+J7IKgQUvjd2+iuQF6qxxtCxSVJaXeqzp6Hn1YoPpZLvKDoPt+/wSnXlsomkjwdX/qxViI9WyuBlJ83b+4iyH1IDND/wuQZav4S9ZHzxzaLrOwOefh+Q6J6Z1JCcXpMyUDXsg+SW+9ysugmocoBaXCNhpHsLHgWpAUBhpcau9aNPbygc/FhnJk/T3P2MMg3vcvQ83+J1Nfo/A=='),
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

// Map to store transports by session ID
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

// MCP POST endpoint with optional auth
const mcpPostHandler = async (req: Request, res: Response) => {
  console.log('Received MCP request:', req.body);
  try {
    // Check for existing session ID
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId]) {
      // Reuse existing transport
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // New initialization request
      //const eventStore = new InMemoryEventStore();
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        //eventStore, // Enable resumability
        onsessioninitialized: (sessionId) => {
          // Store the transport by session ID when session is initialized
          // This avoids race conditions where requests might come in before the session is stored
          console.log(`Session initialized with ID: ${sessionId}`);
          transports[sessionId] = transport;
        }
      });

      // Set up onclose handler to clean up transport when closed
      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && transports[sid]) {
          console.log(`Transport closed for session ${sid}, removing from transports map`);
          delete transports[sid];
        }
      };

      // Connect the transport to the MCP server BEFORE handling the request
      // so responses can flow back through the same transport
      const server = getServer();
      await server.connect(transport);

      await transport.handleRequest(req, res, req.body);
      return; // Already handled
    } else {
      // Invalid request - no session ID or not initialization request
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: No valid session ID provided',
        },
        id: null,
      });
      return;
    }

    // Handle the request with existing transport - no need to reconnect
    // The existing transport is already connected to the server
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
};

// Set up routes with conditional auth middleware

app.post('/mcp', mcpPostHandler);

// Handle GET requests for SSE streams (using built-in support from StreamableHTTP)
const mcpGetHandler = async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }

  // Check for Last-Event-ID header for resumability
  const lastEventId = req.headers['last-event-id'] as string | undefined;
  if (lastEventId) {
    console.log(`Client reconnecting with Last-Event-ID: ${lastEventId}`);
  } else {
    console.log(`Establishing new SSE stream for session ${sessionId}`);
  }

  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
};

// Set up GET route with conditional auth middleware

app.get('/mcp', mcpGetHandler);


// Handle DELETE requests for session termination (according to MCP spec)
const mcpDeleteHandler = async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }

  console.log(`Received session termination request for session ${sessionId}`);

  try {
    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
  } catch (error) {
    console.error('Error handling session termination:', error);
    if (!res.headersSent) {
      res.status(500).send('Error processing session termination');
    }
  }
};

// Set up DELETE route with conditional auth middleware

app.delete('/mcp', mcpDeleteHandler);

app.listen(MCP_PORT, () => {
  console.log(`MCP Streamable HTTP Server listening on port ${MCP_PORT}`);
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