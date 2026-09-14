import { AppShell } from "@/components/layout/app-shell";
import { getEnv } from "@/lib/env";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  const shortBaseHost = new URL(getEnv().SHORT_BASE_URL).host;
  return <AppShell shortBaseHost={shortBaseHost}>{children}</AppShell>;
}
