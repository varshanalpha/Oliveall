import React, { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import AuthInput from './AuthInput';

export default function PasswordInput({
  label = 'Password',
  id = 'password',
  name = 'password',
  value,
  onChange,
  placeholder = 'Enter your password',
  error,
  required = false,
  autoComplete = 'current-password',
}) {
  const [showPassword, setShowPassword] = useState(false);

  const toggleVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <AuthInput
      label={label}
      id={id}
      name={name}
      type={showPassword ? 'text' : 'password'}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      icon={Lock}
      error={error}
      required={required}
      autoComplete={autoComplete}
      rightElement={
        <button
          type="button"
          onClick={toggleVisibility}
          tabIndex={-1}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          className="p-1 rounded-lg text-slate-300 hover:text-purple-300 transition-colors focus:outline-none"
        >
          {showPassword ? (
            <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300" />
          ) : (
            <EyeOff className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300" />
          )}
        </button>
      }
    />
  );
}
