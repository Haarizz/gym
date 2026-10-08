package com.company.project.services.pos;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;

/** Partial returns of a line always add back up to the line, whatever the split. */
class PosReturnPortionTest {

    @Test
    void returnsInPiecesSumToTheLine() {
        BigDecimal line = new BigDecimal("100.00"); // 3 units at 33.333…
        BigDecimal first = PosReturnService.portion(line, 3, 0, 1);
        BigDecimal second = PosReturnService.portion(line, 3, 1, 1);
        BigDecimal third = PosReturnService.portion(line, 3, 2, 1);
        assertEquals(new BigDecimal("33.33"), first);
        assertEquals(new BigDecimal("33.34"), second);
        assertEquals(new BigDecimal("33.33"), third);
        assertEquals(line, first.add(second).add(third));
    }

    @Test
    void returningEverythingTakesTheWholeLine() {
        BigDecimal line = new BigDecimal("47.62");
        assertEquals(line, PosReturnService.portion(line, 7, 0, 7));
        BigDecimal part = PosReturnService.portion(line, 7, 0, 3);
        assertEquals(line, part.add(PosReturnService.portion(line, 7, 3, 4)));
    }
}
