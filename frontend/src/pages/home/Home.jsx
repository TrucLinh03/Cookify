import React from 'react'

import CategoryWrapper from '../category/CategoryWrapper';
import FeaturedSection from './FeaturedSection';
import LatestRecipe from './LatestRecipe';
import Hero from '../../components/Hero';
import AboutSection from './AboutSection';
import Contact from './Contact';
import ResponsiveContainer, { ResponsiveSection } from '../../components/layout/ResponsiveContainer';

const Home = () => {
  return (
    <div className="w-full">
      {/* Hero Section - Full width */}
      <Hero/>
      
      {/* Category Section */}
      <ResponsiveSection spacing="sm" background="white">
        <CategoryWrapper/>
      </ResponsiveSection>

      {/* Featured Section */}
      <ResponsiveSection spacing="default" background="gray">
        <FeaturedSection/>
      </ResponsiveSection>

      {/* Latest Recipe Section */}
      <ResponsiveSection spacing="default" background="white">
        <LatestRecipe/>
      </ResponsiveSection>

      {/* About Section */}
      <ResponsiveSection spacing="default" background="orange">
        <AboutSection/>
      </ResponsiveSection>

      {/* Contact Section */}
      <ResponsiveSection spacing="default" background="white">
        <Contact/>
      </ResponsiveSection>
    </div>
  )
}

export default Home