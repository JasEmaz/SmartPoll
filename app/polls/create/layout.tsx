import ProtectedRoute from '../../../components/auth/protected-route';

export default function CreatePollLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}