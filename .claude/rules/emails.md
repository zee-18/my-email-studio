---
paths:
  - "campaigns/**/emails/*.md"
---

# Email File Rules

This rule applies to every email file in any campaign, and only to email files: `campaigns/**/emails/*.md`. It does not apply to campaign plans, notes, brand files, or lead lists.

## 1. Start with the header lines

The first line of the file is `Subject: ...` and the whole line is 50 characters or fewer, counting `Subject: `.

The second line is `Preview: ...` and the whole line is 90 characters or fewer, counting `Preview: `.

Nothing comes before the subject line.

## 2. Greet the reader by name

The greeting uses the `{{first_name}}` placeholder, for example `Hi {{first_name}},`. Never hard-code a name.

## 3. Use exactly one main link

The email has exactly one link, written as:

[Button text](https://zaeem-akhter.vercel.app)

Do not add a second call to action and do not repeat the link in the body text.

## 4. End with our sign-off, then the footer

Close with the sign-off from `brand/voice.md`: `Talk soon,` followed by a first name. No title, no corporate signature block.

Directly after the sign-off, add this two-line footer as plain text, not inside a code block:

You're getting this because you joined the Zaeem Masterclass AI waitlist.
Zaeem Masterclass, {{company_address}} · Unsubscribe: {{unsubscribe_url}}
