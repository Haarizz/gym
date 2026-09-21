package com.company.project.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * No object storage (S3/Cloudinary/etc.) exists anywhere in this codebase — see
 * the Track 2 gap analysis. This serves uploaded branch images straight off local
 * disk under the app's working directory, the minimum additive capability that
 * doesn't require new credentials/config or a new dependency. Revisit with real
 * object storage before relying on this for a multi-instance/ephemeral-disk
 * production deployment.
 */
@Configuration
public class BranchImageStorageConfig implements WebMvcConfigurer {

    @Value("${app.storage.branch-images-dir:${user.dir}/uploads/branch-images}")
    private String branchImagesDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = branchImagesDir.endsWith("/") ? branchImagesDir : branchImagesDir + "/";
        registry.addResourceHandler("/uploads/branch-images/**")
                .addResourceLocations("file:" + location);
    }
}
