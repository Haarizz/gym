package com.company.project.services.mobile.profile;

import com.company.project.dto.mobile.profile.MobileProfileDTO;
import com.company.project.entities.UserProfile;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.UserProfileRepository;
import com.company.project.repositories.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.Period;
import java.time.format.DateTimeParseException;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import org.springframework.security.core.GrantedAuthority;

import com.company.project.dto.mobile.profile.MobileProfileTransactionsDTO;
import com.company.project.entities.Staff;
import com.company.project.entities.StaffAttendance;
import com.company.project.entities.SalaryPayment;
import com.company.project.entities.SaleTransaction;
import com.company.project.entities.WalletTransaction;
import com.company.project.repositories.StaffRepository;
import com.company.project.repositories.StaffAttendanceRepository;
import com.company.project.repositories.SalaryPaymentRepository;
import com.company.project.repositories.SaleTransactionRepository;
import com.company.project.repositories.WalletTransactionRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.ReceiptRepository;
import com.company.project.entities.Member;
import com.company.project.entities.Receipt;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.accounts.IdentityField;

@Service
@Transactional
public class MobileProfileService {

    // Allowed member age range for date of birth. Keep in sync with
    // GymBios-Mobile/src/domains/profile/domain/dateOfBirthRules.ts.
    private static final int MIN_AGE_YEARS = 10;
    private static final int MAX_AGE_YEARS = 100;

    // Allowed body metric ranges. Keep in sync with
    // GymBios-Mobile/src/domains/profile/domain/bodyMetricsRules.ts.
    private static final double MIN_HEIGHT_CM = 20;
    private static final double MAX_HEIGHT_CM = 250;
    private static final double MIN_WEIGHT_KG = 20;
    private static final double MAX_WEIGHT_KG = 300;

    private final UserProfileRepository userProfileRepository;
    private final UserRepository userRepository;
    private final StaffRepository staffRepository;
    private final StaffAttendanceRepository staffAttendanceRepository;
    private final SalaryPaymentRepository salaryPaymentRepository;
    private final SaleTransactionRepository saleTransactionRepository;
    private final WalletTransactionRepository walletTransactionRepository;
    private final MemberRepository memberRepository;
    private final ReceiptRepository receiptRepository;

    public MobileProfileService(UserProfileRepository userProfileRepository, 
                                UserRepository userRepository,
                                StaffRepository staffRepository,
                                StaffAttendanceRepository staffAttendanceRepository,
                                SalaryPaymentRepository salaryPaymentRepository,
                                SaleTransactionRepository saleTransactionRepository,
                                WalletTransactionRepository walletTransactionRepository,
                                MemberRepository memberRepository,
                                ReceiptRepository receiptRepository) {
        this.userProfileRepository = userProfileRepository;
        this.userRepository = userRepository;
        this.staffRepository = staffRepository;
        this.staffAttendanceRepository = staffAttendanceRepository;
        this.salaryPaymentRepository = salaryPaymentRepository;
        this.saleTransactionRepository = saleTransactionRepository;
        this.walletTransactionRepository = walletTransactionRepository;
        this.memberRepository = memberRepository;
        this.receiptRepository = receiptRepository;
    }

    /** The account's own profile — the person's details (plan §3), created on first read. */
    public MobileProfileDTO getProfileByUserId(Long userId) {
        UserProfile profile = userProfileRepository.findByUserId(userId)
                .orElseGet(() -> userProfileRepository.save(newProfile(userId)));
        return withAccountEmail(MobileProfileDTO.fromEntity(profile), userId);
    }

