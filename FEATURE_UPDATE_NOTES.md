# New requested updates

Added in this version:

1. Karaza qualification field in student registration/profile/admin edit.
2. Payment method field: with servant or Instapay.
3. Payment proof upload appears only when the student chose Instapay.
4. Activities now have category: spiritual or sports.
5. Activities now have price; default is 10 EGP.
6. Student dashboard shows selected activities as button-style cards, not checkboxes.
7. Student dashboard shows payment total after selecting activities.
8. Student submit shows a registration summary instead of just leaving the page.
9. Added role: serviceLeader / أمين خدمة.
10. Admin can create normal teachers or service leaders.
11. Student ID generation now includes the year code in the ID prefix.
12. Main server/API error messages were translated to Arabic.
13. Team builder has a group filter for first-to-fourth boys/girls across Youhanna, Abosefen, and El Adra.
14. Existing footer copyright is CoptechAi only.

After replacing your folder, run once to update old database records:

```bash
node update-new-features.js
```

Then start normally:

```bash
npm start
```
