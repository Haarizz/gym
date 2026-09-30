package com.company.project.dto.mobile.push;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class MobilePushTokenRequestDTO {

    // Expo push token, e.g. "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
    @NotBlank
    @Size(max = 255)
    @Pattern(regexp = "^Expo(nent)?PushToken\\[.+]$", message = "Invalid Expo push token")
    private String expoPushToken;

    // "ios" | "android"
    @Size(max = 20)
    private String platform;

    public String getExpoPushToken() { return expoPushToken; }
    public void setExpoPushToken(String expoPushToken) { this.expoPushToken = expoPushToken; }

    public String getPlatform() { return platform; }
    public void setPlatform(String platform) { this.platform = platform; }
}
