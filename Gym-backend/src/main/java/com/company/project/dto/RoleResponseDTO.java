package com.company.project.dto;

import java.util.List;

public class RoleResponseDTO {
    private Long id;
    private String roleName;
    private String description;
    private boolean isSystem;
    private long userCount;
    private List<String> permissionKeys;

    public static RoleResponseDTO of(Long id, String roleName, String description, boolean isSystem,
                                      long userCount, List<String> permissionKeys) {
        RoleResponseDTO dto = new RoleResponseDTO();
        dto.id = id;
        dto.roleName = roleName;
        dto.description = description;
        dto.isSystem = isSystem;
        dto.userCount = userCount;
        dto.permissionKeys = permissionKeys;
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getRoleName() { return roleName; }
    public void setRoleName(String roleName) { this.roleName = roleName; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public boolean getIsSystem() { return isSystem; }
    public void setIsSystem(boolean isSystem) { this.isSystem = isSystem; }

    public long getUserCount() { return userCount; }
    public void setUserCount(long userCount) { this.userCount = userCount; }

    public List<String> getPermissionKeys() { return permissionKeys; }
    public void setPermissionKeys(List<String> permissionKeys) { this.permissionKeys = permissionKeys; }
}
