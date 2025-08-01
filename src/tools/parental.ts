import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { getAdsFilter, setSslBypass, setAdsFilter, getUrlFilterData, setCategoryStates } from '../functions';
import { getCookie } from '../state';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export const addParentalTools = (server: McpServer) => {
  server.tool(
    'setParentalControl',
    'Configures parental control states for porn, social, and game categories. Supports blocking, timed unblocking, or unblocking. Only changed states will be updated.',
    {
      porn: z.number().nullable().describe('Porn category state: 0 (not block), 1 (block), 2 (unblock 2 hours), 4 (unblock 4 hours), 8 (unblock 8 hours)'),
      social: z.number().nullable().describe('Social category state: 0 (not block), 1 (block), 2 (unblock 2 hours), 4 (unblock 4 hours), 8 (unblock 8 hours)'),
      game: z.number().nullable().describe('Game category state: 0 (not block), 1 (block), 2 (unblock 2 hours), 4 (unblock 4 hours), 8 (unblock 8 hours)'),
    },
    async ({ porn, social, game }): Promise<CallToolResult> => {
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
        const filterDataResult = await getUrlFilterData(cookie);
        if (!filterDataResult.success || !filterDataResult.data) {
          return {
            content: [
              {
                type: 'text',
                text: `Failed to get current parental control states: ${filterDataResult.error}`,
              }
            ],
          };
        }
        let current = filterDataResult.data;
        console.log('Current parental control states:', current);

        const pornStateChanged = (porn !== null);
        const socialStateChanged = (social !== null);
        const gameStateChanged = (game !== null);

        if (pornStateChanged) {
          current.porn = porn;
        }
        if (socialStateChanged) {
          current.social = social;
        }
        if (gameStateChanged) {
          current.game = game;
        }
        console.log('Updated parental control states:', current);
        console.log('Changes:', pornStateChanged, socialStateChanged, gameStateChanged);

        const setResult = await setCategoryStates(cookie, current, pornStateChanged, socialStateChanged, gameStateChanged);
        if (setResult) {
          return {
            content: [
              {
                type: 'text',
                text: `Parental control updated. Changed: ${[
                  pornStateChanged ? 'porn' : null,
                  socialStateChanged ? 'social' : null,
                  gameStateChanged ? 'game' : null
                ].filter(Boolean).join(', ') || 'none'}.`,
              }
            ],
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: `Failed to update parental control states.`,
              }
            ],
          };
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `setParentalControl error: ${error.message || error}`,
            }
          ],
        };
      }
    }
  );

  server.tool(
    'setWebCategoryStates',
    'Configures blocking states for ads, tracker, and malicious using dns filter.',
    {
      ads: z.number().nullable().describe('Ads category state: 0 (not block), 1 (block)'),
      tracker: z.number().nullable().describe('Tracker category state: 0 (not block), 1 (block)'),
      malicious: z.number().nullable().describe('Malicious category state: 0 (not block), 1 (block)'),
    },
    async ({ ads, tracker, malicious }): Promise<CallToolResult> => {
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
        const filterDataResult = await getUrlFilterData(cookie);
        if (!filterDataResult.success || !filterDataResult.data) {
          return {
            content: [
              {
                type: 'text',
                text: `Failed to get current web category states: ${filterDataResult.error}`,
              }
            ],
          };
        }
        let current = filterDataResult.data;

        const adsChanged = (ads !== null);
        const trackerChanged = (tracker !== null);
        const maliciousChanged = (malicious !== null);

        if (adsChanged) {
          current.ads = ads;
        }
        if (trackerChanged) {
          current.tracker = tracker;
        }
        if (maliciousChanged) {
          current.malicious = malicious;
        }

        const setResult = await setCategoryStates(cookie, current, adsChanged, trackerChanged, maliciousChanged);
        if (setResult) {
          return {
            content: [
              {
                type: 'text',
                text: `Web category states updated. Changed: ${[
                  adsChanged ? 'ads' : null,
                  trackerChanged ? 'tracker' : null,
                  maliciousChanged ? 'malicious' : null
                ].filter(Boolean).join(', ') || 'none'}.`,
              }
            ],
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: `Failed to update web category states.`,
              }
            ],
          };
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `setWebCategoryStates error: ${error.message || error}`,
            }
          ],
        };
      }
    }
  );

  server.tool(
    'setAdsFilter',
    'Enables or disables the https ad filter on the Deeper device.',
    {
      enabled: z.boolean().describe('Set to true to enable https ad filtering, false to disable.'),
    },
    async ({ enabled }): Promise<CallToolResult> => {
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
        const result = await setAdsFilter(cookie, enabled);
        if (result.success) {
          return {
            content: [
              {
                type: 'text',
                text: `Ad filter has been ${enabled ? 'enabled' : 'disabled'} successfully.`,
              }
            ],
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: `setAdsFilter failed: ${result.error}`,
              }
            ],
          };
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `setAdsFilter error: ${error.message || error}`,
            }
          ],
        };
      }
    }
  );

  server.tool(
    'setSslBypass',
    'Allows or disallows devices without certificates to connect to the network. Requires ad filter to be enabled first.',
    {
      enabled: z.boolean().describe('Set to true to allow devices without certificates, false to disallow.'),
    },
    async ({ enabled }): Promise<CallToolResult> => {
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
        // Check if ads filter is enabled before allowing ssl bypass
        if (enabled) {
          const adsFilterStatus = await getAdsFilter(cookie);
          if (!adsFilterStatus.success) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Failed to get ad filter status: ${adsFilterStatus.error}`,
                }
              ],
            };
          }
          if (!adsFilterStatus.enable) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Ad filter must be enabled before allowing SSL bypass. Please enable ad filter first.`,
                }
              ],
            };
          }
        }
        const result = await setSslBypass(cookie, enabled);
        if (result.success) {
          return {
            content: [
              {
                type: 'text',
                text: `SSL bypass has been ${enabled ? 'enabled' : 'disabled'} successfully.`,
              }
            ],
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: `setSslBypass failed: ${result.error}`,
              }
            ],
          };
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `setSslBypass error: ${error.message || error}`,
            }
          ],
        };
      }
    }
  );
};