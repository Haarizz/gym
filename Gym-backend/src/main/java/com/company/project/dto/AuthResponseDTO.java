package com.company.project.dto;

import java.util.List;

public class AuthResponseDTO {
    private String token;
    private String username;
    private List<String> roles;
    private Long userId;
    private Boolean enabled;

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

        public AuthResponseDTOBuilder token(String token) { this.token = token; return this; }
        public AuthResponseDTOBuilder username(String username) { this.username = username; return this; }
        public AuthResponseDTOBuilder roles(List<String> roles) { this.roles = roles; return this; }
        public AuthResponseDTOBuilder userId(Long userId) { this.userId = userId; return this; }
        public AuthResponseDTOBuilder enabled(Boolean enabled) { this.enabled = enabled; return this; }
        public AuthResponseDTO build() {
            AuthResponseDTO dto = new AuthResponseDTO();
            dto.token    = this.token;
            dto.username = this.username;
            dto.roles    = this.roles;
            dto.userId   = this.userId;
            dto.enabled  = this.enabled;
            return dto;
        }
    }
}
