import { createBrowserRouter } from "react-router";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./components/admin/AdminDashboard";
import AdminStaff from "./components/admin/AdminStaff";
import AdminDeals from "./components/admin/AdminDeals";
import AdminAnalytics from "./components/admin/AdminAnalytics";
import MemberLayout from "./components/member/MemberLayout";
import MemberHome from "./components/member/MemberHome";
import MemberBookings from "./components/member/MemberBookings";
import MemberTrainer from "./components/member/MemberTrainer";
import MemberMembership from "./components/member/MemberMembership";
import MemberProfile from "./components/member/MemberProfile";
import MemberCenters from "./components/member/MemberCenters";
import TrainerLayout from "./components/trainer/TrainerLayout";
import TrainerHome from "./components/trainer/TrainerHome";
import TrainerSchedule from "./components/trainer/TrainerSchedule";
import TrainerPerformance from "./components/trainer/TrainerPerformance";
import TrainerLedger from "./components/trainer/TrainerLedger";
import TrainerProfile from "./components/trainer/TrainerProfile";
import StaffLayout from "./components/staff/StaffLayout";
import StaffHome from "./components/staff/StaffHome";
import StaffPerformance from "./components/staff/StaffPerformance";
import StaffSchedule from "./components/staff/StaffSchedule";
import StaffLedger from "./components/staff/StaffLedger";
import StaffProfile from "./components/staff/StaffProfile";

export const router = createBrowserRouter([
  {
    path: "/admin",
    Component: AdminLayout,
    children: [
      { index: true, Component: AdminDashboard },
      { path: "staff", Component: AdminStaff },
      { path: "deals", Component: AdminDeals },
      { path: "analytics", Component: AdminAnalytics },
    ],
  },
  {
    path: "/member",
    Component: MemberLayout,
    children: [
      { index: true, Component: MemberHome },
      { path: "bookings", Component: MemberBookings },
      { path: "trainer", Component: MemberTrainer },
      { path: "membership", Component: MemberMembership },
      { path: "profile", Component: MemberProfile },
      { path: "centers", Component: MemberCenters },
    ],
  },
  {
    path: "/trainer",
    Component: TrainerLayout,
    children: [
      { index: true, Component: TrainerHome },
      { path: "schedule", Component: TrainerSchedule },
      { path: "performance", Component: TrainerPerformance },
      { path: "ledger", Component: TrainerLedger },
      { path: "profile", Component: TrainerProfile },
    ],
  },
  {
    path: "/staff",
    Component: StaffLayout,
    children: [
      { index: true, Component: StaffHome },
      { path: "performance", Component: StaffPerformance },
      { path: "schedule", Component: StaffSchedule },
      { path: "ledger", Component: StaffLedger },
      { path: "profile", Component: StaffProfile },
    ],
  },
]);
