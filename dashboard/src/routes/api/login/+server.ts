import { authenticate } from '$lib/auth.js';
import { json } from '@sveltejs/kit';

export async function POST({ request, cookies }) {
    const { auth_key } = await request.json();
    const authenticated = await authenticate(auth_key, cookies);

    return json({ authenticated });
}