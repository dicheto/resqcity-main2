# I18N Audit Checklist

## Completed in this pass
- `src/app/auth/login/page.tsx`
- `src/app/auth/register/page.tsx`
- `src/app/auth/forgot-password/page.tsx`
- `src/app/auth/reset-password/page.tsx`
- `src/app/auth/verify-email/page.tsx`
- `src/i18n/index.tsx` (added auth and MFA keys for `bg`, `en`, `ar`)

## High-priority remaining pages with hardcoded or inline locale text
- `src/app/dashboard/page.tsx`
- `src/app/dashboard/new-report/page.tsx`
- `src/app/dashboard/company-search/page.tsx`
- `src/app/dashboard/security/page.tsx`
- `src/app/dashboard/reports/page.tsx`
- `src/app/dashboard/reports/[id]/page.tsx`
- `src/app/admin/page.tsx`
- `src/app/admin/reports/page.tsx`
- `src/app/admin/dispatch/page.tsx`
- `src/app/admin/responsible-persons/page.tsx`
- `src/app/admin/institutions/page.tsx`
- `src/app/admin/heatmap/page.tsx`
- `src/app/institutions/auth/login/page.tsx`
- `src/app/institutions/page.tsx`
- `src/app/my-incidents/page.tsx`
- `src/app/signals/page.tsx`
- `src/app/signals/[id]/page.tsx`

## Remaining components with user-visible text
- `src/components/HomePage.tsx`
- `src/components/IncidentReportForm.tsx`
- `src/components/LocationPicker.tsx`
- `src/components/VehicleManagement.tsx`
- `src/components/SignalRoutingComponent.tsx`

## Rule for migration
- Use only `t('key')` for visible UI strings.
- Avoid local `locale === 'bg' ? ...` and local `tr(bg, en, ar)` inside pages/components.
- Add missing keys centrally in `src/i18n/index.tsx`.
