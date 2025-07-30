import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { setSharingState, setBtSharing, setSmtpSharing, getSharingConfig, setSharingTrafficLimit, setSharingBandwidthLimit } from '../functions';
import { getCookie, getDpnTunnelCode, setDpnTunnelCode } from '../state';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export const addSharing = (server: McpServer) => {
    server.tool(
        'enableSharingState',
        'Enables or disables the sharing on the Deeper device.',
        {
            enabled: z.boolean().describe('Set to true to enable sharing, false to disable.'),
        },
        async ({ enabled }): Promise<CallToolResult> => {
            const cookie = getCookie();
            if (!cookie) {
                return {
                    content: [{
                        type: 'text',
                        text: 'Please login to Deeper device first using loginToDeeperDevice tool.',
                    }],
                };
            }
            try {
                const { success, error } = await setSharingState(cookie, enabled);
                return {
                    content: [{
                        type: 'text',
                        text: success
                            ? `sharing has been ${enabled ? 'enabled' : 'disabled'} successfully.`
                            : `sharing failed: ${error}`,
                    }],
                };
            } catch (error: any) {
                return {
                    content: [{
                        type: 'text',
                        text: `sharing error: ${error?.message ?? error}`,
                    }],
                };
            }
        }
    );


    server.tool(
        'setBtSharing',
        'Enables or disables BitTorrent sharing on the Deeper device.',
        {
            enabled: z.boolean().describe('Set to true to enable BitTorrent sharing, false to disable.'),
        },
        async ({ enabled }): Promise<CallToolResult> => {
            const cookie = getCookie();
            if (!cookie) {
                return {
                    content: [{
                        type: 'text',
                        text: 'Please login to Deeper device first using loginToDeeperDevice tool.',
                    }],
                };
            }
            try {
                if (enabled) {
                    const res = await setSharingState(cookie, true);
                    if (!res.success) {
                        return {
                            content: [{
                                type: 'text',
                                text: `Failed to enable sharing before setting BitTorrent sharing: ${res.error}`,
                            }],
                        };
                    }
                }
                const { success, error } = await setBtSharing(cookie, enabled);
                return {
                    content: [{
                        type: 'text',
                        text: success
                            ? `BitTorrent sharing has been ${enabled ? 'enabled' : 'disabled'} successfully.`
                            : `BitTorrent sharing failed: ${error}`,
                    }],
                };
            } catch (error: any) {
                return {
                    content: [{
                        type: 'text',
                        text: `BitTorrent sharing error: ${error?.message ?? error}`,
                    }],
                };
            }
        }
    );

    server.tool(
        'setSmtpSharing',
        'Enables or disables SMTP sharing on the Deeper device.',
        {
            enabled: z.boolean().describe('Set to true to enable SMTP sharing, false to disable.'),
        },
        async ({ enabled }): Promise<CallToolResult> => {
            const cookie = getCookie();
            if (!cookie) {
                return {
                    content: [{
                        type: 'text',
                        text: 'Please login to Deeper device first using loginToDeeperDevice tool.',
                    }],
                };
            }
            try {
                if (enabled) {
                    const res = await setSharingState(cookie, true);
                    if (!res.success) {
                        return {
                            content: [{
                                type: 'text',
                                text: `Failed to enable sharing before setting SMTP sharing: ${res.error}`,
                            }],
                        };
                    }
                }
                const { success, error } = await setSmtpSharing(cookie, enabled);
                return {
                    content: [{
                        type: 'text',
                        text: success
                            ? `SMTP sharing has been ${enabled ? 'enabled' : 'disabled'} successfully.`
                            : `SMTP sharing failed: ${error}`,
                    }],
                };
            } catch (error: any) {
                return {
                    content: [{
                        type: 'text',
                        text: `SMTP sharing error: ${error?.message ?? error}`,
                    }],
                };
            }
        }
    );

    server.tool(
        'setSharingTrafficLimit',
        'Sets the monthly traffic limit for sharing on the Deeper device (in GB).',
        {
            limit: z.number().int().positive().describe('Traffic limit in GB.'),
        },
        async ({ limit }): Promise<CallToolResult> => {
            const cookie = getCookie();
            if (!cookie) {
                return {
                    content: [{
                        type: 'text',
                        text: 'Please login to Deeper device first using loginToDeeperDevice tool.',
                    }],
                };
            }
            try {
                const res = await setSharingState(cookie, true);
                    if (!res.success) {
                        return {
                            content: [{
                                type: 'text',
                                text: `Failed to enable sharing before setting traffic limit sharing: ${res.error}`,
                            }],
                        };
                    }

                const { success, error } = await setSharingTrafficLimit(cookie, limit);
                return {
                    content: [{
                        type: 'text',
                        text: success
                            ? `Sharing traffic limit has been set to ${limit} GB successfully.`
                            : `Setting sharing traffic limit failed: ${error}`,
                    }],
                };
            } catch (error: any) {
                return {
                    content: [{
                        type: 'text',
                        text: `Setting sharing traffic limit error: ${error?.message ?? error}`,
                    }],
                };
            }
        }
    );

    server.tool(
        'setSharingBandwidthLimit',
        'Sets the bandwidth limit for sharing on the Deeper device (in Mbps).',
        {
            limit: z.number().int().positive().describe('Bandwidth limit in Mbps.'),
        },
        async ({ limit }): Promise<CallToolResult> => {
            const cookie = getCookie();
            if (!cookie) {
                return {
                    content: [{
                        type: 'text',
                        text: 'Please login to Deeper device first using loginToDeeperDevice tool.',
                    }],
                };
            }
            try {
                const res = await setSharingState(cookie, true);
                if (!res.success) {
                    return {
                        content: [{
                            type: 'text',
                            text: `Failed to enable sharing before setting bandwidth limit: ${res.error}`,
                        }],
                    };
                }
                const { success, error } = await setSharingBandwidthLimit(cookie, limit);
                return {
                    content: [{
                        type: 'text',
                        text: success
                            ? `Sharing bandwidth limit has been set to ${limit} Mbps successfully.`
                            : `Setting sharing bandwidth limit failed: ${error}`,
                    }],
                };
            } catch (error: any) {
                return {
                    content: [{
                        type: 'text',
                        text: `Setting sharing bandwidth limit error: ${error?.message ?? error}`,
                    }],
                };
            }
        }
    );
}