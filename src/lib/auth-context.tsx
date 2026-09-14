import { createContext, use, useMemo, useState, type PropsWithChildren } from 'react';

type AuthContextValue = {
  session: string | null;
  isLoading: boolean;
  signIn: (email: string) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useSession() {
  const value = use(AuthContext);
  if (!value) {
    throw new Error('useSession must be used within a <SessionProvider />');
  }
  return value;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<string | null>(null);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isLoading: false,
      signIn: (email: string) => setSession(email),
      signOut: () => setSession(null),
    }),
    [session]
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
