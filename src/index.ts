import express, { Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';
import { CallToolResult, isInitializeRequest, ReadResourceResult, SUPPORTED_PROTOCOL_VERSIONS } from '@modelcontextprotocol/sdk/types.js';
import { loginToDeeperDevice, setDpnMode, listTunnels, getDpnMode, listApps, addApp, setBaseUrl, addTunnel } from './functions';

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
    instructions: `deeper device has 2 code: tunnel code and region code.tunnelcode is the English abbreviation of the country name, which is used to specify the country where the proxy for the traffic used by the dpnmode of the deeper device is located.Below is the mapping between the abbreviations and the actual country names: {"OCP":"Polynesia","OCA":"Australia & New Zealand","OCM":"Melanesia","OCN":"Micronesia","AD":"Andorra","AE":"United Arab Emirates","AF":"Afghanistan","AG":"Antigua and Barbuda","AI":"Anguilla","AL":"Albania","AM":"Armenia","AO":"Angola","AR":"Argentina","AS":"American Samoa","AT":"Austria","AU":"Australia","AW":"Aruba","AX":"Åland Islands","AZ":"Azerbaijan","BA":"Bosnia and Herzegovina","BB":"Barbados","BD":"Bangladesh","BE":"Belgium","BF":"Burkina Faso","BG":"Bulgaria","BH":"Bahrain","BI":"Burundi","BJ":"Benin","BL":"Saint Barthélemy","BM":"Bermuda","BN":"Brunei Darussalam","BO":"Bolivia","BQ":"Bonaire, Sint Eustatius and Saba","BR":"Brazil","BS":"Bahamas","BT":"Bhutan","BW":"Botswana","BY":"Belarus","BZ":"Belize","CA":"Canada","CC":"Cocos (Keeling) Islands","CD":"Congo, Democratic Republic of the","CF":"Central African Republic","CG":"Congo","CH":"Switzerland","CI":"Ivory Coast","CK":"Cook Islands","CL":"Chile","CM":"Cameroon","CN":"China","CO":"Colombia","CR":"Costa Rica","CU":"Cuba","CV":"Cabo Verde","CW":"Curaçao","CX":"Christmas Island","CY":"Cyprus","CZ":"Czechia","DE":"Germany","DJ":"Djibouti","DK":"Denmark","DM":"Dominica","DO":"Dominican Republic","DZ":"Algeria","EC":"Ecuador","EE":"Estonia","EG":"Egypt","ER":"Eritrea","ES":"Spain","ET":"Ethiopia","FI":"Finland","FJ":"Fiji","FK":"Falkland Islands (Malvinas)","FM":"Micronesia (Federated States of)","FO":"Faroe Islands","FR":"France","GA":"Gabon","GB":"United Kingdom of Great Britain and Northern Ireland","GD":"Grenada","GE":"Georgia","GF":"French Guiana","GG":"Guernsey","GH":"Ghana","GI":"Gibraltar","GL":"Greenland","GM":"Gambia","GN":"Guinea","GP":"Guadeloupe","GQ":"Equatorial Guinea","GR":"Greece","GS":"South Georgia and the South Sandwich Islands","GT":"Guatemala","GU":"Guam","GW":"Guinea-Bissau","GY":"Guyana","HK":"Hong Kong (China)","HN":"Honduras","HR":"Croatia","HT":"Haiti","HU":"Hungary","ID":"Indonesia","IE":"Ireland","IL":"Israel","IM":"Isle of Man","IN":"India","IO":"British Indian Ocean Territory","IQ":"Iraq","IR":"Iran","IS":"Iceland","IT":"Italy","JE":"Jersey","JM":"Jamaica","JO":"Jordan","JP":"Japan","KE":"Kenya","KG":"Kyrgyzstan","KH":"Cambodia","KI":"Kiribati","KM":"Comoros","KN":"Saint Kitts and Nevis","KR":"South Korea","KW":"Kuwait","KY":"Cayman Islands","KZ":"Kazakhstan","KP":"North korea","LA":"Lao People's Democratic Republic","LB":"Lebanon","LC":"Saint Lucia","LI":"Liechtenstein","LK":"Sri Lanka","LR":"Liberia","LS":"Lesotho","LT":"Lithuania","LU":"Luxembourg","LV":"Latvia","LY":"Libya","MA":"Morocco","MC":"Monaco","MD":"Moldova, Republic of","ME":"Montenegro","MF":"Saint Martin (French part)","MG":"Madagascar","MH":"Marshall Islands","MK":"North Macedonia","ML":"Mali","MM":"Myanmar","MN":"Mongolia","MO":"Macao (China)","MP":"Northern Mariana Islands","MQ":"Martinique","MR":"Mauritania","MS":"Montserrat","MT":"Malta","MU":"Mauritius","MV":"Maldives","MW":"Malawi","MX":"Mexico","MY":"Malaysia","MZ":"Mozambique","NA":"Namibia","NC":"New Caledonia","NE":"Niger","NF":"Norfolk Island","NG":"Nigeria","NI":"Nicaragua","NL":"Netherlands","NO":"Norway","NP":"Nepal","NR":"Nauru","NU":"Niue","NZ":"New Zealand","OM":"Oman","PA":"Panama","PE":"Peru","PF":"French Polynesia","PG":"Papua New Guinea","PH":"Philippines","PK":"Pakistan","PL":"Poland","PM":"Saint Pierre and Miquelon","PN":"Pitcairn","PR":"Puerto Rico","PS":"Palestine, State of","PT":"Portugal","PW":"Palau","PY":"Paraguay","QA":"Qatar","RE":"Réunion","RO":"Romania","RS":"Serbia","RU":"Russian Federation","RW":"Rwanda","SA":"Saudi Arabia","SB":"Solomon Islands","SC":"Seychelles","SD":"Sudan","SE":"Sweden","SG":"Singapore","SH":"Saint Helena, Ascension and Tristan da Cunha","SI":"Slovenia","SJ":"Svalbard and Jan Mayen","SK":"Slovakia","SL":"Sierra Leone","SM":"San Marino","SN":"Senegal","SO":"Somalia","SR":"Suriname","SS":"South Sudan","ST":"Sao Tome and Principe","SV":"El Salvador","SX":"Sint Maarten (Dutch part)","SY":"Syrian Arab Republic","SZ":"Eswatini","TC":"Turks and Caicos Islands","TD":"Chad","TF":"French Southern Territories","TG":"Togo","TH":"Thailand","TJ":"Tajikistan","TK":"Togo","TL":"Timor-Leste","TM":"Turkmenistan","TN":"Tunisia","TO":"Tonga","TR":"Turkey","TT":"Trinidad and Tobago","TV":"Tuvalu","TW":"Taiwan (China)","TZ":"Tanzania, United Republic of","UA":"Ukraine","UB":"US West","UC":"US Midwest","UD":"US Southwest","UE":"US Northeast","UF":"US Southeast","UG":"Uganda","US":"United States of America","UY":"Uruguay","UZ":"Uzbekistan","VA":"Holy See","VC":"Saint Vincent and the Grenadines","VE":"Venezuela","VG":"Virgin Islands (British)","VI":"Virgin Islands (U.S.)","VN":"Vietnam","VU":"Vanuatu","WF":"Wallis and Futuna","WS":"Samoa","XK":"Kosovo","YE":"Yemen","YT":"Mayotte","ZA":"South Africa","ZM":"Zambia","ZW":"Zimbabwe"}; 
region code where the tunnel code country is located is the English abbreviation.Below is the mapping between the abbreviations and the actual region code:{"AMN":"North America","AMC":"the Caribbean","AMM":"Central America","AMS":"South America","ASC":"Central Asia","ASE":"East Asia","ASW":"West Asia","ASS":"South Asia","ASD":"Southeast Asia","AFN":"North Africa","AFM":"Middle Africa","AFE":"East Africa","AFW":"West Africa","AFS":"South Africa","EUN":"North Europe","EUE":"East Europe","EUW":"West Europe","EUS":"South Europe","OCP":"Polynesia","OCA":"Australia & New Zealand","OCM":"Melanesia","OCN":"Micronesia"}.
`});


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
    'Retrieve the active tunnel codes available for configuring the DPN mode.',
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
    'Get the current DPN mode settings for the Deeper device.',
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
    'Get the list of all app names supported by the Deeper device.',
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
    'Set the tunnel code used by the App, supported by the Deeper device, for network traffic transmission.',
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
    'Set the base URL for the Deeper device API. Default is 34.34.34.34.',
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
    'Add a new tunnel to the Deeper device using the specified tunnel code and region code.',
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