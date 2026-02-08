import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IncomingMessage } from 'http';
import { IS_AUTHENTICATION_REQUIRED } from 'src/decorators/authentication.decorator';

@Injectable()
export class ApiKeyGuard implements CanActivate {

    public static readonly API_KEY_HEADER = 'x-api-key';

    public static readonly API_KEY_PARAM = 'apiKey';

    readonly #api_key = process.env.API_KEY;
    readonly #skip_authentication = typeof this.#api_key !== 'string';

    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        if (this.#skip_authentication) {
            return true;
        }

        const is_authentication_required = this.reflector.getAllAndOverride<boolean>(IS_AUTHENTICATION_REQUIRED, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!is_authentication_required) return true;

        const request = context.switchToHttp().getRequest();

        if (request.headers[ApiKeyGuard.API_KEY_HEADER] !== this.#api_key) {
            throw new UnauthorizedException('Invalid API Key.');
        }

        return true;
    }

    canActivateWebsocket(request: IncomingMessage, url: URL): boolean {
        console.log(this.#skip_authentication, this.#api_key)
        if (this.#skip_authentication) {
            return true;
        }

        if (request.headers[ApiKeyGuard.API_KEY_HEADER] === this.#api_key) {
            return true;
        }

        if (url.searchParams.get(ApiKeyGuard.API_KEY_PARAM) === this.#api_key) {
            return true;
        }

        return false;
    }

}