# Setup milestones

The owner has a Railway Pro account, a dedicated WhatsApp number, and this GitHub repository connected to Railway. The application and its deployment configuration still need to be built.

1. **Prove the hosted browser.** Package Chromium, configure a persistent volume, and provide temporary authenticated login access. Confirm the correct RedMart account, read the complete Standard list, and verify that closing the browser and restarting the service preserve login. Measure idle and peak memory. Do this before enabling cart writes.
2. **Connect WhatsApp and storage.** Pair the dedicated number, persist its session, configure the allowed group and senders, and verify that only actual bot mentions enter the workflow. Persist requests and deduplicate message delivery.
3. **Import and resolve mappings.** Import the seed, bind private household aliases, and resolve outstanding preferences through confirmation. Configure Jev and Haiku credentials through Railway variables; verify model access, output validation, fallback, and learned-meaning persistence.
4. **Enable verified cart updates.** Add serialized browser actions, clarification handling, restart recovery, and result reporting. Demonstrate one tagged request from a phone, verify the resulting cart, then repeat after a service restart without duplicating additions.

Keep account credentials and session material out of Git. The bot must never perform checkout. Add runnable setup commands, environment examples, recovery steps, and deployment files as their corresponding implementation is completed.
