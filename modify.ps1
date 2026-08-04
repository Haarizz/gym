$content = Get-Content -Raw -Path 'Gym-frontend/src/pages/member-connect-reports.tsx'
$imports = "import { promotionsService, type PromotionApi } from '../utils/supabase/promotions-service';
import { referralService, type ReferralResponse } from '../utils/supabase/referral-service';
import { followUpService, type FollowUpResponse } from '../utils/supabase/follow-up-service';
import { messagingService, type MessagingAnalyticsApi, type MessageHistoryApi } from '../utils/supabase/messaging-service';"
$content = $content.Replace('import { cn } from "../components/ui/utils";', 'import { cn } from "../components/ui/utils";' + [Environment]::NewLine + $imports)
$stateVars = "  const [apiPromotions, setApiPromotions] = useState<PromotionApi[]>([]);
  const [apiReferrals, setApiReferrals] = useState<ReferralResponse[]>([]);
  const [apiFollowUps, setApiFollowUps] = useState<FollowUpResponse[]>([]);
  const [apiMessagingStats, setApiMessagingStats] = useState<MessagingAnalyticsApi | null>(null);
  const [apiMessageHistory, setApiMessageHistory] = useState<MessageHistoryApi[]>([]);
  
  const [apiReferralStats, setApiReferralStats] = useState({ totalReferrals: 0, successfulReferrals: 0 });
  const [apiFollowUpStats, setApiFollowUpStats] = useState({ totalFollowUps: 0, completedFollowUps: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        promos, refData, refStats, followData, followStats, msgStats, msgHist
      ] = await Promise.all([
        promotionsService.getPromotions(),
        referralService.getReferrals({ size: 100 }),
        referralService.getStats(),
        followUpService.getFollowUps({ size: 100 }),
        followUpService.getStats(),
        messagingService.getAnalytics(),
        messagingService.getHistory()
      ]);
      setApiPromotions(promos || []);
      setApiReferrals(refData?.referrals || []);
      setApiReferralStats({ totalReferrals: refStats?.totalReferrals || 0, successfulReferrals: refStats?.successfulReferrals || 0 });
      setApiFollowUps(followData?.followUps || []);
      setApiFollowUpStats({ totalFollowUps: followStats?.totalFollowUps || 0, completedFollowUps: followStats?.completedFollowUps || 0 });
      setApiMessagingStats(msgStats);
      setApiMessageHistory(msgHist || []);
    } catch (e) {
      console.error('Error loading report data:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => { loadData(); }, [loadData]);"
$startIdx = $content.IndexOf('  // Sample data - in real app this would come from your backend')
$endIdx = $content.IndexOf('  // Calculate key metrics')
if ($startIdx -ne -1 -and $endIdx -ne -1) { 
  $newContent = $content.Substring(0, $startIdx) + $stateVars + [Environment]::NewLine + [Environment]::NewLine + $content.Substring($endIdx)
  Set-Content -Path 'Gym-frontend/src/pages/member-connect-reports.tsx' -Value $newContent -Encoding UTF8
  Write-Host 'Success!' 
} else { 
  Write-Host 'Failed!' 
}
