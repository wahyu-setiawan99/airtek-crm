import { IntlProvider } from "@/components/intl-provider";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <IntlProvider>{children}</IntlProvider>;
}
