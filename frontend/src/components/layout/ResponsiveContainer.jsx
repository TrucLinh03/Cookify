import React from 'react';

const ResponsiveContainer = ({ 
  children, 
  className = '', 
  maxWidth = '7xl',
  padding = 'default' 
}) => {
  const paddingClasses = {
    none: '',
    sm: 'px-2 sm:px-4',
    default: 'px-4 sm:px-6 lg:px-8',
    lg: 'px-6 sm:px-8 lg:px-12'
  };

  const maxWidthClasses = {
    'sm': 'max-w-sm',
    'md': 'max-w-md', 
    'lg': 'max-w-lg',
    'xl': 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    'full': 'max-w-full'
  };

  return (
    <div className={`
      w-full 
      ${maxWidthClasses[maxWidth]} 
      mx-auto 
      ${paddingClasses[padding]}
      ${className}
    `}>
      {children}
    </div>
  );
};


export const ResponsiveGrid = ({ 
  children, 
  cols = { base: 1, sm: 2, lg: 3, xl: 4 },
  gap = 'default',
  className = ''
}) => {
  const gapClasses = {
    sm: 'gap-2 sm:gap-3',
    default: 'gap-4 sm:gap-6',
    lg: 'gap-6 sm:gap-8'
  };

  const gridCols = `
    grid-cols-${cols.base} 
    ${cols.sm ? `sm:grid-cols-${cols.sm}` : ''} 
    ${cols.md ? `md:grid-cols-${cols.md}` : ''} 
    ${cols.lg ? `lg:grid-cols-${cols.lg}` : ''} 
    ${cols.xl ? `xl:grid-cols-${cols.xl}` : ''}
  `;

  return (
    <div className={`
      grid 
      ${gridCols}
      ${gapClasses[gap]}
      ${className}
    `}>
      {children}
    </div>
  );
};

export const ResponsiveSection = ({ 
  children, 
  className = '',
  spacing = 'default',
  background = 'transparent'
}) => {
  const spacingClasses = {
    none: '',
    sm: 'py-4 sm:py-6',
    default: 'py-8 sm:py-12 lg:py-16',
    lg: 'py-12 sm:py-16 lg:py-20'
  };

  const backgroundClasses = {
    transparent: '',
    white: 'bg-white',
    gray: 'bg-gray-50',
    orange: 'bg-peachLight'
  };

  return (
    <section className={`
      ${backgroundClasses[background]}
      ${spacingClasses[spacing]}
      ${className}
    `}>
      <ResponsiveContainer>
        {children}
      </ResponsiveContainer>
    </section>
  );
};

export default ResponsiveContainer;
