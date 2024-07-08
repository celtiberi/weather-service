// hooks/useAnalytics.js

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import * as gtag from '../lib/gtag';

const useAnalytics = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const url = pathname + searchParams.toString();
    gtag.pageview(url);
  }, [pathname, searchParams]);

  const trackEvent = (action, category, label, value) => {
    gtag.event({ action, category, label, value });
  };

  return { trackEvent };
};

export default useAnalytics;