const Skeleton = ({ 
  variant = 'rectangular', 
  width, 
  height, 
  className = '',
  rounded = 'rounded-lg',
}) => {
  const baseStyles = `skeleton ${rounded} ${className}`;
  
  const style = {
    width: width || '100%',
    height: height || '1rem',
  };
  
  if (variant === 'circular') {
    return (
      <div
        className={`${baseStyles} rounded-full`}
        style={{ width: width || height || '48px', height: height || width || '48px' }}
      />
    );
  }
  
  if (variant === 'text') {
    return (
      <div
        className={`${baseStyles} h-4`}
        style={{ width: width || '100%' }}
      />
    );
  }
  
  return (
    <div
      className={baseStyles}
      style={style}
    />
  );
};

export default Skeleton;
