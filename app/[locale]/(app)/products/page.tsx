import { setRequestLocale } from "next-intl/server";
import { ProductsScreen } from "@/components/directory";
import { loadStore } from "@/lib/store";
import { canWrite } from "@/lib/permissions";
import { requireSession } from "@/lib/session";

export default async function ProductsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireSession();
  const store = await loadStore();
  return (
    <ProductsScreen
      products={store.products.filter((item) => item.organization_id === session.organizationId)}
      tags={store.tags.filter((item) => item.organization_id === session.organizationId)}
      canCreate={canWrite(session.role)}
    />
  );
}
