import { business } from "@/lib/site";
import { HeaderClient } from "./header-client";

export function SiteHeader() {
  const biz = business();
  return <HeaderClient phone={biz.phone} phoneHref={biz.phoneHref} />;
}
