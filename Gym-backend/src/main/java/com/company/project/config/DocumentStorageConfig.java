package com.company.project.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Serves uploaded documents (staff certification files) straight off local
 * disk — same rationale as PhotoStorageConfig.
 */
@Configuration
public class DocumentStorageConfig implements WebMvcConfigurer {

    @Value("${app.storage.documents-dir:${user.dir}/uploads/documents}")
    private String documentsDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = documentsDir.endsWith("/") ? documentsDir : documentsDir + "/";
        registry.addResourceHandler("/uploads/documents/**")
                .addResourceLocations("file:" + location);
    }
}
