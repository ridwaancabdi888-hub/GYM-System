import { createContext, useContext, useId } from 'react';
import { getFieldControlProps } from '../utils/formAccessibility.js';

const FormFieldContext = createContext(null);

export function FormField({ label, children, error, required, id }) {
  const generatedId = useId();
  const controlId = id || `field-${generatedId.replace(/:/g, '')}`;
  const errorId = `${controlId}-error`;

  return (
    <FormFieldContext.Provider value={{ controlId, errorId, error }}>
      <div className="mb-4">
        <label htmlFor={controlId} className="mb-1 block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-red-500" aria-hidden="true"> *</span>}
        </label>
        {children}
        {error && <p id={errorId} role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    </FormFieldContext.Provider>
  );
}

const baseInput =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500';

export function Input(props) {
  const field = useContext(FormFieldContext);
  const accessibilityProps = getFieldControlProps(props, field);
  return <input {...props} {...accessibilityProps} className={`${baseInput} ${props.className || ''}`} />;
}

export function Select({ children, ...props }) {
  const field = useContext(FormFieldContext);
  const accessibilityProps = getFieldControlProps(props, field);
  return (
    <select {...props} {...accessibilityProps} className={`${baseInput} bg-white ${props.className || ''}`}>
      {children}
    </select>
  );
}

export function Textarea(props) {
  const field = useContext(FormFieldContext);
  const accessibilityProps = getFieldControlProps(props, field);
  return <textarea {...props} {...accessibilityProps} className={`${baseInput} ${props.className || ''}`} />;
}

export function Button({ variant = 'primary', className = '', ...props }) {
  const variants = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-300',
    secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
    ghost: 'text-slate-600 hover:bg-slate-100',
  };
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    />
  );
}
