import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom';

import CategoryWrapper from '../category/CategoryWrapper';
import FeaturedSection from './FeaturedSection';
import LatestRecipe from './LatestRecipe';
import Hero from '../../components/Hero';
import AboutSection from './AboutSection';
import Contact from './Contact';
import ResponsiveContainer, { ResponsiveSection } from '../../components/layout/ResponsiveContainer';

const Home = () => {
  const location = useLocation();
  const [showRedirectMessage, setShowRedirectMessage] = useState(false);

  useEffect(() => {
    // Kiểm tra xem có thông báo redirect không
    if (location.state?.message && location.state?.type === 'info') {
      setShowRedirectMessage(true);
      
      // Tự động ẩn sau 5 giây
      const timer = setTimeout(() => {
        setShowRedirectMessage(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [location.state]);

  return (
    <div className="w-full">
      {/* Redirect Message */}
      {showRedirectMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm text-blue-700">
                  {location.state.message}
                </p>
              </div>
              <div className="ml-4">
                <button
                  onClick={() => setShowRedirectMessage(false)}
                  className="text-blue-400 hover:text-blue-600"
                >
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section - Full width */}
      <Hero/>
      
      {/* Category Section */}
      <ResponsiveSection spacing="sm" background="white">
        <CategoryWrapper/>
      </ResponsiveSection>

      {/* Featured Section */}
      <ResponsiveSection spacing="sm" background="gray">
        <FeaturedSection/>
      </ResponsiveSection>

      {/* Latest Recipe Section */}
      <ResponsiveSection spacing="sm" background="white">
        <LatestRecipe/>
      </ResponsiveSection>

      {/* About Section */}
      <ResponsiveSection spacing="sm" background="orange">
        <AboutSection/>
      </ResponsiveSection>

      {/* Contact Section */}
      <ResponsiveSection spacing="sm" background="white">
        <Contact/>
      </ResponsiveSection>
    </div>
  )
}

export default Home