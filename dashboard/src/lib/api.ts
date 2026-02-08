import { env } from "$env/dynamic/public";

export const blitzbrowser_api_key = (await (await fetch('/api/api-key')).json()).api_key;

export const api_url = new URL(env.PUBLIC_BLITZBROWSER_API_URL || 'http://localhost:9999');

export const websocket_url = new URL(`${api_url.protocol === 'https' ? 'wss' : 'ws'}://${api_url.host}`)