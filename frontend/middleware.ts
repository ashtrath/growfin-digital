import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. all files with an extension (e.g. .jpg, .png, .css, .ico)
     */
    '/((?!api|_next|.*\\..*).*)',
  ],
};

export default function middleware(req: NextRequest) {
  const url = req.nextUrl;

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'growfin.my.id';
  
  let hostname = req.headers
    .get('host')!
    .replace('.localhost:3000', `.${rootDomain}`);

  // Strip port for local testing (e.g., growfin.my.id:3000 -> growfin.my.id)
  hostname = hostname.split(':')[0];

  const path = url.pathname;

  // Define reserved paths for the main domain
  const reservedPaths = ['/dashboard', '/login', '/register', '/demo', '/checkout', '/back-stage'];
  const isReserved = reservedPaths.some(reserved => path.startsWith(reserved)) || path === '/';

  // 1. Handle Subdomains & Custom Domains (e.g. kopisenja.growfin.my.id or www.kopisenja.com)
  if (
    hostname !== 'localhost' &&
    hostname !== rootDomain &&
    hostname !== `www.${rootDomain}`
  ) {
    let currentHost = hostname.replace(/^www\./, '');
    if (currentHost.endsWith(`.${rootDomain}`)) {
      currentHost = currentHost.replace(`.${rootDomain}`, '');
    }
    
    // We rewrite to /site/[currentHost] to render the tenant's page
    return NextResponse.rewrite(new URL(`/site/${currentHost}${path === '/' ? '' : path}`, req.url));
  }

  // 2. Handle Root Slugs (e.g. growfin.my.id/kopisenja)
  if (!isReserved) {
    // Rewrite to /site/[slug]
    return NextResponse.rewrite(new URL(`/site${path}`, req.url));
  }

  return NextResponse.next();
}
