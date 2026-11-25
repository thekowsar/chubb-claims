/** One item of GET /api/menu (MenuItemDto). */
export interface MenuItem {
  code: string;
  label: string;
  route: string;
  icon: string | null;
  sortOrder: number;
}
