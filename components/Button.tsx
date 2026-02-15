import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary';
    children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ variant = 'primary', children, className = '', ...props }) => {
    const baseClass = variant === 'primary' ? 'btn-primary' : 'btn-secondary shadow';
    // Note: btn-secondary isn't fully defined in globals yet, but structure allows it. 
    // For now, let's assume primary is main use case or add inline style if needed.

    return (
        <button className={`btn ${baseClass} ${className}`} {...props}>
            {children}
        </button>
    );
};

export default Button;
