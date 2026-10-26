#!/usr/bin/env node
/**
 * Wagmart Shopify Store MCP Server (mcp/shopify-store-mcp/server.mjs)
 *
 * Official Model Context Protocol (MCP) Stdio Server for:
 * - Store: gk2scz-zu.myshopify.com (Wagmart Premium Pet Store)
 * - Live Theme: #158971429036 (wagmart)
 * - Development Theme: #159000527020 (Development (4c28a4-Dishant))
 *
 * Security & Architecture:
 * - Zero hardcoded secrets. Reads configuration from environment variables or gitignored `.env`.
 * - Never exposes an unrestricted raw GraphQL execution tool.
 * - Dual-layer operation:
 *   1. Immediate Read Access via authenticated Shopify CLI + Storefront JSON endpoints
 *   2. Full Admin GraphQL API (2025-01) Read/Write once SHOPIFY_ADMIN_ACCESS_TOKEN is set in `.env`
 * - Every write operation validates inputs, checks scopes, and requires `approved_by_user: true`
 *   (returning a safe dry-run change summary first when `approved_by_user` is false/omitted).
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_ROOT = path.resolve(__dirname, '..', '..');

// Load .env from workspace root if present (never log values)
function loadDotEnv() {
  const envPath = path.join(WORKSPACE_ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  try {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eqIdx = line.indexOf('=');
      if (eqIdx === -1) continue;
      const key = line.slice(0, eqIdx).trim();
      let val = line.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (key && !(key in process.env)) {
        process.env[key] = val;
      }
    }
  } catch {
    // Ignore .env parse errors silently
  }
}

loadDotEnv();

const STORE_DOMAIN = (process.env.SHOPIFY_STORE_DOMAIN || 'gk2scz-zu.myshopify.com')
  .replace(/^https?:\/\//, '')
  .replace(/\/$/, '');
const DEV_THEME_ID = process.env.SHOPIFY_DEV_THEME_ID || '159000527020';
const LIVE_THEME_ID = process.env.SHOPIFY_LIVE_THEME_ID || '158971429036';
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2025-01';

function hasAdminToken() {
  return Boolean(process.env.SHOPIFY_ADMIN_ACCESS_TOKEN && process.env.SHOPIFY_ADMIN_ACCESS_TOKEN.trim());
}

/**
 * Execute an official Shopify Admin GraphQL API request with rate-limit handling.
 * Never logs or echoes tokens.
 */
async function adminGraphQL(query, variables = {}, requiredScopeHint = '') {
  loadDotEnv();
  const token = (process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || '').trim();
  if (!token) {
    const err = new Error(
      `ADMIN_TOKEN_MISSING: This operation requires SHOPIFY_ADMIN_ACCESS_TOKEN in .env` +
        (requiredScopeHint ? ` (with scope: ${requiredScopeHint})` : '') +
        `. Copy .env.example to .env and add your Shopify Custom App Admin API token (shpat_...).`
    );
    err.code = 'ADMIN_TOKEN_MISSING';
    throw err;
  }

  const endpoint = `https://${STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (res.status === 429) {
    throw new Error('RATE_LIMITED: Shopify Admin API rate limit reached (HTTP 429). Retry after a few seconds.');
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error(
      `PERMISSION_DENIED (HTTP ${res.status}): Verify SHOPIFY_ADMIN_ACCESS_TOKEN is valid and has ${requiredScopeHint || 'the required Admin API scope'}.`
    );
  }
  if (!res.ok) {
    throw new Error(`SHOPIFY_HTTP_ERROR: Admin GraphQL returned HTTP ${res.status}.`);
  }

  const json = await res.json();
  if (Array.isArray(json.errors) && json.errors.length > 0) {
    const msg = json.errors.map((e) => e.message).join('; ');
    throw new Error(`GRAPHQL_ERROR: ${msg}`);
  }
  return {
    data: json.data,
    throttleStatus: json.extensions?.cost?.throttleStatus || null,
  };
}

/**
 * Fetch public Storefront JSON endpoint on the connected store.
 */
async function storefrontJson(pathname) {
  const url = `https://${STORE_DOMAIN}${pathname.startsWith('/') ? pathname : '/' + pathname}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'Wagmart-MCP-Server/1.0' },
  });
  if (!res.ok) {
    throw new Error(`STOREFRONT_HTTP_${res.status}: Could not fetch ${pathname} from ${STORE_DOMAIN}`);
  }
  return await res.json();
}

/**
 * Run Shopify CLI or Git safely inside WORKSPACE_ROOT without shell-concatenation warnings.
 */
