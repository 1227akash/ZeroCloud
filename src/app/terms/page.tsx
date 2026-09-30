export const metadata = {
  title: 'Terms & Conditions',
  description: 'ZeroCloud Terms of Service for peer-to-peer file transfers.',
};

export default function TermsPage() {
  return (
    <div className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-16">
      <div className="mb-10 text-center sm:text-left">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Terms & Conditions
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
          Last updated: September 2026 • Clear, fair conditions of use.
        </p>
      </div>

      <div className="prose prose-zinc dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed space-y-6 text-zinc-600 dark:text-zinc-300">
        <section>
          <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            1. Nature of the Service
          </h2>
          <p>
            ZeroCloud provides a peer-to-peer (P2P) data communication interface that facilitates direct browser-to-browser data transfer using WebRTC. ZeroCloud is not a file hosting service, cloud storage repository, or data intermediary.
          </p>
        </section>

        <section>
          <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            2. Acceptable Use Policy
          </h2>
          <p>
            Because ZeroCloud utilizes direct encrypted communication without server-side inspection or storage, you bear sole responsibility for all data transmitted between your device and the receiver. You agree not to use the service to transmit:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Malicious software, trojans, ransomware, or exploits.</li>
            <li>Content that infringes copyright, intellectual property, or trade secrets.</li>
            <li>Unlawful material under applicable local and international laws.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            3. Disclaimer of Warranties
          </h2>
          <p>
            ZeroCloud is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without warranties of any kind. WebRTC transfers depend on peer device availability, network conditions, NAT traversal capabilities, and browser memory quotas. ZeroCloud does not guarantee uninterrupted transfer completion.
          </p>
        </section>

        <section>
          <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            4. Limitation of Liability
          </h2>
          <p>
            To the maximum extent permitted by applicable law, in no event shall ZeroCloud or its maintainers be liable for any direct, indirect, incidental, or consequential damages resulting from connection failure, data loss, device crashes, or transmission interruptions.
          </p>
        </section>
      </div>
    </div>
  );
}
