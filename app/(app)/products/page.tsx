import { ProductsScreen } from "@/components/directory";
import { preload, withStore, type TableName } from "@/lib/store";
import { canWrite } from "@/lib/permissions";
import { requireSession } from "@/lib/session";

/** Tables this page reads; fetched while the session is checked. */
const TABLES: readonly TableName[] = ["products", "tags"];

export default async function ProductsPage() {
  preload(TABLES);
  const session = await requireSession();
  const { products, tags } = await withStore(TABLES, (store) => ({
    products: store.products.filter((item) => item.organization_id === session.organizationId),
    tags: store.tags.filter((item) => item.organization_id === session.organizationId),
  }));
  return (
    <ProductsScreen
      products={products}
      tags={tags}
      canCreate={canWrite(session.role)}
    />
  );
}
