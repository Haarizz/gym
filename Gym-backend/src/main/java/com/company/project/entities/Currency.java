package com.company.project.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "currencies")
public class Currency extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code", unique = true, nullable = false, length = 3)
    private String code; // e.g., USD, AED, EUR

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "symbol", length = 10)
    private String symbol;

    @Column(name = "exchange_rate", precision = 12, scale = 6, nullable = false)
    private BigDecimal exchangeRate; // Rate against the base currency

    @Column(name = "is_base_currency", nullable = false)
    private boolean baseCurrency = false;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    public Currency() {}

    // Getters and Setters

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getSymbol() { return symbol; }
    public void setSymbol(String symbol) { this.symbol = symbol; }

    public BigDecimal getExchangeRate() { return exchangeRate; }
    public void setExchangeRate(BigDecimal exchangeRate) { this.exchangeRate = exchangeRate; }

    public boolean isBaseCurrency() { return baseCurrency; }
    public void setBaseCurrency(boolean baseCurrency) { this.baseCurrency = baseCurrency; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
