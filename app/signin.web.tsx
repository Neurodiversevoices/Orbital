// Web: /signin redirects to /auth which has the real sign-in logic
import { Redirect } from 'expo-router';
export default function SignInWebRedirect() {
  return <Redirect href="/auth" />;
}
