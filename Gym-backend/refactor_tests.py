import glob

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

java_files = glob.glob('src/test/java/**/*.java', recursive=True)
for filepath in java_files:
    with open(filepath, 'r') as f:
        content = f.read()
    
    modified = False
    
    # Update imports
    for old_import, new_import in package_replacements.items():
        if 'import ' + old_import + ';' in content:
            content = content.replace('import ' + old_import + ';', 'import ' + new_import + ';')
            modified = True
            
    if modified:
        with open(filepath, 'w') as f:
            f.write(content)

print("Done refactoring tests.")
