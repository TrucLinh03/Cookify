// Legacy support - use centralized config instead
import { getBaseUrl as getBaseUrlFromConfig } from '../config/api.js';

export const getBaseUrl = () => {
    return getBaseUrlFromConfig();
}
