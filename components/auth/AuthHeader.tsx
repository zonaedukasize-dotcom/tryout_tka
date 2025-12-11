// components/auth/AuthHeader.tsx
interface AuthHeaderProps {
  title: string;
  subtitle: string;
  logoSrc?: string;
}

export default function AuthHeader({ 
  title, 
  subtitle, 
  logoSrc = '/logo.png' 
}: AuthHeaderProps) {
  return (
    <div className="text-center mb-8">
      {/* Logo */}
      <div className="flex items-center justify-center mb-4">
        <img 
          src={logoSrc}
          alt="Zona Edukasi Logo" 
          className="w-16 h-16 object-contain"
        />
      </div>
      
      {/* Brand Name */}
      <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2 dark:from-blue-400 dark:to-indigo-400">
        {title}
      </h1>
      <p className="text-gray-600 dark:text-gray-300">{subtitle}</p>
    </div>
  );
}