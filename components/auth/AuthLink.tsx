// components/auth/AuthLink.tsx
interface AuthLinkProps {
  text: string;
  linkText: string;
  href: string;
}

export default function AuthLink({ text, linkText, href }: AuthLinkProps) {
  return (
    <div className="mt-8 text-center">
      <p className="text-gray-600 text-sm dark:text-gray-400">
        {text}{' '}
        <a 
          href={href}
          className="font-semibold text-blue-600 hover:text-indigo-600 transition dark:text-blue-400 dark:hover:text-indigo-400"
        >
          {linkText}
        </a>
      </p>
    </div>
  );
}
