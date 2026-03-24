package com.company.project.config;

import com.company.project.entities.Role;
import com.company.project.entities.User;
import com.company.project.entities.UserRole;
import com.company.project.repositories.RoleRepository;
import com.company.project.repositories.UserRepository;
import com.company.project.repositories.UserRoleRepository;
import com.company.project.services.SupplierService;
import com.company.project.services.WarehouseService;
import com.company.project.services.ProductCategoryService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;

@Component
public class DataInitializer implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final PasswordEncoder passwordEncoder;
    private final WarehouseService warehouseService;
    private final ProductCategoryService productCategoryService;
    private final SupplierService supplierService;
    public DataInitializer(
            RoleRepository roleRepository,
            UserRepository userRepository,
            UserRoleRepository userRoleRepository,
            PasswordEncoder passwordEncoder,
            WarehouseService warehouseService,
            ProductCategoryService productCategoryService,
            SupplierService supplierService
    ) {
        this.roleRepository = roleRepository;
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.passwordEncoder = passwordEncoder;
        this.warehouseService = warehouseService;
        this.productCategoryService = productCategoryService;
        this.supplierService = supplierService;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        // Seed Roles
        List<String> rolesToSeed = List.of("ADMIN", "MANAGER", "USER", "ACCOUNTANT", "HR", "MEMBER", "STAFF");
        for (String roleName : rolesToSeed) {
            if (roleRepository.findByRoleName(roleName).isEmpty()) {
                Role role = new Role();
                role.setRoleName(roleName);
                roleRepository.save(role);
            }
        }

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

        // Salary Payments & Advances are now user-generated only (no seed data).
    }
}