    public MobileProfileDTO updateProfile(Long userId, MobileProfileDTO request) {
        UserProfile profile = userProfileRepository.findByUserId(userId)
                .orElseGet(() -> newProfile(userId));

        if (request.getFullName() != null) profile.setFullName(request.getFullName());
        if (request.getPhone() != null) profile.setPhone(request.getPhone());
        
        if (request.getDateOfBirth() != null && request.getDateOfBirth().isBlank()) {
            profile.setDateOfBirth(null);
        } else if (request.getDateOfBirth() != null) {
            LocalDate dateOfBirth;
            try {
                dateOfBirth = LocalDate.parse(request.getDateOfBirth());
            } catch (DateTimeParseException e) {
                throw new IllegalArgumentException("Invalid date format. Use YYYY-MM-DD");
            }
            validateAge(dateOfBirth);
            profile.setDateOfBirth(dateOfBirth);
        }
        
        if (request.getGender() != null) profile.setGender(request.getGender());
        if (request.getNationality() != null) profile.setNationality(request.getNationality());
        if (request.getAddress() != null) profile.setAddress(request.getAddress());
        if (request.getEmergencyContact() != null) profile.setEmergencyContact(request.getEmergencyContact());
        if (request.getEmergencyPhone() != null) profile.setEmergencyPhone(request.getEmergencyPhone());
        // Only checked when either number changes, so unrelated updates on older
        // profiles that already match aren't blocked.
        boolean phonesChanged = request.getPhone() != null || request.getEmergencyPhone() != null;
        if (phonesChanged && samePhone(profile.getEmergencyPhone(), profile.getPhone())) {
            throw new IllegalArgumentException("Emergency contact number must be different from your own number");
        }
        if (request.getBloodType() != null) profile.setBloodType(request.getBloodType());
        if (request.getMedicalConditions() != null) profile.setMedicalConditions(request.getMedicalConditions());
        if (request.getAllergies() != null) profile.setAllergies(request.getAllergies());
        if (request.getCurrentMedications() != null) profile.setCurrentMedications(request.getCurrentMedications());
        if (request.getChronicIllnesses() != null) profile.setChronicIllnesses(request.getChronicIllnesses());
        if (request.getHeight() != null) {
            validateRange("Height", request.getHeight(), MIN_HEIGHT_CM, MAX_HEIGHT_CM, "cm");
            profile.setHeight(request.getHeight());
        }
        if (request.getWeight() != null) {
            validateRange("Weight", request.getWeight(), MIN_WEIGHT_KG, MAX_WEIGHT_KG, "kg");
            profile.setWeight(request.getWeight());
        }
        if (request.getPhotoUrl() != null) profile.setPhotoUrl(request.getPhotoUrl());

        profile = userProfileRepository.save(profile);
        return withAccountEmail(MobileProfileDTO.fromEntity(profile), userId);
    }

    private UserProfile newProfile(Long userId) {
        UserProfile profile = new UserProfile();
        profile.setUser(userRepository.getReferenceById(userId));
        profile.setFullName("Member"); // Add a default since fullName is non-null
        return profile;
    }

    /** The account's current identity values, for copying an app edit to its gyms (MemberProfileSyncService). */
    @Transactional(readOnly = true)
    public java.util.Map<IdentityField, Object> identityValues(Long userId) {
        return userProfileRepository.findByUserId(userId)
                .map(IdentityField::valuesOf)
                .orElseGet(() -> new java.util.EnumMap<>(IdentityField.class));
    }

    private void validateAge(LocalDate dateOfBirth) {
        int age = Period.between(dateOfBirth, LocalDate.now()).getYears();
        if (dateOfBirth.isAfter(LocalDate.now()) || age < MIN_AGE_YEARS) {
            throw new IllegalArgumentException("Member must be at least " + MIN_AGE_YEARS + " years old");
        }
        if (age > MAX_AGE_YEARS) {
            throw new IllegalArgumentException("Age cannot be more than " + MAX_AGE_YEARS + " years");
        }
    }

    private void validateRange(String field, double value, double min, double max, String unit) {
        if (!Double.isFinite(value) || value < min || value > max) {
            throw new IllegalArgumentException(
                    field + " must be between " + (int) min + " and " + (int) max + " " + unit);
        }
    }

    // Compares on the last 10 digits so formatting and country-code differences
    // still match. Keep in sync with GymBios-Mobile/src/domains/profile/domain/contactRules.ts.
    private static boolean samePhone(String a, String b) {
        String keyA = phoneKey(a);
        return !keyA.isEmpty() && keyA.equals(phoneKey(b));
    }

    private static String phoneKey(String phone) {
        if (phone == null) return "";
        String digits = phone.replaceAll("[^0-9]", "");
        return digits.length() > 10 ? digits.substring(digits.length() - 10) : digits;
    }

    private MobileProfileDTO withAccountEmail(MobileProfileDTO dto, Long userId) {
        userRepository.findById(userId).ifPresent(user -> dto.setEmail(user.getEmail()));
        return dto;
    }

