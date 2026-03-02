import type { GetApplicationQuery } from "@/__generated__/hooks";

export type AppData = NonNullable<GetApplicationQuery["application"]>;

export interface TabBaseProps {
  app: AppData;
  isAdmin: boolean;
}
