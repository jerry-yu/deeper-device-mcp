import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readFileSync } from 'fs';
import { addDpnTools } from './tools/dpn';
import { addParentalTools } from './tools/parental';
import { addSystemTools } from './tools/system';
import { instructions } from './instructions';
import { addAccesscontrolTool } from './tools/access';
import { addSharing } from './tools/sharing';

export const getServer = () => {

  const server = new McpServer({
    name: 'deeper-device-mcp-server',
    version: '1.0.0',
  }, {
    capabilities: { logging: {} },
    instructions,
  });

  addDpnTools(server);
  addParentalTools(server);
  addSystemTools(server);
  addAccesscontrolTool(server);
  addSharing(server);

  return server;
};