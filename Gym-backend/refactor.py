import os
import glob
import subprocess

moves = {
    'src/main/java/com/company/project/controllers/MobileAuthController.java': 'src/main/java/com/company/project/controllers/mobile/auth/MobileAuthController.java',
    'src/main/java/com/company/project/controllers/MobileProfileController.java': 'src/main/java/com/company/project/controllers/mobile/profile/MobileProfileController.java',
    'src/main/java/com/company/project/controllers/mobile/MobileReferralController.java': 'src/main/java/com/company/project/controllers/mobile/referrals/MobileReferralController.java',
    
    'src/main/java/com/company/project/services/MobileAuthService.java': 'src/main/java/com/company/project/services/mobile/auth/MobileAuthService.java',
    'src/main/java/com/company/project/services/MobileProfileService.java': 'src/main/java/com/company/project/services/mobile/profile/MobileProfileService.java',
    'src/main/java/com/company/project/services/MobileReferralService.java': 'src/main/java/com/company/project/services/mobile/referrals/MobileReferralService.java',
    'src/main/java/com/company/project/services/MobileReferralResolutionService.java': 'src/main/java/com/company/project/services/mobile/referrals/MobileReferralResolutionService.java',
    
    'src/main/java/com/company/project/dto/MobileProfileDTO.java': 'src/main/java/com/company/project/dto/mobile/profile/MobileProfileDTO.java',
    'src/main/java/com/company/project/dto/MobileRegisterRequestDTO.java': 'src/main/java/com/company/project/dto/mobile/auth/MobileRegisterRequestDTO.java',
    'src/main/java/com/company/project/dto/MobileProfileTransactionsDTO.java': 'src/main/java/com/company/project/dto/mobile/profile/MobileProfileTransactionsDTO.java',
    
    'src/main/java/com/company/project/dto/mobile/MobilePurchaseRequestDTO.java': 'src/main/java/com/company/project/dto/mobile/discovery/MobilePurchaseRequestDTO.java'
}

# 1. Move files
for old_path, new_path in moves.items():
    if os.path.exists(old_path):
        os.makedirs(os.path.dirname(new_path), exist_ok=True)
        # Check if tracked by git
        try:
            subprocess.run(['git', 'ls-files', '--error-unmatch', old_path], check=True, capture_output=True)
            subprocess.run(['git', 'mv', old_path, new_path], check=True)
        except subprocess.CalledProcessError:
            # Not tracked or error
            os.rename(old_path, new_path)
    else:
        print(f"Warning: {old_path} not found")

# 2. Map old packages to new packages
package_replacements = {
    'com.company.project.controllers.MobileAuthController': 'com.company.project.controllers.mobile.auth.MobileAuthController',
    'com.company.project.controllers.MobileProfileController': 'com.company.project.controllers.mobile.profile.MobileProfileController',
    'com.company.project.controllers.mobile.MobileReferralController': 'com.company.project.controllers.mobile.referrals.MobileReferralController',
    'com.company.project.services.MobileAuthService': 'com.company.project.services.mobile.auth.MobileAuthService',
    'com.company.project.services.MobileProfileService': 'com.company.project.services.mobile.profile.MobileProfileService',
    'com.company.project.services.MobileReferralService': 'com.company.project.services.mobile.referrals.MobileReferralService',
    'com.company.project.services.MobileReferralResolutionService': 'com.company.project.services.mobile.referrals.MobileReferralResolutionService',
    'com.company.project.dto.MobileProfileDTO': 'com.company.project.dto.mobile.profile.MobileProfileDTO',
    'com.company.project.dto.MobileRegisterRequestDTO': 'com.company.project.dto.mobile.auth.MobileRegisterRequestDTO',
    'com.company.project.dto.MobileProfileTransactionsDTO': 'com.company.project.dto.mobile.profile.MobileProfileTransactionsDTO',
    'com.company.project.dto.mobile.MobilePurchaseRequestDTO': 'com.company.project.dto.mobile.discovery.MobilePurchaseRequestDTO',
}

# 3. Update all Java files
java_files = glob.glob('src/main/java/**/*.java', recursive=True)
for filepath in java_files:
    with open(filepath, 'r') as f:
        content = f.read()
    
    modified = False
    
    # Update package declarations if it's one of the moved files
    for old_path, new_path in moves.items():
        if filepath == new_path:
            old_pkg = old_path.replace('src/main/java/', '').replace('.java', '').replace('/', '.')
            new_pkg = new_path.replace('src/main/java/', '').replace('.java', '').replace('/', '.')
            old_pkg_decl = 'package ' + '.'.join(old_pkg.split('.')[:-1]) + ';'
            new_pkg_decl = 'package ' + '.'.join(new_pkg.split('.')[:-1]) + ';'
            if old_pkg_decl in content:
                content = content.replace(old_pkg_decl, new_pkg_decl)
                modified = True
    
    # Update imports
    for old_import, new_import in package_replacements.items():
        if 'import ' + old_import + ';' in content:
            content = content.replace('import ' + old_import + ';', 'import ' + new_import + ';')
            modified = True
            
        # Catch same-package references that might have broken because they are now in different packages.
        # This is harder, but for these specific files it's mostly imports.
            
    if modified:
        with open(filepath, 'w') as f:
            f.write(content)

print("Done refactoring.")
