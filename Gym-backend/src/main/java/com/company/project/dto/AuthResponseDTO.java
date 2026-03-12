package com.company.project.dto;

import java.util.List;

public class AuthResponseDTO {
    private String token;
    private String username;
    private List<String> roles;

    public AuthResponseDTO() {}

    public AuthResponseDTO(String token, String username, List<String> roles) {
        this.token = token;
        this.username = username;
        this.roles = roles;
    }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public List<String> getRoles() { return roles; }
    public void setRoles(List<String> roles) { this.roles = roles; }

    // Manual Builder
    public static AuthResponseDTOBuilder builder() {
        return new AuthResponseDTOBuilder();
    }

    public static class AuthResponseDTOBuilder {
        private String token;
        private String username;
        private List<String> roles;

        public AuthResponseDTOBuilder token(String token) { this.token = token; return this; }
        public AuthResponseDTOBuilder username(String username) { this.username = username; return this; }
        public AuthResponseDTOBuilder roles(List<String> roles) { this.roles = roles; return this; }
        public AuthResponseDTO build() {
            return new AuthResponseDTO(token, username, roles);
        }
    }
}
