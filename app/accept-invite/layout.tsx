import { IntlProvider } from "@/components/intl-provider";

export default function AcceptInviteLayout({ children }: { children: React.ReactNode }) {
  return <IntlProvider>{children}</IntlProvider>;
}
