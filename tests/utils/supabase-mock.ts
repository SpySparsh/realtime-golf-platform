type QueryResult = {
  data?: unknown;
  error?: unknown;
};

export type SupabaseOperation = {
  table: string;
  action: string;
  payload?: unknown;
  filters: Array<{ method: string; column?: string; value?: unknown }>;
};

export function createSupabaseMock(results: Record<string, QueryResult> = {}) {
  const operations: SupabaseOperation[] = [];

  function resultFor(table: string, action: string): QueryResult {
    return results[`${table}.${action}`] ?? results[table] ?? { data: null, error: null };
  }

  function createQuery(table: string, action = "select", payload?: unknown): any {
    const operation: SupabaseOperation = { table, action, payload, filters: [] };
    operations.push(operation);

    const query: any = {
      select: jest.fn((_columns?: string) => {
        if (!["insert", "update", "upsert", "delete"].includes(operation.action)) {
          operation.action = "select";
        }
        return query;
      }),
      insert: jest.fn((nextPayload?: unknown) => {
        operation.action = "insert";
        operation.payload = nextPayload;
        return query;
      }),
      update: jest.fn((nextPayload?: unknown) => {
        operation.action = "update";
        operation.payload = nextPayload;
        return query;
      }),
      upsert: jest.fn((nextPayload?: unknown) => {
        operation.action = "upsert";
        operation.payload = nextPayload;
        return query;
      }),
      delete: jest.fn(() => {
        operation.action = "delete";
        return query;
      }),
      eq: jest.fn((column: string, value: unknown) => {
        operation.filters.push({ method: "eq", column, value });
        return query;
      }),
      gte: jest.fn((column: string, value: unknown) => {
        operation.filters.push({ method: "gte", column, value });
        return query;
      }),
      lt: jest.fn((column: string, value: unknown) => {
        operation.filters.push({ method: "lt", column, value });
        return query;
      }),
      in: jest.fn((column: string, value: unknown) => {
        operation.filters.push({ method: "in", column, value });
        return query;
      }),
      order: jest.fn(() => query),
      maybeSingle: jest.fn(async () => resultFor(table, operation.action)),
      single: jest.fn(async () => resultFor(table, operation.action)),
      then: (resolve: (value: QueryResult) => unknown) => resolve(resultFor(table, operation.action)),
    };

    return query;
  }

  return {
    operations,
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
      getUser: jest.fn(),
      signOut: jest.fn(),
      refreshSession: jest.fn(),
    },
    from: jest.fn((table: string) => createQuery(table)),
    rpc: jest.fn(async () => ({ data: null, error: null })),
  };
}
