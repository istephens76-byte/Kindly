import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "../../src/lib/supabase/database.types";

// Proves the Phase 1 acceptance criterion (dev brief §9): two accounts in
// different companies cannot see each other's companies/users rows.
//
// Requires a real Supabase project with the migrations in
// supabase/migrations/ applied — run against a disposable/dev project,
// never production. See README "Running the isolation test".

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. This test needs a real Supabase project — see README "Running the isolation test".`,
    );
  }
  return value;
}

const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const admin = createClient<Database>(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface TestAccount {
  authUserId: string;
  companyId: string;
  client: ReturnType<typeof createClient<Database>>;
}

async function provisionAccount(label: string): Promise<TestAccount> {
  const email = `kindly-rls-test-${label}-${Date.now()}@example.com`;
  const password = crypto.randomUUID();

  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
  if (authError || !authData.user) {
    throw new Error(`Failed to create auth user: ${authError?.message}`);
  }

  const { data: company, error: companyError } = await admin
    .from("companies")
    .insert({ name: `RLS test co ${label} ${Date.now()}` })
    .select("id")
    .single();
  if (companyError || !company) {
    throw new Error(`Failed to create company: ${companyError?.message}`);
  }

  const { error: userError } = await admin.from("users").insert({
    id: authData.user.id,
    company_id: company.id,
    role: "admin",
    display_name: `Test admin ${label}`,
    email,
  });
  if (userError) {
    throw new Error(`Failed to create users row: ${userError.message}`);
  }

  const client = createClient<Database>(url, anonKey);
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) {
    throw new Error(`Failed to sign in test account: ${signInError.message}`);
  }

  return { authUserId: authData.user.id, companyId: company.id, client };
}

async function teardownAccount(account: TestAccount) {
  await admin.from("users").delete().eq("id", account.authUserId);
  await admin.from("companies").delete().eq("id", account.companyId);
  await admin.auth.admin.deleteUser(account.authUserId);
}

describe("cross-tenant RLS isolation", () => {
  let accountA: TestAccount;
  let accountB: TestAccount;

  beforeAll(async () => {
    accountA = await provisionAccount("a");
    accountB = await provisionAccount("b");
  });

  afterAll(async () => {
    await teardownAccount(accountA);
    await teardownAccount(accountB);
  });

  it("lets an account see only its own company", async () => {
    const { data, error } = await accountA.client.from("companies").select("id");
    expect(error).toBeNull();
    expect(data?.map((c) => c.id)).toEqual([accountA.companyId]);
  });

  it("lets an account see only its own users row", async () => {
    const { data, error } = await accountA.client.from("users").select("id");
    expect(error).toBeNull();
    expect(data?.map((u) => u.id)).toEqual([accountA.authUserId]);
  });

  it("blocks a direct-by-id lookup of the other company", async () => {
    const { data, error } = await accountA.client
      .from("companies")
      .select("id")
      .eq("id", accountB.companyId)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it("blocks a direct-by-id lookup of the other account's users row", async () => {
    const { data, error } = await accountA.client
      .from("users")
      .select("id")
      .eq("id", accountB.authUserId)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it("holds symmetrically for account B", async () => {
    const { data: companies } = await accountB.client
      .from("companies")
      .select("id");
    expect(companies?.map((c) => c.id)).toEqual([accountB.companyId]);

    const { data: users } = await accountB.client.from("users").select("id");
    expect(users?.map((u) => u.id)).toEqual([accountB.authUserId]);
  });
});
