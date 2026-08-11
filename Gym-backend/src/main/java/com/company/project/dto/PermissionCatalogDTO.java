package com.company.project.dto;

import java.util.List;

public class PermissionCatalogDTO {
    private String module;
    private List<PermissionItem> permissions;

    public static class PermissionItem {
        private String key;
        private String action;

        public PermissionItem() {}
        public PermissionItem(String key, String action) {
            this.key = key;
            this.action = action;
        }

        public String getKey() { return key; }
        public void setKey(String key) { this.key = key; }
        public String getAction() { return action; }
        public void setAction(String action) { this.action = action; }
    }

    public PermissionCatalogDTO() {}

    public PermissionCatalogDTO(String module, List<PermissionItem> permissions) {
        this.module = module;
        this.permissions = permissions;
    }

    public String getModule() { return module; }
    public void setModule(String module) { this.module = module; }

    public List<PermissionItem> getPermissions() { return permissions; }
    public void setPermissions(List<PermissionItem> permissions) { this.permissions = permissions; }
}
