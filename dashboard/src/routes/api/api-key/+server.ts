import { env } from '$env/dynamic/private';
import { isAuthenticated } from '$lib/auth.js';
import { error, json } from '@sveltejs/kit';

export function GET({ cookies }) {
    if (!isAuthenticated(cookies)) {
        error(403, 'You are not authenticated');
    }

    return json({ api_key: env.BLITZBROWSER_API_KEY });
}