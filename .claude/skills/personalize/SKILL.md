---
name: personalize
description: Write a version of each campaign email for every lead group in leads/leads.csv. Use when a campaign's emails are final and you want one copy per group.
argument-hint: "[campaign folder]"
context: fork
allowed-tools: Read, Glob, Grep, Write
---

# Personalize

Take one campaign folder and write a copy of every email in it for each lead group in `leads/leads.csv`. A copy keeps the same subject, preview, structure, link, sign-off, and footer. Only two things change: the opening line and one example.

## Input

The campaign folder is `$ARGUMENTS`.

If no campaign folder is given, stop. Do not write anything. List the folders directly inside `campaigns/` that exist, one per line, and mark any that have no `emails/` folder. Then end.

## Step 1: Resolve the campaign

- The folder must be under `campaigns/`. Accept a path with or without `campaigns/` in front, for example `ai-partnership-launch` or `campaigns/ai-partnership-launch`.
- If the folder does not exist, stop and list the campaign folders that do exist.
- Collect every `.md` file directly inside `<campaign folder>/emails/`, sorted by file name. Ignore other files and subfolders.
- If there are no email files, stop and say so. Do not create anything.

## Step 2: Collect the groups

Read `leads/leads.csv` and take the unique values in the `group` column, in the order they first appear. Use the value exactly as written, spaces included. Do not hard-code group names and do not invent groups.

If the `group` column is missing or has no values, stop and say so.

The rows are made-up practice leads. Use them only to learn the group names. Never put a lead's name, email address, or other personal details into an email copy, and never send email.

## Step 3: Read the context

Before writing, read:

- `brand/voice.md` for voice and claims.
- `.claude/rules/emails.md` for the email format rules. Every copy must still pass them.
- The campaign plan, `<campaign folder>/plan.md` if it exists, for the target-audience description of each group.
- Every source email in `<campaign folder>/emails/`.

For each group, work out one angle from its exact name plus the matching audience description in the plan. If the plan has no matching description, use the group name on its own and stay conservative. The angle says what this group already does, what they are missing, and which single example would feel familiar to them. Do not invent offers, proof, numbers, or timelines.

Examples of how a group name shapes copy:

- A group with no AI work of its own: the example is a client asking for AI work the agency cannot deliver.
- A group with some AI tools but no repeatable process: the example is one person running tools while nobody owns delivery.
- A group with a live client request: the example is that client asking for the work now.

These are shapes, not fixed copy. Fit the wording to the group and the campaign.

## Step 4: Write each copy

For every group, and every source email, write one new file at:

`<campaign folder>/groups/<group>/emails/<same file name>`

Create the folders as needed. Keep the file name exactly the same.

Start from a full copy of the source email. Then change exactly two things:

1. **The opening line.** This is the first body sentence after `Hi {{first_name}},`. Rewrite it for the group. Keep it one sentence and keep the same paragraph position.
2. **One example.** Pick the one sentence in the body that carries the most concrete example, and rewrite it so the example fits the group. Keep it one sentence in the same place. If the email has no obvious example sentence, use the first concrete sentence after the opening line.

Everything else stays as it was, word for word:

- The `Subject:` and `Preview:` lines. Do not localize or otherwise change them.
- The greeting, `Hi {{first_name}},`.
- Every other sentence, in the same order, with the same paragraph breaks.
- The single link line, `[Book a 30-minute scoping call](https://zaeem-akhter.vercel.app)`.
- The sign-off, `Talk soon,` and the first name after it.
- The two-line footer, including `{{company_address}}` and `{{unsubscribe_url}}`.

Rules for the two new lines:

- Plain English, short sentences, no hype. Follow `brand/voice.md`.
- No new claims, percentages, case studies, guarantees, or timelines.
- Do not add a second call to action, do not repeat the link, and do not add a greeting name.
- Do not mention the group by name in the copy. The reader should feel it fits without being labeled.
- Do not change the subject, even if a group-specific subject would be better.

After writing each file, read it back and compare it with the source. Only the two edited sentences may differ. Fix any other difference before moving on.

The source emails in `<campaign folder>/emails/` are never modified. Existing copies at the target path may be replaced, because they are this skill's own output. Never delete files or folders.

## Step 5: Commit

Stage only the files under `<campaign folder>/groups/`. Do not stage source emails, plans, leads, or any other change.

Check `git status` and `git diff --cached` first. Then commit with a plain lowercase message, for example:

`add group versions for <campaign folder name>`

Do not amend, do not push, and do not commit unrelated files.

## Step 6: Reply

Reply with a short summary and nothing else. Give the number of files written, then one example opening line per group. Use the opening line from the first email written for that group.

```
Wrote 12 files.

- no ai service: "If a client asks for AI work and you do not have it in house, you either decline or bring in a name you cannot vouch for."
- partial ai service: "You have run the tools. What you do not have is a process the whole team can repeat."
- client demand: "A client has already asked for AI work. The only question is whether you can take it on."
```

No file tree, no per-file list, no extra commentary.
