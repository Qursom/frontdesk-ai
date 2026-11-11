/** Target of the tenant's privacyUrl ("/#privacy"), linked from the widget's consent box and footer. */
export default function Privacy() {
  return (
    <section id="privacy" className="section" aria-labelledby="privacy-title">
      <div className="container site-privacy">
        <h2 id="privacy-title">Privacy &amp; cookies (demo)</h2>
        <p>
          Chat messages are used to answer your questions and are deleted automatically after 30 days. Contact details are
          only stored if you tick the consent box, are used only to reply to your enquiry, and are deleted after 90 days.
          The assistant is an AI and does not give medical advice. This site sets no advertising or tracking cookies.
        </p>
      </div>
    </section>
  );
}
