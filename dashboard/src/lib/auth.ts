import type { Cookies } from "@sveltejs/kit";
import { env } from '$env/dynamic/private';

const COOKIE_SESSION_ID = 'SESSION_ID';

const is_authentication_required = typeof env.AUTH_KEY === 'string';

const auth_key_sha256 = is_authentication_required ? await digest(env.AUTH_KEY) : undefined;

export function isAuthenticated(cookies: Cookies) {
    return !is_authentication_required || cookies.get(COOKIE_SESSION_ID) === auth_key_sha256;
}

export async function authenticate(auth_key: string, cookies: Cookies) {
    if (auth_key_sha256 !== await digest(auth_key)) {
        return false;
    }

    cookies.set(COOKIE_SESSION_ID, auth_key_sha256, { path: '/', httpOnly: true });

    return true;
}

async function digest(value: string) {
    const array_buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));

    return Array.from(new Uint8Array(array_buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}