package com.company.project.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Serves uploaded avatar/profile photos straight off local disk under the
 * app's working directory — same rationale as BranchImageStorageConfig (no
 * object storage exists anywhere in this codebase yet).
 */
@Configuration
public class PhotoStorageConfig implements WebMvcConfigurer {

    @Value("${app.storage.photos-dir:${user.dir}/uploads/photos}")
    private String photosDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = photosDir.endsWith("/") ? photosDir : photosDir + "/";
        registry.addResourceHandler("/uploads/photos/**")
                .addResourceLocations("file:" + location);
    }
}
