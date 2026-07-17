export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  children?: MenuItem[];
}
