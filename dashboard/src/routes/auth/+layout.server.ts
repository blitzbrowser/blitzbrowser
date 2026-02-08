import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { isAuthenticated } from '$lib/auth';

export const load: LayoutServerLoad = async ({ cookies }) => {
    if (isAuthenticated(cookies)) {
        redirect(302, '/');
    }
};