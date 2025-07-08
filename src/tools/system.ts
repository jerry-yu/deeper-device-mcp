import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { loginToDeeperDevice, rebootDevice, setBaseUrl as setBaseUrlFunction } from '../functions';
import { getCookie, setCookie } from '../state';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export const addSystemTools = (server: McpServer) => {
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
        setCookie(result.data); // Store the cookie for future use
        console.log(`Login successful, cookie: ${getCookie()}`);
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
    'rebootDevice',
    'Reboots the Deeper device.',
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
        const result = await rebootDevice(cookie);
        if (result.success) {
          return {
            content: [
              {
                type: 'text',
                text: `Device reboot initiated successfully.`,
              }
            ],
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: `rebootDevice failed: ${result.error}`,
              }
            ],
          };
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `rebootDevice error: ${error.message || error}`,
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
      setBaseUrlFunction(baseUrl);
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
};