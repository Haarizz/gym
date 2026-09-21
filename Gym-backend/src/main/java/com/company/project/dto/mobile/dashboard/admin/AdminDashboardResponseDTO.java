package com.company.project.dto.mobile.dashboard.admin;

import java.time.LocalDate;
import java.util.List;

public class AdminDashboardResponseDTO {

    private AdminDashboardBranchContextDTO branch;
    private LocalDate from;
    private LocalDate to;
    private String currency;
    private List<AdminDashboardKpiDTO> kpis;
    private List<AdminDashboardAlertDTO> alerts;
    private List<AdminDashboardPaymentMixItemDTO> paymentMix;
    private List<AdminDashboardOperationalHighlightDTO> operationalHighlights;

    public AdminDashboardBranchContextDTO getBranch() { return branch; }
    public void setBranch(AdminDashboardBranchContextDTO branch) { this.branch = branch; }

    public LocalDate getFrom() { return from; }
    public void setFrom(LocalDate from) { this.from = from; }

    public LocalDate getTo() { return to; }
    public void setTo(LocalDate to) { this.to = to; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public List<AdminDashboardKpiDTO> getKpis() { return kpis; }
    public void setKpis(List<AdminDashboardKpiDTO> kpis) { this.kpis = kpis; }

    public List<AdminDashboardAlertDTO> getAlerts() { return alerts; }
    public void setAlerts(List<AdminDashboardAlertDTO> alerts) { this.alerts = alerts; }

    public List<AdminDashboardPaymentMixItemDTO> getPaymentMix() { return paymentMix; }
    public void setPaymentMix(List<AdminDashboardPaymentMixItemDTO> paymentMix) { this.paymentMix = paymentMix; }

    public List<AdminDashboardOperationalHighlightDTO> getOperationalHighlights() { return operationalHighlights; }
    public void setOperationalHighlights(List<AdminDashboardOperationalHighlightDTO> operationalHighlights) { this.operationalHighlights = operationalHighlights; }
}
