import { SetMetadata } from '@nestjs/common';

export const IS_AUTHENTICATION_REQUIRED = 'IS_AUTHENTICATION_REQUIRED';

export const NoAuthenticationRequired = () => SetMetadata(IS_AUTHENTICATION_REQUIRED, false);
export const AuthenticationRequired = () => SetMetadata(IS_AUTHENTICATION_REQUIRED, true);