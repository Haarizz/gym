import React from 'react';
import { useParams } from 'react-router-dom';

export function CatalogResolver() {
  const { tenantSlug, branchId } = useParams();

  React.useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isAndroid = ua.includes('android');
    const isIOS = /ipad|iphone|ipod/.test(ua);

    if (isAndroid) {
      // Direct Android users to the Play Store if the App Link failed to intercept
      window.location.replace('https://play.google.com/store/apps/details?id=com.anandu389.GymBiosMobile');
    } else if (isIOS) {
      // Direct iOS users to the App Store if the Universal Link failed to intercept
      window.location.replace('https://apps.apple.com/app/id123456789'); // Dummy App ID for external config
    }
  }, [tenantSlug, branchId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8 text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-[#2B7A78]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Mobile Experience Only</h2>
        <p className="text-gray-600">
          Open GymBios on your mobile device to view this catalog.
        </p>
        <div className="pt-4 border-t border-gray-100 flex flex-col space-y-3">
          <a 
            href="https://apps.apple.com/app/id123456789" 
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
          >
            Download on the App Store
          </a>
          <a 
            href="https://play.google.com/store/apps/details?id=com.anandu389.GymBiosMobile" 
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#2B7A78] hover:bg-[#236360] focus:outline-none"
          >
            Get it on Google Play
          </a>
        </div>
      </div>
    </div>
  );
}
