// components/auth/AuthCard.tsx
interface AuthCardProps {
  children: React.ReactNode;
  footerText?: string;
}

export default function AuthCard({ children, footerText }: AuthCardProps) {
  return (
    <>
      <div className="bg-white/80 dark:bg-gray-800/90 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/50">
        {children}
      </div>
      
      {footerText && (
        <p className="text-center text-sm text-gray-500 mt-6 dark:text-gray-400">
          {footerText}
        </p>
      )}
    </>
  );
}