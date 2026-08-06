package com.company.project.services;

import com.company.project.entities.Asset;
import com.company.project.repositories.AssetRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
public class AssetDepreciationScheduler {

    private static final Logger log = LoggerFactory.getLogger(AssetDepreciationScheduler.class);

    private final AssetRepository assetRepository;
    private final FinancialEventService financialEventService;

    public AssetDepreciationScheduler(AssetRepository assetRepository, 
                                      FinancialEventService financialEventService) {
        this.assetRepository = assetRepository;
        this.financialEventService = financialEventService;
    }

    /**
     * Runs on the 1st day of every month at 2:00 AM.
     */
    @Scheduled(cron = "0 0 2 1 * *")
    @Transactional
    public void runMonthlyDepreciation() {
        log.info("Starting monthly asset depreciation job.");

        List<Asset> activeAssets = assetRepository.findAll().stream()
                .filter(a -> "Active".equalsIgnoreCase(a.getStatus()))
                .filter(a -> a.getPurchasePrice() != null)
                .filter(a -> a.getUsefulLifeMonths() != null && a.getUsefulLifeMonths() > 0)
                .toList();

        for (Asset asset : activeAssets) {
            BigDecimal purchasePrice = asset.getPurchasePrice();
            BigDecimal salvageValue = asset.getSalvageValue() != null ? asset.getSalvageValue() : BigDecimal.ZERO;
            BigDecimal depreciableBase = purchasePrice.subtract(salvageValue);
            
            if (depreciableBase.compareTo(BigDecimal.ZERO) <= 0) continue;

            BigDecimal monthlyDepreciation = depreciableBase.divide(
                    new BigDecimal(asset.getUsefulLifeMonths()), 2, RoundingMode.HALF_UP);
            
            BigDecimal currentAccumulated = asset.getAccumulatedDepreciation() != null ? 
                    asset.getAccumulatedDepreciation() : BigDecimal.ZERO;
            
            BigDecimal remainingValue = depreciableBase.subtract(currentAccumulated);
            
            // If the remaining value is less than the monthly amount, only depreciate the remainder
            BigDecimal amountToDepreciate = monthlyDepreciation.min(remainingValue);
            
            if (amountToDepreciate.compareTo(BigDecimal.ZERO) > 0) {
                asset.setAccumulatedDepreciation(currentAccumulated.add(amountToDepreciate));
                asset.setCurrentValue(purchasePrice.subtract(asset.getAccumulatedDepreciation()));
                assetRepository.save(asset);

                financialEventService.onAssetDepreciated(asset, amountToDepreciate);
                log.info("Depreciated asset {} by {}", asset.getCode(), amountToDepreciate);
            }
        }
        
        log.info("Completed monthly asset depreciation job.");
    }
}
