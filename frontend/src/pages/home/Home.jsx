import React from 'react'

import CategoryWrapper from '../category/CategoryWrapper';
import FeaturedSection from './FeaturedSection';
import LatestRecipe from './LatestRecipe';
import Hero from '../../components/Hero';
import AboutSection from './AboutSection';
import Contact from './Contact';



const Home = () => {
  return (
    <div className="w-full">
      {/* Hero Section - Full width */}
      <Hero/>
      
      {/* Category Section */}
      <div className="container mx-auto px-4 py-4">
        <CategoryWrapper/>
      </div>

      {/* Other Sections */}
      <div className="container mx-auto px-4">
        <FeaturedSection/>
        <LatestRecipe/>
        <AboutSection/>
        <Contact/>
      </div>
    </div>
  )
}

export default Home