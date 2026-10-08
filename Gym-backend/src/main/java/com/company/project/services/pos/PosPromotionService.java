package com.company.project.services.pos;

import com.company.project.dto.DiscountCodeDTO;
import com.company.project.dto.PromotionCampaignResponseDTO;
import com.company.project.dto.pos.PosResponses.DiscountRule;
import com.company.project.dto.pos.PosResponses.WalletBalance;
import com.company.project.entities.Member;
import com.company.project.entities.PromotionCampaign;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.PromotionCampaignRepository;
import com.company.project.services.DiscountCodeService;
import com.company.project.services.PromotionCampaignService;
import com.company.project.services.WalletService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import static com.company.project.services.pos.PosSupport.nz;
import static com.company.project.services.pos.PosSupport.r2;

/**
 * Till-side use of Gymbios' existing promotion engine: discount codes (promotion codes and
 * referral coupons, resolved by DiscountCodeService exactly as the web checkout does),
 * promotions picked from a list, and the member reward wallet as a tender. The discount
 * is always recomputed here; the till's own figure is only a preview.
 */
@Service
@Transactional
public class PosPromotionService {

    /** Promotion discount types that give money off a basket. */
    private static final Set<String> PRICE_TYPES = Set.of("percentage", "fixed", "free");

    private final DiscountCodeService discountCodeService;
    private final PromotionCampaignService promotionService;
    private final PromotionCampaignRepository promotionRepo;
    private final WalletService walletService;
    private final MemberRepository memberRepo;

    public PosPromotionService(DiscountCodeService discountCodeService, PromotionCampaignService promotionService,
                               PromotionCampaignRepository promotionRepo, WalletService walletService,
                               MemberRepository memberRepo) {
        this.discountCodeService = discountCodeService;
        this.promotionService = promotionService;
        this.promotionRepo = promotionRepo;
        this.walletService = walletService;
        this.memberRepo = memberRepo;
    }

    /** A code or promotion applied to a sale, with the discount it gives on `base`. */
    public record Applied(String source, String code, Long promotionId, String name, BigDecimal base, BigDecimal discount) {}

    // ── Lookups for the till ────────────────────────────────────────────────

    /** Active, in-date promotions with a price discount and uses left — the till's Promotions list. */
    @Transactional(readOnly = true)
    public List<DiscountRule> activePromotions() {
        LocalDate today = LocalDate.now();
        return promotionRepo.findByStatusOrderByCreatedAtDesc("active").stream()
                .filter(p -> p.getStartDate() == null || !p.getStartDate().isAfter(today))
                .filter(p -> p.getEndDate() == null || !p.getEndDate().isBefore(today))
                .filter(p -> p.getUsageLimit() == null || p.getUsageCount() == null || p.getUsageCount() < p.getUsageLimit())
                .filter(p -> PRICE_TYPES.contains(type(p.getDiscountType())))
                .map(p -> rule(PromotionCampaignResponseDTO.fromEntity(p), null))
                .toList();
    }

    /** Resolves a typed code (promotion first, then referral coupon); with `gross`, includes its discount. */
    @Transactional(readOnly = true)
    public DiscountRule lookupCode(String code, BigDecimal gross) {
        DiscountCodeDTO d = resolveCode(code, gross);
        if ("PROMOTION".equals(d.getSource())) {
            return rule(promotionService.getPromotionById(d.getPromotionId()), gross);
        }
        return new DiscountRule("COUPON", d.getCode(), null, d.getName(), d.getDiscountType(), d.getDiscountValue(),
                null, null, d.getDiscountAmount(), null);
    }

    @Transactional(readOnly = true)
    public WalletBalance wallet(Long memberDbId) {
        Member m = memberRepo.findById(memberDbId)
                .orElseThrow(() -> new EntityNotFoundException("Member not found with id: " + memberDbId));
        return new WalletBalance(m.getId(), m.getMemberId(), r2(nz(m.getWalletBalance())));
    }

    // ── Checkout ────────────────────────────────────────────────────────────

    /** The discount a code or picked promotion gives on `base` (the basket after the cashier's bill discount). */
    @Transactional(readOnly = true)
    public Applied preview(String code, Long promotionId, BigDecimal base) {
        if (code != null && !code.isBlank()) {
            DiscountCodeDTO d = resolveCode(code, base);
            return new Applied(d.getSource(), d.getCode(), d.getPromotionId(), d.getName(), base, r2(nz(d.getDiscountAmount())));
        }
        if (promotionId != null) {
            PromotionCampaignResponseDTO promo = validPromotion(promotionId);
            BigDecimal discount = discountOf(promo, base);
            return new Applied("PROMOTION", promo.getCode(), promo.getId(), promo.getName(), base, discount);
        }
        return null;
    }

