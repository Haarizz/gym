package com.company.project.config;

import com.company.project.dto.ProductRequestDTO;
import com.company.project.entities.AccountHead;
import com.company.project.entities.Branch;
import com.company.project.entities.Gym;
import com.company.project.entities.Permission;
import com.company.project.entities.ProductCategory;
import com.company.project.entities.Role;
import com.company.project.entities.RolePermission;
import com.company.project.entities.User;
import com.company.project.entities.UserRole;
import com.company.project.entities.Warehouse;
import com.company.project.repositories.AccountHeadRepository;
import com.company.project.repositories.PermissionRepository;
import com.company.project.repositories.ProductCategoryRepository;
import com.company.project.repositories.ProductRepository;
import com.company.project.repositories.BranchRepository;
import com.company.project.repositories.GymRepository;
import com.company.project.repositories.RolePermissionRepository;
import com.company.project.repositories.RoleRepository;
import com.company.project.repositories.UserRepository;
import com.company.project.repositories.UserRoleRepository;
import com.company.project.repositories.WarehouseRepository;
import com.company.project.services.AddonPlanService;
import com.company.project.services.FiscalYearService;
import com.company.project.services.ProductService;
import com.company.project.services.SupplierBillService;
import com.company.project.services.SupplierService;
import com.company.project.services.WarehouseService;
import com.company.project.services.ProductCategoryService;
import com.company.project.security.BranchContextHolder;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Map;

