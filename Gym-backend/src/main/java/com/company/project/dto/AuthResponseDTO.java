package com.company.project.dto;

import java.util.List;

public class AuthResponseDTO {
    private String token;
    private String username;
    private List<String> roles;
    private Long userId;
    private Boolean enabled;
    private String roleName;
    private String staffName;
    private String gymName;
    private List<String> permissions;
    private List<BranchResponseDTO> accessibleBranches;
    private Long defaultBranchId;
    private Boolean profileCompleted;

    public AuthResponseDTO() {}

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public List<String> getRoles() { return roles; }
    public void setRoles(List<String> roles) { this.roles = roles; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }

    public String getRoleName() { return roleName; }
    public void setRoleName(String roleName) { this.roleName = roleName; }

    public String getStaffName() { return staffName; }
    public void setStaffName(String staffName) { this.staffName = staffName; }

    public String getGymName() { return gymName; }
    public void setGymName(String gymName) { this.gymName = gymName; }

    public List<String> getPermissions() { return permissions; }
    public void setPermissions(List<String> permissions) { this.permissions = permissions; }

    public List<BranchResponseDTO> getAccessibleBranches() { return accessibleBranches; }
    public void setAccessibleBranches(List<BranchResponseDTO> accessibleBranches) { this.accessibleBranches = accessibleBranches; }

    public Long getDefaultBranchId() { return defaultBranchId; }
    public void setDefaultBranchId(Long defaultBranchId) { this.defaultBranchId = defaultBranchId; }

    public Boolean getProfileCompleted() { return profileCompleted; }
    public void setProfileCompleted(Boolean profileCompleted) { this.profileCompleted = profileCompleted; }

    // Manual Builder
    public static AuthResponseDTOBuilder builder() {
        return new AuthResponseDTOBuilder();
    }

    public static class AuthResponseDTOBuilder {
        private String token;
        private String username;
        private List<String> roles;
        private Long userId;
        private Boolean enabled;
        private String roleName;
        private String staffName;
        private String gymName;
        private List<String> permissions;
        private List<BranchResponseDTO> accessibleBranches;
        private Long defaultBranchId;
        private Boolean profileCompleted;

        public AuthResponseDTOBuilder token(String token) { this.token = token; return this; }
        public AuthResponseDTOBuilder username(String username) { this.username = username; return this; }
        public AuthResponseDTOBuilder roles(List<String> roles) { this.roles = roles; return this; }
        public AuthResponseDTOBuilder userId(Long userId) { this.userId = userId; return this; }
        public AuthResponseDTOBuilder enabled(Boolean enabled) { this.enabled = enabled; return this; }
        public AuthResponseDTOBuilder roleName(String roleName) { this.roleName = roleName; return this; }
        public AuthResponseDTOBuilder staffName(String staffName) { this.staffName = staffName; return this; }
        public AuthResponseDTOBuilder gymName(String gymName) { this.gymName = gymName; return this; }
        public AuthResponseDTOBuilder permissions(List<String> permissions) { this.permissions = permissions; return this; }
        public AuthResponseDTOBuilder accessibleBranches(List<BranchResponseDTO> accessibleBranches) { this.accessibleBranches = accessibleBranches; return this; }
        public AuthResponseDTOBuilder defaultBranchId(Long defaultBranchId) { this.defaultBranchId = defaultBranchId; return this; }
        public AuthResponseDTOBuilder profileCompleted(Boolean profileCompleted) { this.profileCompleted = profileCompleted; return this; }

        public AuthResponseDTO build() {
            AuthResponseDTO dto = new AuthResponseDTO();
            dto.token       = this.token;
            dto.username    = this.username;
            dto.roles       = this.roles;
            dto.userId      = this.userId;
            dto.enabled     = this.enabled;
            dto.roleName    = this.roleName;
            dto.staffName   = this.staffName;
            dto.gymName     = this.gymName;
            dto.permissions = this.permissions;
            dto.accessibleBranches = this.accessibleBranches;
            dto.defaultBranchId = this.defaultBranchId;
            dto.profileCompleted = this.profileCompleted;
            return dto;
        }
    }
}
