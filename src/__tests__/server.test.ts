
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getServer } from '../server';
import { addDpnTools } from '../tools/dpn';
import { addParentalTools } from '../tools/parental';
import { addSystemTools } from '../tools/system';
import { addAccesscontrolTool } from '../tools/access';
import { addSharing } from '../tools/sharing';

jest.mock('@modelcontextprotocol/sdk/server/mcp.js');
jest.mock('../tools/dpn');
jest.mock('../tools/parental');
jest.mock('../tools/system');
jest.mock('../tools/access');
jest.mock('../tools/sharing');

describe('getServer', () => {
  it('should create a new McpServer and add tools', () => {
    const server = getServer();

    expect(McpServer).toHaveBeenCalledWith(
      {
        name: 'deeper-device-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: { logging: {} },
        instructions: expect.any(String),
      }
    );

    expect(addDpnTools).toHaveBeenCalledWith(server);
    expect(addParentalTools).toHaveBeenCalledWith(server);
    expect(addSystemTools).toHaveBeenCalledWith(server);
    expect(addAccesscontrolTool).toHaveBeenCalledWith(server);
    expect(addSharing).toHaveBeenCalledWith(server);
  });
});
