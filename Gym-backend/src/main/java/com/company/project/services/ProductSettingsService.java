package com.company.project.services;

import com.company.project.entities.GymOsSetting;
import com.company.project.repositories.GymOsSettingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * Products › Settings tab. Stored as PRODUCT_SETTINGS rows in the existing
 * gymos_settings key/value table (per tenant database, like every other
 * GymOsSetting). Defaults match how the system behaved before these toggles
 * were real — SKUs auto-generated, alerts on, production deducting ingredients,
 * 5% VAT — so a gym that never opens this tab sees no change.
 */
@Service
@Transactional
public class ProductSettingsService {

    public static final String CATEGORY = "PRODUCT_SETTINGS";

    public static final String AUTO_GENERATE_SKU = "autoGenerateSku";
    public static final String LOW_STOCK_ALERTS = "lowStockAlerts";
    public static final String AUTO_DEDUCT_RECIPE_INGREDIENTS = "autoDeductRecipeIngredients";
    public static final String DEFAULT_TAX_RATE = "defaultTaxRate";

    private static final Map<String, String> DEFAULTS = Map.of(
            AUTO_GENERATE_SKU, "true",
            LOW_STOCK_ALERTS, "true",
            AUTO_DEDUCT_RECIPE_INGREDIENTS, "true",
            DEFAULT_TAX_RATE, "5"
    );
    private static final Set<String> BOOLEAN_KEYS = Set.of(AUTO_GENERATE_SKU, LOW_STOCK_ALERTS, AUTO_DEDUCT_RECIPE_INGREDIENTS);
    private static final Set<String> TAX_RATE_VALUES = Set.of("5", "0", "exempt");

    private final GymOsSettingRepository settingRepository;

    public ProductSettingsService(GymOsSettingRepository settingRepository) {
        this.settingRepository = settingRepository;
    }

    @Transactional(readOnly = true)
    public Map<String, String> getSettings() {
        Map<String, String> result = new LinkedHashMap<>();
        for (String key : new String[]{AUTO_GENERATE_SKU, LOW_STOCK_ALERTS, AUTO_DEDUCT_RECIPE_INGREDIENTS, DEFAULT_TAX_RATE}) {
            result.put(key, get(key));
        }
        return result;
    }

    public Map<String, String> updateSettings(Map<String, String> settings) {
        if (settings == null || settings.isEmpty()) {
            throw new IllegalArgumentException("settings must not be empty");
        }
        for (Map.Entry<String, String> entry : settings.entrySet()) {
            String key = entry.getKey();
            String value = entry.getValue() == null ? null : entry.getValue().trim();
            if (!DEFAULTS.containsKey(key)) {
                throw new IllegalArgumentException("Unknown product setting: " + key);
            }
            if (BOOLEAN_KEYS.contains(key) && !"true".equals(value) && !"false".equals(value)) {
                throw new IllegalArgumentException(key + " must be true or false");
            }
            if (DEFAULT_TAX_RATE.equals(key) && !TAX_RATE_VALUES.contains(value)) {
                throw new IllegalArgumentException("defaultTaxRate must be one of " + TAX_RATE_VALUES);
            }
            GymOsSetting setting = settingRepository.findByCategoryAndSettingKey(CATEGORY, key)
                    .orElseGet(() -> {
                        GymOsSetting s = new GymOsSetting();
                        s.setCategory(CATEGORY);
                        s.setSettingKey(key);
                        return s;
                    });
            setting.setSettingValue(value);
            settingRepository.save(setting);
        }
        return getSettings();
    }

    @Transactional(readOnly = true)
    public boolean isEnabled(String key) {
        return Boolean.parseBoolean(get(key));
    }

    private String get(String key) {
        return settingRepository.findByCategoryAndSettingKey(CATEGORY, key)
                .map(GymOsSetting::getSettingValue)
                .filter(v -> v != null && !v.isBlank())
                .orElse(DEFAULTS.get(key));
    }
}
