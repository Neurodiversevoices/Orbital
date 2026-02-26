import { Redirect } from 'expo-router';

/**
 * /app — Web entry point linked from landing.html
 *
 * Expo Router owns the /app URL (served via vercel.json catch-all → _app.html).
 * This screen immediately redirects to the home tab so users land on the
 * main capacity-logging screen rather than seeing "Unmatched Route".
 *
 * Client-side redirect: the Vercel rewrite for "/" → landing.html never fires
 * because no new server request is made.
 */
export default function AppEntry() {
  return <Redirect href="/" />;
}
