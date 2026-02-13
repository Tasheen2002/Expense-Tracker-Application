import { AppLayout } from '@/components/layout/app-layout';

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
