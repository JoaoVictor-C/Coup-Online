import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({ children, type = 'button', disabled = false }) => {
  return (
    <button type={type} disabled={disabled} className="btn">
      {children}
    </button>
  );
};

export default Button;

