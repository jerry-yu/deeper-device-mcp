import express, { Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { CallToolResult, GetPromptResult, ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
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

  return server;
}

const app = express();
app.use(express.json());

app.post('/mcp', async (req: Request, res: Response) => {
  const server = getServer();
  try {
    const transport: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    res.on('close', () => {
      console.log('Request closed');
      transport.close();
      server.close();
    });
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
});

app.get('/mcp', async (req: Request, res: Response) => {
  console.log('Received GET MCP request');
  res.writeHead(405).end(JSON.stringify({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed."
    },
    id: null
  }));
});

app.delete('/mcp', async (req: Request, res: Response) => {
  console.log('Received DELETE MCP request');
  res.writeHead(405).end(JSON.stringify({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed."
    },
    id: null
  }));
});


// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`MCP Stateless Streamable HTTP Server listening on port ${PORT}`);
});

// Handle server shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  process.exit(0);
});