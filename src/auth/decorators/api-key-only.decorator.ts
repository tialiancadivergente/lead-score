import { SetMetadata } from '@nestjs/common';

export const API_KEY_ONLY_KEY = 'api_key_only';

export const ApiKeyOnly = () => SetMetadata(API_KEY_ONLY_KEY, true);
