package com.company.project.services.mobile.profile;

import com.company.project.dto.mobile.profile.MobileProfileDTO;
import com.company.project.entities.UserProfile;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.UserProfileRepository;
import com.company.project.repositories.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
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

@Service
@Transactional
public class MobileProfileService {

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

    public MobileProfileDTO getProfileByUserId(Long userId) {
        UserProfile profile = userProfileRepository.findByUserId(userId)
                .orElseGet(() -> {
                    UserProfile newProfile = new UserProfile();
                    newProfile.setUser(userRepository.getReferenceById(userId));
                    newProfile.setFullName("Member"); // Add a default since fullName is non-null
                    return userProfileRepository.save(newProfile);
                });
        return MobileProfileDTO.fromEntity(profile);
    }

    public MobileProfileDTO updateProfile(Long userId, MobileProfileDTO request) {
        UserProfile profile = userProfileRepository.findByUserId(userId)
                .orElseGet(() -> {
                    UserProfile newProfile = new UserProfile();
                    newProfile.setUser(userRepository.getReferenceById(userId));
                    newProfile.setFullName("Member");
                    return newProfile;
                });

        if (request.getFullName() != null) profile.setFullName(request.getFullName());
        if (request.getPhone() != null) profile.setPhone(request.getPhone());
        
        if (request.getDateOfBirth() != null) {
            try {
                profile.setDateOfBirth(LocalDate.parse(request.getDateOfBirth()));
            } catch (DateTimeParseException e) {
                throw new IllegalArgumentException("Invalid date format. Use YYYY-MM-DD");
            }
        }
        
        if (request.getGender() != null) profile.setGender(request.getGender());
        if (request.getNationality() != null) profile.setNationality(request.getNationality());
        if (request.getAddress() != null) profile.setAddress(request.getAddress());
        if (request.getEmergencyContact() != null) profile.setEmergencyContact(request.getEmergencyContact());
        if (request.getEmergencyPhone() != null) profile.setEmergencyPhone(request.getEmergencyPhone());
        if (request.getBloodType() != null) profile.setBloodType(request.getBloodType());
        if (request.getMedicalConditions() != null) profile.setMedicalConditions(request.getMedicalConditions());
        if (request.getPhotoUrl() != null) profile.setPhotoUrl(request.getPhotoUrl());

        profile = userProfileRepository.save(profile);
        return MobileProfileDTO.fromEntity(profile);
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
