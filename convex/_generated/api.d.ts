/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as domain_expense_index from "../domain/expense/index.js";
import type * as domain_expense_rules from "../domain/expense/rules.js";
import type * as domain_expense_splitCalculator from "../domain/expense/splitCalculator.js";
import type * as domain_expense_types from "../domain/expense/types.js";
import type * as domain_group_index from "../domain/group/index.js";
import type * as domain_group_rules from "../domain/group/rules.js";
import type * as domain_group_types from "../domain/group/types.js";
import type * as domain_invitation_index from "../domain/invitation/index.js";
import type * as domain_invitation_rules from "../domain/invitation/rules.js";
import type * as domain_invitation_types from "../domain/invitation/types.js";
import type * as domain_shared_index from "../domain/shared/index.js";
import type * as domain_shared_money from "../domain/shared/money.js";
import type * as expenses from "../expenses.js";
import type * as groups from "../groups.js";
import type * as invitations from "../invitations.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_logger from "../lib/logger.js";
import type * as lib_presetCategories from "../lib/presetCategories.js";
import type * as lib_seedData from "../lib/seedData.js";
import type * as lib_validators from "../lib/validators.js";
import type * as seed from "../seed.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "domain/expense/index": typeof domain_expense_index;
  "domain/expense/rules": typeof domain_expense_rules;
  "domain/expense/splitCalculator": typeof domain_expense_splitCalculator;
  "domain/expense/types": typeof domain_expense_types;
  "domain/group/index": typeof domain_group_index;
  "domain/group/rules": typeof domain_group_rules;
  "domain/group/types": typeof domain_group_types;
  "domain/invitation/index": typeof domain_invitation_index;
  "domain/invitation/rules": typeof domain_invitation_rules;
  "domain/invitation/types": typeof domain_invitation_types;
  "domain/shared/index": typeof domain_shared_index;
  "domain/shared/money": typeof domain_shared_money;
  expenses: typeof expenses;
  groups: typeof groups;
  invitations: typeof invitations;
  "lib/auth": typeof lib_auth;
  "lib/logger": typeof lib_logger;
  "lib/presetCategories": typeof lib_presetCategories;
  "lib/seedData": typeof lib_seedData;
  "lib/validators": typeof lib_validators;
  seed: typeof seed;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
