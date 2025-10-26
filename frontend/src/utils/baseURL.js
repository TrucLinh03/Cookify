export const getBaseUrl = () => {
    // Use environment variable or fallback to production URL
    return import.meta.env.VITE_API_BASE_URL || 'https://cookify-auiz.onrender.com';
}
