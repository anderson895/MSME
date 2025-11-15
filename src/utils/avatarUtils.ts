/**
 * Helper function to get full avatar URL from relative path
 * Handles both relative paths (/uploads/...) and full URLs (http://...)
 */
export const getAvatarUrl = (avatar: string | undefined | null): string => {
  if (!avatar) return '';
  
  // If it's already a full URL (starts with http), return as is
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    return avatar;
  }
  
  // If it's a relative path (starts with /uploads), prepend backend URL
  if (avatar.startsWith('/uploads/')) {
    const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
    
    // Remove /api from the end if present to get base URL
    let baseUrl: string;
    if (backendUrl.endsWith('/api')) {
      baseUrl = backendUrl.slice(0, -4); // Remove '/api'
    } else if (backendUrl.includes('/api')) {
      baseUrl = backendUrl.replace('/api', ''); // Remove '/api' anywhere
    } else {
      // If no /api found, assume it's already the base URL
      baseUrl = backendUrl;
    }
    
    // Ensure baseUrl doesn't end with a slash
    baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    
    // Ensure avatar path starts with /
    const avatarPath = avatar.startsWith('/') ? avatar : `/${avatar}`;
    
    const fullUrl = `${baseUrl}${avatarPath}`;
    
    // Debug logging (only in development)
    if (import.meta.env.DEV) {
      console.log('Avatar URL conversion:', { avatar, backendUrl, baseUrl, fullUrl });
    }
    
    return fullUrl;
  }
  
  // Return as is if it doesn't match any pattern
  return avatar;
};
