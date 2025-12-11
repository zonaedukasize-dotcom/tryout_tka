// components/auth/FormInput.tsx
interface FormInputProps {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon: React.ReactNode;
  required?: boolean;
  helperText?: string;
}

export default function FormInput({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  icon,
  required = false,
  helperText,
}: FormInputProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          {icon}
        </div>
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-gray-50 focus:bg-white dark:bg-gray-700/50 dark:border-gray-600 dark:focus:ring-blue-400 dark:focus:bg-gray-700 dark:text-white"
          required={required}
        />
      </div>
      {helperText && (
        <p className="text-xs text-gray-500 mt-1 ml-1 dark:text-gray-400">{helperText}</p>
      )}
    </div>
  );
}

// ============================================================================
// ICON COMPONENTS - Export semua icon yang dibutuhkan
// ============================================================================

export function UserIcon() {
  return (
    <svg className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition dark:text-gray-500 dark:group-focus-within:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

export function PhoneIcon() {
  return (
    <svg className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition dark:text-gray-500 dark:group-focus-within:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}

export function SchoolIcon() {
  return (
    <svg className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition dark:text-gray-500 dark:group-focus-within:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}