    public MobileProfileTransactionsDTO getTransactions(UserDetailsImpl principal) {
        Long userId = principal.getId();
        boolean isStaff = principal.getAuthorities().stream().anyMatch(a -> 
            a.getAuthority().equals("ROLE_TRAINER") || 
            a.getAuthority().equals("ROLE_STAFF") || 
            a.getAuthority().equals("ROLE_ADMIN"));

        List<MobileProfileTransactionsDTO.Transaction> dtoList = new ArrayList<>();
        MobileProfileTransactionsDTO.Summary summary = new MobileProfileTransactionsDTO.Summary(BigDecimal.ZERO, 0, 0, 0);

        if (isStaff) {
            Staff staff = staffRepository.findByUserId(userId).orElse(null);
            if (staff != null) {
                // Salaries
                List<SalaryPayment> salaries = salaryPaymentRepository.findByEmployeeIdOrderByPaymentDateDesc(staff.getStaffId());
                for (SalaryPayment sp : salaries) {
                    dtoList.add(new MobileProfileTransactionsDTO.Transaction(
                        "SAL-" + sp.getId(),
                        "salary",
                        "Salary for " + sp.getMonth() + " " + sp.getYear(),
                        sp.getNetSalary(),
                        sp.getPaymentDate() != null ? sp.getPaymentDate().toString() : "",
                        "Paid".equalsIgnoreCase(sp.getStatus()) ? "completed" : "pending"
                    ));
                    summary.setTotalEarnings(summary.getTotalEarnings().add(sp.getNetSalary() != null ? sp.getNetSalary() : BigDecimal.ZERO));
                    summary.setTotalTransactions(summary.getTotalTransactions() + 1);
                }

                // Attendance
                List<StaffAttendance> attendances = staffAttendanceRepository.findByStaff_IdOrderByClockInTimeDesc(staff.getId());
                for (StaffAttendance sa : attendances) {
                    dtoList.add(new MobileProfileTransactionsDTO.Transaction(
                        "ATT-" + sa.getId(),
                        "attendance",
                        "Clock In Verified",
                        BigDecimal.ZERO,
                        sa.getClockInTime() != null ? sa.getClockInTime().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) : "",
                        "completed"
                    ));
                    summary.setTotalTransactions(summary.getTotalTransactions() + 1);
                }
            }
        }

        // Member
        Member member = null;
        if (principal.isGlobal()) {
            member = memberRepository.findByGlobalUserId(userId).orElse(null);
        }
        if (member == null) {
            member = memberRepository.findByUserId(userId).orElse(null);
        }

        if (member != null) {
                // Purchases
                List<SaleTransaction> purchases = saleTransactionRepository.findByMemberIdOrderByCreatedAtDesc(member.getId());
                for (SaleTransaction st : purchases) {
                    dtoList.add(new MobileProfileTransactionsDTO.Transaction(
                        "PUR-" + st.getId(),
                        "purchase",
                        "Purchase " + st.getTransactionNumber(),
                        st.getTotalAmount(),
                        st.getCreatedAt() != null ? st.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) : "",
                        "COMPLETED".equalsIgnoreCase(st.getStatus()) ? "completed" : "pending"
                    ));
                    summary.setTotalPurchases(summary.getTotalPurchases() + 1);
                    summary.setTotalTransactions(summary.getTotalTransactions() + 1);
                }

                // Wallet
                if (member.getMemberId() != null) {
                    List<WalletTransaction> walletTx = walletTransactionRepository.findByMemberIdOrderByCreatedAtDesc(member.getMemberId());
                    for (WalletTransaction wt : walletTx) {
                        String type = "DEBIT".equalsIgnoreCase(wt.getType()) ? "purchase" : "bonus";
                        dtoList.add(new MobileProfileTransactionsDTO.Transaction(
                            "WAL-" + wt.getId(),
                            type,
                            wt.getSourceType() != null ? wt.getSourceType() : wt.getType(),
                            wt.getAmount(),
                            wt.getCreatedAt() != null ? wt.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) : "",
                            "completed"
                        ));
                        if ("bonus".equals(type)) {
                            summary.setTotalEarnings(summary.getTotalEarnings().add(wt.getAmount() != null ? wt.getAmount() : BigDecimal.ZERO));
                            summary.setTotalBonuses(summary.getTotalBonuses() + 1);
                        }
                        summary.setTotalTransactions(summary.getTotalTransactions() + 1);
                    }
                }

                // Receipts (Membership & Others)
                List<Receipt> receipts = receiptRepository.findByMemberDbIdOrderByTransactionDateDesc(member.getId());
                for (Receipt r : receipts) {
                    dtoList.add(new MobileProfileTransactionsDTO.Transaction(
                        "REC-" + r.getId(),
                        "membership",
                        r.getPlanName() != null ? r.getPlanName() : "Membership Payment",
                        r.getPaidAmount() != null ? r.getPaidAmount() : r.getAmount(),
                        r.getTransactionDate() != null ? r.getTransactionDate().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) : "",
                        "completed"
                    ));
                    summary.setTotalPurchases(summary.getTotalPurchases() + 1);
                    summary.setTotalTransactions(summary.getTotalTransactions() + 1);
                }

        }

        // Sort the list properly by date descending
        dtoList.sort((t1, t2) -> {
            String d1 = t1.getDate() != null ? t1.getDate() : "";
            String d2 = t2.getDate() != null ? t2.getDate() : "";
            return d2.compareTo(d1);
        });

        return new MobileProfileTransactionsDTO(dtoList, summary);
    }
}
