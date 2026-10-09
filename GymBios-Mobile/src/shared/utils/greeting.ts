/** Time-of-day greeting shared by the role header and dashboard welcome cards. */
export function getGreeting(date: Date = new Date()): string {
  const hour = date.getHours();

  if (hour < 5) return 'Welcome Back';
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  if (hour < 22) return 'Good Evening';

  return 'Welcome Back';
}
