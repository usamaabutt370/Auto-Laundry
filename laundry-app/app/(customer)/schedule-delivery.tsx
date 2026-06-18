import { Redirect } from "expo-router";

/** Legacy route — pickup and delivery are scheduled on one screen now. */
export default function ScheduleDeliveryScreen() {
  return <Redirect href="/(customer)/schedule-pickup" />;
}
