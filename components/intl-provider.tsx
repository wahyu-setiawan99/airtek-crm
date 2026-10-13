import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { HtmlLang } from "@/components/html-lang";

/** Messages for app and auth pages. The static home page does not use this. */
export async function IntlProvider({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <HtmlLang locale={locale} />
      {children}
    </NextIntlClientProvider>
  );
}
