/**
 * URL validation and security utilities for contest submissions
 * Prevents dangerous protocols and local network submissions
 */

// Dangerous protocols that must be rejected
const DANGEROUS_PROTOCOLS = [
  'javascript:',
  'data:',
  'vbscript:',
  'file:',
  'blob:',
  'about:',
];

// Private/local IP ranges that should be rejected
const PRIVATE_IP_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^0\.0\.0\.0$/,
  /^192\.168\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/,
  /^\[::1\]$/,
  /^\[::\]$/,
];

export interface UrlValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedUrl?: string;
}

/**
 * Validates a contest URL (live website or repository)
 * @param input - The URL string to validate
 * @param options - Validation options
 * @returns Validation result with sanitized URL or error
 */
export function validateContestUrl(
  input: string,
  options: {
    type: 'website' | 'repository';
    required?: boolean;
  } = { type: 'website', required: true }
): UrlValidationResult {
  // Handle empty input
  const trimmed = input.trim();
  if (!trimmed) {
    if (options.required) {
      return { isValid: false, error: 'URL is required' };
    }
    return { isValid: true, sanitizedUrl: '' };
  }

  // Try to parse the URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmed);
  } catch {
    return {
      isValid: false,
      error: 'Invalid URL format. Please enter a complete URL starting with http:// or https://',
    };
  }

  // Check protocol
  const protocol = parsedUrl.protocol.toLowerCase();
  if (!['http:', 'https:'].includes(protocol)) {
    if (DANGEROUS_PROTOCOLS.includes(protocol)) {
      return {
        isValid: false,
        error: 'Dangerous protocol detected. Only HTTP and HTTPS URLs are allowed.',
      };
    }
    return {
      isValid: false,
      error: 'Only HTTP and HTTPS URLs are allowed.',
    };
  }

  // Check for local/private network addresses
  const hostname = parsedUrl.hostname.toLowerCase();
  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return {
        isValid: false,
        error: 'Cannot submit localhost or private network URLs. Please use a publicly accessible URL.',
      };
    }
  }

  // Validate repository URL patterns if type is repository
  if (options.type === 'repository') {
    const validRepoHosts = [
      'github.com',
      'gitlab.com',
      'bitbucket.org',
      'gitea.com',
      'codeberg.org',
    ];
    
    const isValidRepo = validRepoHosts.some(host => 
      hostname === host || hostname.endsWith(`.${host}`)
    );

    if (!isValidRepo) {
      return {
        isValid: false,
        error: 'Repository URL must be from GitHub, GitLab, Bitbucket, Gitea, or Codeberg.',
      };
    }
  }

  // Prefer HTTPS
  if (protocol === 'http:' && options.type === 'website') {
    return {
      isValid: true,
      sanitizedUrl: parsedUrl.toString(),
      error: 'HTTP detected. HTTPS is strongly recommended for better security.',
    };
  }

  return {
    isValid: true,
    sanitizedUrl: parsedUrl.toString(),
  };
}

/**
 * Formats a URL for display (truncates long URLs)
 */
export function formatUrlForDisplay(url: string, maxLength: number = 50): string {
  if (url.length <= maxLength) return url;
  
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname;
    const path = parsed.pathname + parsed.search + parsed.hash;
    
    if (domain.length + 3 > maxLength) {
      return domain.slice(0, maxLength - 3) + '...';
    }
    
    const remainingLength = maxLength - domain.length - 3;
    if (path.length > remainingLength) {
      return domain + '/' + path.slice(0, remainingLength - 1) + '...';
    }
    
    return domain + path;
  } catch {
    return url.slice(0, maxLength - 3) + '...';
  }
}

/**
 * Creates safe external link attributes
 */
export function getSafeExternalLinkProps() {
  return {
    target: '_blank',
    rel: 'noopener noreferrer nofollow',
  };
}
