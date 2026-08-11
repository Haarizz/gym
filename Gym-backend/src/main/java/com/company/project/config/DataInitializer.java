package com.company.project.config;

import com.company.project.dto.ProductRequestDTO;
import com.company.project.entities.AccountHead;
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
            RolePermissionRepository rolePermissionRepository
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
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        // Seed Roles
        List<String> rolesToSeed = List.of(
                "ADMIN", "MANAGER", "USER", "ACCOUNTANT", "HR", "MEMBER", "STAFF",
                "RECEPTIONIST", "TRAINER");
        for (String roleName : rolesToSeed) {
            if (roleRepository.findByRoleName(roleName).isEmpty()) {
                Role role = new Role();
                role.setRoleName(roleName);
                roleRepository.save(role);
            }
        }

        // Administration module: seed the module x action permission catalog and each
        // role's default permission set (see PermissionCatalog / RoleService).
        seedPermissionsAndRolePermissions();

        // Seed Admin User
        if (!userRepository.existsByEmail("admin@gymbios.com")) {
            User admin = new User();
            admin.setUsername("admin");
            admin.setEmail("admin@gymbios.com");
            admin.setPasswordHash(passwordEncoder.encode("admin123"));
            admin.setEnabled(true);
            admin.setUserRoles(new HashSet<>());
            admin = userRepository.save(admin);

            Role adminRole = roleRepository.findByRoleName("ADMIN")
                    .orElseThrow(() -> new RuntimeException("Admin role not found"));
            
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
    }

    // ── Administration: permission catalog + default role permissions ─────────────

    /**
     * Idempotent: only inserts catalog rows that don't exist yet, and only seeds a
     * role's default permission set the first time (a role with any existing
     * role_permissions rows is left alone, so an admin's edits via the Roles &
     * Permissions UI are never overwritten on the next app restart). ADMIN is
     * deliberately not seeded here — it always evaluates to "all permissions" via
     * RoleService.getEffectivePermissionKeys(), regardless of stored rows.
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
        // whether their permission set has been customized.
        for (String name : List.of("ADMIN", "MANAGER", "USER", "ACCOUNTANT", "HR", "MEMBER", "STAFF")) {
            roleRepository.findByRoleName(name).ifPresent(role -> {
                if (!role.isSystem()) {
                    role.setSystem(true);
                    roleRepository.save(role);
                }
            });
        }

        seedDefaultRolePermissions("MANAGER", List.of(
                "DASHBOARD_VIEW",
                "MEMBERS_VIEW", "MEMBERS_CREATE", "MEMBERS_EDIT", "MEMBERS_EXPORT",
                "MEMBER_CONNECT_VIEW", "MEMBER_CONNECT_CREATE", "MEMBER_CONNECT_EDIT", "MEMBER_CONNECT_EXPORT",
                "COMMUNITY_VIEW", "COMMUNITY_CREATE", "COMMUNITY_EDIT", "COMMUNITY_EXPORT",
                "ATTENDANCE_VIEW", "ATTENDANCE_CREATE", "ATTENDANCE_EDIT", "ATTENDANCE_EXPORT",
                "BILLING_VIEW", "BILLING_CREATE", "BILLING_EDIT", "BILLING_EXPORT",
                "PAYMENTS_VIEW", "PAYMENTS_CREATE", "PAYMENTS_EDIT", "PAYMENTS_EXPORT", "PAYMENTS_APPROVE",
                "MEMBERSHIP_PLANS_VIEW", "MEMBERSHIP_PLANS_CREATE", "MEMBERSHIP_PLANS_EDIT", "MEMBERSHIP_PLANS_EXPORT",
                "TRAINERS_VIEW", "TRAINERS_CREATE", "TRAINERS_EDIT", "TRAINERS_EXPORT",
                "STAFF_VIEW", "STAFF_CREATE", "STAFF_EDIT", "STAFF_DELETE", "STAFF_EXPORT",
                "PAYROLL_VIEW", "PAYROLL_CREATE", "PAYROLL_EDIT", "PAYROLL_EXPORT", "PAYROLL_APPROVE",
                "REPORTS_VIEW", "REPORTS_EXPORT",
                "ASSETS_VIEW", "ASSETS_CREATE", "ASSETS_EDIT", "ASSETS_EXPORT",
                "SALES_PURCHASES_VIEW", "SALES_PURCHASES_CREATE", "SALES_PURCHASES_EDIT", "SALES_PURCHASES_EXPORT",
                "FINANCIALS_VIEW", "FINANCIALS_CREATE", "FINANCIALS_EDIT", "FINANCIALS_EXPORT", "FINANCIALS_APPROVE",
                "GYMOS_VIEW", "BIOS_VIEW",
                "SETTINGS_VIEW", "SETTINGS_EDIT",
                "ADMINISTRATION_VIEW"
        ));

        seedDefaultRolePermissions("ACCOUNTANT", List.of(
                "DASHBOARD_VIEW",
                "BILLING_VIEW", "BILLING_CREATE", "BILLING_EDIT", "BILLING_EXPORT",
                "PAYMENTS_VIEW", "PAYMENTS_CREATE", "PAYMENTS_EDIT", "PAYMENTS_EXPORT",
                "FINANCIALS_VIEW", "FINANCIALS_CREATE", "FINANCIALS_EDIT", "FINANCIALS_EXPORT", "FINANCIALS_APPROVE",
                "SALES_PURCHASES_VIEW",
                "REPORTS_VIEW", "REPORTS_EXPORT"
        ));

        seedDefaultRolePermissions("HR", List.of(
                "DASHBOARD_VIEW",
                "STAFF_VIEW", "STAFF_CREATE", "STAFF_EDIT", "STAFF_DELETE", "STAFF_EXPORT",
                "PAYROLL_VIEW", "PAYROLL_CREATE", "PAYROLL_EDIT", "PAYROLL_EXPORT",
                "REPORTS_VIEW"
        ));

        // Matches the spec's worked example exactly.
        seedDefaultRolePermissions("RECEPTIONIST", List.of(
                "DASHBOARD_VIEW",
                "MEMBERS_VIEW", "MEMBERS_CREATE", "MEMBERS_EDIT",
                "PAYMENTS_VIEW", "PAYMENTS_CREATE",
                "REPORTS_VIEW"
        ));

        seedDefaultRolePermissions("TRAINER", List.of(
                "DASHBOARD_VIEW",
                "MEMBERS_VIEW",
                "ATTENDANCE_VIEW", "ATTENDANCE_CREATE"
        ));

        seedDefaultRolePermissions("USER", List.of("DASHBOARD_VIEW"));
        seedDefaultRolePermissions("MEMBER", List.of("DASHBOARD_VIEW"));
        seedDefaultRolePermissions("STAFF", List.of("DASHBOARD_VIEW"));

        // SALES_PURCHASES/FINANCIALS/GYMOS/BIOS were added to the catalog after the
        // above per-role bulk seed had already run on existing installs (it skips a
        // role entirely once it has any row, so those installs never got these new
        // keys). Backfill them additively, one (role, key) pair at a time, so this
        // self-heals an already-seeded database without touching any customization
        // an admin made to a role's existing permissions via the Roles & Permissions UI.
        for (String key : List.of(
                "SALES_PURCHASES_VIEW", "SALES_PURCHASES_CREATE", "SALES_PURCHASES_EDIT", "SALES_PURCHASES_EXPORT",
                "FINANCIALS_VIEW", "FINANCIALS_CREATE", "FINANCIALS_EDIT", "FINANCIALS_EXPORT", "FINANCIALS_APPROVE",
                "GYMOS_VIEW", "BIOS_VIEW")) {
            grantPermissionIfMissing("MANAGER", key);
        }
        for (String key : List.of(
                "FINANCIALS_VIEW", "FINANCIALS_CREATE", "FINANCIALS_EDIT", "FINANCIALS_EXPORT", "FINANCIALS_APPROVE",
                "SALES_PURCHASES_VIEW")) {
            grantPermissionIfMissing("ACCOUNTANT", key);
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
            if (accountHeadRepository.findByCode(d.code()).isPresent()) continue;
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