    /** Spends the code / promotion once the sale is saved (usage count, revenue, savings). */
    public void redeem(Applied applied, Long memberDbId, String memberName) {
        if (applied == null) return;
        if (applied.code() != null && !applied.code().isBlank()) {
            try {
                discountCodeService.redeemAtCheckout(applied.code(), applied.base(), memberDbId, memberName);
            } catch (IllegalStateException | IllegalArgumentException e) {
                throw new BusinessRuleViolationException(e.getMessage());
            }
            return;
        }
        promotionService.redeemPromotion(applied.promotionId(), applied.base().subtract(applied.discount()),
                applied.discount(), memberDbId);
    }

    /** Draws a wallet tender down from the member's balance (the ledger side is the sale's Wallet leg). */
    public void debitWallet(Member member, BigDecimal amount, Long saleId, String saleNumber) {
        if (amount == null || amount.signum() <= 0) return;
        walletService.debit(member.getMemberId(), amount, "POS_SALE", saleId, "POS sale " + saleNumber);
    }

    /** Puts a refunded wallet tender back on the member's balance. */
    public void creditWallet(Long memberDbId, BigDecimal amount, Long returnId, String returnNumber) {
        if (amount == null || amount.signum() <= 0 || memberDbId == null) return;
        Member m = memberRepo.findById(memberDbId)
                .orElseThrow(() -> new EntityNotFoundException("Member not found with id: " + memberDbId));
        walletService.credit(m.getMemberId(), amount, "POS_RETURN", returnId, "POS return " + returnNumber);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private DiscountCodeDTO resolveCode(String code, BigDecimal gross) {
        try {
            return discountCodeService.resolve(code, gross);
        } catch (IllegalStateException | IllegalArgumentException e) {
            throw new BusinessRuleViolationException(e.getMessage());
        }
    }

    /** Same checks a promotion code gets (active, in date, uses left), for a promotion picked by id. */
    private PromotionCampaignResponseDTO validPromotion(Long id) {
        PromotionCampaign p = promotionRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Promotion not found: " + id));
        LocalDate today = LocalDate.now();
        if (!"active".equalsIgnoreCase(p.getStatus())) throw new BusinessRuleViolationException(p.getName() + " is not active.");
        if (p.getEndDate() != null && p.getEndDate().isBefore(today)) throw new BusinessRuleViolationException(p.getName() + " has expired.");
        if (p.getStartDate() != null && p.getStartDate().isAfter(today)) throw new BusinessRuleViolationException(p.getName() + " has not started yet.");
        if (p.getUsageLimit() != null && p.getUsageCount() != null && p.getUsageCount() >= p.getUsageLimit()) {
            throw new BusinessRuleViolationException(p.getName() + " has reached its usage limit.");
        }
        if (!PRICE_TYPES.contains(type(p.getDiscountType()))) {
            throw new BusinessRuleViolationException(p.getName() + " doesn't give a price discount.");
        }
        return PromotionCampaignResponseDTO.fromEntity(p);
    }

    /** DiscountCodeService's promotion formula: % (capped), free = everything, fixed amount; never above base. */
    static BigDecimal discountOf(PromotionCampaignResponseDTO promo, BigDecimal gross) {
        BigDecimal base = gross.max(BigDecimal.ZERO);
        if (promo.getMinimumPurchase() != null && base.compareTo(promo.getMinimumPurchase()) < 0) {
            throw new BusinessRuleViolationException(promo.getName() + " needs a minimum purchase of "
                    + promo.getMinimumPurchase().setScale(2, RoundingMode.HALF_UP) + ".");
        }
        BigDecimal value = nz(promo.getDiscountValue());
        BigDecimal discount = switch (type(promo.getDiscountType())) {
            case "percentage" -> base.multiply(value).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            case "free" -> base;
            default -> value;
        };
        if (promo.getMaximumDiscount() != null && promo.getMaximumDiscount().signum() > 0) {
            discount = discount.min(promo.getMaximumDiscount());
        }
        return discount.max(BigDecimal.ZERO).min(base).setScale(2, RoundingMode.HALF_UP);
    }

    private static String type(String t) {
        return t == null ? "percentage" : t.toLowerCase(Locale.ROOT);
    }

    private static DiscountRule rule(PromotionCampaignResponseDTO p, BigDecimal gross) {
        BigDecimal discount = null;
        if (gross != null) {
            try {
                discount = discountOf(p, gross);
            } catch (BusinessRuleViolationException ignored) {
                discount = BigDecimal.ZERO; // below the minimum purchase: the till shows why
            }
        }
        return new DiscountRule("PROMOTION", p.getCode(), p.getId(), p.getName(), type(p.getDiscountType()),
                p.getDiscountValue(), p.getMaximumDiscount(), p.getMinimumPurchase(), discount, p.getDescription());
    }
}
