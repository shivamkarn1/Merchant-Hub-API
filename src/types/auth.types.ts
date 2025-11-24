export enum Role {
  SUPER_ADMIN = "super_admin",
  ADMIN = "admin",
  MERCHANT = "merchant",
  CUSTOMER = "customer",
  VIEWER = "viewer",
}

export enum Permission {
  // Products
  PRODUCTS_CREATE = "products.create",
  PRODUCTS_READ = "products.read",
  PRODUCTS_UPDATE = "products.update",
  PRODUCTS_DELETE = "products.delete",

  // Orders
  ORDERS_CREATE = "orders.create",
  ORDERS_READ = "orders.read",
  ORDERS_UPDATE = "orders.update",
  ORDERS_DELETE = "orders.delete",
  ORDERS_CANCEL = "orders.cancel",

  // Users
  USERS_CREATE = "users.create",
  USERS_READ = "users.read",
  USERS_UPDATE = "users.update",
  USERS_DELETE = "users.delete",
}

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: Role;
  merchant_id: number | null;
  parent_user_id: number | null;
  is_active: boolean;
  permissions?: Permission[];
}

export interface AccessContext {
  user: AuthUser;
  resource?: string;
  action?: string;
  resourceOwnerId?: number;
  resourceMerchantId?: number;
}