@Component
public class DataInitializer implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final PasswordEncoder passwordEncoder;
    private final WarehouseService warehouseService;
    private final ProductCategoryService productCategoryService;
    private final SupplierService supplierService;
    private final ProductRepository productRepository;
    private final ProductCategoryRepository productCategoryRepository;
    private final WarehouseRepository warehouseRepository;
    private final ProductService productService;
    private final SupplierBillService supplierBillService;
    private final AccountHeadRepository accountHeadRepository;
    private final AddonPlanService addonPlanService;
    private final FiscalYearService fiscalYearService;
    private final PermissionRepository permissionRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final BranchRepository branchRepository;
    private final GymRepository gymRepository;

    public DataInitializer(
            RoleRepository roleRepository,
            UserRepository userRepository,
            UserRoleRepository userRoleRepository,
            PasswordEncoder passwordEncoder,
            WarehouseService warehouseService,
            ProductCategoryService productCategoryService,
            SupplierService supplierService,
            ProductRepository productRepository,
            ProductCategoryRepository productCategoryRepository,
            WarehouseRepository warehouseRepository,
            ProductService productService,
            SupplierBillService supplierBillService,
            AccountHeadRepository accountHeadRepository,
            AddonPlanService addonPlanService,
            FiscalYearService fiscalYearService,
            PermissionRepository permissionRepository,
            RolePermissionRepository rolePermissionRepository,
            BranchRepository branchRepository,
            GymRepository gymRepository
    ) {
        this.roleRepository = roleRepository;
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.passwordEncoder = passwordEncoder;
        this.warehouseService = warehouseService;
        this.productCategoryService = productCategoryService;
        this.supplierService = supplierService;
        this.productRepository = productRepository;
        this.productCategoryRepository = productCategoryRepository;
        this.warehouseRepository = warehouseRepository;
        this.productService = productService;
        this.supplierBillService = supplierBillService;
        this.accountHeadRepository = accountHeadRepository;
        this.addonPlanService = addonPlanService;
        this.fiscalYearService = fiscalYearService;
        this.permissionRepository = permissionRepository;
        this.rolePermissionRepository = rolePermissionRepository;
        this.branchRepository = branchRepository;
        this.gymRepository = gymRepository;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        // Seed Roles
        // GYMBIOS_ADMIN is the platform owner (us) — bypasses all permission checks,
        // see RoleService.ADMIN_ROLE_NAME. ADMIN is a distinct, ordinary (non-system)
        // role reserved for gym owners: scoped to their own gym only, no bypass powers.
        List<String> rolesToSeed = List.of(
                "GYMBIOS_ADMIN", "ADMIN", "MANAGER", "USER", "ACCOUNTANT", "HR", "MEMBER", "STAFF",
                "RECEPTIONIST", "TRAINER");
        for (String roleName : rolesToSeed) {
            if (roleRepository.findByRoleName(roleName).isEmpty()) {
                Role role = new Role();
                role.setRoleName(roleName);
                roleRepository.save(role);
            }
        }

        // Seed a default Gym + Branch on a genuinely fresh database. This data used to
        // come from Flyway migrations V18/V24 ("Main Branch"/"Main Gym", ON CONFLICT DO
        // NOTHING) — but local dev deliberately runs with spring.flyway.enabled=false
        // (see application-local.properties: Hibernate's ddl-auto=update owns schema
        // creation locally, since the legacy migration chain assumes tables Hibernate
        // itself originally created). That means those INSERT-only migrations never run
        // locally at all, so a teammate's first-ever boot against a brand-new empty
        // database got no branch/gym row — confirmed live: this crashed startup entirely
        // the moment DataInitializer.seedSampleProducts tried to create a product with
        // no branch context to resolve. Idempotent (skips if a default branch already
        // exists), so this is a no-op on GYMBIOS's own already-seeded database.
        Branch defaultBranch = branchRepository.findByIsDefaultTrue().orElse(null);
        if (defaultBranch == null) {
            defaultBranch = new Branch("Main Branch", "MAIN");
            defaultBranch.setStatus("ACTIVE");
            defaultBranch.setDefault(true);
            defaultBranch = branchRepository.save(defaultBranch);
        }
        if (gymRepository.findByIsDefaultTrue().isEmpty() && !gymRepository.existsBySlug("main-gym")) {
            Gym defaultGym = new Gym("Main Gym", "main-gym");
            defaultGym.setStatus("ACTIVE");
            defaultGym.setDefault(true);
            gymRepository.save(defaultGym);
        }

        // Every seed step below creates BranchAware rows (categories, warehouses,
        // account heads, products, ...) — BranchSecurityListener's @PrePersist hook
        // auto-stamps branch_id from BranchContextHolder when it's set, which is how
        // every other branch-scoped row in this app gets its branch_id. Set once, for
        // the rest of this boot-time seeding, so everything lands on the real default
        // branch consistently — rather than at NULL, which is invisible to Hibernate's
        // branchFilter (a bare SQL "branch_id = :branchId" excludes NULL rows) the
        // moment anything later in this same transaction enables that filter. Confirmed
        // live: setting the context only inside seedSampleProducts (this fix's first
        // draft) left the categories seeded earlier by initDefaultCategories() at
        // branch_id=NULL, so resolveCategoryId's own lookup couldn't see them once the
        // filter turned on, and tried to insert duplicates of every one.
        BranchContextHolder.setActiveBranchId(defaultBranch.getId());
        try {
            // Administration module: seed the module x action permission catalog and each
            // role's default permission set (see PermissionCatalog / RoleService).
            seedPermissionsAndRolePermissions();

            // Seed Gymbios (platform-owner) Admin User — the account every fresh clone/
            // fresh database boots with, so a teammate can log in as super admin and
            // create gyms immediately. Username/email deliberately match the account
            // actually used in local dev (admin / admin@gymbios.com), not the older
            // gymbios_admin@gymbios.com placeholder this used to seed.
            if (!userRepository.existsByEmail("admin@gymbios.com")) {
                User admin = new User();
                admin.setUsername("admin");
                admin.setEmail("admin@gymbios.com");
                admin.setPasswordHash(passwordEncoder.encode("admin123"));
                admin.setEnabled(true);
                admin.setUserRoles(new HashSet<>());
                admin = userRepository.save(admin);

                Role adminRole = roleRepository.findByRoleName("GYMBIOS_ADMIN")
                        .orElseThrow(() -> new RuntimeException("Gymbios admin role not found"));

                UserRole userRole = new UserRole(null, admin, adminRole);
                userRoleRepository.save(userRole);
            }

            // Seed default Warehouses
            warehouseService.initDefaultWarehouses();

            // Seed default Product Categories
            productCategoryService.initDefaultCategories();

            // Seed default Suppliers
            supplierService.initDefaultSuppliers();

            // Seed the full Chart of Accounts (see FinancialEventService's account-code
            // table) — previously only the codes some transaction had already touched
            // existed (auto-bootstrapped lazily in FinancialEventService.updateAccountBalance),
            // so e.g. Accounts Receivable/Fixed Assets/Salary Expense were invisible in
            // the Chart of Accounts screen until their first posting.
            seedDefaultAccountHeads();

            // Seed the current calendar year as an OPEN FiscalYear with 12 OPEN monthly
            // FiscalPeriods, so period-lock enforcement (FiscalPeriodService.assertPeriodOpen)
            // has something to check against out of the box. Idempotent — skips if the
            // year already exists.
            fiscalYearService.ensureCalendarYearSeeded(LocalDate.now().getYear());

            // Seed the Add-on Plan catalog ("Purchase An Add-On" screen) — previously
            // a hardcoded array in member-addons.tsx, now an editable Chart-of-Accounts-
            // style catalog the admin can create/edit/delete from the UI.
            addonPlanService.initDefaultAddonPlans();

            // Salary Payments & Advances are now user-generated only (no seed data).

            // Seed sample POS-ready products (idempotent: skips any name already present)
            seedSampleProducts();

            // Self-heal: apply stock-in for any CONFIRMED supplier bill that predates the purchase
            // form's warehouse field (idempotent — only touches bills still missing a warehouseId).
            supplierBillService.backfillMissingWarehouseStock();
        } finally {
            BranchContextHolder.clear();
        }
    }

    // ── Administration: permission catalog + default role permissions ─────────────

    /**
     * Idempotent: only inserts catalog rows that don't exist yet, and only seeds a
     * role's default permission set the first time (a role with any existing
     * role_permissions rows is left alone, so an admin's edits via the Roles &
     * Permissions UI are never overwritten on the next app restart). GYMBIOS_ADMIN is
     * deliberately not seeded here — it always evaluates to "all permissions" via
     * RoleService.getEffectivePermissionKeys(), regardless of stored rows. ADMIN (the
     * gym-owner role) is also left unseeded here — its permission set is configured
     * explicitly per gym when a gym owner's login is provisioned, not defaulted globally.
     */
    private void seedPermissionsAndRolePermissions() {
        for (Map.Entry<String, List<String>> entry : PermissionCatalog.MODULES.entrySet()) {
            String module = entry.getKey();
            for (String action : entry.getValue()) {
                String key = PermissionCatalog.key(module, action);
                if (permissionRepository.findByPermissionKey(key).isEmpty()) {
                    permissionRepository.save(new Permission(key, module, action, module + " - " + action));
                }
            }
        }

        // These roles are wired into existing app logic (SecurityConfig role-based rules,
        // the staff-login flow's default role) — protect them from deletion regardless of
        // whether their permission set has been customized. ADMIN (gym owners) is
        // deliberately excluded — it must stay editable/deletable per gym, unlike the
        // platform-owner GYMBIOS_ADMIN role.
        for (String name : DefaultRolePermissions.SYSTEM_ROLE_NAMES) {
            roleRepository.findByRoleName(name).ifPresent(role -> {
                if (!role.isSystem()) {
                    role.setSystem(true);
                    roleRepository.save(role);
                }
            });
        }

        // Base grant sets — see DefaultRolePermissions for the actual data (shared with
        // TenantProvisioningService's per-tenant seeding, Phase 3).
        DefaultRolePermissions.GRANTS.forEach(this::seedDefaultRolePermissions);

        // Backfill new sub-module permissions for existing installs
        for (String key : List.of(
                "SALES_PURCHASES_VIEW", "SALES_PURCHASES_CREATE", "SALES_PURCHASES_EDIT", "SALES_PURCHASES_EXPORT",
                "FINANCIALS_VIEW", "FINANCIALS_CREATE", "FINANCIALS_EDIT", "FINANCIALS_EXPORT", "FINANCIALS_APPROVE",
                "GYMOS_VIEW", "BIOS_VIEW",
                "PROMOTIONS_CAMPAIGN_VIEW", "PROMOTIONS_CAMPAIGN_CREATE", "PROMOTIONS_CAMPAIGN_EDIT", "PROMOTIONS_CAMPAIGN_EXPORT",
                "REFERRALS_VIEW", "REFERRALS_CREATE", "REFERRALS_EDIT", "REFERRALS_EXPORT",
                "LEADS_VIEW", "LEADS_CREATE", "LEADS_EDIT", "LEADS_EXPORT",
                "FOLLOW_UPS_VIEW", "FOLLOW_UPS_CREATE", "FOLLOW_UPS_EDIT", "FOLLOW_UPS_EXPORT",
                "MESSAGING_VIEW", "MESSAGING_CREATE", "MESSAGING_EDIT", "MESSAGING_EXPORT",
                "AUTOMATIONS_VIEW", "AUTOMATIONS_CREATE", "AUTOMATIONS_EDIT", "AUTOMATIONS_EXPORT",
                "POST_WORKOUT_CHECKIN_VIEW", "POST_WORKOUT_CHECKIN_CREATE", "POST_WORKOUT_CHECKIN_EDIT", "POST_WORKOUT_CHECKIN_EXPORT",
                "MEMBER_CONNECT_REPORTS_VIEW", "MEMBER_CONNECT_REPORTS_EXPORT",
                "MEMBER_CONNECT_ANALYTICS_VIEW", "MEMBER_CONNECT_ANALYTICS_EXPORT",
                "CHECK_IN_VIEW", "CHECK_IN_CREATE", "CHECK_IN_EDIT", "CHECK_IN_EXPORT",
                "TRAINING_STREAMS_VIEW", "TRAINING_STREAMS_CREATE", "TRAINING_STREAMS_EDIT", "TRAINING_STREAMS_EXPORT",
                "COMMUNITY_REPORTS_VIEW", "COMMUNITY_REPORTS_EXPORT",
                "COMMUNITY_ANALYTICS_VIEW", "COMMUNITY_ANALYTICS_EXPORT",
                "TRAININGS_CLASSES_VIEW", "TRAININGS_CLASSES_CREATE", "TRAININGS_CLASSES_EDIT", "TRAININGS_CLASSES_EXPORT",
                "BOOKINGS_VIEW", "BOOKINGS_CREATE", "BOOKINGS_EDIT", "BOOKINGS_EXPORT",
                "SALARY_PAYMENTS_VIEW", "SALARY_PAYMENTS_CREATE", "SALARY_PAYMENTS_EDIT", "SALARY_PAYMENTS_EXPORT", "SALARY_PAYMENTS_APPROVE",
                "SALARY_ADVANCES_VIEW", "SALARY_ADVANCES_CREATE", "SALARY_ADVANCES_EDIT", "SALARY_ADVANCES_EXPORT", "SALARY_ADVANCES_APPROVE",
                "PAYROLL_REPORTS_VIEW", "PAYROLL_REPORTS_EXPORT",
                "PAYROLL_ANALYTICS_VIEW", "PAYROLL_ANALYTICS_EXPORT",
                "POINT_OF_SALE_VIEW", "POINT_OF_SALE_CREATE", "POINT_OF_SALE_EDIT", "POINT_OF_SALE_EXPORT",
                "PRODUCTS_VIEW", "PRODUCTS_CREATE", "PRODUCTS_EDIT", "PRODUCTS_EXPORT",
                "CATEGORY_VIEW", "CATEGORY_CREATE", "CATEGORY_EDIT", "CATEGORY_EXPORT",
                "PURCHASE_ORDER_VIEW", "PURCHASE_ORDER_CREATE", "PURCHASE_ORDER_EDIT", "PURCHASE_ORDER_EXPORT",
                "PURCHASE_VIEW", "PURCHASE_CREATE", "PURCHASE_EDIT", "PURCHASE_EXPORT",
                "WASTAGE_RETURNS_VIEW", "WASTAGE_RETURNS_CREATE", "WASTAGE_RETURNS_EDIT", "WASTAGE_RETURNS_EXPORT",
                "PRODUCTION_RECIPE_VIEW", "PRODUCTION_RECIPE_CREATE", "PRODUCTION_RECIPE_EDIT", "PRODUCTION_RECIPE_EXPORT",
                "SALES_REPORTS_VIEW", "SALES_REPORTS_EXPORT",
                "SALES_ANALYTICS_VIEW", "SALES_ANALYTICS_EXPORT",
                "LEDGERS_VIEW", "LEDGERS_CREATE", "LEDGERS_EDIT", "LEDGERS_EXPORT",
                "RECEIPT_VOUCHER_VIEW", "RECEIPT_VOUCHER_CREATE", "RECEIPT_VOUCHER_EDIT", "RECEIPT_VOUCHER_EXPORT",
                "JOURNAL_VOUCHER_VIEW", "JOURNAL_VOUCHER_CREATE", "JOURNAL_VOUCHER_EDIT", "JOURNAL_VOUCHER_EXPORT",
                "PAYMENT_VOUCHER_VIEW", "PAYMENT_VOUCHER_CREATE", "PAYMENT_VOUCHER_EDIT", "PAYMENT_VOUCHER_EXPORT", "PAYMENT_VOUCHER_APPROVE",
                "BANK_RECONCILIATIONS_VIEW", "BANK_RECONCILIATIONS_CREATE", "BANK_RECONCILIATIONS_EDIT", "BANK_RECONCILIATIONS_EXPORT",
                "EXPENSES_VIEW", "EXPENSES_CREATE", "EXPENSES_EDIT", "EXPENSES_EXPORT",
                "TAX_COMPLIANCE_VIEW", "TAX_COMPLIANCE_CREATE", "TAX_COMPLIANCE_EDIT", "TAX_COMPLIANCE_EXPORT",
                "FISCAL_PERIODS_VIEW", "FISCAL_PERIODS_CREATE", "FISCAL_PERIODS_EDIT", "FISCAL_PERIODS_EXPORT",
                "FINANCIAL_REPORTS_VIEW", "FINANCIAL_REPORTS_EXPORT",
                "FINANCIAL_ANALYTICS_VIEW", "FINANCIAL_ANALYTICS_EXPORT"
        )) {
            grantPermissionIfMissing("MANAGER", key);
        }

        for (String key : List.of(
                "FINANCIALS_VIEW", "FINANCIALS_CREATE", "FINANCIALS_EDIT", "FINANCIALS_EXPORT", "FINANCIALS_APPROVE",
                "SALES_PURCHASES_VIEW",
                "LEDGERS_VIEW", "LEDGERS_CREATE", "LEDGERS_EDIT", "LEDGERS_EXPORT",
                "RECEIPT_VOUCHER_VIEW", "RECEIPT_VOUCHER_CREATE", "RECEIPT_VOUCHER_EDIT", "RECEIPT_VOUCHER_EXPORT",
                "JOURNAL_VOUCHER_VIEW", "JOURNAL_VOUCHER_CREATE", "JOURNAL_VOUCHER_EDIT", "JOURNAL_VOUCHER_EXPORT",
                "PAYMENT_VOUCHER_VIEW", "PAYMENT_VOUCHER_CREATE", "PAYMENT_VOUCHER_EDIT", "PAYMENT_VOUCHER_EXPORT", "PAYMENT_VOUCHER_APPROVE",
                "BANK_RECONCILIATIONS_VIEW", "BANK_RECONCILIATIONS_CREATE", "BANK_RECONCILIATIONS_EDIT", "BANK_RECONCILIATIONS_EXPORT",
                "EXPENSES_VIEW", "EXPENSES_CREATE", "EXPENSES_EDIT", "EXPENSES_EXPORT",
                "TAX_COMPLIANCE_VIEW", "TAX_COMPLIANCE_CREATE", "TAX_COMPLIANCE_EDIT", "TAX_COMPLIANCE_EXPORT",
                "FISCAL_PERIODS_VIEW", "FISCAL_PERIODS_CREATE", "FISCAL_PERIODS_EDIT", "FISCAL_PERIODS_EXPORT",
                "FINANCIAL_REPORTS_VIEW", "FINANCIAL_REPORTS_EXPORT",
                "FINANCIAL_ANALYTICS_VIEW", "FINANCIAL_ANALYTICS_EXPORT",
                "SALES_REPORTS_VIEW", "SALES_REPORTS_EXPORT"
        )) {
            grantPermissionIfMissing("ACCOUNTANT", key);
        }

        for (String key : List.of(
                "TRAININGS_CLASSES_VIEW", "TRAININGS_CLASSES_CREATE", "TRAININGS_CLASSES_EDIT", "TRAININGS_CLASSES_EXPORT",
                "SALARY_PAYMENTS_VIEW", "SALARY_PAYMENTS_CREATE", "SALARY_PAYMENTS_EDIT", "SALARY_PAYMENTS_EXPORT",
                "SALARY_ADVANCES_VIEW", "SALARY_ADVANCES_CREATE", "SALARY_ADVANCES_EDIT", "SALARY_ADVANCES_EXPORT",
                "PAYROLL_REPORTS_VIEW", "PAYROLL_REPORTS_EXPORT",
                "PAYROLL_ANALYTICS_VIEW", "PAYROLL_ANALYTICS_EXPORT"
        )) {
            grantPermissionIfMissing("HR", key);
        }

        for (String key : List.of(
                "CHECK_IN_VIEW", "CHECK_IN_CREATE"
        )) {
            grantPermissionIfMissing("TRAINER", key);
        }
    }

    private void seedDefaultRolePermissions(String roleName, List<String> permissionKeys) {
        Role role = roleRepository.findByRoleName(roleName).orElse(null);
        if (role == null) return;
        if (rolePermissionRepository.countByRoleId(role.getId()) > 0) return;
        for (String key : permissionKeys) {
            permissionRepository.findByPermissionKey(key).ifPresent(permission ->
                    rolePermissionRepository.save(new RolePermission(role, permission)));
        }
    }

    private void grantPermissionIfMissing(String roleName, String permissionKey) {
        Role role = roleRepository.findByRoleName(roleName).orElse(null);
        if (role == null) return;
        Permission permission = permissionRepository.findByPermissionKey(permissionKey).orElse(null);
        if (permission == null) return;
        if (rolePermissionRepository.existsByRoleIdAndPermissionId(role.getId(), permission.getId())) return;
        rolePermissionRepository.save(new RolePermission(role, permission));
    }

    // ── Chart of Accounts ───────────────────────────────────────────────────────

    private record DefaultAccount(String code, String name, String type) {}

    /**
     * The standard account codes FinancialEventService already posts against
     * (see its class-level doc comment) — kept in sync with that list. Idempotent:
     * only inserts codes that don't exist yet, so it never touches balances on
     * accounts a real transaction has already posted to.
     */
    private void seedDefaultAccountHeads() {
        List<DefaultAccount> defaults = List.of(
            new DefaultAccount("1000", "Cash in Hand", "ASSET"),
            new DefaultAccount("1001", "Cash at Bank", "ASSET"),
            new DefaultAccount("1100", "Accounts Receivable", "ASSET"),
            new DefaultAccount("1400", "Salary Advance Receivable", "ASSET"),
            new DefaultAccount("1500", "Fixed Assets", "ASSET"),
            new DefaultAccount("1600", "Accumulated Depreciation", "ASSET"),
            new DefaultAccount("2000", "Accounts Payable", "LIABILITY"),
            new DefaultAccount("2100", "Tax / GST Payable", "LIABILITY"),
            new DefaultAccount("2200", "GST Input Credit", "LIABILITY"),
            new DefaultAccount("2300", "Deferred Revenue", "LIABILITY"),
            new DefaultAccount("4000", "Membership Revenue", "REVENUE"),
            new DefaultAccount("4100", "POS Sales Revenue", "REVENUE"),
            new DefaultAccount("4200", "Service / Add-on Revenue", "REVENUE"),
            new DefaultAccount("5000", "Salary Expense", "EXPENSE"),
            new DefaultAccount("5100", "Maintenance Expense", "EXPENSE"),
            new DefaultAccount("5200", "Purchase / COGS", "EXPENSE"),
            new DefaultAccount("5700", "Miscellaneous Expense", "EXPENSE"),
            new DefaultAccount("5800", "Depreciation Expense", "EXPENSE")
        );

        for (DefaultAccount d : defaults) {
            if (accountHeadRepository.findFirstByCode(d.code()).isPresent()) continue;
            AccountHead a = new AccountHead();
            a.setCode(d.code());
            a.setName(d.name());
            a.setType(d.type());
            a.setOpeningBalance(BigDecimal.ZERO);
            a.setCurrentBalance(BigDecimal.ZERO);
            a.setIsActive(true);
            accountHeadRepository.save(a);
        }
    }

    // ── Sample products (POS demo) ─────────────────────────────────────────────

    private record SampleProduct(String name, String categoryName, String brand, String description,
                                  BigDecimal sellingPrice, BigDecimal costPrice, String imageUrl) {}

    private void seedSampleProducts() {
        List<SampleProduct> samples = List.of(
            new SampleProduct("Whey Protein Isolate", "Supplements", "PureFit",
                "Fast-absorbing whey protein isolate, 24g protein per serving.",
                new BigDecimal("120.00"), new BigDecimal("80.00"),
                "https://picsum.photos/seed/whey-protein-isolate/400/400"),
            new SampleProduct("Creatine Monohydrate", "Supplements", "PureFit",
                "Micronized creatine monohydrate for strength and power output.",
                new BigDecimal("65.00"), new BigDecimal("40.00"),
                "https://picsum.photos/seed/creatine-monohydrate/400/400"),
            new SampleProduct("BCAA Powder", "Supplements", "PureFit",
                "2:1:1 branched-chain amino acids for muscle recovery.",
                new BigDecimal("55.00"), new BigDecimal("32.00"),
                "https://picsum.photos/seed/bcaa-powder/400/400"),
            new SampleProduct("Adjustable Dumbbell Set", "Equipment", "IronCore",
                "Pair of adjustable dumbbells, 5-25kg per hand.",
                new BigDecimal("450.00"), new BigDecimal("320.00"),
                "https://picsum.photos/seed/adjustable-dumbbell-set/400/400"),
            new SampleProduct("Yoga Mat", "Equipment", "FlexFit",
                "Non-slip 6mm yoga and stretching mat.",
                new BigDecimal("80.00"), new BigDecimal("45.00"),
                "https://picsum.photos/seed/yoga-mat/400/400"),
            new SampleProduct("Gym Training Gloves", "Apparel", "IronCore",
                "Padded weightlifting gloves with wrist support.",
                new BigDecimal("45.00"), new BigDecimal("25.00"),
                "https://picsum.photos/seed/gym-training-gloves/400/400"),
            new SampleProduct("Compression T-Shirt", "Apparel", "FlexFit",
                "Moisture-wicking compression training shirt.",
                new BigDecimal("60.00"), new BigDecimal("35.00"),
                "https://picsum.photos/seed/compression-tshirt/400/400"),
            new SampleProduct("Shaker Bottle", "Accessories", "PureFit",
                "600ml protein shaker with mixing ball.",
                new BigDecimal("25.00"), new BigDecimal("12.00"),
                "https://picsum.photos/seed/shaker-bottle/400/400"),
            new SampleProduct("Protein Energy Bar", "Snacks", "PureFit",
                "20g protein bar, chocolate chip flavor.",
                new BigDecimal("12.00"), new BigDecimal("7.00"),
                "https://picsum.photos/seed/protein-energy-bar/400/400"),
            new SampleProduct("Sports Energy Drink", "Beverages", "HydroMax",
                "Electrolyte sports drink, 500ml bottle.",
                new BigDecimal("15.00"), new BigDecimal("8.00"),
                "https://picsum.photos/seed/sports-energy-drink/400/400")
        );

        List<String> existingNames = productRepository.findAll().stream()
                .map(p -> p.getName() == null ? "" : p.getName().toLowerCase())
                .toList();

        Long defaultWarehouseId = resolveDefaultWarehouseId();

        // ProductService.createProduct resolves its branch via
        // BranchService.resolveBranchForCreate(null), which reads
        // BranchContextHolder — already set by run() for the whole seeding pass (see
        // its own comment for why this can't be scoped to just this one method).
        for (SampleProduct sample : samples) {
            if (existingNames.contains(sample.name().toLowerCase())) continue;

            ProductRequestDTO req = new ProductRequestDTO();
            req.setName(sample.name());
            req.setCategoryId(resolveCategoryId(sample.categoryName()));
            req.setBrand(sample.brand());
            req.setDescription(sample.description());
            req.setIsActive(true);
            req.setHasVariants(false);
            req.setHasRecipe(false);
            req.setIsManufactured(false);
            req.setEnabledForPos(true);
            req.setImageUrls(List.of(sample.imageUrl()));
            req.setDefaultUnit("pcs");
            req.setSellingPrice(sample.sellingPrice());
            req.setCostPrice(sample.costPrice());
            req.setTaxRate(new BigDecimal("5.00"));
            req.setSupplier(sample.brand());
            if (defaultWarehouseId != null) {
                req.setWarehouseId(defaultWarehouseId);
                req.setOpeningStock(50);
                req.setReorderLevel(10);
            }

            productService.createProduct(req);
        }
    }

    private Long resolveCategoryId(String name) {
        return productCategoryRepository.findByName(name)
                .map(ProductCategory::getId)
                .orElseGet(() -> {
                    ProductCategory cat = new ProductCategory();
                    cat.setName(name);
                    return productCategoryRepository.save(cat).getId();
                });
    }

    private Long resolveDefaultWarehouseId() {
        List<Warehouse> active = warehouseRepository.findByIsActiveTrue();
        if (!active.isEmpty()) return active.get(0).getId();

        List<Warehouse> all = warehouseRepository.findAll();
        if (!all.isEmpty()) return all.get(0).getId();

        Warehouse wh = new Warehouse();
        wh.setName("Main Warehouse");
        wh.setType("MAIN_WAREHOUSE");
        wh.setLocation("Main Branch");
        wh.setIsActive(true);
        return warehouseRepository.save(wh).getId();
    }
}
