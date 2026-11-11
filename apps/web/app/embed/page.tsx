import ChatWidget from '@/components/ChatWidget';

export const metadata = { title: 'Chat', robots: { index: false } };

/** Loaded inside the iframe created by /loader.js. */
export default async function EmbedPage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string; phone?: string }>;
}) {
  const { tenant, phone } = await searchParams;
  // Fallback number for when the API cannot be reached (the loader passes data-phone). Digits and spacing only.
  const fallbackPhone = phone && /^[0-9 +()-]{5,25}$/.test(phone) ? phone : undefined;
  return (
    <main className="fd-embed">
      <ChatWidget tenant={(tenant ?? '').toLowerCase()} fallbackPhone={fallbackPhone} />
    </main>
  );
}
