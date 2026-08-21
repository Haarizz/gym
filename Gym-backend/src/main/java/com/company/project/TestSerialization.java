import com.company.project.dto.mobile.ledger.trainer.TrainerLedgerResponseDTO;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.Collections;

public class TestSerialization {
    public static void main(String[] args) throws Exception {
        TrainerLedgerResponseDTO.TrainerEarningsSummaryDTO summary = new TrainerLedgerResponseDTO.TrainerEarningsSummaryDTO(
            BigDecimal.TEN, BigDecimal.TEN, BigDecimal.TEN, BigDecimal.TEN);
        
        TrainerLedgerResponseDTO.TrainerQuickLedgerStatsDTO stats = new TrainerLedgerResponseDTO.TrainerQuickLedgerStatsDTO(
            "+5%", "Dec 1", "5 days");

        TrainerLedgerResponseDTO dto = new TrainerLedgerResponseDTO(
            summary, stats, Collections.emptyList(), Collections.emptyList(), null, Collections.emptyList());

        ObjectMapper mapper = new ObjectMapper();
        System.out.println(mapper.writeValueAsString(dto));
    }
}
