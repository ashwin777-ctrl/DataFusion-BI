/**
 * User-provided expressions are deliberately limited to a small expression
 * language. DuckDB does not parameterize identifiers or expressions, so reject
 * everything outside this allowlist before it reaches the SQL builder.
 */
const SAFE_EXPRESSION = /^[A-Za-z_][A-Za-z0-9_]*(\s*(=|!=|<>|<=|>=|<|>|\+|-|\*|\/|%|\(|\)|,|\.|'[^']*'|\d+(\.\d+)?|\s))*$/;
const FORBIDDEN = /(;|--|\/\*|\*\/|\b(select|from|where|union|join|copy|attach|install|load|pragma|read_parquet|read_csv|httpfs|glob|create|drop|insert|update|delete|call)\b)/i;

export function assertSafeExpression(expression: string, label = "expression"): string {
  const value = expression.trim();
  if (!value || value.length > 500 || FORBIDDEN.test(value) || !SAFE_EXPRESSION.test(value)) {
    throw new Error(`Invalid ${label}`);
  }
  return value;
}

export function quoteSqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}
