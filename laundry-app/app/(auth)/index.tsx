import { Redirect } from 'expo-router';

/** Auth entry: always show welcome (Select your experience) first, then phone/OTP/role. */
export default function AuthIndexScreen() {
  return <Redirect href="/(auth)/welcome" />;
}