async function runCliCommand(bin, args, timeoutMs = 25000) {
  const isWin = process.platform === 'win32';
  const safeArgs = args.map((a) => String(a).replace(/[;&|`$<>]/g, ''));
  const cmd = isWin && bin === 'shopify' ? process.env.ComSpec || 'cmd.exe' : bin;
  const finalArgs = isWin && bin === 'shopify' ? ['/d', '/s', '/c', 'shopify.cmd', ...safeArgs] : safeArgs;
  const { stdout, stderr } = await execFileAsync(cmd, finalArgs, {
    cwd: WORKSPACE_ROOT,
    timeout: timeoutMs,
    windowsHide: true,
    maxBuffer: 8 * 1024 * 1024,
  });
  return { stdout: stdout.trim(), stderr: stderr.trim() };
}

// ============================================================================
// TOOL DEFINITIONS (Validated, Granular, No Raw GraphQL Execution Tool)
// ============================================================================
export const TOOLS = [
  {
    name: 'get_shop_info',
    description:
      'Read connected Shopify store information, domain, theme IDs, currency, localization, and active authentication mode (Admin GraphQL vs Storefront + Shopify CLI).',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'list_themes',
    description:
      'List all themes on the connected Shopify store (identifying live/published and development themes) using the authenticated Shopify CLI or Admin API.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'get_theme_details',
    description:
      'Inspect local and remote theme structure, sections, snippets, templates, assets, and settings_schema.json.',
    inputSchema: {
      type: 'object',
      properties: {
        theme_id: {
          type: 'string',
          description: 'Optional theme ID to inspect (defaults to Development Theme #159000527020).',
        },
        include_file_list: {
          type: 'boolean',
          description: 'Whether to include the complete list of sections, snippets, templates, and assets.',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'compare_theme_files',
    description:
      'Compare local theme files in the workspace against remote/tracked state to identify modified, untracked, or missing Liquid/CSS/JS/JSON files before uploading.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'upload_to_development_theme',
    description:
      'Upload local theme changes strictly to the Development Theme (#159000527020). Requires approved_by_user: true. Never publishes a theme.',
    inputSchema: {
      type: 'object',
      properties: {
        only_files: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional relative file paths (e.g. ["sections/header.liquid", "assets/theme.js"]) to upload.',
        },
        approved_by_user: {
          type: 'boolean',
          description: 'Must be set to true only after the user explicitly approves uploading to the development theme.',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'list_products',
    description:
      'List products from the connected Shopify store with titles, handles, vendors, product types, tags, status, variants count, SKUs, and price range.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: 50,
          description: 'Number of products to return (1-50, default 20).',
        },
        page: {
          type: 'integer',
          minimum: 1,
          description: 'Page number for Storefront pagination (default 1).',
        },
        after: {
          type: 'string',
          description: 'Cursor for Admin GraphQL pagination.',
        },
        query: {
          type: 'string',
          description: 'Optional search filter (e.g. title or product_type).',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_product',
    description:
      'Read detailed product information (title, description, handle, vendor, product_type, tags, variants, options, SKUs, prices, compare_at_price, images) by handle or ID.',
    inputSchema: {
      type: 'object',
      properties: {
        handle: {
          type: 'string',
          description: 'Product handle (e.g. "pet-grooming-glove").',
        },
        id: {
          type: 'string',
          description: 'Optional Shopify Product ID or GID (e.g. "gid://shopify/Product/12345").',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'create_product',
    description:
      'Create a new product via Shopify Admin GraphQL API (defaults to DRAFT status for safety). Requires SHOPIFY_ADMIN_ACCESS_TOKEN (write_products) and approved_by_user: true.',
    inputSchema: {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string', minLength: 1 },
        description_html: { type: 'string' },
        vendor: { type: 'string' },
        product_type: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        status: { type: 'string', enum: ['DRAFT', 'ACTIVE', 'ARCHIVED'] },
        approved_by_user: {
          type: 'boolean',
          description: 'Must be true only after showing the proposed product summary and receiving explicit user approval.',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'update_product',
    description:
      'Update non-destructive product metadata (title, description_html, vendor, product_type, tags) via Admin GraphQL API. Requires SHOPIFY_ADMIN_ACCESS_TOKEN (write_products) and approved_by_user: true.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string', description: 'Product numeric ID or GID (gid://shopify/Product/...).' },
        title: { type: 'string' },
        description_html: { type: 'string' },
        vendor: { type: 'string' },
        product_type: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        approved_by_user: {
          type: 'boolean',
          description: 'Must be true only after showing the proposed change summary and receiving explicit user approval.',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'list_collections',
    description: 'List collections from the connected Shopify store with titles, handles, descriptions, and product counts.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', minimum: 1, maximum: 50 },
        page: { type: 'integer', minimum: 1 },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_collection',
    description: 'Read collection details and associated products by collection handle or ID.',
    inputSchema: {
      type: 'object',
      required: ['handle'],
      properties: {
        handle: { type: 'string', description: 'Collection handle (e.g. "all", "grooming", "dogs").' },
        products_limit: { type: 'integer', minimum: 1, maximum: 50 },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'create_collection',
    description:
      'Create a custom collection via Shopify Admin GraphQL API. Requires SHOPIFY_ADMIN_ACCESS_TOKEN (write_products) and approved_by_user: true.',
    inputSchema: {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string', minLength: 1 },
        description_html: { type: 'string' },
        handle: { type: 'string' },
        approved_by_user: { type: 'boolean' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'update_collection',
    description:
      'Update a collection title or description via Shopify Admin GraphQL API. Requires SHOPIFY_ADMIN_ACCESS_TOKEN (write_products) and approved_by_user: true.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string', description: 'Collection numeric ID or GID.' },
        title: { type: 'string' },
        description_html: { type: 'string' },
        approved_by_user: { type: 'boolean' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'list_pages',
    description: 'List Shopify Online Store pages with titles, handles, and publication timestamps.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', minimum: 1, maximum: 50 },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_page',
    description: 'Read a Shopify page by handle or ID, including HTML content and template info.',
    inputSchema: {
      type: 'object',
      required: ['handle'],
      properties: {
        handle: { type: 'string', description: 'Page handle (e.g. "contact", "about", "faq").' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'create_page',
    description:
      'Create an Online Store page via Shopify Admin GraphQL API (unpublished by default). Requires SHOPIFY_ADMIN_ACCESS_TOKEN (write_content) and approved_by_user: true.',
    inputSchema: {
      type: 'object',
      required: ['title', 'body_html'],
      properties: {
        title: { type: 'string', minLength: 1 },
        body_html: { type: 'string' },
        handle: { type: 'string' },
        is_published: { type: 'boolean', description: 'Defaults to false so content is never published without approval.' },
        approved_by_user: { type: 'boolean' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'update_page',
    description:
      'Update an Online Store page via Shopify Admin GraphQL API. Requires SHOPIFY_ADMIN_ACCESS_TOKEN (write_content) and approved_by_user: true.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string', description: 'Page numeric ID or GID (gid://shopify/Page/...).' },
        title: { type: 'string' },
        body_html: { type: 'string' },
        approved_by_user: { type: 'boolean' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'list_blogs',
    description: 'List Shopify blogs and articles (via Admin GraphQL API when token is set, plus local theme blog templates).',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', minimum: 1, maximum: 25 },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'list_menus',
    description:
      'Inspect Online Store navigation menus and menu items (via Admin GraphQL `menus` query when token is set, plus local theme navigation structure).',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'list_metafield_definitions',
    description:
      'Inspect metafield definitions for a given ownerType (PRODUCT, COLLECTION, SHOP, PAGE, ORDER, CUSTOMER) via Admin GraphQL API.',
    inputSchema: {
      type: 'object',
      properties: {
        owner_type: {
          type: 'string',
          enum: ['PRODUCT', 'PRODUCTVARIANT', 'COLLECTION', 'SHOP', 'PAGE', 'ARTICLE', 'BLOG', 'ORDER', 'CUSTOMER'],
          description: 'Owner resource type (defaults to PRODUCT).',
        },
        limit: { type: 'integer', minimum: 1, maximum: 50 },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_metafields',
    description: 'Read metafield values attached to a specific Shopify resource GID via Admin GraphQL API.',
    inputSchema: {
      type: 'object',
      required: ['owner_gid'],
      properties: {
        owner_gid: {
          type: 'string',
          description: 'Full Shopify GID (e.g. "gid://shopify/Product/123456789").',
        },
        limit: { type: 'integer', minimum: 1, maximum: 50 },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'list_metaobject_definitions',
    description: 'Inspect metaobject definitions via Shopify Admin GraphQL API (requires read_metaobject_definitions scope).',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', minimum: 1, maximum: 50 },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'list_orders',
    description:
      'List recent orders with non-PII summary (order name, created_at, financial_status, fulfillment_status, total_price, line_items) when authorized with read_orders scope.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', minimum: 1, maximum: 25 },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_order',
    description:
      'Read permitted order details and line items by order ID/GID when authorized with read_orders scope (redacts sensitive personal data).',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string', description: 'Order numeric ID or GID (gid://shopify/Order/...).' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'list_customers',
    description:
      'List customer records only when explicitly authorized with read_customers scope and compliant with Shopify Protected Customer Data requirements.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', minimum: 1, maximum: 25 },
      },
      additionalProperties: false,
    },
  },
];

function toGid(type, id) {
  const clean = String(id || '').trim();
  if (clean.startsWith('gid://')) return clean;
  return `gid://shopify/${type}/${clean}`;
}

function listDirFiles(relDir) {
  const full = path.join(WORKSPACE_ROOT, relDir);
  if (!fs.existsSync(full)) return [];
  return fs
    .readdirSync(full, { withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => `${relDir}/${d.name}`);
}

// ============================================================================
// TOOL EXECUTION HANDLERS
// ============================================================================
export async function executeTool(name, args = {}) {
  loadDotEnv();

  switch (name) {
    case 'get_shop_info': {
      let themeSchemaInfo = null;
      try {
        const schemaRaw = fs.readFileSync(path.join(WORKSPACE_ROOT, 'config', 'settings_schema.json'), 'utf8');
        const schemaJson = JSON.parse(schemaRaw);
        themeSchemaInfo = schemaJson.find((s) => s.name === 'theme_info') || null;
      } catch {}

      if (hasAdminToken()) {
        const { data, throttleStatus } = await adminGraphQL(
          `query GetShopInfo {
            shop {
              id
              name
              myshopifyDomain
              primaryDomain { url host }
              currencyCode
              enabledPresentmentCurrencies
              plan { displayName partnerDevelopment }
              ianaTimezone
              weightUnit
            }
          }`,
          {},
          'read_Shop'
        );
        return {
          connection_mode: 'admin_graphql_plus_shopify_cli',
          store_domain: STORE_DOMAIN,
          dev_theme_id: DEV_THEME_ID,
          live_theme_id: LIVE_THEME_ID,
          api_version: API_VERSION,
          shop: data.shop,
          theme_info: themeSchemaInfo,
          rate_limit: throttleStatus,
        };
      }

      // Storefront fallback when SHOPIFY_ADMIN_ACCESS_TOKEN is not yet configured
      let sampleProductsCount = 0;
      try {
        const prodData = await storefrontJson('/products.json?limit=250');
        sampleProductsCount = Array.isArray(prodData.products) ? prodData.products.length : 0;
      } catch {}

      return {
        connection_mode: 'storefront_json_plus_shopify_cli',
        admin_token_configured: false,
        store_domain: STORE_DOMAIN,
        storefront_url: `https://${STORE_DOMAIN}`,
        dev_theme_id: DEV_THEME_ID,
        live_theme_id: LIVE_THEME_ID,
        public_catalog_products_count: sampleProductsCount,
        theme_info: themeSchemaInfo,
        note: 'Shopify CLI theme access and Storefront public catalog read access are active now. Add SHOPIFY_ADMIN_ACCESS_TOKEN to .env to unlock Admin GraphQL mutations and private admin resources.',
      };
    }

    case 'list_themes': {
      try {
        const { stdout } = await runCliCommand('shopify', [
          'theme',
          'list',
          '--store',
          STORE_DOMAIN,
          '--json',
        ]);
        const jsonStart = stdout.indexOf('[');
        const jsonEnd = stdout.lastIndexOf(']');
        const themes = jsonStart !== -1 && jsonEnd !== -1 ? JSON.parse(stdout.slice(jsonStart, jsonEnd + 1)) : [];
        return {
          store_domain: STORE_DOMAIN,
          published_live_theme: themes.find((t) => t.role === 'live') || null,
          development_themes: themes.filter((t) => t.role === 'development'),
          unpublished_themes: themes.filter((t) => t.role !== 'live' && t.role !== 'development'),
          all_themes: themes,
        };
      } catch (cliErr) {
        if (hasAdminToken()) {
          const { data } = await adminGraphQL(
            `query ListThemes {
              themes(first: 25) {
                nodes { id name role createdAt updatedAt processing }
              }
            }`,
            {},
            'read_themes'
          );
          return {
            store_domain: STORE_DOMAIN,
            all_themes: data.themes?.nodes || [],
          };
        }
        throw new Error(`THEME_LIST_ERROR: ${cliErr.message}`);
      }
    }

    case 'get_theme_details': {
      const includeFiles = args.include_file_list !== false;
      const sections = listDirFiles('sections');
      const snippets = listDirFiles('snippets');
      const templates = listDirFiles('templates');
      const layouts = listDirFiles('layout');
      const assets = listDirFiles('assets');
      const configs = listDirFiles('config');
      const locales = listDirFiles('locales');

      let settingsSchema = [];
      try {
        settingsSchema = JSON.parse(
          fs.readFileSync(path.join(WORKSPACE_ROOT, 'config', 'settings_schema.json'), 'utf8')
        );
      } catch {}

      return {
        store_domain: STORE_DOMAIN,
        target_theme_id: args.theme_id || DEV_THEME_ID,
        live_theme_id: LIVE_THEME_ID,
        counts: {
          layouts: layouts.length,
          sections: sections.length,
          snippets: snippets.length,
          templates: templates.length,
          assets: assets.length,
          configs: configs.length,
          locales: locales.length,
        },
        settings_schema_groups: settingsSchema.map((g) => ({
          name: g.name,
          settings_count: Array.isArray(g.settings) ? g.settings.length : 0,
        })),
        files: includeFiles
          ? { layouts, sections, snippets, templates, configs, locales, assets }
          : undefined,
      };
    }

    case 'compare_theme_files': {
      const { stdout: statusOut } = await runCliCommand('git', ['status', '--porcelain']);
      const { stdout: branchOut } = await runCliCommand('git', ['branch', '--show-current']);
      let diffOriginOut = '';
      try {
        const { stdout } = await runCliCommand('git', ['diff', '--name-status', 'origin/main...HEAD']);
        diffOriginOut = stdout;
      } catch {}

      const workingTreeChanges = statusOut
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => ({
          status: line.slice(0, 2).trim(),
          file: line.slice(3).trim(),
        }));

      const commitsAheadChanges = diffOriginOut
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => {
          const [status, file] = line.split(/\t+/);
          return { status, file };
        });

      return {
        store_domain: STORE_DOMAIN,
        development_theme_id: DEV_THEME_ID,
        live_theme_id: LIVE_THEME_ID,
        git_branch: branchOut,
        working_tree_clean: workingTreeChanges.length === 0,
        working_tree_changes: workingTreeChanges,
        unpushed_commits_diff_vs_origin_main: commitsAheadChanges,
      };
    }

    case 'upload_to_development_theme': {
      const onlyFiles = Array.isArray(args.only_files) ? args.only_files.filter(Boolean) : [];
      if (args.approved_by_user !== true) {
        return {
          status: 'APPROVAL_REQUIRED',
          dry_run: true,
          target_store: STORE_DOMAIN,
          target_theme_id: DEV_THEME_ID,
          target_theme_role: 'development (NEVER live theme #158971429036)',
          files_to_upload: onlyFiles.length > 0 ? onlyFiles : 'ALL_LOCAL_THEME_FILES',
          message:
            'Upload was NOT executed because approved_by_user is not true. Present this summary to the user and ask for explicit approval before calling with approved_by_user: true.',
        };
      }

      const cliArgs = ['theme', 'push', '--store', STORE_DOMAIN, '--theme', DEV_THEME_ID, '--json'];
      for (const f of onlyFiles) {
        cliArgs.push('--only', f);
      }
      const { stdout, stderr } = await runCliCommand('shopify', cliArgs, 120000);
      return {
        status: 'UPLOADED_TO_DEVELOPMENT_THEME',
        target_store: STORE_DOMAIN,
        target_theme_id: DEV_THEME_ID,
        uploaded_files: onlyFiles.length > 0 ? onlyFiles : 'ALL_LOCAL_THEME_FILES',
        cli_output: stdout || stderr,
      };
    }

    case 'list_products': {
      const limit = Math.max(1, Math.min(50, Number(args.limit) || 20));
      const page = Math.max(1, Number(args.page) || 1);

      if (hasAdminToken()) {
        const { data, throttleStatus } = await adminGraphQL(
          `query ListProducts($first: Int!, $after: String, $query: String) {
            products(first: $first, after: $after, query: $query) {
              pageInfo { hasNextPage endCursor }
              nodes {
                id
                title
                handle
                vendor
                productType
                status
                tags
                totalInventory
                priceRangeV2 {
                  minVariantPrice { amount currencyCode }
                  maxVariantPrice { amount currencyCode }
                }
                featuredMedia {
                  preview { image { url altText } }
                }
                variants(first: 10) {
                  nodes { id title sku price compareAtPrice inventoryQuantity availableForSale }
                }
              }
            }
          }`,
          { first: limit, after: args.after || null, query: args.query || null },
          'read_products'
        );
        return {
          source: 'shopify_admin_graphql',
          page_info: data.products?.pageInfo,
          count: data.products?.nodes?.length || 0,
          products: data.products?.nodes || [],
          rate_limit: throttleStatus,
        };
      }

      // Storefront JSON fallback (/products.json)
      const data = await storefrontJson(`/products.json?limit=${limit}&page=${page}`);
      let products = Array.isArray(data.products) ? data.products : [];
      if (args.query) {
        const q = String(args.query).toLowerCase();
        products = products.filter(
          (p) =>
            String(p.title || '').toLowerCase().includes(q) ||
            String(p.product_type || '').toLowerCase().includes(q) ||
            String(p.vendor || '').toLowerCase().includes(q)
        );
      }

      return {
        source: 'shopify_storefront_json',
        page,
        limit,
        count: products.length,
        products: products.map((p) => ({
          id: p.id,
          title: p.title,
          handle: p.handle,
          vendor: p.vendor,
          product_type: p.product_type,
          tags: p.tags,
          published_at: p.published_at,
          variants_count: Array.isArray(p.variants) ? p.variants.length : 0,
          variants: (p.variants || []).map((v) => ({
            id: v.id,
            title: v.title,
            sku: v.sku,
            price: v.price,
            compare_at_price: v.compare_at_price,
            available: v.available,
          })),
          featured_image: p.images?.[0]?.src || null,
          images_count: Array.isArray(p.images) ? p.images.length : 0,
        })),
      };
    }

    case 'get_product': {
      if (!args.handle && !args.id) {
        throw new Error('VALIDATION_ERROR: Provide either `handle` or `id` for get_product.');
      }

      if (hasAdminToken() && args.id) {
        const { data } = await adminGraphQL(
          `query GetProductById($id: ID!) {
            product(id: $id) {
              id
              title
              handle
              descriptionHtml
              vendor
              productType
              status
              tags
              totalInventory
              options { id name position values }
              images(first: 20) { nodes { id url altText width height } }
              variants(first: 50) {
                nodes { id title sku price compareAtPrice availableForSale inventoryQuantity }
              }
            }
          }`,
          { id: toGid('Product', args.id) },
          'read_products'
        );
        return { source: 'shopify_admin_graphql', product: data.product };
      }

      if (args.handle) {
        const data = await storefrontJson(`/products/${encodeURIComponent(args.handle)}.json`);
        return { source: 'shopify_storefront_json', product: data.product };
      }

      // Lookup by numeric ID in /products.json
      const all = await storefrontJson('/products.json?limit=250');
      const found = (all.products || []).find((p) => String(p.id) === String(args.id).replace(/\D/g, ''));
      if (!found) {
        throw new Error(`NOT_FOUND: Product ${args.id} not found in public catalog.`);
      }
      return { source: 'shopify_storefront_json', product: found };
    }

    case 'create_product': {
      const proposed = {
        title: args.title,
        descriptionHtml: args.description_html || '',
        vendor: args.vendor || 'Wagmart',
        productType: args.product_type || '',
        tags: Array.isArray(args.tags) ? args.tags : [],
        status: args.status || 'DRAFT',
      };

      if (args.approved_by_user !== true) {
        return {
          status: 'APPROVAL_REQUIRED',
          dry_run: true,
          proposed_operation: 'create_product',
          proposed_input: proposed,
          required_scope: 'write_products',
          admin_token_configured: hasAdminToken(),
          message:
            'Product was NOT created yet. Show this proposed change summary to the user and ask for explicit approval before calling with approved_by_user: true.',
        };
      }

      const { data } = await adminGraphQL(
        `mutation CreateProduct($input: ProductInput!) {
          productCreate(input: $input) {
            product { id title handle status vendor productType tags }
            userErrors { field message }
          }
        }`,
        { input: proposed },
        'write_products'
      );

      if (data.productCreate?.userErrors?.length > 0) {
        throw new Error(`USER_ERRORS: ${JSON.stringify(data.productCreate.userErrors)}`);
      }
      return { status: 'CREATED', product: data.productCreate?.product };
    }

    case 'update_product': {
      const input = { id: toGid('Product', args.id) };
      if (args.title !== undefined) input.title = args.title;
      if (args.description_html !== undefined) input.descriptionHtml = args.description_html;
      if (args.vendor !== undefined) input.vendor = args.vendor;
      if (args.product_type !== undefined) input.productType = args.product_type;
      if (args.tags !== undefined) input.tags = args.tags;

      if (args.approved_by_user !== true) {
        return {
          status: 'APPROVAL_REQUIRED',
          dry_run: true,
          proposed_operation: 'update_product',
          target_product_id: input.id,
          proposed_changes: input,
          required_scope: 'write_products',
          admin_token_configured: hasAdminToken(),
          message:
            'Product was NOT updated yet. Show this proposed change summary to the user and require explicit approval before calling with approved_by_user: true.',
        };
      }

      const { data } = await adminGraphQL(
        `mutation UpdateProduct($input: ProductInput!) {
          productUpdate(input: $input) {
            product { id title handle status vendor productType tags updatedAt }
            userErrors { field message }
          }
        }`,
        { input },
        'write_products'
      );

      if (data.productUpdate?.userErrors?.length > 0) {
        throw new Error(`USER_ERRORS: ${JSON.stringify(data.productUpdate.userErrors)}`);
      }
      return { status: 'UPDATED', product: data.productUpdate?.product };
    }

    case 'list_collections': {
      const limit = Math.max(1, Math.min(50, Number(args.limit) || 25));
      const page = Math.max(1, Number(args.page) || 1);

      if (hasAdminToken()) {
        const { data } = await adminGraphQL(
          `query ListCollections($first: Int!) {
            collections(first: $first) {
              nodes {
                id
                title
                handle
                descriptionHtml
                productsCount { count }
                ruleSet { appliedDisjunctively rules { column relation condition } }
                image { url altText }
              }
            }
          }`,
          { first: limit },
          'read_products'
        );
        return {
          source: 'shopify_admin_graphql',
          count: data.collections?.nodes?.length || 0,
          collections: data.collections?.nodes || [],
        };
      }

      const data = await storefrontJson(`/collections.json?limit=${limit}&page=${page}`);
      const collections = Array.isArray(data.collections) ? data.collections : [];
      return {
        source: 'shopify_storefront_json',
        count: collections.length,
        collections: collections.map((c) => ({
          id: c.id,
          title: c.title,
          handle: c.handle,
          description: c.description,
          products_count: c.products_count,
          published_at: c.published_at,
          updated_at: c.updated_at,
          image: c.image || null,
        })),
      };
    }

    case 'get_collection': {
      const handle = String(args.handle || '').trim();
      const prodLimit = Math.max(1, Math.min(50, Number(args.products_limit) || 20));
      if (!handle) throw new Error('VALIDATION_ERROR: `handle` is required for get_collection.');

      const [colResp, prodsResp] = await Promise.all([
        storefrontJson(`/collections/${encodeURIComponent(handle)}.json`).catch(() => ({ collection: { handle } })),
        storefrontJson(`/collections/${encodeURIComponent(handle)}/products.json?limit=${prodLimit}`),
      ]);

      return {
        source: 'shopify_storefront_json',
        collection: colResp.collection || { handle },
        products_count_returned: (prodsResp.products || []).length,
        products: (prodsResp.products || []).map((p) => ({
          id: p.id,
          title: p.title,
          handle: p.handle,
          product_type: p.product_type,
          vendor: p.vendor,
          price: p.variants?.[0]?.price || null,
          available: p.variants?.some((v) => v.available) ?? true,
        })),
      };
    }

    case 'create_collection': {
      const proposed = {
        title: args.title,
        descriptionHtml: args.description_html || '',
        handle: args.handle || undefined,
      };
      if (args.approved_by_user !== true) {
        return {
          status: 'APPROVAL_REQUIRED',
          dry_run: true,
          proposed_operation: 'create_collection',
          proposed_input: proposed,
          required_scope: 'write_products',
          admin_token_configured: hasAdminToken(),
          message: 'Collection was NOT created. Ask the user for explicit approval first.',
        };
      }

      const { data } = await adminGraphQL(
        `mutation CreateCollection($input: CollectionInput!) {
          collectionCreate(input: $input) {
            collection { id title handle descriptionHtml }
            userErrors { field message }
          }
        }`,
        { input: proposed },
        'write_products'
      );
      if (data.collectionCreate?.userErrors?.length > 0) {
        throw new Error(`USER_ERRORS: ${JSON.stringify(data.collectionCreate.userErrors)}`);
      }
      return { status: 'CREATED', collection: data.collectionCreate?.collection };
    }

    case 'update_collection': {
      const input = { id: toGid('Collection', args.id) };
      if (args.title !== undefined) input.title = args.title;
      if (args.description_html !== undefined) input.descriptionHtml = args.description_html;

      if (args.approved_by_user !== true) {
        return {
          status: 'APPROVAL_REQUIRED',
          dry_run: true,
          proposed_operation: 'update_collection',
          proposed_changes: input,
          required_scope: 'write_products',
          admin_token_configured: hasAdminToken(),
          message: 'Collection was NOT updated. Ask the user for explicit approval first.',
        };
      }

      const { data } = await adminGraphQL(
        `mutation UpdateCollection($input: CollectionInput!) {
          collectionUpdate(input: $input) {
            collection { id title handle descriptionHtml }
            userErrors { field message }
          }
        }`,
        { input },
        'write_products'
      );
      if (data.collectionUpdate?.userErrors?.length > 0) {
        throw new Error(`USER_ERRORS: ${JSON.stringify(data.collectionUpdate.userErrors)}`);
      }
      return { status: 'UPDATED', collection: data.collectionUpdate?.collection };
    }

    case 'list_pages': {
      const limit = Math.max(1, Math.min(50, Number(args.limit) || 25));
      if (hasAdminToken()) {
        const { data } = await adminGraphQL(
          `query ListPages($first: Int!) {
            pages(first: $first) {
              nodes { id title handle isPublished publishedAt updatedAt templateSuffix }
            }
          }`,
          { first: limit },
          'read_content'
        );
        return {
          source: 'shopify_admin_graphql',
          count: data.pages?.nodes?.length || 0,
          pages: data.pages?.nodes || [],
        };
      }

      const data = await storefrontJson(`/pages.json?limit=${limit}`);
      const pages = Array.isArray(data.pages) ? data.pages : [];
      const pageTemplates = listDirFiles('templates').filter((f) => f.includes('page.'));
      return {
        source: 'shopify_storefront_json_and_theme_templates',
        count: pages.length,
        pages,
        local_page_templates: pageTemplates,
      };
    }

    case 'get_page': {
      const handle = String(args.handle || '').trim();
      if (!handle) throw new Error('VALIDATION_ERROR: `handle` is required for get_page.');
      try {
        const data = await storefrontJson(`/pages/${encodeURIComponent(handle)}.json`);
        return { source: 'shopify_storefront_json', page: data.page };
      } catch (err) {
        const tplPath = path.join(WORKSPACE_ROOT, 'templates', `page.${handle}.json`);
        if (fs.existsSync(tplPath)) {
          return {
            source: 'local_theme_template',
            handle,
            template_file: `templates/page.${handle}.json`,
            template_config: JSON.parse(fs.readFileSync(tplPath, 'utf8')),
          };
        }
        throw err;
      }
    }

    case 'create_page': {
      const input = {
        title: args.title,
        body: args.body_html || '',
        handle: args.handle || undefined,
        isPublished: args.is_published === true,
      };
      if (args.approved_by_user !== true) {
        return {
          status: 'APPROVAL_REQUIRED',
          dry_run: true,
          proposed_operation: 'create_page',
          proposed_input: input,
          required_scope: 'write_content',
          admin_token_configured: hasAdminToken(),
          message: 'Page was NOT created. Present this proposed summary and ask for explicit approval first.',
        };
      }

      const { data } = await adminGraphQL(
        `mutation CreatePage($page: PageCreateInput!) {
          pageCreate(page: $page) {
            page { id title handle isPublished }
            userErrors { field message }
          }
        }`,
        { page: input },
        'write_content'
      );
      if (data.pageCreate?.userErrors?.length > 0) {
        throw new Error(`USER_ERRORS: ${JSON.stringify(data.pageCreate.userErrors)}`);
      }
      return { status: 'CREATED', page: data.pageCreate?.page };
    }

    case 'update_page': {
      const id = toGid('Page', args.id);
      const pageInput = {};
      if (args.title !== undefined) pageInput.title = args.title;
      if (args.body_html !== undefined) pageInput.body = args.body_html;

      if (args.approved_by_user !== true) {
        return {
          status: 'APPROVAL_REQUIRED',
          dry_run: true,
          proposed_operation: 'update_page',
          target_page_id: id,
          proposed_changes: pageInput,
          required_scope: 'write_content',
          admin_token_configured: hasAdminToken(),
          message: 'Page was NOT updated. Present this proposed summary and ask for explicit approval first.',
        };
      }

      const { data } = await adminGraphQL(
        `mutation UpdatePage($id: ID!, $page: PageUpdateInput!) {
          pageUpdate(id: $id, page: $page) {
            page { id title handle isPublished updatedAt }
            userErrors { field message }
          }
        }`,
        { id, page: pageInput },
        'write_content'
      );
      if (data.pageUpdate?.userErrors?.length > 0) {
        throw new Error(`USER_ERRORS: ${JSON.stringify(data.pageUpdate.userErrors)}`);
      }
      return { status: 'UPDATED', page: data.pageUpdate?.page };
    }

    case 'list_blogs': {
      const limit = Math.max(1, Math.min(25, Number(args.limit) || 10));
      if (hasAdminToken()) {
        const { data } = await adminGraphQL(
          `query ListBlogs($first: Int!) {
            blogs(first: $first) {
              nodes {
                id
                title
                handle
                articles(first: 10) {
                  nodes { id title handle publishedAt author { name } }
                }
              }
            }
          }`,
          { first: limit },
          'read_content'
        );
        return { source: 'shopify_admin_graphql', blogs: data.blogs?.nodes || [] };
      }

      return {
        source: 'local_theme_inspection',
        admin_token_configured: false,
        required_scope_for_live_admin_blogs: 'read_content',
        theme_blog_files: [
          'sections/main-blog.liquid',
          'sections/main-article.liquid',
          'sections/blog-section.liquid',
          'snippets/article-page-content.liquid',
          'templates/blog.json',
          'templates/article.json',
        ].filter((f) => fs.existsSync(path.join(WORKSPACE_ROOT, f))),
      };
    }

    case 'list_menus': {
      if (hasAdminToken()) {
        const { data } = await adminGraphQL(
          `query ListMenus {
            menus(first: 20) {
              nodes {
                id
                title
                handle
                items {
                  id
                  title
                  url
                  type
                  items { id title url type }
                }
              }
            }
          }`,
          {},
          'read_online_store_navigation'
        );
        return { source: 'shopify_admin_graphql', menus: data.menus?.nodes || [] };
      }

      return {
        source: 'local_theme_navigation_inspection',
        admin_token_configured: false,
        required_scope_for_admin_menus_api: 'read_online_store_navigation',
        theme_navigation_files: ['sections/header.liquid', 'sections/footer.liquid', 'snippets/header-bestsellers.liquid'],
        note: 'Add SHOPIFY_ADMIN_ACCESS_TOKEN with read_online_store_navigation scope in .env to read Shopify Admin Navigation Menus via GraphQL.',
      };
    }

    case 'list_metafield_definitions': {
      const ownerType = args.owner_type || 'PRODUCT';
      const limit = Math.max(1, Math.min(50, Number(args.limit) || 25));
      const { data } = await adminGraphQL(
        `query ListMetafieldDefinitions($ownerType: MetafieldOwnerType!, $first: Int!) {
          metafieldDefinitions(ownerType: $ownerType, first: $first) {
            nodes { id name namespace key description type { name } ownerType }
          }
        }`,
        { ownerType, first: limit },
        'read_products / read_content'
      );
      return {
        owner_type: ownerType,
        definitions: data.metafieldDefinitions?.nodes || [],
      };
    }

    case 'get_metafields': {
      const limit = Math.max(1, Math.min(50, Number(args.limit) || 25));
      const { data } = await adminGraphQL(
        `query GetOwnerMetafields($id: ID!, $first: Int!) {
          node(id: $id) {
            id
            ... on HasMetafields {
              metafields(first: $first) {
                nodes { id namespace key value type updatedAt }
              }
            }
          }
        }`,
        { id: args.owner_gid, first: limit },
        'read_products / read_content'
      );
      return {
        owner_gid: args.owner_gid,
        metafields: data.node?.metafields?.nodes || [],
      };
    }

    case 'list_metaobject_definitions': {
      const limit = Math.max(1, Math.min(50, Number(args.limit) || 25));
      const { data } = await adminGraphQL(
        `query ListMetaobjectDefinitions($first: Int!) {
          metaobjectDefinitions(first: $first) {
            nodes {
              id
              name
              type
              fieldDefinitions { key name type { name } required }
            }
          }
        }`,
        { first: limit },
        'read_metaobject_definitions'
      );
      return {
        definitions: data.metaobjectDefinitions?.nodes || [],
      };
    }

    case 'list_orders': {
      const limit = Math.max(1, Math.min(25, Number(args.limit) || 10));
      const { data } = await adminGraphQL(
        `query ListOrders($first: Int!) {
          orders(first: $first, reverse: true) {
            nodes {
              id
              name
              createdAt
              displayFinancialStatus
              displayFulfillmentStatus
              totalPriceSet { shopMoney { amount currencyCode } }
              lineItems(first: 10) {
                nodes { title quantity sku }
              }
            }
          }
        }`,
        { first: limit },
        'read_orders'
      );
      return {
        privacy_notice: 'Customer personal data is omitted in accordance with least-privilege & protected customer data rules.',
        orders: data.orders?.nodes || [],
      };
    }

    case 'get_order': {
      const { data } = await adminGraphQL(
        `query GetOrder($id: ID!) {
          order(id: $id) {
            id
            name
            createdAt
            displayFinancialStatus
            displayFulfillmentStatus
            subtotalPriceSet { shopMoney { amount currencyCode } }
            totalShippingPriceSet { shopMoney { amount currencyCode } }
            totalTaxSet { shopMoney { amount currencyCode } }
            totalPriceSet { shopMoney { amount currencyCode } }
            lineItems(first: 50) {
              nodes {
                id
                title
                quantity
                sku
                originalUnitPriceSet { shopMoney { amount currencyCode } }
              }
            }
          }
        }`,
        { id: toGid('Order', args.id) },
        'read_orders'
      );
      return {
        privacy_notice: 'Customer PII is redacted by default.',
        order: data.order,
      };
    }

    case 'list_customers': {
      const limit = Math.max(1, Math.min(25, Number(args.limit) || 10));
      const { data } = await adminGraphQL(
        `query ListCustomers($first: Int!) {
          customers(first: $first) {
            nodes {
              id
              createdAt
              numberOfOrders
              amountSpent { amount currencyCode }
              state
              tags
            }
          }
        }`,
        { first: limit },
        'read_customers'
      );
      return {
        privacy_notice: 'Direct personal identifiers (email/phone/address) are excluded to respect Shopify Protected Customer Data policies.',
        customers: data.customers?.nodes || [],
      };
    }

    default:
      throw new Error(`UNKNOWN_TOOL: Tool "${name}" is not supported.`);
  }
}

// ============================================================================
// JSON-RPC 2.0 STDIO MCP SERVER LOOP
// ============================================================================
function sendJsonRpc(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

async function handleJsonRpcMessage(msg) {
  if (!msg || typeof msg !== 'object') return;
  const { id, method, params } = msg;

  try {
    if (method === 'initialize') {
      const clientVersion = params?.protocolVersion || '2024-11-05';
      sendJsonRpc({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: clientVersion,
          capabilities: {
            tools: { listChanged: false },
          },
          serverInfo: {
            name: 'wagmart-shopify-store',
            version: '1.0.0',
          },
        },
      });
      return;
    }

    if (method === 'notifications/initialized' || method === 'CancelRequest') {
      return;
    }

    if (method === 'ping') {
      sendJsonRpc({ jsonrpc: '2.0', id, result: {} });
      return;
    }

    if (method === 'tools/list') {
      sendJsonRpc({
        jsonrpc: '2.0',
        id,
        result: {
          tools: TOOLS,
        },
      });
      return;
    }

    if (method === 'tools/call') {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      try {
        const output = await executeTool(toolName, toolArgs);
        sendJsonRpc({
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(output, null, 2),
              },
            ],
            isError: false,
          },
        });
      } catch (toolErr) {
        sendJsonRpc({
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    error: true,
                    message: toolErr.message || String(toolErr),
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          },
        });
      }
      return;
    }

    if (id !== undefined) {
      sendJsonRpc({
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: `Method not found: ${method}`,
        },
      });
    }
  } catch (err) {
    if (id !== undefined) {
      sendJsonRpc({
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: err.message || 'Internal MCP server error',
        },
      });
    }
  }
}

// Start Stdio listener when executed directly
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const rl = readline.createInterface({
    input: process.stdin,
    terminal: false,
  });
  rl.on('line', (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      const parsed = JSON.parse(trimmed);
      handleJsonRpcMessage(parsed);
    } catch {
      // Ignore malformed lines
    }
  });
}
