import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { getServer } from './server';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express, { Request, Response } from 'express';

const MCP_PORT = 3000;

async function main(arg: string | undefined) {
  if (arg === 'stdio') {
    console.log('Starting MCP server with Stdio transport...');
    const server = getServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    return;
  }
  console.log('Starting MCP server with SSE transport...');

  const app = express();
  app.use(express.json());

  // Store transports by session ID
  const transports: Record<string, SSEServerTransport> = {};

  // SSE endpoint for establishing the stream
  app.get('/mcp', async (req: Request, res: Response) => {
    console.log('Received GET request to /sse (establishing SSE stream)');

    try {
      // Create a new SSE transport for the client
      // The endpoint for POST messages is '/messages'
      const transport = new SSEServerTransport('/messages', res);

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
  app.post('/messages', async (req: Request, res: Response) => {
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

const [, , ...args] = process.argv;
main(args[0]).catch(console.error);