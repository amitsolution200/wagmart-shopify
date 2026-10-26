---
trigger: always_on
---

# Wagmart Shopify Store & Theme Development Workflow Rules

- **Connected Store:** `gk2scz-zu.myshopify.com`
- **Development Theme ID:** `#159000527020` (`Development (4c28a4-Dishant)`)
- **Published Live Theme ID:** `#158971429036` (`wagmart`)

## Strict Safety Rules

1. **Never publish a theme** (`shopify theme publish`) or push directly to the live theme (`#158971429036`) without explicit user approval.
2. **Never upload theme changes** (`shopify theme push` or `upload_to_development_theme`), create/update products, collections, pages, or menus without first presenting a diff/change summary and receiving explicit user approval (`approved_by_user: true`).
3. **Never change prices, inventory, or product status** without explicit approval.
4. **Never expose or log secrets** (`SHOPIFY_ADMIN_ACCESS_TOKEN`, `.env`, customer personal data) in terminal output, code, or git commits.
